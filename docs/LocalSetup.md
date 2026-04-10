# Lokální prostředí – rychlý start

## Požadavky
- Docker Desktop (spuštěný)
- Soubor `.env` s vyplněnými klíči

---

## 1. První spuštění

```bash
cp .env.example .env
# doplň ANTHROPIC_API_KEY a ADMIN_API_KEY do .env

make start          # build + spuštění kontejnerů
```

## 2. Otevři v prohlížeči

| co | URL |
|----|-----|
| Chatbot | http://localhost:3000 |
| Databáze (sqlite-web) | http://localhost:8081 |

---

## 3. Scraping menu

Města pro scraping se konfigurují v `Makefile` (proměnná `SCRAPE_CITIES`):
```makefile
SCRAPE_CITIES = pardubice hradec-kralove brno
```
Slug = část URL na menicka.cz, např. `menicka.cz/hradec-kralove.html` → `hradec-kralove`.

```bash
# Všechna nakonfigurovaná města
make scrape:all

# Konkrétní město
make scrape:city CITY=brno

# Konkrétní URL
make scrape:menicka URLS="https://www.menicka.cz/1064-nase-hospoda.html"
```

---

## Každodenní práce

```bash
make up             # spustit (bez rebuildu)
make down           # zastavit
make restart        # restartovat
make logs           # sledovat logy živě
make rebuild        # přebuildit image (po změně kódu nebo package.json)
make shell          # shell uvnitř kontejneru
```

---

## Databáze

```bash
make db:reset       # smazat a znovu inicializovat DB (pozor – smaže data!)
make db:menus       # vypsat dnešní menu z DB do terminálu
```

---

## Po změně kódu

```bash
# Změna JS souborů v src/ nebo widget/
make rebuild && make up

# Přidání npm balíčku (package.json)
make install
make rebuild && make up
```

---

## Nasazení na produkci (server)

Viz [ServerSetup.md](ServerSetup.md)
