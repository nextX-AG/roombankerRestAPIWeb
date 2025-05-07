#!/bin/bash

# Farben für bessere Lesbarkeit
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== IoT Gateway Fixskript ===${NC}"
echo -e "${YELLOW}Dieses Skript behebt Probleme mit dem Message Processor und Redis.${NC}"
echo ""

echo -e "${YELLOW}Schritt 1: Bestehende PM2-Prozesse bereinigen${NC}"
echo "Stoppe alle PM2-Prozesse..."
pm2 stop all
echo "Lösche alle PM2-Prozesse..."
pm2 delete all
echo "Lösche PM2-Logs..."
pm2 flush
echo -e "${GREEN}PM2-Prozesse bereinigt.${NC}"
echo ""

echo -e "${YELLOW}Schritt 2: Prüfe, ob Port 8081 bereits belegt ist${NC}"
PORT_CHECK=$(lsof -i :8081 | grep LISTEN)
if [[ ! -z "$PORT_CHECK" ]]; then
    echo -e "${RED}Port 8081 ist belegt. Prozess wird beendet...${NC}"
    PID=$(echo "$PORT_CHECK" | awk '{print $2}')
    echo "Beende Prozess mit PID $PID"
    kill -9 $PID
    echo -e "${GREEN}Prozess beendet.${NC}"
else
    echo -e "${GREEN}Port 8081 ist frei.${NC}"
fi
echo ""

echo -e "${YELLOW}Schritt 3: Redis-Status überprüfen${NC}"
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

echo -e "${YELLOW}Schritt 4: PM2-Ecosystem-Datei erstellen${NC}"
cat > /var/www/iot-gateway/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'iot-api',
      script: 'api/app.py',
      interpreter: 'python3',
      cwd: '/var/www/iot-gateway',
      env: {
        'FLASK_ENV': 'production',
        'PORT': '8080'
      }
    },
    {
      name: 'iot-processor',
      script: 'api/run_processor.sh',
      interpreter: 'bash',
      cwd: '/var/www/iot-gateway',
      env: {
        'REDIS_HOST': 'localhost',
        'REDIS_PORT': '6379',
        'REDIS_PASSWORD': 'OW!p3x?',
        'PORT': '8081'
      }
    },
    {
      name: 'iot-auth',
      script: 'api/auth_service.py',
      interpreter: 'python3',
      cwd: '/var/www/iot-gateway',
      env: {
        'PORT': '8082'
      }
    }
  ]
};
EOF
echo -e "${GREEN}PM2-Ecosystem-Datei erstellt.${NC}"
echo ""

echo -e "${YELLOW}Schritt 5: Berechtigungen prüfen und korrigieren${NC}"
echo "Setze korrekte Berechtigungen für run_processor.sh..."
chmod +x /var/www/iot-gateway/api/run_processor.sh
echo -e "${GREEN}Berechtigungen gesetzt.${NC}"
echo ""

echo -e "${YELLOW}Schritt 6: PM2 mit neuer Konfiguration starten${NC}"
cd /var/www/iot-gateway
echo "Starte alle Dienste mit PM2..."
pm2 start ecosystem.config.js
echo "Speichere PM2-Konfiguration für Autostart..."
pm2 save
echo -e "${GREEN}PM2-Dienste gestartet und gespeichert.${NC}"
echo ""

echo -e "${YELLOW}Schritt 7: Nginx-Konfiguration prüfen${NC}"
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

echo -e "${YELLOW}Schritt 8: Status der Dienste anzeigen${NC}"
echo "API-Server:"
curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/health || echo "Nicht erreichbar"
echo ""
echo "Message Processor:"
curl -s -o /dev/null -w "%{http_code}" http://localhost:8081/api/templates || echo "Nicht erreichbar"
echo ""
echo "Auth Service:"
curl -s -o /dev/null -w "%{http_code}" http://localhost:8082/api/auth/users || echo "Nicht erreichbar"
echo ""

echo -e "${GREEN}=== Fix-Skript abgeschlossen ===${NC}"
echo -e "${YELLOW}Prüfe das Dashboard, um zu sehen, ob alle Dienste online sind.${NC}"
echo -e "${YELLOW}Falls das Problem weiterhin besteht, starte den Server neu.${NC}" 