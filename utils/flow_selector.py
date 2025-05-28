#!/usr/bin/env python3
"""
Flow Selector für intelligente Flow-Auswahl basierend auf Flow-Gruppen

Dieser Selector ersetzt den Template Selector und wählt den passenden Flow
für eine Nachricht basierend auf:
- Gateway-spezifischen Flows für Gateway-Nachrichten
- Device-spezifischen Flows für Gerätenachrichten
- Prioritätsbasierte Auswahl innerhalb von Flow-Gruppen
- Legacy-Support für Templates
"""

import logging
from typing import Dict, Any, Optional, List
import os
import sys

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import models
from api.models import Gateway, Device, Flow, FlowGroup, TemplateGroup

# Import utilities
from utils.message_normalizer import MessageNormalizer
from utils.device_registry import device_registry
from utils.template_selector import select_template_for_message as legacy_template_selector

logger = logging.getLogger(__name__)


def is_gateway_message(message: Dict[str, Any]) -> bool:
    """
    Prüft, ob es sich um eine Gateway-spezifische Nachricht handelt
    
    Gateway-Nachrichten sind z.B.:
    - Heartbeat/Keep-Alive
    - Verbindungsstatus
    - Fehlerberichte
    - Aggregierte Statistiken
    """
    # Normalisierte Nachricht prüfen
    devices = message.get('devices', [])
    
    # Keine Geräte = wahrscheinlich Gateway-Nachricht
    if not devices:
        return True
        
    # Spezielle Gateway-Nachrichtentypen prüfen
    gateway_metadata = message.get('gateway', {}).get('metadata', {})
    if 'heartbeat' in gateway_metadata or 'connection_status' in gateway_metadata:
        return True
        
    # Nachrichtentyp prüfen
    if message.get('type') in ['gateway_status', 'heartbeat', 'error_report']:
        return True
        
    return False


def extract_device_id(message: Dict[str, Any]) -> Optional[str]:
    """Extrahiert die Device-ID aus einer normalisierten Nachricht"""
    devices = message.get('devices', [])
    if devices and len(devices) > 0:
        return devices[0].get('id')
    return None


def select_from_flow_group(flow_group_id: str, message: Dict[str, Any]) -> Optional[str]:
    """
    Wählt einen Flow aus einer Flow-Gruppe basierend auf Priorität und Filterregeln
    
    Args:
        flow_group_id: ID der Flow-Gruppe
        message: Normalisierte Nachricht
        
    Returns:
        Flow-ID oder None
    """
    try:
        # Flow-Gruppe laden
        flow_group = FlowGroup.find_by_id(flow_group_id)
        if not flow_group:
            logger.warning(f"Flow-Gruppe {flow_group_id} nicht gefunden")
            return None
            
        # Flows sind bereits nach Priorität sortiert (höchste zuerst)
        for flow_config in flow_group.flows:
            flow_id = flow_config.get('flow_id')
            
            # Flow laden
            flow = Flow.find_by_id(flow_id)
            if not flow:
                logger.warning(f"Flow {flow_id} aus Gruppe {flow_group_id} nicht gefunden")
                continue
                
            # Prüfe ob Flow auf die Nachricht passt
            # TODO: Hier könnte man die Filterregeln des ersten Steps prüfen
            # Für jetzt nehmen wir einfach den ersten Flow
            logger.info(f"Flow '{flow.name}' aus Gruppe ausgewählt (Priorität: {flow_config.get('priority')})")
            return flow_id
            
        logger.warning(f"Kein passender Flow in Gruppe {flow_group_id} gefunden")
        return None
        
    except Exception as e:
        logger.error(f"Fehler bei Flow-Auswahl aus Gruppe: {str(e)}")
        return None


def select_flow_for_message(gateway_id: str, message: Dict[str, Any]) -> Optional[str]:
    """
    Wählt den passenden Flow für eine Nachricht
    
    Hierarchie:
    1. Gateway-Flow für Gateway-Nachrichten
    2. Device-Flow für Geräte-Nachrichten
    3. Legacy-Template-Support
    
    Args:
        gateway_id: Gateway-ID
        message: Die zu verarbeitende Nachricht (sollte normalisiert sein)
        
    Returns:
        Flow-ID oder None
    """
    try:
        # Nachricht normalisieren falls nötig
        if 'gateway' not in message or 'devices' not in message:
            normalizer = MessageNormalizer()
            message = normalizer.normalize(message)
            
        # 1. Prüfen ob es eine Gateway-Nachricht ist
        if is_gateway_message(message):
            logger.info("Gateway-Nachricht erkannt, suche Gateway-Flow")
            
            gateway = Gateway.find_by_uuid(gateway_id)
            if gateway:
                if gateway.flow_group_id:
                    logger.info(f"Verwende Gateway-Flow-Gruppe: {gateway.flow_group_id}")
                    flow_id = select_from_flow_group(gateway.flow_group_id, message)
                    if flow_id:
                        return flow_id
                        
                elif gateway.flow_id:
                    logger.info(f"Verwende einzelnen Gateway-Flow: {gateway.flow_id}")
                    return gateway.flow_id
                    
        # 2. Device-Nachricht verarbeiten
        device_id = extract_device_id(message)
        if device_id:
            logger.info(f"Device-Nachricht für Gerät {device_id} erkannt")
            
            # Device aus DB laden
            device = Device.find_by_gateway_and_id(gateway_id, device_id)
            if device:
                if device.flow_group_id:
                    logger.info(f"Verwende Device-Flow-Gruppe: {device.flow_group_id}")
                    flow_id = select_from_flow_group(device.flow_group_id, message)
                    if flow_id:
                        return flow_id
                        
                elif device.flow_id:
                    logger.info(f"Verwende einzelnen Device-Flow: {device.flow_id}")
                    return device.flow_id
                    
        # 3. Legacy-Support für Templates
        logger.info("Kein Flow gefunden, versuche Legacy-Template-Auswahl")
        
        # Gateway für Legacy-Support laden
        gateway = Gateway.find_by_uuid(gateway_id) if not is_gateway_message(message) else None
        
        # Legacy-Template-Selector verwenden
        template_id = legacy_template_selector(gateway, message)
        
        if template_id:
            # Template zu Flow konvertieren (on-the-fly)
            flow_id = f"{template_id}_flow"
            logger.info(f"Legacy-Template '{template_id}' wird als Flow '{flow_id}' verwendet")
            return flow_id
            
        # 4. Kein Flow gefunden
        logger.warning(f"Kein passender Flow für Gateway {gateway_id} gefunden")
        return None
        
    except Exception as e:
        logger.error(f"Fehler bei der Flow-Auswahl: {str(e)}")
        return None


def migrate_gateway_templates_to_flows(gateway_id: str) -> bool:
    """
    Migriert Template-Einstellungen eines Gateways zu Flows
    
    Args:
        gateway_id: Gateway-UUID
        
    Returns:
        True bei Erfolg
    """
    try:
        gateway = Gateway.find_by_uuid(gateway_id)
        if not gateway:
            logger.error(f"Gateway {gateway_id} nicht gefunden")
            return False
            
        # Template-Gruppe zu Flow-Gruppe migrieren
        if gateway.template_group_id and not gateway.flow_group_id:
            from api.models import migrate_template_group_to_flow_group
            
            flow_group = migrate_template_group_to_flow_group(gateway.template_group_id)
            if flow_group:
                gateway.update(flow_group_id=str(flow_group._id))
                logger.info(f"Template-Gruppe zu Flow-Gruppe {flow_group._id} migriert")
                
        # Einzelnes Template zu Flow migrieren
        elif gateway.template_id and not gateway.flow_id:
            from api.models import migrate_template_to_flow
            
            flow = migrate_template_to_flow(gateway.template_id)
            if flow:
                gateway.update(flow_id=str(flow._id))
                logger.info(f"Template zu Flow {flow._id} migriert")
                
        return True
        
    except Exception as e:
        logger.error(f"Fehler bei der Migration: {str(e)}")
        return False


def get_flow_info(flow_id: str) -> Dict[str, Any]:
    """
    Holt Informationen über einen Flow
    
    Returns:
        Dict mit Flow-Informationen oder None
    """
    try:
        flow = Flow.find_by_id(flow_id)
        if flow:
            return {
                'id': str(flow._id),
                'name': flow.name,
                'type': flow.flow_type,
                'version': flow.version,
                'steps': len(flow.steps)
            }
    except:
        pass
        
    return None


# Test-Funktion
if __name__ == "__main__":
    # Test mit einer Beispielnachricht
    test_message = {
        "gateway": {
            "id": "gw-test-123",
            "type": "test_gateway"
        },
        "devices": [
            {
                "id": "device-456",
                "type": "panic_button",
                "values": {
                    "alarmtype": "panic",
                    "alarmstatus": "alarm"
                }
            }
        ]
    }
    
    # Flow auswählen
    flow_id = select_flow_for_message("gw-test-123", test_message)
    print(f"Ausgewählter Flow: {flow_id}")
    
    if flow_id:
        info = get_flow_info(flow_id)
        if info:
            print(f"Flow-Info: {info}")

class FlowSelector:
    """Intelligente Auswahl von Flows basierend auf Nachrichten"""
    
    def __init__(self):
        self.cache = {}  # Cache für häufig verwendete Flows
    
    def select_flow_for_message(self, gateway_id: str, message: Dict) -> Optional[str]:
        """
        Wählt den passenden Flow für eine Nachricht aus
        
        Args:
            gateway_id: ID des Gateways
            message: Die zu verarbeitende Nachricht
            
        Returns:
            Flow-ID oder None wenn kein passender Flow gefunden wurde
        """
        try:
            # 1. Prüfe ob es eine Gateway-Nachricht ist
            if self._is_gateway_message(message):
                return self._select_gateway_flow(gateway_id, message)
            
            # 2. Device-Flow auswählen
            return self._select_device_flow(gateway_id, message)
            
        except Exception as e:
            logger.error(f"Fehler bei Flow-Auswahl: {str(e)}")
            return None
    
    def _is_gateway_message(self, message: Dict) -> bool:
        """Prüft ob es sich um eine Gateway-Nachricht handelt"""
        # Gateway-spezifische Felder
        gateway_fields = ['gateway_status', 'connection_status', 'heartbeat']
        return any(field in message for field in gateway_fields)
    
    def _select_gateway_flow(self, gateway_id: str, message: Dict) -> Optional[str]:
        """Wählt einen Gateway-Flow aus"""
        try:
            gateway = Gateway.find_by_uuid(gateway_id)
            if not gateway:
                return None
                
            # 1. Direkter Flow am Gateway
            if gateway.flow_id:
                return gateway.flow_id
                
            # 2. Flow-Gruppe am Gateway
            if gateway.flow_group_id:
                return self._select_from_flow_group(
                    gateway.flow_group_id,
                    message,
                    flow_type='gateway_flow'
                )
            
            return None
            
        except Exception as e:
            logger.error(f"Fehler bei Gateway-Flow-Auswahl: {str(e)}")
            return None
    
    def _select_device_flow(self, gateway_id: str, message: Dict) -> Optional[str]:
        """Wählt einen Device-Flow aus"""
        try:
            # Device-ID aus der Nachricht extrahieren
            device_id = self._extract_device_id(message)
            if not device_id:
                return None
                
            # Device in der Datenbank suchen
            device = Device.find_by_gateway_and_id(gateway_id, device_id)
            if not device:
                return None
                
            # 1. Direkter Flow am Device
            if device.flow_id:
                return device.flow_id
                
            # 2. Flow-Gruppe am Device
            if device.flow_group_id:
                return self._select_from_flow_group(
                    device.flow_group_id,
                    message,
                    flow_type='device_flow'
                )
            
            return None
            
        except Exception as e:
            logger.error(f"Fehler bei Device-Flow-Auswahl: {str(e)}")
            return None
    
    def _select_from_flow_group(self, group_id: str, message: Dict, flow_type: str) -> Optional[str]:
        """Wählt den besten Flow aus einer Flow-Gruppe aus"""
        try:
            group = FlowGroup.find_by_id(group_id)
            if not group:
                return None
                
            # Flows nach Priorität sortiert durchgehen
            flows = sorted(group.flows, key=lambda x: x.get('priority', 0), reverse=True)
            
            for flow_config in flows:
                flow_id = flow_config.get('flow_id')
                if not flow_id:
                    continue
                    
                # Flow laden und prüfen
                flow = Flow.find_by_id(flow_id)
                if not flow or flow.flow_type != flow_type:
                    continue
                    
                # Prüfe ob Flow auf die Nachricht passt
                if self._check_flow_match(flow, message):
                    return flow_id
            
            return None
            
        except Exception as e:
            logger.error(f"Fehler bei Flow-Gruppen-Auswahl: {str(e)}")
            return None
    
    def _check_flow_match(self, flow: Flow, message: Dict) -> bool:
        """Prüft ob ein Flow auf eine Nachricht passt"""
        try:
            # Prüfe Filter-Rules des ersten Steps
            steps = flow.steps
            if not steps:
                return False
                
            first_step = steps[0]
            if first_step.get('type') != 'filter':
                return True  # Kein Filter = immer match
                
            from utils.flow_engine import FlowEngine
            engine = FlowEngine()
            return engine._check_filter_step(first_step.get('config', {}), message)
            
        except Exception as e:
            logger.error(f"Fehler beim Flow-Matching: {str(e)}")
            return False
    
    def _extract_device_id(self, message: Dict) -> Optional[str]:
        """Extrahiert die Device-ID aus einer Nachricht"""
        # Format 1: subdeviceid direkt
        if 'subdeviceid' in message:
            return str(message['subdeviceid'])
            
        # Format 2: devices[0].device_id
        if 'devices' in message and isinstance(message['devices'], list):
            if message['devices']:
                device = message['devices'][0]
                if isinstance(device, dict):
                    return device.get('device_id')
        
        # Format 3: subdevicelist[0].id
        if 'subdevicelist' in message and isinstance(message['subdevicelist'], list):
            if message['subdevicelist']:
                device = message['subdevicelist'][0]
                if isinstance(device, dict):
                    return device.get('id')
        
        return None


# Singleton-Instanz
flow_selector = FlowSelector()

def select_flow_for_message(gateway_id: str, message: Dict) -> Optional[str]:
    """Convenience-Funktion für Flow-Auswahl"""
    return flow_selector.select_flow_for_message(gateway_id, message) 