import os
import json
import logging
import secrets
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash

# Konfiguriere Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
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

@app.route('/api/auth/login', methods=['POST'])
def login():
    """
    Endpunkt für die Benutzeranmeldung
    """
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({
            'status': 'error',
            'message': 'Benutzername und Passwort sind erforderlich'
        }), 400
    
    users = load_users()
    
    if username not in users:
        return jsonify({
            'status': 'error',
            'message': 'Ungültige Anmeldedaten'
        }), 401
    
    user = users[username]
    
    if not check_password_hash(user['password_hash'], password):
        return jsonify({
            'status': 'error',
            'message': 'Ungültige Anmeldedaten'
        }), 401
    
    # Token generieren
    token = generate_token()
    active_tokens[token] = {
        'username': username,
        'role': user['role']
    }
    
    return jsonify({
        'status': 'success',
        'message': 'Anmeldung erfolgreich',
        'token': token,
        'user': {
            'username': user['username'],
            'role': user['role'],
            'name': user['name']
        }
    }), 200

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    """
    Endpunkt für die Benutzerabmeldung
    """
    data = request.json
    token = data.get('token')
    
    if token and token in active_tokens:
        del active_tokens[token]
    
    return jsonify({
        'status': 'success',
        'message': 'Abmeldung erfolgreich'
    }), 200

@app.route('/api/auth/verify', methods=['POST'])
def verify_token():
    """
    Endpunkt zur Überprüfung eines Tokens
    """
    data = request.json
    token = data.get('token')
    
    if not token:
        return jsonify({
            'status': 'error',
            'message': 'Token ist erforderlich'
        }), 400
    
    if token not in active_tokens:
        return jsonify({
            'status': 'error',
            'message': 'Ungültiges oder abgelaufenes Token'
        }), 401
    
    user_info = active_tokens[token]
    
    return jsonify({
        'status': 'success',
        'message': 'Token ist gültig',
        'user': user_info
    }), 200

@app.route('/api/auth/users', methods=['GET'])
def get_users():
    """
    Endpunkt zum Abrufen aller Benutzer (nur für Administratoren)
    """
    # In einer echten Anwendung würde hier eine Token-Überprüfung stattfinden
    
    users = load_users()
    
    # Passwort-Hashes aus der Antwort entfernen
    user_list = []
    for username, user_data in users.items():
        user_list.append({
            'username': username,
            'role': user_data['role'],
            'name': user_data['name']
        })
    
    return jsonify(user_list), 200

@app.route('/api/auth/users', methods=['POST'])
def create_user():
    """
    Endpunkt zum Erstellen eines neuen Benutzers (nur für Administratoren)
    """
    # In einer echten Anwendung würde hier eine Token-Überprüfung stattfinden
    
    data = request.json
    username = data.get('username')
    password = data.get('password')
    role = data.get('role', 'user')
    name = data.get('name', username)
    
    if not username or not password:
        return jsonify({
            'status': 'error',
            'message': 'Benutzername und Passwort sind erforderlich'
        }), 400
    
    users = load_users()
    
    if username in users:
        return jsonify({
            'status': 'error',
            'message': f'Benutzer "{username}" existiert bereits'
        }), 400
    
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
    
    return jsonify({
        'status': 'success',
        'message': f'Benutzer "{username}" wurde erstellt'
    }), 201

if __name__ == '__main__':
    logger.info("Auth Service wird gestartet...")
    create_default_users()  # Standardbenutzer erstellen, falls nicht vorhanden
    app.run(host='0.0.0.0', port=8082, debug=True)
