const db = require('./db');

// ── Read ──────────────────────────────────────────────────────────────────────

function listCities() {
  return db.prepare(`SELECT id, name, slug FROM cities ORDER BY name`).all();
}

function searchMenus(city, date, district = null) {
  const districtFilter = district ? `AND lower(r.district) = lower(?)` : '';
  const params = district
    ? [date, city.toLowerCase(), city, district]
    : [date, city.toLowerCase(), city];
  return db.prepare(`
    SELECT
      r.id       AS restaurant_id,
      r.name     AS restaurant,
      r.address,
      r.phone,
      r.district,
      mi.name    AS item,
      mi.price
    FROM cities c
    JOIN restaurants r  ON r.city_id = c.id AND r.active = 1
    JOIN daily_menus dm ON dm.restaurant_id = r.id AND dm.date = ?
    JOIN menu_items  mi ON mi.daily_menu_id = dm.id
    WHERE (c.slug = ? OR lower(c.name) = lower(?))
    ${districtFilter}
    ORDER BY r.name, mi.id
  `).all(...params);
}

function getRestaurantDetail(restaurantId) {
  return db.prepare(`
    SELECT id, name, address, phone, website
    FROM restaurants WHERE id = ?
  `).get(restaurantId);
}

function getRestaurantWithMenus(restaurantId) {
  const restaurant = db.prepare(`
    SELECT id, name, address, phone, website
    FROM restaurants WHERE id = ?
  `).get(restaurantId);
  if (!restaurant) return null;

  const menus = db.prepare(`
    SELECT dm.date, mi.name AS item, mi.price
    FROM daily_menus dm
    JOIN menu_items mi ON mi.daily_menu_id = dm.id
    WHERE dm.restaurant_id = ?
    ORDER BY dm.date, mi.id
  `).all(restaurantId);

  // Seskup podle data
  const byDate = {};
  for (const row of menus) {
    if (!byDate[row.date]) byDate[row.date] = [];
    byDate[row.date].push({ name: row.item, price: row.price });
  }
  restaurant.menus = Object.entries(byDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, items]) => ({ date, items }));

  return restaurant;
}

function listRestaurants(citySlug) {
  const sql = citySlug
    ? `SELECT r.id, r.name, r.address, r.phone, r.website, r.active, c.slug AS city
       FROM restaurants r JOIN cities c ON c.id = r.city_id
       WHERE c.slug = ? ORDER BY r.name`
    : `SELECT r.id, r.name, r.address, r.phone, r.website, r.active, c.slug AS city
       FROM restaurants r JOIN cities c ON c.id = r.city_id ORDER BY r.name`;
  return citySlug
    ? db.prepare(sql).all(citySlug)
    : db.prepare(sql).all();
}

function getMenusForDate(date) {
  return db.prepare(`
    SELECT dm.id, dm.date, r.name AS restaurant, r.id AS restaurant_id
    FROM daily_menus dm
    JOIN restaurants r ON r.id = dm.restaurant_id
    WHERE dm.date = ?
    ORDER BY r.name
  `).all(date);
}

// ── Write – cities ────────────────────────────────────────────────────────────

function upsertCity(name, slug) {
  return db.prepare(`
    INSERT INTO cities (name, slug) VALUES (?, ?)
    ON CONFLICT(slug) DO UPDATE SET name = excluded.name
    RETURNING *
  `).get(name, slug);
}

// ── Write – restaurants ───────────────────────────────────────────────────────

function createRestaurant({ name, address, city_id, phone, website, district }) {
  return db.prepare(`
    INSERT INTO restaurants (name, address, city_id, phone, website, district)
    VALUES (?, ?, ?, ?, ?, ?)
    RETURNING *
  `).get(name, address, city_id, phone ?? null, website ?? null, district ?? null);
}

function updateRestaurant(id, fields) {
  const allowed = ['name', 'address', 'phone', 'website', 'active'];
  const updates = Object.keys(fields).filter(k => allowed.includes(k));
  if (updates.length === 0) return getRestaurantDetail(id);
  const sql = `UPDATE restaurants SET ${updates.map(k => `${k} = ?`).join(', ')} WHERE id = ? RETURNING *`;
  return db.prepare(sql).get(...updates.map(k => fields[k]), id);
}

function deleteRestaurant(id) {
  return db.prepare(`DELETE FROM restaurants WHERE id = ?`).run(id);
}

// ── Write – menus ─────────────────────────────────────────────────────────────

// Uloží celé denní menu (nahradí existující pro danou restauraci a datum)
const upsertDailyMenu = db.transaction((restaurantId, date, items) => {
  // Smaž staré menu pro tento den
  const existing = db.prepare(`
    SELECT id FROM daily_menus WHERE restaurant_id = ? AND date = ?
  `).get(restaurantId, date);

  if (existing) {
    db.prepare(`DELETE FROM menu_items WHERE daily_menu_id = ?`).run(existing.id);
    db.prepare(`DELETE FROM daily_menus WHERE id = ?`).run(existing.id);
  }

  const menu = db.prepare(`
    INSERT INTO daily_menus (restaurant_id, date) VALUES (?, ?) RETURNING *
  `).get(restaurantId, date);

  const insertItem = db.prepare(`
    INSERT INTO menu_items (daily_menu_id, name, price) VALUES (?, ?, ?)
  `);
  for (const item of items) {
    insertItem.run(menu.id, item.name, item.price ?? null);
  }

  return { ...menu, items };
});

function deleteMenu(restaurantId, date) {
  const menu = db.prepare(`
    SELECT id FROM daily_menus WHERE restaurant_id = ? AND date = ?
  `).get(restaurantId, date);
  if (!menu) return null;
  db.prepare(`DELETE FROM menu_items WHERE daily_menu_id = ?`).run(menu.id);
  db.prepare(`DELETE FROM daily_menus WHERE id = ?`).run(menu.id);
  return menu;
}

// ── Chat log ──────────────────────────────────────────────────────────────────

function logChat({ user_message, bot_reply, input_tokens, output_tokens, cost_usd, client_id, response_time_ms }) {
  db.prepare(`
    INSERT INTO chat_log (user_message, bot_reply, input_tokens, output_tokens, cost_usd, client_id, response_time_ms)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(user_message, bot_reply, input_tokens, output_tokens, cost_usd, client_id ?? null, response_time_ms ?? null);
}

function getCitiesToday() {
  const cities = db.prepare(`
    SELECT DISTINCT c.name, c.slug
    FROM cities c
    JOIN restaurants r ON r.city_id = c.id AND r.active = 1
    JOIN daily_menus dm ON dm.restaurant_id = r.id AND dm.date = date('now')
    ORDER BY c.name
  `).all();

  const districts = db.prepare(`
    SELECT DISTINCT c.name AS city, r.district
    FROM cities c
    JOIN restaurants r ON r.city_id = c.id AND r.active = 1
    JOIN daily_menus dm ON dm.restaurant_id = r.id AND dm.date = date('now')
    WHERE r.district IS NOT NULL
    ORDER BY r.district
  `).all();

  const districtMap = {};
  for (const row of districts) {
    if (!districtMap[row.city]) districtMap[row.city] = [];
    districtMap[row.city].push(row.district);
  }

  return cities.map(c => ({ ...c, districts: districtMap[c.name] || [] }));
}

function getPopularQueries(limit = 5) {
  return db.prepare(`
    SELECT user_message, COUNT(*) AS count
    FROM chat_log
    GROUP BY user_message
    ORDER BY count DESC
    LIMIT ?
  `).all(limit);
}

module.exports = {
  listCities, searchMenus, getRestaurantDetail, getRestaurantWithMenus,
  listRestaurants, getMenusForDate,
  upsertCity,
  createRestaurant, updateRestaurant, deleteRestaurant,
  upsertDailyMenu, deleteMenu,
  logChat, getPopularQueries, getCitiesToday,
};
