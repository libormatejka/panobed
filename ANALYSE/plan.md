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
- [ ] `npm init` – Node.js projekt
- [ ] Nainstalovat závislosti: `express`, `pg`, `@anthropic-ai/sdk`, `dotenv`, `cors`
- [ ] Nastavit `.env` soubor (DB connection string, Anthropic API key)
- [ ] Nastavit `.gitignore` (node_modules, .env)
- [ ] Základní struktura složek: `src/routes`, `src/db`, `src/tools`, `src/claude`

### 2.2 Databázová vrstva (src/db)
- [ ] Vytvořit `db.js` – připojení k PostgreSQL (connection pool)
- [ ] Vytvořit `queries/restaurants.js` – funkce pro dotazy na restaurace
- [ ] Vytvořit `queries/menus.js` – funkce pro dotazy na menu podle města a data
- [ ] Otestovat každou query funkci samostatně (manuální test)

### 2.3 Claude Tools (src/tools)
- [ ] Definovat tool `search_menus(city, date)` – vrátí menu v daném městě a dni
- [ ] Definovat tool `list_cities()` – vrátí dostupná města v databázi
- [ ] Definovat tool `get_restaurant_detail(restaurant_id)` – detail restaurace (adresa, telefon)
- [ ] Napsat system prompt v češtině (Pan Oběd je přátelský, stručný, reaguje česky)

### 2.4 Chat endpoint (src/routes)
- [ ] Vytvořit `POST /api/chat` – přijme `{ message, session_id }`
- [ ] Implementovat smyčku: zpráva → Claude → tool call → DB → Claude → odpověď
- [ ] Ošetřit chyby (DB nedostupná, Claude API chyba, prázdný dotaz)
- [ ] Přidat základní rate limiting (max N dotazů / minuta / IP)
- [ ] Vrátit `{ reply, sources[] }` – odpověď + seznam restaurací jako zdroje

### 2.5 Testování backendu
- [ ] Otestovat `/api/chat` přes curl nebo Postman
- [ ] Dotaz: "Co mají dnes v Pardubicích?"
- [ ] Dotaz: "Kde mají polévku do 50 Kč?"
- [ ] Dotaz: "Jaká je adresa restaurace X?"
- [ ] Dotaz s překlep nebo neznámým městem – ověřit fallback odpověď

---

## FÁZE 3 – Chat widget (Frontend)

### 3.1 Základní chat UI
- [ ] Vytvořit `widget/index.html` – jednoduchá chat stránka pro vývoj/demo
- [ ] Vytvořit `widget/chat.js` – pure JS, žádný framework
- [ ] Implementovat: odeslání zprávy, zobrazení odpovědi, loading stav
- [ ] Responzivní design (mobile-first, funguje na 320px+)

### 3.2 Embeddable script
- [ ] Zabalit widget do `<script>` tagu – `widget.js`
- [ ] Tlačítko (chat bubble) v rohu stránky, klik otevře chat okno
- [ ] Konfigurace přes `data-` atributy: `data-api-url`, `data-city` (volitelný výchozí)
- [ ] Otestovat embed na prázdné HTML stránce

### 3.3 UX detaily
- [ ] Uvítací zpráva od Pan Oběda při otevření chatu
- [ ] Zobrazit restaurace jako karty (název, adresa, cena menu)
- [ ] Odkaz "Zobrazit na mapě" (Google Maps URL z adresy)
- [ ] Datum a čas v UI – ať uživatel vidí, pro který den jsou data

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
