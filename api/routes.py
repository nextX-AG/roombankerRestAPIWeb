"""
API-Routen für das evAlarm-IoT Gateway Management System
"""

from flask import Blueprint, request, jsonify
from bson.objectid import ObjectId
from models import Customer, Gateway, Device, initialize_db, register_device_from_message
import os
import json
import glob
import sys
from datetime import datetime
import time

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
from utils.auth_middleware import require_auth, require_role

# Import des Log-Services
import log_service

# Blueprint für alle API-Routen
api_bp = Blueprint('api', __name__)

# Logging-Konfiguration
import logging
logger = logging.getLogger('api-routes')

# MongoDB-Verbindung initialisieren
@api_bp.before_app_request
def setup_db():
    initialize_db()

# Hilfsfunktion zur Validierung der Objekt-ID
def validate_object_id(id_string):
    try:
        return ObjectId(id_string)
    except:
        return None

# Hilfsfunktion zum Laden der neuesten Nachricht eines Gateways
def get_latest_gateway_message(gateway_uuid):
    # Pfad zu gespeicherten Nachrichten
    messages_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data')
    
    # Alle JSON-Dateien im Verzeichnis
    json_files = glob.glob(os.path.join(messages_dir, '*.json'))
    
    if not json_files:
        return None
    
    # Sortiere die Dateien nach Änderungszeitstempel (neueste zuerst)
    json_files.sort(key=lambda x: os.path.getmtime(x), reverse=True)
    
    # Suche nach der neuesten Nachricht für das angegebene Gateway
    for file_path in json_files:
        try:
            with open(file_path, 'r') as f:
                message = json.load(f)
                
            # Prüfe, ob die Nachricht vom gesuchten Gateway stammt
            gateway_id_in_message = None
            
            if message.get('data') and isinstance(message['data'], dict):
                if 'gateway_id' in message['data']:
                    gateway_id_in_message = message['data']['gateway_id']
                elif 'gateway' in message['data'] and isinstance(message['data']['gateway'], dict):
                    if 'uuid' in message['data']['gateway']:
                        gateway_id_in_message = message['data']['gateway']['uuid']
                    elif 'id' in message['data']['gateway']:
                        gateway_id_in_message = message['data']['gateway']['id']
            
            if gateway_id_in_message == gateway_uuid:
                return message
                
        except Exception as e:
            logger.error(f"Fehler beim Lesen der Datei {file_path}: {str(e)}")
    
    return None

# Hilfsfunktion zum Laden aller Nachrichten eines Gateways
def get_gateway_messages(gateway_uuid, limit=10):
    # Pfad zu gespeicherten Nachrichten
    messages_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data')
    
    # Alle JSON-Dateien im Verzeichnis
    json_files = glob.glob(os.path.join(messages_dir, '*.json'))
    
    if not json_files:
        return []
    
    # Sortiere die Dateien nach Änderungszeitstempel (neueste zuerst)
    json_files.sort(key=lambda x: os.path.getmtime(x), reverse=True)
    
    # Sammle alle Nachrichten für das angegebene Gateway
    messages = []
    for file_path in json_files:
        if len(messages) >= limit:
            break
            
        try:
            with open(file_path, 'r') as f:
                message = json.load(f)
                
            # Prüfe, ob die Nachricht vom gesuchten Gateway stammt
            gateway_id_in_message = None
            
            if message.get('data') and isinstance(message['data'], dict):
                if 'gateway_id' in message['data']:
                    gateway_id_in_message = message['data']['gateway_id']
                elif 'gateway' in message['data'] and isinstance(message['data']['gateway'], dict):
                    if 'uuid' in message['data']['gateway']:
                        gateway_id_in_message = message['data']['gateway']['uuid']
                    elif 'id' in message['data']['gateway']:
                        gateway_id_in_message = message['data']['gateway']['id']
            
            if gateway_id_in_message == gateway_uuid:
                messages.append(message)
                
        except Exception as e:
            logger.error(f"Fehler beim Lesen der Datei {file_path}: {str(e)}")
    
    return messages

# ----- Kunden-Endpunkte -----

@api_bp.route(get_route('customers', 'list'), methods=['GET'])
@api_error_handler
def get_customers():
    """Gibt alle Kunden zurück"""
    customers = [customer.to_dict() for customer in Customer.find_all()]
    return success_response(customers)

@api_bp.route(get_route('customers', 'detail'), methods=['GET'])
@api_error_handler
def get_customer(id):
    """Gibt einen Kunden anhand seiner ID zurück"""
    customer = Customer.find_by_id(id)
    if not customer:
        return not_found_response("customer", id)
    return success_response(customer.to_dict())

@api_bp.route(get_route('customers', 'create'), methods=['POST'])
@api_error_handler
def create_customer():
    """Erstellt einen neuen Kunden"""
    data = request.json
    
    # Pflichtfelder überprüfen
    if not data or 'name' not in data:
        return validation_error_response({"name": "Name ist erforderlich"})
    
    customer = Customer.create(**data)
    logger.info(f"Neuer Kunde erstellt: {data.get('name')}")
    return success_response(customer.to_dict(), 201)

@api_bp.route(get_route('customers', 'update'), methods=['PUT'])
@api_error_handler
def update_customer(id):
    """Aktualisiert einen vorhandenen Kunden"""
    data = request.json
    
    customer = Customer.find_by_id(id)
    if not customer:
        return not_found_response("customer", id)
    
    customer.update(**data)
    logger.info(f"Kunde aktualisiert: ID {id}, Name {customer.name}")
    return success_response(customer.to_dict(), "Kunde erfolgreich aktualisiert")

@api_bp.route(get_route('customers', 'delete'), methods=['DELETE'])
@api_error_handler
def delete_customer(id):
    """Löscht einen Kunden"""
    customer = Customer.find_by_id(id)
    if not customer:
        return not_found_response("customer", id)
    
    customer_name = customer.name
    customer.delete()
    logger.info(f"Kunde gelöscht: ID {id}, Name {customer_name}")
    return success_response(message="Kunde erfolgreich gelöscht")

# ----- Gateway-Endpunkte -----

@api_bp.route(get_route('gateways', 'list'), methods=['GET'])
@api_error_handler
def get_gateways():
    """Gibt alle Gateways zurück, optional gefiltert nach Kunde"""
    customer_id = request.args.get('customer_id')
    
    if customer_id:
        gateways = Gateway.find_by_customer(customer_id)
    else:
        gateways = Gateway.find_all()
    
    return success_response([gateway.to_dict() for gateway in gateways])

@api_bp.route(get_route('gateways', 'unassigned'), methods=['GET'])
@api_error_handler
def get_unassigned_gateways():
    """Gibt alle Gateways ohne Kundenzuordnung zurück"""
    logger.info("Abruf nicht zugeordneter Gateways")
    gateways = Gateway.find_unassigned()
    logger.info(f"Gefunden: {len(gateways)} nicht zugeordnete Gateways")
    return success_response([gateway.to_dict() for gateway in gateways])

@api_bp.route(get_route('gateways', 'detail'), methods=['GET'])
@api_error_handler
def get_gateway(uuid):
    """Gibt ein Gateway anhand seiner UUID zurück"""
    gateway = Gateway.find_by_uuid(uuid)
    if not gateway:
        return not_found_response("gateway", uuid)
    return success_response(gateway.to_dict())

@api_bp.route(get_route('gateways', 'create'), methods=['POST'])
@api_error_handler
def create_gateway():
    """Erstellt ein neues Gateway"""
    data = request.json
    
    # Pflichtfelder überprüfen
    validation_errors = {}
    if not data:
        return validation_error_response({"request": "Keine Daten übermittelt"})
    
    if 'uuid' not in data:
        validation_errors['uuid'] = "UUID ist erforderlich"
    
    if 'customer_id' not in data:
        validation_errors['customer_id'] = "Kunden-ID ist erforderlich"
    
    if validation_errors:
        return validation_error_response(validation_errors)
    
    # Überprüfen, ob der Kunde existiert
    customer = Customer.find_by_id(data['customer_id'])
    if not customer:
        return validation_error_response({"customer_id": "Angegebener Kunde existiert nicht"})
    
    gateway = Gateway.create(**data)
    logger.info(f"Neues Gateway erstellt: UUID {data.get('uuid')}, Kunde {customer.name}")
    return success_response(gateway.to_dict(), "Gateway erfolgreich erstellt", 201)

@api_bp.route(get_route('gateways', 'update'), methods=['PUT'])
@api_error_handler
def update_gateway(uuid):
    """Aktualisiert ein vorhandenes Gateway"""
    data = request.json
    
    gateway = Gateway.find_by_uuid(uuid)
    if not gateway:
        return not_found_response("gateway", uuid)
    
    # Wenn customer_id geändert wird, prüfe, ob der Kunde existiert
    if 'customer_id' in data and data['customer_id'] != gateway.customer_id:
        customer = Customer.find_by_id(data['customer_id'])
        if not customer:
            return validation_error_response({"customer_id": "Angegebener Kunde existiert nicht"})
    
    gateway.update(**data)
    logger.info(f"Gateway aktualisiert: UUID {uuid}")
    return success_response(gateway.to_dict(), "Gateway erfolgreich aktualisiert")

@api_bp.route(get_route('gateways', 'delete'), methods=['DELETE'])
@api_error_handler
def delete_gateway(uuid):
    """Löscht ein Gateway"""
    gateway = Gateway.find_by_uuid(uuid)
    if not gateway:
        logger.warning(f"Löschversuch für nicht existierendes Gateway: UUID {uuid}")
        return not_found_response("gateway", uuid)
    
    # Speichere Informationen über das Gateway vor dem Löschen
    gateway_name = gateway.name
    customer_id = gateway.customer_id
    
    # Kaskadenlöschung in der Gateway-Klasse ruft nun auch device.delete() für jedes Gerät auf
    gateway.delete()
    
    # Protokolliere den erfolgreichen Löschvorgang
    logger.info(f"Gateway erfolgreich gelöscht: UUID {uuid}, Name: {gateway_name}, Kunde: {customer_id}")
    
    return success_response({
        "uuid": uuid,
        "name": gateway_name,
        "customer_id": str(customer_id) if customer_id else None,
        "result": "Gateway und alle zugehörigen Geräte erfolgreich gelöscht"
    })

@api_bp.route('/api/v1/gateways/<uuid>/status', methods=['PUT'])
@api_error_handler
def update_gateway_status(uuid):
    """Aktualisiert den Status eines Gateways"""
    data = request.json
    
    gateway = Gateway.find_by_uuid(uuid)
    if not gateway:
        return not_found_response("gateway", uuid)
    
    status = data.get('status', 'online')
    gateway.update_status(status)
    logger.info(f"Gateway-Status aktualisiert: UUID {uuid}, Status {status}")
    return success_response(gateway.to_dict(), f"Gateway-Status auf '{status}' aktualisiert")

@api_bp.route('/api/v1/gateways/<uuid>/latest', methods=['GET'])
@api_error_handler
def get_gateway_latest_data(uuid):
    """Liefert die neuesten Telemetriedaten eines Gateways"""
    # Gateway existiert möglicherweise bereits in der UI, aber nicht in der Datenbank
    # Daher geben wir Dummy-Daten zurück, auch wenn das Gateway nicht gefunden wird
    
    # Standardwerte für Telemetrie-Daten
    default_data = {
        "gateway": {
            "alarmstatus": "normal",
            "batterystatus": "ok",
            "powerstatus": "ok",
            "lidstatus": "closed",
            "wanstatus": "connected",
            "wifistatus": "connected",
            "cellularstatus": "connected",
            "dbm": "-75",
            "faultstatus": "none",
            "simstatus": "ready",
            "pinstatus": "ok",
            "electricity": "98"
        }
    }
    
    # Hier würden normalerweise die echten Telemetriedaten aus der Datenbank geladen
    # Für diese Implementierung verwenden wir die Standard-Werte
    
    response_data = {
        "uuid": uuid,
        "timestamp": int(time.time()),
        "received_at": datetime.now().isoformat(),
        "data": default_data
    }
    
    logger.info(f"Telemetriedaten für Gateway {uuid} abgerufen")
    return success_response(response_data)

# Neuer Endpoint für den Verlauf der Telemetriedaten eines Gateways
@api_bp.route('/api/v1/gateways/<uuid>/history', methods=['GET'])
@api_error_handler
def get_gateway_history(uuid):
    """Gibt den Verlauf der Telemetriedaten eines Gateways zurück"""
    gateway = Gateway.find_by_uuid(uuid)
    if not gateway:
        return not_found_response("gateway", uuid)
    
    # Anzahl der zurückzugebenden Nachrichten (Optional)
    limit = request.args.get('limit', default=10, type=int)
    
    # Gateway-Nachrichten abrufen
    messages = get_gateway_messages(uuid, limit)
    
    # Für die Frontend-Anzeige in ein einfacheres Format umwandeln
    history = []
    for msg in messages:
        entry = {
            "timestamp": msg.get("received_at") or datetime.fromtimestamp(msg.get("timestamp", 0)).isoformat(),
            "status": "online",  # Standard-Status für alle Nachrichten
            "event": "Nachricht empfangen"
        }
        
        # Wenn das Gateway Alarmdaten enthält, im Ereignis vermerken
        if msg.get("data") and isinstance(msg["data"], dict):
            if msg["data"].get("gateway") and isinstance(msg["data"]["gateway"], dict):
                gateway_data = msg["data"]["gateway"]
                if gateway_data.get("alarmstatus") == "alarm":
                    entry["event"] = "Alarm ausgelöst"
                    entry["status"] = "alarm"
                elif gateway_data.get("batterystatus") == "low":
                    entry["event"] = "Batteriewarnung"
                    entry["status"] = "warning"
                elif gateway_data.get("lidstatus") == "open":
                    entry["event"] = "Gehäuse geöffnet"
                    entry["status"] = "warning"
                elif gateway_data.get("powerstatus") != "connected":
                    entry["event"] = "Stromversorgung unterbrochen"
                    entry["status"] = "warning"
        
        history.append(entry)
    
    return success_response(history, f"{len(history)} Ereignisse gefunden")

# ----- Geräte-Endpunkte -----

@api_bp.route(get_route('devices', 'list'), methods=['GET'])
@api_error_handler
def get_devices():
    """Gibt alle Geräte zurück, optional gefiltert nach Gateway"""
    gateway_uuid = request.args.get('gateway_uuid')
    
    if gateway_uuid:
        devices = Device.find_by_gateway(gateway_uuid)
    else:
        devices = Device.find_all()
    
    return success_response([device.to_dict() for device in devices])

@api_bp.route(get_route('devices', 'detail'), methods=['GET'])
@api_error_handler
def get_device(id):
    """Gibt ein Gerät anhand seiner ID zurück"""
    # Da Geräte über gateway_uuid und device_id identifiziert werden,
    # müssen wir beide Parameter haben
    gateway_uuid = request.args.get('gateway_uuid')
    device_id = id
    
    if not gateway_uuid:
        return validation_error_response({"gateway_uuid": "Gateway-UUID ist erforderlich"})
    
    device = Device.find_by_gateway_and_id(gateway_uuid, device_id)
    if not device:
        return not_found_response("device", device_id)
    
    return success_response(device.to_dict())

@api_bp.route(get_route('devices', 'by_gateway'), methods=['GET'])
@api_error_handler
def get_gateway_devices(gateway_uuid):
    """Gibt alle Geräte eines Gateways zurück"""
    devices = Device.find_by_gateway(gateway_uuid)
    return success_response([device.to_dict() for device in devices])

@api_bp.route('/api/v1/devices/<gateway_uuid>/<device_id>', methods=['GET'])
@api_error_handler
def get_specific_device(gateway_uuid, device_id):
    """Gibt ein Gerät anhand von Gateway-UUID und Geräte-ID zurück"""
    device = Device.find_by_gateway_and_id(gateway_uuid, device_id)
    if not device:
        return error_response(f"Gerät mit ID {device_id} für Gateway {gateway_uuid} nicht gefunden", 404)
    return success_response(device.to_dict())

@api_bp.route('/api/v1/devices', methods=['POST'])
@api_error_handler
def create_device():
    """Erstellt ein neues Gerät"""
    data = request.json
    
    # Pflichtfelder überprüfen
    validation_errors = {}
    if not data:
        return validation_error_response({"request": "Keine Daten übermittelt"})
    
    if 'gateway_uuid' not in data:
        validation_errors['gateway_uuid'] = "Gateway-UUID ist erforderlich"
    
    if 'device_id' not in data:
        validation_errors['device_id'] = "Geräte-ID ist erforderlich"
    
    if validation_errors:
        return validation_error_response(validation_errors)
    
    # Überprüfen, ob das Gateway existiert
    gateway = Gateway.find_by_uuid(data['gateway_uuid'])
    if not gateway:
        return validation_error_response({"gateway_uuid": "Angegebenes Gateway existiert nicht"})
    
    device = Device.create(**data)
    logger.info(f"Neues Gerät erstellt: ID {data.get('device_id')} für Gateway {data.get('gateway_uuid')}")
    return success_response(device.to_dict(), "Gerät erfolgreich erstellt", 201)

@api_bp.route('/api/v1/devices/<gateway_uuid>/<device_id>', methods=['PUT'])
@api_error_handler
def update_device(gateway_uuid, device_id):
    """Aktualisiert ein vorhandenes Gerät"""
    data = request.json
    
    device = Device.find_by_gateway_and_id(gateway_uuid, device_id)
    if not device:
        return error_response(f"Gerät mit ID {device_id} für Gateway {gateway_uuid} nicht gefunden", 404)
    
    device.update(**data)
    logger.info(f"Gerät aktualisiert: ID {device_id} für Gateway {gateway_uuid}")
    return success_response(device.to_dict(), "Gerät erfolgreich aktualisiert")

@api_bp.route('/api/v1/devices/<gateway_uuid>/<device_id>/status', methods=['PUT'])
@api_error_handler
def update_device_status(gateway_uuid, device_id):
    """Aktualisiert den Status eines Geräts"""
    data = request.json
    
    device = Device.find_by_gateway_and_id(gateway_uuid, device_id)
    if not device:
        return error_response(f"Gerät mit ID {device_id} für Gateway {gateway_uuid} nicht gefunden", 404)
    
    status_data = data.get('status', {})
    device.update_status(status_data)
    logger.info(f"Gerätestatus aktualisiert: ID {device_id} für Gateway {gateway_uuid}")
    return success_response(device.to_dict(), "Gerätestatus erfolgreich aktualisiert")

@api_bp.route('/api/v1/devices/<gateway_uuid>/<device_id>', methods=['DELETE'])
@api_error_handler
def delete_device(gateway_uuid, device_id):
    """Löscht ein Gerät"""
    device = Device.find_by_gateway_and_id(gateway_uuid, device_id)
    if not device:
        return error_response(f"Gerät mit ID {device_id} für Gateway {gateway_uuid} nicht gefunden", 404)
    
    device.delete()
    logger.info(f"Gerät gelöscht: ID {device_id} für Gateway {gateway_uuid}")
    return success_response(message="Gerät erfolgreich gelöscht")

# ----- Hilfsmethode für automatische Geräteerkennung -----

@api_bp.route('/api/v1/process-message', methods=['POST'])
@api_error_handler
def process_message():
    """Verarbeitet eingehende Nachrichten und registriert/aktualisiert Geräte"""
    data = request.json
    
    validation_errors = {}
    if not data:
        return validation_error_response({"request": "Keine Daten übermittelt"})
    
    if 'gateway_uuid' not in data and 'gateway_id' not in data:
        validation_errors['gateway'] = "gateway_uuid oder gateway_id ist erforderlich"
    
    if validation_errors:
        return validation_error_response(validation_errors)
    
    gateway_uuid = data.get('gateway_uuid') or data.get('gateway_id')
    
    # Gateway aktualisieren
    gateway = Gateway.find_by_uuid(gateway_uuid)
    if gateway:
        gateway.update_status('online')
        logger.info(f"Gateway-Status aktualisiert: UUID {gateway_uuid}")
    else:
        # Wenn Gateway nicht existiert, erstellen wir ein temporäres Gateway ohne Kundenzuordnung
        Gateway.create(uuid=gateway_uuid, customer_id=None, name=f"Gateway {gateway_uuid[-8:]}")
        logger.info(f"Neues unregistriertes Gateway erstellt: UUID {gateway_uuid}")
    
    # Geräte aus subdevicelist registrieren/aktualisieren
    registered_devices = []
    
    # Verschiedene Nachrichtenformate verarbeiten
    if 'subdevicelist' in data and isinstance(data['subdevicelist'], list):
        # Format 1: Nachricht mit subdevicelist
        subdevices = data['subdevicelist']
        for device_data in subdevices:
            registered_device = register_device_from_message(gateway_uuid, device_data)
            if registered_device:
                registered_devices.append(registered_device.to_dict())
    elif 'devices' in data and isinstance(data['devices'], list):
        # Format 2: Nachricht mit devices-Liste
        for device_data in data['devices']:
            registered_device = register_device_from_message(gateway_uuid, device_data)
            if registered_device:
                registered_devices.append(registered_device.to_dict())
    else:
        # Format 3: Direkte Werte in der Nachricht (z.B. bei Nachricht mit nur einem Gerät)
        device_data = {
            "id": data.get('device_id', f"device-{gateway_uuid[-8:]}"),
            "value": {}
        }
        
        # Übertrage relevante Werte in das device_data-Objekt
        for key in ['alarmstatus', 'alarmtype', 'batterystatus', 'currenttemperature', 'currenthumidity']:
            if key in data:
                device_data['value'][key] = data[key]
        
        # Nur registrieren, wenn Werte vorhanden sind
        if device_data['value']:
            registered_device = register_device_from_message(gateway_uuid, device_data)
            if registered_device:
                registered_devices.append(registered_device.to_dict())
    
    logger.info(f"{len(registered_devices)} Geräte für Gateway {gateway_uuid} registriert/aktualisiert")
    return success_response({
        "gateway_id": gateway_uuid,
        "devices": registered_devices
    }, f"{len(registered_devices)} Geräte registriert/aktualisiert")

# ----- Nachrichten-Endpunkte -----

@api_bp.route('/api/v1/messages', methods=['GET'])
@api_error_handler
def get_api_messages():
    """Gibt alle empfangenen Nachrichten zurück"""
    # Pfad zu gespeicherten Nachrichten
    messages_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data')
    
    # Alle JSON-Dateien im Verzeichnis
    json_files = glob.glob(os.path.join(messages_dir, '*.json'))
    
    if not json_files:
        return success_response([])
    
    # Sammle alle Nachrichten
    messages = []
    for file_path in json_files:  # Alle Nachrichten laden und später sortieren
        try:
            with open(file_path, 'r') as f:
                message = json.load(f)
                
            # Füge ID und Dateiinformationen hinzu
            timestamp = os.path.getmtime(file_path)
            message_id = os.path.basename(file_path).split('.')[0]
            
            # Falls nur der Nachrichteninhalt gespeichert wurde, umhülle ihn
            if 'id' not in message and 'content' not in message:
                message = {
                    'id': message_id,
                    'content': message,
                    'received_at': datetime.fromtimestamp(timestamp).isoformat(),
                    'timestamp': timestamp
                }
            else:
                message['id'] = message.get('id', message_id)
                # Stelle sicher, dass received_at gesetzt ist für die Sortierung
                if 'received_at' not in message:
                    message['received_at'] = datetime.fromtimestamp(timestamp).isoformat()
                message['timestamp'] = message.get('timestamp', timestamp)
            
            messages.append(message)
        except Exception as e:
            logger.error(f"Fehler beim Lesen der Datei {file_path}: {str(e)}")
    
    # Sortiere nach received_at (neueste zuerst)
    messages.sort(key=lambda x: x.get('received_at', ''), reverse=True)
    
    # Begrenze auf die neuesten 100 Nachrichten nach dem Sortieren
    messages = messages[:100]
    
    return success_response(messages)

@api_bp.route('/api/v1/messages/status', methods=['GET'])
@api_error_handler
def get_message_status():
    """
    Gibt einen Überblick über den Status der Nachrichten zurück
    """
    # Pfad zu gespeicherten Nachrichten
    messages_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data')
    
    # Alle JSON-Dateien im Verzeichnis zählen
    json_files = glob.glob(os.path.join(messages_dir, '*.json'))
    
    # Die neuesten 10 Nachrichten abrufen
    latest_messages = []
    if json_files:
        # Sortiere die Dateien nach Änderungszeitstempel (neueste zuerst)
        json_files.sort(key=lambda x: os.path.getmtime(x), reverse=True)
        
        for file_path in json_files[:10]:
            try:
                with open(file_path, 'r') as f:
                    message = json.load(f)
                
                # Vereinfachte Darstellung der Nachricht
                latest_messages.append({
                    'id': message.get('id', os.path.basename(file_path).split('.')[0]),
                    'timestamp': message.get('timestamp', os.path.getmtime(file_path)),
                    'received_at': message.get('received_at', datetime.fromtimestamp(os.path.getmtime(file_path)).isoformat())
                })
            except Exception as e:
                logger.error(f"Fehler beim Lesen der Datei {file_path}: {str(e)}")
    
    return success_response({
        'total_messages': len(json_files),
        'latest_messages': latest_messages
    })

@api_bp.route('/api/v1/messages/queue/status', methods=['GET'])
@api_error_handler
def get_queue_status():
    """
    Gibt den Status der Nachrichten-Queue zurück
    """
    # In dieser einfachen Implementierung gibt es keine echte Queue
    return success_response({
        'queue_length': 0,
        'processing': False,
        'last_processed': datetime.now().isoformat()
    })

@api_bp.route('/api/v1/messages/retry/<message_id>', methods=['POST'])
@api_error_handler
def retry_message(message_id):
    """
    Versucht, eine fehlgeschlagene Nachricht erneut zu verarbeiten
    """
    # In dieser einfachen Implementierung gibt es keine fehlgeschlagenen Nachrichten
    return success_response({
        'message_id': message_id,
        'status': 'requeued'
    })

# Weiterleitung von altem zu neuem API-Endpunkt
@api_bp.route('/api/v1/messages/process', methods=['POST'])
@api_error_handler
def redirect_message_process():
    """
    Verarbeitet Nachrichten vom alten API-Endpunkt (/api/v1/messages/process)
    Verwendet den gleichen Code wie /api/v1/process-message
    """
    # Der alte Endpunkt verwendet die gleiche Funktionalität wie der neue
    logger.info("Nachricht über /api/v1/messages/process empfangen")
    
    # Direkt die process_message Funktion aufrufen statt einen HTTP-Request zu machen
    # Das vermeidet den 500-Fehler bei internen Weiterleitungen
    return process_message()

# Log-API-Endpunkte
@api_bp.route('/api/v1/logs/system', methods=['GET'])
@require_auth
def get_system_logs():
    """Hole alle System-Logs (aggregiert über alle Container)"""
    return _get_logs(log_service.LOG_TYPE_SYSTEM)

@api_bp.route('/api/v1/logs/processor', methods=['GET'])
@require_auth
def get_processor_logs():
    """Hole Logs vom Processor/Message-Worker"""
    return _get_logs(log_service.LOG_TYPE_PROCESSOR)

@api_bp.route('/api/v1/logs/gateway', methods=['GET'])
@require_auth
def get_gateway_logs():
    """Hole Logs vom Gateway-Service"""
    return _get_logs(log_service.LOG_TYPE_GATEWAY)

@api_bp.route('/api/v1/logs/api', methods=['GET'])
@require_auth
def get_api_logs():
    """Hole Logs vom API-Service"""
    return _get_logs(log_service.LOG_TYPE_API)

@api_bp.route('/api/v1/logs/auth', methods=['GET'])
@require_auth
def get_auth_logs():
    """Hole Logs vom Auth-Service"""
    return _get_logs(log_service.LOG_TYPE_AUTH)

@api_bp.route('/api/v1/logs/database', methods=['GET'])
@require_auth
def get_database_logs():
    """Hole Logs von Datenbank-Containern (MongoDB, Redis)"""
    return _get_logs(log_service.LOG_TYPE_DATABASE)

def _get_logs(log_type):
    """Hilfsfunktion für alle Log-Anfragen"""
    try:
        # Parameter aus der Anfrage extrahieren
        limit = request.args.get('limit', 100, type=int)
        level = request.args.get('level', 'info')
        from_time = request.args.get('from_time')
        to_time = request.args.get('to_time')
        search_term = request.args.get('search')
        
        # Logs vom Service anfordern
        result = log_service.get_logs(
            log_type=log_type,
            limit=limit,
            level=level,
            from_time=from_time,
            to_time=to_time,
            search_term=search_term
        )
        
        return jsonify(result)
    except Exception as e:
        logger.error(f"Fehler beim Abrufen der Logs: {e}")
        return jsonify({
            "status": "error",
            "error": f"Fehler beim Abrufen der Logs: {str(e)}",
            "logs": []
        }), 500 