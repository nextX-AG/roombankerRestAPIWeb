#!/bin/bash

# Starte den Message Worker
echo "Starte Message Worker..."
cd "$(dirname "$0")"

# Umgebungsvariablen für Ports aus zentraler Konfiguration setzen
export WORKER_PORT=8083
export WORKER_API_PORT=$WORKER_PORT
export WORKER_THREADS=2
export WORKER_POLL_INTERVAL=0.5

# Redis-Konfiguration aus Processor-Skript übernehmen
export REDIS_PORT=6379
export REDIS_DB=0
export REDIS_PASSWORD="78WDQEuz"
export REDIS_PREFIX=iot_gateway

# Mögliche Redis-Hosts
REDIS_HOSTS=("localhost" "127.0.0.1" "157.180.37.234" "evAlarmServer")

# Verbindungen testen und den ersten funktionierenden Host verwenden
CONNECTION_SUCCESSFUL=false

echo "Teste Redis-Verbindung zu möglichen Hosts..."
for HOST in "${REDIS_HOSTS[@]}"; do
    echo "Versuche Verbindung zu Redis auf $HOST:$REDIS_PORT..."
    
    # Teste Verbindung
    if python3 -c "
import redis
import sys
try:
    client = redis.Redis(
        host='$HOST', 
        port=$REDIS_PORT, 
        db=$REDIS_DB, 
        password='$REDIS_PASSWORD',
        socket_timeout=3
    )
    if client.ping():
        sys.exit(0)  # Erfolg
    else:
        sys.exit(1)  # Ping fehlgeschlagen
except Exception:
    sys.exit(1)  # Verbindung fehlgeschlagen
" > /dev/null 2>&1; then
        # Verbindung erfolgreich
        export REDIS_HOST=$HOST
        echo "Redis-Verbindung zu $HOST erfolgreich hergestellt!"
        CONNECTION_SUCCESSFUL=true
        break
    else
        echo "Verbindung zu Redis auf $HOST fehlgeschlagen."
    fi
done

# Wenn keine Verbindung hergestellt werden konnte
if [ "$CONNECTION_SUCCESSFUL" = false ]; then
    echo "Fehler: Konnte keine Verbindung zu Redis herstellen. Message Worker wird nicht gestartet."
    exit 1
fi

echo "Starte Message Worker auf Port $WORKER_PORT mit Redis-Host: $REDIS_HOST"
python3 message_worker.py 