"""
Template-Selector für intelligente Template-Auswahl basierend auf Template-Gruppen
"""

import logging
import json
from typing import Dict, Any, Optional, List

logger = logging.getLogger(__name__)

def select_template_for_message(gateway: Any, message: Dict[str, Any]) -> str:
    """
    Wählt das passende Template für eine Nachricht basierend auf der Template-Gruppe des Gateways
    
    Args:
        gateway: Gateway-Objekt aus der Datenbank
        message: Die zu verarbeitende Nachricht
        
    Returns:
        Template-Name (ID) für die Transformation
    """
    # Fallback, wenn kein Gateway-Objekt vorhanden
    if not gateway:
        logger.warning("Kein Gateway-Objekt für Template-Auswahl verfügbar")
        return _fallback_template_selection(message)
    
    # Prüfe, ob das Gateway eine Template-Gruppe hat
    if hasattr(gateway, 'template_group_id') and gateway.template_group_id:
        logger.info(f"Gateway {gateway.uuid} hat Template-Gruppe: {gateway.template_group_id}")
        
        try:
            # Importiere TemplateGroup hier, um zirkuläre Imports zu vermeiden
            from api.models import TemplateGroup
            
            # Hole die Template-Gruppe
            template_group = TemplateGroup.find_by_id(gateway.template_group_id)
            
            if template_group:
                # Normalisiere die Nachricht für bessere Filterung
                normalized = _normalize_message(message)
                
                # Gehe durch alle Templates der Gruppe (sortiert nach Priorität)
                sorted_templates = sorted(
                    template_group.templates, 
                    key=lambda t: t.get('priority', 0), 
                    reverse=True
                )
                
                for template_config in sorted_templates:
                    template_id = template_config.get('template_id')
                    
                    if not template_id:
                        continue
                    
                    # Hole das Template und prüfe die Filterregeln
                    from utils.template_store import Template
                    template = Template().get(template_id)
                    
                    if template:
                        # Parse den Template-Code
                        try:
                            template_dict = json.loads(template.get('template_code', '{}'))
                            filter_rules = template_dict.get('filter_rules', [])
                            
                            # Wenn keine Filterregeln definiert sind, wähle dieses Template
                            if not filter_rules:
                                logger.info(f"Template {template_id} hat keine Filterregeln, wird ausgewählt")
                                return template_id
                            
                            # Prüfe die Filterregeln
                            if _check_filter_rules(normalized, filter_rules):
                                logger.info(f"Template {template_id} erfüllt alle Filterregeln")
                                return template_id
                        except Exception as e:
                            logger.error(f"Fehler beim Parsen des Templates {template_id}: {e}")
                
                logger.warning(f"Kein passendes Template in Gruppe {gateway.template_group_id} gefunden")
            else:
                logger.warning(f"Template-Gruppe {gateway.template_group_id} nicht gefunden")
                
        except Exception as e:
            logger.error(f"Fehler bei der Template-Gruppen-Auswahl: {e}")
    
    # Fallback auf alte template_id, wenn keine Gruppe definiert
    elif hasattr(gateway, 'template_id') and gateway.template_id:
        logger.info(f"Gateway {gateway.uuid} nutzt einzelnes Template: {gateway.template_id}")
        return gateway.template_id
    
    # Finale Fallback-Logik
    return _fallback_template_selection(message)

def _normalize_message(message: Dict[str, Any]) -> Dict[str, Any]:
    """
    Normalisiert eine Nachricht für bessere Filterung
    Extrahiert relevante Daten aus verschiedenen Nachrichtenformaten
    """
    normalized = {
        'gateway': {},
        'devices': [],
        'raw': message
    }
    
    # Gateway-Daten extrahieren
    if 'gateway' in message and isinstance(message['gateway'], dict):
        normalized['gateway'] = message['gateway']
    
    # Geräte-Daten extrahieren
    if 'subdevicelist' in message and isinstance(message['subdevicelist'], list):
        for device in message['subdevicelist']:
            if isinstance(device, dict):
                device_data = {
                    'id': device.get('id', 'unknown'),
                    'values': device.get('value', {})
                }
                normalized['devices'].append(device_data)
    
    # Alternative: Direkte Gerätewerte
    elif 'subdeviceid' in message:
        device_data = {
            'id': str(message['subdeviceid']),
            'values': {}
        }
        
        # Kopiere relevante Werte
        value_keys = ['alarmtype', 'alarmstatus', 'batterystatus', 'temperature', 'humidity']
        for key in value_keys:
            if key in message:
                device_data['values'][key] = message[key]
        
        normalized['devices'].append(device_data)
    
    return normalized

def _check_filter_rules(normalized: Dict[str, Any], filter_rule_ids: List[str]) -> bool:
    """
    Prüft, ob alle Filterregeln erfüllt sind
    """
    if not filter_rule_ids:
        return True
    
    try:
        # Importiere die Filterregel-Definitionen
        from utils.filter_rules import get_filter_rule
        
        for rule_id in filter_rule_ids:
            rule = get_filter_rule(rule_id)
            
            if not rule:
                logger.warning(f"Filterregel {rule_id} nicht gefunden")
                continue
            
            # Prüfe die Regel
            if not _evaluate_filter_rule(normalized, rule):
                return False
        
        return True
    except Exception as e:
        logger.error(f"Fehler beim Prüfen der Filterregeln: {e}")
        return False

def _evaluate_filter_rule(data: Dict[str, Any], rule: Dict[str, Any]) -> bool:
    """
    Evaluiert eine einzelne Filterregel
    """
    rule_type = rule.get('type')
    
    if rule_type == 'ValueComparisonRule':
        field_path = rule.get('field_path', '')
        expected_value = rule.get('expected_value')
        
        # Hole den Wert aus den Daten
        actual_value = _get_value_by_path(data, field_path)
        
        # Vergleiche die Werte
        return actual_value == expected_value
    
    elif rule_type == 'RangeRule':
        field_path = rule.get('field_path', '')
        min_value = rule.get('min_value')
        max_value = rule.get('max_value')
        inclusive = rule.get('inclusive', True)
        
        # Hole den Wert
        actual_value = _get_value_by_path(data, field_path)
        
        if actual_value is None:
            return False
        
        try:
            actual_value = float(actual_value)
            
            if inclusive:
                return min_value <= actual_value <= max_value
            else:
                return min_value < actual_value < max_value
        except:
            return False
    
    # Weitere Regeltypen können hier ergänzt werden
    
    logger.warning(f"Unbekannter Regeltyp: {rule_type}")
    return False

def _get_value_by_path(data: Dict[str, Any], path: str) -> Any:
    """
    Holt einen Wert aus verschachtelten Daten anhand eines Pfads
    Beispiel: "devices[0].values.temperature"
    """
    try:
        current = data
        
        # Teile den Pfad in Segmente
        segments = path.replace('[', '.').replace(']', '').split('.')
        
        for segment in segments:
            if not segment:
                continue
            
            # Prüfe auf Array-Index
            if segment.isdigit():
                index = int(segment)
                if isinstance(current, list) and 0 <= index < len(current):
                    current = current[index]
                else:
                    return None
            else:
                # Dictionary-Zugriff
                if isinstance(current, dict) and segment in current:
                    current = current[segment]
                else:
                    return None
        
        return current
    except Exception as e:
        logger.error(f"Fehler beim Pfad-Zugriff {path}: {e}")
        return None

def _fallback_template_selection(message: Dict[str, Any]) -> str:
    """
    Fallback-Logik für Template-Auswahl (alte Implementierung)
    """
    # Prüfen auf Panic-Alarm
    is_panic = False
    
    if isinstance(message, dict):
        # Format 1: Prüfung für subdevicelist
        if 'subdevicelist' in message:
            for device in message.get('subdevicelist', []):
                if isinstance(device, dict) and 'value' in device:
                    value = device.get('value', {})
                    if value.get('alarmstatus') == 'alarm' and value.get('alarmtype') == 'panic':
                        is_panic = True
                        break
        
        # Format 2: Direkte Code-Prüfung
        elif 'code' in message and message['code'] == 2030:
            is_panic = True
        
        # Format 3: Prüfung auf subdeviceid mit alarmtype
        elif 'subdeviceid' in message and 'alarmtype' in message and message['alarmtype'] == 'panic':
            is_panic = True
    
    # Template auswählen
    if is_panic:
        return 'evalarm_panic'
    else:
        return 'evalarm_status'  # Standard-Fallback 