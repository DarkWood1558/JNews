const mongoose = require('mongoose');

/**
 * Artikel-Schema
 * Speichert sowohl die strukturierten Felder (für Suche/Filter in MongoDB)
 * als auch die vollständige XML-Repräsentation des Artikels (xmlRaw),
 * damit der XML-Bezug des Moduls direkt im Dokument abgebildet ist.
 */
const articleSchema = new mongoose.Schema({
  articleId: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  link: { type: String, default: '' },
  source: { type: String, default: '' },
  imageUrl: { type: String, default: '' },
  publishedAt: { type: Date },
  language: { type: String, default: '' },
  country: { type: [String], default: [] },
  category: { type: [String], default: [] },
  keyword: { type: String, required: true }, // Suchbegriff, mit dem der Artikel gefunden wurde
  xmlRaw: { type: String, required: true },   // vollständige XML-Repräsentation
  bookmarked: { type: Boolean, default: false },
  bookmarkNote: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Article', articleSchema);
