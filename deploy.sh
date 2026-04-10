#!/bin/bash
# Pan Oběd – první nasazení na čistý Ubuntu server
# Použití: bash deploy.sh

set -e

REPO_DIR="/opt/panobed"
CADDY_CONF="/etc/caddy/Caddyfile"

echo "=== Pan Oběd deploy ==="

# ── 1. Docker ─────────────────────────────────────────────────────────────────
if ! command -v docker &>/dev/null; then
  echo "[1/5] Instalace Docker..."
  curl -fsSL https://get.docker.com | sh
  usermod -aG docker "$USER"
  echo "POZOR: Odhlás se a znovu přihlas, aby se skupina docker projevila, pak spusť skript znovu."
  exit 0
else
  echo "[1/5] Docker je nainstalován."
fi

# ── 2. Caddy ──────────────────────────────────────────────────────────────────
if ! command -v caddy &>/dev/null; then
  echo "[2/5] Instalace Caddy..."
  apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
    | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
    | tee /etc/apt/sources.list.d/caddy-stable.list
  apt update && apt install -y caddy
else
  echo "[2/5] Caddy je nainstalován."
fi

# ── 3. Kód ────────────────────────────────────────────────────────────────────
if [ -d "$REPO_DIR" ]; then
  echo "[3/5] Aktualizace kódu (git pull)..."
  git -C "$REPO_DIR" pull
else
  echo "[3/5] Klonování repozitáře..."
  echo "Zadej URL git repozitáře (např. https://github.com/tvuj-nick/panobed.git):"
  read -r REPO_URL
  git clone "$REPO_URL" "$REPO_DIR"
fi

# ── 4. .env ───────────────────────────────────────────────────────────────────
if [ ! -f "$REPO_DIR/.env" ]; then
  echo "[4/5] Nastavení .env..."
  echo "Zadej ANTHROPIC_API_KEY:"
  read -r ANTHROPIC_KEY
  echo "Zadej ADMIN_API_KEY (libovolný tajný řetězec, např. výstup z: openssl rand -hex 32):"
  read -r ADMIN_KEY
  cat > "$REPO_DIR/.env" <<EOF
ANTHROPIC_API_KEY=$ANTHROPIC_KEY
ADMIN_API_KEY=$ADMIN_KEY
PORT=3000
DB_PATH=/app/data/panobed.db
EOF
  echo ".env vytvořen."
else
  echo "[4/5] .env již existuje, přeskakuji."
fi

# ── 5. Caddy konfigurace ───────────────────────────────────────────────────────
echo "[5/5] Caddy konfigurace..."
echo "Zadej doménu pro Pan Oběd (např. panobed.mujweb.cz):"
read -r DOMAIN
cat > "$CADDY_CONF" <<EOF
$DOMAIN {
    reverse_proxy localhost:3000
}
EOF
systemctl reload caddy
echo "Caddy nakonfigurován pro doménu: $DOMAIN"

# ── Start ─────────────────────────────────────────────────────────────────────
echo ""
echo "Spouštím aplikaci..."
cd "$REPO_DIR"
docker compose --project-name panobed \
  -f .docker/docker-compose.yml \
  -f .docker/docker-compose.prod.yml \
  up -d --build

echo ""
echo "=== Hotovo ==="
echo "Aplikace běží na: https://$DOMAIN"
echo "Logy: cd $REPO_DIR && make prod-logs"
echo "DB admin (přes SSH tunel): ssh -L 8081:localhost:8081 user@$(hostname -I | awk '{print $1}')"
