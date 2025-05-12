"""
API Gateway für das evAlarm-IoT Gateway System.

Dieses Modul implementiert ein API-Gateway, das als zentraler Einstiegspunkt
für alle API-Anfragen dient und diese an die entsprechenden Services weiterleitet.
"""

from flask import Flask, request, Response
from flask_cors import CORS
import requests
import logging
import os
import sys
import json
from urllib.parse import urlparse

# Korrigiere den Python-Pfad für das Importieren der Utils
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.insert(0, parent_dir)

# Jetzt können wir utils importieren
from utils.api_config import ENDPOINTS, API_BASE, PORTS, HOSTS
from utils.api_handlers import error_response, server_error_response

# Logger konfigurieren
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(os.path.join(current_dir, 'gateway.log'))
    ]
)
logger = logging.getLogger('api-gateway')

app = Flask(__name__)

# CORS für alle Routen aktivieren
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Environment-Konfiguration
ENV = os.environ.get('FLASK_ENV', 'development')
SERVICE_HOSTS = HOSTS[ENV]

# API Gateway Port
GATEWAY_PORT = int(os.environ.get('GATEWAY_PORT', 8000))

# Spezieller Handler für Login-Anfragen ohne Version
@app.route('/api/login', methods=['POST'])
def legacy_login_handler():
    """
    Handler für Anfragen an /api/login ohne Versionsangabe.
    Leitet diese an den Auth-Service mit korrektem Pfad weiter.
    """
    logger.info(f"Eingehende Login-Anfrage ohne Version: POST /api/login")
    
    # Baue die korrekte Ziel-URL für den Auth-Service
    target_url = f"{SERVICE_HOSTS['auth']}{API_BASE}/auth/login"
    logger.info(f"Leite Login-Anfrage weiter an: {target_url}")

    try:
        # Bereite die Request-Parameter vor
        headers = {key: value for key, value in request.headers.items() 
                  if key.lower() not in ['host', 'content-length']}
        
        data = request.get_data()
        
        # Leite die Anfrage an den Auth-Service weiter
        response = requests.post(
            url=target_url,
            headers=headers,
            data=data,
            cookies=request.cookies,
            timeout=30  # Timeout in Sekunden
        )

        # Erstelle und gib die Antwort zurück
        return create_response_from_target(response)

    except requests.RequestException as e:
        logger.error(f"Fehler bei der Weiterleitung an {target_url}: {str(e)}")
        return server_error_response(e)

@app.route(f'{API_BASE}/<path:path>', methods=['GET', 'POST', 'PUT', 'DELETE', 'PATCH'])
def gateway_handler(path):
    """
    Haupthandler für alle API-Anfragen.
    Leitet Anfragen an den entsprechenden Service basierend auf dem Pfad weiter.
    """
    full_path = f"{API_BASE}/{path}"
    method = request.method
    logger.info(f"Eingehende Anfrage: {method} {full_path}")

    # Bestimme den Zielservice anhand des Pfads
    target_service = determine_target_service(full_path)
    
    if target_service is None:
        logger.warning(f"Kein passender Service für Pfad: {full_path}")
        return error_response(
            message=f"Ungültiger API-Pfad: {full_path}",
            status_code=404,
            error_code='invalid_endpoint'
        )

    # Baue die Ziel-URL für den Service
    target_url = f"{SERVICE_HOSTS[target_service]}{full_path}"
    logger.info(f"Leite weiter an: {target_url}")

    try:
        # Bereite die Request-Parameter vor
        headers = {key: value for key, value in request.headers.items() 
                  if key.lower() not in ['host', 'content-length']}
        
        data = request.get_data()
        params = request.args

        # Leite die Anfrage an den Zielservice weiter
        response = requests.request(
            method=method,
            url=target_url,
            headers=headers,
            params=params,
            data=data,
            cookies=request.cookies,
            allow_redirects=False,
            timeout=30  # Timeout in Sekunden
        )

        # Erstelle und gib die Antwort zurück
        return create_response_from_target(response)

    except requests.RequestException as e:
        logger.error(f"Fehler bei der Weiterleitung an {target_url}: {str(e)}")
        return server_error_response(e)

def determine_target_service(path):
    """
    Bestimmt den Zielservice basierend auf dem API-Pfad.
    
    Args:
        path: Der API-Pfad
        
    Returns:
        Service-Name oder None, wenn kein passender Service gefunden wurde
    """
    # Extrahiere den ersten Teil des Pfads nach /api/v1/
    path_parts = path.split('/')
    if len(path_parts) < 3:  # /api/v1/category mindestens erforderlich
        return None
    
    category = path_parts[2]  # kategorie nach /api/v1/
    
    # Service-Mapping basierend auf der Pfadkategorie
    service_mapping = {
        'auth': 'auth',
        'gateways': 'api',
        'customers': 'api',
        'devices': 'api',
        'messages': 'worker',
        'templates': 'worker',
        'health': 'worker',
        'iot-status': 'worker',
        'endpoints': 'worker'
    }
    
    return service_mapping.get(category, 'api')  # Default: api-Service

def create_response_from_target(target_response):
    """
    Erstellt eine Flask-Response basierend auf der Antwort des Zielservices.
    
    Args:
        target_response: Die Response vom Zielservice
    
    Returns:
        Flask-Response
    """
    # Kopiere relevante Header
    excluded_headers = ['content-encoding', 'content-length', 'transfer-encoding', 'connection']
    headers = [(name, value) for name, value in target_response.raw.headers.items()
               if name.lower() not in excluded_headers]
    
    # CORS-Header hinzufügen für alle Antworten
    headers.append(('Access-Control-Allow-Origin', '*'))
    headers.append(('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS'))
    headers.append(('Access-Control-Allow-Headers', 'Content-Type, Authorization'))
    
    # Erstelle die Response mit den ursprünglichen Daten und Headern
    response = Response(
        target_response.content,
        target_response.status_code,
        headers
    )
    
    return response

@app.route(f'{API_BASE}/gateway/status', methods=['GET'])
def gateway_status():
    """
    Gibt Statusinformationen über das API-Gateway zurück.
    """
    status_info = {
        'gateway': {
            'status': 'online',
            'version': '1.0.0',
            'environment': ENV
        },
        'services': {}
    }

    # Prüfe jeden Service
    for service_name, host in SERVICE_HOSTS.items():
        try:
            health_url = f"{host}{API_BASE}/health"
            response = requests.get(health_url, timeout=5)
            service_status = 'online' if response.status_code == 200 else 'degraded'
        except requests.RequestException:
            service_status = 'offline'
        
        status_info['services'][service_name] = {
            'status': service_status,
            'host': host
        }

    return Response(
        json.dumps({'status': 'success', 'data': status_info, 'error': None}),
        status=200,
        mimetype='application/json'
    )

# Hinzufügen eines CORS-Preflight-Handlers
@app.route('/api/login', methods=['OPTIONS'])
@app.route(f'{API_BASE}/<path:path>', methods=['OPTIONS'])
def handle_options(path=""):
    """
    Handler für OPTIONS-Anfragen (CORS-Preflight)
    """
    resp = Response()
    resp.headers.add('Access-Control-Allow-Origin', '*')
    resp.headers.add('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    resp.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    return resp

if __name__ == '__main__':
    logger.info(f"API Gateway startet auf Port {GATEWAY_PORT} in Umgebung: {ENV}")
    app.run(host='0.0.0.0', port=GATEWAY_PORT, debug=(ENV == 'development')) 