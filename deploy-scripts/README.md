# Deployment-Anleitung für den Hetzner-Server

Diese Anleitung beschreibt, wie das IoT Gateway-Relay-System auf einem Hetzner-Server mit automatischem Deployment eingerichtet wird.

## Voraussetzungen

- Ein Hetzner-Server mit Ubuntu/Debian
- Root-Zugriff auf den Server

## Einrichtung des Servers

### 1. Serverinstallation

Verbinde dich mit dem Server:

```bash
ssh root@deine-server-ip
```

Installiere die benötigten Pakete:

```bash
apt update && apt upgrade -y
apt install -y git python3-venv python3-pip nodejs npm nginx
```

### 2. PM2 installieren (für Prozessmanagement)

PM2 ist ein Prozessmanager für Node.js-Anwendungen, der auch Python-Skripte verwalten kann:

```bash
npm install -g pm2
```

### 3. Repository direkt klonen

WICHTIG: Um Pfadprobleme zu vermeiden, clone das Repository direkt in das Zielverzeichnis (beachte den Punkt am Ende des Befehls):

```bash
# Deployment-Verzeichnis erstellen
mkdir -p /var/www/iot-gateway
cd /var/www/iot-gateway

# Repository klonen (BEACHTE DEN PUNKT AM ENDE - dadurch wird in das aktuelle Verzeichnis geklont)
git clone https://github.com/nextX-AG/roombankerRestAPIWeb.git .

# Python-Umgebung einrichten
python3 -m venv venv
source venv/bin/activate
pip install -r api/requirements.txt

# Frontend bauen
cd frontend
npm install
npm run build
cd ..

# PM2 starten
pm2 start deploy-scripts/production.config.js
pm2 save
pm2 startup
```

Falls das Repository versehentlich in ein Unterverzeichnis geklont wurde (z.B. `/var/www/iot-gateway/roombankerRestAPIWeb/`), gibt es zwei Optionen:

1. **Empfohlen**: Starten Sie noch einmal von vorne mit dem korrekten Klonbefehl
   ```bash
   rm -rf /var/www/iot-gateway
   mkdir -p /var/www/iot-gateway
   cd /var/www/iot-gateway
   git clone https://github.com/nextX-AG/roombankerRestAPIWeb.git .
   ```

2. **Alternative**: Passen Sie alle Konfigurationsdateien an die tatsächliche Verzeichnisstruktur an
   ```bash
   # Bearbeiten Sie die PM2-Konfigurationsdatei
   vim /var/www/iot-gateway/roombankerRestAPIWeb/deploy-scripts/production.config.js
   
   # Und die Nginx-Konfiguration entsprechend
   ```

### 4. Webhook für automatische Updates einrichten

```bash
# Webhook-Server installieren
cd /var/www
npm init -y
npm install express

# Webhook-Skript erstellen - WICHTIG: Beachte die verbesserte Fehlerbehandlung
cat > webhook.js << 'EOF'
/**
 * GitHub Webhook Server für automatisches Deployment
 * Robuste Version mit verbesserter Fehlerbehandlung
 */
const express = require('express');
const { spawn } = require('child_process');
const app = express();
const port = 8000;

// JSON-Parser mit erhöhtem Limit für große Payloads
app.use(express.json({ limit: '5mb' }));

// Einfaches Logging-Middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Status-Endpunkt für Tests
app.get('/status', (req, res) => {
  res.status(200).send('Webhook-Server läuft');
});

// Deployment-Endpunkt
app.post('/deploy', (req, res) => {
  console.log('Deployment-Webhook empfangen');
  
  // WICHTIG: Sofort antworten, um Timeouts zu vermeiden
  // Dies verhindert EOF-Fehler in GitHub
  res.status(202).send('Deployment wird ausgeführt');

  // Verzögerung, um sicherzustellen, dass die Antwort gesendet wurde
  setTimeout(() => {
    // Deployment-Skript ausführen
    // WICHTIG: Verwende spawn statt exec für bessere Fehlerbehandlung
    // WICHTIG: Verwende /bin/bash explizit und . statt source
    const deploy = spawn('/bin/bash', [
      '-c', 
      'cd /var/www/iot-gateway && git pull && . venv/bin/activate && pip install -r api/requirements.txt && cd frontend && npm install && npm run build && cd .. && pm2 reload all'
    ]);

    // Output-Handler
    deploy.stdout.on('data', (data) => {
      console.log(`Deployment-Ausgabe: ${data}`);
    });

    deploy.stderr.on('data', (data) => {
      console.error(`Deployment-Fehler: ${data}`);
    });

    deploy.on('close', (code) => {
      if (code === 0) {
        console.log('Deployment erfolgreich abgeschlossen');
      } else {
        console.error(`Deployment fehlgeschlagen mit Code ${code}`);
      }
    });
  }, 100);
});

// Server starten
app.listen(port, () => {
  console.log(`Webhook-Server läuft auf Port ${port}`);
});
EOF

# Webhook als Service starten
pm2 start webhook.js --name webhook
pm2 save
```

### 5. GitHub-Webhook einrichten

1. Gehe zu deinem Repository: https://github.com/nextX-AG/roombankerRestAPIWeb
2. Navigiere zu "Settings" > "Webhooks" > "Add webhook"
3. Trage als Payload URL `http://deine-server-ip:8000/deploy` ein
4. Wähle als Content Type `application/json`
5. Wähle "Just the push event"
6. **WICHTIG**: Bei SSL-Verifizierung wähle "Disable (not recommended)" für Testumgebungen ohne SSL. Dies verhindert Probleme mit selbst-signierten Zertifikaten.
7. Aktiviere den Webhook

### 6. Nginx-Konfiguration

```bash
cat > /etc/nginx/sites-available/iot-gateway << 'EOF'
server {
    listen 80;
    server_name iot-gateway.nextx.de;  # Domain anpassen!

    location / {
        root /var/www/iot-gateway/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:8080/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/auth/ {
        proxy_pass http://localhost:8082/api/auth/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location ~ ^/api/(templates|endpoints|process|reload-templates|test-transform) {
        proxy_pass http://localhost:8081;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
EOF

# Konfiguration aktivieren
ln -sf /etc/nginx/sites-available/iot-gateway /etc/nginx/sites-enabled/
nginx -t && systemctl restart nginx
```

### 7. Manuelles Deployment (falls nötig)

Falls du ein manuelles Deployment durchführen möchtest:

```bash
cd /var/www/iot-gateway
git pull

. venv/bin/activate
pip install -r api/requirements.txt
cd frontend
npm install
npm run build
cd ..
pm2 reload all
```

## Fehlerbehandlung

### Logs überprüfen

```bash
# PM2-Logs anzeigen
pm2 logs

# Nginx-Logs überprüfen
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### Dienste neu starten

```bash
# PM2-Prozesse neu starten
pm2 restart all

# Nginx neu starten
systemctl restart nginx
```

## SSL-Zertifikat hinzufügen (optional)

Für HTTPS-Unterstützung kannst du Let's Encrypt verwenden:

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d iot-gateway.nextx.de
```

## Firewall konfigurieren

```bash
# UFW installieren und einrichten
apt install -y ufw
ufw allow ssh
ufw allow http
ufw allow https
ufw allow 8000/tcp  # Für den Webhook
ufw enable
```

## Troubleshooting

### Häufige Probleme und Lösungen

1. **Fehler mit `source` in Webhook-Skripten**:
   ```
   /bin/sh: 1: source: not found
   ```
   Lösung: Verwende explizit `/bin/bash -c` und `.` statt `source` in der exec-Anweisung:
   ```javascript
   const { spawn } = require('child_process');
   const deploy = spawn('/bin/bash', ['-c', 'cd /pfad && . venv/bin/activate && ...']);
   ```

2. **GitHub-Webhook EOF-Fehler**:
   ```
   We couldn't deliver this payload: EOF
   ```
   Lösung:
   - Antworte sofort mit einem 202-Status und führe die Verarbeitung asynchron durch
   - Verwende `spawn` statt `exec` für stabilere Prozessausführung
   - Füge eine kleine Verzögerung (setTimeout) ein, bevor du mit der eigentlichen Verarbeitung beginnst

3. **PM2 findet Skripte nicht**:
   ```
   Error: Script not found: /var/www/iot-gateway/roombankerRestAPIWeb/api/app.py
   ```
   Lösungen:
   - Prüfe, ob die Pfade in `production.config.js` mit der tatsächlichen Verzeichnisstruktur übereinstimmen
   - Stelle sicher, dass das Repository mit dem Punkt am Ende geklont wurde: `git clone URL .`
   - Falls nötig, passe die PM2-Konfiguration an die tatsächliche Verzeichnisstruktur an

4. **Frontend-Build-Fehler mit Template-Syntax**:
   ```
   Unexpected token (181:54) in Platzhalter wie {{ "{{variable}}" }}
   ```
   Lösung:
   - In JSX müssen Template-Platzhalter als `{'{{'} variable {'}}'}` geschrieben werden
   - Überprüfe die Datei `frontend/src/pages/Templates.jsx`

5. **Webhook wird nicht aufgerufen**:
   - Prüfe, ob Port 8000 in der Firewall geöffnet ist: `ufw allow 8000/tcp`
   - Teste den Webhook manuell: `curl -X POST http://localhost:8000/deploy`
   - Überprüfe die GitHub-Webhook-Lieferungen im Repository unter Settings > Webhooks
   - Stelle sicher, dass der Webhook-Server mit `pm2 status` läuft

6. **Fehler mit `source` in Webhook-Skripten**:
   ```
   /bin/sh: 1: source: not found
   ```
   Lösung: Verwende explizit `/bin/bash -c` und `.` statt `source` in der exec-Anweisung

7. **PM2 findet Skripte nicht**:
   Prüfe, ob die Pfade in `production.config.js` mit der tatsächlichen Verzeichnisstruktur übereinstimmen

8. **Frontend-Build-Fehler mit Template-Syntax**:
   JSX kann keine doppelten geschweiften Klammern wie `{{ variable }}` verarbeiten. 
   Lösung: Verwende stattdessen `{'{{'} variable {'}}'}` in React-Komponenten.

9. **Webhook wird nicht aufgerufen**:
   - Prüfe, ob Port 8000 in der Firewall geöffnet ist: `ufw allow 8000/tcp`
   - Teste den Webhook manuell: `curl -X POST http://localhost:8000/deploy`
   - Überprüfe die GitHub-Webhook-Lieferungen im Repository unter Settings > Webhooks 