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

@app.route('/api/process', methods=['POST'])
def process_message():
    """
    Endpunkt zum Verarbeiten und Weiterleiten von Nachrichten
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
        
        # Transformiere Nachricht
        transformed_message = template_engine.transform_message(message, template_name)
        
        if not transformed_message:
            return jsonify({
                'status': 'error',
                'message': f'Fehler bei der Transformation mit Template "{template_name}"'
            }), 500
        
        # Leite transformierte Nachricht weiter
        response = message_forwarder.forward_message(transformed_message, endpoint_name)
        
        if not response:
            return jsonify({
                'status': 'error',
                'message': f'Fehler bei der Weiterleitung an Endpunkt "{endpoint_name}"'
            }), 500
        
        # Erstelle Antwort
        result = {
            'status': 'success',
            'original_message': message,
            'transformed_message': transformed_message,
            'endpoint': endpoint_name,
            'response_status': response.status_code,
            'response_text': response.text
        }
        
        return jsonify(result), 200
    
    except Exception as e:
        logger.error(f"Fehler bei der Verarbeitung der Nachricht: {str(e)}")
        return jsonify({
            'status': 'error',
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

if __name__ == '__main__':
    logger.info("Message Processor wird gestartet...")
    app.run(host='0.0.0.0', port=8081, debug=True)
