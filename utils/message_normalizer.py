"""
Message Normalizer - Kernkomponente der neuen Nachrichtenverarbeitungsarchitektur

Diese Komponente ist verantwortlich für die Konvertierung verschiedener Nachrichtenformate 
in ein einheitliches, normalisiertes Format, das von allen nachfolgenden Komponenten 
verwendet werden kann.
"""

import json
import logging
import time
from datetime import datetime
from typing import Dict, List, Any, Optional, Union, Tuple

# Import the central device registry
from utils.device_registry import device_registry

# Logging konfigurieren
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('message-normalizer')

class MessageNormalizer:
    """
    Klasse zur Normalisierung von Nachrichten aus verschiedenen Gateway-Formaten
    in ein einheitliches internes Format.
    """
    
    def __init__(self, format_handlers=None):
        """
        Initialisiert den Message Normalizer.
        
        Args:
            format_handlers: Dict mit benutzerdefinierten Format-Handlern
        """
        self.format_handlers = format_handlers or {}
        # Standard-Handler registrieren
        self._register_default_handlers()
    
    def _register_default_handlers(self):
        """Registriert die Standard-Format-Handler."""
        # Roombanker Format mit subdevicelist
        self.format_handlers["roombanker_subdevicelist"] = self._normalize_roombanker_subdevicelist
        # Roombanker Panic Button Format (code 2030)
        self.format_handlers["roombanker_panic"] = self._normalize_roombanker_panic
        # Generisches Format als Fallback
        self.format_handlers["generic"] = self._normalize_generic
    
    def normalize(self, raw_message: Dict[str, Any], source_ip: str = "unknown") -> Dict[str, Any]:
        """
        Normalisiert eine Nachricht in das standardisierte Format.
        
        Args:
            raw_message: Die Originalnachricht als Dictionary
            source_ip: Die IP-Adresse des Absenders (optional)
            
        Returns:
            Ein Dictionary mit der normalisierten Nachricht
        """
        logger.info("Starte Normalisierung der Nachricht")
        
        # Originalnachricht prüfen
        if not isinstance(raw_message, dict):
            logger.error(f"Ungültiges Nachrichtenformat: {type(raw_message).__name__}")
            raise ValueError(f"Nachricht muss ein Dictionary sein, nicht {type(raw_message).__name__}")
        
        # Format bestimmen
        format_type, message = self._detect_format(raw_message)
        logger.info(f"Erkanntes Nachrichtenformat: {format_type}")
        
        # Gateway-ID extrahieren
        gateway_id, gateway_type = self._extract_gateway_id(raw_message)
        if not gateway_id:
            logger.error("Keine Gateway-ID in der Nachricht gefunden")
            raise ValueError("Gateway-ID konnte nicht aus der Nachricht extrahiert werden")
        
        # Normalisierung basierend auf erkanntem Format
        if format_type in self.format_handlers:
            try:
                normalized = self.format_handlers[format_type](message, gateway_id)
            except Exception as e:
                logger.error(f"Fehler bei der Normalisierung mit Handler {format_type}: {str(e)}")
                # Fallback auf generischen Handler
                normalized = self.format_handlers["generic"](message, gateway_id)
        else:
            logger.warning(f"Kein spezifischer Handler für Format {format_type} gefunden, verwende generischen Handler")
            normalized = self.format_handlers["generic"](message, gateway_id)
        
        # Metadaten hinzufügen
        normalized["metadata"] = {
            "received_at": datetime.now().isoformat(),
            "source_ip": source_ip,
            "format_type": format_type,
            "normalized_at": datetime.now().isoformat()
        }
        
        # Originalnachricht für Debugging-Zwecke speichern
        normalized["raw_message"] = raw_message
        
        logger.info(f"Normalisierung abgeschlossen: {len(normalized.get('devices', []))} Geräte gefunden")
        return normalized
    
    def _detect_format(self, raw_message: Dict[str, Any]) -> Tuple[str, Dict[str, Any]]:
        """
        Erkennt das Format der Nachricht und extrahiert den eigentlichen Nachrichteninhalt.
        
        Args:
            raw_message: Die Originalnachricht
            
        Returns:
            Tupel aus (format_type, message_content)
        """
        # Extrahiere die eigentliche Nachricht, falls sie in einem Container ist
        message = raw_message.get('message', raw_message)
        
        # Format-Erkennung basierend auf Nachrichtenstruktur
        if isinstance(message, dict):
            # Erkenne Roombanker Panic Button (code 2030)
            if message.get('code') == 2030 and 'subdeviceid' in message:
                return "roombanker_panic", message
            
            # Erkenne Roombanker Standard-Format mit subdevicelist
            if 'subdevicelist' in message and isinstance(message['subdevicelist'], list):
                return "roombanker_subdevicelist", message
        
        # Fallback: Generisches Format
        return "generic", message
    
    def _extract_gateway_id(self, raw_message: Dict[str, Any]) -> Tuple[Optional[str], Optional[str]]:
        """
        Extrahiert die Gateway-ID und den Gateway-Typ aus der Nachricht.
        
        Args:
            raw_message: Die Originalnachricht
            
        Returns:
            Tupel aus (gateway_id, gateway_type)
        """
        gateway_id = None
        gateway_type = "unknown"
        
        # Verschiedene mögliche Felder für die Gateway-ID prüfen
        possible_fields = ['gateway_id', 'gateway_uuid', 'gatewayId', 'uuid']
        for field in possible_fields:
            if field in raw_message and raw_message[field]:
                gateway_id = str(raw_message[field]).strip()
                gateway_type = "roombanker_gateway"  # Annahme basierend auf Feld
                logger.info(f"Gateway-ID aus Feld '{field}' extrahiert: {gateway_id}")
                break
        
        # Verschachtelte Gateway-Struktur prüfen
        if not gateway_id and 'gateway' in raw_message and isinstance(raw_message['gateway'], dict):
            gateway = raw_message['gateway']
            if 'uuid' in gateway:
                gateway_id = str(gateway['uuid']).strip()
                gateway_type = "roombanker_gateway"
                logger.info(f"Gateway-ID aus verschachteltem Feld 'gateway.uuid' extrahiert: {gateway_id}")
        
        return gateway_id, gateway_type
    
    def _normalize_roombanker_subdevicelist(self, message: Dict[str, Any], gateway_id: str) -> Dict[str, Any]:
        """
        Normalisiert eine Nachricht im Roombanker subdevicelist-Format.
        
        Args:
            message: Die zu normalisierende Nachricht
            gateway_id: Die bereits extrahierte Gateway-ID
            
        Returns:
            Die normalisierte Nachricht
        """
        # Basis-Struktur erstellen
        normalized = {
            "gateway": {
                "id": gateway_id,
                "type": "roombanker_gateway",
                "metadata": {}
            },
            "devices": []
        }
        
        # Gateway-Metadaten extrahieren
        if 'gateway' in message and isinstance(message['gateway'], dict):
            for key, value in message['gateway'].items():
                if key != 'uuid':  # UUID ist bereits als ID gespeichert
                    normalized["gateway"]["metadata"][key] = value
        
        # Zeitstempel
        if 'ts' in message:
            try:
                ts = int(message['ts'])
                normalized["gateway"]["metadata"]["timestamp"] = ts
                normalized["gateway"]["metadata"]["last_seen"] = datetime.fromtimestamp(ts).isoformat()
            except (ValueError, TypeError):
                logger.warning(f"Ungültiger Zeitstempel: {message.get('ts')}")
        
        # Geräte aus subdevicelist extrahieren
        if 'subdevicelist' in message and isinstance(message['subdevicelist'], list):
            for device_data in message['subdevicelist']:
                if not isinstance(device_data, dict):
                    logger.warning(f"Ungültiges Geräteformat in subdevicelist: {type(device_data).__name__}")
                    continue
                
                device_id = str(device_data.get('id', ''))
                if not device_id:
                    logger.warning("Gerät ohne ID in subdevicelist gefunden, wird übersprungen")
                    continue
                
                # Gerätetype basierend auf Werten bestimmen
                device_type = self._determine_device_type(device_data)
                
                # Gerätewerte extrahieren
                values = {}
                if 'value' in device_data and isinstance(device_data['value'], dict):
                    values = device_data['value']
                
                # Normalisiertes Gerät erstellen
                normalized_device = {
                    "id": device_id,
                    "type": device_type,
                    "values": values,
                    "last_seen": normalized["gateway"]["metadata"].get("last_seen", datetime.now().isoformat())
                }
                
                normalized["devices"].append(normalized_device)
        
        return normalized
    
    def _normalize_roombanker_panic(self, message: Dict[str, Any], gateway_id: str) -> Dict[str, Any]:
        """
        Normalisiert eine Nachricht im Roombanker Panic-Button-Format (code 2030).
        
        Args:
            message: Die zu normalisierende Nachricht
            gateway_id: Die bereits extrahierte Gateway-ID
            
        Returns:
            Die normalisierte Nachricht
        """
        # Basis-Struktur erstellen
        normalized = {
            "gateway": {
                "id": gateway_id,
                "type": "roombanker_gateway",
                "metadata": {}
            },
            "devices": []
        }
        
        # Zeitstempel
        if 'ts' in message:
            try:
                ts = int(message['ts'])
                normalized["gateway"]["metadata"]["timestamp"] = ts
                normalized["gateway"]["metadata"]["last_seen"] = datetime.fromtimestamp(ts).isoformat()
            except (ValueError, TypeError):
                logger.warning(f"Ungültiger Zeitstempel: {message.get('ts')}")
        
        # Gerät aus subdeviceid extrahieren
        if 'subdeviceid' in message:
            device_id = str(message['subdeviceid'])
            
            # Gerätewerte extrahieren
            values = {}
            for key in ['alarmstatus', 'alarmtype', 'batterystatus', 'onlinestatus']:
                if key in message:
                    values[key] = message[key]
            
            # Bei code 2030 ist es immer ein Panic-Button mit Alarm
            if message.get('code') == 2030:
                if 'alarmstatus' not in values:
                    values['alarmstatus'] = 'alarm'
                if 'alarmtype' not in values:
                    values['alarmtype'] = 'panic'
            
            # Normalisiertes Gerät erstellen
            normalized_device = {
                "id": device_id,
                "type": "panic_button",  # Festgelegt durch code 2030
                "values": values,
                "last_seen": normalized["gateway"]["metadata"].get("last_seen", datetime.now().isoformat())
            }
            
            normalized["devices"].append(normalized_device)
        
        return normalized
    
    def _normalize_generic(self, message: Dict[str, Any], gateway_id: str) -> Dict[str, Any]:
        """
        Generischer Normalisierer für unbekannte Formate.
        Versucht, so viele Informationen wie möglich zu extrahieren.
        
        Args:
            message: Die zu normalisierende Nachricht
            gateway_id: Die bereits extrahierte Gateway-ID
            
        Returns:
            Die normalisierte Nachricht
        """
        # Basis-Struktur erstellen
        normalized = {
            "gateway": {
                "id": gateway_id,
                "type": "unknown_gateway",
                "metadata": {}
            },
            "devices": []
        }
        
        # Zeitstempel suchen
        for ts_field in ['ts', 'timestamp', 'time']:
            if ts_field in message:
                try:
                    ts = int(message[ts_field])
                    normalized["gateway"]["metadata"]["timestamp"] = ts
                    normalized["gateway"]["metadata"]["last_seen"] = datetime.fromtimestamp(ts).isoformat()
                    break
                except (ValueError, TypeError):
                    continue
        
        # Versuchen, Geräte zu finden
        device_found = False
        
        # Bekannte Gerätefelder durchsuchen
        device_fields = ['devices', 'subdevices', 'subdevicelist', 'sensors']
        for field in device_fields:
            if field in message and isinstance(message[field], list):
                for device_data in message[field]:
                    if not isinstance(device_data, dict):
                        continue
                    
                    # ID-Felder durchsuchen
                    device_id = None
                    for id_field in ['id', 'device_id', 'deviceId']:
                        if id_field in device_data:
                            device_id = str(device_data[id_field])
                            break
                    
                    if not device_id:
                        continue
                    
                    # Werte extrahieren
                    values = {}
                    value_fields = ['value', 'values', 'status']
                    for vf in value_fields:
                        if vf in device_data and isinstance(device_data[vf], dict):
                            values = device_data[vf]
                            break
                    
                    # Wenn keine verschachtelten Werte gefunden wurden, direkte Felder verwenden
                    if not values:
                        values = {k: v for k, v in device_data.items() 
                                 if k not in ['id', 'device_id', 'deviceId', 'type'] 
                                 and not isinstance(v, (dict, list))}
                    
                    # Gerätetyp bestimmen
                    device_type = device_data.get('type', 'unknown')
                    
                    # Normalisiertes Gerät erstellen
                    normalized_device = {
                        "id": device_id,
                        "type": device_type,
                        "values": values,
                        "last_seen": normalized["gateway"]["metadata"].get("last_seen", datetime.now().isoformat())
                    }
                    
                    normalized["devices"].append(normalized_device)
                    device_found = True
        
        # Falls subdeviceid direkt in der Nachricht vorhanden ist
        if 'subdeviceid' in message:
            device_id = str(message['subdeviceid'])
            
            # Alle nicht-strukturierten Felder als Werte betrachten
            values = {k: v for k, v in message.items() 
                     if k not in ['subdeviceid', 'ts', 'timestamp', 'time'] 
                     and not isinstance(v, (dict, list))}
            
            # Normalisiertes Gerät erstellen
            normalized_device = {
                "id": device_id,
                "type": "unknown",
                "values": values,
                "last_seen": normalized["gateway"]["metadata"].get("last_seen", datetime.now().isoformat())
            }
            
            normalized["devices"].append(normalized_device)
            device_found = True
        
        # Wenn keine Geräte gefunden wurden, Gateway-Nachricht ohne Geräte annehmen
        if not device_found:
            logger.warning(f"Keine Geräte in der Nachricht gefunden: {json.dumps(message)[:200]}...")
        
        # Alle anderen Felder als Gateway-Metadaten betrachten
        for key, value in message.items():
            if (key not in ['devices', 'subdevices', 'subdevicelist', 'sensors', 
                          'gateway', 'ts', 'timestamp', 'time'] and 
                not isinstance(value, (dict, list))):
                normalized["gateway"]["metadata"][key] = value
        
        return normalized
    
    def _determine_device_type(self, device_data: Dict[str, Any]) -> str:
        """
        Bestimmt den Gerätetyp basierend auf den Gerätedaten.
        
        Nutzt jetzt die zentrale Device Registry für konsistente Typerkennung.
        
        Args:
            device_data: Die Gerätedaten
            
        Returns:
            Der erkannte Gerätetyp
        """
        # Nutze die zentrale Registry für Geräteerkennung
        device_type = device_registry.detect_device_type(device_data)
        
        # Log die Erkennung für Debugging
        logger.info(f"Device type '{device_type}' erkannt durch zentrale Registry für Daten: {json.dumps(device_data, default=str)[:200]}")
        
        return device_type

# Beispielverwendung
if __name__ == "__main__":
    # Beispiel für einen Test
    normalizer = MessageNormalizer()
    
    # Roombanker Panic Button Nachricht testen
    test_panic = {
        "gateway_id": "gw-c490b022-cc18-407e-a07e-a355747a8fdd",
        "message": {
            "code": 2030,
            "subdeviceid": 673922542395461,
            "alarmstatus": "alarm",
            "alarmtype": "panic",
            "ts": 1747344697
        }
    }
    
    normalized_panic = normalizer.normalize(test_panic)
    print(json.dumps(normalized_panic, indent=2))
    
    # Roombanker subdevicelist Nachricht testen
    test_subdevicelist = {
        "gateway_id": "gw-c490b022-cc18-407e-a07e-a355747a8fdd",
        "ts": 1747344697,
        "subdevicelist": [
            {
                "id": 673922542395461,
                "value": {
                    "alarmstatus": "alarm",
                    "alarmtype": "panic",
                    "batterystatus": "connected",
                    "onlinestatus": "online"
                }
            }
        ]
    }
    
    normalized_subdevicelist = normalizer.normalize(test_subdevicelist)
    print(json.dumps(normalized_subdevicelist, indent=2)) 