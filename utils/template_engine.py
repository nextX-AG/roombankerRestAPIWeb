import json
import yaml
import jinja2
import logging
import os
from datetime import datetime
import uuid
import requests
import time

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
        
        # Filter zum sicheren JSON-Serialisieren hinzufügen
        self.jinja_env.filters['tojson'] = lambda obj, **kwargs: json.dumps(obj, **kwargs)
        
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
    
    def get_template(self, template_name):
        """
        Gibt die Details eines spezifischen Templates zurück
        
        Args:
            template_name: Name des Templates
            
        Returns:
            Dictionary mit Template-Details oder None, wenn das Template nicht existiert
        """
        if template_name not in self.templates:
            logger.warning(f"Template '{template_name}' nicht gefunden")
            return None
            
        template_data = self.templates[template_name]
        
        # Extrahiere Dateiinhalt
        with open(template_data['path'], 'r') as f:
            if template_data['path'].endswith('.json'):
                template_code = f.read()
            else:
                template_code = f.read()
        
        # Ermittle Provider-Typ anhand von Dateiname oder Inhalt
        provider_type = 'generic'
        if 'evalarm' in template_name:
            provider_type = 'evalarm'
        elif 'roombanker' in template_name:
            provider_type = 'roombanker'
        elif 'becker' in template_name:
            provider_type = 'becker-antriebe'
        
        # Erstelle Zeitstempel
        created_at = datetime.now().isoformat()
        
        # Erstelle strukturiertes Template-Objekt für das Frontend
        return {
            'id': template_name,
            'name': template_name,
            'template_code': template_code,
            'provider_type': provider_type,
            'created_at': created_at,
            'path': template_data['path']
        }
    
    def transform_message(self, message, template_name, customer_config=None, gateway_id=None):
        """
        Transformiert eine Nachricht basierend auf einem Template
        
        Args:
            message: Die zu transformierende Nachricht
            template_name: Name des zu verwendenden Templates
            customer_config: Kundenkonfiguration (optional)
            gateway_id: ID des Gateways (optional)
            
        Returns:
            Transformierte Nachricht
        """
        if template_name not in self.templates:
            logger.error(f"Template '{template_name}' nicht gefunden")
            return None
        
        try:
            # Extrahiere Daten aus der Nachricht
            data = message if isinstance(message, dict) else {}
            
            # Debug-Logging zum besseren Verständnis der Nachrichtenstruktur
            logger.info(f"Transformiere Nachricht mit Template '{template_name}'")
            logger.info(f"Nachrichtentyp: {type(message).__name__}")
            logger.info(f"Nachrichteninhalt kurz: {str(message)[:200]}")
            
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
            
            if not gateway_id:
                gateway_id = "unknown"  # Fallback für unbekannte Gateway-IDs
            
            # UUID für die Nachricht generieren
            uuid_str = str(uuid.uuid4())
            
            # Template-Daten laden
            template_data = self.templates[template_name]['data']
            
            # Jinja2-Umgebung für das Template vorbereiten
            env = jinja2.Environment(autoescape=True)
            
            # VERBESSERTE BEHANDLUNG FÜR VERSCHIEDENE NACHRICHTENFORMATE
            # Besondere Behandlung für Panic-Button-Nachrichten (Code 2030)
            if template_name == 'evalarm_panic' and isinstance(message, dict):
                # Format 2: Direktes subdeviceid-Format (Panic Button)
                if 'subdeviceid' in message:
                    device_id = message['subdeviceid']
                    logger.info(f"Panic-Button mit subdeviceid gefunden: {device_id}")
                    
                    # Stellen sicher, dass message.subdevicelist existiert, auch als leere Liste
                    if 'subdevicelist' not in message:
                        message['subdevicelist'] = [
                            {
                                "id": device_id,
                                "value": {
                                    "alarmstatus": message.get("alarmstatus", "alarm"),
                                    "alarmtype": message.get("alarmtype", "panic")
                                }
                            }
                        ]
                        logger.info(f"Synthetische subdevicelist erstellt für device_id {device_id}")
                
                # Format 1: Prüfe, ob subdevicelist vorhanden aber leer ist
                if 'subdevicelist' in message and (
                    not isinstance(message['subdevicelist'], list) or 
                    len(message['subdevicelist']) == 0
                ):
                    logger.warning(f"subdevicelist ist leer oder kein Array, füge Dummy-Eintrag hinzu")
                    message['subdevicelist'] = [{"id": "unknown", "value": {}}]
            
            # Kontext vorbereiten
            context = {
                'message': message,  # Direkter Zugriff auf die Nachricht
                'uuid': uuid_str,
                'timestamp': int(time.time()),
                'gateway_id': gateway_id,
                'customer_config': customer_config
            }
            
            # Transformation durchführen
            result = self._transform_recursive(template_data.get('transform', {}), env, context)
            
            # Falls ein Gateway-Value in der Nachricht enthalten ist, übernehmen
            if 'gateway' in data and isinstance(data['gateway'], dict):
                result['gateway'] = data['gateway']
            
            # UUID und Timestamp hinzufügen
            result['_uuid'] = uuid_str
            result['_timestamp'] = int(time.time())
            
            logger.info(f"Transformation mit Template '{template_name}' erfolgreich")
            return result
        
        except Exception as e:
            logger.error(f"Fehler bei der Transformation mit Template '{template_name}': {str(e)}")
            import traceback
            logger.error(f"Stacktrace: {traceback.format_exc()}")
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

    def _transform_recursive(self, transform, env, context):
        """
        Hilfsfunktion zur rekursiven Transformation von Nachrichten
        
        Args:
            transform: Transformations-Daten
            env: Jinja2-Umgebung
            context: Transformationskontext
            
        Returns:
            Transformierte Nachricht
        """
        if isinstance(transform, dict):
            result = {}
            for key, value in transform.items():
                result[key] = self._transform_recursive(value, env, context)
            return result
        elif isinstance(transform, list):
            return [self._transform_recursive(item, env, context) for item in transform]
        elif isinstance(transform, str):
            template = env.from_string(transform)
            return template.render(**context)
        else:
            return transform

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
        # Entferne den Standardendpunkt für evAlarm (Sicherheitsrisiko)
        self.endpoints = {}
        
        # Kunden mit evAlarm-Konfiguration aus der Datenbank laden
        try:
            customers = self.Customer.find_all()
            for customer in customers:
                if customer.evalarm_username and customer.evalarm_password:
                    customer_id = str(customer._id)
                    self.endpoints[f'customer_{customer_id}'] = {
                        'url': customer.evalarm_url,  # Kundenspezifische URL verwenden
                        'auth': (customer.evalarm_username, customer.evalarm_password),
                        'headers': {
                            'Content-Type': 'application/json',
                            'X-EVALARM-API-VERSION': '2.1.5'
                        },
                        'customer': customer
                    }
            logger.info(f"Endpunkte für {len(self.endpoints)} Kunden geladen")
        except Exception as e:
            logger.error(f"Fehler beim Laden der Kundenendpunkte: {str(e)}")
    
    def get_endpoint_names(self):
        """
        Gibt die Namen aller verfügbaren Endpunkte zurück
        
        Returns:
            Liste der Endpunkt-Namen
        """
        return list(self.endpoints.keys())
    
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
            Name des Endpunkts oder None, wenn kein passender Endpunkt gefunden wurde
        """
        try:
            # Prüfe zunächst, ob das Gateway überhaupt existiert
            gateway = self.Gateway.find_by_uuid(gateway_uuid)
            if not gateway:
                logger.error(f"Weiterleitung blockiert: Gateway {gateway_uuid} existiert nicht in der Datenbank")
                return None
            
            # Prüfe ob das Gateway einem Kunden zugeordnet ist
            if not gateway.customer_id:
                logger.error(f"Weiterleitung blockiert: Gateway {gateway_uuid} ist keinem Kunden zugeordnet")
                return None
            
            # Hole den Kunden
            customer = self.Customer.find_by_id(gateway.customer_id)
            if not customer:
                logger.error(f"Weiterleitung blockiert: Kunde für Gateway {gateway_uuid} nicht gefunden")
                return None
            
            # Prüfe ob der Kunde aktiv ist
            if customer.status != "active":
                logger.error(f"Weiterleitung blockiert: Kunde {customer.name} ist nicht aktiv")
                return None
            
            # Prüfe ob der Kunde evAlarm-Zugangsdaten hat
            if not customer.evalarm_username or not customer.evalarm_password:
                logger.error(f"Weiterleitung blockiert: Kunde {customer.name} hat keine evAlarm-Zugangsdaten")
                return None
            
            # Wenn alle Prüfungen bestanden wurden, gib den Endpunkt zurück
            customer_id = str(customer._id)
            endpoint_name = f'customer_{customer_id}'
            if endpoint_name in self.endpoints:
                return endpoint_name
                
            # Wenn der Endpunkt nicht gefunden wurde, lade die Endpunkte neu
            logger.warning(f"Endpunkt für Kunde {customer.name} nicht gefunden, lade Endpunkte neu")
            self.load_endpoints()
            
            # Prüfe erneut, ob der Endpunkt jetzt existiert
            if endpoint_name in self.endpoints:
                return endpoint_name
            
        except Exception as e:
            logger.error(f"Fehler beim Ermitteln des Endpunkts für Gateway {gateway_uuid}: {str(e)}")
        
        # Wenn keine der Prüfungen erfolgreich war, blockiere die Weiterleitung
        logger.error(f"Weiterleitung blockiert: Kein gültiger Endpunkt für Gateway {gateway_uuid} gefunden")
        return None
    
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
            if endpoint_name:
                logger.info(f"Automatisch Endpunkt '{endpoint_name}' für Gateway {gateway_uuid} ermittelt")
            else:
                # Speichere blockierte Nachrichten für spätere Analyse
                self._save_blocked_message(message, gateway_uuid, "Kein gültiger Endpunkt gefunden")
                logger.error(f"SICHERHEITSWARNUNG: Kein Endpunkt für Gateway {gateway_uuid} gefunden - Weiterleitung verweigert")
                return None
        
        # Prüfe ob ein gültiger Endpunkt vorliegt
        if not endpoint_name or endpoint_name not in self.endpoints:
            # Speichere blockierte Nachrichten für spätere Analyse
            self._save_blocked_message(message, gateway_uuid, f"Endpunkt '{endpoint_name}' nicht gefunden oder ungültig")
            logger.error(f"Endpunkt '{endpoint_name}' nicht gefunden oder ungültig - Weiterleitung nicht möglich")
            return None
            
        # Hier laden wir die Kundenkonfiguration aus der Datei
        import os
        import json
        
        PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        config_path = os.path.join(PROJECT_DIR, 'templates', 'customer_config.json')
        
        customer_config = None
        try:
            with open(config_path, 'r') as f:
                config = json.load(f)
                for customer_id, customer in config['customers'].items():
                    if gateway_uuid in customer.get('gateways', []):
                        customer_config = customer
                        break
        except Exception as e:
            logger.error(f"Fehler beim Laden der Kundenkonfiguration: {str(e)}")
        
        if not customer_config and gateway_uuid:
            logger.warning(f"Kein Kunde für Gateway {gateway_uuid} gefunden")
            # SICHERHEITSÄNDERUNG: Blockiere Weiterleitung für nicht zugeordnete Gateways
            logger.error(f"SICHERHEITSWARNUNG: Weiterleitung für nicht zugeordnetes Gateway {gateway_uuid} blockiert")
            return None
        
        if endpoint_name not in self.endpoints and customer_config:
            # Dynamischen Endpunkt erstellen aus customer_config
            self.endpoints[endpoint_name] = {
                'url': customer_config['api_config']['url'],
                'auth': (customer_config['api_config']['username'], customer_config['api_config']['password']),
                'headers': customer_config['api_config']['headers']
            }
            logger.info(f"Dynamischen Endpunkt '{endpoint_name}' für Kunde {customer_config['name']} erstellt")
        
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
            # Log request and response
            logger.info(f"Sende Anfrage an {endpoint['url']}:")
            logger.info(f"Headers: {endpoint.get('headers', {})}")
            logger.info(f"Payload: {json.dumps(message)}")
            
            response = requests.post(
                endpoint['url'],
                json=message,
                headers=endpoint.get('headers', {}),
                auth=endpoint.get('auth', None),
                timeout=10,
                verify=False  # SSL-Zertifikat-Verifizierung für Testzwecke deaktivieren
            )
            
            # Log response details
            logger.info(f"Response Status: {response.status_code}")
            logger.info(f"Response Body: {response.text[:500] if response.text else 'Empty'}")
            
            logger.info(f"Nachricht an '{endpoint_name}' weitergeleitet, Status: {response.status_code}")
            return response
        
        except Exception as e:
            logger.error(f"Fehler bei der Weiterleitung an '{endpoint_name}': {str(e)}")
            return None

    def _save_blocked_message(self, message, gateway_uuid, reason):
        """
        Speichert blockierte Nachrichten in einem speziellen Verzeichnis zur späteren Analyse
        
        Args:
            message: Die blockierte Nachricht
            gateway_uuid: UUID des Gateways
            reason: Grund für die Blockierung
        """
        try:
            import os
            import json
            from datetime import datetime
            
            # Stelle sicher, dass das Verzeichnis existiert
            PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            blocked_dir = os.path.join(PROJECT_DIR, 'data', 'security_logs')
            os.makedirs(blocked_dir, exist_ok=True)
            
            # Erstelle einen eindeutigen Dateinamen
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f"blocked_{timestamp}_{gateway_uuid}_{hash(str(message))}.json"
            file_path = os.path.join(blocked_dir, filename)
            
            # Speichere die Nachricht mit Metadaten
            log_data = {
                "timestamp": datetime.now().isoformat(),
                "gateway_uuid": gateway_uuid,
                "reason": reason,
                "message": message
            }
            
            with open(file_path, 'w') as f:
                json.dump(log_data, f, indent=2)
                
            logger.info(f"Blockierte Nachricht gespeichert in {file_path}")
            
        except Exception as e:
            logger.error(f"Fehler beim Speichern der blockierten Nachricht: {str(e)}")
