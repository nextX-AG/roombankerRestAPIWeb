#!/bin/bash

# Deployment-Skript für den Hetzner-Server
# Führt alle notwendigen Schritte für das Deployment aus

set -e  # Bei Fehlern abbrechen

# Variablen
APP_NAME="iot-gateway"
DEPLOY_DIR="/var/www/$APP_NAME"
GIT_REPO="$1"  # Git-Repository als Parameter übergeben
BRANCH="${2:-main}"  # Branch als Parameter, Standard ist main/master

# Farbige Ausgabe
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== IoT Gateway Deployment auf Hetzner Server ===${NC}"
echo -e "${YELLOW}Repository: $GIT_REPO${NC}"
echo -e "${YELLOW}Branch: $BRANCH${NC}"

# Prüfen, ob das Verzeichnis existiert
if [ ! -d "$DEPLOY_DIR" ]; then
    echo -e "${YELLOW}Erstelle Verzeichnis $DEPLOY_DIR${NC}"
    mkdir -p "$DEPLOY_DIR"
fi

# In das Zielverzeichnis wechseln
cd "$DEPLOY_DIR"

# Git-Repository klonen oder aktualisieren
if [ -d ".git" ]; then
    echo -e "${YELLOW}Aktualisiere Repository...${NC}"
    git fetch --all
    git checkout $BRANCH
    git reset --hard origin/$BRANCH
else
    echo -e "${YELLOW}Klone Repository...${NC}"
    git clone $GIT_REPO .
    git checkout $BRANCH
fi

# Python-Umgebung einrichten
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}Erstelle virtuelle Python-Umgebung...${NC}"
    python3 -m venv venv
fi

echo -e "${YELLOW}Aktiviere virtuelle Umgebung und installiere Abhängigkeiten...${NC}"
source venv/bin/activate
pip install --upgrade pip
pip install -r api/requirements.txt

# Frontend-Abhängigkeiten installieren und Build erstellen
echo -e "${YELLOW}Installiere Frontend-Abhängigkeiten und erstelle Build...${NC}"
cd frontend
npm install
npm run build
cd ..

# PM2 Prozesse aktualisieren
echo -e "${YELLOW}Aktualisiere PM2 Prozesse...${NC}"
if command -v pm2 &> /dev/null; then
    pm2 reload deploy-scripts/production.config.js
else
    echo -e "${RED}PM2 ist nicht installiert. Installiere PM2...${NC}"
    npm install -g pm2
    pm2 start deploy-scripts/production.config.js
fi

# Nginx-Konfiguration erstellen, falls sie nicht existiert
NGINX_CONF="/etc/nginx/sites-available/$APP_NAME"
if [ ! -f "$NGINX_CONF" ]; then
    echo -e "${YELLOW}Erstelle Nginx-Konfiguration...${NC}"
    cat > "$NGINX_CONF" << EOF
server {
    listen 80;
    server_name ${APP_NAME}.example.com;  # Domain anpassen!

    location / {
        root $DEPLOY_DIR/frontend/dist;
        try_files \$uri \$uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:8080/api/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /api/auth/ {
        proxy_pass http://localhost:8082/api/auth/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /api/templates {
        proxy_pass http://localhost:8081/api/templates;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }

    location /api/endpoints {
        proxy_pass http://localhost:8081/api/endpoints;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }

    location /api/process {
        proxy_pass http://localhost:8081/api/process;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }

    location /api/reload-templates {
        proxy_pass http://localhost:8081/api/reload-templates;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }

    location /api/test-transform {
        proxy_pass http://localhost:8081/api/test-transform;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
}
EOF

    # Nginx-Konfiguration aktivieren
    ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/
    nginx -t && systemctl reload nginx
    
    echo -e "${GREEN}Nginx-Konfiguration erstellt und aktiviert.${NC}"
    echo -e "${YELLOW}Bitte passen Sie die Domain in der Nginx-Konfiguration an!${NC}"
fi

# Berechtigungen setzen
echo -e "${YELLOW}Setze Berechtigungen...${NC}"
chown -R www-data:www-data $DEPLOY_DIR
chmod -R 755 $DEPLOY_DIR

echo -e "${GREEN}=== Deployment abgeschlossen! ===${NC}"
echo -e "${GREEN}Die Anwendung ist nun unter http://${APP_NAME}.example.com (oder IP) verfügbar.${NC}"
echo -e "${YELLOW}Hinweis: Stellen Sie sicher, dass die Firewall Ports 80 und 443 freigibt.${NC}" 