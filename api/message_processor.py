import os
import sys
import json
import logging
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS

# Füge das Projektverzeichnis zum Python-Pfad hinzu
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Importiere die zentrale API-Konfiguration und API-Handler
from utils.api_config import get_route, API_VERSION
from utils.api_handlers import (
    success_response, error_response, 
    not_found_response, validation_error_response,
    unauthorized_response, forbidden_response,
    api_error_handler
)

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
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    filename=os.path.join(os.path.dirname(os.path.abspath(__file__)), 'processor.log'),
    filemode='a'
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

# Initialisiere MongoDB-Verbindung
initialize_db(
    connection_string=os.environ.get('MONGODB_URI', 'mongodb://localhost:27017/'),
    db_name=os.environ.get('MONGODB_DB', 'evalarm_gateway')
)

@app.route(get_route('messages', 'process'), methods=['POST'])
@api_error_handler
def process_message():
    """
    Endpunkt zum Verarbeiten und Weiterleiten von Nachrichten (async über Redis Queue)
    """
    # Extrahiere Nachricht und Template-Name aus der Anfrage
    data = request.json
    
    # Validiere erforderliche Felder
    validation_errors = {}
    if not data:
        return validation_error_response({"request": "Keine Daten übermittelt"})
    
    if 'message' not in data:
        validation_errors['message'] = 'Nachricht ist erforderlich'
    
    if 'template' not in data:
        validation_errors['template'] = 'Template-Name ist erforderlich'
    
    if 'endpoint' not in data:
        validation_errors['endpoint'] = 'Endpunkt-Name ist erforderlich'
    
    if validation_errors:
        return validation_error_response(validation_errors)
    
    message = data.get('message')
    template_name = data.get('template')
    endpoint_name = data.get('endpoint')
    
    # Gateway-UUID extrahieren und Gateway in der Datenbank aktualisieren
    gateway_uuid = None
    if isinstance(message, dict) and 'gateway' in message and 'uuid' in message['gateway']:
        gateway_uuid = message['gateway']['uuid']
        logger.info(f"Gateway UUID aus message['gateway']['uuid'] extrahiert: {gateway_uuid}")
    else:
        # Versuche, Gateway-ID aus anderen Feldern zu extrahieren
        gateway_uuid = message.get('id') or message.get('uuid') or message.get('gateway_id') or message.get('gatewayId')
        logger.info(f"Gateway UUID aus alternativen Feldern extrahiert: {gateway_uuid}")
    
    if gateway_uuid:
        # Gateway in der Datenbank aktualisieren oder erstellen
        gateway = Gateway.find_by_uuid(gateway_uuid)
        
        if gateway:
            gateway.update_status('online')
            logger.info(f"Gateway {gateway_uuid} Status auf 'online' aktualisiert")
        else:
            # Wenn Gateway nicht existiert, erstellen wir ein temporäres Gateway ohne Kundenzuordnung
            # Dieses kann später über die UI einem Kunden zugeordnet werden
            Gateway.create(uuid=gateway_uuid, customer_id=None)
            logger.info(f"Neues Gateway {gateway_uuid} ohne Kundenzuordnung erstellt")
        
        # Geräte aus subdevicelist registrieren/aktualisieren
        if isinstance(message, dict) and 'subdevicelist' in message:
            subdevices = message.get('subdevicelist', [])
            logger.info(f"{len(subdevices)} Geräte in der subdevicelist gefunden")
            for device_data in subdevices:
                register_device_from_message(gateway_uuid, device_data)
    else:
        logger.warning(f"Keine Gateway-UUID in der Nachricht gefunden")
    
    # Füge die Nachricht in die Queue ein (asynchrone Verarbeitung)
    message_id = queue.enqueue_message(message, template_name, endpoint_name)
    logger.info(f"Nachricht in Queue eingefügt: ID {message_id}, Template {template_name}, Endpoint {endpoint_name}")
    
    # Erstelle Antwort mit Message-ID
    return success_response({
        'message_id': message_id,
        'status': 'queued'
    }, f'Nachricht wurde in die Queue eingefügt (ID: {message_id})', 202)  # 202 Accepted

@app.route('/api/v1/list-messages', methods=['GET'])
@api_error_handler
def list_all_messages():
    """
    Endpunkt zum Abfragen aller Nachrichten für das Dashboard
    """
    from datetime import datetime, timedelta
    import time
    
    logger.info("Liste alle Nachrichten auf für Dashboard")
    
    # Für Demonstrationszwecke liefern wir Beispieldaten
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
    
    return success_response(messages)

@app.route(get_route('messages', 'status'), methods=['GET'])
@api_error_handler
def get_messages_status():
    """
    Endpunkt zum Abfragen des Status aller Nachrichten
    """
    from datetime import datetime, timedelta
    import time
    
    logger.info("Statusabfrage für alle Nachrichten")
    
    # Für Demonstrationszwecke liefern wir Beispieldaten
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
    
    return success_response(messages)

@app.route(get_route('messages', 'detail'), methods=['GET'])
@api_error_handler
def get_message_status(message_id):
    """
    Endpunkt zum Abfragen des Status einer Nachricht
    """
    # Suche nach der Nachricht in allen Queues für spezifische Nachrichten-IDs
    # TODO: Implementieren
    logger.info(f"Statusabfrage für Nachricht {message_id}")
    
    # Vorläufige Implementierung für andere Nachrichten-IDs
    return error_response(f'Status für Nachricht {message_id} ist noch nicht implementiert', 404)

@app.route(get_route('messages', 'queue_status'), methods=['GET'])
@api_error_handler
def get_queue_status():
    """
    Endpunkt zum Abfragen des Queue-Status
    """
    # Hole den Status der Queue
    queue_status = queue.get_queue_status()
    
    # Hole den Status des Workers
    worker_status = worker.get_status()
    
    # Kombiniere die Informationen
    status = {
        'queue': queue_status,
        'worker': worker_status
    }
    
    logger.info(f"Queue-Status abgefragt, aktuelle Länge: {queue_status.get('queue_length', 0)}")
    return success_response(status)

@app.route(get_route('messages', 'failed'), methods=['GET'])
@api_error_handler
def get_failed_messages():
    """
    Endpunkt zum Abfragen fehlgeschlagener Nachrichten
    """
    # Hole alle fehlgeschlagenen Nachrichten
    failed_messages = queue.get_failed_messages()
    
    logger.info(f"{len(failed_messages)} fehlgeschlagene Nachrichten gefunden")
    return success_response(failed_messages)

@app.route(get_route('messages', 'retry'), methods=['POST'])
@api_error_handler
def retry_failed_message(message_id):
    """
    Endpunkt zum erneuten Verarbeiten einer fehlgeschlagenen Nachricht
    """
    # Versuche, die Nachricht erneut zu verarbeiten
    success = queue.retry_failed_message(message_id)
    
    if not success:
        logger.warning(f"Nachricht {message_id} wurde nicht in der Failed-Queue gefunden")
        return error_response(f'Nachricht {message_id} wurde nicht in der Failed-Queue gefunden', 404)
    
    logger.info(f"Nachricht {message_id} für erneute Verarbeitung eingeplant")
    return success_response(message=f'Nachricht {message_id} wurde für eine erneute Verarbeitung eingeplant')

@app.route(get_route('messages', 'clear'), methods=['POST'])
@api_error_handler
def clear_queues():
    """
    Endpunkt zum Löschen aller Queues (nur für Entwicklung/Tests)
    """
    # Löschen aller Queues
    queue.clear_all_queues()
    
    logger.info("Alle Queues wurden gelöscht")
    return success_response(message='Alle Queues wurden gelöscht')

@app.route(get_route('system', 'health'), methods=['GET'])
@api_error_handler
def health_check():
    """
    Endpunkt für Health-Checks
    """
    # Prüfe, ob der Worker läuft
    worker_status = worker.get_status()
    
    if not worker_status['running']:
        logger.warning("Health-Check: Worker ist nicht aktiv")
        return success_response({
            'service': 'processor',
            'version': API_VERSION,
            'health_status': 'warning',
            'worker': worker_status
        }, 'Worker ist nicht aktiv')
    
    # Prüfe, ob die Redis-Verbindung funktioniert
    queue_status = queue.get_queue_status()
    
    logger.info("Health-Check: System ist gesund")
    return success_response({
        'service': 'processor',
        'version': API_VERSION,
        'health_status': 'healthy',
        'worker': worker_status,
        'queue': queue_status
    })

@app.route(get_route('templates', 'list'), methods=['GET'])
@api_error_handler
def get_templates():
    """
    Endpunkt zum Abrufen aller verfügbaren Templates
    """
    template_names = template_engine.get_template_names()
    logger.info(f"{len(template_names)} Templates gefunden")
    return success_response(template_names)

@app.route(get_route('system', 'endpoints'), methods=['GET'])
@api_error_handler
def get_endpoints():
    """
    Endpunkt zum Abrufen aller verfügbaren Endpunkte
    """
    endpoint_names = message_forwarder.get_endpoint_names()
    logger.info(f"{len(endpoint_names)} Endpunkte gefunden")
    return success_response(endpoint_names)

@app.route(get_route('templates', 'reload'), methods=['POST'])
@api_error_handler
def reload_templates():
    """
    Endpunkt zum Neuladen aller Templates
    """
    template_engine.reload_templates()
    template_names = template_engine.get_template_names()
    logger.info(f"Templates neu geladen, {len(template_names)} Templates verfügbar")
    return success_response({
        'templates': template_names
    }, 'Templates wurden neu geladen')

@app.route(get_route('templates', 'test'), methods=['POST'])
@api_error_handler
def test_transform():
    """
    Endpunkt zum Testen der Transformation ohne Weiterleitung
    """
    # Extrahiere Nachricht und Template-Name aus der Anfrage
    data = request.json
    
    # Validiere erforderliche Felder
    validation_errors = {}
    if not data:
        return validation_error_response({"request": "Keine Daten übermittelt"})
    
    if 'message' not in data:
        validation_errors['message'] = 'Nachricht ist erforderlich'
    
    if 'template_id' not in data:
        validation_errors['template_id'] = 'Template-ID ist erforderlich'
    
    if validation_errors:
        return validation_error_response(validation_errors)
    
    message = data.get('message')
    template_name = data.get('template_id')
    
    # Transformiere Nachricht
    transformed_message = template_engine.transform_message(message, template_name)
    
    if not transformed_message:
        logger.error(f"Fehler bei der Transformation mit Template {template_name}")
        return error_response(f'Fehler bei der Transformation mit Template "{template_name}"', 500)
    
    logger.info(f"Transformation mit Template {template_name} erfolgreich")
    
    # Erstelle Antwort
    return success_response({
        'original_message': message,
        'transformed_message': transformed_message,
        'template_used': template_name
    })

@app.route(get_route('system', 'logs'), methods=['GET'])
@api_error_handler
def get_logs():
    """
    Endpunkt zum Abrufen der letzten Logs
    """
    # TODO: Implementieren eines Log-Abrufsystems
    logger.info("Log-Abruf angefordert (noch nicht implementiert)")
    return error_response('Log-Abruf ist noch nicht implementiert', 501)

@app.route('/api/endpoints', methods=['GET'])
@api_error_handler
def list_processor_endpoints():
    """
    Listet alle verfügbaren Endpunkte dieses Services auf
    """
    endpoints = [
        {'path': get_route('messages', 'process'), 'method': 'POST', 'description': 'Nachricht verarbeiten'},
        {'path': get_route('messages', 'detail'), 'method': 'GET', 'description': 'Nachrichtenstatus abrufen'},
        {'path': get_route('messages', 'queue_status'), 'method': 'GET', 'description': 'Queue-Status abrufen'},
        {'path': get_route('messages', 'failed'), 'method': 'GET', 'description': 'Fehlgeschlagene Nachrichten abrufen'},
        {'path': get_route('messages', 'retry'), 'method': 'POST', 'description': 'Nachricht erneut verarbeiten'},
        {'path': get_route('messages', 'clear'), 'method': 'POST', 'description': 'Alle Queues löschen'},
        {'path': get_route('system', 'health'), 'method': 'GET', 'description': 'Systemstatus abrufen'},
        {'path': get_route('templates', 'list'), 'method': 'GET', 'description': 'Templates auflisten'},
        {'path': get_route('system', 'endpoints'), 'method': 'GET', 'description': 'Verfügbare Endpunkte auflisten'},
        {'path': get_route('templates', 'reload'), 'method': 'POST', 'description': 'Templates neu laden'},
        {'path': get_route('templates', 'test'), 'method': 'POST', 'description': 'Template-Transformation testen'},
        {'path': get_route('system', 'logs'), 'method': 'GET', 'description': 'System-Logs abrufen'},
        {'path': '/api/endpoints', 'method': 'GET', 'description': 'API-Endpunkte auflisten'}
    ]
    
    return success_response(endpoints)

@app.route('/api/v1/system/test-message', methods=['POST'])
@api_error_handler
def generate_test_message():
    """
    Erzeugt eine Testnachricht für Dashboard-Tests
    """
    import time
    
    logger.info("Erzeuge Testnachricht")
    
    # Einfache Testnachricht
    test_message = {
        "gateway_id": "test-gateway-01",
        "timestamp": int(time.time()),
        "status": "success",
        "type": "panic_button"
    }
    
    # Vereinfachte Antwort
    return success_response(test_message)

if __name__ == '__main__':
    logger.info("Message Processor wird gestartet...")
    # Port aus der zentralen Konfiguration verwenden
    port = int(os.environ.get('PROCESSOR_PORT', 8082))
    logger.info(f"Processor Service läuft auf Port {port}")
    print(f"Processor Service läuft auf Port {port} - API Version {API_VERSION}")
    app.run(host='0.0.0.0', port=port, debug=True)
