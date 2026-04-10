COMPOSE      = docker compose --project-name panobed -f .docker/docker-compose.yml
COMPOSE_PROD = docker compose --project-name panobed -f .docker/docker-compose.yml -f .docker/docker-compose.prod.yml

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

# Výpis dnešních menu přímo z DB
db\:menus:
	$(COMPOSE) exec backend node db/print-menus.js

# ── Scraping ──────────────────────────────────────────────────────────────────

# Spustí scraper pro menicka.cz (předej URLs jako URLS="url1 url2")
scrape\:menicka:
	$(COMPOSE) exec backend node scraper/menicka.js $(URLS)

# Scraping všech restaurací v Pardubicích (načte seznam z menicka.cz/pardubice.html)
scrape\:pardubice:
	$(COMPOSE) exec backend sh -c \
		"node scraper/get-city-urls.js pardubice | xargs node scraper/menicka.js"

# Scraping pro jiné město (CITY=hradec-kralove)
scrape\:city:
	$(COMPOSE) exec backend sh -c \
		"node scraper/get-city-urls.js $(CITY) | xargs node scraper/menicka.js"

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
	$(COMPOSE_PROD) up -d --build

.PHONY: up down restart build rebuild logs shell install start prod-up prod-down prod-logs prod-deploy
