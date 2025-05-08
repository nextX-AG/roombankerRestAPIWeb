# Installationsanleitung für das Notfall- und IoT-Geräte Gateway-Relay Projekt

Diese Anleitung führt Sie durch die Installation und Einrichtung des Notfall- und IoT-Geräte Gateway-Relay Systems für die Präsentation bei evAlarm.

## Systemanforderungen

- Betriebssystem: Linux, macOS oder Windows
- Node.js (Version 20 oder höher)
- Python 3.10 oder höher
- pip3 (Python-Paketmanager)
- MongoDB (Version 5.0 oder höher)
- Redis (für Message Queue und Caching)
- Internetverbindung für die Installation der Abhängigkeiten

## Schritt 1: Projekt herunterladen

Laden Sie das Projektarchiv herunter und entpacken Sie es in ein Verzeichnis Ihrer Wahl:

```bash
unzip iot-gateway-project.zip -d /pfad/zum/zielverzeichnis/
cd /pfad/zum/zielverzeichnis/iot-gateway-project
```

## Schritt 2: Python-Abhängigkeiten installieren

Installieren Sie die benötigten Python-Pakete mit pip:

```bash
pip3 install -r api/requirements.txt
```

Dies installiert alle erforderlichen Python-Bibliotheken, darunter:
- Flask (Web-Framework)
- Flask-CORS (Cross-Origin Resource Sharing)
- PyYAML (YAML-Verarbeitung)
- Requests (HTTP-Client)
- Jinja2 (Template-Engine)
- PyMongo (MongoDB-Anbindung)
- Redis (Redis-Anbindung)

## Schritt 3: MongoDB einrichten

Installieren Sie MongoDB je nach Betriebssystem:

### Für macOS (mit Homebrew):
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

### Für Ubuntu/Debian:
```bash
sudo apt-get update
sudo apt-get install -y mongodb
sudo systemctl start mongodb
```

### Für Windows:
Laden Sie den MongoDB Community Server von der offiziellen Website herunter und folgen Sie den Installationsanweisungen.

### Datenbank initialisieren:
```bash
# Mit dem Testskript initialisieren
python3 api/test_db.py
```

## Schritt 4: Redis einrichten

Stellen Sie sicher, dass Redis installiert und gestartet ist:

### Für macOS (mit Homebrew):
```bash
brew install redis
brew services start redis
```

### Für Ubuntu/Debian:
```bash
sudo apt-get update
sudo apt-get install -y redis-server
sudo systemctl start redis-server
```

### Für Windows:
Laden Sie Redis für Windows herunter und folgen Sie den Installationsanweisungen.

## Schritt 5: Frontend-Abhängigkeiten installieren

Installieren Sie die benötigten Node.js-Pakete für das Frontend:

```bash
cd frontend
npm install
cd ..
```

Dies installiert alle erforderlichen JavaScript-Bibliotheken, darunter:
- React (UI-Bibliothek)
- React Router (Routing)
- Axios (HTTP-Client)
- Bootstrap (CSS-Framework)
- FontAwesome (Icons)
- React JSON View Lite (JSON-Visualisierung)

## Schritt 6: Konfiguration anpassen (optional)

Bei Bedarf können Sie die Konfiguration des Systems anpassen:

- API-Server-Port: In `api/app.py` (Standardwert: 8080)
- Message-Processor-Port: In `api/message_processor.py` (Standardwert: 8081)
- Auth-Service-Port: In `api/auth_service.py` (Standardwert: 8082)
- Frontend-Port: In `frontend/package.json` (Standardwert: 5173)
- MongoDB-Verbindung: Über Umgebungsvariablen `MONGODB_URI` und `MONGODB_DB`
- Redis-Verbindung: Über Umgebungsvariablen `REDIS_HOST`, `REDIS_PORT`, `REDIS_DB`, `REDIS_PASSWORD`

## Schritt 7: System starten

Starten Sie das gesamte System mit einem Befehl:

```bash
./start.sh
```

Dies startet alle Komponenten:
- API-Server auf Port 8080
- Message Processor auf Port 8081
- Auth Service auf Port 8082
- Frontend auf Port 5173

## Schritt 8: Auf das System zugreifen

Öffnen Sie einen Webbrowser und navigieren Sie zu:

```
http://localhost:5173
```

Melden Sie sich mit einem der vordefinierten Benutzer an:
- Administrator: Benutzername `admin`, Passwort `password`
- Normaler Benutzer: Benutzername `user`, Passwort `user123`

## Schritt 9: System testen

Sie können das System mit dem integrierten Testskript testen:

```bash
./test.sh
```

Dies führt automatisierte Tests für alle Komponenten durch und gibt eine Zusammenfassung der Ergebnisse aus.

## Schritt 10: System stoppen

Um das System zu stoppen, führen Sie aus:

```bash
./stop.sh
```

## Fehlerbehebung

### Problem: Dienste starten nicht

Überprüfen Sie, ob die erforderlichen Ports verfügbar sind:

```bash
netstat -tuln | grep -E '8080|8081|8082|5173'
```

Falls Ports bereits belegt sind, ändern Sie die Portkonfiguration in den entsprechenden Dateien.

### Problem: MongoDB-Verbindungsfehler

Prüfen Sie, ob der MongoDB-Dienst läuft:

```bash
# Für Linux/macOS
ps aux | grep mongo

# Für Windows
tasklist | findstr mongo
```

Stellen Sie sicher, dass die MongoDB-Verbindungseinstellungen korrekt sind:

```bash
# MongoDB-Verbindung testen
python3 -c "from pymongo import MongoClient; client = MongoClient('mongodb://localhost:27017/'); print(client.server_info())"
```

### Problem: Redis-Verbindungsfehler

Prüfen Sie, ob der Redis-Dienst läuft:

```bash
# Für Linux/macOS
ps aux | grep redis

# Für Windows
tasklist | findstr redis
```

Testen Sie die Redis-Verbindung:

```bash
redis-cli ping
```

### Problem: Frontend zeigt keine Daten an

Stellen Sie sicher, dass alle Backend-Dienste laufen:

```bash
ps aux | grep python3
```

Überprüfen Sie die Netzwerkkommunikation zwischen Frontend und Backend:

```bash
curl http://localhost:8080/api/health
curl http://localhost:8081/api/templates
curl http://localhost:8082/api/auth/users
```

### Problem: Testnachrichten werden nicht angezeigt

Überprüfen Sie, ob das Datenverzeichnis existiert und beschreibbar ist:

```bash
ls -la data/
```

Erstellen Sie es bei Bedarf:

```bash
mkdir -p data
```

## Für die Präsentation

Für die Präsentation bei evAlarm empfehlen wir:

1. Starten Sie das System vor der Präsentation und testen Sie es
2. Bereiten Sie einige Beispiel-Testnachrichten vor
3. Zeigen Sie den vollständigen Workflow: Empfang einer Nachricht, Transformation und Weiterleitung
4. Demonstrieren Sie die Konfigurationsmöglichkeiten für Templates und Endpunkte
5. Heben Sie die Sicherheitsaspekte des Systems hervor (Authentifizierung, Token-basierte Autorisierung)

Bei Fragen oder Problemen stehen wir Ihnen gerne zur Verfügung.
