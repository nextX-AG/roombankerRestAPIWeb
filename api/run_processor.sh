#!/bin/bash

# Starte den Message Processor mit Redis-Konfiguration
echo "Starte Message Processor..."
cd "$(dirname "$0")"

# Redis-Konfiguration
export REDIS_HOST=localhost  # Verwende localhost für lokale Entwicklung
export REDIS_PORT=6379
export REDIS_DB=0
export REDIS_PASSWORD="OW!p3x?"
export REDIS_PREFIX=iot_gateway

# Worker-Konfiguration
export WORKER_THREADS=2
export WORKER_POLL_INTERVAL=0.5

# Teste die Redis-Verbindung
echo "Teste Redis-Verbindung..."
python3 -c "
import redis
import sys
try:
    client = redis.Redis(
        host='$REDIS_HOST', 
        port=$REDIS_PORT, 
        db=$REDIS_DB, 
        password='$REDIS_PASSWORD',
        socket_timeout=5
    )
    if client.ping():
        print('Redis-Verbindung erfolgreich hergestellt!')
    else:
        print('Redis-Verbindung fehlgeschlagen!')
        sys.exit(1)
except Exception as e:
    print(f'Fehler bei der Redis-Verbindung: {str(e)}')
    sys.exit(1)
"

# Wenn der Redis-Test erfolgreich war, starte den Message Processor
if [ $? -eq 0 ]; then
    python3 message_processor.py
else
    echo "Message Processor wird nicht gestartet, da die Redis-Verbindung fehlgeschlagen ist."
    exit 1
fi
