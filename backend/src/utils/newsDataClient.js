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

  const pages = parseInt(options.pages || 1, 10) || 1;
  const resultsAccum = [];
  const seen = new Set();

  for (let page = 1; page <= pages; page++) {
    const params = {
      apikey: apiKey,
      q: keyword,
      page
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

    let response;
    try {
      response = await axios.get(BASE_URL, { params });
    } catch (err) {
      if (err.response) {
        const status = err.response.status;
        const body = err.response.data;
        const msg = (body && body.status) ? JSON.stringify(body) : (err.response.statusText || 'Unknown error from NewsData');
        throw new Error(`NewsData API error ${status}: ${msg}`);
      }
      throw err;
    }

    const results = response.data && response.data.results ? response.data.results : [];

    if (!results || results.length === 0) break; // no more results

    for (const article of results) {
      const id = article.article_id || article.id || JSON.stringify(article).slice(0, 40);
      if (seen.has(id)) continue;
      seen.add(id);
      resultsAccum.push({ ...article, _searchKeyword: keyword });
    }

    // if fewer items returned than expected page size, likely no more pages
    if (results.length < 10) break;
  }

  return resultsAccum;
}

module.exports = { fetchArticlesByKeyword };
