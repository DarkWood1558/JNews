JNews — News-Such-App

Kurzbeschreibung
----------------
JNews ist eine kleine Anwendung zum Suchen von Nachrichten (NewsData.io), Speichern in MongoDB, Anzeige in einer JavaFX-Desktop-App und Export als XML.

Voraussetzungen
---------------
- Docker & docker-compose (empfohlen)
- Alternativ: Node.js (>=18), npm, MongoDB (lokal)
- Java 17 und Maven (für JavaFX-Client)

Schnellstart (empfohlen: Docker)
--------------------------------
1. Kopiere Umgebungsdatei:
   cp env.example backend/.env
   # Trage NEWSDATA_API_KEY in backend/.env ein

2. Starte Dienste (MongoDB + Backend):
   docker-compose up --build -d

3. Prüfen, ob Backend läuft:
   curl http://localhost:3000/health
   # Erwartet: {"status":"ok"}  (HTTP 200)

4. JavaFX-Client starten (lokal auf Desktop mit Anzeige):
   cd javafx-client
   mvn javafx:run

   Oder Paketieren und per JAR starten:
   mvn -f javafx-client package
   java -jar javafx-client/target/news-client-1.0.0.jar

Lokales Backend ohne Docker
---------------------------
1. In backend/:
   cd backend
   npm install
   export NEWSDATA_API_KEY=DEIN_KEY
   export MONGO_URI=mongodb://127.0.0.1:27017/newsdb  # falls lokal laufende Mongo
   npm start

Wichtige Pfade
---------------
- Backend Quellcode: backend/src/
  - server: backend/src/server.js
  - routes: backend/src/routes/api.js
  - models: backend/src/models/
  - utils: backend/src/utils/
- JavaFX-Client: javafx-client/src/main/java/com/newsapp/client/
  - Einstieg: com.newsapp.client.MainApp

Fehlerbehebung
----------------
- "ECONNREFUSED 127.0.0.1:27017": MongoDB nicht erreichbar — starte Docker (docker-compose up) oder lokalen mongod.
- API-Fehler beim Suchen: Prüfe NEWSDATA_API_KEY in backend/.env.

Anmerkungen
----------
- backend/.env wird in .gitignore nicht committed — sichere API-Keys lokal.
- README kurz gehalten; bei Bedarf füge CI- oder Run-Skripte hinzu.
