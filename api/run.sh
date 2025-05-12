#!/bin/bash

# Skript zum Starten des API-Servers

# Projektverzeichnis ermitteln
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Überprüfen, ob Python-Abhängigkeiten installiert sind
echo "Prüfe Python-Abhängigkeiten..."
python3 -m pip install -r "$PROJECT_DIR/requirements.txt" --quiet

# Port-Konfiguration
export API_PORT=8080
export PYTHONPATH="$PROJECT_DIR:$PYTHONPATH"

echo "Starte IoT Gateway API Server..."
echo "API-Server wird auf Port $API_PORT gestartet..."

# Server starten
python3 app.py
