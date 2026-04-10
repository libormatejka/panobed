# Pan Oběd – Admin API

Rozhraní pro správu dat (restaurace, města, denní menu).

## Autentizace

Každý požadavek musí obsahovat hlavičku:

```
X-Admin-Key: <tvůj klíč z .env>
```

Bez platného klíče API vrátí `401 Unauthorized`.

---

## Základní URL

```
http://localhost:3000/admin
```

---

## Města

### GET /admin/cities
Vrátí seznam měst.

```bash
curl http://localhost:3000/admin/cities \
  -H "X-Admin-Key: <key>"
```

**Odpověď:**
```json
[
  { "id": 1, "name": "Pardubice", "slug": "pardubice" }
]
```

---

### POST /admin/cities
Přidá nebo aktualizuje město.

**Tělo:**
```json
{
  "name": "Hradec Králové",
  "slug": "hradec-kralove"
}
```

```bash
curl -X POST http://localhost:3000/admin/cities \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: <key>" \
  -d '{"name":"Hradec Králové","slug":"hradec-kralove"}'
```

**Odpověď:** `201 Created` – objekt vytvořeného/aktualizovaného města.

---

## Restaurace

### GET /admin/restaurants
Vrátí seznam restaurací, volitelně filtrovaný podle města.

```bash
# Všechny restaurace
curl http://localhost:3000/admin/restaurants \
  -H "X-Admin-Key: <key>"

# Pouze Pardubice
curl "http://localhost:3000/admin/restaurants?city=pardubice" \
  -H "X-Admin-Key: <key>"
```

**Odpověď:**
```json
[
  {
    "id": 1,
    "name": "Restaurace U Koruny",
    "address": "Náměstí Republiky 12, Pardubice",
    "phone": "466 123 456",
    "website": null,
    "active": 1,
    "city": "pardubice"
  }
]
```

---

### POST /admin/restaurants
Přidá novou restauraci.

**Tělo:**
| pole | typ | povinné | popis |
|------|-----|---------|-------|
| `name` | string | ✓ | Název restaurace |
| `address` | string | ✓ | Celá adresa |
| `city_id` | number | ✓ | ID města (`GET /admin/cities`) |
| `phone` | string | | Telefon |
| `website` | string | | URL webu |

```bash
curl -X POST http://localhost:3000/admin/restaurants \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: <key>" \
  -d '{
    "name": "Nová Restaurace",
    "address": "Hlavní 5, Pardubice",
    "city_id": 1,
    "phone": "466 000 111",
    "website": "https://nova-restaurace.cz"
  }'
```

**Odpověď:** `201 Created` – objekt vytvořené restaurace.

---

### PUT /admin/restaurants/:id
Aktualizuje restauraci. Posílej jen pole, která chceš změnit.

**Měnitelná pole:** `name`, `address`, `phone`, `website`, `active`

```bash
# Deaktivace restaurace
curl -X PUT http://localhost:3000/admin/restaurants/1 \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: <key>" \
  -d '{"active": 0}'

# Aktualizace telefonu
curl -X PUT http://localhost:3000/admin/restaurants/1 \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: <key>" \
  -d '{"phone": "466 999 888"}'
```

**Odpověď:** Aktualizovaný objekt restaurace.

---

### DELETE /admin/restaurants/:id
Smaže restauraci (i všechna její menu).

```bash
curl -X DELETE http://localhost:3000/admin/restaurants/6 \
  -H "X-Admin-Key: <key>"
```

**Odpověď:** `204 No Content`

---

## Menu

### GET /admin/menus
Vrátí přehled denních menu pro dané datum (výchozí: dnes).

```bash
# Dnes
curl http://localhost:3000/admin/menus \
  -H "X-Admin-Key: <key>"

# Konkrétní datum
curl "http://localhost:3000/admin/menus?date=2026-04-09" \
  -H "X-Admin-Key: <key>"
```

**Odpověď:**
```json
[
  {
    "id": 1,
    "date": "2026-04-08",
    "restaurant": "Restaurace U Koruny",
    "restaurant_id": 1
  }
]
```

---

### POST /admin/menus
Uloží nebo **přepíše** celé denní menu restaurace.

> Pokud pro danou restauraci a datum menu již existuje, bude kompletně nahrazeno.
> Toto je záměrné chování pro scraping – scraper vždy pošle aktuální stav.

**Tělo:**
| pole | typ | povinné | popis |
|------|-----|---------|-------|
| `restaurant_id` | number | ✓ | ID restaurace |
| `date` | string | ✓ | Datum `YYYY-MM-DD` |
| `items` | array | ✓ | Pole položek menu |
| `items[].name` | string | ✓ | Název jídla |
| `items[].price` | number | | Cena v haléřích (12900 = 129 Kč) |

```bash
curl -X POST http://localhost:3000/admin/menus \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: <key>" \
  -d '{
    "restaurant_id": 1,
    "date": "2026-04-09",
    "items": [
      { "name": "Gulášová polévka", "price": 4500 },
      { "name": "Svíčková na smetaně s knedlíkem", "price": 15900 },
      { "name": "Smažený sýr s hranolky", "price": 13900 }
    ]
  }'
```

**Odpověď:** `201 Created`
```json
{
  "id": 9,
  "restaurant_id": 1,
  "date": "2026-04-09",
  "items": [
    { "name": "Gulášová polévka", "price": 4500 },
    { "name": "Svíčková na smetaně s knedlíkem", "price": 15900 },
    { "name": "Smažený sýr s hranolky", "price": 13900 }
  ]
}
```

---

### DELETE /admin/menus
Smaže denní menu restaurace pro dané datum.

```bash
curl -X DELETE "http://localhost:3000/admin/menus?restaurant_id=1&date=2026-04-09" \
  -H "X-Admin-Key: <key>"
```

**Odpověď:** `204 No Content`

---

## Typický flow pro scraper

```
1. GET  /admin/cities                      → zjistím ID města
2. GET  /admin/restaurants?city=pardubice  → zjistím ID restaurací
3. POST /admin/restaurants                 → přidám novou restauraci (pokud neexistuje)
4. POST /admin/menus                       → uložím dnešní menu (opakuji pro každou restauraci)
```

### Příklad v Node.js

```javascript
const API = 'http://localhost:3000/admin';
const KEY = process.env.ADMIN_API_KEY;
const headers = { 'Content-Type': 'application/json', 'X-Admin-Key': KEY };

async function saveMenu(restaurantId, date, items) {
  const res = await fetch(`${API}/menus`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ restaurant_id: restaurantId, date, items }),
  });
  return res.json();
}
```
