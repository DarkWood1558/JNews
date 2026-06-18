package com.newsapp.client;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.newsapp.model.Article;
import com.newsapp.model.SearchEntry;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpResponse.BodyHandlers;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.time.Duration;
import java.util.List;

/**
 * Kapselt alle HTTP-Aufrufe an das Node.js/Express Backend.
 * Das Backend läuft per Docker auf http://localhost:3000.
 */
public class NewsApiClient {

    private static final String BASE_URL = "http://localhost:3000/api";

    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public NewsApiClient() {
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
        this.objectMapper = new ObjectMapper();
    }

    /**
     * Führt eine Keyword-Suche aus. Das Backend ruft NewsData.io auf,
     * wandelt die Ergebnisse in XML um und speichert sie in MongoDB.
     */
    public List<Article> search(String keyword, String language, String country) throws IOException, InterruptedException {
        String body = objectMapper.writeValueAsString(new SearchRequest(keyword, language, country));

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(BASE_URL + "/search"))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8))
                .build();

        HttpResponse<String> response = httpClient.send(request, BodyHandlers.ofString());
        checkStatus(response);

        SearchResponse parsed = objectMapper.readValue(response.body(), SearchResponse.class);
        return parsed.articles;
    }

    /**
     * Lädt gespeicherte Artikel aus MongoDB, optional gefiltert.
     */
    public List<Article> getArticles(String keyword, String language, Boolean bookmarkedOnly) throws IOException, InterruptedException {
        StringBuilder url = new StringBuilder(BASE_URL + "/articles");
        boolean first = true;
        if (keyword != null && !keyword.isBlank()) {
            url.append(first ? "?" : "&").append("keyword=").append(urlEncode(keyword));
            first = false;
        }
        if (language != null && !language.isBlank()) {
            url.append(first ? "?" : "&").append("language=").append(urlEncode(language));
            first = false;
        }
        if (bookmarkedOnly != null) {
            url.append(first ? "?" : "&").append("bookmarked=").append(bookmarkedOnly);
        }

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url.toString()))
                .GET()
                .build();

        HttpResponse<String> response = httpClient.send(request, BodyHandlers.ofString());
        checkStatus(response);

        return objectMapper.readValue(response.body(), objectMapper.getTypeFactory().constructCollectionType(List.class, Article.class));
    }

    /**
     * Setzt oder entfernt das Lesezeichen für einen Artikel.
     */
    public Article setBookmark(String articleMongoId, boolean bookmarked, String note) throws IOException, InterruptedException {
        String body = objectMapper.writeValueAsString(new BookmarkRequest(bookmarked, note));

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(BASE_URL + "/articles/" + articleMongoId + "/bookmark"))
                .header("Content-Type", "application/json")
                .method("PATCH", HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8))
                .build();

        HttpResponse<String> response = httpClient.send(request, BodyHandlers.ofString());
        checkStatus(response);

        return objectMapper.readValue(response.body(), Article.class);
    }

    /**
     * Lädt den Suchverlauf.
     */
    public List<SearchEntry> getSearchHistory() throws IOException, InterruptedException {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(BASE_URL + "/searches"))
                .GET()
                .build();

        HttpResponse<String> response = httpClient.send(request, BodyHandlers.ofString());
        checkStatus(response);

        return objectMapper.readValue(response.body(), objectMapper.getTypeFactory().constructCollectionType(List.class, SearchEntry.class));
    }

    /**
     * Exportiert die (gefilterten) Artikel als XML-Datei und speichert sie lokal.
     *
     * @param keyword        optionaler Filter nach Suchbegriff (null = alle)
     * @param bookmarkedOnly optionaler Filter nur Bookmarks (null = alle)
     * @param targetFile     Zielpfad auf der lokalen Festplatte
     */
    public void exportXml(String keyword, String language, Boolean bookmarkedOnly, Path targetFile) throws IOException, InterruptedException {
        StringBuilder url = new StringBuilder(BASE_URL + "/export/xml");
        boolean first = true;
        if (keyword != null && !keyword.isBlank()) {
            url.append(first ? "?" : "&").append("keyword=").append(urlEncode(keyword));
            first = false;
        }
        if (language != null && !language.isBlank()) {
            url.append(first ? "?" : "&").append("language=").append(urlEncode(language));
            first = false;
        }
        if (bookmarkedOnly != null) {
            url.append(first ? "?" : "&").append("bookmarked=").append(bookmarkedOnly);
        }

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url.toString()))
                .GET()
                .build();

        HttpResponse<byte[]> response = httpClient.send(request, HttpResponse.BodyHandlers.ofByteArray());
        if (response.statusCode() >= 400) {
            throw new IOException("Export fehlgeschlagen, Status: " + response.statusCode());
        }

        java.nio.file.Files.write(targetFile, response.body());
    }

    /**
     * Holt die XML-Repräsentation eines einzelnen Artikels (zur Anzeige in der GUI).
     */
    public String getArticleXml(String articleMongoId) throws IOException, InterruptedException {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(BASE_URL + "/articles/" + articleMongoId + "/xml"))
                .GET()
                .build();

        HttpResponse<String> response = httpClient.send(request, BodyHandlers.ofString());
        checkStatus(response);
        return response.body();
    }

    private void checkStatus(HttpResponse<?> response) throws IOException {
        if (response.statusCode() >= 400) {
            throw new IOException("Backend-Fehler (Status " + response.statusCode() + ")");
        }
    }

    private String urlEncode(String value) {
        return java.net.URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    // --- interne Hilfsklassen für (De-)Serialisierung ---

    private static class SearchRequest {
        public String keyword;
        public String language;
        public String country;

        public SearchRequest(String keyword, String language, String country) {
            this.keyword = keyword;
            this.language = (language == null || language.isBlank()) ? null : language;
            this.country = (country == null || country.isBlank()) ? null : country;
        }
    }

    private static class SearchResponse {
        public int count;
        public List<Article> articles;
    }

    private static class BookmarkRequest {
        public boolean bookmarked;
        public String note;

        public BookmarkRequest(boolean bookmarked, String note) {
            this.bookmarked = bookmarked;
            this.note = note;
        }
    }
}
