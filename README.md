# Startbefehle — JNews

# 1) Docker (empfohlen):
cp env.example backend/.env
# editiere backend/.env und trage NEWSDATA_API_KEY ein

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
npm start
