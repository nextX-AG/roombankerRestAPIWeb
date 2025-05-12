#!/bin/bash

# Installations-Skript für das evAlarm-IoT Gateway System
echo "Installiere evAlarm-IoT Gateway System..."

# Projektverzeichnis ermitteln
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
cd "$PROJECT_DIR"

# Prüfen, ob Python installiert ist
if ! command -v python3 &> /dev/null; then
    echo "FEHLER: Python 3 ist nicht installiert. Bitte installieren Sie Python 3."
    exit 1
fi

# Python-Version prüfen
PYTHON_VERSION=$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
PYTHON_MAJOR=$(echo $PYTHON_VERSION | cut -d. -f1)
PYTHON_MINOR=$(echo $PYTHON_VERSION | cut -d. -f2)

if [ "$PYTHON_MAJOR" -lt 3 ] || [ "$PYTHON_MAJOR" -eq 3 -a "$PYTHON_MINOR" -lt 6 ]; then
    echo "FEHLER: Python 3.6 oder höher wird benötigt. Sie verwenden Python $PYTHON_VERSION."
    exit 1
fi

echo "Python-Version $PYTHON_VERSION erkannt (OK)."

# Virtuelle Umgebung erstellen (optional)
if [ ! -d "venv" ]; then
    echo "Erstelle virtuelle Python-Umgebung..."
    python3 -m venv venv
    if [ $? -ne 0 ]; then
        echo "WARNUNG: Konnte keine virtuelle Umgebung erstellen. Fahre ohne fort."
    else
        echo "Virtuelle Umgebung erstellt in $PROJECT_DIR/venv"
        echo "Sie können die Umgebung aktivieren mit: source venv/bin/activate"
    fi
fi

# Falls venv existiert, aktivieren
if [ -d "venv" ]; then
    echo "Aktiviere virtuelle Umgebung..."
    source venv/bin/activate
fi

# Python-Abhängigkeiten installieren
echo "Installiere Python-Abhängigkeiten..."
pip install -r requirements.txt

# Frontend-Abhängigkeiten (wenn npm installiert ist)
if command -v npm &> /dev/null; then
    echo "Installiere Frontend-Abhängigkeiten..."
    cd "$PROJECT_DIR/frontend"
    npm install
    cd "$PROJECT_DIR"
else
    echo "WARNUNG: npm ist nicht installiert. Frontend-Abhängigkeiten wurden nicht installiert."
fi

# Umgebungsvariablen-Template
if [ ! -f ".env" ]; then
    echo "Erstelle Beispiel-Umgebungsvariablen in .env.example..."
    cat > .env.example << 'EOF'
# evAlarm-IoT Gateway Konfiguration

# Umgebung (development oder production)
FLASK_ENV=development

# Service-Ports
API_PORT=8080
AUTH_PORT=8081
PROCESSOR_PORT=8082
WORKER_PORT=8083
GATEWAY_PORT=8000

# Redis-Konfiguration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=
REDIS_PREFIX=iot_gateway

# MongoDB-Konfiguration
MONGO_URI=mongodb://localhost:27017/evalarm_iot
MONGO_DB=evalarm_iot

# JWT-Secrets
JWT_SECRET=change_this_to_a_random_secure_string
JWT_REFRESH_SECRET=change_this_to_another_random_secure_string
EOF
    
    echo "Kopiere .env.example nach .env..."
    cp .env.example .env
    echo "Bitte passen Sie die Konfiguration in .env an Ihre Umgebung an."
fi

# Ausführbar machen
chmod +x start.sh
chmod +x stop.sh
chmod +x gateway/start_gateway.sh
chmod +x api/run.sh
chmod +x api/run_auth.sh
chmod +x api/run_processor.sh

echo "Installation abgeschlossen!"
echo ""
echo "Sie können das System nun mit './start.sh' starten." 