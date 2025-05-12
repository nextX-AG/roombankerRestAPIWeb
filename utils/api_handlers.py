"""
Gemeinsame API-Handler für alle Services des evAlarm-IoT Gateway Systems.
Diese Datei enthält wiederverwendbare Funktionen für API-Antworten und Fehlerbehandlung.
"""

from flask import jsonify
import logging

# Logger konfigurieren
logger = logging.getLogger('api-handlers')

def success_response(data, status_code=200):
    """
    Standardisierte Erfolgsantwort
    
    Args:
        data: Die Daten, die zurückgegeben werden sollen
        status_code: HTTP-Statuscode (default: 200)
    
    Returns:
        Flask-Response mit einheitlichem Format
    """
    return jsonify({
        'status': 'success',
        'data': data,
        'error': None
    }), status_code

def error_response(message, status_code=400, error_code=None, details=None):
    """
    Standardisierte Fehlerantwort
    
    Args:
        message: Fehlermeldung
        status_code: HTTP-Statuscode (default: 400)
        error_code: Optionaler Fehlercode für Frontend-Verarbeitung
        details: Optionale detaillierte Fehlerinformationen
    
    Returns:
        Flask-Response mit einheitlichem Format
    """
    error = {
        'message': message
    }
    
    if error_code:
        error['code'] = error_code
    
    if details:
        error['details'] = details
    
    return jsonify({
        'status': 'error',
        'data': None,
        'error': error
    }), status_code

def not_found_response(resource_type, resource_id):
    """
    Standardisierte Antwort für nicht gefundene Ressourcen
    
    Args:
        resource_type: Art der Ressource (z.B. 'customer', 'gateway')
        resource_id: ID der gesuchten Ressource
    
    Returns:
        Flask-Response mit 404-Status
    """
    return error_response(
        message=f"{resource_type.capitalize()} mit ID '{resource_id}' nicht gefunden",
        status_code=404,
        error_code='resource_not_found'
    )

def validation_error_response(validation_errors):
    """
    Standardisierte Antwort für Validierungsfehler
    
    Args:
        validation_errors: Dictionary mit Feld -> Fehlermeldung Zuordnungen
    
    Returns:
        Flask-Response mit 400-Status und detaillierten Validierungsfehlern
    """
    return error_response(
        message="Validierungsfehler",
        status_code=400,
        error_code='validation_error',
        details=validation_errors
    )

def unauthorized_response():
    """
    Standardisierte Antwort für nicht autorisierte Anfragen
    
    Returns:
        Flask-Response mit 401-Status
    """
    return error_response(
        message="Nicht autorisiert",
        status_code=401,
        error_code='unauthorized'
    )

def forbidden_response():
    """
    Standardisierte Antwort für Anfragen mit unzureichenden Berechtigungen
    
    Returns:
        Flask-Response mit 403-Status
    """
    return error_response(
        message="Unzureichende Berechtigungen",
        status_code=403,
        error_code='forbidden'
    )

def server_error_response(exception=None):
    """
    Standardisierte Antwort für Serverfehler
    
    Args:
        exception: Ausnahmeobjekt (optional)
    
    Returns:
        Flask-Response mit 500-Status
    """
    # Log exception
    if exception:
        logger.error(f"Serverfehler: {str(exception)}", exc_info=True)
    
    return error_response(
        message="Interner Serverfehler",
        status_code=500,
        error_code='server_error'
    )

# Decorator für einheitliche Fehlerbehandlung
def api_error_handler(f):
    """
    Decorator für Flask-Routen zur einheitlichen Fehlerbehandlung
    
    Args:
        f: Die zu dekorierene Funktion
    
    Returns:
        Dekorierte Funktion mit Fehlerbehandlung
    """
    def decorated_function(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except Exception as e:
            logger.error(f"Unbehandelter Fehler in {f.__name__}: {str(e)}", exc_info=True)
            return server_error_response(e)
    
    # Originalen Funktionsnamen und Docstring beibehalten
    decorated_function.__name__ = f.__name__
    decorated_function.__doc__ = f.__doc__
    
    return decorated_function 