import os
import sys
import json
import logging
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from datetime import datetime
import time
from typing import Optional, Dict, Any

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

# Importiere das Template-Lernsystem NACH der Logger-Definition
try:
    from utils.template_learning import TemplateLearningEngine
    learning_engine = TemplateLearningEngine()
    LEARNING_SYSTEM_AVAILABLE = True
    logger.info("Template-Lernsystem erfolgreich importiert")
except ImportError as e:
    logger.warning(f"Konnte Template-Lernsystem nicht importieren: {str(e)}")
    LEARNING_SYSTEM_AVAILABLE = False
    learning_engine = None

# Importiere die neue Template-Auswahl-Funktion
try:
    from utils.template_selector import select_template_for_message
    TEMPLATE_SELECTOR_AVAILABLE = True
    logger.info("Template Selector erfolgreich importiert")
except ImportError as e:
    logger.warning(f"Template Selector konnte nicht importiert werden: {str(e)}")
    TEMPLATE_SELECTOR_AVAILABLE = False
    select_template_for_message = None

# Importiere die neue Flow-Auswahl-Funktion
try:
    from utils.flow_selector import select_flow_for_message
    FLOW_SELECTOR_AVAILABLE = True
    logger.info("Flow Selector erfolgreich importiert")
except ImportError as e:
    logger.warning(f"Flow Selector konnte nicht importiert werden: {str(e)}")
    FLOW_SELECTOR_AVAILABLE = False
    select_flow_for_message = None

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

# Initialisiere Datenbank-Verbindung für Message Processor
def init_db():
    """Initialisiere die Datenbankverbindung"""
    if initialize_db:
        try:
            # Wichtig: Hier wurde der Standardname der Datenbank geändert
            initialize_db(
                connection_string=os.environ.get('MONGODB_URI', 'mongodb://mongo:27017/'),
                db_name=os.environ.get('MONGODB_DB', 'evalarm_iot')
            )
            logger.info("Datenbankverbindung für Message Processor initialisiert")
        except Exception as e:
            logger.error(f"Fehler beim Initialisieren der Datenbankverbindung: {str(e)}")

# Initialisiere die Datenbank
init_db()

def get_customer_for_gateway(gateway_id: str) -> Optional[Dict[str, Any]]:
    """
    Findet den zugehörigen Kunden basierend auf der Gateway-ID aus der Datenbank
    
    Args:
        gateway_id: Die Gateway-ID/UUID
        
    Returns:
        Kundenkonfiguration als Dict oder None, wenn kein Kunde gefunden wurde
    """
    try:
        # Gateway in der Datenbank suchen
        gateway = Gateway.find_by_uuid(gateway_id)
        
        # Wenn Gateway nicht gefunden, sofort zurück
        if not gateway:
            logger.warning(f"Gateway {gateway_id} nicht in der Datenbank gefunden")
            return None
        
        # Wenn Gateway keinem Kunden zugeordnet ist
        if not gateway.customer_id:
            logger.warning(f"Gateway {gateway_id} ist keinem Kunden zugeordnet")
            return None
        
        # Kunde in der Datenbank suchen
        customer = Customer.find_by_id(gateway.customer_id)
        if not customer:
            logger.warning(f"Kunde für Gateway {gateway_id} nicht gefunden (ID: {gateway.customer_id})")
            return None
        
        # Kundenobjekt in ein ähnliches Format wie in der customer_config.json umwandeln
        # für Kompatibilität mit bestehendem Code
        customer_config = {
            "name": customer.name,
            "api_config": {
                "url": customer.evalarm_url,
                "username": customer.evalarm_username,
                "password": customer.evalarm_password,
                "namespace": customer.evalarm_namespace,
                "headers": {
                    "Content-Type": "application/json",
                    "X-EVALARM-API-VERSION": "2.1.5"  # Standardwert, könnte später konfigurierbar sein
                }
            },
            # Wichtig: gateways-Array auch hier behalten für Kompatibilität
            "gateways": [gateway_id],
            # Weitere Kundendaten können hier hinzugefügt werden
            "status": customer.status,
            "customer_id": str(customer._id)
        }
        
        logger.info(f"Gateway {gateway_id} zugeordnet zu Kunde {customer.name}")
        return customer_config
    
    except Exception as e:
        logger.error(f"Fehler beim Abfragen des Kunden für Gateway {gateway_id}: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return None

@app.route(get_route('messages', 'process'), methods=['POST'])
@api_error_handler
def process_message():
    """
    Verarbeitet eine eingehende Nachricht für ein Gateway und leitet sie entsprechend weiter
    """
    # Extrahiere Nachricht und Gateway-ID aus der Anfrage
    data = request.json
    
    # Validiere erforderliche Felder
    validation_errors = {}
    if not data:
        return validation_error_response({"request": "Keine Daten übermittelt"})
    
    # Extrahiere die Nachricht und Gateway-ID
    if 'message' not in data and not isinstance(data, dict):
        validation_errors['message'] = 'Nachricht ist erforderlich'
    
    if validation_errors:
        return validation_error_response(validation_errors)
    
    # Extrahiere die Nachricht
    message = data.get('message', data)
    
    # Extrahiere Gateway-ID
    gateway_id = data.get('gateway_id')
    
    # Wenn keine gateway_id direkt im Hauptobjekt gefunden wurde, prüfe auf gateway_uuid
    if not gateway_id:
        gateway_id = data.get('gateway_uuid')
    # Wenn keine gateway_id oder gateway_uuid direkt im Hauptobjekt gefunden wurde, versuche, sie aus der message zu extrahieren
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
    
    # GEÄNDERT: Finde den zugehörigen Kunden basierend auf der Gateway-ID aus der Datenbank
    customer_config = get_customer_for_gateway(gateway_id)
    
    # Registriere oder aktualisiere das Gateway in der Datenbank, falls es nicht existiert
    try:
        # Prüfe, ob das Gateway bereits existiert
        gateway = Gateway.find_by_uuid(gateway_id)
        
        if not gateway:
            # Gateway existiert nicht, erstelle es als "unassigned"
            logger.info(f"Registriere neues unbekanntes Gateway: {gateway_id}")
            gateway = Gateway.create(
                uuid=gateway_id, 
                customer_id=None,  # Keinem Kunden zugeordnet
                status="unassigned",
                name=f"Gateway {gateway_id[-8:]}"
            )
            logger.info(f"Gateway {gateway_id} als 'unassigned' registriert")
        else:
            # Gateway existiert, aktualisiere den Status auf "online"
            gateway.update_status("online")
            logger.info(f"Gateway-Status für {gateway_id} auf 'online' aktualisiert")
    except Exception as e:
        logger.error(f"Fehler bei Gateway-Registrierung oder -Aktualisierung: {str(e)}")
    
    # Geräteregistrierung sollte unabhängig von der Kundenzuordnung erfolgen
    try:
        if isinstance(message, dict):
            # Format 1: Nachricht mit subdevicelist
            if 'subdevicelist' in message and isinstance(message['subdevicelist'], list):
                for device_data in message.get('subdevicelist', []):
                    try:
                        device = register_device_from_message(gateway_id, device_data)
                        if device:
                            logger.info(f"Gerät für Gateway {gateway_id} registriert: {device.device_id}")
                    except Exception as e:
                        logger.error(f"Fehler bei Geräteregistrierung: {str(e)}")
            
            # Format 2: Nachricht mit subdeviceid (ohne subdevicelist)
            elif 'subdeviceid' in message:
                try:
                    # Debug-Ausgabe für den exakten Typ und Wert von subdeviceid
                    subdevice_id_value = message['subdeviceid']
                    subdevice_id_type = type(subdevice_id_value).__name__
                    logger.info(f"DEBUG: subdeviceid als {subdevice_id_type} gefunden: {subdevice_id_value}")
                    
                    # Stelle sicher, dass die ID immer als String verarbeitet wird
                    subdevice_id_str = str(subdevice_id_value)
                    logger.info(f"DEBUG: subdeviceid in String konvertiert: '{subdevice_id_str}'")
                    
                    # Erstelle ein synthetisches device_data im Format, das register_device_from_message erwartet
                    device_data = {
                        "id": subdevice_id_str,
                        "value": {}
                    }
                    
                    # Übertrage relevante Werte in das value-Objekt
                    for key in ['alarmstatus', 'alarmtype', 'currenttemperature', 'currenthumidity', 
                              'batterystatus', 'onlinestatus', 'electricity', 'armstatus']:
                        if key in message:
                            device_data['value'][key] = message[key]
                            
                    # Code-basierte Alarmtypen
                    if 'code' in message:
                        code_value = message['code']
                        logger.info(f"DEBUG: code Wert: {code_value}, Typ: {type(code_value).__name__}")
                        
                        # Vergleich mit Integer und String
                        if code_value == 2030 or code_value == "2030":
                            device_data['value']['alarmstatus'] = 'alarm'
                            device_data['value']['alarmtype'] = 'panic'
                            logger.info(f"DEBUG: Panic-Button-Code erkannt: {code_value}")
                    
                    logger.info(f"Gerät aus subdeviceid extrahiert: {device_data}")
                    
                    device = register_device_from_message(gateway_id, device_data)
                    if device:
                        logger.info(f"Gerät aus subdeviceid für Gateway {gateway_id} registriert: {device.device_id}")
                    else:
                        logger.error(f"Geräteregistrierung fehlgeschlagen, obwohl keine Exception geworfen wurde")
                except Exception as e:
                    logger.error(f"Fehler bei der Registrierung des Geräts mit subdeviceid: {str(e)}")
                    logger.error(f"Exception Typ: {type(e).__name__}")
                    import traceback
                    logger.error(f"Stacktrace: {traceback.format_exc()}")
    except Exception as e:
        logger.error(f"Fehler bei der Geräteregistrierung: {str(e)}")
    
    # Wenn kein Kunde gefunden wurde, speichere die Nachricht und gib eine Warnung zurück
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
    flow_id = None
    template_name = None  # Für Legacy-Unterstützung
    
    if FLOW_SELECTOR_AVAILABLE:
        # Verwende die neue Flow-Auswahl
        flow_id = select_flow_for_message(gateway_id, message)
        if flow_id:
            logger.info(f"Flow durch neue Logik ausgewählt: {flow_id}")
        else:
            logger.warning(f"Kein Flow für Gateway {gateway_id} gefunden, verwende Template-Fallback")
    
    # Fallback auf Template-Auswahl wenn kein Flow gefunden wurde
    if not flow_id:
        if TEMPLATE_SELECTOR_AVAILABLE:
            # Hole das Gateway-Objekt für die Template-Auswahl
            try:
                gateway = Gateway.find_by_uuid(gateway_id)
            except:
                gateway = None
            
            template_name = select_template_for_message(gateway, message)
            logger.info(f"Template durch neue Logik ausgewählt: {template_name}")
        else:
            # Fallback auf alte Logik
            # Prüfen auf Panic-Alarm
            is_panic = False
            if isinstance(message, dict):
                # Format 1: Prüfung für subdevicelist
                if 'subdevicelist' in message:
                    for device in message.get('subdevicelist', []):
                        if isinstance(device, dict) and 'value' in device:
                            value = device.get('value', {})
                            if value.get('alarmstatus') == 'alarm' and value.get('alarmtype') == 'panic':
                                is_panic = True
                                break
                # Format 2: Direkte Code-Prüfung
                elif 'code' in message and message['code'] == 2030:
                    is_panic = True
                # Format 3: Prüfung auf subdeviceid mit alarmtype
                elif 'subdeviceid' in message and 'alarmtype' in message and message['alarmtype'] == 'panic':
                    is_panic = True
            
            # Template auswählen
            if is_panic:
                template_name = 'evalarm_panic'
            else:
                template_name = 'evalarm'  # Fallback
            logger.info(f"Template durch alte Logik ausgewählt: {template_name}")
    
    # Nachricht zum Lernsystem hinzufügen (wenn aktiv)
    if LEARNING_SYSTEM_AVAILABLE and learning_engine:
        try:
            if learning_engine.add_message(gateway_id, message):
                logger.info(f"Nachricht zum Lernsystem für Gateway {gateway_id} hinzugefügt")
        except Exception as e:
            logger.warning(f"Fehler beim Hinzufügen zum Lernsystem: {str(e)}")
    
    # Prüfe ob Nachrichtenweiterleitung aktiviert ist
    forward_message = True
    blocked_reason = None
    
    if gateway and hasattr(gateway, 'forwarding_enabled'):
        if not gateway.forwarding_enabled:
            forward_message = False
            blocked_reason = "Gateway-Weiterleitung deaktiviert"
            logger.info(f"Nachrichtenweiterleitung für Gateway {gateway_id} ist deaktiviert")
        elif hasattr(gateway, 'forwarding_mode') and gateway.forwarding_mode != 'production':
            forward_message = False
            blocked_reason = f"Gateway im {gateway.forwarding_mode}-Modus"
            logger.info(f"Gateway {gateway_id} ist im {gateway.forwarding_mode}-Modus - Nachricht wird nicht weitergeleitet")
    
    # Überprüfe globalen Test-Modus
    if os.environ.get('EVALARM_TEST_MODE', 'false').lower() == 'true':
        forward_message = False
        blocked_reason = "Globaler Test-Modus aktiv"
        logger.info("Globaler Test-Modus ist aktiv - Nachricht wird nicht weitergeleitet")
    
    if forward_message:
        # Füge die Nachricht in die Queue ein (asynchrone Verarbeitung)
        message_id = queue.enqueue_message(
            message=message,
            template_name=template_name,
            flow_id=flow_id,  # Neu: Flow-ID hinzufügen
            endpoint_name='auto',  # Verwende 'auto' statt 'evalarm' für dynamische Endpunktauswahl
            customer_config=customer_config,
            gateway_id=gateway_id
        )
        
        if flow_id:
            logger.info(f"Nachricht in Queue eingefügt: ID {message_id}, Flow {flow_id}, Kunde {customer_config['name']}")
        else:
            logger.info(f"Nachricht in Queue eingefügt: ID {message_id}, Template {template_name}, Kunde {customer_config['name']}")
        
        # Erstelle Antwort mit Message-ID
        return success_response({
            'message_id': message_id,
            'status': 'queued',
            'message': f'Nachricht wurde in die Queue eingefügt (ID: {message_id})'
        })
    else:
        # Nachricht wird blockiert
        logger.info(f"Nachricht von Gateway {gateway_id} blockiert: {blocked_reason}")
        
        # Optional: Speichere blockierte Nachricht für spätere Analyse
        try:
            blocked_log_dir = os.path.join(PROJECT_DIR, 'data', 'blocked_messages')
            os.makedirs(blocked_log_dir, exist_ok=True)
            
            filename = f"blocked_{gateway_id}_{int(datetime.now().timestamp())}.json"
            filepath = os.path.join(blocked_log_dir, filename)
            
            with open(filepath, 'w') as f:
                json.dump({
                    'timestamp': datetime.now().isoformat(),
                    'gateway_id': gateway_id,
                    'reason': blocked_reason,
                    'flow_id': flow_id,
                    'template': template_name,
                    'message': message,
                    'customer': customer_config['name'] if customer_config else None
                }, f, indent=2)
            
            logger.info(f"Blockierte Nachricht in {filepath} gespeichert")
        except Exception as e:
            logger.error(f"Fehler beim Speichern der blockierten Nachricht: {str(e)}")
        
        return success_response({
            'status': 'blocked',
            'reason': blocked_reason,
            'gateway_id': gateway_id,
            'message': f'Nachricht wurde blockiert: {blocked_reason}'
        }, status_code=202)  # 202 Accepted

@app.route('/api/v1/list-messages', methods=['GET'])
@api_error_handler
def list_all_messages():
    """
    Endpunkt zum Abfragen aller Nachrichten für das Dashboard
    """
    logger.info("Liste alle Nachrichten auf für Dashboard")
    
    messages = []
    try:
        # Hole die letzten Ergebnisse aus der Ergebnis-Liste
        results_json = queue.redis_client.lrange(queue.results_list, 0, 99)
        completed_msgs = [json.loads(result) for result in results_json if result]
        
        # Hole fehlgeschlagene Nachrichten
        failed_messages = queue.get_failed_messages()
        
        # Hole Nachrichten in Verarbeitung
        processing_messages = []
        processing_queue = queue.redis_client.hgetall(queue.processing_queue)
        for job_json in processing_queue.values():
            if job_json:
                processing_messages.append(json.loads(job_json))
        
        # Kombiniere und formatiere alle Nachrichten
        for msg in completed_msgs + failed_messages + processing_messages:
            try:
                # Erstelle einheitliches Format für die Nachrichtenübersicht
                message_entry = {
                    'id': msg.get('id', f"msg-{int(time.time() * 1000)}"),
                    'gateway_id': msg.get('gateway_id', 'unknown'),
                    'timestamp': msg.get('timestamp', int(time.time())),
                    'received_at': msg.get('created_at', datetime.now().isoformat()),
                    'status': msg.get('status', 'unknown'),
                    'type': 'message',
                    'content': msg.get('message', {})
                }
                
                # Füge zusätzliche Informationen hinzu, wenn vorhanden
                if 'template' in msg:
                    message_entry['template'] = msg['template']
                if 'endpoint' in msg:
                    message_entry['endpoint'] = msg['endpoint']
                if 'result' in msg:
                    message_entry['result'] = msg['result']
                if 'error' in msg:
                    message_entry['error'] = msg['error']
                
                messages.append(message_entry)
            except Exception as inner_e:
                logger.error(f"Fehler beim Formatieren einer Nachricht: {str(inner_e)}")
        
        # Sortiere nach Timestamp (neueste zuerst)
        messages.sort(key=lambda x: x.get('received_at', 0), reverse=True)
        
        logger.info(f"{len(messages)} Nachrichten gefunden")
    except Exception as e:
        logger.error(f"Fehler beim Abrufen der Nachrichten: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
    
    return success_response(messages)

@app.route(get_route('messages', 'status'), methods=['GET'])
@api_error_handler
def get_messages_status():
    """
    Endpunkt zum Abfragen des Status aller Nachrichten
    """
    logger.info("Statusabfrage für alle Nachrichten")
    
    # Leeres Array zurückgeben statt Beispieldaten
    messages = []
    
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

@app.route('/api/v1/messages/debug', methods=['POST'])
@api_error_handler
def debug_message():
    """
    Debugging-Endpunkt für die Nachrichtenverarbeitung
    Gibt Details zu jedem Schritt der Pipeline zurück:
    Nachricht → Extraktion → Normalisierung → Filterung → Transformation → Weiterleitung
    """
    logger.info("Starte Debug-Modus für Nachricht")
    
    # Request-Daten laden
    try:
        data = request.get_json()
        if not data:
            raise ValueError("Keine Daten im Request-Body")
    except Exception as e:
        return error_response(f"Fehler beim Parsen der Anfragedaten: {str(e)}")
    
    # Ergebnis-Dictionary initialisieren
    result = {
        "success": True,
        "gateway_id": None,
        "extraction_result": None,
        "normalized_message": None,
        "filter_result": None,
        "template_name": None,
        "transformed_message": None,
        "forwarding_result": None
    }
    
    try:
        # 1. EXTRAKTION
        logger.info("Debug: Führe Extraktion aus")
        # Hier simulieren wir die Extraktion, indem wir die Gateway-ID extrahieren
        
        # Gateway-ID aus verschiedenen möglichen Quellen extrahieren
        gateway_id = None
        
        # Direkt im Hauptobjekt
        if 'gateway_id' in data:
            gateway_id = data['gateway_id']
        elif 'gateway_uuid' in data:
            gateway_id = data['gateway_uuid']
        
        # Oder in einem 'message' oder 'data' Unterobjekt
        elif 'message' in data and isinstance(data['message'], dict):
            msg = data['message']
            if 'gateway_id' in msg:
                gateway_id = msg['gateway_id']
            elif 'gateway_uuid' in msg:
                gateway_id = msg['gateway_uuid']
        
        # Wenn keine Gateway-ID gefunden wurde, Testmodus mit fester ID
        if not gateway_id:
            gateway_id = "debug-gateway-id"
            
        # Extraktionsergebnis speichern
        result["gateway_id"] = gateway_id
        result["extraction_result"] = {
            "gateway_id": gateway_id,
            "raw_message": data,
            "timestamp": int(time.time())
        }
            
        # 2. NORMALISIERUNG
        logger.info("Debug: Führe Normalisierung aus")
        from utils.message_normalizer import MessageNormalizer
        
        normalizer = MessageNormalizer()
        normalized_message = normalizer.normalize(data)
        
        # Normalisierungsergebnis speichern
        result["normalized_message"] = normalized_message
        
        # 3. FILTERUNG
        logger.info("Debug: Führe Filterung aus")
        try:
            from utils.filter_rules import FilterRuleEngine
            from utils.normalized_template_engine import NormalizedTemplateEngine
            
            # Template-Engine initialisieren, um Zugriff auf die Filterregeln zu bekommen
            template_engine = NormalizedTemplateEngine("./templates", "./templates/filter_rules")
            
            # Passende Templates für diese Gateway-ID finden
            # Im Debugging-Modus verwenden wir evalarm_panic_v2, falls vorhanden
            template_name = "evalarm_panic_v2"
            if template_name not in template_engine.get_template_names():
                # Fallback auf ein anderes Template
                template_names = template_engine.get_template_names()
                template_name = template_names[0] if template_names else None
            
            # Filterentscheidung treffen
            should_forward = False
            matching_rules = []
            all_rules = []
            
            if template_name:
                # Hole alle Regelnamen für das Debug-Output
                all_rules = template_engine.filter_engine.get_rule_names()
                
                # Führe die Filterprüfung durch
                should_forward, matching_rules = template_engine.should_forward(
                    normalized_message, template_name
                )
            
            # Filterergebnis speichern
            result["filter_result"] = {
                "should_forward": should_forward,
                "matching_rules": matching_rules,
                "all_rules": all_rules,
                "template_name": template_name
            }
            
            # 4. TRANSFORMATION
            if should_forward and template_name:
                logger.info(f"Debug: Führe Transformation mit Template '{template_name}' aus")
                
                # Template-Engine für die Transformation verwenden
                transformed = template_engine.transform(normalized_message, template_name)
                
                # Template-Name und transformierte Nachricht speichern
                result["template_name"] = template_name
                result["transformed_message"] = transformed
                
                # 5. WEITERLEITUNG (nur simuliert)
                logger.info("Debug: Simuliere Weiterleitung")
                
                # Im Debug-Modus simulieren wir nur die Weiterleitung
                forwarding_result = {
                    "success": True,
                    "endpoint": "debug-endpoint",
                    "response_status": 200,
                    "response_data": {
                        "status": "success",
                        "message": "Simulierte Weiterleitungsantwort"
                    },
                    "simulated": True
                }
                
                result["forwarding_result"] = forwarding_result
            
        except Exception as filter_error:
            logger.error(f"Fehler bei Filterung/Transformation: {str(filter_error)}")
            # Wir geben trotz Fehler ein Ergebnis zurück, aber markieren es als fehlerhaft
            result["success"] = False
            result["error"] = str(filter_error)
    
    except Exception as e:
        logger.error(f"Fehler im Debug-Prozess: {str(e)}")
        import traceback
        logger.error(f"Stacktrace: {traceback.format_exc()}")
        
        # Wir geben trotz Fehler ein Ergebnis zurück, aber markieren es als fehlerhaft
        result["success"] = False
        result["error"] = str(e)
    
    logger.info("Debug-Prozess abgeschlossen")
    return success_response(result)

if __name__ == '__main__':
    logger.info("Message Processor wird gestartet...")
    # Port aus der zentralen Konfiguration verwenden
    port = int(os.environ.get('PROCESSOR_PORT', 8082))
    logger.info(f"Processor Service läuft auf Port {port}")
    print(f"Processor Service läuft auf Port {port} - API Version {API_VERSION}")
    app.run(host='0.0.0.0', port=port, debug=True)
