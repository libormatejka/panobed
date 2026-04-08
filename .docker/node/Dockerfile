FROM node:22-alpine

WORKDIR /app

# Závislosti se instalují zvlášť, aby se využíval Docker cache
COPY package*.json ./
RUN npm install --omit=dev

COPY . .

# Inicializace DB při prvním spuštění, pak start serveru
CMD ["sh", "-c", "node db/setup.js && node src/index.js"]
