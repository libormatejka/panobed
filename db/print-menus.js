const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../data/panobed.db');
const db = new Database(DB_PATH, { readonly: true });

const rows = db.prepare(`
  SELECT r.name AS restaurant, mi.name AS item, mi.price
  FROM restaurants r
  JOIN daily_menus dm ON dm.restaurant_id = r.id
  JOIN menu_items mi  ON mi.daily_menu_id = dm.id
  WHERE dm.date = date('now')
  ORDER BY r.name, mi.id
`).all();

if (rows.length === 0) {
  console.log('Žádná menu pro dnešní den.');
  process.exit(0);
}

let current = null;
for (const row of rows) {
  if (row.restaurant !== current) {
    current = row.restaurant;
    console.log(`\n${current}`);
  }
  const price = row.price ? `${(row.price / 100).toFixed(0)} Kč` : 'cena neuvedena';
  console.log(`  - ${row.item} (${price})`);
}
