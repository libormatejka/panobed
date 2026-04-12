COMPOSE      = docker compose --project-name panobed -f .docker/docker-compose.yml
COMPOSE_PROD = docker compose --project-name panobed -f .docker/docker-compose.yml -f .docker/docker-compose.prod.yml

export GIT_COMMIT := $(shell git rev-parse --short HEAD 2>/dev/null || echo unknown)

# Konfigurace měst je v .env (SCRAPE_CITIES=pardubice,brno,...)

# ── Základní operace ──────────────────────────────────────────────────────────

up:
	$(COMPOSE) up -d

down:
	$(COMPOSE) down

restart:
	$(COMPOSE) restart

build:
	$(COMPOSE) build

rebuild:
	$(COMPOSE) build --no-cache

logs:
	$(COMPOSE) logs -f

# ── Vývoj ─────────────────────────────────────────────────────────────────────

# Shell uvnitř kontejneru
shell:
	$(COMPOSE) exec backend sh

# npm install (po přidání nové závislosti do package.json)
install:
	$(COMPOSE) run --rm backend npm install

# ── Databáze ──────────────────────────────────────────────────────────────────

# Ruční reinicializace DB (smaže a znovu vytvoří)
db\:reset:
	$(COMPOSE) exec backend sh -c "rm -f /app/data/panobed.db && node db/setup.js"

# Smaže všechna data (restaurace, menu, města) ale zachová schéma
db\:truncate:
	$(COMPOSE) exec backend sh -c "node -e \
		\"const db = require('./src/db'); \
		db.prepare('DELETE FROM menu_items').run(); \
		db.prepare('DELETE FROM daily_menus').run(); \
		db.prepare('DELETE FROM restaurants').run(); \
		db.prepare('DELETE FROM cities').run(); \
		console.log('Hotovo – všechny tabulky jsou prázdné.');\""

# Výpis dnešních menu přímo z DB
db\:menus:
	$(COMPOSE) exec backend node db/print-menus.js

# ── Scraping ──────────────────────────────────────────────────────────────────

# Spustí scraper pro menicka.cz (předej URLs jako URLS="url1 url2")
scrape\:menicka:
	$(COMPOSE) exec backend node scraper/menicka.js $(URLS)

# Scraping všech měst z SCRAPE_CITIES (.env)
scrape\:all:
	$(COMPOSE) exec backend node scraper/scrape.js

# Scraping pro konkrétní město (CITY=hradec-kralove)
scrape\:city:
	$(COMPOSE) exec -e SCRAPE_CITIES=$(CITY) backend node scraper/scrape.js

# ── Produkce ──────────────────────────────────────────────────────────────────

# Lokální vývoj: build + up
start:
	$(COMPOSE) up -d --build

# Produkční start (porty jen na localhost, přes Caddy)
prod-up:
	$(COMPOSE_PROD) up -d --build

prod-down:
	$(COMPOSE_PROD) down

prod-logs:
	$(COMPOSE_PROD) logs -f

# Pull + rebuild + restart (pro update na serveru)
prod-deploy:
	git pull
	$(COMPOSE_PROD) down
	sleep 3
	$(COMPOSE_PROD) up -d --build

SERVER = root@194.182.79.4

# ── Produkční server ──────────────────────────────────────────────────────────

# SSH připojení k serveru
ssh:
	ssh $(SERVER)

# SSH tunel pro přístup k DB (sqlite-web → http://localhost:8081)
ssh\:db:
	ssh -L 8081:localhost:8081 $(SERVER) -N

version\:patch:
	npm version patch

version\:minor:
	npm version minor

version\:major:
	npm version major

.PHONY: up down restart build rebuild logs shell install start prod-up prod-down prod-logs prod-deploy ssh ssh\:db version\:patch version\:minor version\:major
