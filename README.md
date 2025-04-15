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
6. Automatisches Deployment via GitHub-Webhooks
7. Monitoring und Alerting

## Wichtige Hinweise für Entwickler

### JSX-Syntax und Template-Darstellung

Bei der Darstellung von Template-Platzhaltern in JSX-Komponenten (wie z.B. in `frontend/src/pages/Templates.jsx`) ist besondere Vorsicht geboten. Die doppelten geschweiften Klammern (`{{ }}`) in Template-Beispielen müssen in JSX wie folgt geschrieben werden:

```jsx
// NICHT SO - verursacht Syntaxfehler:
Platzhalter wie {{ "{{variable}}" }} werden durch Werte ersetzt.

// RICHTIG:
Platzhalter wie {'{{'} variable {'}}'}  werden durch Werte ersetzt.
```

Die falsche Syntax führt zu Build-Fehlern, die das Deployment verhindern können.

### Deployment-Verzeichnisstruktur

Beim Deployment auf dem Server muss die korrekte Verzeichnisstruktur beachtet werden. Es gibt zwei mögliche Ansätze:

1. **Direkte Klonung in Zielverzeichnis:**
   ```bash
   mkdir -p /var/www/iot-gateway
   cd /var/www/iot-gateway
   git clone https://github.com/nextX-AG/roombankerRestAPIWeb.git .  # Beachte den Punkt am Ende
   ```

2. **Wenn das Repository in ein Unterverzeichnis geklont wurde:**
   - Alle Pfade in den Konfigurationsdateien müssen angepasst werden
   - Zum Beispiel: `/var/www/iot-gateway/roombankerRestAPIWeb/api/` statt `/var/www/iot-gateway/api/`
   - Dies betrifft insbesondere die PM2-Konfiguration in `deploy-scripts/production.config.js`

Für eine problemlose Deployment-Erfahrung empfehlen wir die direkte Klonung in das Zielverzeichnis.

## Deployment

Dieses Projekt unterstützt verschiedene Deployment-Methoden für Produktionsumgebungen.

### Deployment auf einem Hetzner-Server

#### Methode 1: Direktes GitHub-Repository Deployment

Diese Methode verwendet das GitHub-Repository direkt und richtet einen Webhook ein, der automatische Deployments bei Push-Events auslöst.

```bash
# Auf dem Hetzner-Server
apt update && apt upgrade -y
apt install -y git python3-venv python3-pip nodejs npm nginx

# Klone das Repository
mkdir -p /var/www/iot-gateway
cd /var/www/iot-gateway
git clone https://github.com/nextX-AG/roombankerRestAPIWeb.git .

# Richte die Umgebung ein
python3 -m venv venv
source venv/bin/activate
pip install -r api/requirements.txt

# Frontend bauen
cd frontend
npm install
npm run build
cd ..

# PM2 installieren und Dienste starten
npm install -g pm2
pm2 start deploy-scripts/production.config.js
pm2 save
pm2 startup

# Richte einen Webhook für automatische Deployments ein
cd /var/www
npm init -y
npm install express
cat > webhook.js << 'EOF'
const express = require('express');
const { exec } = require('child_process');
const app = express();
const port = 8000;

app.use(express.json());

app.post('/deploy', (req, res) => {
  console.log('Deployment-Webhook empfangen');
  
  exec('cd /var/www/iot-gateway && git pull && source venv/bin/activate && pip install -r api/requirements.txt && cd frontend && npm install && npm run build && cd .. && pm2 reload all', 
    (error, stdout, stderr) => {
      if (error) {
        console.error(`Fehler beim Deployment: ${error}`);
        return res.status(500).send('Deployment fehlgeschlagen');
      }
      console.log(`Deployment erfolgreich: ${stdout}`);
      if (stderr) console.error(`Deployment Fehler: ${stderr}`);
      res.status(200).send('Deployment erfolgreich');
    }
  );
});

app.listen(port, () => {
  console.log(`Webhook-Server läuft auf Port ${port}`);
});
EOF

pm2 start webhook.js --name webhook
pm2 save
```

Anschließend musst du einen Webhook in deinem GitHub-Repository einrichten:

1. Gehe zu deinem Repository: https://github.com/nextX-AG/roombankerRestAPIWeb
2. Navigiere zu "Settings" > "Webhooks" > "Add webhook"
3. Trage als Payload URL `http://deine-server-ip:8000/deploy` ein
4. Wähle als Content Type `application/json`
5. Wähle "Just the push event"
6. Aktiviere den Webhook

#### Methode 2: Lokales Push-Deployment

Mit dieser Methode kannst du direkt von deinem lokalen Repository zum Server deployen:

```bash
# Auf dem Hetzner-Server
mkdir -p /var/git/iot-gateway.git
cd /var/git/iot-gateway.git
git init --bare

# Post-Receive Hook erstellen
cat > hooks/post-receive << 'EOF'
#!/bin/bash

echo "Deployment wird gestartet..."
GIT_WORK_TREE=/var/www/iot-gateway git checkout -f main
cd /var/www/iot-gateway

# Python-Umgebung
source venv/bin/activate
pip install -r api/requirements.txt

# Frontend bauen
cd frontend
npm install
npm run build
cd ..

# Services neustarten
pm2 reload all

echo "Deployment abgeschlossen!"
EOF

chmod +x hooks/post-receive
```

Auf deinem lokalen Entwicklungsrechner:

```bash
# Remote hinzufügen
git remote add production ssh://root@deine-server-ip/var/git/iot-gateway.git

# Deployment per Push auslösen
git push production main
```

### Nginx-Konfiguration

Für beide Methoden benötigst du eine Nginx-Konfiguration:

```bash
cat > /etc/nginx/sites-available/iot-gateway << 'EOF'
server {
    listen 80;
    server_name deine-domain-oder-ip;

    location / {
        root /var/www/iot-gateway/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:8080/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api/auth/ {
        proxy_pass http://localhost:8082/api/auth/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location ~ ^/api/(templates|endpoints|process|reload-templates|test-transform) {
        proxy_pass http://localhost:8081;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
EOF

ln -sf /etc/nginx/sites-available/iot-gateway /etc/nginx/sites-enabled/
nginx -t && systemctl restart nginx
```

### SSL-Verschlüsselung

Für eine sichere Verbindung über HTTPS kannst du Let's Encrypt verwenden:

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d deine-domain.de
```

Weitere Informationen zu den Deployment-Optionen findest du im Verzeichnis `deploy-scripts/`.
