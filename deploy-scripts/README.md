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

# Webhook-Skript erstellen
cat > webhook.js << 'EOF'
const express = require('express');
const { exec } = require('child_process');
const app = express();
const port = 8000;

app.use(express.json());

app.post('/deploy', (req, res) => {
  console.log('Deployment-Webhook empfangen');
  
  exec('/bin/bash -c "cd /var/www/iot-gateway && git pull && . venv/bin/activate && pip install -r api/requirements.txt && cd frontend && npm install && npm run build && cd .. && pm2 reload all"', 
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

app.get('/status', (req, res) => {
  res.status(200).send('Webhook-Server läuft');
});

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
6. Bei SSL-Verifizierung wähle "Disable (not recommended)" für Testumgebungen ohne SSL
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
   Lösung: Verwende explizit `/bin/bash -c` und `.` statt `source` in der exec-Anweisung

2. **PM2 findet Skripte nicht**:
   Prüfe, ob die Pfade in `production.config.js` mit der tatsächlichen Verzeichnisstruktur übereinstimmen

3. **Frontend-Build-Fehler mit Template-Syntax**:
   JSX kann keine doppelten geschweiften Klammern wie `{{ variable }}` verarbeiten. 
   Lösung: Verwende stattdessen `{'{{'} variable {'}}'}` in React-Komponenten.

4. **Webhook wird nicht aufgerufen**:
   - Prüfe, ob Port 8000 in der Firewall geöffnet ist: `ufw allow 8000/tcp`
   - Teste den Webhook manuell: `curl -X POST http://localhost:8000/deploy`
   - Überprüfe die GitHub-Webhook-Lieferungen im Repository unter Settings > Webhooks 