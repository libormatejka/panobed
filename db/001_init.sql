-- Pan Oběd – inicializační migrace (POC)

CREATE TABLE IF NOT EXISTS cities (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS restaurants (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  name    TEXT NOT NULL,
  address TEXT NOT NULL,
  city_id INTEGER NOT NULL REFERENCES cities(id),
  phone   TEXT,
  website TEXT,
  active  INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS daily_menus (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),
  date          TEXT NOT NULL  -- ISO 8601: YYYY-MM-DD
);

CREATE TABLE IF NOT EXISTS menu_items (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  daily_menu_id INTEGER NOT NULL REFERENCES daily_menus(id),
  name          TEXT NOT NULL,
  price         INTEGER        -- cena v haléřích (např. 12900 = 129 Kč), NULL = cena není uvedena
);

-- Indexy pro rychlé vyhledávání
CREATE INDEX IF NOT EXISTS idx_restaurants_city  ON restaurants(city_id);
CREATE INDEX IF NOT EXISTS idx_daily_menus_rest  ON daily_menus(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_daily_menus_date  ON daily_menus(date);
CREATE INDEX IF NOT EXISTS idx_menu_items_menu   ON menu_items(daily_menu_id);
