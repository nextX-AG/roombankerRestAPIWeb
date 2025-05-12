#!/bin/bash

# Start-Skript für den API Gateway Service
set -e  # Exit on error

# Projektverzeichnis ermitteln (unabhängig davon, von wo das Skript aufgerufen wird)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Environment-Variablen setzen
export GATEWAY_PORT=${GATEWAY_PORT:-8000}
export FLASK_ENV=${FLASK_ENV:-development}
export PYTHONPATH="$PROJECT_DIR:$PYTHONPATH"

# Log-Verzeichnis sicherstellen
mkdir -p "$SCRIPT_DIR/logs"

echo "Projektverzeichnis: $PROJECT_DIR"
echo "Gateway-Verzeichnis: $SCRIPT_DIR"

# Stellen Sie sicher, dass die erforderlichen Abhängigkeiten installiert sind
echo "Prüfe Abhängigkeiten..."
pip install flask requests

# Wechsle in das Hauptverzeichnis
cd "$PROJECT_DIR"

# Überprüfe, ob utils als Paket erkannt wird
if [ ! -f "$PROJECT_DIR/utils/__init__.py" ]; then
    echo "FEHLER: utils/__init__.py nicht gefunden. Bitte erstellen Sie diese Datei."
    exit 1
fi

# Starte den Gateway-Service
echo "Starte API Gateway auf Port $GATEWAY_PORT in Umgebung: $FLASK_ENV"
python -m gateway.api_gateway 