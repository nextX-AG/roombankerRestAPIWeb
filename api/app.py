from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import logging
import os
import time
import uuid
from datetime import datetime

# Konfiguriere Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('iot-gateway-api')

# Erstelle Flask-App
app = Flask(__name__)
CORS(app)  # Erlaube Cross-Origin Requests für Frontend-Integration

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
        except json.JSONDecodeError:
            logger.error("Ungültiges JSON empfangen")
            return jsonify({"status": "error", "message": "Invalid JSON"}), 400
        
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
