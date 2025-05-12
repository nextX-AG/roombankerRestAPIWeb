"""
API-Konfiguration für das evAlarm-IoT Gateway System.
Diese Datei enthält die zentralen Definitionen aller API-Endpunkte,
um eine einheitliche Struktur über alle Services hinweg zu gewährleisten.
"""

import os

# API-Version
API_VERSION = 'v1'

# Basis-URL für alle API-Aufrufe
API_BASE = f'/api/{API_VERSION}'

# Service-Ports
PORTS = {
    'api': int(os.environ.get('API_PORT', 8080)),
    'auth': int(os.environ.get('AUTH_PORT', 8081)),
    'processor': int(os.environ.get('PROCESSOR_PORT', 8082)),
    'worker': int(os.environ.get('WORKER_PORT', 8083))
}

# Service-Hosts (für Entwicklung und Produktion)
HOSTS = {
    'development': {
        'api': f'http://localhost:{PORTS["api"]}',
        'auth': f'http://localhost:{PORTS["auth"]}',
        'processor': f'http://localhost:{PORTS["processor"]}',
        'worker': f'http://localhost:{PORTS["worker"]}'
    },
    'production': {
        'api': f'http://localhost:{PORTS["api"]}',
        'auth': f'http://localhost:{PORTS["auth"]}',
        'processor': f'http://localhost:{PORTS["processor"]}',
        'worker': f'http://localhost:{PORTS["worker"]}'
    }
}

# API-Endpunkte
ENDPOINTS = {
    # Auth-Service Endpunkte
    'auth': {
        'base': f'{API_BASE}/auth',
        'login': '/login',
        'logout': '/logout',
        'refresh': '/refresh',
        'status': '/status',
        'users': '/users'
    },
    
    # API-Service Endpunkte
    'gateways': {
        'base': f'{API_BASE}/gateways',
        'list': '',
        'detail': '/<uuid>',
        'create': '',
        'update': '/<uuid>',
        'delete': '/<uuid>',
        'unassigned': '/unassigned'
    },
    
    'customers': {
        'base': f'{API_BASE}/customers',
        'list': '',
        'detail': '/<id>',
        'create': '',
        'update': '/<id>',
        'delete': '/<id>'
    },
    
    'devices': {
        'base': f'{API_BASE}/devices',
        'list': '',
        'detail': '/<id>',
        'by_gateway': '/gateway/<gateway_uuid>'
    },
    
    # Message Worker & Processor Endpunkte
    'messages': {
        'base': f'{API_BASE}/messages',
        'status': '/status',
        'detail': '/<message_id>',
        'process': '/process',
        'queue_status': '/queue/status',
        'forwarding': '/forwarding',
        'retry': '/retry/<message_id>',
        'failed': '/failed',
        'clear': '/clear'
    },
    
    'templates': {
        'base': f'{API_BASE}/templates',
        'list': '',
        'detail': '/<template_id>',
        'test': '/test-transform',
        'reload': '/reload'
    },
    
    'system': {
        'base': f'{API_BASE}/system',
        'health': '/health',
        'iot_status': '/iot-status',
        'endpoints': '/endpoints',
        'logs': '/logs'
    }
}

def get_full_url(endpoint_category, endpoint_name, env='development', params=None):
    """
    Erzeugt eine vollständige URL für den angegebenen Endpunkt.
    
    Args:
        endpoint_category: Kategorie des Endpunkts (z.B. 'auth', 'messages')
        endpoint_name: Name des Endpunkts innerhalb der Kategorie
        env: Umgebung ('development' oder 'production')
        params: Optional, Dictionary mit Pfadparametern
    
    Returns:
        Vollständige URL zum Endpunkt
    """
    # Passenden Service für die Kategorie ermitteln
    service = _get_service_for_category(endpoint_category)
    
    # Basis-URL des Services
    base_url = HOSTS[env][service]
    
    # Basis-Pfad der Kategorie
    category_base = ENDPOINTS[endpoint_category]['base']
    
    # Spezifischer Endpunkt
    endpoint = ENDPOINTS[endpoint_category][endpoint_name]
    
    # Vollständiger Pfad
    path = f"{category_base}{endpoint}"
    
    # Parameter ersetzen, wenn vorhanden
    if params:
        for key, value in params.items():
            path = path.replace(f'<{key}>', str(value))
    
    return f"{base_url}{path}"

def get_route(endpoint_category, endpoint_name):
    """
    Gibt die Route für einen Endpunkt zurück, ohne Host.
    Nützlich für die Definition von Flask-Routen.
    
    Args:
        endpoint_category: Kategorie des Endpunkts (z.B. 'auth', 'messages')
        endpoint_name: Name des Endpunkts innerhalb der Kategorie
    
    Returns:
        Route zum Endpunkt ohne Host
    """
    category_base = ENDPOINTS[endpoint_category]['base']
    endpoint = ENDPOINTS[endpoint_category][endpoint_name]
    return f"{category_base}{endpoint}"

def _get_service_for_category(category):
    """
    Ermittelt den zuständigen Service für eine Endpunkt-Kategorie.
    
    Args:
        category: Kategorie des Endpunkts
    
    Returns:
        Service-Name
    """
    service_mapping = {
        'auth': 'auth',
        'gateways': 'api',
        'customers': 'api',
        'devices': 'api',
        'messages': 'processor',
        'templates': 'processor',
        'system': 'processor'
    }
    
    return service_mapping.get(category, 'api')  # Default: api-Service

# Beispielnutzung:
# from utils.api_config import get_full_url, get_route
#
# # In einem Flask-Router:
# @app.route(get_route('messages', 'status'), methods=['GET'])
# def get_message_status():
#     pass
#
# # Beim API-Aufruf im Frontend:
# fetch(get_full_url('messages', 'status', env='production')) 