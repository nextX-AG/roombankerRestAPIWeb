import os
import sys
import json
import logging
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from datetime import datetime

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
from utils.template_utils import select_template

# Importiere die Message Queue und den Worker
from api.message_queue import init_message_queue, get_message_queue
from api.message_worker import init_worker, get_worker, app as worker_app

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

# Registriere die Worker-Routen
app.register_blueprint(worker_app)

# Projektverzeichnis
PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Initialisiere Template-Engine und Message-Forwarder
template_engine = TemplateEngine(os.path.join(PROJECT_DIR, 'templates'))
message_forwarder = MessageForwarder()
message_forwarder.template_engine = template_engine  # Verbinde MessageForwarder mit TemplateEngine

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
    
    if 'message' not in data and not isinstance(data, dict):
        validation_errors['message'] = 'Nachricht ist erforderlich'
    
    if validation_errors:
        return validation_error_response(validation_errors)
    
    # Extrahiere die Nachricht und Gateway-ID
    message = data.get('message', data)
    gateway_id = data.get('gateway_id')
    
    # Wenn keine gateway_id direkt im Hauptobjekt gefunden wurde, versuche, sie aus der message zu extrahieren
    if not gateway_id and isinstance(message, dict):
        # Versuche verschiedene Felder
        gateway_id = message.get('gateway_id')
        
        if not gateway_id and 'gateway' in message and isinstance(message['gateway'], dict):
            # Versuche gateway.uuid
            gateway_id = message['gateway'].get('uuid')
            # Oder gateway.id
            if not gateway_id:
                gateway_id = message['gateway'].get('id')
        
        # Weitere mögliche Felder
        if not gateway_id:
            possible_fields = ['id', 'uuid', 'gatewayId']
            for field in possible_fields:
                if field in message:
                    gateway_id = message[field]
                    logger.info(f"Gateway-ID aus {field} extrahiert: {gateway_id}")
                    break
    
    # Wenn immer noch keine Gateway-ID gefunden wurde, lehne die Anfrage ab
    if not gateway_id:
        logger.warning(f"Keine Gateway-ID gefunden. Daten: {data}")
        return validation_error_response({"gateway_id": "Gateway-ID konnte nicht extrahiert werden"})
    
    logger.info(f"Verarbeite Nachricht für Gateway: {gateway_id}")
    
    # Finde den zugehörigen Kunden basierend auf der Gateway-ID
    customer_config = None
    with open(os.path.join(PROJECT_DIR, 'templates', 'customer_config.json')) as f:
        config = json.load(f)
        for customer_id, customer in config['customers'].items():
            if gateway_id in customer.get('gateways', []):
                customer_config = customer
                logger.info(f"Gateway {gateway_id} zugeordnet zu Kunde {customer.get('name', customer_id)}")
                break
    
    if not customer_config:
        logger.warning(f"Kein Kunde für Gateway {gateway_id} gefunden")
        # Speichere die Nachricht zur späteren manuellen Bearbeitung
        try:
            security_log_dir = os.path.join(PROJECT_DIR, 'data', 'unassigned_messages')
            os.makedirs(security_log_dir, exist_ok=True)
            
            filename = f"unassigned_{gateway_id}_{int(datetime.now().timestamp())}.json"
            filepath = os.path.join(security_log_dir, filename)
            
            with open(filepath, 'w') as f:
                json.dump({
                    'timestamp': datetime.now().isoformat(),
                    'gateway_id': gateway_id,
                    'message': message,
                    'headers': dict(request.headers),
                    'remote_addr': request.remote_addr
                }, f, indent=2)
            
            logger.info(f"Nachricht von nicht zugeordnetem Gateway in {filepath} gespeichert")
            
            # Registriere Gateway in der Datenbank, falls noch nicht vorhanden
            if Gateway and gateway_id:
                gateway = Gateway.find_by_uuid(gateway_id)
                if not gateway:
                    logger.info(f"Registriere neues unbekanntes Gateway: {gateway_id}")
                    try:
                        Gateway.create(uuid=gateway_id, customer_id=None, status="unassigned")
                        logger.info(f"Gateway {gateway_id} als 'unassigned' registriert")
                    except Exception as e:
                        logger.error(f"Fehler bei Gateway-Registrierung: {str(e)}")
            
            # Gerät registrieren, falls in der Nachricht enthalten
            if Device and isinstance(message, dict) and 'subdevicelist' in message:
                for device_data in message.get('subdevicelist', []):
                    try:
                        device = register_device_from_message(gateway_id, device_data)
                        if device:
                            logger.info(f"Gerät für Gateway {gateway_id} registriert: {device.device_id}")
                    except Exception as e:
                        logger.error(f"Fehler bei Geräteregistrierung: {str(e)}")
            
            # SICHERHEITSWARNUNG zurückgeben statt eines Fehlers
            return success_response({
                'status': 'unassigned',
                'gateway_id': gateway_id,
                'message': 'Gateway ist keinem Kunden zugeordnet. Nachricht wurde zur manuellen Überprüfung gespeichert.',
                'filepath': filepath
            }, status_code=202)  # 202 Accepted
            
        except Exception as e:
            logger.error(f"Fehler beim Speichern der unzugeordneten Nachricht: {str(e)}")
            return validation_error_response({"gateway_id": "Gateway ist keinem Kunden zugeordnet, und die Nachricht konnte nicht gespeichert werden."})
    
    # Template automatisch auswählen basierend auf dem Nachrichtentyp
    # Prüfen auf Panic-Alarm
    is_panic = False
    if isinstance(message, dict) and 'subdevicelist' in message:
        for device in message.get('subdevicelist', []):
            if isinstance(device, dict) and 'value' in device:
                value = device.get('value', {})
                if value.get('alarmstatus') == 'alarm' and value.get('alarmtype') == 'panic':
                    is_panic = True
                    break
    
    # Template auswählen
    if is_panic:
        template_name = 'evalarm_panic'
    else:
        template_name = 'evalarm'  # Fallback
    
    # Füge die Nachricht in die Queue ein (asynchrone Verarbeitung)
    message_id = queue.enqueue_message(
        message=message,
        template_name=template_name,
        endpoint_name='auto',  # Verwende 'auto' statt 'evalarm' für dynamische Endpunktauswahl
        customer_config=customer_config,
        gateway_id=gateway_id
    )
    
    logger.info(f"Nachricht in Queue eingefügt: ID {message_id}, Template {template_name}, Kunde {customer_config['name']}")
    
    # Erstelle Antwort mit Message-ID
    return success_response({
        'message_id': message_id,
        'status': 'queued',
        'message': f'Nachricht wurde in die Queue eingefügt (ID: {message_id})'
    })

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

@app.route(get_route('messages', 'forwarding'), methods=['GET'])
@api_error_handler
def get_forwarding_status():
    """
    Endpunkt zum Abfragen des Weiterleitungsstatus
    """
    if not worker or not worker.is_running():
        logger.warning("Worker ist nicht initialisiert oder läuft nicht")
        return error_response("Worker ist nicht verfügbar", 503)
    
    try:
        # Hole die letzten Ergebnisse
        results_json = queue.redis_client.lrange(queue.results_list, 0, 99)
        results = [json.loads(result) for result in results_json if result]
        
        # Hole fehlgeschlagene Nachrichten
        failed_messages = queue.get_failed_messages()
        
        # Hole aktuelle Verarbeitungsqueue
        processing_messages = []
        processing_queue = queue.redis_client.hgetall(queue.processing_queue)
        for job_json in processing_queue.values():
            if job_json:
                processing_messages.append(json.loads(job_json))
        
        # Hole Queue-Statistiken
        stats = queue.redis_client.hgetall(queue.stats_key) or {}
        
        # Zähle nach Status
        forwarding_status = {
            "pending": queue.redis_client.llen(queue.main_queue),
            "processing": len(processing_messages),
            "completed": int(stats.get('total_processed', 0)),
            "failed": len(failed_messages),
            "details": {
                "pending": [],
                "processing": processing_messages,
                "completed": [msg for msg in results if msg.get('status') == 'completed'],
                "failed": failed_messages
            }
        }
        
        logger.info(f"Weiterleitungsstatus abgefragt: {forwarding_status['pending']} ausstehend, {forwarding_status['processing']} in Verarbeitung, {forwarding_status['completed']} abgeschlossen, {forwarding_status['failed']} fehlgeschlagen")
        return success_response(forwarding_status)
        
    except Exception as e:
        logger.error(f"Fehler beim Abrufen des Weiterleitungsstatus: {str(e)}")
        return error_response(f"Interner Serverfehler: {str(e)}", 500)

if __name__ == '__main__':
    logger.info("Message Processor wird gestartet...")
    # Port aus der zentralen Konfiguration verwenden
    port = int(os.environ.get('PROCESSOR_PORT', 8082))
    logger.info(f"Processor Service läuft auf Port {port}")
    print(f"Processor Service läuft auf Port {port} - API Version {API_VERSION}")
    app.run(host='0.0.0.0', port=port, debug=True)
