# Debug SQL queries

Spouštěj přes sqlite-web (https://db.panobed.cz) nebo přes SSH:
```bash
docker compose --project-name panobed -f .docker/docker-compose.yml exec backend sh -c "sqlite3 /app/data/panobed.db"
```

---

## Restaurace

### Všechna města v DB
```sql
SELECT * FROM cities ORDER BY name;
```

### Všechny restaurace v daném městě
```sql
SELECT r.id, r.name, r.address, r.district, r.active
FROM restaurants r
JOIN cities c ON c.id = r.city_id
WHERE c.slug = 'pardubice'
ORDER BY r.district, r.name;
```

### Všechny restaurace v daném districtu (obvodu)
```sql
SELECT r.id, r.name, r.address
FROM restaurants r
JOIN cities c ON c.id = r.city_id
WHERE c.slug = 'praha'
  AND r.district = 'Praha 4'
ORDER BY r.name;
```

### Restaurace s dnešním menu v daném městě
```sql
SELECT r.name, r.address, r.district
FROM restaurants r
JOIN cities c ON c.id = r.city_id
JOIN daily_menus dm ON dm.restaurant_id = r.id
WHERE (c.slug = 'pardubice' OR lower(c.name) = 'pardubice')
  AND dm.date = date('now')
  AND r.active = 1
ORDER BY r.district, r.name;
```

### Restaurace s dnešním menu v daném districtu
```sql
SELECT r.name, r.address
FROM restaurants r
JOIN cities c ON c.id = r.city_id
JOIN daily_menus dm ON dm.restaurant_id = r.id
WHERE c.slug = 'praha'
  AND r.district = 'Praha 4'
  AND dm.date = date('now')
  AND r.active = 1
ORDER BY r.name;
```

### Počet restaurací s menu podle měst, districtu a dne
```sql
SELECT c.name AS city, r.district, dm.date, COUNT(DISTINCT r.id) AS restaurants
FROM daily_menus dm
JOIN restaurants r ON r.id = dm.restaurant_id
JOIN cities c ON c.id = r.city_id
GROUP BY c.name, r.district, dm.date
ORDER BY dm.date DESC, c.name, r.district;
```

### Přehled dostupných districtů dnes
```sql
SELECT c.name AS city, r.district, COUNT(DISTINCT r.id) AS restaurants
FROM restaurants r
JOIN cities c ON c.id = r.city_id
JOIN daily_menus dm ON dm.restaurant_id = r.id AND dm.date = date('now')
WHERE r.district IS NOT NULL
GROUP BY c.name, r.district
ORDER BY c.name, r.district;
```

---

## Menu

### Dnešní menu konkrétní restaurace (podle ID)
```sql
SELECT mi.name, mi.price
FROM menu_items mi
JOIN daily_menus dm ON dm.id = mi.daily_menu_id
WHERE dm.restaurant_id = 1
  AND dm.date = date('now');
```

### Dnešní menu všech restaurací v daném městě
```sql
SELECT r.name AS restaurant, r.district, mi.name AS item, mi.price
FROM restaurants r
JOIN cities c ON c.id = r.city_id
JOIN daily_menus dm ON dm.restaurant_id = r.id AND dm.date = date('now')
JOIN menu_items mi ON mi.daily_menu_id = dm.id
WHERE c.slug = 'pardubice'
ORDER BY r.district, r.name, mi.id;
```

### Dnešní menu restaurací v daném districtu
```sql
SELECT r.name AS restaurant, mi.name AS item, mi.price
FROM restaurants r
JOIN cities c ON c.id = r.city_id
JOIN daily_menus dm ON dm.restaurant_id = r.id AND dm.date = date('now')
JOIN menu_items mi ON mi.daily_menu_id = dm.id
WHERE c.slug = 'praha' AND r.district = 'Praha 4'
ORDER BY r.name, mi.id;
```

### Počet menu položek za poslední dny
```sql
SELECT dm.date, COUNT(*) AS items
FROM menu_items mi
JOIN daily_menus dm ON dm.id = mi.daily_menu_id
GROUP BY dm.date
ORDER BY dm.date DESC
LIMIT 14;
```

---

## Chat log

### Posledních 20 dotazů
```sql
SELECT created_at, user_message, response_time_ms, cost_usd
FROM chat_log
ORDER BY created_at DESC
LIMIT 20;
```

### Průměrná doba odpovědi a náklady
```sql
SELECT
  round(avg(response_time_ms) / 1000.0, 1) AS avg_sec,
  round(avg(cost_usd), 6)                  AS avg_cost_usd,
  round(sum(cost_usd), 4)                  AS total_cost_usd,
  COUNT(*)                                 AS total_queries
FROM chat_log;
```

### Nejčastější dotazy
```sql
SELECT user_message, COUNT(*) AS count
FROM chat_log
GROUP BY user_message
ORDER BY count DESC
LIMIT 20;
```
