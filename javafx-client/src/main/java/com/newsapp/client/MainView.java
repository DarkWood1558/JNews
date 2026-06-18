package com.newsapp.client;

import com.newsapp.model.Article;
import javafx.application.Platform;
import javafx.collections.FXCollections;
import javafx.collections.ObservableList;
import javafx.concurrent.Task;
import javafx.geometry.Insets;
import javafx.scene.Scene;
import javafx.scene.control.*;
import javafx.scene.input.MouseButton;
import javafx.scene.layout.BorderPane;
import javafx.scene.layout.HBox;
import javafx.scene.layout.Priority;
import javafx.scene.layout.VBox;
import javafx.stage.FileChooser;
import javafx.stage.Stage;

import java.io.File;
import java.nio.file.Path;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Simple main view for the JavaFX client.
 * Provides: search, result list, detail pane, bookmark toggle and XML export.
 */
public class MainView {

    private final NewsApiClient api = new NewsApiClient();
    private final ObservableList<Article> articles = FXCollections.observableArrayList();

    private final ListView<Article> listView = new ListView<>(articles);

    private final TextField tfKeyword = new TextField();
    private final Button btnSearch = new Button("Suchen");
    private final Button btnRefresh = new Button("Aktualisieren");
    private final CheckBox cbBookmarksOnly = new CheckBox("Nur Bookmarks");
    private final Button btnExport = new Button("Export (XML)");

    // Detail fields
    private final Label lblTitle = new Label();
    private final Label lblPublished = new Label();
    private final TextArea taDescription = new TextArea();
    private final Hyperlink hlLink = new Hyperlink();
    private final CheckBox cbBookmarked = new CheckBox("Bookmark");
    private final TextField tfBookmarkNote = new TextField();
    private final Button btnSaveBookmark = new Button("Speichern");
    private final Button btnShowXml = new Button("XML anzeigen");

    private final Label lblStatus = new Label("Bereit");

    public MainView() {
        taDescription.setEditable(false);
        taDescription.setWrapText(true);
        taDescription.setPrefRowCount(6);

        listView.setCellFactory(lv -> new ListCell<>() {
            @Override
            protected void updateItem(Article item, boolean empty) {
                super.updateItem(item, empty);
                if (empty || item == null) setText(null);
                else setText(item.getTitle() != null ? item.getTitle() : "(kein Titel)");
            }
        });

        listView.getSelectionModel().selectedItemProperty().addListener((obs, oldV, newV) -> showDetails(newV));
        listView.setOnMouseClicked(e -> {
            if (e.getButton() == MouseButton.PRIMARY && e.getClickCount() == 2) {
                Article sel = listView.getSelectionModel().getSelectedItem();
                if (sel != null) openXmlWindow(sel);
            }
        });

        btnSearch.setOnAction(e -> performSearch());
        btnRefresh.setOnAction(e -> loadArticles());
        btnSaveBookmark.setOnAction(e -> saveBookmark());
        btnShowXml.setOnAction(e -> {
            Article sel = listView.getSelectionModel().getSelectedItem();
            if (sel != null) openXmlWindow(sel);
        });
        btnExport.setOnAction(e -> exportXml());
    }

    public void show(Stage stage) {
        BorderPane root = new BorderPane();

        // Top: search bar
        HBox top = new HBox(8, tfKeyword, btnSearch, btnRefresh, cbBookmarksOnly, btnExport);
        top.setPadding(new Insets(10));
        HBox.setHgrow(tfKeyword, Priority.ALWAYS);

        // Left: results
        VBox left = new VBox(8, new Label("Ergebnisse"), listView);
        left.setPadding(new Insets(10));
        left.setPrefWidth(360);

        // Right: details
        VBox right = new VBox(8,
                lblTitle,
                lblPublished,
                new Label("Beschreibung:"), taDescription,
                hlLink,
                cbBookmarked,
                new Label("Bookmark-Notiz:"), tfBookmarkNote,
                new HBox(8, btnSaveBookmark, btnShowXml)
        );
        right.setPadding(new Insets(10));

        root.setTop(top);
        root.setLeft(left);
        root.setCenter(right);
        root.setBottom(lblStatus);
        BorderPane.setMargin(lblStatus, new Insets(6));

        // initial load
        loadArticles();

        Scene scene = new Scene(root, 1000, 600);
        stage.setTitle("JNews - Desktop");
        stage.setScene(scene);
        stage.show();
    }

    private void performSearch() {
        String keyword = tfKeyword.getText();
        if (keyword == null || keyword.isBlank()) {
            lblStatus.setText("Bitte Suchbegriff eingeben.");
            return;
        }

        Task<List<Article>> task = new Task<>() {
            @Override
            protected List<Article> call() throws Exception {
                updateMessage("Suchen...");
                return api.search(keyword.trim(), null, null);
            }
        };

        bindTask(task);

        task.setOnSucceeded(evt -> {
            articles.setAll(task.getValue());
            lblStatus.setText("Suche beendet. Gefundene Artikel: " + articles.size());
        });
        task.setOnFailed(evt -> {
            lblStatus.setText("Suche fehlgeschlagen: " + task.getException().getMessage());
        });

        new Thread(task, "search-thread").start();
    }

    private void loadArticles() {
        String keywordFilter = tfKeyword.getText();
        Boolean bookmarkedOnly = cbBookmarksOnly.isSelected() ? Boolean.TRUE : null;

        Task<List<Article>> task = new Task<>() {
            @Override
            protected List<Article> call() throws Exception {
                updateMessage("Lade Artikel...");
                return api.getArticles((keywordFilter == null || keywordFilter.isBlank()) ? null : keywordFilter, bookmarkedOnly);
            }
        };

        bindTask(task);

        task.setOnSucceeded(evt -> {
            articles.setAll(task.getValue());
            lblStatus.setText("Geladen: " + articles.size());
        });
        task.setOnFailed(evt -> {
            lblStatus.setText("Laden fehlgeschlagen: " + task.getException().getMessage());
        });

        new Thread(task, "load-articles-thread").start();
    }

    private void showDetails(Article a) {
        if (a == null) {
            lblTitle.setText("");
            lblPublished.setText("");
            taDescription.clear();
            hlLink.setText("");
            cbBookmarked.setSelected(false);
            tfBookmarkNote.clear();
            return;
        }

        lblTitle.setText(a.getTitle() != null ? a.getTitle() : "(kein Titel)");
        lblPublished.setText(a.getPublishedAt() != null ? "Veröffentlicht: " + a.getPublishedAt() : "");
        taDescription.setText(a.getDescription() != null ? a.getDescription() : "");
        hlLink.setText(a.getLink() != null ? a.getLink() : "");
        hlLink.setOnAction(e -> {
            try { java.awt.Desktop.getDesktop().browse(new java.net.URI(a.getLink())); } catch (Exception ex) { /* ignore */ }
        });
        cbBookmarked.setSelected(a.isBookmarked());
        tfBookmarkNote.setText(a.getBookmarkNote() != null ? a.getBookmarkNote() : "");
    }

    private void saveBookmark() {
        Article sel = listView.getSelectionModel().getSelectedItem();
        if (sel == null) {
            lblStatus.setText("Kein Artikel ausgewählt.");
            return;
        }

        boolean bookmarked = cbBookmarked.isSelected();
        String note = tfBookmarkNote.getText();

        Task<Article> task = new Task<>() {
            @Override
            protected Article call() throws Exception {
                updateMessage("Speichere Bookmark...");
                return api.setBookmark(sel.getId(), bookmarked, note);
            }
        };

        bindTask(task);

        task.setOnSucceeded(evt -> {
            Article updated = task.getValue();
            // update in list
            int idx = articles.indexOf(sel);
            if (idx >= 0) articles.set(idx, updated);
            listView.getSelectionModel().select(updated);
            lblStatus.setText("Bookmark gespeichert.");
        });
        task.setOnFailed(evt -> lblStatus.setText("Fehler beim Speichern: " + task.getException().getMessage()));

        new Thread(task, "save-bookmark-thread").start();
    }

    private void exportXml() {
        FileChooser chooser = new FileChooser();
        chooser.setTitle("XML exportieren");
        chooser.getExtensionFilters().add(new FileChooser.ExtensionFilter("XML Dateien", "*.xml"));
        File target = chooser.showSaveDialog(null);
        if (target == null) return;

        String keywordFilter = tfKeyword.getText();
        Boolean bookmarkedOnly = cbBookmarksOnly.isSelected() ? Boolean.TRUE : null;

        Task<Void> task = new Task<>() {
            @Override
            protected Void call() throws Exception {
                updateMessage("Exportiere...");
                api.exportXml((keywordFilter == null || keywordFilter.isBlank()) ? null : keywordFilter, bookmarkedOnly, target.toPath());
                return null;
            }
        };

        bindTask(task);

        task.setOnSucceeded(evt -> lblStatus.setText("Export erfolgreich: " + target.getAbsolutePath()));
        task.setOnFailed(evt -> lblStatus.setText("Export fehlgeschlagen: " + task.getException().getMessage()));

        new Thread(task, "export-thread").start();
    }

    private void openXmlWindow(Article sel) {
        Task<String> task = new Task<>() {
            @Override
            protected String call() throws Exception {
                updateMessage("Lade XML...");
                return api.getArticleXml(sel.getId());
            }
        };

        bindTask(task);

        task.setOnSucceeded(evt -> {
            Stage s = new Stage();
            TextArea ta = new TextArea(task.getValue());
            ta.setEditable(false);
            ta.setWrapText(false);
            Scene sc = new Scene(new BorderPane(ta), 700, 500);
            s.setTitle("XML: " + (sel.getTitle() != null ? sel.getTitle() : "Artikel"));
            s.setScene(sc);
            s.show();
            lblStatus.setText("XML geladen.");
        });
        task.setOnFailed(evt -> lblStatus.setText("XML-Laden fehlgeschlagen: " + task.getException().getMessage()));

        new Thread(task, "load-xml-thread").start();
    }

    private void bindTask(Task<?> task) {
        lblStatus.textProperty().bind(task.messageProperty());
        task.runningProperty().addListener((obs, was, isNow) -> {
            if (!isNow) {
                // unbind when finished
                Platform.runLater(() -> lblStatus.textProperty().unbind());
            }
        });
    }
}
