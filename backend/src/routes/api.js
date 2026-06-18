const express = require('express');
const router = express.Router();

const Article = require('../models/Article');
const Search = require('../models/Search');
const { fetchArticlesByKeyword } = require('../utils/newsDataClient');
const { articleToXml, articlesToXmlCollection } = require('../utils/xmlConverter');

/**
 * POST /api/search
 * Body: { keyword, language?, country? }
 *
 * Ruft Artikel von NewsData.io ab, wandelt jeden Artikel in XML um,
 * speichert ihn in MongoDB (sofern noch nicht vorhanden) und gibt
 * die gespeicherten Artikel zurück. Außerdem wird die Suche protokolliert.
 */
router.post('/search', async (req, res) => {
  try {
    const { keyword, language, country } = req.body;
    if (!keyword || !keyword.trim()) {
      return res.status(400).json({ error: 'Keyword darf nicht leer sein.' });
    }

    const pages = parseInt(req.body.pages || 1, 10) || 1;
    const rawArticles = await fetchArticlesByKeyword(keyword.trim(), { language, country, pages });

    const savedArticles = [];
    for (const raw of rawArticles) {
      if (!raw.article_id) continue;

      const xml = articleToXml(raw);

      // upsert: falls Artikel schon existiert, nicht doppelt anlegen
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
          keyword: keyword.trim(),
          xmlRaw: xml
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      savedArticles.push(doc);
    }

    await Search.create({
      keyword: keyword.trim(),
      language: language || '',
      country: country || '',
      resultCount: savedArticles.length
    });

    res.json({ count: savedArticles.length, articles: savedArticles });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Fehler bei der Suche.' });
  }
});

/**
 * GET /api/articles
 * Optional Query-Parameter: keyword, language, country, bookmarked
 * Gibt gespeicherte Artikel aus MongoDB zurück (für Filterung in der GUI).
 */
router.get('/articles', async (req, res) => {
  try {
    const filter = {};
    if (req.query.keyword) filter.keyword = req.query.keyword;
    if (req.query.language) filter.language = req.query.language;
    if (req.query.country) filter.country = req.query.country;
    if (req.query.bookmarked !== undefined) filter.bookmarked = req.query.bookmarked === 'true';

    const articles = await Article.find(filter).sort({ publishedAt: -1 });
    res.json(articles);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fehler beim Laden der Artikel.' });
  }
});

/**
 * PATCH /api/articles/:id/bookmark
 * Body: { bookmarked: boolean, note?: string }
 * Setzt oder entfernt ein Lesezeichen für einen Artikel.
 */
router.patch('/articles/:id/bookmark', async (req, res) => {
  try {
    const { bookmarked, note } = req.body;
    const update = { bookmarked: !!bookmarked };
    if (note !== undefined) update.bookmarkNote = note;

    const article = await Article.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!article) return res.status(404).json({ error: 'Artikel nicht gefunden.' });

    res.json(article);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fehler beim Aktualisieren des Bookmarks.' });
  }
});

/**
 * GET /api/searches
 * Gibt den Suchverlauf zurück (neueste zuerst).
 */
router.get('/searches', async (req, res) => {
  try {
    const searches = await Search.find().sort({ createdAt: -1 }).limit(50);
    res.json(searches);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fehler beim Laden des Suchverlaufs.' });
  }
});

/**
 * GET /api/export/xml
 * Optional Query-Parameter: keyword, bookmarked
 * Exportiert die (gefilterten) Artikel als XML-Datei zum Download.
 */
router.get('/export/xml', async (req, res) => {
  try {
    const filter = {};
    if (req.query.keyword) filter.keyword = req.query.keyword;
    if (req.query.language) filter.language = req.query.language;
    if (req.query.bookmarked !== undefined) filter.bookmarked = req.query.bookmarked === 'true';

    const articles = await Article.find(filter).sort({ publishedAt: -1 });
    const xml = articlesToXmlCollection(articles);

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', 'attachment; filename="news-export.xml"');
    res.send(xml);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fehler beim XML-Export.' });
  }
});

/**
 * GET /api/articles/:id/xml
 * Gibt die XML-Repräsentation eines einzelnen Artikels zurück.
 */
router.get('/articles/:id/xml', async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) return res.status(404).json({ error: 'Artikel nicht gefunden.' });

    res.setHeader('Content-Type', 'application/xml');
    res.send(article.xmlRaw);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fehler beim Laden der XML-Daten.' });
  }
});

module.exports = router;
