# Pan Oběd

Chatbot pro vyhledávání obědových menu v restauracích.

## Požadavky

- Docker
- Anthropic API klíč

## Nastavení

Zkopíruj `.env.example` do `.env` a doplň `ANTHROPIC_API_KEY`:

```bash
cp .env.example .env
```

## Příkazy

| příkaz | popis |
|---|---|
| `make up` | spustí kontejner na pozadí |
| `make down` | zastaví a odstraní kontejner |
| `make restart` | restartuje kontejner |
| `make build` | builduje image (s cache) |
| `make rebuild` | builduje image od nuly |
| `make logs` | sleduje logy živě |
| `make shell` | otevře shell uvnitř kontejneru |
| `make install` | spustí `npm install` (po přidání závislosti) |
| `make db:reset` | smaže a znovu inicializuje DB |
| `make db:menus` | vypíše dnešní menu z DB |
| `make start` | build + up najednou |
