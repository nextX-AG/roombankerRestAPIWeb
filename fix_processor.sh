#!/bin/bash

echo "=== Message Processor Fix-Skript ==="
echo "Dieses Skript behebt das Problem mit dem Message Processor"

# Stoppe den bisherigen Prozess
echo "Stoppe den Message Processor PM2-Prozess..."
pm2 stop iot-processor

# Prüfe, ob alte Prozesse noch laufen
echo "Prüfe auf verbleibende Python-Prozesse..."
PYTHON_PROCS=$(ps aux | grep message_processor.py | grep -v grep)
if [[ ! -z "$PYTHON_PROCS" ]]; then
    echo "Es laufen noch Python-Prozesse für message_processor.py. Beende sie..."
    ps aux | grep message_processor.py | grep -v grep | awk '{print $2}' | xargs kill -9
fi

# Prüfe, ob der Port frei ist
echo "Prüfe Port 8081..."
PORT_CHECK=$(lsof -i :8081 | grep LISTEN)
if [[ ! -z "$PORT_CHECK" ]]; then
    echo "Port 8081 ist belegt. Prozess wird beendet..."
    lsof -i :8081 | grep LISTEN | awk '{print $2}' | xargs kill -9
fi

# Aktiviere virtuelle Umgebung
echo "Aktiviere virtuelle Umgebung..."
cd /var/www/iot-gateway
source venv/bin/activate

# Überprüfe Flask-Installation
echo "Überprüfe Flask-Installation..."
pip list | grep Flask
if [[ $? -ne 0 ]]; then
    echo "Flask ist nicht installiert. Installiere Flask..."
    pip install flask flask-cors
fi

# Teste den Message Processor direkt
echo "Starte Message Processor direkt zur Fehlersuche..."
cd /var/www/iot-gateway
export REDIS_HOST=localhost
export REDIS_PORT=6379
export REDIS_PASSWORD="OW!p3x?"
export FLASK_ENV=production
export PORT=8081

# Führe den Prozess direkt aus und protokolliere die Ausgabe
python3 -c "
import sys
import os
sys.path.append('$(pwd)')
from api.message_processor import app
print('Flask-App wurde geladen.')
print('Verfügbare Routen:')
for rule in app.url_map.iter_rules():
    print(f'{rule.endpoint}: {rule.methods} - {rule}')
print('Starte Flask-App...')
app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 8081)))
" > /tmp/processor_debug.log 2>&1 &

PROCESSOR_PID=$!
echo "Message Processor gestartet mit PID $PROCESSOR_PID"

# Prüfe, ob der Prozess tatsächlich läuft
sleep 3
if kill -0 $PROCESSOR_PID 2>/dev/null; then
    echo "Prozess läuft noch. Warte auf Startmeldung..."
    sleep 2
    grep "Running on" /tmp/processor_debug.log
else
    echo "Prozess ist bereits beendet. Überprüfe die Log-Datei:"
    cat /tmp/processor_debug.log
fi

# Prüfe, ob der Endpunkt erreichbar ist
echo "Teste den Message Processor-Endpunkt..."
curl -s -o /dev/null -w "%{http_code}" http://localhost:8081/api/templates || echo "Nicht erreichbar"

# Beende den Testprozess
if kill -0 $PROCESSOR_PID 2>/dev/null; then
    echo "Beende Testprozess..."
    kill $PROCESSOR_PID
fi

# Starte den PM2-Prozess neu
echo "Starte PM2-Prozess neu..."
pm2 restart iot-processor

echo "=== Fix-Prozess abgeschlossen ==="
echo "Überprüfe die Log-Datei für Details: /tmp/processor_debug.log"
echo "Führe 'pm2 logs iot-processor' aus, um die laufenden Logs zu sehen" 