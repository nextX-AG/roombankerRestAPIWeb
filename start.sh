#!/bin/bash

# Startskript für das gesamte IoT Gateway-Relay System
echo "Starte IoT Gateway-Relay System..."

# Projektverzeichnis
PROJECT_DIR="$(dirname "$(readlink -f "$0")")"
API_DIR="$PROJECT_DIR/api"
GATEWAY_DIR="$PROJECT_DIR/gateway"
FRONTEND_DIR="$PROJECT_DIR/frontend"
DEPLOY_DIR="$PROJECT_DIR/deploy-scripts"

# Optionale Aktivierung von Nginx
USE_NGINX=${USE_NGINX:-0}

# Starte API-Server im Hintergrund
echo "Starte API-Server..."
cd "$API_DIR" && ./run.sh &
API_PID=$!
echo "API-Server gestartet mit PID: $API_PID"

# Warte kurz, damit der API-Server starten kann
sleep 2

# Starte Message Processor im Hintergrund
echo "Starte Message Processor..."
cd "$API_DIR" && ./run_processor.sh &
PROCESSOR_PID=$!
echo "Message Processor gestartet mit PID: $PROCESSOR_PID"

# Warte kurz, damit der Message Processor starten kann
sleep 2

# Starte Auth Service im Hintergrund
echo "Starte Auth Service..."
cd "$API_DIR" && ./run_auth.sh &
AUTH_PID=$!
echo "Auth Service gestartet mit PID: $AUTH_PID"

# Warte kurz, damit der Auth Service starten kann
sleep 2

# Starte API-Gateway im Hintergrund
echo "Starte API-Gateway..."
cd "$GATEWAY_DIR" && ./start_gateway.sh &
GATEWAY_PID=$!
echo "API-Gateway gestartet mit PID: $GATEWAY_PID"

# Warte kurz, damit das API-Gateway starten kann
sleep 2

# Generiere und starte optional NGINX
if [ "$USE_NGINX" = "1" ]; then
    echo "Generiere und starte NGINX-Konfiguration..."
    cd "$DEPLOY_DIR" && bash start_nginx.sh
    sleep 2
else
    echo "NGINX wird nicht verwendet. Um NGINX zu aktivieren, starten Sie mit: USE_NGINX=1 ./start.sh"
fi

# Starte Frontend-Entwicklungsserver
echo "Starte Frontend-Entwicklungsserver..."
cd "$FRONTEND_DIR" && npm run dev &
FRONTEND_PID=$!
echo "Frontend-Server gestartet mit PID: $FRONTEND_PID"

# Speichere PIDs für späteres Beenden
echo "$API_PID $PROCESSOR_PID $AUTH_PID $GATEWAY_PID $FRONTEND_PID" > "$PROJECT_DIR/.pids"

echo "Alle Dienste wurden gestartet."
echo "Frontend ist unter http://localhost:5173 erreichbar."
echo ""
echo "Dienste sind über das API-Gateway erreichbar unter http://localhost:8000:"
echo " - Auth Service: /api/v1/auth/*"
echo " - API Service: /api/v1/gateways/*, /api/v1/customers/*, /api/v1/devices/*"
echo " - Message Worker: /api/v1/messages/*, /api/v1/templates/*"
echo " - API Gateway Status: /api/v1/gateway/status"
echo ""
echo "Einzelne Dienste sind auch direkt erreichbar:"
echo " - API-Server: http://localhost:8080"
echo " - Message Processor: http://localhost:8081"
echo " - Auth Service: http://localhost:8082"
echo ""

# Hinweise zur NGINX-Nutzung
if [ "$USE_NGINX" = "1" ]; then
    echo "NGINX ist aktiviert und leitet Anfragen weiter:"
    echo " - Alle API-Anfragen gehen über http://localhost:80/api/"
    echo " - Frontend ist über http://localhost/ erreichbar"
    echo ""
fi

echo "Zum Beenden aller Dienste führen Sie './stop.sh' aus."

# Warte auf Benutzerabbruch
wait
