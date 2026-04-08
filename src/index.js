require('dotenv').config();
const express = require('express');
const cors    = require('cors');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', app: 'Pan Oběd' });
});

// Chat endpoint – zatím placeholder, Fáze 2
app.post('/api/chat', (req, res) => {
  res.json({ reply: 'Pan Oběd se probouzí... (endpoint bude hotový ve Fázi 2)' });
});

app.listen(PORT, () => {
  console.log(`Pan Oběd backend běží na portu ${PORT}`);
});
