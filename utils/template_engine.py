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
            data = message if isinstance(message, dict) else {}
            
            # Gateway-ID aus verschiedenen möglichen Quellen extrahieren
            gateway_id = None
            for key in ['gateway_uuid', 'gateway_id', 'gateway']:
                if key in data:
                    if isinstance(data[key], str):
                        gateway_id = data[key]
                        break
                    elif isinstance(data[key], dict) and 'id' in data[key]:
                        gateway_id = data[key]['id']
                        break
            
            if not gateway_id and 'data' in data and isinstance(data['data'], dict):
                data_inner = data['data']
                for key in ['gateway_uuid', 'gateway_id', 'gateway']:
                    if key in data_inner:
                        if isinstance(data_inner[key], str):
                            gateway_id = data_inner[key]
                            break
                        elif isinstance(data_inner[key], dict) and 'id' in data_inner[key]:
                            gateway_id = data_inner[key]['id']
                            break
            
            # Extrahiere Alarm-Status und Alarm-Typ
            alarm_status = "unknown"
            alarm_type = "unknown"
            
            # Aus Gateway-Status
            if 'gateway' in data and isinstance(data['gateway'], dict):
                if 'alarmstatus' in data['gateway']:
                    alarm_status = data['gateway']['alarmstatus']
                if 'alarmtype' in data['gateway']:
                    alarm_type = data['gateway']['alarmtype']
            
            # Aus Subdevicelist (Priorität über Gateway-Status)
            if 'subdevicelist' in data and isinstance(data['subdevicelist'], list) and len(data['subdevicelist']) > 0:
                for device in data['subdevicelist']:
                    if isinstance(device, dict):
                        if 'value' in device and isinstance(device['value'], dict):
                            values = device['value']
                            if 'alarmstatus' in values:
                                alarm_status = values['alarmstatus']
                            if 'alarmtype' in values:
                                alarm_type = values['alarmtype']
            
            # Erstelle Kontext für Template-Rendering
            context = {
                'message': data,
                'ts': data.get('ts', int(datetime.now().timestamp())),
                'gateway_id': gateway_id or "unknown_gateway",
                'device_id': self._extract_device_id(data),
                'alarm_type': alarm_type,
                'alarm_status': alarm_status,
                'uuid': str(uuid.uuid4()),
                'timestamp': int(datetime.now().timestamp()),
                'iso_timestamp': datetime.now().isoformat(),
                'namespace': 'eva.herford'  # Standardwert, wird vom MessageForwarder überschrieben
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
        # MongoDB-Import muss hier durchgeführt werden, um zirkuläre Importe zu vermeiden
        import sys
        import os
        sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        from api.models import Customer, Gateway
        self.Customer = Customer
        self.Gateway = Gateway
        self.load_endpoints()
    
    def load_endpoints(self):
        """
        Lädt die konfigurierten Endpunkte
        """
        # Standardendpunkt für evAlarm als Fallback
        self.endpoints['evalarm_default'] = {
            'url': 'https://tas.dev.evalarm.de/api/v1/espa',
            'auth': ('eva.herford', 'GW8OoLZE'),
            'headers': {
                'Content-Type': 'application/json',
                'X-EVALARM-API-VERSION': '2.1.5'
            }
        }
        
        # Kunden mit evAlarm-Konfiguration aus der Datenbank laden
        try:
            customers = self.Customer.find_all()
            for customer in customers:
                if customer.evalarm_username and customer.evalarm_password:
                    customer_id = str(customer._id)
                    self.endpoints[f'customer_{customer_id}'] = {
                        'url': 'https://tas.dev.evalarm.de/api/v1/espa',  # URL ist für alle Kunden gleich
                        'auth': (customer.evalarm_username, customer.evalarm_password),
                        'headers': {
                            'Content-Type': 'application/json',
                            'X-EVALARM-API-VERSION': '2.1.5'
                        },
                        'customer': customer
                    }
            logger.info(f"Endpunkte für {len(self.endpoints) - 1} Kunden geladen")
        except Exception as e:
            logger.error(f"Fehler beim Laden der Kundenendpunkte: {str(e)}")
    
    def get_customer_by_gateway(self, gateway_uuid):
        """
        Findet den Kunden für ein Gateway
        
        Args:
            gateway_uuid: UUID des Gateways
            
        Returns:
            Kunden-Objekt oder None
        """
        try:
            gateway = self.Gateway.find_by_uuid(gateway_uuid)
            if gateway and gateway.customer_id:
                return self.Customer.find_by_id(gateway.customer_id)
        except Exception as e:
            logger.error(f"Fehler beim Finden des Kunden für Gateway {gateway_uuid}: {str(e)}")
        return None
    
    def get_endpoint_for_gateway(self, gateway_uuid):
        """
        Findet den Endpunkt für ein Gateway
        
        Args:
            gateway_uuid: UUID des Gateways
            
        Returns:
            Name des Endpunkts oder 'evalarm_default'
        """
        customer = self.get_customer_by_gateway(gateway_uuid)
        if customer:
            customer_id = str(customer._id)
            endpoint_name = f'customer_{customer_id}'
            if endpoint_name in self.endpoints:
                return endpoint_name
        return 'evalarm_default'
    
    def forward_message(self, message, endpoint_name, gateway_uuid=None):
        """
        Leitet eine transformierte Nachricht an einen externen Endpunkt weiter
        
        Args:
            message: Die weiterzuleitende Nachricht
            endpoint_name: Name des Endpunkts oder 'auto' für automatische Auswahl basierend auf gateway_uuid
            gateway_uuid: UUID des Gateways (optional, nur für endpoint_name='auto')
            
        Returns:
            Response-Objekt oder None bei Fehler
        """
        # Bei 'auto' den Endpunkt basierend auf dem Gateway-UUID ermitteln
        if endpoint_name == 'auto' and gateway_uuid:
            endpoint_name = self.get_endpoint_for_gateway(gateway_uuid)
            logger.info(f"Automatisch Endpunkt '{endpoint_name}' für Gateway {gateway_uuid} ermittelt")
        
        if endpoint_name not in self.endpoints:
            logger.error(f"Endpunkt '{endpoint_name}' nicht gefunden")
            return None
        
        endpoint = self.endpoints[endpoint_name]
        
        # Anpassen der Nachricht mit Kundendaten, falls vorhanden
        if 'customer' in endpoint and isinstance(message, dict):
            customer = endpoint['customer']
            
            # Namespace anpassen, falls die Nachricht ein events-Array enthält
            if 'events' in message and isinstance(message['events'], list):
                for event in message['events']:
                    if isinstance(event, dict) and 'namespace' in event:
                        event['namespace'] = customer.evalarm_namespace or event['namespace']
        
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
