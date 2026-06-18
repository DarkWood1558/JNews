# Startbefehle — JNews

# 1) Docker (empfohlen):
cp env.example backend/.env
# editiere backend/.env und trage NEWSDATA_API_KEY ein
# optional: setze DAILY_KEYWORDS (Komma-getrennt), z.B. DAILY_KEYWORDS=Hello,World
# optional: setze DAILY_LANGUAGES (Komma-getrennt), z.B. DAILY_LANGUAGES=english,german
# optional: DAILY_HOUR (0-23), DAILY_MIN (0-59), DAILY_RUN_ON_START=true

docker-compose up --build -d

# Prüfen
curl http://localhost:3000/health

# 2) JavaFX-Client starten (lokal mit Anzeige):
cd javafx-client
mvn javafx:run

# oder paketieren und per JAR starten
mvn -f javafx-client package
java -jar javafx-client/target/news-client-1.0.0.jar

# 3) Alternative: Backend ohne Docker (lokale MongoDB)
cd backend
npm install
export NEWSDATA_API_KEY=DEIN_KEY
export MONGO_URI=mongodb://127.0.0.1:27017/newsdb
# optional scheduling env vars:
# export DAILY_KEYWORDS="Hello,World"
# export DAILY_HOUR=2
# export DAILY_MIN=0
# export DAILY_RUN_ON_START=true
npm start

# Erläuterung zur täglichen Abfrage
Das Backend enthält nun einen einfachen Scheduler (backend/src/fetcher.js):
- Liest DAILY_KEYWORDS (Komma-getrennte Keywords) aus der Umgebung.
- Führt beim Start optional sofort eine Runde aus (DAILY_RUN_ON_START=true).
- Plant danach täglich zur konfigurierten Uhrzeit (DAILY_HOUR:DAILY_MIN) eine Suche und speichert gefundene Artikel in MongoDB.

Beispiel backend/.env (aus env.example kopieren und anpassen):
NEWSDATA_API_KEY=DEIN_API_KEY_HIER
MONGO_URI=mongodb://mongo:27017/newsdb
PORT=3000
DAILY_KEYWORDS=Hello,Technology
DAILY_HOUR=2
DAILY_MIN=0
DAILY_RUN_ON_START=true
