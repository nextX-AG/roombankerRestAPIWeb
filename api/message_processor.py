import os
import sys
import json
import logging
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS

# Füge das Projektverzeichnis zum Python-Pfad hinzu
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Importiere die zentrale API-Konfiguration
from utils.api_config import get_route, API_VERSION

# Importiere die Template-Engine und den Message-Forwarder
from utils.template_engine import TemplateEngine, MessageForwarder

# Importiere die Message Queue und den Worker
from api.message_queue import init_message_queue, get_message_queue
from api.message_worker import init_worker, get_worker

# Importiere die Datenmodelle
from api.models import initialize_db, Customer, Gateway, Device, register_device_from_message

# Konfiguriere Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('message-processor')

# Initialisiere Flask-App
app = Flask(__name__)
CORS(app)

# Einheitliches Response-Format
def success_response(data=None, message=None, status_code=200):
    if message and not data:
        data = {"message": message}
    elif message and isinstance(data, dict):
        data["message"] = message
    
    return jsonify({
        "status": "success",
        "data": data,
        "error": None
    }), status_code

def error_response(message, status_code=400):
    return jsonify({
        "status": "error",
        "data": None,
        "error": {"message": message}
    }), status_code

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

# Initialisiere MongoDB-Verbindung
initialize_db(
    connection_string=os.environ.get('MONGODB_URI', 'mongodb://localhost:27017/'),
    db_name=os.environ.get('MONGODB_DB', 'evalarm_gateway')
)

@app.route(get_route('messages', 'process'), methods=['POST'])
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
            return error_response('Nachricht, Template-Name und Endpunkt-Name sind erforderlich', 400)
        
        # Gateway-UUID extrahieren und Gateway in der Datenbank aktualisieren
        gateway_uuid = None
        if isinstance(message, dict) and 'gateway' in message and 'uuid' in message['gateway']:
            gateway_uuid = message['gateway']['uuid']
            print(f"DEBUG-MP: Found gateway UUID in message['gateway']['uuid']: {gateway_uuid}")
        else:
            # Versuche, Gateway-ID aus anderen Feldern zu extrahieren
            gateway_uuid = message.get('id') or message.get('uuid') or message.get('gateway_id') or message.get('gatewayId')
            print(f"DEBUG-MP: Extracted gateway UUID from alternative fields: {gateway_uuid}, message keys: {list(message.keys()) if isinstance(message, dict) else 'not a dict'}")
        
        if gateway_uuid:
            # Gateway in der Datenbank aktualisieren oder erstellen
            gateway = Gateway.find_by_uuid(gateway_uuid)
            print(f"DEBUG-MP: Looked up gateway {gateway_uuid} in DB, result: {'found' if gateway else 'not found'}")
            if gateway:
                gateway.update_status('online')
                print(f"DEBUG-MP: Updated existing gateway {gateway_uuid} status to 'online'")
            else:
                # Wenn Gateway nicht existiert, erstellen wir ein temporäres Gateway ohne Kundenzuordnung
                # Dieses kann später über die UI einem Kunden zugeordnet werden
                Gateway.create(uuid=gateway_uuid, customer_id=None)
                print(f"DEBUG-MP: Created new gateway {gateway_uuid} with no customer assignment")
            
            # Geräte aus subdevicelist registrieren/aktualisieren
            if isinstance(message, dict) and 'subdevicelist' in message:
                subdevices = message.get('subdevicelist', [])
                print(f"DEBUG-MP: Found {len(subdevices)} devices in subdevicelist")
                for device_data in subdevices:
                    register_device_from_message(gateway_uuid, device_data)
        else:
            print(f"DEBUG-MP: No gateway UUID found in message. Message data: {message}")
        
        # Füge die Nachricht in die Queue ein (asynchrone Verarbeitung)
        message_id = queue.enqueue_message(message, template_name, endpoint_name)
        
        # Erstelle Antwort mit Message-ID
        return success_response({
            'message_id': message_id,
            'status': 'queued'
        }, f'Nachricht wurde in die Queue eingefügt (ID: {message_id})', 202)  # 202 Accepted
    
    except Exception as e:
        logger.error(f"Fehler beim Einreihen der Nachricht: {str(e)}")
        return error_response(str(e), 500)

@app.route(get_route('messages', 'detail'), methods=['GET'])
def get_message_status(message_id):
    """
    Endpunkt zum Abfragen des Status einer Nachricht
    """
    try:
        # Suche nach der Nachricht in allen Queues
        # TODO: Implementieren

        # Vorläufige Implementierung
        return error_response(f'Status für Nachricht {message_id} ist noch nicht implementiert', 404)
    
    except Exception as e:
        logger.error(f"Fehler beim Abfragen des Nachrichten-Status: {str(e)}")
        return error_response(str(e), 500)

@app.route(get_route('messages', 'queue_status'), methods=['GET'])
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
        
        return success_response(status)
    
    except Exception as e:
        logger.error(f"Fehler beim Abfragen des Queue-Status: {str(e)}")
        return error_response(str(e), 500)

@app.route(get_route('messages', 'failed'), methods=['GET'])
def get_failed_messages():
    """
    Endpunkt zum Abfragen fehlgeschlagener Nachrichten
    """
    try:
        # Hole alle fehlgeschlagenen Nachrichten
        failed_messages = queue.get_failed_messages()
        
        return success_response(failed_messages)
    
    except Exception as e:
        logger.error(f"Fehler beim Abfragen fehlgeschlagener Nachrichten: {str(e)}")
        return error_response(str(e), 500)

@app.route(get_route('messages', 'retry'), methods=['POST'])
def retry_failed_message(message_id):
    """
    Endpunkt zum erneuten Verarbeiten einer fehlgeschlagenen Nachricht
    """
    try:
        # Versuche, die Nachricht erneut zu verarbeiten
        success = queue.retry_failed_message(message_id)
        
        if not success:
            return error_response(f'Nachricht {message_id} wurde nicht in der Failed-Queue gefunden', 404)
        
        return success_response(message=f'Nachricht {message_id} wurde für eine erneute Verarbeitung eingeplant')
    
    except Exception as e:
        logger.error(f"Fehler beim erneuten Verarbeiten der Nachricht: {str(e)}")
        return error_response(str(e), 500)

@app.route(get_route('messages', 'clear'), methods=['POST'])
def clear_queues():
    """
    Endpunkt zum Löschen aller Queues (nur für Entwicklung/Tests)
    """
    try:
        # Löschen aller Queues
        queue.clear_all_queues()
        
        return success_response(message='Alle Queues wurden gelöscht')
    
    except Exception as e:
        logger.error(f"Fehler beim Löschen der Queues: {str(e)}")
        return error_response(str(e), 500)

@app.route(get_route('system', 'health'), methods=['GET'])
def health_check():
    """
    Endpunkt für Health-Checks
    """
    try:
        # Prüfe, ob der Worker läuft
        worker_status = worker.get_status()
        
        if not worker_status['running']:
            return success_response({
                'health_status': 'warning',
                'worker': worker_status
            }, 'Worker ist nicht aktiv')
        
        # Prüfe, ob die Redis-Verbindung funktioniert
        queue_status = queue.get_queue_status()
        
        return success_response({
            'health_status': 'healthy',
            'worker': worker_status,
            'queue': queue_status
        })
    
    except Exception as e:
        logger.error(f"Fehler beim Health-Check: {str(e)}")
        return error_response(str(e), 500)

@app.route(get_route('templates', 'list'), methods=['GET'])
def get_templates():
    """
    Endpunkt zum Abrufen aller verfügbaren Templates
    """
    template_names = template_engine.get_template_names()
    return success_response(template_names)

@app.route(get_route('system', 'endpoints'), methods=['GET'])
def get_endpoints():
    """
    Endpunkt zum Abrufen aller verfügbaren Endpunkte
    """
    endpoint_names = message_forwarder.get_endpoint_names()
    return success_response(endpoint_names)

@app.route(get_route('templates', 'reload'), methods=['POST'])
def reload_templates():
    """
    Endpunkt zum Neuladen aller Templates
    """
    template_engine.reload_templates()
    return success_response(message='Templates wurden neu geladen')

@app.route(get_route('templates', 'test'), methods=['POST'])
def test_transform():
    """
    Endpunkt zum Testen der Transformation ohne Weiterleitung
    """
    try:
        # Extrahiere Nachricht und Template-Name aus der Anfrage
        data = request.json
        message = data.get('message')
        template_name = data.get('template_id')
        
        if not message or not template_name:
            return error_response('Nachricht und Template-Name sind erforderlich', 400)
        
        # Transformiere Nachricht
        transformed_message = template_engine.transform_message(message, template_name)
        
        if not transformed_message:
            return error_response(f'Fehler bei der Transformation mit Template "{template_name}"', 500)
        
        # Erstelle Antwort
        return success_response({
            'original_message': message,
            'transformed_message': transformed_message,
            'template_used': template_name
        })
    
    except Exception as e:
        logger.error(f"Fehler bei der Transformation der Nachricht: {str(e)}")
        return error_response(str(e), 500)

@app.route(get_route('system', 'logs'), methods=['GET'])
def get_logs():
    """
    Endpunkt zum Abrufen der letzten Logs
    """
    # TODO: Implementieren eines Log-Abrufsystems
    return error_response('Log-Abruf ist noch nicht implementiert', 501)

if __name__ == '__main__':
    logger.info("Message Processor wird gestartet...")
    # Port aus der zentralen Konfiguration verwenden
    port = int(os.environ.get('PROCESSOR_PORT', 8082))
    app.run(host='0.0.0.0', port=port, debug=True)
