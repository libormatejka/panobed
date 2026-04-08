#!/bin/bash
# Vytvoří SQLite databázi a aplikuje migrace + seed data

DB_FILE="$(dirname "$0")/../panobed.db"

echo "Mazání staré DB (pokud existuje)..."
rm -f "$DB_FILE"

echo "Aplikuji schéma..."
sqlite3 "$DB_FILE" < "$(dirname "$0")/001_init.sql"

echo "Vkládám seed data..."
sqlite3 "$DB_FILE" < "$(dirname "$0")/002_seed.sql"

echo "Hotovo. Ověření:"
sqlite3 "$DB_FILE" "
  SELECT r.name, COUNT(mi.id) as polozky
  FROM restaurants r
  JOIN daily_menus dm ON dm.restaurant_id = r.id
  JOIN menu_items mi ON mi.daily_menu_id = dm.id
  WHERE dm.date = date('now')
  GROUP BY r.name;
"
