#!/usr/bin/env node
// Stáhne seznam URL restaurací pro dané město z menicka.cz
// Použití: node scraper/get-city-urls.js pardubice

const iconv = require('iconv-lite');

async function getCityUrls(city) {
  const res = await fetch(`https://www.menicka.cz/${city}.html`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PanObedBot/1.0)' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buffer = await res.arrayBuffer();
  const html = iconv.decode(Buffer.from(buffer), 'windows-1250');

  const matches = [...html.matchAll(/href=['"](\/?(\d+)-[^'"]+\.html)['"]/g)];
  const unique = [...new Map(matches.map(m => [m[2], m[1]])).values()];
  return unique.map(path =>
    path.startsWith('http') ? path : `https://www.menicka.cz/${path}`
  );
}

const city = process.argv[2] || 'pardubice';
getCityUrls(city)
  .then(urls => {
    console.error(`Nalezeno ${urls.length} restaurací pro město: ${city}`);
    urls.forEach(u => console.log(u));
  })
  .catch(err => { console.error(err.message); process.exit(1); });
