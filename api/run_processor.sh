#!/bin/bash

# Starte den Message Processor mit Redis-Konfiguration
echo "Starte Message Processor..."
cd "$(dirname "$0")"

# Standard-Konfiguration
export WORKER_THREADS=2
export WORKER_POLL_INTERVAL=0.5
export REDIS_PORT=6379
export REDIS_DB=0
export REDIS_PASSWORD="OW!p3x?"
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
    echo "Fehler: Konnte keine Verbindung zu Redis herstellen. Message Processor wird nicht gestartet."
    exit 1
fi

# Redis-Verbindung mit ausführlichem Logging testen
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

# Wenn der Redis-Test erfolgreich war, starte den Message Processor
if [ $? -eq 0 ]; then
    echo "Starte Message Processor mit Redis-Host: $REDIS_HOST"
    python3 message_processor.py
else
    echo "Message Processor wird nicht gestartet, da die Redis-Verbindung fehlgeschlagen ist."
    exit 1
fi
