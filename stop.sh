#!/bin/bash

# Stoppskript für das IoT Gateway-Relay System
echo "Stoppe IoT Gateway-Relay System..."

# Projektverzeichnis
PROJECT_DIR="$(dirname "$(readlink -f "$0")")"
PID_FILE="$PROJECT_DIR/.pids"

# Prüfe, ob PID-Datei existiert
if [ -f "$PID_FILE" ]; then
    # Lese PIDs aus Datei
    PIDS=$(cat "$PID_FILE")
    
    # Beende alle Prozesse
    for PID in $PIDS; do
        if ps -p $PID > /dev/null; then
            echo "Beende Prozess mit PID: $PID"
            kill $PID
        fi
    done
    
    # Lösche PID-Datei
    rm "$PID_FILE"
    
    echo "Alle Dienste wurden beendet."
else
    echo "Keine laufenden Dienste gefunden."
fi
