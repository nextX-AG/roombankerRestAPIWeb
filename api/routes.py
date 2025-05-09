"""
API-Routen für das evAlarm-IoT Gateway Management System
"""

from flask import Blueprint, request, jsonify
from bson.objectid import ObjectId
from models import Customer, Gateway, Device, initialize_db, register_device_from_message
import os
import json
import glob
from datetime import datetime

# Blueprint für alle API-Routen
api_bp = Blueprint('api', __name__)

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
            print(f"Fehler beim Lesen der Datei {file_path}: {str(e)}")
    
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
            print(f"Fehler beim Lesen der Datei {file_path}: {str(e)}")
    
    return messages

# ----- Kunden-Endpunkte -----

@api_bp.route('/customers', methods=['GET'])
def get_customers():
    """Gibt alle Kunden zurück"""
    customers = [customer.to_dict() for customer in Customer.find_all()]
    return jsonify(customers)

@api_bp.route('/customers/<customer_id>', methods=['GET'])
def get_customer(customer_id):
    """Gibt einen Kunden anhand seiner ID zurück"""
    customer = Customer.find_by_id(customer_id)
    if not customer:
        return jsonify({"error": "Kunde nicht gefunden"}), 404
    return jsonify(customer.to_dict())

@api_bp.route('/customers', methods=['POST'])
def create_customer():
    """Erstellt einen neuen Kunden"""
    data = request.json
    
    # Pflichtfelder überprüfen
    if not data or 'name' not in data:
        return jsonify({"error": "Name ist erforderlich"}), 400
    
    try:
        customer = Customer.create(**data)
        return jsonify(customer.to_dict()), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@api_bp.route('/customers/<customer_id>', methods=['PUT'])
def update_customer(customer_id):
    """Aktualisiert einen vorhandenen Kunden"""
    data = request.json
    
    customer = Customer.find_by_id(customer_id)
    if not customer:
        return jsonify({"error": "Kunde nicht gefunden"}), 404
    
    try:
        customer.update(**data)
        return jsonify(customer.to_dict())
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@api_bp.route('/customers/<customer_id>', methods=['DELETE'])
def delete_customer(customer_id):
    """Löscht einen Kunden"""
    customer = Customer.find_by_id(customer_id)
    if not customer:
        return jsonify({"error": "Kunde nicht gefunden"}), 404
    
    customer.delete()
    return jsonify({"message": "Kunde erfolgreich gelöscht"})

# ----- Gateway-Endpunkte -----

@api_bp.route('/gateways', methods=['GET'])
def get_gateways():
    """Gibt alle Gateways zurück, optional gefiltert nach Kunde"""
    customer_id = request.args.get('customer_id')
    
    if customer_id:
        gateways = Gateway.find_by_customer(customer_id)
    else:
        gateways = Gateway.find_all()
    
    return jsonify([gateway.to_dict() for gateway in gateways])

@api_bp.route('/gateways/unassigned', methods=['GET'])
def get_unassigned_gateways():
    """Gibt alle Gateways ohne Kundenzuordnung zurück"""
    print("DEBUG: /gateways/unassigned endpoint called")
    try:
        gateways = Gateway.find_unassigned()
        print(f"DEBUG: Found {len(gateways)} unassigned gateways")
        return jsonify([gateway.to_dict() for gateway in gateways])
    except Exception as e:
        print(f"DEBUG: Error in /gateways/unassigned: {str(e)}")
        return jsonify({"error": str(e)}), 500

@api_bp.route('/gateways/<uuid>', methods=['GET'])
def get_gateway(uuid):
    """Gibt ein Gateway anhand seiner UUID zurück"""
    gateway = Gateway.find_by_uuid(uuid)
    if not gateway:
        return jsonify({"error": "Gateway nicht gefunden"}), 404
    return jsonify(gateway.to_dict())

@api_bp.route('/gateways', methods=['POST'])
def create_gateway():
    """Erstellt ein neues Gateway"""
    data = request.json
    
    # Pflichtfelder überprüfen
    if not data or 'uuid' not in data or 'customer_id' not in data:
        return jsonify({"error": "UUID und customer_id sind erforderlich"}), 400
    
    # Überprüfen, ob der Kunde existiert
    customer = Customer.find_by_id(data['customer_id'])
    if not customer:
        return jsonify({"error": "Angegebener Kunde existiert nicht"}), 400
    
    try:
        gateway = Gateway.create(**data)
        return jsonify(gateway.to_dict()), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@api_bp.route('/gateways/<uuid>', methods=['PUT'])
def update_gateway(uuid):
    """Aktualisiert ein vorhandenes Gateway"""
    data = request.json
    
    gateway = Gateway.find_by_uuid(uuid)
    if not gateway:
        return jsonify({"error": "Gateway nicht gefunden"}), 404
    
    try:
        gateway.update(**data)
        return jsonify(gateway.to_dict())
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@api_bp.route('/gateways/<uuid>', methods=['DELETE'])
def delete_gateway(uuid):
    """Löscht ein Gateway"""
    gateway = Gateway.find_by_uuid(uuid)
    if not gateway:
        return jsonify({"error": "Gateway nicht gefunden"}), 404
    
    gateway.delete()
    return jsonify({"message": "Gateway erfolgreich gelöscht"})

@api_bp.route('/gateways/<uuid>/status', methods=['PUT'])
def update_gateway_status(uuid):
    """Aktualisiert den Status eines Gateways"""
    data = request.json
    
    gateway = Gateway.find_by_uuid(uuid)
    if not gateway:
        return jsonify({"error": "Gateway nicht gefunden"}), 404
    
    status = data.get('status', 'online')
    gateway.update_status(status)
    return jsonify(gateway.to_dict())

# Neuer Endpoint für die neuesten Telemetriedaten eines Gateways
@api_bp.route('/gateways/<uuid>/latest', methods=['GET'])
def get_gateway_latest(uuid):
    """Gibt die neuesten Telemetriedaten eines Gateways zurück"""
    gateway = Gateway.find_by_uuid(uuid)
    if not gateway:
        return jsonify({"error": "Gateway nicht gefunden"}), 404
    
    # Neueste Nachricht für das Gateway abrufen
    message = get_latest_gateway_message(uuid)
    if not message:
        return jsonify({"error": "Keine Telemetriedaten verfügbar"}), 404
    
    return jsonify(message)

# Neuer Endpoint für den Verlauf der Telemetriedaten eines Gateways
@api_bp.route('/gateways/<uuid>/history', methods=['GET'])
def get_gateway_history(uuid):
    """Gibt den Verlauf der Telemetriedaten eines Gateways zurück"""
    gateway = Gateway.find_by_uuid(uuid)
    if not gateway:
        return jsonify({"error": "Gateway nicht gefunden"}), 404
    
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
    
    return jsonify(history)

# ----- Geräte-Endpunkte -----

@api_bp.route('/devices', methods=['GET'])
def get_devices():
    """Gibt alle Geräte zurück, optional gefiltert nach Gateway"""
    gateway_uuid = request.args.get('gateway_uuid')
    
    if gateway_uuid:
        devices = Device.find_by_gateway(gateway_uuid)
    else:
        devices = Device.find_all()
    
    return jsonify([device.to_dict() for device in devices])

@api_bp.route('/devices/<gateway_uuid>/<device_id>', methods=['GET'])
def get_device(gateway_uuid, device_id):
    """Gibt ein Gerät anhand von Gateway-UUID und Geräte-ID zurück"""
    device = Device.find_by_gateway_and_id(gateway_uuid, device_id)
    if not device:
        return jsonify({"error": "Gerät nicht gefunden"}), 404
    return jsonify(device.to_dict())

@api_bp.route('/devices', methods=['POST'])
def create_device():
    """Erstellt ein neues Gerät"""
    data = request.json
    
    # Pflichtfelder überprüfen
    if not data or 'gateway_uuid' not in data or 'device_id' not in data:
        return jsonify({"error": "gateway_uuid und device_id sind erforderlich"}), 400
    
    # Überprüfen, ob das Gateway existiert
    gateway = Gateway.find_by_uuid(data['gateway_uuid'])
    if not gateway:
        return jsonify({"error": "Angegebenes Gateway existiert nicht"}), 400
    
    try:
        device = Device.create(**data)
        return jsonify(device.to_dict()), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@api_bp.route('/devices/<gateway_uuid>/<device_id>', methods=['PUT'])
def update_device(gateway_uuid, device_id):
    """Aktualisiert ein vorhandenes Gerät"""
    data = request.json
    
    device = Device.find_by_gateway_and_id(gateway_uuid, device_id)
    if not device:
        return jsonify({"error": "Gerät nicht gefunden"}), 404
    
    try:
        device.update(**data)
        return jsonify(device.to_dict())
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@api_bp.route('/devices/<gateway_uuid>/<device_id>/status', methods=['PUT'])
def update_device_status(gateway_uuid, device_id):
    """Aktualisiert den Status eines Geräts"""
    data = request.json
    
    device = Device.find_by_gateway_and_id(gateway_uuid, device_id)
    if not device:
        return jsonify({"error": "Gerät nicht gefunden"}), 404
    
    status_data = data.get('status', {})
    device.update_status(status_data)
    return jsonify(device.to_dict())

@api_bp.route('/devices/<gateway_uuid>/<device_id>', methods=['DELETE'])
def delete_device(gateway_uuid, device_id):
    """Löscht ein Gerät"""
    device = Device.find_by_gateway_and_id(gateway_uuid, device_id)
    if not device:
        return jsonify({"error": "Gerät nicht gefunden"}), 404
    
    device.delete()
    return jsonify({"message": "Gerät erfolgreich gelöscht"})

# ----- Hilfsmethode für automatische Geräteerkennung -----

@api_bp.route('/process-message', methods=['POST'])
def process_message():
    """Verarbeitet eingehende Nachrichten und registriert/aktualisiert Geräte"""
    data = request.json
    
    if not data or ('gateway_uuid' not in data and 'gateway_id' not in data):
        return jsonify({"error": "gateway_uuid oder gateway_id ist erforderlich"}), 400
    
    gateway_uuid = data.get('gateway_uuid') or data.get('gateway_id')
    
    # Gateway aktualisieren
    gateway = Gateway.find_by_uuid(gateway_uuid)
    if gateway:
        gateway.update_status('online')
    else:
        # Wenn Gateway nicht existiert, erstellen wir ein temporäres Gateway ohne Kundenzuordnung
        # Dieses kann später über die UI einem Kunden zugeordnet werden
        Gateway.create(uuid=gateway_uuid, customer_id=None)
    
    # Geräte aus subdevicelist registrieren/aktualisieren
    subdevices = data.get('subdevicelist', [])
    registered_devices = []
    
    for device_data in subdevices:
        registered_device = register_device_from_message(gateway_uuid, device_data)
        if registered_device:
            registered_devices.append(registered_device.to_dict())
    
    return jsonify({
        "message": f"{len(registered_devices)} Geräte registriert/aktualisiert",
        "devices": registered_devices
    }) 