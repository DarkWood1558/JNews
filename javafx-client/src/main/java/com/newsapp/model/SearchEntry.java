package com.newsapp.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * Repräsentiert einen Eintrag im Suchverlauf, wie er vom Backend geliefert wird.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public class SearchEntry {

    private String keyword;
    private String language;
    private String country;
    private int resultCount;
    private String createdAt;

    public SearchEntry() {
    }

    public String getKeyword() {
        return keyword;
    }

    public void setKeyword(String keyword) {
        this.keyword = keyword;
    }

    public String getLanguage() {
        return language;
    }

    public void setLanguage(String language) {
        this.language = language;
    }

    public String getCountry() {
        return country;
    }

    public void setCountry(String country) {
        this.country = country;
    }

    public int getResultCount() {
        return resultCount;
    }

    public void setResultCount(int resultCount) {
        this.resultCount = resultCount;
    }

    public String getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }

    @Override
    public String toString() {
        return keyword + " (" + resultCount + " Treffer)";
    }
}
