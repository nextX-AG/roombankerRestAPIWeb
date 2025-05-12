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

if __name__ == '__main__':
    port = int(os.environ.get('PROCESSOR_PORT', 8082))
    debug = os.environ.get('FLASK_ENV') != 'production'
    
    logger.info(f"Message Processor startet auf Port {port}")
    app.run(host='0.0.0.0', port=port, debug=debug) 