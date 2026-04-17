const { Router } = require('express');
const {
  listCities, listRestaurants, getMenusForDate,
  upsertCity,
  createRestaurant, updateRestaurant, deleteRestaurant,
  upsertDailyMenu, deleteMenu,
} = require('./queries');

const router = Router();

// Autentizace – všechny admin endpointy vyžadují X-Admin-Key
router.use((req, res, next) => {
  const key = req.headers['x-admin-key'];
  if (!key || key !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ error: 'Neplatný nebo chybějící X-Admin-Key.' });
  }
  next();
});

// ── Cities ────────────────────────────────────────────────────────────────────

router.get('/cities', (_req, res) => {
  res.json(listCities());
});

router.post('/cities', (req, res) => {
  const { name, slug } = req.body;
  if (!name || !slug) return res.status(400).json({ error: 'Povinná pole: name, slug' });
  const city = upsertCity(name, slug.toLowerCase());
  res.status(201).json(city);
});

// ── Restaurants ───────────────────────────────────────────────────────────────

router.get('/restaurants', (req, res) => {
  res.json(listRestaurants(req.query.city));
});

router.post('/restaurants', (req, res) => {
  const { name, address, city_id, phone, website, district } = req.body;
  if (!name || !address || !city_id) {
    return res.status(400).json({ error: 'Povinná pole: name, address, city_id' });
  }
  const restaurant = createRestaurant({ name, address, city_id, phone, website, district });
  res.status(201).json(restaurant);
});

router.put('/restaurants/:id', (req, res) => {
  const restaurant = updateRestaurant(Number(req.params.id), req.body);
  if (!restaurant) return res.status(404).json({ error: 'Restaurace nenalezena.' });
  res.json(restaurant);
});

router.delete('/restaurants/:id', (req, res) => {
  deleteRestaurant(Number(req.params.id));
  res.status(204).send();
});

// ── Menus ─────────────────────────────────────────────────────────────────────

router.get('/menus', (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  res.json(getMenusForDate(date));
});

// Uloží nebo přepíše celé denní menu restaurace
// Body: { restaurant_id, date, items: [{ name, price }] }
router.post('/menus', (req, res) => {
  const { restaurant_id, date, items } = req.body;
  if (!restaurant_id || !date || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Povinná pole: restaurant_id, date, items[]' });
  }
  // Validace položek
  for (const item of items) {
    if (!item.name) return res.status(400).json({ error: 'Každá položka musí mít pole name.' });
  }
  const menu = upsertDailyMenu(restaurant_id, date, items);
  res.status(201).json(menu);
});

router.delete('/menus', (req, res) => {
  const { restaurant_id, date } = req.query;
  if (!restaurant_id || !date) {
    return res.status(400).json({ error: 'Povinné query parametry: restaurant_id, date' });
  }
  const deleted = deleteMenu(Number(restaurant_id), date);
  if (!deleted) return res.status(404).json({ error: 'Menu nenalezeno.' });
  res.status(204).send();
});

module.exports = router;
