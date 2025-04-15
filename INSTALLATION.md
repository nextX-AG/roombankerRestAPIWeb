# Installationsanleitung für das Notfall- und IoT-Geräte Gateway-Relay Projekt

Diese Anleitung führt Sie durch die Installation und Einrichtung des Notfall- und IoT-Geräte Gateway-Relay Systems für die Präsentation bei evAlarm.

## Systemanforderungen

- Betriebssystem: Linux, macOS oder Windows
- Node.js (Version 20 oder höher)
- Python 3.10 oder höher
- pip3 (Python-Paketmanager)
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

## Schritt 3: Frontend-Abhängigkeiten installieren

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

## Schritt 4: Konfiguration anpassen (optional)

Bei Bedarf können Sie die Konfiguration des Systems anpassen:

- API-Server-Port: In `api/app.py` (Standardwert: 8080)
- Message-Processor-Port: In `api/message_processor.py` (Standardwert: 8081)
- Auth-Service-Port: In `api/auth_service.py` (Standardwert: 8082)
- Frontend-Port: In `frontend/package.json` (Standardwert: 5173)

## Schritt 5: System starten

Starten Sie das gesamte System mit einem Befehl:

```bash
./start.sh
```

Dies startet alle Komponenten:
- API-Server auf Port 8080
- Message Processor auf Port 8081
- Auth Service auf Port 8082
- Frontend auf Port 5173

## Schritt 6: Auf das System zugreifen

Öffnen Sie einen Webbrowser und navigieren Sie zu:

```
http://localhost:5173
```

Melden Sie sich mit einem der vordefinierten Benutzer an:
- Administrator: Benutzername `admin`, Passwort `password`
- Normaler Benutzer: Benutzername `user`, Passwort `user123`

## Schritt 7: System testen

Sie können das System mit dem integrierten Testskript testen:

```bash
./test.sh
```

Dies führt automatisierte Tests für alle Komponenten durch und gibt eine Zusammenfassung der Ergebnisse aus.

## Schritt 8: System stoppen

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
