from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import logging
import os
import time
import uuid
from datetime import datetime
from routes import api_bp  # Direkter Import für lokale Ausführung

# Konfiguriere Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('iot-gateway-api')

# Flexibler Import für Gateway-Modell
try:
    # Versuche zuerst den lokalen Import
    from models import Gateway
    logger.info("Gateway-Modell über lokalen Import geladen")
except ImportError:
    try:
        # Versuche dann den absoluten Import
        from api.models import Gateway
        logger.info("Gateway-Modell über absoluten Import geladen")
    except ImportError:
        # Fallback in case of deployment differences
        import sys
        logger.error(f"Konnte Gateway-Modell nicht importieren. Python-Pfad: {sys.path}")
        Gateway = None

# Erstelle Flask-App
app = Flask(__name__)
CORS(app)  # Erlaube Cross-Origin Requests für Frontend-Integration

# Registriere den API Blueprint
app.register_blueprint(api_bp, url_prefix='/api')

# Speicherort für empfangene Nachrichten
MESSAGES_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data')
os.makedirs(MESSAGES_DIR, exist_ok=True)

# In-Memory-Speicher für die letzten Nachrichten (für das Dashboard)
last_messages = []
MAX_STORED_MESSAGES = 50

@app.route('/api/test', methods=['POST'])
def receive_message():
    """
    Endpunkt zum Empfangen von MQTT-Nachrichten vom Gateway
    """
    logger.info("Neue Nachricht empfangen")
    
    try:
        # Extrahiere Header und Body
        headers = dict(request.headers)
        body = request.data.decode('utf-8')
        
        # Parse JSON-Body
        try:
            data = json.loads(body)
            logger.info(f"Empfangene Nachricht: {json.dumps(data, indent=2)[:200]}...")  # Zeige die ersten 200 Zeichen
        except json.JSONDecodeError:
            logger.error("Ungültiges JSON empfangen")
            return jsonify({"status": "error", "message": "Invalid JSON"}), 400
        
        # Gateway-ID extrahieren und in Datenbank speichern
        gateway_uuid = None
        logger.info(f"Suche nach Gateway-ID in Nachricht mit Keys: {list(data.keys() if isinstance(data, dict) else [])}")
        
        if isinstance(data, dict):
            # Direkte Felder prüfen
            if 'gateway_id' in data:
                gateway_uuid = data['gateway_id']
                logger.info(f"Gateway UUID aus gateway_id extrahiert: {gateway_uuid}")
            elif 'gateway' in data and isinstance(data['gateway'], dict):
                if 'uuid' in data['gateway']:
                    gateway_uuid = data['gateway']['uuid']
                    logger.info(f"Gateway UUID aus gateway.uuid extrahiert: {gateway_uuid}")
                elif 'id' in data['gateway']:
                    gateway_uuid = data['gateway']['id']
                    logger.info(f"Gateway UUID aus gateway.id extrahiert: {gateway_uuid}")
            
            # Bei Code 2030 könnte die Gateway-ID in der data.gateway_id sein
            if not gateway_uuid and 'data' in data and isinstance(data['data'], dict):
                if 'gateway_id' in data['data']:
                    gateway_uuid = data['data']['gateway_id']
                    logger.info(f"Gateway UUID aus data.gateway_id extrahiert: {gateway_uuid}")
            
            # Weitere Versuche, Gateway-ID zu finden
            if not gateway_uuid:
                possible_fields = ['id', 'uuid', 'gatewayId']
                for field in possible_fields:
                    if field in data:
                        gateway_uuid = data[field]
                        logger.info(f"Gateway UUID aus {field} extrahiert: {gateway_uuid}")
                        break
        
        # Gateway in der Datenbank registrieren, wenn eine ID gefunden wurde
        if gateway_uuid and Gateway is not None:
            try:
                current_time = datetime.now()
                # Entferne mögliche Whitespaces oder Newlines
                gateway_uuid = gateway_uuid.strip() if isinstance(gateway_uuid, str) else gateway_uuid
                logger.info(f"Suche Gateway mit UUID: '{gateway_uuid}'")
                
                gateway = Gateway.find_by_uuid(gateway_uuid)
                if gateway:
                    logger.info(f"Gateway {gateway_uuid} gefunden, aktualisiere Status")
                    # Aktualisiere den Status UND den last_contact-Zeitstempel
                    gateway.update(status='online', last_contact=current_time)
                    logger.info(f"Gateway {gateway_uuid} Status auf 'online' aktualisiert, last_contact={current_time}")
                else:
                    logger.info(f"Gateway {gateway_uuid} nicht gefunden, erstelle neuen Eintrag")
                    Gateway.create(uuid=gateway_uuid, customer_id=None, status='online', last_contact=current_time)
                    logger.info(f"Neues Gateway {gateway_uuid} ohne Kundenzuordnung erstellt, last_contact={current_time}")
            except Exception as e:
                logger.error(f"Fehler beim Verarbeiten des Gateways {gateway_uuid}: {str(e)}")
                logger.error(f"Exception Typ: {type(e).__name__}")
                import traceback
                logger.error(f"Stacktrace: {traceback.format_exc()}")
        else:
            logger.warning(f"Keine Gateway-ID in der Nachricht gefunden oder Gateway-Modell nicht verfügbar. Daten: {data}")
        
        # Erstelle Nachrichtenobjekt mit Metadaten
        message = {
            "id": str(uuid.uuid4()),
            "timestamp": int(time.time()),
            "received_at": datetime.now().isoformat(),
            "headers": headers,
            "data": data
        }
        
        # Speichere Nachricht in Datei
        filename = f"{message['timestamp']}_{message['id']}.json"
        filepath = os.path.join(MESSAGES_DIR, filename)
        
        with open(filepath, 'w') as f:
            json.dump(message, f, indent=2)
        
        # Füge Nachricht zum In-Memory-Speicher hinzu
        last_messages.append(message)
        if len(last_messages) > MAX_STORED_MESSAGES:
            last_messages.pop(0)  # Entferne älteste Nachricht
        
        logger.info(f"Nachricht gespeichert: {filepath}")
        
        # Hier würde später die Weiterleitung an die Template-Engine erfolgen
        
        return jsonify({"status": "success", "message_id": message['id']}), 200
    
    except Exception as e:
        logger.error(f"Fehler beim Verarbeiten der Nachricht: {str(e)}")
        import traceback
        logger.error(f"Stacktrace: {traceback.format_exc()}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/messages', methods=['GET'])
def get_messages():
    """
    Endpunkt zum Abrufen der letzten empfangenen Nachrichten
    """
    return jsonify(last_messages), 200

@app.route('/api/health', methods=['GET'])
def health_check():
    """
    Einfacher Health-Check-Endpunkt
    """
    return jsonify({"status": "ok", "timestamp": int(time.time())}), 200

@app.route('/api/test-message', methods=['POST'])
def create_test_message():
    """
    Endpunkt zum Erstellen einer Testnachricht (für Entwicklung und Präsentation)
    """
    try:
        # Beispiel für eine Panic-Button-Nachricht
        test_data = {
            "ts": int(time.time()),
            "subdevicelist": [
                {
                    "id": 665531142918213,
                    "values": {
                        "alarmstatus": "alarm",
                        "alarmtype": "panic"
                    }
                }
            ]
        }
        
        # Erstelle Nachrichtenobjekt mit Metadaten
        message = {
            "id": str(uuid.uuid4()),
            "timestamp": int(time.time()),
            "received_at": datetime.now().isoformat(),
            "headers": {"Content-Type": "application/json", "User-Agent": "Test-Client"},
            "data": test_data,
            "is_test": True
        }
        
        # Speichere Nachricht in Datei
        filename = f"{message['timestamp']}_{message['id']}.json"
        filepath = os.path.join(MESSAGES_DIR, filename)
        
        with open(filepath, 'w') as f:
            json.dump(message, f, indent=2)
        
        # Füge Nachricht zum In-Memory-Speicher hinzu
        last_messages.append(message)
        if len(last_messages) > MAX_STORED_MESSAGES:
            last_messages.pop(0)  # Entferne älteste Nachricht
        
        logger.info(f"Testnachricht erstellt: {filepath}")
        
        return jsonify({"status": "success", "message_id": message['id'], "data": test_data}), 200
    
    except Exception as e:
        logger.error(f"Fehler beim Erstellen der Testnachricht: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    logger.info("IoT Gateway API Server wird gestartet...")
    app.run(host='0.0.0.0', port=8080, debug=True)
