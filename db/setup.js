#!/usr/bin/env node
// Inicializuje SQLite databázi – schéma + seed data
// Spouští se při startu kontejneru (nebo ručně: node db/setup.js)

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../data/panobed.db');

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Zajisti tabulku pro sledování migrací
const migrationsTableNew = !db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='_migrations'").get();
db.exec(`CREATE TABLE IF NOT EXISTS _migrations (
  filename TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
)`);

const isNew = !db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='cities'").get();

// Pokud existuje DB bez sledování migrací, detekuj stav a zapiš historii
if (!isNew && migrationsTableNew) {
  seedMigrationHistory();
}

if (isNew) {
  console.log(`Inicializuji databázi: ${DB_PATH}`);
  const schema = fs.readFileSync(path.join(__dirname, '001_init.sql'), 'utf8');
  const seed   = fs.readFileSync(path.join(__dirname, '002_seed.sql'), 'utf8');
  db.exec(schema);
  console.log('  ✓ Schéma vytvořeno');
  db.exec(seed);
  console.log('  ✓ Seed data vložena');

  // Označ init migraci jako aplikovanou (aby se nespouštěla znovu)
  db.prepare(`INSERT OR IGNORE INTO _migrations (filename) VALUES (?)`).run('001_init.sql');

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
} else {
  console.log(`DB již existuje: ${DB_PATH} – aplikuji migrace.`);
}

applyMigrations();
db.close();
console.log('DB připravena.');

// Zjistí, které migrace jsou fakticky aplikované podle stavu DB
function seedMigrationHistory() {
  const cols = db.prepare("PRAGMA table_info(chat_log)").all().map(c => c.name);
  const hasChatLog    = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='chat_log'").get();
  const hasUserMsg    = cols.includes('user_message');

  if (hasChatLog) {
    db.prepare(`INSERT OR IGNORE INTO _migrations (filename) VALUES (?)`).run('003_add_chat_log.sql');
    console.log('  ✓ Migrace označena jako aplikovaná: 003_add_chat_log.sql');
  }
  if (hasChatLog && hasUserMsg) {
    db.prepare(`INSERT OR IGNORE INTO _migrations (filename) VALUES (?)`).run('004_rename_chat_log_columns.sql');
    console.log('  ✓ Migrace označena jako aplikovaná: 004_rename_chat_log_columns.sql');
  }
}

function applyMigrations() {
  // Migrační soubory: 003_*.sql, 004_*.sql, ... (ne init ani seed)
  const files = fs.readdirSync(__dirname)
    .filter(f => /^\d{3}_(?!init|seed).*\.sql$/.test(f))
    .sort();

  const applied = new Set(
    db.prepare('SELECT filename FROM _migrations').all().map(r => r.filename)
  );

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = fs.readFileSync(path.join(__dirname, file), 'utf8');
    db.exec(sql);
    db.prepare(`INSERT INTO _migrations (filename) VALUES (?)`).run(file);
    console.log(`  ✓ Migrace aplikována: ${file}`);
  }
}
