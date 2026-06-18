const axios = require('axios');

const BASE_URL = 'https://newsdata.io/api/1/latest';

/**
 * Ruft Artikel von NewsData.io für ein bestimmtes Keyword ab.
 * Free Tier: max. 10 Artikel pro Request, 200 Credits/Tag.
 *
 * @param {string} keyword Suchbegriff
 * @param {object} options optionale Filter: language, country
 */
async function fetchArticlesByKeyword(keyword, options = {}) {
  const apiKey = process.env.NEWSDATA_API_KEY;
  if (!apiKey) {
    throw new Error('NEWSDATA_API_KEY ist nicht gesetzt. Bitte in der .env Datei eintragen.');
  }

  const params = {
    apikey: apiKey,
    q: keyword
  };

  // language: accept both ISO codes (en, de, ...) and common English names (english, german, ...)
  if (options.language) {
    const langRaw = String(options.language).trim().toLowerCase();
    const map = {
      english: 'en',
      german: 'de',
      french: 'fr',
      spanish: 'es',
      italian: 'it',
      arabic: 'ar',
      chinese: 'zh',
      portuguese: 'pt',
      russian: 'ru'
    };
    const code = langRaw.length === 2 ? langRaw : (map[langRaw] || langRaw);
    params.language = code;
  }

  if (options.country) params.country = options.country;

  const response = await axios.get(BASE_URL, { params });

  // NewsData.io liefert die Artikel im Feld "results"
  const results = response.data && response.data.results ? response.data.results : [];

  // Suchbegriff an jeden Artikel anhängen, damit er beim XML-Export
  // und in der DB nachvollziehbar bleibt
  return results.map((article) => ({ ...article, _searchKeyword: keyword }));
}

module.exports = { fetchArticlesByKeyword };
