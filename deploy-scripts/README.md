# Deployment-Anleitung für den Hetzner-Server

Diese Anleitung beschreibt, wie das IoT Gateway-Relay-System auf einem Hetzner-Server mit automatischem Deployment über Git eingerichtet wird.

## Voraussetzungen

- Ein Hetzner-Server mit Ubuntu/Debian
- Root-Zugriff auf den Server
- Git-Repository für das Projekt

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

### 3. Erstelle den Deployment-Hook

```bash
mkdir -p /var/git/hooks
cd /var/git/hooks

# Erstelle den Hook
cat > post-receive << 'EOF'
#!/bin/bash

echo "Deployment wird gestartet..."
/var/www/iot-gateway/deploy-scripts/deploy.sh "git@github.com:dein-username/dein-repository.git" main
echo "Deployment abgeschlossen!"
EOF

chmod +x post-receive
```

### 4. Git-Repository einrichten

```bash
# Erstelle das bare Repository
mkdir -p /var/git/iot-gateway.git
cd /var/git/iot-gateway.git
git init --bare

# Hook-Datei verlinken
ln -sf /var/git/hooks/post-receive hooks/post-receive
```

### 5. Deployment-Verzeichnis vorbereiten

```bash
mkdir -p /var/www/iot-gateway
chown -R www-data:www-data /var/www/iot-gateway
```

## Lokale Einrichtung

### 1. Remote hinzufügen

Auf deinem lokalen Entwicklungsrechner:

```bash
cd dein-projekt-verzeichnis
git remote add production ssh://root@deine-server-ip/var/git/iot-gateway.git
```

### 2. Änderungen pushen

```bash
git add .
git commit -m "Initial deployment"
git push production main
```

Der Post-Receive-Hook wird automatisch ausgeführt und das Deployment-Skript starten.

## Manuelles Deployment

Bei Bedarf kannst du das Deployment auch manuell auf dem Server ausführen:

```bash
cd /var/www/iot-gateway
./deploy-scripts/deploy.sh "git@github.com:dein-username/dein-repository.git" main
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
certbot --nginx -d deine-domain.de
```

## Firewall konfigurieren

```bash
# UFW installieren und einrichten
apt install -y ufw
ufw allow ssh
ufw allow http
ufw allow https
ufw enable
``` 