require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const apiRoutes = require('./routes/api');

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

    // create useful indexes for Article collection and then schedule daily fetches and perform an initial fetch on startup
    try {
      const Article = require('./models/Article');
      // ensure indexes: articleId unique (from schema) and compound index for language+publishedAt
      try {
        await Article.createIndexes();
        await Article.collection.createIndex({ language: 1, publishedAt: -1 });
        console.log('Database indexes ensured for Article collection');
      } catch (ixErr) {
        console.warn('Could not ensure indexes on Article:', ixErr.message || ixErr);
      }

      const { scheduleDailyRun, fetchOnce } = require('./fetcher');

      // Determine keywords to fetch immediately: prefer DAILY_KEYWORDS from env, otherwise use existing keywords in DB
      const raw = process.env.DAILY_KEYWORDS || '';
      const envKeywords = raw.split(',').map(s => s.trim()).filter(Boolean);

      (async () => {
        let keywordsToFetch = envKeywords;
        if (keywordsToFetch.length === 0) {
          try {
            // take distinct keywords already stored in DB
            const existing = await Article.distinct('keyword');
            if (existing && existing.length > 0) {
              keywordsToFetch = existing;
              console.log('No DAILY_KEYWORDS configured; will run initial fetch for existing keywords from DB:', keywordsToFetch);
            } else {
              console.log('No DAILY_KEYWORDS configured and no existing keywords found in DB; skipping initial fetch.');
            }
          } catch (e) {
            console.warn('Failed to read existing keywords from DB for initial fetch:', e.message || e);
          }
        } else {
          console.log('DAILY_KEYWORDS configured; running initial fetch for:', keywordsToFetch);
        }

        if (keywordsToFetch && keywordsToFetch.length > 0) {
          try {
            await fetchOnce(keywordsToFetch);
          } catch (e) {
            console.error('Initial fetch failed:', e.message || e);
          }
        }

        // start the scheduled daily runs (this uses DAILY_KEYWORDS from env inside scheduleDailyRun)
        try {
          scheduleDailyRun();
        } catch (e) {
          console.warn('Failed to schedule daily runs:', e.message || e);
        }
      })();

    } catch (e) {
      console.warn('fetcher not available:', e.message || e);
    }
  } catch (err) {
    console.error('Fehler beim Start des Servers:', err);
    process.exit(1);
  }
}

start();
