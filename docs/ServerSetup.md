# Server Setup – příkazy pro produkci

Server: `root@194.182.79.4` (panobed.cz)
Forpsi Cloud VPS, Ubuntu 24.04, OpenStack, Docker šablona

---

## Připojení k serveru

```bash
make ssh
# nebo přímo:
ssh root@194.182.79.4
```

## Přístup do produkční databáze (SSH tunel)

Spustit lokálně (ne na serveru):
```bash
make ssh:db
# nebo přímo:
ssh -L 8081:localhost:8081 root@194.182.79.4 -N
```
Pak otevřít: http://localhost:8081

---

## První nasazení

```bash
# Instalace make
apt install -y make

# Klonování repozitáře
git clone https://github.com/libormatejka/panobed /opt/panobed

# Nastavení .env
cp /opt/panobed/.env.example /opt/panobed/.env
nano /opt/panobed/.env

# Firewall
ufw allow 22
ufw allow 80
ufw allow 443
ufw deny 3000
ufw deny 8081
ufw enable

# Instalace Caddy
apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update && apt install -y caddy

# Konfigurace Caddy
nano /etc/caddy/Caddyfile
systemctl reload caddy

# Spuštění aplikace
cd /opt/panobed
make up
```

---

## Správa aplikace

```bash
cd /opt/panobed

make up          # spustit
make down        # zastavit
make restart     # restartovat
make logs        # zobrazit logy
make rebuild     # rebuild + restart (po změně kódu)
```

## Update aplikace (nová verze z GitHubu)

```bash
cd /opt/panobed
git pull
make rebuild
```

---

## Scraping menu

Města se konfigurují v `/opt/panobed/.env` (proměnná `SCRAPE_CITIES`):
```
SCRAPE_CITIES=pardubice,hradec-kralove
```

```bash
cd /opt/panobed

# Všechna nakonfigurovaná města
make scrape:all

# Konkrétní město
make scrape:city CITY=pardubice

# Konkrétní URL
make scrape:menicka URLS="https://www.menicka.cz/1649-bohemska-hospoda.html"
```

### Automatický cron (každý den 7:00)

Nastaveno přes `crontab -e`:
```
0 7 * * * cd /opt/panobed && docker compose --project-name panobed -f .docker/docker-compose.yml exec -T backend node scraper/scrape.js >> /var/log/panobed-scraper.log 2>&1
```

Zobrazit logy scrapingu:
```bash
tail -f /var/log/panobed-scraper.log
```

---

## Databáze (sqlite-web)

### Přes SSH tunel (lokálně)
```bash
ssh -L 8081:localhost:8081 root@194.182.79.4 -N
# otevřít: http://localhost:8081
```

### Přes subdoménu db.panobed.cz (s heslem)

1. Vygeneruj hash hesla:
```bash
caddy hash-password
```

2. Uprav `/etc/caddy/Caddyfile`, přidej:
```
db.panobed.cz {
    basicauth {
        admin $2a$14$...HASH...
    }
    reverse_proxy localhost:8081
}
```

3. Reload Caddy:
```bash
systemctl reload caddy
```

---

## Caddyfile (aktuální konfigurace)

```
panobed.cz {
    reverse_proxy localhost:3000
}

www.panobed.cz {
    redir https://panobed.cz{uri} permanent
}

db.panobed.cz {
    basicauth {
        admin $2a$14$...HASH...
    }
    header Content-Security-Policy "upgrade-insecure-requests"
    reverse_proxy localhost:8081
}
```

Soubor: `/etc/caddy/Caddyfile`

Reload po změně:
```bash
systemctl reload caddy
```
