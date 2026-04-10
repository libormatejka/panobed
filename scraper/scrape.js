#!/usr/bin/env node
// scraper/scrape.js – hlavní scraper
// Čte SCRAPE_CITIES z .env, stahuje menu pro všechna nakonfigurovaná města.
// Paralelní zpracování po dávkách, cache pro DB dotazy (bez N+1).

require('dotenv').config();
const cheerio = require('cheerio');
const iconv   = require('iconv-lite');

const API_BASE   = process.env.SCRAPER_API_URL || 'http://localhost:3000';
const ADMIN_KEY  = process.env.ADMIN_API_KEY;
const CITIES     = (process.env.SCRAPE_CITIES || 'pardubice')
  .split(',').map(s => s.trim()).filter(Boolean);
const BATCH_SIZE = 5;

if (!ADMIN_KEY) {
  console.error('Chybí ADMIN_API_KEY v .env');
  process.exit(1);
}

const reqHeaders = {
  'Content-Type': 'application/json',
  'X-Admin-Key': ADMIN_KEY,
};

// ── HTTP helpers ───────────────────────────────────────────────────────────────

async function fetchPage(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PanObedBot/1.0)' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} pro ${url}`);
  const buffer = await res.arrayBuffer();
  return iconv.decode(Buffer.from(buffer), 'windows-1250');
}

async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`, { headers: reqHeaders });
  return res.json();
}

async function apiPost(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: reqHeaders,
    body: JSON.stringify(body),
  });
  return res.json();
}

// ── Cache (načte se jednou, eliminuje N+1) ────────────────────────────────────

let cityCache      = null;  // Map: slug → city
let restaurantCache = null; // Map: name → restaurant

async function loadCache() {
  const [cities, restaurants] = await Promise.all([
    apiGet('/admin/cities'),
    apiGet('/admin/restaurants'),
  ]);
  cityCache       = new Map(cities.map(c => [c.slug, c]));
  restaurantCache = new Map(restaurants.map(r => [r.name, r]));
  console.log(`Cache: ${cityCache.size} měst, ${restaurantCache.size} restaurací`);
}

async function ensureCity(name) {
  const slug = name.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-');
  if (cityCache.has(slug)) return cityCache.get(slug);
  const city = await apiPost('/admin/cities', { name, slug });
  cityCache.set(slug, city);
  console.log(`  + Přidáno město: ${name}`);
  return city;
}

async function ensureRestaurant(name, address, cityId, url) {
  if (restaurantCache.has(name)) return restaurantCache.get(name);
  const r = await apiPost('/admin/restaurants', { name, address, city_id: cityId, website: url });
  restaurantCache.set(name, r);
  return r;
}

// ── Parsování stránky menicka.cz ──────────────────────────────────────────────

function parseDate(str) {
  const match = str.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (!match) return null;
  const [, d, m, y] = match;
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

function parsePrice(str) {
  const match = str.match(/(\d+)/);
  return match ? parseInt(match[1], 10) * 100 : null;
}

function extractCity(addr) {
  const parts = addr.split(',').map(s => s.trim());
  return parts[parts.length - 1] || '';
}

function formatAddress(addr) {
  const parts = addr.split(',').map(s => s.trim());
  if (parts.length >= 4) return `${parts[0]} ${parts[1]}, ${parts[2]} ${parts[3]}`;
  return addr;
}

function parsePage(html, url) {
  const $ = cheerio.load(html);

  const name = $('h1').first().contents()
    .filter((_, n) => n.type === 'text')
    .text().trim();

  const rawAddress = $('a#ViewMapMenuProfil').text().trim();
  const city       = extractCity(rawAddress);
  const address    = formatAddress(rawAddress);

  const days = [];
  $('div.menicka').each((_, el) => {
    const date = parseDate($(el).find('div.nadpis').text().trim());
    if (!date) return;

    const items = [];
    $(el).find('li.polevka, li.jidlo').each((_, li) => {
      const itemName = $(li).find('div.polozka').clone()
        .find('span.poradi').remove().end()
        .text().trim();
      const price = parsePrice($(li).find('div.cena').text().trim());
      if (itemName) items.push({ name: itemName, price });
    });

    if (items.length > 0) days.push({ date, items });
  });

  return { name, address, city, url, days };
}

// ── Scraping jedné restaurace ─────────────────────────────────────────────────

// Normalizuje název města pro porovnání (bez diakritiky, malá písmena)
function normalizeCity(str) {
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-');
}

const ALLOWED_CITIES = new Set(CITIES.map(normalizeCity));

async function scrapeUrl(url) {
  const html = await fetchPage(url);
  const data = parsePage(html, url);
  if (!data.name) return null;

  // Přeskoč restaurace z měst která nejsou v SCRAPE_CITIES
  if (data.city && !ALLOWED_CITIES.has(normalizeCity(data.city))) {
    return null;
  }

  const city       = await ensureCity(data.city);
  const restaurant = await ensureRestaurant(data.name, data.address, city.id, url);

  for (const day of data.days) {
    await apiPost('/admin/menus', {
      restaurant_id: restaurant.id,
      date: day.date,
      items: day.items,
    });
  }

  return data.name;
}

// ── Seznam URL restaurací pro město ──────────────────────────────────────────

async function getCityUrls(citySlug) {
  const html    = await fetchPage(`https://www.menicka.cz/${citySlug}.html`);
  const matches = [...html.matchAll(/href=['"](\/?(\d+)-[^'"]+\.html)['"]/g)];
  const unique  = [...new Map(matches.map(m => [m[2], m[1]])).values()];
  return unique.map(path =>
    path.startsWith('http') ? path : `https://www.menicka.cz/${path}`
  );
}

// ── Paralelní dávky ───────────────────────────────────────────────────────────

async function processBatch(urls) {
  await Promise.allSettled(
    urls.map(url =>
      scrapeUrl(url)
        .then(name => { if (name) console.log(`  ✓ ${name}`); })
        .catch(err  => console.error(`  ✗ ${url}: ${err.message}`))
    )
  );
}

async function scrapeCity(citySlug) {
  console.log(`\n▶ Město: ${citySlug}`);
  const urls = await getCityUrls(citySlug);
  console.log(`  Nalezeno ${urls.length} restaurací`);

  for (let i = 0; i < urls.length; i += BATCH_SIZE) {
    const batch     = urls.slice(i, i + BATCH_SIZE);
    const batchNum  = Math.floor(i / BATCH_SIZE) + 1;
    const batchTotal = Math.ceil(urls.length / BATCH_SIZE);
    console.log(`  Dávka ${batchNum}/${batchTotal}`);
    await processBatch(batch);
  }

  console.log(`✔ ${citySlug} hotovo`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const start = Date.now();
  console.log(`Pan Oběd scraper`);
  console.log(`Města: ${CITIES.join(', ')}`);
  console.log(`Souběžnost: ${BATCH_SIZE} restaurací najednou\n`);

  await loadCache();

  for (const city of CITIES) {
    await scrapeCity(city);
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\nScraping dokončen za ${elapsed}s`);
}

main().catch(err => {
  console.error('Fatální chyba:', err);
  process.exit(1);
});
