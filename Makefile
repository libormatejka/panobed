COMPOSE = docker compose --project-name panobed -f .docker/docker-compose.yml

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

# ── Produkce ──────────────────────────────────────────────────────────────────

# Spustí celý stack (build + up)
start:
	$(COMPOSE) up -d --build

.PHONY: up down restart build rebuild logs shell install start
