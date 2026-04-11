require('dotenv').config();
const express        = require('express');
const cors           = require('cors');
const path           = require('path');
const rateLimit      = require('express-rate-limit');
const { execSync }   = require('child_process');

const APP_VERSION = require('../package.json').version;
const GIT_COMMIT  = process.env.GIT_COMMIT || (() => {
  try { return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim(); }
  catch { return 'unknown'; }
})();
const { chat, chatStream } = require('./claude');
const { getPopularQueries, getRestaurantWithMenus, getCitiesToday } = require('./queries');
const adminRouter = require('./admin');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../widget')));
app.use('/assets', express.static(path.join(__dirname, '../assets')));

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,   // 1 minuta
  max: 20,               // max 20 dotazů za minutu z jedné IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Příliš mnoho dotazů. Zkus to za chvíli.' },
});

app.use('/admin', adminRouter);

app.get('/r/:id', (_req, res) => {
  res.sendFile(path.join(__dirname, '../widget/restaurant.html'));
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', app: 'Pan Oběd', version: APP_VERSION, commit: GIT_COMMIT });
});

app.get('/api/version', (_req, res) => {
  res.json({ version: APP_VERSION, commit: GIT_COMMIT });
});

app.get('/api/cities-today', (_req, res) => {
  res.json(getCitiesToday());
});

app.get('/api/popular', (_req, res) => {
  const rows = getPopularQueries(20);
  const clusters = clusterQueries(rows);
  res.json(clusters);
});

function clusterQueries(rows) {
  const CITIES = ['pardubice', 'hradec', 'brno', 'praha', 'ostrava', 'plzeň', 'olomouc'];

  function detect(t) {
    const isToday    = /dnes|dnešní|dneska/.test(t);
    const isTomorrow = /zítra|zítřejší/.test(t);
    const city       = CITIES.find(c => t.includes(c));
    const cityLabel  = city ? city.charAt(0).toUpperCase() + city.slice(1) : null;

    if (cityLabel && isToday)    return { label: `Dnes v ${cityLabel}`,  query: null };
    if (cityLabel && isTomorrow) return { label: `Zítra v ${cityLabel}`, query: null };
    if (/vegetarián|vege/.test(t))                          return { label: 'Vegetariánské',      query: null };
    if (/tradiční|česk|svíčkov|guláš|řízek/.test(t))       return { label: 'Tradiční česká jídla', query: null };
    if (/levn|nejlevn|levné/.test(t))                      return { label: 'Nejlevnější',         query: null };
    if (/ryb|losos|kapr/.test(t))                          return { label: 'Ryby a mořské plody', query: null };
    if (cityLabel)                                          return { label: cityLabel,              query: null };
    return null;
  }

  const seen   = new Set();
  const result = [];

  for (const { user_message } of rows) {
    const t = user_message.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const cluster = detect(t);
    if (!cluster) continue;
    if (seen.has(cluster.label)) continue;
    seen.add(cluster.label);
    result.push({ label: cluster.label, query: user_message });
    if (result.length >= 5) break;
  }

  return result;
}

app.get('/api/restaurant/:id', (req, res) => {
  const r = getRestaurantWithMenus(Number(req.params.id));
  if (!r) return res.status(404).json({ error: 'Restaurace nenalezena.' });
  res.json(r);
});

app.post('/api/chat/stream', chatLimiter, async (req, res) => {
  const { message, history, client_id } = req.body;
  if (!message || typeof message !== 'string' || message.trim() === '') {
    return res.status(400).json({ error: 'Pole message je povinné.' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  try {
    await chatStream(
      message.trim(),
      history || [],
      client_id ?? null,
      (text) => send({ type: 'token', text }),
      (result) => send({ type: 'done', ...result }),
    );
  } catch (err) {
    console.error('[chat/stream error]', err);
    send({ type: 'error', message: 'Chyba při zpracování dotazu.' });
  } finally {
    res.end();
  }
});

app.post('/api/chat', chatLimiter, async (req, res) => {
  const { message, history, client_id } = req.body;
  if (!message || typeof message !== 'string' || message.trim() === '') {
    return res.status(400).json({ error: 'Pole message je povinné.' });
  }
  try {
    const result = await chat(message.trim(), history || [], client_id ?? null);
    res.json({ reply: result.reply, history: result.history, suggestions: result.suggestions, response_time_ms: result.responseTimeMs });
  } catch (err) {
    console.error('[chat error]', err);
    res.status(500).json({ error: 'Chyba při zpracování dotazu.' });
  }
});

app.listen(PORT, () => {
  console.log(`Pan Oběd backend běží na portu ${PORT}`);
});
