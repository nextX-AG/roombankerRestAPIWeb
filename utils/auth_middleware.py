"""
Authentifizierungsmiddleware für die API.
"""

from functools import wraps
from flask import request
import logging
import sys
import os

# Füge das Projektverzeichnis zum Python-Pfad hinzu für Importe
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# API-Handler für standardisierte Antworten
from utils.api_handlers import unauthorized_response, forbidden_response

# Logger konfigurieren
logger = logging.getLogger('auth-middleware')

def verify_auth_token(token):
    """
    Überprüft einen Authentifizierungstoken.
    
    In einer vollständigen Implementierung würde dies die Token-Validität prüfen,
    möglicherweise durch Aufruf des Auth-Dienstes. Für Debugging und Entwicklung
    akzeptieren wir alle Tokens.
    
    Args:
        token: Der zu prüfende Token-String
        
    Returns:
        Bei Erfolg ein Dictionary mit Benutzerinformationen, sonst None
    """
    # Für Entwicklungszwecke: Akzeptiere alle Tokens
    if token:
        # In echter Implementierung: Verifiziere Token gegen Auth-Service
        # Rufe z.B. auth_service.verify_auth_token(token) auf
        
        # Hier simulieren wir eine erfolgreiche Authentifizierung
        return {
            'username': 'dev_user',
            'role': 'admin'  # Gebe Admin-Rechte für Entwicklung
        }
    
    return None

def require_auth(f):
    """
    Decorator, der Authentifizierung für eine Flask-Route erzwingt.
    
    Prüft den Authorization-Header und validiert den Token.
    Bei Erfolg wird die Route ausgeführt, ansonsten 401 Unauthorized zurückgegeben.
    
    Args:
        f: Die zu dekorierende Funktion
        
    Returns:
        Dekorierte Funktion mit Authentifizierungscheck
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        
        # Überprüfe Authorization-Header
        if not auth_header or not auth_header.startswith('Bearer '):
            logger.warning(f"Unbefugter Zugriff auf {f.__name__}: Fehlender oder ungültiger Authorization-Header")
            return unauthorized_response()
        
        # Token aus Header extrahieren
        token = auth_header.split(' ')[1]
        
        # Token verifizieren
        user_info = verify_auth_token(token)
        if not user_info:
            logger.warning(f"Unbefugter Zugriff auf {f.__name__}: Ungültiger Token")
            return unauthorized_response()
        
        # Erfolgreiche Authentifizierung
        logger.info(f"Authentifizierter Zugriff auf {f.__name__}: {user_info['username']}")
        return f(*args, **kwargs)
    
    return decorated

def require_role(role):
    """
    Decorator, der eine bestimmte Rolle für eine Flask-Route erfordert.
    
    Prüft den Authorization-Header, validiert den Token und prüft die Benutzerrolle.
    
    Args:
        role: Die erforderliche Rolle (z.B. 'admin')
        
    Returns:
        Decorator-Funktion mit Authentifizierungs- und Rollencheck
    """
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            auth_header = request.headers.get('Authorization')
            
            # Überprüfe Authorization-Header
            if not auth_header or not auth_header.startswith('Bearer '):
                logger.warning(f"Unbefugter Zugriff auf {f.__name__}: Fehlender oder ungültiger Authorization-Header")
                return unauthorized_response()
            
            # Token aus Header extrahieren
            token = auth_header.split(' ')[1]
            
            # Token verifizieren
            user_info = verify_auth_token(token)
            if not user_info:
                logger.warning(f"Unbefugter Zugriff auf {f.__name__}: Ungültiger Token")
                return unauthorized_response()
            
            # Rolle prüfen
            if user_info['role'] != role:
                logger.warning(f"Zugriff verweigert auf {f.__name__}: Benutzer {user_info['username']} hat nicht die Rolle {role}")
                return forbidden_response()
            
            # Erfolgreiche Authentifizierung mit erforderlicher Rolle
            logger.info(f"Authentifizierter Zugriff auf {f.__name__}: {user_info['username']} mit Rolle {role}")
            return f(*args, **kwargs)
        
        return decorated
    
    return decorator 