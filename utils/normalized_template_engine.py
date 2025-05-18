"""
Normalized Template Engine - Komponente des Nachrichtenverarbeitungssystems

Diese Komponente ist verantwortlich für die Transformation von normalisierten Nachrichten
in verschiedene Zielformate basierend auf konfigurierbaren Templates.
Sie integriert das Filterregel-System zur Steuerung der Weiterleitung.
"""

import json
import yaml
import jinja2
import logging
import os
import time
import uuid
from datetime import datetime
from typing import Dict, List, Any, Optional, Union, Tuple

# Importiere das Filter Rules System
from utils.filter_rules import FilterRuleEngine, FilterRule, ValueComparisonRule, RangeRule, RegexRule, ListContainsRule, AndRule, OrRule

# Konfiguriere Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('normalized-template-engine')

class NormalizedTemplateEngine:
    """
    Template-Engine für die Transformation normalisierter Nachrichten
    basierend auf konfigurierbaren Templates mit integrierten Filterregeln.
    """
    
    def __init__(self, templates_dir: str, filter_rules_dir: str = None):
        """
        Initialisiert die Template-Engine
        
        Args:
            templates_dir: Verzeichnis, in dem die Templates gespeichert sind
            filter_rules_dir: Verzeichnis für Filter-Regeln (optional)
        """
        self.templates_dir = templates_dir
        self.filter_rules_dir = filter_rules_dir or os.path.join(templates_dir, 'filter_rules')
        
        # Stelle sicher, dass die Verzeichnisse existieren
        os.makedirs(self.templates_dir, exist_ok=True)
        os.makedirs(self.filter_rules_dir, exist_ok=True)
        
        # Jinja2-Umgebung einrichten
        self.jinja_env = jinja2.Environment(
            loader=jinja2.FileSystemLoader(templates_dir),
            autoescape=jinja2.select_autoescape(['html', 'xml'])
        )
        
        # Nützliche Filter und Funktionen registrieren
        self._register_jinja_filters()
        self._register_jinja_functions()
        
        # Templates und Filter Rules laden
        self.templates = {}
        self.filter_engine = FilterRuleEngine()
        self.load_templates()
        self.load_filter_rules()
    
    def _register_jinja_filters(self):
        """Registriert nützliche Filter für Jinja-Templates"""
        # JSON-Serialisierung
        self.jinja_env.filters['tojson'] = lambda obj, **kwargs: json.dumps(obj, **kwargs)
        
        # Formatierungsfilter
        self.jinja_env.filters['datetime'] = lambda timestamp: time.strftime(
            '%Y-%m-%d %H:%M:%S', 
            time.localtime(timestamp if isinstance(timestamp, (int, float)) else time.time())
        )
        
        # Typ-Konvertierungsfilter
        self.jinja_env.filters['int'] = lambda value, default=0: int(value) if value is not None else default
        self.jinja_env.filters['float'] = lambda value, default=0.0: float(value) if value is not None else default
        self.jinja_env.filters['str'] = lambda value, default='': str(value) if value is not None else default
        self.jinja_env.filters['bool'] = lambda value: bool(value)
        
        # Array-Manipulationsfilter
        self.jinja_env.filters['first'] = lambda arr, default=None: arr[0] if arr and len(arr) > 0 else default
        self.jinja_env.filters['last'] = lambda arr, default=None: arr[-1] if arr and len(arr) > 0 else default
        self.jinja_env.filters['join'] = lambda arr, separator=',': separator.join([str(item) for item in arr]) if arr else ''
    
    def _register_jinja_functions(self):
        """Registriert nützliche Funktionen für Jinja-Templates"""
        # Zeitfunktionen
        self.jinja_env.globals['now'] = time.time
        self.jinja_env.globals['uuid'] = lambda: str(uuid.uuid4())
        
        # Hilfsfunktionen für Datenzugriff
        self.jinja_env.globals['get_device_by_type'] = self._get_device_by_type
        self.jinja_env.globals['get_device_value'] = self._get_device_value
        self.jinja_env.globals['get_gateway_metadata'] = self._get_gateway_metadata
    
    def _get_device_by_type(self, devices: List[Dict[str, Any]], device_type: str) -> Optional[Dict[str, Any]]:
        """
        Findet ein Gerät nach Typ in der Liste der Geräte
        
        Args:
            devices: Liste der Geräte aus der normalisierten Nachricht
            device_type: Zu suchender Gerätetyp
            
        Returns:
            Das erste Gerät des angegebenen Typs oder None
        """
        for device in devices:
            if device.get('type') == device_type:
                return device
        return None
    
    def _get_device_value(self, device: Dict[str, Any], value_key: str, default: Any = None) -> Any:
        """
        Holt einen Wert aus den Gerätedaten
        
        Args:
            device: Gerätedaten
            value_key: Schlüssel für den Wert
            default: Standardwert, wenn der Schlüssel nicht existiert
            
        Returns:
            Der Wert oder der Standardwert
        """
        if not device or 'values' not in device:
            return default
        return device['values'].get(value_key, default)
    
    def _get_gateway_metadata(self, gateway: Dict[str, Any], key: str, default: Any = None) -> Any:
        """
        Holt einen Metadatenwert aus den Gateway-Daten
        
        Args:
            gateway: Gateway-Daten
            key: Schlüssel für den Wert
            default: Standardwert, wenn der Schlüssel nicht existiert
            
        Returns:
            Der Wert oder der Standardwert
        """
        if not gateway or 'metadata' not in gateway:
            return default
        return gateway['metadata'].get(key, default)
    
    def load_templates(self):
        """
        Lädt alle verfügbaren Templates aus dem Templates-Verzeichnis
        """
        logger.info(f"Lade Templates aus {self.templates_dir}")
        
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
                    
                    # Validiere das Template-Format
                    if not isinstance(template_data, dict):
                        logger.error(f"Ungültiges Template-Format für '{template_name}': Muss ein Dictionary sein")
                        continue
                    
                    if 'transform' not in template_data:
                        logger.error(f"Ungültiges Template-Format für '{template_name}': 'transform' fehlt")
                        continue
                    
                    self.templates[template_name] = {
                        'data': template_data,
                        'path': template_path,
                        'filter_rules': template_data.get('filter_rules', [])
                    }
                    logger.info(f"Template '{template_name}' geladen")
                    
                except Exception as e:
                    logger.error(f"Fehler beim Laden des Templates '{template_name}': {str(e)}")
    
    def load_filter_rules(self):
        """
        Lädt alle Filterregeln aus dem Filter-Rules-Verzeichnis
        """
        logger.info(f"Lade Filterregeln aus {self.filter_rules_dir}")
        
        for filename in os.listdir(self.filter_rules_dir):
            if filename.endswith('.json'):
                rules_path = os.path.join(self.filter_rules_dir, filename)
                
                try:
                    with open(rules_path, 'r') as f:
                        rules_data = json.load(f)
                    
                    for rule_name, rule_data in rules_data.items():
                        try:
                            # Erstelle die Filterregel basierend auf dem Typ
                            rule_type = rule_data.get('type')
                            
                            if rule_type == 'ValueComparisonRule':
                                rule = ValueComparisonRule(
                                    rule_data.get('name', rule_name),
                                    rule_data.get('field_path'),
                                    rule_data.get('expected_value')
                                )
                            elif rule_type == 'RangeRule':
                                rule = RangeRule(
                                    rule_data.get('name', rule_name),
                                    rule_data.get('field_path'),
                                    rule_data.get('min_value'),
                                    rule_data.get('max_value'),
                                    rule_data.get('inclusive', True)
                                )
                            elif rule_type == 'RegexRule':
                                rule = RegexRule(
                                    rule_data.get('name', rule_name),
                                    rule_data.get('field_path'),
                                    rule_data.get('pattern')
                                )
                            elif rule_type == 'ListContainsRule':
                                rule = ListContainsRule(
                                    rule_data.get('name', rule_name),
                                    rule_data.get('field_path'),
                                    rule_data.get('allowed_values', [])
                                )
                            elif rule_type == 'AndRule':
                                # Für AND/OR-Regeln, erstelle zunächst die Unterregeln
                                subrule_names = rule_data.get('rules', [])
                                subrules = []
                                
                                # Stelle sicher, dass die referenzierten Regeln bereits geladen wurden
                                for subrule_name in subrule_names:
                                    if self.filter_engine.has_rule(subrule_name):
                                        subrules.append(self.filter_engine.get_rule(subrule_name))
                                    else:
                                        logger.warning(f"Unterregel '{subrule_name}' für AND-Regel '{rule_name}' nicht gefunden")
                                
                                rule = AndRule(
                                    rule_data.get('name', rule_name),
                                    subrules
                                )
                            elif rule_type == 'OrRule':
                                # Für OR-Regeln
                                subrule_names = rule_data.get('rules', [])
                                subrules = []
                                
                                for subrule_name in subrule_names:
                                    if self.filter_engine.has_rule(subrule_name):
                                        subrules.append(self.filter_engine.get_rule(subrule_name))
                                    else:
                                        logger.warning(f"Unterregel '{subrule_name}' für OR-Regel '{rule_name}' nicht gefunden")
                                
                                rule = OrRule(
                                    rule_data.get('name', rule_name),
                                    subrules
                                )
                            else:
                                logger.error(f"Unbekannter Regeltyp '{rule_type}' für Regel '{rule_name}'")
                                continue
                            
                            # Füge die Regel zur Engine hinzu
                            self.filter_engine.add_rule(rule)
                            logger.info(f"Filterregel '{rule_name}' geladen")
                        except Exception as rule_error:
                            logger.error(f"Fehler beim Laden der Filterregel '{rule_name}': {str(rule_error)}")
                
                except Exception as e:
                    logger.error(f"Fehler beim Laden der Filterregeln aus '{filename}': {str(e)}")
    
    def reload(self):
        """
        Lädt alle Templates und Filterregeln neu
        """
        self.templates = {}
        self.filter_engine = FilterRuleEngine()
        self.load_templates()
        self.load_filter_rules()
    
    def get_template_names(self) -> List[str]:
        """
        Gibt die Namen aller verfügbaren Templates zurück
        
        Returns:
            Liste der Template-Namen
        """
        return list(self.templates.keys())
    
    def get_template(self, template_name: str) -> Optional[Dict[str, Any]]:
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
            'path': template_data['path'],
            'filter_rules': template_data.get('filter_rules', [])
        }
    
    def should_forward(self, normalized_message: Dict[str, Any], template_name: str) -> Tuple[bool, List[str]]:
        """
        Prüft, ob eine Nachricht basierend auf den Filterregeln weitergeleitet werden soll
        
        Args:
            normalized_message: Die normalisierte Nachricht
            template_name: Name des Templates, das verwendet werden soll
            
        Returns:
            Tuple aus (weiterleiten?, Liste der zutreffenden Regeln)
        """
        # Wenn das Template nicht existiert, nicht weiterleiten
        if template_name not in self.templates:
            logger.error(f"Template '{template_name}' nicht gefunden")
            return False, []
        
        # Hole die Filterregeln für das Template
        template = self.templates[template_name]
        rule_names = template.get('filter_rules', [])
        
        # Wenn keine Filterregeln definiert sind, immer weiterleiten
        if not rule_names:
            logger.info(f"Keine Filterregeln für Template '{template_name}', leite weiter")
            return True, []
        
        # Prüfe die Filterregeln
        should_forward = self.filter_engine.should_forward(normalized_message, rule_names)
        matching_rules = self.filter_engine.get_matching_rules(normalized_message)
        
        if should_forward:
            logger.info(f"Nachricht sollte weitergeleitet werden, passende Regeln: {matching_rules}")
        else:
            logger.info(f"Nachricht sollte NICHT weitergeleitet werden, keine passenden Regeln")
        
        return should_forward, matching_rules
    
    def transform(self, normalized_message: Dict[str, Any], template_name: str, 
                  customer_config: Dict[str, Any] = None) -> Optional[Dict[str, Any]]:
        """
        Transformiert eine normalisierte Nachricht basierend auf einem Template
        
        Args:
            normalized_message: Die normalisierte Nachricht
            template_name: Name des zu verwendenden Templates
            customer_config: Kundenkonfiguration (optional)
            
        Returns:
            Transformierte Nachricht oder None bei Fehler
        """
        # Prüfe, ob das Template existiert
        if template_name not in self.templates:
            logger.error(f"Template '{template_name}' nicht gefunden")
            return None
        
        # Hole die Template-Daten
        template = self.templates[template_name]
        template_data = template['data']
        
        try:
            # Gateway-ID und Geräte-ID extrahieren
            gateway_id = normalized_message.get('gateway', {}).get('id', 'unknown_gateway')
            
            # Kontext für die Transformation vorbereiten
            message_uuid = str(uuid.uuid4())
            timestamp = int(time.time())
            
            context = {
                'message': normalized_message,
                'gateway': normalized_message.get('gateway', {}),
                'devices': normalized_message.get('devices', []),
                'metadata': normalized_message.get('metadata', {}),
                'uuid': message_uuid,
                'timestamp': timestamp,
                'gateway_id': gateway_id,
                'customer_config': customer_config or {}
            }
            
            # Transformation durchführen
            result = self._transform_recursive(template_data.get('transform', {}), context)
            
            # Metadaten hinzufügen
            result['_uuid'] = message_uuid
            result['_timestamp'] = timestamp
            result['_template'] = template_name
            result['_gateway_id'] = gateway_id
            
            logger.info(f"Transformation mit Template '{template_name}' erfolgreich")
            return result
            
        except Exception as e:
            logger.error(f"Fehler bei der Transformation mit Template '{template_name}': {str(e)}")
            import traceback
            logger.error(f"Stacktrace: {traceback.format_exc()}")
            return None
    
    def _transform_recursive(self, transform: Any, context: Dict[str, Any]) -> Any:
        """
        Hilfsfunktion zur rekursiven Transformation von Nachrichten
        
        Args:
            transform: Transformations-Daten (kann ein Dictionary, eine Liste oder ein String sein)
            context: Transformationskontext mit allen Variablen
            
        Returns:
            Transformierte Daten
        """
        if isinstance(transform, dict):
            # Dictionary rekursiv transformieren
            result = {}
            for key, value in transform.items():
                # Schlüssel können auch Templates sein
                transformed_key = self._transform_string(key, context)
                transformed_value = self._transform_recursive(value, context)
                result[transformed_key] = transformed_value
            return result
            
        elif isinstance(transform, list):
            # Liste rekursiv transformieren
            return [self._transform_recursive(item, context) for item in transform]
            
        elif isinstance(transform, str):
            # String als Jinja2-Template transformieren
            return self._transform_string(transform, context)
            
        else:
            # Andere Werte unverändert zurückgeben
            return transform
    
    def _transform_string(self, template_str: str, context: Dict[str, Any]) -> Any:
        """
        Transformiert einen String mit Jinja2
        
        Args:
            template_str: Der Template-String
            context: Transformationskontext
            
        Returns:
            Transformierter Wert (kann ein String, eine Zahl, ein Boolean, etc. sein)
        """
        # Prüfe, ob der String tatsächlich ein Template ist
        if '{{' not in template_str and '{%' not in template_str:
            return template_str
        
        # Template erstellen und rendern
        template = self.jinja_env.from_string(template_str)
        result_str = template.render(**context)
        
        # Versuche, den String in einen nativen Typ zu konvertieren
        try:
            # Versuche als JSON zu parsen (für Objekte, Arrays, etc.)
            return json.loads(result_str)
        except (json.JSONDecodeError, ValueError):
            # Versuche als Zahl oder Boolean zu interpretieren
            if result_str.lower() == 'true':
                return True
            elif result_str.lower() == 'false':
                return False
            elif result_str.isdigit():
                return int(result_str)
            elif result_str.replace('.', '', 1).isdigit() and result_str.count('.') == 1:
                return float(result_str)
            else:
                # Sonst als String belassen
                return result_str
    
    def generate_template(self, normalized_message: Dict[str, Any], 
                          template_name: str, description: str = None) -> Dict[str, Any]:
        """
        Generiert ein Template basierend auf einer normalisierten Nachricht
        
        Args:
            normalized_message: Die normalisierte Nachricht
            template_name: Name des zu erstellenden Templates
            description: Optionale Beschreibung des Templates
            
        Returns:
            Template-Daten als Dictionary
        """
        # Beispielformat für das Ziel bestimmen (hier: evAlarm)
        target_format = {
            "events": [
                {
                    "message": "{{ devices[0].values.alarmtype | default('Alarm') }}",
                    "address": "0",
                    "namespace": "{{ customer_config.namespace | default('default') }}",
                    "id": "{{ timestamp }}",
                    "device_id": "{{ devices[0].id }}"
                }
            ]
        }
        
        # Template erstellen
        template = {
            "name": template_name,
            "description": description or f"Automatisch generiertes Template für {template_name}",
            "created_at": datetime.now().isoformat(),
            "filter_rules": [],
            "transform": target_format
        }
        
        # Template-Pfad erstellen
        template_path = os.path.join(self.templates_dir, f"{template_name}.json")
        
        # Template speichern
        try:
            with open(template_path, 'w') as f:
                json.dump(template, f, indent=2)
            logger.info(f"Template '{template_name}' generiert und gespeichert in {template_path}")
            
            # Template laden
            self.templates[template_name] = {
                'data': template,
                'path': template_path,
                'filter_rules': []
            }
            
            return template
            
        except Exception as e:
            logger.error(f"Fehler beim Speichern des generierten Templates '{template_name}': {str(e)}")
            return template

# Beispiel für die Verwendung der NormalizedTemplateEngine
if __name__ == "__main__":
    from datetime import datetime
    
    # Importiere den MessageNormalizer für Tests
    from utils.message_normalizer import MessageNormalizer
    
    # Beispielnachricht
    test_message = {
        "gateway_id": "gw-c490b022-cc18-407e-a07e-a355747a8fdd",
        "message": {
            "code": 2030,
            "subdeviceid": 673922542395461,
            "alarmstatus": "alarm",
            "alarmtype": "panic",
            "ts": 1747344697
        }
    }
    
    # Normalisiere die Nachricht
    normalizer = MessageNormalizer()
    normalized_message = normalizer.normalize(test_message)
    
    # Initialisiere die Template-Engine
    template_engine = NormalizedTemplateEngine("./templates", "./templates/filter_rules")
    
    # Generiere ein Beispiel-Template
    template_name = "test_template"
    template = template_engine.generate_template(normalized_message, template_name)
    
    # Transformiere die Nachricht mit dem generierten Template
    transformed = template_engine.transform(normalized_message, template_name)
    
    print(f"Normalisierte Nachricht: {json.dumps(normalized_message, indent=2)}")
    print("-" * 80)
    print(f"Generiertes Template: {json.dumps(template, indent=2)}")
    print("-" * 80)
    print(f"Transformierte Nachricht: {json.dumps(transformed, indent=2)}") 