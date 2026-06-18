package com.newsapp.client;

import javafx.application.Application;
import javafx.stage.Stage;

/**
 * Startpunkt der JavaFX Desktop-App.
 * Lädt die eigentliche Oberfläche aus MainView.
 */
public class MainApp extends Application {

    @Override
    public void start(Stage primaryStage) {
        MainView mainView = new MainView();
        mainView.show(primaryStage);
    }

    public static void main(String[] args) {
        launch(args);
    }
}
