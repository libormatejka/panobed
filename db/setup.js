#!/usr/bin/env node
// Inicializuje SQLite databázi – schéma + seed data
// Spouští se při startu kontejneru (nebo ručně: node db/setup.js)

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../data/panobed.db');

// Zajisti, že složka data/ existuje
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Zkontroluj, jestli už DB existuje (má tabulky)
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='cities'").get();
if (tables) {
  console.log(`DB již existuje: ${DB_PATH} – přeskakuji inicializaci.`);
  db.close();
  process.exit(0);
}

console.log(`Inicializuji databázi: ${DB_PATH}`);

const schema = fs.readFileSync(path.join(__dirname, '001_init.sql'), 'utf8');
const seed   = fs.readFileSync(path.join(__dirname, '002_seed.sql'), 'utf8');

db.exec(schema);
console.log('  ✓ Schéma vytvořeno');

db.exec(seed);
console.log('  ✓ Seed data vložena');

// Ověření
const rows = db.prepare(`
  SELECT r.name, COUNT(mi.id) AS polozky
  FROM restaurants r
  JOIN daily_menus dm ON dm.restaurant_id = r.id
  JOIN menu_items mi  ON mi.daily_menu_id = dm.id
  WHERE dm.date = date('now')
  GROUP BY r.name
`).all();

console.log('\nDnešní menu v DB:');
rows.forEach(r => console.log(`  ${r.name}: ${r.polozky} položek`));

db.close();
console.log('\nDB připravena.');
