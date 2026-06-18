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

  const maxPages = parseInt(options.pages || 1, 10) || 1;
  const delayMs = parseInt(options.delayMs || 0, 10) || 0;
  const resultsAccum = [];
  const seen = new Set();

  // prepare base params (we'll add page token when provided)
  const baseParams = { apikey: apiKey };
  if (keyword && String(keyword).trim()) baseParams.q = String(keyword).trim();
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
    baseParams.language = code;
  }
  if (options.country) baseParams.country = options.country;

  let nextPageToken = null;

  let pagesFetched = 0;
  let paginationUnsupported = false;

  for (let i = 0; i < maxPages; i++) {
    const params = { ...baseParams };
    if (nextPageToken) params.page = nextPageToken; // newsdata uses opaque page token

    let response;
    try {
      response = await axios.get(BASE_URL, { params });
    } catch (err) {
      if (err.response) {
        const status = err.response.status;
        const body = err.response.data;
        const msg = (body && body.status) ? JSON.stringify(body) : (err.response.statusText || 'Unknown error from NewsData');
        if (status === 422 && String(msg).toLowerCase().includes('pagination')) {
          console.warn('NewsData pagination unsupported for these params, returning accumulated results. Detail:', msg);
          paginationUnsupported = true;
          break;
        }
        throw new Error(`NewsData API error ${status}: ${msg}`);
      }
      throw err;
    }

    const results = response.data && response.data.results ? response.data.results : [];
    const token = response.data && response.data.nextPage ? response.data.nextPage : null;

    if (!results || results.length === 0) break;

    for (const article of results) {
      const id = article.article_id || article.id || JSON.stringify(article).slice(0, 40);
      if (seen.has(id)) continue;
      seen.add(id);
      resultsAccum.push({ ...article, _searchKeyword: keyword });
    }

    pagesFetched++;

    // stop if no further token provided
    if (!token) break;

    nextPageToken = token;

    // delay between requests
    if (delayMs > 0) await new Promise(resolve => setTimeout(resolve, delayMs));
  }

  // attach meta information about pagination
  try {
    resultsAccum.meta = {
      fetchedPages: pagesFetched,
      maxPages: maxPages,
      partial: paginationUnsupported || (pagesFetched >= maxPages)
    };
  } catch (e) {
    // ignore
  }

  return resultsAccum;
}

module.exports = { fetchArticlesByKeyword };
