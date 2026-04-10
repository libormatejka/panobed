# Pan Oběd – Plán vývoje

Chatbot pro vyhledávání obědových menu v restauracích.

---

## Přehled architektury

```
Uživatel → Chat Widget (HTML/JS)
               ↓
           Backend API (Node.js + Express)
               ↓
           Claude API (tool use – rozumí dotazům)
               ↓
           SQLite databáze (better-sqlite3)
```

---

## FÁZE 1 – Databáze a datová vrstva ✅

### 1.1 Návrh schématu
- [x] Tabulka `cities` (id, name, slug)
- [x] Tabulka `restaurants` (id, name, address, city_id, phone, website, active)
- [x] Tabulka `daily_menus` (id, restaurant_id, date)
- [x] Tabulka `menu_items` (id, daily_menu_id, name, price) – bez typů, bez alergenů
- [x] Tabulka `chat_log` (id, created_at, user_message, bot_reply, input_tokens, output_tokens, cost_usd)
- [x] SQLite pro POC

### 1.2 Nastavení databáze
- [x] Migrační SQL skript `db/001_init.sql`
- [x] Setup skript `db/setup.js` s migrační tabulkou `_migrations` (idempotentní)

### 1.3 Seed data
- [x] 1 město (Pardubice), 5 testovacích restaurací

---

## FÁZE 2 – Backend API ✅

### 2.1 Inicializace projektu
- [x] Node.js + Express, Docker, docker-compose
- [x] Závislosti: `express`, `better-sqlite3`, `@anthropic-ai/sdk`, `dotenv`, `cors`, `express-rate-limit`
- [x] `.env` soubor + `.gitignore`

### 2.2 Databázová vrstva
- [x] `src/db.js` – připojení k SQLite
- [x] `src/queries.js` – read + write funkce, logování nákladů

### 2.3 Claude Tools
- [x] `src/tools.js` – `list_cities`, `search_menus`, `get_restaurant_detail`
- [x] System prompt v češtině, zobrazuje max 10 restaurací

### 2.4 Chat endpoint
- [x] `POST /api/chat` – tool use smyčka
- [x] Konverzační historie – klient posílá `history[]`, server vrací aktualizovanou historii
- [x] Rate limiting (20 req/min na IP)
- [x] Logování nákladů do DB po každém dotazu

---

## FÁZE 3 – Chat widget ✅

### 3.1 Základní chat UI
- [x] `widget/index.html`, `widget/chat.js`, `widget/chat.css`
- [x] Konverzační historie v paměti prohlížeče (reset při refreshi)
- [x] Typing indicator, loading state

### 3.2 Embeddable script
- [ ] Zabalit widget do `<script>` tagu
- [ ] Chat bubble v rohu stránky
- [ ] Konfigurace přes `data-` atributy

---

## FÁZE 4 – Správa dat ✅

### 4.1 Admin API
- [x] CRUD pro města, restaurace, menu
- [x] Zabezpečeno hlavičkou `X-Admin-Key`
- [x] Dokumentace: `docs/AdminApi.md`

### 4.2 Scraping
- [x] `scraper/scrape.js` – hlavní scraper (paralelní dávky po 5, cache)
- [x] Zdroj: menicka.cz (80+ restaurací pro Pardubice)
- [x] Konfigurace měst v `.env` (`SCRAPE_CITIES=pardubice,brno,...`)
- [x] Idempotentní – přepíše menu při opakovaném spuštění

---

## FÁZE 5 – Nasazení ✅

### 5.1 Infrastruktura
- [x] Dockerfile + docker-compose.yml
- [x] docker-compose.prod.yml (porty na localhost)
- [x] Caddy – reverse proxy + automatické HTTPS (Let's Encrypt)
- [x] UFW firewall (porty 3000, 8081 zablokované zvenku)

### 5.2 Deployment
- [x] Forpsi Cloud VPS (Ubuntu 24.04, OpenStack, 2GB RAM)
- [x] https://panobed.cz – chatbot v produkci
- [x] https://db.panobed.cz – sqlite-web s basic auth
- [x] Cron – automatický scraping každý den v 7:00
- [x] Logy scrapingu: `/var/log/panobed-scraper.log`

### 5.3 Monitoring
- [ ] Alert při výpadku API
- [ ] Sledování nákladů Claude API

---

## Rozhodnutí a omezení

| Otázka | Rozhodnutí |
|--------|-----------|
| DB | SQLite (nulová konfigurace, soubor v Docker volume) |
| Menu položky | Plochá struktura – název + cena, bez typů a alergenů |
| Kontext chatu | Konverzační historie v paměti prohlížeče (reset při refreshi) |
| Výsledky | Max 10 restaurací v odpovědi, pak nabídka upřesnění |
| Backend | Node.js + Express |
| Hosting | Forpsi Cloud VPS, 50–160 Kč/měs |
| Data | Scraping z menicka.cz, automaticky každý den 7:00 |

## Otevřené otázky (budoucí verze)

1. **Embeddable widget** – zabalit do `<script>` tagu pro embed na jiné weby
2. **Více měst** – přidat další města do `SCRAPE_CITIES`
3. **Typy položek** – rozlišovat polévku / hlavní / dezert
4. **Alergeny** – přidat v další verzi
5. **Monitoring nákladů** – alert při překročení limitu Claude API
