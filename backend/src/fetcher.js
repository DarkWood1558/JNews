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

async function fetchForKeyword(keyword, language) {
  try {
    const params = {};
    if (language) params.language = language;
    const rawArticles = await fetchArticlesByKeyword(keyword, params);
    const savedArticles = [];

    for (const raw of rawArticles) {
      if (!raw.article_id) continue;
      const xml = articleToXml({ ...raw, _searchKeyword: keyword });

      const doc = await Article.findOneAndUpdate(
        { articleId: raw.article_id },
        {
          articleId: raw.article_id,
          title: raw.title || '(ohne Titel)',
          description: raw.description || '',
          link: raw.link || '',
          source: raw.source_id || raw.source_name || '',
          imageUrl: raw.image_url || '',
          publishedAt: raw.pubDate ? new Date(raw.pubDate) : undefined,
          language: raw.language || '',
          country: raw.country || [],
          category: raw.category || [],
          keyword: keyword,
          xmlRaw: xml
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      savedArticles.push(doc);
    }

    await Search.create({ keyword, language: language || '', country: '', resultCount: savedArticles.length });

    console.log(`Fetched ${savedArticles.length} articles for keyword="${keyword}" language="${language || ''}"`);
    return savedArticles.length;
  } catch (err) {
    console.error(`Error fetching articles for keyword="${keyword}":`, err.message || err);
    return 0;
  }
}

async function fetchOnce(keywords) {
  if (!keywords || keywords.length === 0) {
    console.log('No DAILY_KEYWORDS configured; skipping daily fetch.');
    return;
  }

  const rawLang = process.env.DAILY_LANGUAGES || '';
  const languages = rawLang.split(',').map(s => s.trim()).filter(Boolean);

  console.log('Starting daily fetch for keywords:', keywords, 'languages:', languages.length ? languages : 'ALL');

  for (const kw of keywords) {
    if (languages.length === 0) {
      await fetchForKeyword(kw, null);
    } else {
      for (const lang of languages) {
        await fetchForKeyword(kw, lang);
      }
    }
  }
  console.log('Daily fetch run completed.');
}

function scheduleDailyRun() {
  const raw = process.env.DAILY_KEYWORDS || '';
  const keywords = raw.split(',').map(s => s.trim()).filter(Boolean);

  const hour = parseInt(process.env.DAILY_HOUR || '2', 10); // default 02:00
  const min = parseInt(process.env.DAILY_MIN || '0', 10);

  // compute next run
  const now = new Date();
  const next = new Date(now);
  next.setHours(hour, min, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);

  const msToNext = next.getTime() - now.getTime();
  console.log(`Scheduling daily fetch at ${hour.toString().padStart(2,'0')}:${min.toString().padStart(2,'0')} (in ${Math.round(msToNext/1000/60)} minutes)`);

  setTimeout(() => {
    // first run
    fetchOnce(keywords).catch(err => console.error('Daily fetch failed:', err));
    // schedule subsequent runs every 24h
    setInterval(() => {
      fetchOnce(keywords).catch(err => console.error('Daily fetch failed:', err));
    }, 24 * 60 * 60 * 1000);
  }, msToNext);

  // Optionally run immediately on start
  if (process.env.DAILY_RUN_ON_START === 'true') {
    fetchOnce(keywords).catch(err => console.error('Daily fetch failed:', err));
  }
}

module.exports = { scheduleDailyRun, fetchOnce };
