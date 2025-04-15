#!/bin/bash

# Startskript für das gesamte IoT Gateway-Relay System
echo "Starte IoT Gateway-Relay System..."

# Projektverzeichnis
PROJECT_DIR="$(dirname "$(readlink -f "$0")")"
API_DIR="$PROJECT_DIR/api"
FRONTEND_DIR="$PROJECT_DIR/frontend"

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

# Starte Frontend-Entwicklungsserver
echo "Starte Frontend-Entwicklungsserver..."
cd "$FRONTEND_DIR" && npm run dev &
FRONTEND_PID=$!
echo "Frontend-Server gestartet mit PID: $FRONTEND_PID"

# Speichere PIDs für späteres Beenden
echo "$API_PID $PROCESSOR_PID $AUTH_PID $FRONTEND_PID" > "$PROJECT_DIR/.pids"

echo "Alle Dienste wurden gestartet."
echo "Frontend ist unter http://localhost:5173 erreichbar."
echo "API-Server ist unter http://localhost:8080 erreichbar."
echo "Message Processor ist unter http://localhost:8081 erreichbar."
echo "Auth Service ist unter http://localhost:8082 erreichbar."
echo ""
echo "Zum Beenden aller Dienste führen Sie './stop.sh' aus."

# Warte auf Benutzerabbruch
wait
