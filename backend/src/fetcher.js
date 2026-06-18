const { fetchArticlesByKeyword } = require('./utils/newsDataClient');
const Article = require('./models/Article');
const Search = require('./models/Search');
const { articleToXml } = require('./utils/xmlConverter');

/**
 * Simple daily fetcher:
 * - Reads DAILY_KEYWORDS (comma separated) from env
 * - Runs once on startup if DAILY_RUN_ON_START=true
 * - Schedules a daily run at DAILY_HOUR:DAILY_MIN (defaults to 02:00)
 */

async function fetchForKeyword(keyword, language, pages, delayMs) {
  try {
    // allow per-call pages/delay override; fall back to env
    const maxPages = typeof pages === 'number' && pages > 0 ? pages : (parseInt(process.env.DAILY_MAX_PAGES || '3', 10) || 3);
    const dMs = typeof delayMs === 'number' && delayMs >= 0 ? delayMs : (parseInt(process.env.DAILY_RATE_DELAY_MS || '1000', 10) || 1000);

    const params = { pages: maxPages, delayMs: dMs };
    if (language) params.language = language;

    // special sentinel: '__ALL__' means fetch without q (all news)
    const isAll = keyword === '__ALL__';
    const rawArticles = await fetchArticlesByKeyword(isAll ? null : keyword, params);
    const savedArticles = [];

    for (const raw of rawArticles) {
      // accept different id fields
      const articleId = raw.article_id || raw.id || (raw.guid && raw.guid['#text']) || null;
      if (!articleId) continue;
      const keywordSaved = isAll ? 'ALL' : (keyword || '');
      const xml = articleToXml({ ...raw, _searchKeyword: keywordSaved });

      const doc = await Article.findOneAndUpdate(
        { articleId: articleId },
        {
          articleId: articleId,
          title: raw.title || '(ohne Titel)',
          description: raw.description || '',
          link: raw.link || '',
          source: raw.source_id || raw.source_name || '',
          imageUrl: raw.image_url || '',
          publishedAt: raw.pubDate ? new Date(raw.pubDate) : undefined,
          language: raw.language || '',
          country: raw.country || [],
          category: raw.category || [],
          keyword: keywordSaved,
          xmlRaw: xml
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      savedArticles.push(doc);
    }

    await Search.create({ keyword: isAll ? 'ALL' : (keyword || ''), language: language || '', country: '', resultCount: savedArticles.length });

    console.log(`Fetched ${savedArticles.length} articles for keyword="${keyword}" language="${language || ''}"`);
    return savedArticles.length;
  } catch (err) {
    console.error(`Error fetching articles for keyword="${keyword}":`, err.message || err);
    return 0;
  }
}

async function fetchOnce(keywords, runConfig = {}) {
  if (!keywords || keywords.length === 0) {
    console.log('No DAILY_KEYWORDS configured; skipping daily fetch.');
    return;
  }

  const rawLang = process.env.DAILY_LANGUAGES || '';
  const languages = rawLang.split(',').map(s => s.trim()).filter(Boolean);

  // daily credit-based distribution
  const credits = parseInt(process.env.NEWSDATA_DAILY_CREDITS || process.env.NEWSDATA_API_CREDITS || '200', 10) || 200;
  const articlesPerCredit = parseInt(process.env.NEWSDATA_ARTICLES_PER_CREDIT || '10', 10) || 10;
  const runsPerDay = parseInt(process.env.DAILY_RUNS_PER_DAY || '3', 10) || 3;

  const totalArticlesPerDay = credits * articlesPerCredit;
  const requestsPerDay = Math.ceil(totalArticlesPerDay / 10); // ~one request returns ~10 articles
  const requestsPerRun = Math.max(1, Math.floor(requestsPerDay / runsPerDay));

  console.log(`Daily credits=${credits}, targetArticles/day=${totalArticlesPerDay}, requests/day~=${requestsPerDay}, requests/run~=${requestsPerRun}`);

  // pairs to iterate
  const pairs = [];
  for (const kw of keywords) {
    if (languages.length === 0) pairs.push({ kw, lang: null });
    else for (const lang of languages) pairs.push({ kw, lang });
  }
  if (pairs.length === 0) {
    console.log('No keyword-language pairs to fetch.');
    return;
  }

  // distribute requests per pair
  const perPairRequests = Math.max(1, Math.floor(requestsPerRun / pairs.length));
  const pagesPerPair = perPairRequests; // since one request == one page token

  // allow overrides in runConfig
  const delayMs = runConfig.delayMs || parseInt(process.env.DAILY_RATE_DELAY_MS || '1000', 10) || 1000;

  console.log('Starting daily fetch for keyword-language pairs:', pairs.length, 'pages per pair:', pagesPerPair, 'delayMs:', delayMs);

  for (const p of pairs) {
    try {
      await fetchForKeyword(p.kw, p.lang, pagesPerPair, delayMs);
    } catch (e) {
      console.error('Error fetching pair', p, e.message || e);
    }
  }

  console.log('Daily fetch run completed.');
}

function scheduleDailyRun() {
  const raw = process.env.DAILY_KEYWORDS || '';
  const keywords = raw.split(',').map(s => s.trim()).filter(Boolean);

  // times config: comma-separated list of HH:MM entries; default three times
  const rawTimes = process.env.DAILY_RUN_TIMES || process.env.DAILY_RUN_TIMES_DEFAULT || '08:00,13:00,20:00';
  const times = rawTimes.split(',').map(s => s.trim()).filter(Boolean);

  if (times.length === 0) {
    console.warn('No DAILY_RUN_TIMES configured; skipping schedule.');
    return;
  }

  for (const t of times) {
    const [hh, mm] = t.split(':').map(x => parseInt(x, 10));
    if (Number.isNaN(hh) || Number.isNaN(mm)) {
      console.warn('Invalid time in DAILY_RUN_TIMES:', t);
      continue;
    }

    // compute next run for this time
    const now = new Date();
    const next = new Date(now);
    next.setHours(hh, mm, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);

    const msToNext = next.getTime() - now.getTime();
    console.log(`Scheduling daily fetch at ${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')} (in ${Math.round(msToNext/1000/60)} minutes)`);

    setTimeout(() => {
      // run at time
      fetchOnce(keywords).catch(err => console.error('Daily fetch failed:', err));
      // schedule subsequent runs every 24h at this time
      setInterval(() => {
        fetchOnce(keywords).catch(err => console.error('Daily fetch failed:', err));
      }, 24 * 60 * 60 * 1000);
    }, msToNext);
  }

  // Optionally run immediately on start
  if (process.env.DAILY_RUN_ON_START === 'true') {
    fetchOnce(keywords).catch(err => console.error('Daily fetch failed:', err));
  }
}

module.exports = { scheduleDailyRun, fetchOnce };
