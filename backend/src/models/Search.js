const mongoose = require('mongoose');

/**
 * Speichert jede durchgeführte Suche, damit der Nutzer
 * seinen Suchverlauf einsehen und Suchen wiederholen kann.
 */
const searchSchema = new mongoose.Schema({
  keyword: { type: String, required: true },
  language: { type: String, default: '' },
  country: { type: String, default: '' },
  resultCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Search', searchSchema);
