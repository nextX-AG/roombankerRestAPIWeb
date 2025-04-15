import json
import yaml
import jinja2
import logging
import os
from datetime import datetime
import uuid
import requests

# Konfiguriere Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('template-engine')

class TemplateEngine:
    """
    Template-Engine zur Transformation von MQTT-Nachrichten basierend auf konfigurierbaren Templates
    """
    
    def __init__(self, templates_dir):
        """
        Initialisiert die Template-Engine
        
        Args:
            templates_dir: Verzeichnis, in dem die Templates gespeichert sind
        """
        self.templates_dir = templates_dir
        self.jinja_env = jinja2.Environment(
            loader=jinja2.FileSystemLoader(templates_dir),
            autoescape=jinja2.select_autoescape(['html', 'xml'])
        )
        self.templates = {}
        self.load_templates()
    
    def load_templates(self):
        """
        Lädt alle verfügbaren Templates aus dem Templates-Verzeichnis
        """
        logger.info(f"Lade Templates aus {self.templates_dir}")
        
        if not os.path.exists(self.templates_dir):
            logger.warning(f"Templates-Verzeichnis {self.templates_dir} existiert nicht")
            return
        
        for filename in os.listdir(self.templates_dir):
            if filename.endswith('.json') or filename.endswith('.yaml') or filename.endswith('.yml'):
                template_path = os.path.join(self.templates_dir, filename)
                template_name = os.path.splitext(filename)[0]
                
                try:
                    with open(template_path, 'r') as f:
                        if filename.endswith('.json'):
                            template_data = json.load(f)
                        else:
                            template_data = yaml.safe_load(f)
                    
                    self.templates[template_name] = {
                        'data': template_data,
                        'path': template_path
                    }
                    logger.info(f"Template '{template_name}' geladen")
                except Exception as e:
                    logger.error(f"Fehler beim Laden des Templates '{template_name}': {str(e)}")
    
    def reload_templates(self):
        """
        Lädt alle Templates neu
        """
        self.templates = {}
        self.load_templates()
    
    def get_template_names(self):
        """
        Gibt die Namen aller verfügbaren Templates zurück
        
        Returns:
            Liste der Template-Namen
        """
        return list(self.templates.keys())
    
    def transform_message(self, message, template_name):
        """
        Transformiert eine Nachricht basierend auf einem Template
        
        Args:
            message: Die zu transformierende Nachricht
            template_name: Name des zu verwendenden Templates
            
        Returns:
            Transformierte Nachricht
        """
        if template_name not in self.templates:
            logger.error(f"Template '{template_name}' nicht gefunden")
            return None
        
        try:
            # Extrahiere Daten aus der Nachricht
            data = message.get('data', {})
            
            # Erstelle Kontext für Template-Rendering
            context = {
                'message': message,
                'data': data,
                'ts': data.get('ts', int(datetime.now().timestamp())),
                'gateway_id': self._extract_gateway_id(data),
                'device_id': self._extract_device_id(data),
                'alarm_type': self._extract_alarm_type(data),
                'alarm_status': self._extract_alarm_status(data),
                'uuid': str(uuid.uuid4()),
                'timestamp': int(datetime.now().timestamp()),
                'iso_timestamp': datetime.now().isoformat()
            }
            
            # Rendere Template
            template_str = json.dumps(self.templates[template_name]['data'])
            template = jinja2.Template(template_str)
            rendered = template.render(**context)
            
            # Parse gerenderte Nachricht zurück zu JSON
            transformed_message = json.loads(rendered)
            
            logger.info(f"Nachricht mit Template '{template_name}' transformiert")
            return transformed_message
        
        except Exception as e:
            logger.error(f"Fehler bei der Transformation mit Template '{template_name}': {str(e)}")
            return None
    
    def _extract_gateway_id(self, data):
        """
        Extrahiert die Gateway-ID aus den Nachrichtendaten
        """
        if 'gateway' in data and isinstance(data['gateway'], dict) and 'id' in data['gateway']:
            return data['gateway']['id']
        return "unknown_gateway"
    
    def _extract_device_id(self, data):
        """
        Extrahiert die Geräte-ID aus den Nachrichtendaten
        """
        if 'subdevicelist' in data and isinstance(data['subdevicelist'], list) and len(data['subdevicelist']) > 0:
            device = data['subdevicelist'][0]
            if 'id' in device:
                return device['id']
        return "unknown_device"
    
    def _extract_alarm_type(self, data):
        """
        Extrahiert den Alarmtyp aus den Nachrichtendaten
        """
        if 'subdevicelist' in data and isinstance(data['subdevicelist'], list) and len(data['subdevicelist']) > 0:
            device = data['subdevicelist'][0]
            if 'values' in device and 'alarmtype' in device['values']:
                return device['values']['alarmtype']
        return "unknown"
    
    def _extract_alarm_status(self, data):
        """
        Extrahiert den Alarmstatus aus den Nachrichtendaten
        """
        if 'subdevicelist' in data and isinstance(data['subdevicelist'], list) and len(data['subdevicelist']) > 0:
            device = data['subdevicelist'][0]
            if 'values' in device and 'alarmstatus' in device['values']:
                return device['values']['alarmstatus']
        return "unknown"

class MessageForwarder:
    """
    Klasse zum Weiterleiten von transformierten Nachrichten an externe APIs
    """
    
    def __init__(self):
        """
        Initialisiert den Message Forwarder
        """
        self.endpoints = {}
        self.load_endpoints()
    
    def load_endpoints(self):
        """
        Lädt die konfigurierten Endpunkte
        """
        # Beispiel-Endpunkt für Evalarm
        self.endpoints['evalarm'] = {
            'url': 'https://tas.dev.evalarm.de/api/v1/espa',
            'auth': ('eva.herford', 'GW8OoLZE'),
            'headers': {
                'Content-Type': 'application/json',
                'X-EVALARM-API-VERSION': '2.1.5'
            }
        }
    
    def forward_message(self, message, endpoint_name):
        """
        Leitet eine transformierte Nachricht an einen externen Endpunkt weiter
        
        Args:
            message: Die weiterzuleitende Nachricht
            endpoint_name: Name des Endpunkts
            
        Returns:
            Response-Objekt oder None bei Fehler
        """
        if endpoint_name not in self.endpoints:
            logger.error(f"Endpunkt '{endpoint_name}' nicht gefunden")
            return None
        
        endpoint = self.endpoints[endpoint_name]
        
        try:
            response = requests.post(
                endpoint['url'],
                json=message,
                headers=endpoint.get('headers', {}),
                auth=endpoint.get('auth', None),
                timeout=10
            )
            
            logger.info(f"Nachricht an '{endpoint_name}' weitergeleitet, Status: {response.status_code}")
            return response
        
        except Exception as e:
            logger.error(f"Fehler bei der Weiterleitung an '{endpoint_name}': {str(e)}")
            return None
    
    def add_endpoint(self, name, url, auth=None, headers=None):
        """
        Fügt einen neuen Endpunkt hinzu
        
        Args:
            name: Name des Endpunkts
            url: URL des Endpunkts
            auth: Authentifizierungsdaten (optional)
            headers: HTTP-Header (optional)
        """
        self.endpoints[name] = {
            'url': url,
            'auth': auth,
            'headers': headers or {}
        }
        logger.info(f"Endpunkt '{name}' hinzugefügt")
    
    def remove_endpoint(self, name):
        """
        Entfernt einen Endpunkt
        
        Args:
            name: Name des Endpunkts
        """
        if name in self.endpoints:
            del self.endpoints[name]
            logger.info(f"Endpunkt '{name}' entfernt")
    
    def get_endpoint_names(self):
        """
        Gibt die Namen aller verfügbaren Endpunkte zurück
        
        Returns:
            Liste der Endpunkt-Namen
        """
        return list(self.endpoints.keys())
