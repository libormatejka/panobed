# Pan Oběd

Chatbot pro vyhledávání obědových menu v restauracích. Uživatel se zeptá přirozeným jazykem (česky), chatbot vytáhne data z databáze a odpoví přehledným seznamem menu.

---

## Požadavky

- Docker
- Anthropic API klíč (console.anthropic.com)

---

## Nastavení

```bash
cp .env.example .env
# doplň ANTHROPIC_API_KEY a ADMIN_API_KEY do .env
make start
```

---

## Služby

| služba | URL | popis |
|--------|-----|-------|
| Chat widget | http://localhost:3000 | webový chat – Pan Oběd |
| Backend API | http://localhost:3000/api/chat | chat endpoint |
| Admin API | http://localhost:3000/admin | správa dat (vyžaduje X-Admin-Key) |
| Databáze UI | http://localhost:8081 | sqlite-web – prohlížeč DB |

---

## Databáze

Typ: **SQLite** (soubor `panobed.db` v Docker volume `panobed_db-data`)

### Přístup přes prohlížeč

Otevři **http://localhost:8081** – žádné heslo není potřeba.

### Přístup přes shell

```bash
make shell
# uvnitř kontejneru:
ls /app/data/        # zde leží panobed.db
```

### Schéma

```
cities        – města (id, name, slug)
restaurants   – restaurace (id, name, address, city_id, phone, website, active)
daily_menus   – denní menu (id, restaurant_id, date)
menu_items    – položky menu (id, daily_menu_id, name, price)
```

Cena je uložena v **haléřích** – např. `12900` = 129 Kč.

---

## Proměnné prostředí (.env)

| proměnná | popis |
|----------|-------|
| `ANTHROPIC_API_KEY` | Klíč z console.anthropic.com |
| `ADMIN_API_KEY` | Tajný klíč pro Admin API (vygeneruj náhodně) |
| `PORT` | Port backendu (výchozí: 3000) |
| `DB_PATH` | Cesta k SQLite souboru uvnitř kontejneru |

---

## Příkazy (Makefile)

| příkaz | popis |
|--------|-------|
| `make up` | spustí kontejnery na pozadí |
| `make down` | zastaví a odstraní kontejnery |
| `make restart` | restartuje kontejnery |
| `make build` | builduje image (s cache) |
| `make rebuild` | builduje image od nuly |
| `make logs` | sleduje logy živě |
| `make shell` | otevře shell uvnitř backend kontejneru |
| `make install` | spustí `npm install` (po přidání závislosti) |
| `make db:reset` | smaže a znovu inicializuje DB (seed data) |
| `make db:menus` | vypíše dnešní menu z DB do terminálu |
| `make start` | build + up najednou |
| `make scrape:all` | nascrapuje menu ze všech uložených restaurací (menicka.cz) |
| `make scrape:menicka URLS="<url>"` | nascrapuje konkrétní URL z menicka.cz |

---

## Scraping

Scraper stahuje denní menu z [menicka.cz](https://www.menicka.cz) a ukládá je do DB přes Admin API.

```bash
# Nascrapuje všechny uložené restaurace
make scrape:all

# Nascrapuje konkrétní URL
make scrape:menicka URLS="https://www.menicka.cz/1064-nase-hospoda-smichovska.html"
```

Scraper automaticky:
- přidá město a restauraci do DB pokud neexistují
- přepíše menu pro daný den při opakovaném spuštění (idempotentní)
- zpracuje více dnů najednou (menicka.cz zobrazuje menu na více dní dopředu)

Aktuálně nakonfigurované restaurace (`make scrape:all`):
- Naše Hospoda Smíchovská – https://www.menicka.cz/1064-nase-hospoda-smichovska.html
- Bohémská Hospoda – https://www.menicka.cz/1649-bohemska-hospoda.html
- Severka – https://www.menicka.cz/10036-severka.html

---

## Admin API

Správa restaurací a menu. Dokumentace: [docs/AdminApi.md](docs/AdminApi.md)

Autentizace přes hlavičku `X-Admin-Key` (hodnota z `.env`).

```bash
# Příklad – seznam restaurací
curl http://localhost:3000/admin/restaurants \
  -H "X-Admin-Key: <tvůj klíč>"
```

---

## Architektura

```
Uživatel → Chat Widget (widget/)
               ↓ POST /api/chat
           Backend (src/index.js)
               ↓
           Claude API – claude-haiku-4-5
           (tool use: search_menus, list_cities, get_restaurant_detail)
               ↓
           SQLite databáze (better-sqlite3)
```

### Struktura projektu

```
panobed/
├── src/
│   ├── index.js      – Express server, routy
│   ├── claude.js     – komunikace s Claude API (tool use smyčka)
│   ├── tools.js      – definice a vykonání Claude tools
│   ├── queries.js    – DB dotazy (read + write)
│   ├── db.js         – SQLite připojení
│   └── admin.js      – Admin API routy
├── widget/
│   ├── index.html    – chat UI
│   ├── chat.js       – logika chatu (pure JS)
│   └── chat.css      – styly
├── db/
│   ├── 001_init.sql  – schéma
│   ├── 002_seed.sql  – testovací data (Pardubice)
│   └── setup.js      – inicializační skript
├── docs/
│   └── AdminApi.md   – dokumentace Admin API
├── .docker/
│   ├── docker-compose.yml
│   └── node/Dockerfile
├── .env.example
├── Makefile
└── package.json
```

---

## Náklady Claude API

Model: `claude-haiku-4-5` (nejlevnější)

| | cena |
|--|------|
| Input | $0.80 / 1M tokenů |
| Output | $4.00 / 1M tokenů |
| Typický dotaz | ~$0.005 (půl centu) |

Spotřeba se loguje po každém dotazu: `[usage total] input=X output=Y cost=$Z`
