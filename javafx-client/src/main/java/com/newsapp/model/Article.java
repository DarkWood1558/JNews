package com.newsapp.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

/**
 * Repräsentiert einen Artikel, wie er vom Backend als JSON geliefert wird.
 * Felder entsprechen dem Mongoose-Schema "Article" im Backend.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public class Article {

    @JsonProperty("_id")
    private String id;

    private String articleId;
    private String title;
    private String description;
    private String link;
    private String source;
    private String imageUrl;
    private String publishedAt;
    private String language;
    private List<String> country;
    private List<String> category;
    private String keyword;
    private boolean bookmarked;
    private String bookmarkNote;

    public Article() {
        // Für Jackson Deserialisierung benötigt
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getArticleId() {
        return articleId;
    }

    public void setArticleId(String articleId) {
        this.articleId = articleId;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getLink() {
        return link;
    }

    public void setLink(String link) {
        this.link = link;
    }

    public String getSource() {
        return source;
    }

    public void setSource(String source) {
        this.source = source;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }

    public String getPublishedAt() {
        return publishedAt;
    }

    public void setPublishedAt(String publishedAt) {
        this.publishedAt = publishedAt;
    }

    public String getLanguage() {
        return language;
    }

    public void setLanguage(String language) {
        this.language = language;
    }

    public List<String> getCountry() {
        return country;
    }

    public void setCountry(List<String> country) {
        this.country = country;
    }

    public List<String> getCategory() {
        return category;
    }

    public void setCategory(List<String> category) {
        this.category = category;
    }

    public String getKeyword() {
        return keyword;
    }

    public void setKeyword(String keyword) {
        this.keyword = keyword;
    }

    public boolean isBookmarked() {
        return bookmarked;
    }

    public void setBookmarked(boolean bookmarked) {
        this.bookmarked = bookmarked;
    }

    public String getBookmarkNote() {
        return bookmarkNote;
    }

    public void setBookmarkNote(String bookmarkNote) {
        this.bookmarkNote = bookmarkNote;
    }

    @Override
    public String toString() {
        return title; // wird z.B. von einfachen ListView-Zellen genutzt
    }
}
