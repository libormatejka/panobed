require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const path      = require('path');
const rateLimit = require('express-rate-limit');
const { chat } = require('./claude');
const { getPopularQueries } = require('./queries');
const adminRouter = require('./admin');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../widget')));

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,   // 1 minuta
  max: 20,               // max 20 dotazů za minutu z jedné IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Příliš mnoho dotazů. Zkus to za chvíli.' },
});

app.use('/admin', adminRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', app: 'Pan Oběd' });
});

app.get('/api/popular', (_req, res) => {
  res.json(getPopularQueries(5));
});

app.post('/api/chat', chatLimiter, async (req, res) => {
  const { message, history } = req.body;
  if (!message || typeof message !== 'string' || message.trim() === '') {
    return res.status(400).json({ error: 'Pole message je povinné.' });
  }
  try {
    const result = await chat(message.trim(), history || []);
    res.json({ reply: result.reply, history: result.history });
  } catch (err) {
    console.error('[chat error]', err);
    res.status(500).json({ error: 'Chyba při zpracování dotazu.' });
  }
});

app.listen(PORT, () => {
  console.log(`Pan Oběd backend běží na portu ${PORT}`);
});
