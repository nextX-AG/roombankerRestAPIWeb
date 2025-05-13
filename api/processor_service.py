import os
import sys
import logging
import json
import time
from flask import Flask, request, jsonify

# Logging konfigurieren
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('processor')

# Projektverzeichnis zum Python-Pfad hinzufügen
current_dir = os.path.dirname(os.path.abspath(__file__))
project_dir = os.path.dirname(current_dir)
sys.path.append(project_dir)

app = Flask(__name__)

# Redis Import und Initialisierung
try:
    import redis
    
    # Prüfen, ob Redis in der Entwicklungsumgebung deaktiviert wurde
    if os.environ.get('REDIS_UNAVAILABLE') == 'true' and os.environ.get('FLASK_ENV') != 'production':
        logger.warning("Redis ist nicht verfügbar. Mock-Modus aktiviert.")
        redis_client = None
        REDIS_AVAILABLE = False
    else:
        # Redis-Verbindung herstellen
        redis_host = os.environ.get('REDIS_HOST', 'localhost')
        redis_port = int(os.environ.get('REDIS_PORT', 6379))
        redis_db = int(os.environ.get('REDIS_DB', 0))
        redis_password = os.environ.get('REDIS_PASSWORD', '')
        
        redis_client = redis.Redis(
            host=redis_host,
            port=redis_port,
            db=redis_db,
            password=redis_password,
            decode_responses=True
        )
        REDIS_AVAILABLE = True
        
        # Verbindung testen
        redis_client.ping()
        logger.info(f"Redis-Verbindung hergestellt: {redis_host}:{redis_port}")
except (ImportError, redis.ConnectionError) as e:
    if os.environ.get('FLASK_ENV') == 'production':
        logger.error(f"Fehler bei Redis-Verbindung: {str(e)}")
        sys.exit(1)
    else:
        logger.warning(f"Fehler bei Redis-Verbindung: {str(e)}")
        logger.warning("Redis ist nicht verfügbar. Einige Funktionen werden nicht funktionieren.")
        redis_client = None
        REDIS_AVAILABLE = False

# Endpunkte für Message Processor

@app.route('/api/v1/messages/process', methods=['POST'])
def process_message():
    """
    Verarbeitet eine eingehende Nachricht und leitet sie weiter.
    """
    if not REDIS_AVAILABLE:
        return jsonify({
            'status': 'error',
            'error': {
                'message': 'Redis ist nicht verfügbar. Nachrichten können nicht verarbeitet werden.',
                'code': 'redis_unavailable'
            }
        }), 503
    
    data = request.json
    
    if not data:
        return jsonify({
            'status': 'error',
            'error': {
                'message': 'Keine JSON-Daten empfangen',
                'code': 'invalid_input'
            }
        }), 400
    
    # Hier würde die eigentliche Verarbeitung stattfinden
    
    # Nachricht in Redis Queue speichern
    message_id = int(time.time() * 1000)  # Einfache ID basierend auf Timestamp
    redis_client.set(f"message:{message_id}", json.dumps(data))
    redis_client.lpush("message_queue", message_id)
    
    logger.info(f"Nachricht {message_id} in Queue gespeichert")
    
    return jsonify({
        'status': 'success',
        'data': {
            'message_id': message_id,
            'status': 'queued'
        }
    })

@app.route('/api/v1/messages/queue_status', methods=['GET'])
def queue_status():
    """
    Gibt den Status der Nachrichtenqueue zurück.
    """
    if not REDIS_AVAILABLE:
        return jsonify({
            'status': 'error',
            'error': {
                'message': 'Redis ist nicht verfügbar. Queue-Status kann nicht abgerufen werden.',
                'code': 'redis_unavailable'
            }
        }), 503
    
    queue_length = redis_client.llen("message_queue")
    processing_count = redis_client.get("processing_count")
    processing_count = int(processing_count) if processing_count else 0
    
    failed_queue_length = redis_client.llen("failed_queue")
    
    return jsonify({
        'status': 'success',
        'data': {
            'queue_length': queue_length,
            'processing': processing_count,
            'failed': failed_queue_length
        }
    })

@app.route('/api/v1/health', methods=['GET'])
def health_check():
    """
    Gibt den Gesundheitsstatus des Services zurück.
    """
    health_data = {
        'service': 'processor',
        'status': 'ok',
        'redis': 'connected' if REDIS_AVAILABLE else 'disconnected',
        'timestamp': int(time.time())
    }
    
    if not REDIS_AVAILABLE and os.environ.get('FLASK_ENV') == 'production':
        health_data['status'] = 'degraded'
    
    return jsonify({
        'status': 'success',
        'data': health_data
    })

@app.route('/api/v1/system/health', methods=['GET'])
def system_health():
    """
    Systemweiter Gesundheitsstatus für das Dashboard
    """
    # System-Informationen sammeln
    import psutil
    import socket
    from datetime import datetime
    
    # Uptime berechnen
    system_start_time = time.time() - 3600  # Vereinfachung: Annahme 1 Stunde Betriebszeit
    uptime_seconds = time.time() - system_start_time
    
    # System-Informationen
    system_info = {
        "cpu_percent": psutil.cpu_percent(),
        "memory_percent": psutil.virtual_memory().percent,
        "hostname": socket.gethostname()
    }
    
    # Detaillierte Health-Informationen
    health_data = {
        "service": "processor",
        "status": "online",
        "uptime_seconds": uptime_seconds,
        "uptime_formatted": f"{int(uptime_seconds // 86400)}d {int((uptime_seconds % 86400) // 3600)}h {int((uptime_seconds % 3600) // 60)}m",
        "system": system_info,
        "connections": {
            "redis": "connected" if REDIS_AVAILABLE else "disconnected"
        },
        "timestamp": datetime.now().isoformat()
    }
    
    return jsonify({
        'status': 'success',
        'data': health_data
    })

@app.route('/api/v1/system/endpoints', methods=['GET'])
def list_endpoints():
    """
    Listet alle verfügbaren Endpunkte des Processor-Service auf
    """
    endpoints = [
        {'path': '/api/v1/messages/process', 'method': 'POST', 'description': 'Verarbeitet eine eingehende Nachricht'},
        {'path': '/api/v1/messages/queue_status', 'method': 'GET', 'description': 'Status der Nachrichtenqueue'},
        {'path': '/api/v1/health', 'method': 'GET', 'description': 'Processor Health-Status'},
        {'path': '/api/v1/system/health', 'method': 'GET', 'description': 'Systemweiter Gesundheitsstatus'},
        {'path': '/api/v1/system/endpoints', 'method': 'GET', 'description': 'Listet alle Endpunkte auf'},
        {'path': '/api/v1/templates', 'method': 'GET', 'description': 'Listet alle verfügbaren Templates'},
        {'path': '/api/v1/messages/retry/<message_id>', 'method': 'POST', 'description': 'Nachricht erneut verarbeiten'},
        {'path': '/api/v1/messages/status', 'method': 'GET', 'description': 'Status aller Nachrichten'}
    ]
    
    return jsonify({
        'status': 'success',
        'data': endpoints
    })

@app.route('/api/v1/templates', methods=['GET'])
def list_templates():
    """
    Listet alle verfügbaren Templates auf
    """
    # In einer echten Implementierung würden Templates aus einer Datenbank oder dem Dateisystem geladen
    # Für die Demonstrationszwecke liefern wir Beispiel-Templates
    templates = [
        "default_template",
        "evalarm_template",
        "room_sensor_template",
        "panic_button_template"
    ]
    
    return jsonify({
        'status': 'success',
        'data': templates
    })

@app.route('/api/v1/messages/status', methods=['GET'])
def get_message_status():
    """
    Gibt den Status aller verarbeiteten Nachrichten zurück
    """
    # In einer echten Implementierung würden wir Nachrichten aus Redis oder MongoDB abrufen
    # Für Demonstrationszwecke liefern wir Beispieldaten
    from datetime import datetime, timedelta
    
    now = datetime.now()
    
    messages = [
        {
            "id": "msg-1234567890",
            "status": "processed",
            "received_at": (now - timedelta(minutes=5)).isoformat(),
            "processed_at": (now - timedelta(minutes=4, seconds=50)).isoformat(),
            "data": {
                "gateway_id": "gw-abcdef123456",
                "ts": int(time.time()) - 300,
                "subdevicelist": [
                    {
                        "id": 12345678,
                        "value": {
                            "alarmstatus": "normal",
                            "batterystatus": "ok"
                        }
                    }
                ]
            }
        },
        {
            "id": "msg-0987654321",
            "status": "processed",
            "received_at": (now - timedelta(minutes=2)).isoformat(),
            "processed_at": (now - timedelta(minutes=1, seconds=55)).isoformat(),
            "data": {
                "gateway_id": "gw-abcdef123456",
                "ts": int(time.time()) - 120,
                "subdevicelist": [
                    {
                        "id": 87654321,
                        "value": {
                            "alarmstatus": "alarm",
                            "alarmtype": "panic"
                        }
                    }
                ]
            }
        }
    ]
    
    return jsonify({
        'status': 'success',
        'data': messages
    })

@app.route('/api/v1/system/test-message', methods=['POST'])
def create_test_message():
    """
    Erstellt eine Test-Panic-Button-Nachricht und stellt sie in die Queue
    """
    import uuid
    from datetime import datetime
    
    # Erstelle eine Test-Nachricht (Panic-Button)
    current_time = int(time.time())
    test_message = {
        "gateway_id": "gw-test-" + str(uuid.uuid4())[:8],
        "ts": current_time,
        "subdevicelist": [
            {
                "id": int(time.time() * 1000) % 1000000000000000,
                "value": {
                    "alarmstatus": "alarm",
                    "alarmtype": "panic",
                    "is_test": True,
                    "created_at": datetime.now().isoformat()
                }
            }
        ]
    }
    
    message_id = str(uuid.uuid4())
    
    # In einer realen Implementierung würden wir die Nachricht in Redis speichern
    # und zur Verarbeitung in die Queue stellen
    if REDIS_AVAILABLE:
        try:
            # Nachricht in Redis speichern
            redis_client.set(f"message:{message_id}", json.dumps(test_message))
            # Nachricht in die Queue stellen
            redis_client.lpush("message_queue", message_id)
            logger.info(f"Test-Nachricht {message_id} in Queue gestellt")
        except Exception as e:
            logger.error(f"Fehler beim Speichern der Test-Nachricht: {str(e)}")
            return jsonify({
                'status': 'error',
                'error': {
                    'message': f"Fehler beim Speichern der Test-Nachricht: {str(e)}",
                    'code': 'redis_error'
                }
            }), 500
    
    # Speichere die Nachricht auch in der In-Memory-Liste für /api/v1/messages/status
    test_message_with_metadata = {
        "id": message_id,
        "status": "queued" if REDIS_AVAILABLE else "processed",
        "received_at": datetime.now().isoformat(),
        "is_test": True,
        "data": test_message
    }
    
    # Hier würden wir die Nachricht in der Datenbank oder einem globalen In-Memory-Store speichern
    
    return jsonify({
        'status': 'success',
        'data': {
            'message_id': message_id,
            'message': test_message_with_metadata
        },
        'message': 'Test-Nachricht erfolgreich erstellt'
    })

if __name__ == '__main__':
    port = int(os.environ.get('PROCESSOR_PORT', 8082))
    debug = os.environ.get('FLASK_ENV') != 'production'
    
    logger.info(f"Message Processor startet auf Port {port}")
    app.run(host='0.0.0.0', port=port, debug=debug) 