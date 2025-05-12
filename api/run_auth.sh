#!/bin/bash

# Skript zum Starten des Auth-Services

# Projektverzeichnis ermitteln
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Überprüfen, ob Python-Abhängigkeiten installiert sind
echo "Prüfe Python-Abhängigkeiten..."
python3 -m pip install -r "$PROJECT_DIR/requirements.txt" --quiet

# Port-Konfiguration
export AUTH_PORT=8081
export PYTHONPATH="$PROJECT_DIR:$PYTHONPATH"

echo "Starte Auth Service..."
echo "Auth Service wird auf Port $AUTH_PORT gestartet..."

# Server starten
python3 auth_service.py
