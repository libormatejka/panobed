#!/usr/bin/env node
// Scraper pro menicka.cz
// Použití: node scraper/menicka.js <url> [<url> ...]
// Příklad: node scraper/menicka.js https://www.menicka.cz/1064-nase-hospoda-smichovska.html

require('dotenv').config();
const cheerio   = require('cheerio');
const iconv     = require('iconv-lite');

const API_BASE  = process.env.SCRAPER_API_URL || 'http://localhost:3000';
const ADMIN_KEY = process.env.ADMIN_API_KEY;

if (!ADMIN_KEY) {
  console.error('Chybí ADMIN_API_KEY v .env');
  process.exit(1);
}

const headers = {
  'Content-Type': 'application/json',
  'X-Admin-Key': ADMIN_KEY,
};

// ── Parsování stránky menicka.cz ─────────────────────────────────────────────

async function fetchPage(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PanObedBot/1.0)' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} pro ${url}`);
  const buffer = await res.arrayBuffer();
  return iconv.decode(Buffer.from(buffer), 'windows-1250');
}

function parsePage(html, url) {
  const $ = cheerio.load(html);

  // Název restaurace
  const name = $('h1').first().contents()
    .filter((_, n) => n.type === 'text')
    .text().trim();

  // Adresa – "Jindřichská, 276, 53002, Pardubice"
  const rawAddress = $('a#ViewMapMenuProfil').text().trim();
  const city = extractCity(rawAddress);
  const address = formatAddress(rawAddress);

  // Menu bloky – každý div.menicka je jeden den
  const days = [];
  $('div.menicka').each((_, el) => {
    const dateRaw = $(el).find('div.nadpis').text().trim();
    const date = parseDate(dateRaw);
    if (!date) return;

    const items = [];
    $(el).find('li.polevka, li.jidlo').each((_, li) => {
      const nameRaw = $(li).find('div.polozka').clone()
        .find('span.poradi').remove().end()
        .text().trim();
      const priceRaw = $(li).find('div.cena').text().trim();
      const price = parsePrice(priceRaw);
      if (nameRaw) items.push({ name: nameRaw, price });
    });

    if (items.length > 0) days.push({ date, items });
  });

  return { name, address, city, url, days };
}

// Převede "Středa 8.4.2026" → "2026-04-08"
function parseDate(str) {
  const match = str.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (!match) return null;
  const [, d, m, y] = match;
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

// Převede "145 Kč" → 14500 (haléře)
function parsePrice(str) {
  const match = str.match(/(\d+)/);
  return match ? parseInt(match[1], 10) * 100 : null;
}

// Extrahuje město z adresy "Ulice, čp, PSČ, Město"
function extractCity(addr) {
  const parts = addr.split(',').map(s => s.trim());
  return parts[parts.length - 1] || 'Pardubice';
}

// Formátuje adresu na "Ulice čp, PSČ Město"
function formatAddress(addr) {
  const parts = addr.split(',').map(s => s.trim());
  if (parts.length >= 4) {
    return `${parts[0]} ${parts[1]}, ${parts[2]} ${parts[3]}`;
  }
  return addr;
}

// ── Admin API volání ──────────────────────────────────────────────────────────

async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`, { headers });
  return res.json();
}

async function apiPost(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST', headers,
    body: JSON.stringify(body),
  });
  return res.json();
}

async function ensureCity(cityName) {
  const cities = await apiGet('/admin/cities');
  const slug = cityName.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-');
  const existing = cities.find(c => c.slug === slug || c.name.toLowerCase() === cityName.toLowerCase());
  if (existing) return existing;
  return apiPost('/admin/cities', { name: cityName, slug });
}

async function ensureRestaurant(name, address, cityId, url) {
  const restaurants = await apiGet('/admin/restaurants');
  const existing = restaurants.find(r => r.name === name);
  if (existing) return existing;
  console.log(`  Přidávám restauraci: ${name}`);
  return apiPost('/admin/restaurants', { name, address, city_id: cityId, website: url });
}

// ── Hlavní logika ─────────────────────────────────────────────────────────────

async function scrapeUrl(url) {
  console.log(`\nScrapuji: ${url}`);
  const html       = await fetchPage(url);
  const data       = parsePage(html, url);

  console.log(`  Restaurace: ${data.name}`);
  console.log(`  Město: ${data.city}`);
  console.log(`  Adresa: ${data.address}`);
  console.log(`  Nalezeno dnů s menu: ${data.days.length}`);

  const city       = await ensureCity(data.city);
  const restaurant = await ensureRestaurant(data.name, data.address, city.id, url);

  for (const day of data.days) {
    console.log(`  Ukládám menu pro ${day.date} (${day.items.length} položek)`);
    await apiPost('/admin/menus', {
      restaurant_id: restaurant.id,
      date: day.date,
      items: day.items,
    });
  }

  console.log(`  ✓ Hotovo`);
}

async function main() {
  const urls = process.argv.slice(2);
  if (urls.length === 0) {
    console.error('Použití: node scraper/menicka.js <url> [<url> ...]');
    process.exit(1);
  }

  for (const url of urls) {
    await scrapeUrl(url).catch(err => console.error(`  ✗ Chyba pro ${url}:`, err.message));
  }

  console.log('\nScraping dokončen.');
}

main();
