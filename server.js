require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const apiRoutes = require('./backend/src/routes/api');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://mongo:27017/newsdb';

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api', apiRoutes);

async function start() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB verbunden:', MONGO_URI);

    app.listen(PORT, () => {
      console.log(`Backend läuft auf Port ${PORT}`);
    });
  } catch (err) {
    console.error('Fehler beim Start des Servers:', err);
    process.exit(1);
  }
}

start();
