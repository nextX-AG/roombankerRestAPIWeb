#!/bin/bash

# Farben für bessere Lesbarkeit
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== IoT Gateway Fixskript für Server ===${NC}"
echo -e "${YELLOW}Dieses Skript behebt alle erkannten Probleme mit dem IoT Gateway.${NC}"
echo ""

echo -e "${YELLOW}Schritt 1: Git-Repository-Berechtigungen korrigieren${NC}"
cd /var/www/iot-gateway
git config --global --add safe.directory /var/www/iot-gateway
echo -e "${GREEN}Git-Repository-Berechtigungen korrigiert.${NC}"
echo ""

echo -e "${YELLOW}Schritt 2: Bestehende PM2-Prozesse bereinigen${NC}"
echo "Stoppe alle PM2-Prozesse..."
pm2 stop all
echo "Lösche alle PM2-Prozesse..."
pm2 delete all
echo "Lösche PM2-Logs..."
pm2 flush
echo -e "${GREEN}PM2-Prozesse bereinigt.${NC}"
echo ""

echo -e "${YELLOW}Schritt 3: Belegte Ports überprüfen${NC}"
for PORT in 8080 8081 8082; do
    PORT_CHECK=$(lsof -i :$PORT | grep LISTEN)
    if [[ ! -z "$PORT_CHECK" ]]; then
        echo -e "${RED}Port $PORT ist belegt. Prozess wird beendet...${NC}"
        PID=$(echo "$PORT_CHECK" | awk '{print $2}')
        echo "Beende Prozess mit PID $PID"
        kill -9 $PID
        echo -e "${GREEN}Prozess beendet.${NC}"
    else
        echo -e "${GREEN}Port $PORT ist frei.${NC}"
    fi
done
echo ""

echo -e "${YELLOW}Schritt 4: Redis-Status überprüfen${NC}"
REDIS_STATUS=$(systemctl is-active redis-server)
if [[ "$REDIS_STATUS" != "active" ]]; then
    echo -e "${RED}Redis ist nicht aktiv. Starte Redis...${NC}"
    systemctl start redis-server
    systemctl enable redis-server
    echo -e "${GREEN}Redis gestartet und für Autostart konfiguriert.${NC}"
else
    echo -e "${GREEN}Redis läuft bereits.${NC}"
fi
echo ""

echo -e "${YELLOW}Schritt 5: MongoDB-Status überprüfen${NC}"
MONGO_STATUS=$(systemctl is-active mongod || echo "nicht installiert")
if [[ "$MONGO_STATUS" != "active" ]]; then
    echo -e "${RED}MongoDB ist nicht aktiv oder nicht installiert. Installiere/starte MongoDB...${NC}"
    if ! command -v mongod &> /dev/null; then
        echo "MongoDB nicht installiert. Installiere MongoDB..."
        apt-get update
        apt-get install -y mongodb
    fi
    systemctl start mongod
    systemctl enable mongod
    echo -e "${GREEN}MongoDB gestartet und für Autostart konfiguriert.${NC}"
else
    echo -e "${GREEN}MongoDB läuft bereits.${NC}"
fi
echo ""

echo -e "${YELLOW}Schritt 6: Virtuelle Python-Umgebung neu erstellen${NC}"
echo "Erstelle virtuelle Python-Umgebung neu..."
rm -rf /var/www/iot-gateway/venv
python3 -m venv /var/www/iot-gateway/venv
source /var/www/iot-gateway/venv/bin/activate
pip install --upgrade pip
pip install -r /var/www/iot-gateway/api/requirements.txt
echo -e "${GREEN}Virtuelle Python-Umgebung neu erstellt und Abhängigkeiten installiert.${NC}"
echo ""

echo -e "${YELLOW}Schritt 7: PM2-Ecosystem-Datei mit korrekten Umgebungsvariablen erstellen${NC}"
cat > /var/www/iot-gateway/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'iot-api',
      script: 'api/app.py',
      interpreter: '/var/www/iot-gateway/venv/bin/python3',
      cwd: '/var/www/iot-gateway',
      env: {
        'FLASK_ENV': 'production',
        'PORT': '8080',
        'REDIS_HOST': 'localhost',
        'REDIS_PORT': '6379',
        'REDIS_PASSWORD': '78WDQEuz',
        'MONGODB_URI': 'mongodb://localhost:27017/',
        'MONGODB_DB': 'evalarm_gateway'
      }
    },
    {
      name: 'iot-processor',
      script: 'api/message_processor.py',
      interpreter: '/var/www/iot-gateway/venv/bin/python3',
      cwd: '/var/www/iot-gateway',
      env: {
        'FLASK_ENV': 'production',
        'PORT': '8081',
        'REDIS_HOST': 'localhost',
        'REDIS_PORT': '6379',
        'REDIS_PASSWORD': '78WDQEuz',
        'MONGODB_URI': 'mongodb://localhost:27017/',
        'MONGODB_DB': 'evalarm_gateway'
      }
    },
    {
      name: 'iot-worker',
      script: 'api/message_worker.py',
      interpreter: '/var/www/iot-gateway/venv/bin/python3',
      cwd: '/var/www/iot-gateway',
      env: {
        'FLASK_ENV': 'production',
        'REDIS_HOST': 'localhost',
        'REDIS_PORT': '6379',
        'REDIS_PASSWORD': '78WDQEuz',
        'MONGODB_URI': 'mongodb://localhost:27017/',
        'MONGODB_DB': 'evalarm_gateway'
      }
    },
    {
      name: 'iot-auth',
      script: 'api/auth_service.py',
      interpreter: '/var/www/iot-gateway/venv/bin/python3',
      cwd: '/var/www/iot-gateway',
      env: {
        'FLASK_ENV': 'production',
        'PORT': '8082',
        'REDIS_HOST': 'localhost',
        'REDIS_PORT': '6379',
        'REDIS_PASSWORD': '78WDQEuz',
        'MONGODB_URI': 'mongodb://localhost:27017/',
        'MONGODB_DB': 'evalarm_gateway'
      }
    }
  ]
};
EOF
echo -e "${GREEN}PM2-Ecosystem-Datei mit korrekten Umgebungsvariablen erstellt.${NC}"
echo ""

echo -e "${YELLOW}Schritt 8: Frontend neu bauen${NC}"
echo "Frontend-Abhängigkeiten installieren..."
cd /var/www/iot-gateway/frontend
npm install
echo "Frontend bauen..."
npm run build
cd /var/www/iot-gateway
echo -e "${GREEN}Frontend neu gebaut.${NC}"
echo ""

echo -e "${YELLOW}Schritt 9: PM2 mit neuer Konfiguration starten${NC}"
echo "Starte alle Dienste mit PM2..."
pm2 start ecosystem.config.js
echo "Speichere PM2-Konfiguration für Autostart..."
pm2 save
echo -e "${GREEN}PM2-Dienste gestartet und gespeichert.${NC}"
echo ""

echo -e "${YELLOW}Schritt 10: Nginx-Konfiguration prüfen${NC}"
echo "Prüfe Nginx-Konfiguration..."
NGINX_TEST=$(nginx -t 2>&1)
if [[ "$NGINX_TEST" == *"successful"* ]]; then
    echo -e "${GREEN}Nginx-Konfiguration ist korrekt.${NC}"
    echo "Starte Nginx neu..."
    systemctl restart nginx
    echo -e "${GREEN}Nginx neugestartet.${NC}"
else
    echo -e "${RED}Fehler in Nginx-Konfiguration:${NC}"
    echo "$NGINX_TEST"
fi
echo ""

echo -e "${YELLOW}Schritt 11: Status der Dienste überprüfen${NC}"
echo "PM2-Status:"
pm2 list
echo ""
echo "API-Server:"
curl -s http://localhost:8080/api/health || echo "Nicht erreichbar"
echo ""
echo "Message Processor:"
curl -s http://localhost:8081/api/templates || echo "Nicht erreichbar"
echo ""
echo "Auth Service:"
curl -s http://localhost:8082/api/auth/users || echo "Nicht erreichbar"
echo ""

echo -e "${GREEN}=== Fix-Skript abgeschlossen ===${NC}"
echo -e "${YELLOW}Prüfe das Dashboard unter http://157.180.37.234${NC}"
echo -e "${YELLOW}Falls das Problem weiterhin besteht, überprüfe die detaillierten Logs mit 'pm2 logs'${NC}" 