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
           Databáze (PostgreSQL)
```

---

## FÁZE 1 – Databáze a datová vrstva

### 1.1 Návrh schématu (POC – zjednodušeno)
- [x] Definovat tabulku `cities` (id, name, slug)
- [x] Definovat tabulku `restaurants` (id, name, address, city_id, phone, website, active)
- [x] Definovat tabulku `daily_menus` (id, restaurant_id, date)
- [x] Definovat tabulku `menu_items` (id, daily_menu_id, name, price) – bez typů, bez alergenů
- [x] Rozhodnout: SQLite pro POC (soubor `panobed.db` v kořeni projektu)

### 1.2 Nastavení databáze
- [x] Napsat migrační SQL skript `db/001_init.sql`
- [x] Napsat setup skript `db/setup.sh`
- [ ] **Nainstalovat Node.js** (potřeba pro backend i spuštění DB skriptu přes `better-sqlite3`)
- [ ] Spustit `db/setup.sh` a ověřit data

### 1.3 Seed data (testovací data)
- [x] Přidat 1 město (Pardubice)
- [x] Přidat 5 testovacích restaurací s adresami
- [x] Přidat denní menu pro každou restauraci (dnes 2026-04-08 + zítra 2026-04-09) → `db/002_seed.sql`
- [ ] Ověřit data po spuštění setup skriptu

---

## FÁZE 2 – Backend API

### 2.1 Inicializace projektu
- [x] `npm init` – Node.js projekt, `package.json` se závislostmi
- [x] Nainstalovat závislosti: `express`, `better-sqlite3`, `@anthropic-ai/sdk`, `dotenv`, `cors`
- [x] Nastavit `.env` soubor + `.gitignore`
- [x] Struktura: `src/db.js`, `src/queries.js`, `src/tools.js`, `src/claude.js`, `src/index.js`

### 2.2 Databázová vrstva
- [x] `src/db.js` – připojení k SQLite
- [x] `src/queries.js` – `searchMenus`, `listCities`, `getRestaurantDetail`

### 2.3 Claude Tools
- [x] `src/tools.js` – definice tools + `executeTool`
- [x] System prompt v češtině

### 2.4 Chat endpoint
- [x] `POST /api/chat` – smyčka zpráva → Claude → tool call → DB → odpověď
- [x] Ošetření chyb

### 2.5 Testování backendu
- [x] Dotaz: "Co mají dnes v Pardubicích?" → ✅ funguje

---

## FÁZE 3 – Chat widget (Frontend)

### 3.1 Základní chat UI
- [x] `widget/index.html` – demo stránka
- [x] `widget/chat.js` – pure JS, odeslání, odpověď, loading, typing indicator
- [x] `widget/chat.css` – responzivní design, mobile-first
- [x] Servováno přes Express static (`/`)

### 3.2 Embeddable script
- [ ] Zabalit widget do `<script>` tagu – `widget.js`
- [ ] Tlačítko (chat bubble) v rohu stránky, klik otevře chat okno
- [ ] Konfigurace přes `data-` atributy: `data-api-url`, `data-city`
- [ ] Otestovat embed na prázdné HTML stránce

### 3.3 UX detaily (post-POC)
- [ ] Zobrazit restaurace jako karty (název, adresa, cena menu)
- [ ] Odkaz "Zobrazit na mapě" (Google Maps URL z adresy)

---

## FÁZE 4 – Správa dat (Admin)

### 4.1 Základní admin API
- [ ] `POST /admin/restaurants` – přidat restauraci
- [ ] `POST /admin/menus` – přidat denní menu
- [ ] `PUT /admin/menus/:id` – upravit menu
- [ ] `DELETE /admin/menus/:id` – smazat menu
- [ ] Zabezpečit admin endpointy API klíčem (hlavička `X-Admin-Key`)

### 4.2 Import dat (volitelné pro MVP)
- [ ] Navrhnout CSV formát pro hromadný import menu
- [ ] Endpoint `POST /admin/import` – nahrát CSV soubor
- [ ] Validace dat při importu (datum, povinná pole)

---

## FÁZE 5 – Nasazení

### 5.1 Příprava na produkci
- [ ] Dockerfile pro backend
- [ ] docker-compose.yml (backend + PostgreSQL)
- [ ] Produkční environment variables
- [ ] Health check endpoint `GET /health`

### 5.2 Deployment
- [ ] Vybrat hosting (Railway / Render / VPS)
- [ ] Nastavit produkční DB (managed PostgreSQL)
- [ ] Nasadit a ověřit funkčnost
- [ ] Nastavit SSL / HTTPS

### 5.3 Monitoring (základní)
- [ ] Logování chyb (konzole → soubor nebo služba)
- [ ] Alert při výpadku API

---

## Pořadí priorit (MVP)

| Priorita | Fáze | Výstup |
|----------|------|--------|
| 1 | 1.1 – 1.3 | Funkční DB se seed daty |
| 2 | 2.1 – 2.5 | Backend API odpovídá na dotazy |
| 3 | 3.1 – 3.2 | Embeddable widget |
| 4 | 4.1 | Admin API pro přidávání dat |
| 5 | 5.x | Nasazení na web |

---

## Rozhodnutí a omezení POC

| Otázka | Rozhodnutí |
|--------|-----------|
| DB pro POC | SQLite (nulová konfigurace, soubor v projektu) |
| Menu položky | Plochá struktura – název + cena, bez typů a alergenů |
| Kontext chatu | Single-turn (každá zpráva samostatně), bez session historie |
| Město | Pardubice jako výchozí, struktura generická |
| Backend | Node.js + Express |
| Data | Ručně zadaná seed data pro POC |

## Otevřené otázky (post-POC)

1. **Odkud přicházejí data?** Ruční zadávání vs. scraping webu restaurací
2. **Kontext konverzace?** Přidat session historii po POC?
3. **Typy položek?** Polévka / hlavní / dezert rozlišovat v dalši verzi?
4. **Alergeny?** Přidat v další verzi?
