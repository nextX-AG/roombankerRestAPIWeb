"""
Test-Skript für die NormalizedTemplateEngine

Dieses Skript testet die Funktionalität der NormalizedTemplateEngine,
insbesondere die Integration mit dem FilterRuleSystem und die Transformationsfähigkeiten.
"""

import json
import os
import sys
import unittest
from datetime import datetime

# Füge das Stammverzeichnis zum Pythonpfad hinzu für Importe
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Importiere die zu testenden Komponenten
from utils.normalized_template_engine import NormalizedTemplateEngine
from utils.message_normalizer import MessageNormalizer
from utils.filter_rules import FilterRuleEngine, ValueComparisonRule, RangeRule, RegexRule

# Konfiguriere das Testverzeichnis
TEST_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'test_data')
TEMPLATES_DIR = os.path.join(TEST_DIR, 'templates')
FILTER_RULES_DIR = os.path.join(TEST_DIR, 'filter_rules')

# Erstelle die Testverzeichnisse, falls sie nicht existieren
os.makedirs(TEMPLATES_DIR, exist_ok=True)
os.makedirs(FILTER_RULES_DIR, exist_ok=True)

class TestNormalizedTemplateEngine(unittest.TestCase):
    """Test-Suite für die NormalizedTemplateEngine"""
    
    def setUp(self):
        """Bereite jeden Test vor, indem Testdaten erstellt werden"""
        # Erstelle einen MessageNormalizer
        self.normalizer = MessageNormalizer()
        
        # Erstelle eine Template-Engine
        self.template_engine = NormalizedTemplateEngine(TEMPLATES_DIR, FILTER_RULES_DIR)
        
        # Erstelle Testdaten
        self._create_test_data()
    
    def _create_test_data(self):
        """Erstellt Testdaten für die Tests"""
        # Beispiel-Template erstellen
        template = {
            "name": "test_template",
            "description": "Test-Template mit Filterregeln",
            "created_at": datetime.now().isoformat(),
            "filter_rules": ["panic_alarm", "battery_ok"],
            "transform": {
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
        }
        
        # Template speichern
        with open(os.path.join(TEMPLATES_DIR, 'test_template.json'), 'w') as f:
            json.dump(template, f, indent=2)
        
        # Filterregeln erstellen
        filter_rules = {
            "panic_alarm": {
                "name": "panic_alarm",
                "type": "ValueComparisonRule",
                "description": "Filtert Panic-Button-Alarme",
                "field_path": "devices[0].values.alarmtype",
                "expected_value": "panic"
            },
            "battery_ok": {
                "name": "battery_ok",
                "type": "ValueComparisonRule", 
                "description": "Prüft, ob der Batteriestatus 'connected' ist",
                "field_path": "devices[0].values.batterystatus",
                "expected_value": "connected"
            },
            "temperature_range": {
                "name": "temperature_range",
                "type": "RangeRule",
                "description": "Prüft, ob die Temperatur im Bereich liegt",
                "field_path": "devices[0].values.temperature",
                "min_value": 18,
                "max_value": 30
            }
        }
        
        # Filterregeln speichern
        with open(os.path.join(FILTER_RULES_DIR, 'test_rules.json'), 'w') as f:
            json.dump(filter_rules, f, indent=2)
    
    def test_template_loading(self):
        """Testet das Laden von Templates"""
        # Lade die Templates neu
        self.template_engine.reload()
        
        # Prüfe, ob das Beispiel-Template geladen wurde
        templates = self.template_engine.get_template_names()
        self.assertIn('test_template', templates)
    
    def test_filter_rule_loading(self):
        """Testet das Laden von Filterregeln"""
        # Lade die Rules neu
        self.template_engine.reload()
        
        # Prüfe, ob die Filter-Engine die Regeln hat
        rule_names = self.template_engine.filter_engine.get_rule_names()
        self.assertIn('panic_alarm', rule_names)
        self.assertIn('battery_ok', rule_names)
        self.assertIn('temperature_range', rule_names)
    
    def test_message_filtering_passing(self):
        """Testet die Filterung von Nachrichten, die die Filterregeln erfüllen"""
        # Erstelle eine Testnachricht, die die Filterregeln erfüllt
        test_message = {
            "gateway_id": "gw-test",
            "message": {
                "code": 2030,
                "subdeviceid": 673922542395461,
                "alarmstatus": "alarm",
                "alarmtype": "panic",
                "batterystatus": "connected",
                "ts": 1747344697
            }
        }
        
        # Normalisiere die Nachricht
        normalized_message = self.normalizer.normalize(test_message)
        
        # Prüfe, ob die Nachricht weitergeleitet werden soll
        should_forward, matching_rules = self.template_engine.should_forward(normalized_message, 'test_template')
        
        # Die Nachricht sollte weitergeleitet werden
        self.assertTrue(should_forward)
        self.assertEqual(len(matching_rules), 2)  # Beide Regeln sollten matchen
    
    def test_message_filtering_failing(self):
        """Testet die Filterung von Nachrichten, die die Filterregeln nicht erfüllen"""
        # Erstelle eine Testnachricht, die die Filterregeln nicht erfüllt
        test_message = {
            "gateway_id": "gw-test",
            "message": {
                "code": 2030,
                "subdeviceid": 673922542395461,
                "alarmstatus": "alarm",
                "alarmtype": "smoke",  # Nicht "panic"
                "batterystatus": "connected",
                "ts": 1747344697
            }
        }
        
        # Normalisiere die Nachricht
        normalized_message = self.normalizer.normalize(test_message)
        
        # Prüfe, ob die Nachricht weitergeleitet werden soll
        should_forward, matching_rules = self.template_engine.should_forward(normalized_message, 'test_template')
        
        # Die Nachricht sollte nicht weitergeleitet werden
        self.assertFalse(should_forward)
        self.assertEqual(len(matching_rules), 1)  # Nur die battery_ok Regel sollte matchen
    
    def test_message_transformation(self):
        """Testet die Transformation von Nachrichten"""
        # Erstelle eine Testnachricht
        test_message = {
            "gateway_id": "gw-test",
            "message": {
                "code": 2030,
                "subdeviceid": 673922542395461,
                "alarmstatus": "alarm",
                "alarmtype": "panic",
                "batterystatus": "connected",
                "ts": 1747344697
            }
        }
        
        # Kundenkonfiguration
        customer_config = {
            "namespace": "test_namespace"
        }
        
        # Normalisiere die Nachricht
        normalized_message = self.normalizer.normalize(test_message)
        
        # Transformiere die Nachricht
        transformed = self.template_engine.transform(normalized_message, 'test_template', customer_config)
        
        # Prüfe die transformierte Nachricht
        self.assertIsNotNone(transformed)
        self.assertIn('events', transformed)
        self.assertEqual(len(transformed['events']), 1)
        
        event = transformed['events'][0]
        self.assertEqual(event['message'], 'panic')
        self.assertEqual(event['namespace'], 'test_namespace')
        self.assertEqual(event['device_id'], '673922542395461')
    
    def test_template_generation(self):
        """Testet die automatische Generierung von Templates"""
        # Erstelle eine Testnachricht
        test_message = {
            "gateway_id": "gw-test",
            "message": {
                "code": 2030,
                "subdeviceid": 673922542395461,
                "alarmstatus": "alarm",
                "alarmtype": "panic",
                "batterystatus": "connected",
                "ts": 1747344697
            }
        }
        
        # Normalisiere die Nachricht
        normalized_message = self.normalizer.normalize(test_message)
        
        # Generiere ein Template
        template_name = "generated_template"
        template = self.template_engine.generate_template(normalized_message, template_name)
        
        # Prüfe das generierte Template
        self.assertIsNotNone(template)
        self.assertEqual(template['name'], template_name)
        self.assertIn('transform', template)
        
        # Prüfe, ob das Template in der Engine registriert wurde
        templates = self.template_engine.get_template_names()
        self.assertIn(template_name, templates)
    
    def tearDown(self):
        """Aufräumen nach jedem Test"""
        # Entferne die Testdateien
        for filename in os.listdir(TEMPLATES_DIR):
            os.remove(os.path.join(TEMPLATES_DIR, filename))
        
        for filename in os.listdir(FILTER_RULES_DIR):
            os.remove(os.path.join(FILTER_RULES_DIR, filename))

if __name__ == '__main__':
    unittest.main() 