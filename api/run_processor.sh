#!/bin/bash

# Skript zum Starten des Message Processors mit Redis-Konfiguration

# Projektverzeichnis ermitteln
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Überprüfen, ob Python-Abhängigkeiten installiert sind
echo "Prüfe Python-Abhängigkeiten..."
python3 -m pip install -r "$PROJECT_DIR/requirements.txt" --quiet

# Port- und PYTHONPATH-Konfiguration
export PROCESSOR_PORT=8082
export PYTHONPATH="$PROJECT_DIR:$PYTHONPATH"

# Standard-Redis-Konfiguration
export WORKER_THREADS=2
export WORKER_POLL_INTERVAL=0.5
export REDIS_PORT=6379
export REDIS_DB=0
export REDIS_PASSWORD="78WDQEuz"
export REDIS_PREFIX=iot_gateway

echo "Starte Message Processor..."
cd "$SCRIPT_DIR"

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
    if [ "$FLASK_ENV" != "production" ]; then
        echo "WARNUNG: Im Entwicklungsmodus - Message Processor wird ohne Redis-Verbindung gestartet."
        echo "Einige Funktionen werden nicht verfügbar sein. Empfehle Installation von Redis für volle Funktionalität."
        echo "Start mit: docker run --name redis -p 6379:6379 -d redis"
        export REDIS_UNAVAILABLE=true
        export REDIS_HOST="localhost"
    else
        echo "Fehler: Konnte keine Verbindung zu Redis herstellen. Message Processor wird nicht gestartet."
        exit 1
    fi
fi

# Redis-Verbindung mit ausführlichem Logging testen
if [ "$REDIS_UNAVAILABLE" != "true" ]; then
    echo "Finale Redis-Verbindungsdetails:"
    python3 -c "
import redis
import sys
try:
    print(f'Verbinde zu Redis auf {sys.argv[1]}:{sys.argv[2]} mit Passwort...')
    client = redis.Redis(
        host=sys.argv[1], 
        port=int(sys.argv[2]), 
        db=int(sys.argv[3]), 
        password=sys.argv[4],
        socket_timeout=5
    )
    result = client.ping()
    print(f'Redis-Verbindung erfolgreich: {result}')
    # Teste Info-Abruf
    info = client.info()
    print(f'Redis Version: {info.get(\"redis_version\")}')
    print(f'Connected Clients: {info.get(\"connected_clients\")}')
    sys.exit(0)
except Exception as e:
    print(f'Finale Verbindung fehlgeschlagen: {str(e)}')
    sys.exit(1)
" "$REDIS_HOST" "$REDIS_PORT" "$REDIS_DB" "$REDIS_PASSWORD"
fi

echo "Message Processor wird auf Port $PROCESSOR_PORT gestartet..."
python3 processor_service.py
