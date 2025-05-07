import os
import sys
import json
import logging
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS

# Füge das Projektverzeichnis zum Python-Pfad hinzu
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Importiere die Template-Engine und den Message-Forwarder
from utils.template_engine import TemplateEngine, MessageForwarder

# Importiere die Message Queue und den Worker
from api.message_queue import init_message_queue, get_message_queue
from api.message_worker import init_worker, get_worker

# Konfiguriere Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('message-processor')

# Initialisiere Flask-App
app = Flask(__name__)
CORS(app)

# Projektverzeichnis
PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Initialisiere Template-Engine und Message-Forwarder
template_engine = TemplateEngine(os.path.join(PROJECT_DIR, 'templates'))
message_forwarder = MessageForwarder()

# Initialisiere Redis Message Queue
queue = init_message_queue(
    host=os.environ.get('REDIS_HOST', 'localhost'),
    port=int(os.environ.get('REDIS_PORT', 6379)),
    db=int(os.environ.get('REDIS_DB', 0)),
    password=os.environ.get('REDIS_PASSWORD'),
    prefix=os.environ.get('REDIS_PREFIX', 'iot_gateway')
)

# Initialisiere Worker mit 2 Threads
worker = init_worker(
    num_threads=int(os.environ.get('WORKER_THREADS', 2)),
    poll_interval=float(os.environ.get('WORKER_POLL_INTERVAL', 0.5)),
    auto_start=True
)

@app.route('/api/process', methods=['POST'])
def process_message():
    """
    Endpunkt zum Verarbeiten und Weiterleiten von Nachrichten (async über Redis Queue)
    """
    try:
        # Extrahiere Nachricht und Template-Name aus der Anfrage
        data = request.json
        message = data.get('message')
        template_name = data.get('template')
        endpoint_name = data.get('endpoint')
        
        if not message or not template_name or not endpoint_name:
            return jsonify({
                'status': 'error',
                'message': 'Nachricht, Template-Name und Endpunkt-Name sind erforderlich'
            }), 400
        
        # Füge die Nachricht in die Queue ein (asynchrone Verarbeitung)
        message_id = queue.enqueue_message(message, template_name, endpoint_name)
        
        # Erstelle Antwort mit Message-ID
        result = {
            'status': 'queued',
            'message_id': message_id,
            'message': f'Nachricht wurde in die Queue eingefügt (ID: {message_id})'
        }
        
        return jsonify(result), 202  # 202 Accepted
    
    except Exception as e:
        logger.error(f"Fehler beim Einreihen der Nachricht: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/message/<message_id>', methods=['GET'])
def get_message_status(message_id):
    """
    Endpunkt zum Abfragen des Status einer Nachricht
    """
    try:
        # Suche nach der Nachricht in allen Queues
        # TODO: Implementieren

        # Vorläufige Implementierung
        return jsonify({
            'status': 'unknown',
            'message_id': message_id,
            'message': f'Status für Nachricht {message_id} ist noch nicht implementiert'
        }), 404
    
    except Exception as e:
        logger.error(f"Fehler beim Abfragen des Nachrichten-Status: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/queue/status', methods=['GET'])
def get_queue_status():
    """
    Endpunkt zum Abfragen des Queue-Status
    """
    try:
        # Hole den Status der Queue
        queue_status = queue.get_queue_status()
        
        # Hole den Status des Workers
        worker_status = worker.get_status()
        
        # Kombiniere die Informationen
        status = {
            'queue': queue_status,
            'worker': worker_status
        }
        
        return jsonify(status), 200
    
    except Exception as e:
        logger.error(f"Fehler beim Abfragen des Queue-Status: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/queue/failed', methods=['GET'])
def get_failed_messages():
    """
    Endpunkt zum Abfragen fehlgeschlagener Nachrichten
    """
    try:
        # Hole alle fehlgeschlagenen Nachrichten
        failed_messages = queue.get_failed_messages()
        
        return jsonify(failed_messages), 200
    
    except Exception as e:
        logger.error(f"Fehler beim Abfragen fehlgeschlagener Nachrichten: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/queue/retry/<message_id>', methods=['POST'])
def retry_failed_message(message_id):
    """
    Endpunkt zum erneuten Verarbeiten einer fehlgeschlagenen Nachricht
    """
    try:
        # Versuche, die Nachricht erneut zu verarbeiten
        success = queue.retry_failed_message(message_id)
        
        if not success:
            return jsonify({
                'status': 'error',
                'message': f'Nachricht {message_id} wurde nicht in der Failed-Queue gefunden'
            }), 404
        
        return jsonify({
            'status': 'success',
            'message': f'Nachricht {message_id} wurde für eine erneute Verarbeitung eingeplant'
        }), 200
    
    except Exception as e:
        logger.error(f"Fehler beim erneuten Verarbeiten der Nachricht: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/queue/clear', methods=['POST'])
def clear_queues():
    """
    Endpunkt zum Löschen aller Queues (nur für Entwicklung/Tests)
    """
    try:
        # Löschen aller Queues
        queue.clear_all_queues()
        
        return jsonify({
            'status': 'success',
            'message': 'Alle Queues wurden gelöscht'
        }), 200
    
    except Exception as e:
        logger.error(f"Fehler beim Löschen der Queues: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """
    Endpunkt für Health-Checks
    """
    try:
        # Prüfe, ob der Worker läuft
        worker_status = worker.get_status()
        
        if not worker_status['running']:
            return jsonify({
                'status': 'warning',
                'message': 'Worker ist nicht aktiv'
            }), 200
        
        # Prüfe, ob die Redis-Verbindung funktioniert
        queue_status = queue.get_queue_status()
        
        return jsonify({
            'status': 'healthy',
            'worker': worker_status,
            'queue': queue_status
        }), 200
    
    except Exception as e:
        logger.error(f"Fehler beim Health-Check: {str(e)}")
        return jsonify({
            'status': 'unhealthy',
            'message': str(e)
        }), 500

@app.route('/api/templates', methods=['GET'])
def get_templates():
    """
    Endpunkt zum Abrufen aller verfügbaren Templates
    """
    template_names = template_engine.get_template_names()
    return jsonify(template_names), 200

@app.route('/api/endpoints', methods=['GET'])
def get_endpoints():
    """
    Endpunkt zum Abrufen aller verfügbaren Endpunkte
    """
    endpoint_names = message_forwarder.get_endpoint_names()
    return jsonify(endpoint_names), 200

@app.route('/api/reload-templates', methods=['POST'])
def reload_templates():
    """
    Endpunkt zum Neuladen aller Templates
    """
    template_engine.reload_templates()
    return jsonify({
        'status': 'success',
        'message': 'Templates wurden neu geladen'
    }), 200

@app.route('/api/test-transform', methods=['POST'])
def test_transform():
    """
    Endpunkt zum Testen der Transformation ohne Weiterleitung
    """
    try:
        # Extrahiere Nachricht und Template-Name aus der Anfrage
        data = request.json
        message = data.get('message')
        template_name = data.get('template')
        
        if not message or not template_name:
            return jsonify({
                'status': 'error',
                'message': 'Nachricht und Template-Name sind erforderlich'
            }), 400
        
        # Transformiere Nachricht
        transformed_message = template_engine.transform_message(message, template_name)
        
        if not transformed_message:
            return jsonify({
                'status': 'error',
                'message': f'Fehler bei der Transformation mit Template "{template_name}"'
            }), 500
        
        # Erstelle Antwort
        result = {
            'status': 'success',
            'original_message': message,
            'transformed_message': transformed_message,
            'template': template_name
        }
        
        return jsonify(result), 200
    
    except Exception as e:
        logger.error(f"Fehler bei der Transformation der Nachricht: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/logs', methods=['GET'])
def get_logs():
    """
    Endpunkt zum Abrufen der letzten Logs
    """
    # TODO: Implementieren eines Log-Abrufsystems
    return jsonify({
        'status': 'error',
        'message': 'Log-Abruf ist noch nicht implementiert'
    }), 501

if __name__ == '__main__':
    logger.info("Message Processor wird gestartet...")
    app.run(host='0.0.0.0', port=8081, debug=True)
