# Notfall- und IoT-Geräte Gateway-Relay Projekt

## Übersicht

Dieses Projekt implementiert ein System zur Überwachung von Notfallbuttons (z.B. Panic Buttons) und anderen IoT-Geräten über MQTT-fähige Gateways und deren Anbindung an einen zentralen Webserver mit REST-API. Das System empfängt Nachrichten von Gateways, analysiert sie, wandelt sie basierend auf konfigurierbaren Templates um und leitet sie an externe REST-Schnittstellen wie Evalarm weiter.

## Systemarchitektur

Das System besteht aus folgenden Komponenten:

1. **API-Server**: Empfängt MQTT-Nachrichten von Gateways und speichert sie
2. **Message Processor**: Transformiert Nachrichten basierend auf Templates und leitet sie weiter
3. **Auth Service**: Verwaltet Benutzerauthentifizierung und -autorisierung
4. **Web-UI**: Bietet eine Benutzeroberfläche zur Überwachung und Konfiguration des Systems

## Installation

### Voraussetzungen

- Node.js (v20+)
- Python 3.10+
- pip3

### Installation der Abhängigkeiten

```bash
# Klonen des Repositories (falls zutreffend)
git clone <repository-url>
cd iot-gateway-project

# Installation der Python-Abhängigkeiten
pip3 install -r api/requirements.txt

# Installation der Frontend-Abhängigkeiten
cd frontend
npm install
cd ..
```

## Starten des Systems

Das System kann mit einem einzigen Befehl gestartet werden:

```bash
./start.sh
```

Dies startet alle Komponenten:
- API-Server auf Port 8080
- Message Processor auf Port 8081
- Auth Service auf Port 8082
- Frontend auf Port 5173

Um das System zu stoppen:

```bash
./stop.sh
```

## Testen des Systems

Das System kann mit dem integrierten Testskript getestet werden:

```bash
./test.sh
```

Dies führt automatisierte Tests für alle Komponenten durch und gibt eine Zusammenfassung der Ergebnisse aus.

## Komponenten im Detail

### API-Server (Port 8080)

Der API-Server empfängt MQTT-Nachrichten von Gateways und speichert sie. Er bietet folgende Endpunkte:

- `GET /api/health`: Health-Check-Endpunkt
- `GET /api/messages`: Abrufen der letzten empfangenen Nachrichten
- `POST /api/test`: Empfangen von MQTT-Nachrichten vom Gateway
- `POST /api/test-message`: Erstellen einer Testnachricht (für Entwicklung und Präsentation)

### Message Processor (Port 8081)

Der Message Processor transformiert Nachrichten basierend auf Templates und leitet sie an externe APIs weiter. Er bietet folgende Endpunkte:

- `POST /api/process`: Verarbeiten und Weiterleiten von Nachrichten
- `GET /api/templates`: Abrufen aller verfügbaren Templates
- `GET /api/endpoints`: Abrufen aller verfügbaren Endpunkte
- `POST /api/reload-templates`: Neuladen aller Templates
- `POST /api/test-transform`: Testen der Transformation ohne Weiterleitung

### Auth Service (Port 8082)

Der Auth Service verwaltet Benutzerauthentifizierung und -autorisierung. Er bietet folgende Endpunkte:

- `POST /api/auth/login`: Benutzeranmeldung
- `POST /api/auth/logout`: Benutzerabmeldung
- `POST /api/auth/verify`: Überprüfung eines Tokens
- `GET /api/auth/users`: Abrufen aller Benutzer (nur für Administratoren)
- `POST /api/auth/users`: Erstellen eines neuen Benutzers (nur für Administratoren)

### Web-UI (Port 5173)

Das Web-UI bietet eine Benutzeroberfläche zur Überwachung und Konfiguration des Systems. Es umfasst:

- Dashboard mit Systemstatus und letzten Nachrichten
- Nachrichtenansicht mit detaillierter Inspektion
- Template-Editor zum Testen und Verwalten von Transformationen
- Einstellungsseite zur Konfiguration von Endpunkten

## Benutzeranmeldung

Das System verfügt über zwei vordefinierte Benutzer:

- **Administrator**: Benutzername `admin`, Passwort `password`
- **Normaler Benutzer**: Benutzername `user`, Passwort `user123`

## Gateway-Skript

Das folgende Skript kann auf Gateways installiert werden, um MQTT-Nachrichten abzufangen und an den API-Server weiterzuleiten:

```sh
#!/bin/sh

INTERFACE="eth0"
SERVER_URL="http://<SERVER_IP>:8080/api/test"
TMP_FILE="/tmp/mqtt-sniff-last.json"

echo "[*] MQTT Sniffer-Relay gestartet..."

tcpdump -A -l -i "$INTERFACE" port 1883 2>/dev/null | while read line; do
    echo "$line" | grep -Eo '\{.*\}' | while read json; do
        [ ${#json} -lt 10 ] && continue
        if [ -f "$TMP_FILE" ]; then
            LAST=$(cat "$TMP_FILE")
            [ "$json" = "$LAST" ] && continue
        fi
        echo "[+] Neue JSON erkannt:"
        echo "$json"
        echo "$json" > "$TMP_FILE"
        curl -s -X POST "$SERVER_URL" -H "Content-Type: application/json" -d "$json"
        echo
    done
done
```

## Templates

Das System verwendet Templates zur Transformation von Nachrichten. Templates werden im Verzeichnis `templates/` gespeichert und können über das Web-UI verwaltet werden.

Beispiel-Template für Evalarm:

```json
{
  "events": [
    {
      "message": "Alarm Knopf",
      "address": "0",
      "namespace": "eva.herford",
      "id": "{{ uuid }}",
      "device_id": "{{ device_id }}"
    }
  ]
}
```

## Präsentationshinweise

Für die Präsentation bei evAlarm empfehlen wir folgende Schritte:

1. Starten Sie das System mit `./start.sh`
2. Melden Sie sich im Web-UI mit den Administrator-Anmeldedaten an
3. Zeigen Sie das Dashboard mit dem Systemstatus
4. Demonstrieren Sie die Erstellung einer Testnachricht
5. Zeigen Sie die Nachrichtenansicht und die Details der empfangenen Nachricht
6. Demonstrieren Sie die Template-Transformation mit verschiedenen Templates
7. Zeigen Sie die Konfiguration von Endpunkten in den Einstellungen

## Fehlerbehebung

Wenn Probleme auftreten:

1. Prüfen Sie, ob alle Dienste laufen: `ps aux | grep python3`
2. Prüfen Sie die Logs im Verzeichnis `tests/`
3. Starten Sie das System neu: `./stop.sh && ./start.sh`
4. Führen Sie die Tests aus: `./test.sh`

## Erweiterungsmöglichkeiten

Das System kann wie folgt erweitert werden:

1. Hinzufügen weiterer Template-Typen
2. Integration mit zusätzlichen externen APIs
3. Implementierung von Echtzeit-Benachrichtigungen
4. Erweiterung der Benutzerrechte und -rollen
5. Hinzufügen von Statistiken und Berichten
