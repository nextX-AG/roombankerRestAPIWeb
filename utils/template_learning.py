"""
Template-Lernsystem für automatische Template-Generierung
=========================================================

Dieses Modul implementiert das Lernsystem, das Gateway-Nachrichten über einen
Zeitraum sammelt, Muster erkennt und automatisch Templates generiert.
"""

import logging
import hashlib
import json
from datetime import datetime, timedelta
from collections import defaultdict, Counter
from typing import Dict, List, Any, Optional, Tuple
import numpy as np

from api.models import db

logger = logging.getLogger(__name__)


class TemplateLearningEngine:
    """
    Engine für das Template-Lernsystem
    """
    
    LEARNING_DURATION_HOURS = 48  # Standard-Lernzeit
    MIN_MESSAGES_FOR_PATTERN = 3  # Mindestanzahl für Mustererkennung
    
    def __init__(self):
        self.learning_collection = db['learning_sessions']
        self.message_collection = db['learning_messages']
    
    def start_learning(self, gateway_id: str, duration_hours: int = None) -> Dict[str, Any]:
        """
        Startet eine Lernsession für ein Gateway
        
        Args:
            gateway_id: Die Gateway-ID
            duration_hours: Dauer der Lernsession in Stunden (Standard: 48)
            
        Returns:
            True wenn erfolgreich gestartet
        """
        if gateway_id in self.learning_sessions:
            if self.learning_sessions[gateway_id]['status'] == 'learning':
                logger.warning(f"Lernsession für Gateway {gateway_id} läuft bereits")
                return False
        
        # Gateway in Lernmodus versetzen
        try:
            from api.models import Gateway
            gateway = Gateway.find_by_uuid(gateway_id)
            if gateway:
                gateway.set_forwarding_mode('learning', enabled=False)
                logger.info(f"Gateway {gateway_id} in Lernmodus versetzt")
        except Exception as e:
            logger.error(f"Fehler beim Setzen des Lernmodus für Gateway: {str(e)}")
        
        duration = duration_hours or self.LEARNING_DURATION_HOURS
        
        # Prüfe ob bereits eine aktive Session existiert
        active_session = self.learning_collection.find_one({
            'gateway_id': gateway_id,
            'status': 'learning'
        })
        
        if active_session:
            return {
                'status': 'error',
                'message': 'Es läuft bereits eine Lernsession für dieses Gateway',
                'session_id': str(active_session['_id'])
            }
        
        # Erstelle neue Lernsession
        session = {
            'gateway_id': gateway_id,
            'start_time': datetime.utcnow(),
            'end_time': datetime.utcnow() + timedelta(hours=duration),
            'status': 'learning',
            'message_count': 0,
            'patterns': [],
            'created_at': datetime.utcnow()
        }
        
        result = self.learning_collection.insert_one(session)
        session['_id'] = result.inserted_id
        
        logger.info(f"Lernsession für Gateway {gateway_id} gestartet (Dauer: {duration}h)")
        return {
            'status': 'success',
            'session_id': str(result.inserted_id),
            'end_time': session['end_time'].isoformat()
        }
    
    def stop_learning(self, gateway_id: str) -> Dict[str, Any]:
        """
        Stoppt eine laufende Lernsession
        
        Args:
            gateway_id: Die Gateway-ID
            
        Returns:
            True wenn erfolgreich gestoppt
        """
        if gateway_id not in self.learning_sessions:
            return False
        
        session = self.learning_sessions[gateway_id]
        if session['status'] != 'learning':
            return False
        
        # Gateway zurück in Produktionsmodus versetzen
        try:
            from api.models import Gateway
            gateway = Gateway.find_by_uuid(gateway_id)
            if gateway:
                gateway.set_forwarding_mode('production', enabled=True)
                logger.info(f"Gateway {gateway_id} zurück in Produktionsmodus versetzt")
        except Exception as e:
            logger.error(f"Fehler beim Zurücksetzen des Gateway-Modus: {str(e)}")
        
        session['status'] = 'completed'
        session['end_time'] = datetime.now()
        
        # Muster analysieren
        self._analyze_patterns(gateway_id)
        
        logger.info(f"Lernsession für Gateway {gateway_id} gestoppt")
        return True
    
    def add_message(self, gateway_id: str, message: Dict[str, Any]) -> bool:
        """
        Fügt eine Nachricht zur Lernsession hinzu
        """
        # Finde aktive Lernsession
        session = self.learning_collection.find_one({
            'gateway_id': gateway_id,
            'status': 'learning'
        })
        
        if not session:
            return False
        
        # Prüfe ob Session noch aktiv ist
        if datetime.utcnow() > session['end_time']:
            # Session automatisch beenden
            self._complete_session(session['_id'])
            return False
        
        # Speichere Nachricht
        learning_message = {
            'session_id': session['_id'],
            'gateway_id': gateway_id,
            'message': message,
            'timestamp': datetime.utcnow(),
            'pattern_hash': self._calculate_pattern_hash(message)
        }
        
        self.message_collection.insert_one(learning_message)
        
        # Aktualisiere Nachrichtenzähler
        self.learning_collection.update_one(
            {'_id': session['_id']},
            {'$inc': {'message_count': 1}}
        )
        
        return True
    
    def get_learning_status(self, gateway_id: str = None) -> List[Dict[str, Any]]:
        """
        Gibt den Status aller oder eines bestimmten Gateways zurück
        """
        query = {}
        if gateway_id:
            query['gateway_id'] = gateway_id
        
        sessions = []
        for session in self.learning_collection.find(query).sort('start_time', -1):
            # Berechne Fortschritt
            if session['status'] == 'learning':
                total_duration = (session['end_time'] - session['start_time']).total_seconds()
                elapsed = (datetime.utcnow() - session['start_time']).total_seconds()
                progress = min(100, int((elapsed / total_duration) * 100))
            else:
                progress = 100 if session['status'] == 'completed' else 0
            
            sessions.append({
                'id': str(session['_id']),
                'gateway_id': session['gateway_id'],
                'status': session['status'],
                'start_time': session['start_time'].isoformat(),
                'end_time': session.get('end_time', '').isoformat() if session.get('end_time') else None,
                'progress': progress,
                'message_count': session.get('message_count', 0),
                'pattern_count': len(session.get('patterns', []))
            })
        
        return sessions
    
    def analyze_patterns(self, gateway_id: str) -> List[Dict[str, Any]]:
        """
        Analysiert gesammelte Nachrichten und erkennt Muster
        """
        # Finde Session
        session = self.learning_collection.find_one({
            'gateway_id': gateway_id,
            'status': {'$in': ['learning', 'completed']}
        })
        
        if not session:
            return []
        
        # Hole alle Nachrichten der Session
        messages = list(self.message_collection.find({'session_id': session['_id']}))
        
        if not messages:
            return []
        
        # Gruppiere Nachrichten nach Pattern-Hash
        pattern_groups = defaultdict(list)
        for msg in messages:
            pattern_groups[msg['pattern_hash']].append(msg['message'])
        
        patterns = []
        for pattern_hash, msg_list in pattern_groups.items():
            if len(msg_list) < self.MIN_MESSAGES_FOR_PATTERN:
                continue
            
            # Analysiere gemeinsame Felder
            common_fields = self._analyze_common_fields(msg_list)
            
            # Bestimme Nachrichtentyp
            message_type = self._determine_message_type(common_fields, msg_list[0])
            
            patterns.append({
                'id': pattern_hash[:8],
                'hash': pattern_hash,
                'type': message_type,
                'count': len(msg_list),
                'frequency': self._calculate_frequency(msg_list, session),
                'common_fields': common_fields,
                'sample_message': msg_list[0]
            })
        
        # Speichere Muster in Session
        self.learning_collection.update_one(
            {'_id': session['_id']},
            {'$set': {'patterns': patterns}}
        )
        
        return patterns
    
    def generate_templates(self, gateway_id: str) -> List[Dict[str, Any]]:
        """
        Generiert Template-Vorschläge basierend auf erkannten Mustern
        """
        patterns = self.analyze_patterns(gateway_id)
        
        if not patterns:
            return []
        
        templates = []
        for pattern in patterns:
            # Generiere Template basierend auf Mustertyp
            template = self._generate_template_for_pattern(pattern)
            if template:
                templates.append(template)
        
        return templates
    
    def _calculate_pattern_hash(self, message: Dict[str, Any]) -> str:
        """
        Berechnet einen Hash für das Nachrichtenmuster (ignoriert Werte)
        """
        # Extrahiere nur die Struktur (Feldnamen)
        structure = self._extract_structure(message)
        structure_str = json.dumps(structure, sort_keys=True)
        return hashlib.md5(structure_str.encode()).hexdigest()
    
    def _extract_structure(self, obj: Any, path: str = '') -> Dict[str, str]:
        """
        Extrahiert die Struktur eines Objekts (nur Feldnamen und Typen)
        """
        structure = {}
        
        if isinstance(obj, dict):
            for key, value in obj.items():
                new_path = f"{path}.{key}" if path else key
                if isinstance(value, (dict, list)):
                    structure.update(self._extract_structure(value, new_path))
                else:
                    structure[new_path] = type(value).__name__
        elif isinstance(obj, list) and obj:
            # Für Listen, analysiere nur das erste Element
            structure.update(self._extract_structure(obj[0], f"{path}[0]"))
        
        return structure
    
    def _analyze_common_fields(self, messages: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Analysiert gemeinsame Felder und deren Wertebereiche
        """
        # Sammle alle Werte für jedes Feld
        field_values = defaultdict(list)
        
        for msg in messages:
            self._collect_field_values(msg, field_values)
        
        # Analysiere Werte
        common_fields = {}
        for field_path, values in field_values.items():
            field_info = {
                'count': len(values),
                'type': type(values[0]).__name__ if values else 'unknown'
            }
            
            # Für numerische Werte
            if all(isinstance(v, (int, float)) for v in values):
                field_info['min'] = min(values)
                field_info['max'] = max(values)
                field_info['avg'] = sum(values) / len(values)
                field_info['constant'] = len(set(values)) == 1
            # Für String-Werte
            elif all(isinstance(v, str) for v in values):
                value_counts = Counter(values)
                field_info['values'] = list(value_counts.keys())[:5]  # Top 5
                field_info['constant'] = len(value_counts) == 1
            
            common_fields[field_path] = field_info
        
        return common_fields
    
    def _collect_field_values(self, obj: Any, field_values: Dict[str, List], path: str = ''):
        """
        Sammelt alle Feldwerte rekursiv
        """
        if isinstance(obj, dict):
            for key, value in obj.items():
                new_path = f"{path}.{key}" if path else key
                if isinstance(value, dict):
                    self._collect_field_values(value, field_values, new_path)
                elif isinstance(value, list):
                    for i, item in enumerate(value):
                        self._collect_field_values(item, field_values, f"{new_path}[{i}]")
                else:
                    field_values[new_path].append(value)
        elif isinstance(obj, list):
            for i, item in enumerate(obj):
                self._collect_field_values(item, field_values, f"{path}[{i}]")
    
    def _determine_message_type(self, common_fields: Dict[str, Any], sample_message: Dict[str, Any]) -> str:
        """
        Bestimmt den Nachrichtentyp basierend auf Feldern
        """
        # Einfache Heuristik für Nachrichtentypen
        if any('alarm' in field.lower() for field in common_fields.keys()):
            if any('panic' in str(sample_message).lower() for field in common_fields.keys()):
                return 'Panic Alarm'
            return 'Alarm'
        elif any('temperature' in field.lower() or 'humidity' in field.lower() for field in common_fields.keys()):
            return 'Sensor Status'
        elif any('battery' in field.lower() for field in common_fields.keys()):
            return 'Battery Status'
        elif any('gateway' in field.lower() for field in common_fields.keys()):
            return 'Gateway Status'
        else:
            return 'Status Update'
    
    def _calculate_frequency(self, messages: List[Dict[str, Any]], session: Dict[str, Any]) -> str:
        """
        Berechnet die Häufigkeit der Nachrichten
        """
        if len(messages) < 2:
            return 'Selten'
        
        # Berechne durchschnittliche Zeit zwischen Nachrichten
        duration_hours = (session.get('end_time', datetime.utcnow()) - session['start_time']).total_seconds() / 3600
        messages_per_hour = len(messages) / duration_hours
        
        if messages_per_hour >= 60:
            return f"~{int(messages_per_hour / 60)}x pro Minute"
        elif messages_per_hour >= 1:
            return f"~{int(messages_per_hour)}x pro Stunde"
        else:
            return f"~{int(messages_per_hour * 24)}x pro Tag"
    
    def _generate_template_for_pattern(self, pattern: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generiert ein Template basierend auf einem Muster
        """
        # Basis-Template-Struktur
        template = {
            'id': f"auto_{pattern['id']}",
            'name': f"Auto-generiert: {pattern['type']}",
            'description': f"Automatisch generiertes Template für {pattern['type']} (basierend auf {pattern['count']} Nachrichten)",
            'based_on_pattern': pattern['id'],
            'priority': self._calculate_priority(pattern),
            'filter_rules': self._generate_filter_rules(pattern),
            'template_code': self._generate_template_code(pattern)
        }
        
        return template
    
    def _calculate_priority(self, pattern: Dict[str, Any]) -> int:
        """
        Berechnet die Priorität basierend auf Nachrichtentyp und Häufigkeit
        """
        # Alarm-Nachrichten haben höchste Priorität
        if 'alarm' in pattern['type'].lower():
            return 100
        # Häufige Nachrichten haben niedrigere Priorität
        elif pattern['count'] > 100:
            return 30
        else:
            return 50
    
    def _generate_filter_rules(self, pattern: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Generiert Filterregeln basierend auf dem Muster
        """
        rules = []
        
        # Für konstante Felder, erstelle ValueComparisonRules
        for field_path, info in pattern['common_fields'].items():
            if info.get('constant') and info.get('values'):
                rules.append({
                    'type': 'ValueComparisonRule',
                    'field': field_path,
                    'value': info['values'][0]
                })
            elif field_path in ['alarmtype', 'alarmstatus', 'type']:
                # Wichtige Felder sollten immer geprüft werden
                rules.append({
                    'type': 'FieldExistsRule',
                    'field': field_path
                })
        
        return rules[:3]  # Maximal 3 Regeln pro Template
    
    def _generate_template_code(self, pattern: Dict[str, Any]) -> str:
        """
        Generiert Template-Code basierend auf dem Nachrichtentyp
        """
        sample = pattern['sample_message']
        
        # Unterschiedliche Templates für verschiedene Nachrichtentypen
        if 'panic' in pattern['type'].lower():
            template_obj = {
                "events": [{
                    "message": "Panic Button Alarm",
                    "address": "0",
                    "namespace": "{{ customer_config.namespace }}",
                    "device_id": "{{ devices[0].id if devices else 'unknown' }}",
                    "timestamp": "{{ timestamp }}",
                    "battery": "{{ devices[0].values.batterystatus if devices else 'unknown' }}"
                }]
            }
        elif 'sensor' in pattern['type'].lower():
            template_obj = {
                "sensor_data": {
                    "device_id": "{{ devices[0].id if devices else 'unknown' }}",
                    "temperature": "{{ devices[0].values.temperature if devices else null }}",
                    "humidity": "{{ devices[0].values.humidity if devices else null }}",
                    "timestamp": "{{ timestamp }}"
                }
            }
        else:
            # Generisches Template
            template_obj = {
                "status": {
                    "gateway_id": "{{ gateway.id }}",
                    "devices": [
                        {
                            "id": "{{ device.id }}",
                            "values": "{{ device.values }}"
                        } for device in "{{ devices }}"
                    ],
                    "timestamp": "{{ timestamp }}"
                }
            }
        
        return json.dumps(template_obj, indent=2)
    
    def _complete_session(self, session_id):
        """
        Markiert eine Session als abgeschlossen
        """
        self.learning_collection.update_one(
            {'_id': session_id},
            {
                '$set': {
                    'status': 'completed',
                    'completed_at': datetime.utcnow()
                }
            }
        )
        logger.info(f"Lernsession {session_id} abgeschlossen") 