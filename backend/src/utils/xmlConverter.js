const xml2js = require('xml2js');

const xmlBuilder = new xml2js.Builder({
  rootName: 'article',
  headless: false,
  renderOpts: { pretty: true, indent: '  ', newline: '\n' }
});

/**
 * Wandelt einen einzelnen Artikel (Rohdaten von NewsData.io, also JSON)
 * in ein XML-Dokument um. Das Ergebnis wird als String gespeichert
 * (Feld xmlRaw im Mongoose-Schema).
 *
 * Beispiel-Output:
 * <article>
 *   <id>abc123</id>
 *   <title>...</title>
 *   <description>...</description>
 *   ...
 * </article>
 */
function articleToXml(article) {
  const safe = {
    id: article.article_id || '',
    title: article.title || '',
    description: article.description || '',
    link: article.link || '',
    source: article.source_id || article.source_name || '',
    imageUrl: article.image_url || '',
    publishedAt: article.pubDate || '',
    language: article.language || '',
    country: { country: article.country || [] },
    category: { category: article.category || [] },
    keyword: article._searchKeyword || ''
  };
  return xmlBuilder.buildObject(safe);
}

/**
 * Wandelt eine Liste von Artikeln (z.B. komplette Suchergebnisse)
 * in ein einziges XML-Dokument mit <articles> als Root um.
 * Wird für den Export genutzt (z.B. Bookmarks oder Suchergebnisse als .xml herunterladen).
 */
function articlesToXmlCollection(articles) {
  const builder = new xml2js.Builder({
    rootName: 'articles',
    headless: false,
    renderOpts: { pretty: true, indent: '  ', newline: '\n' }
  });

  const items = articles.map((a) => ({
    id: a.articleId,
    title: a.title,
    description: a.description,
    link: a.link,
    source: a.source,
    imageUrl: a.imageUrl,
    publishedAt: a.publishedAt,
    language: a.language,
    country: { country: a.country || [] },
    category: { category: a.category || [] },
    keyword: a.keyword,
    bookmarked: a.bookmarked
  }));

  return builder.buildObject({ article: items });
}

module.exports = { articleToXml, articlesToXmlCollection };
