import os
import json
import logging
import secrets
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash

# Füge das Projektverzeichnis zum Python-Pfad hinzu
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Importiere die zentrale API-Konfiguration
from utils.api_config import get_route, API_VERSION
from utils.api_handlers import (
    success_response, error_response, 
    unauthorized_response, forbidden_response,
    api_error_handler
)

# Konfiguriere Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    filename=os.path.join(os.path.dirname(os.path.abspath(__file__)), 'auth.log'),
    filemode='a'
)
logger = logging.getLogger('auth-service')

# Erstelle Flask-App
app = Flask(__name__)
CORS(app)  # Erlaube Cross-Origin Requests für Frontend-Integration

# Speicherort für Benutzerdaten
USERS_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data', 'users.json')
os.makedirs(os.path.dirname(USERS_FILE), exist_ok=True)

# Aktive Tokens (In-Memory-Speicher für Demo-Zwecke)
active_tokens = {}

# Standardbenutzer erstellen, wenn keine Benutzerdatei existiert
def create_default_users():
    if not os.path.exists(USERS_FILE):
        default_users = {
            "admin": {
                "username": "admin",
                "password_hash": generate_password_hash("password"),
                "role": "admin",
                "name": "Administrator"
            },
            "user": {
                "username": "user",
                "password_hash": generate_password_hash("user123"),
                "role": "user",
                "name": "Demo User"
            }
        }
        
        with open(USERS_FILE, 'w') as f:
            json.dump(default_users, f, indent=2)
        
        logger.info(f"Standardbenutzer erstellt: {USERS_FILE}")

# Benutzer laden
def load_users():
    if not os.path.exists(USERS_FILE):
        create_default_users()
    
    with open(USERS_FILE, 'r') as f:
        return json.load(f)

# Token generieren
def generate_token():
    return secrets.token_hex(32)

# Authentifizierungsfunktionalität
def verify_auth_token(token):
    """Überprüft, ob ein Token gültig ist und gibt Benutzerinformationen zurück"""
    if not token or token not in active_tokens:
        return None
    return active_tokens[token]

@app.route(get_route('auth', 'login'), methods=['POST'])
@api_error_handler
def login():
    """
    Endpunkt für die Benutzeranmeldung
    """
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    # Validierung
    if not username or not password:
        return error_response('Benutzername und Passwort sind erforderlich', 400)
    
    users = load_users()
    
    if username not in users:
        logger.warning(f"Fehlgeschlagener Login-Versuch für unbekannten Benutzer: {username}")
        return error_response('Ungültige Anmeldedaten', 401)
    
    user = users[username]
    
    if not check_password_hash(user['password_hash'], password):
        logger.warning(f"Fehlgeschlagener Login-Versuch für Benutzer: {username}")
        return error_response('Ungültige Anmeldedaten', 401)
    
    # Token generieren
    token = generate_token()
    active_tokens[token] = {
        'username': username,
        'role': user['role']
    }
    
    logger.info(f"Erfolgreicher Login für Benutzer: {username}")
    
    return success_response({
        'token': token,
        'user': {
            'username': user['username'],
            'role': user['role'],
            'name': user['name']
        },
        'message': 'Anmeldung erfolgreich'
    })

@app.route(get_route('auth', 'logout'), methods=['POST'])
@api_error_handler
def logout():
    """
    Endpunkt für die Benutzerabmeldung
    """
    data = request.json
    token = data.get('token')
    
    if token and token in active_tokens:
        username = active_tokens[token]['username']
        del active_tokens[token]
        logger.info(f"Benutzer abgemeldet: {username}")
    
    return success_response({'message': 'Abmeldung erfolgreich'})

@app.route(get_route('auth', 'refresh'), methods=['POST'])
@api_error_handler
def refresh_token():
    """
    Endpunkt zur Überprüfung eines Tokens
    """
    data = request.json
    token = data.get('token')
    
    if not token:
        return error_response('Token ist erforderlich', 400)
    
    user_info = verify_auth_token(token)
    if not user_info:
        return error_response('Ungültiges oder abgelaufenes Token', 401)
    
    logger.info(f"Token-Überprüfung erfolgreich für: {user_info['username']}")
    
    return success_response({
        'user': user_info,
        'message': 'Token ist gültig'
    })

@app.route(get_route('auth', 'status'), methods=['GET'])
@api_error_handler
def get_auth_status():
    """
    Endpunkt zum Abrufen aller Benutzer (nur für Administratoren)
    """
    # Prüfe Autorisierung
    auth_header = request.headers.get('Authorization')
    
    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header.split(' ')[1]
        user_info = verify_auth_token(token)
        
        if not user_info:
            return unauthorized_response()
        
        if user_info['role'] != 'admin':
            return forbidden_response()
    else:
        # Für Entwicklungszwecke erlauben wir den Zugriff ohne Token
        logger.warning("Zugriff auf Benutzerliste ohne Token (nur für Entwicklung)")
    
    users = load_users()
    
    # Passwort-Hashes aus der Antwort entfernen
    user_list = []
    for username, user_data in users.items():
        user_list.append({
            'username': username,
            'role': user_data['role'],
            'name': user_data['name']
        })
    
    return success_response(user_list)

@app.route(get_route('auth', 'users'), methods=['POST'])
@api_error_handler
def create_user():
    """
    Endpunkt zum Erstellen eines neuen Benutzers (nur für Administratoren)
    """
    # Validiere Admin-Berechtigung
    auth_header = request.headers.get('Authorization')
    
    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header.split(' ')[1]
        user_info = verify_auth_token(token)
        
        if not user_info:
            return unauthorized_response()
        
        if user_info['role'] != 'admin':
            return forbidden_response()
    else:
        # Für Entwicklungszwecke erlauben wir das Erstellen ohne Token
        logger.warning("Benutzer wird ohne Token erstellt (nur für Entwicklung)")
    
    data = request.json
    username = data.get('username')
    password = data.get('password')
    role = data.get('role', 'user')
    name = data.get('name', username)
    
    if not username or not password:
        return error_response('Benutzername und Passwort sind erforderlich', 400)
    
    users = load_users()
    
    if username in users:
        return error_response(f'Benutzer "{username}" existiert bereits', 400)
    
    # Neuen Benutzer erstellen
    users[username] = {
        'username': username,
        'password_hash': generate_password_hash(password),
        'role': role,
        'name': name
    }
    
    # Benutzer speichern
    with open(USERS_FILE, 'w') as f:
        json.dump(users, f, indent=2)
    
    logger.info(f"Neuer Benutzer erstellt: {username} mit Rolle {role}")
    
    return success_response(
        {'message': f'Benutzer "{username}" wurde erstellt'},
        201
    )

@app.route('/api/health', methods=['GET'])
@api_error_handler
def health_check():
    """
    Einfacher Health-Check-Endpunkt
    """
    return success_response({
        'service': 'auth',
        'version': API_VERSION,
        'status': 'running'
    })

@app.route('/api/endpoints', methods=['GET'])
@api_error_handler
def list_endpoints():
    """
    Listet alle verfügbaren Endpunkte dieses Services auf
    """
    endpoints = [
        {'path': get_route('auth', 'login'), 'method': 'POST', 'description': 'Benutzeranmeldung'},
        {'path': get_route('auth', 'logout'), 'method': 'POST', 'description': 'Benutzerabmeldung'},
        {'path': get_route('auth', 'refresh'), 'method': 'POST', 'description': 'Token-Aktualisierung'},
        {'path': get_route('auth', 'status'), 'method': 'GET', 'description': 'Authentifizierungsstatus'},
        {'path': get_route('auth', 'users'), 'method': 'POST', 'description': 'Benutzer erstellen'},
        {'path': '/api/health', 'method': 'GET', 'description': 'Health-Check'},
        {'path': '/api/endpoints', 'method': 'GET', 'description': 'API-Endpunkte auflisten'}
    ]
    
    return success_response(endpoints)

if __name__ == '__main__':
    logger.info("Auth Service wird gestartet...")
    create_default_users()  # Standardbenutzer erstellen, falls nicht vorhanden
    # Port aus der zentralen Konfiguration verwenden
    port = int(os.environ.get('AUTH_PORT', 8081))
    logger.info(f"Auth Service läuft auf Port {port}")
    print(f"Auth Service läuft auf Port {port} - API Version {API_VERSION}")
    app.run(host='0.0.0.0', port=port, debug=True)
