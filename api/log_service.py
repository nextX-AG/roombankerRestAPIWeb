import os
import json
import logging
import subprocess
import re
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any, Union

# Konfiguration des Loggings für diesen Service
logger = logging.getLogger('log-service')
logger.setLevel(logging.INFO)

# Konstanten für verschiedene Log-Typen
LOG_TYPE_SYSTEM = 'system'
LOG_TYPE_PROCESSOR = 'processor'
LOG_TYPE_GATEWAY = 'gateway'
LOG_TYPE_API = 'api'
LOG_TYPE_AUTH = 'auth'
LOG_TYPE_DATABASE = 'database'

# Mapping von Log-Typen zu Docker-Container-Namen
CONTAINER_MAPPING = {
    LOG_TYPE_PROCESSOR: 'roombankerrestapiweb-processor-1',
    LOG_TYPE_GATEWAY: 'roombankerrestapiweb-gateway-1',
    LOG_TYPE_API: 'roombankerrestapiweb-api-1',
    LOG_TYPE_AUTH: 'roombankerrestapiweb-auth-1',
    LOG_TYPE_DATABASE: ['roombankerrestapiweb-mongo-1', 'roombankerrestapiweb-redis-1']
}

# Mapping von Log-Levels zu ihren numerischen Werten für Filterung
LOG_LEVEL_VALUES = {
    'debug': 10,
    'info': 20,
    'warning': 30,
    'error': 40,
    'critical': 50
}

def get_container_logs(container_name: str, lines: int = 100) -> List[str]:
    """
    Ruft Logs eines Docker-Containers ab.
    
    Args:
        container_name: Name des Docker-Containers
        lines: Anzahl der zurückzugebenden Zeilen (Standard: 100)
        
    Returns:
        Liste von Log-Zeilen
    """
    try:
        logger.info(f"Rufe Logs für Container {container_name} ab")
        cmd = ["docker", "logs", "--tail", str(lines), container_name]
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        return result.stdout.splitlines()
    except subprocess.CalledProcessError as e:
        logger.error(f"Fehler beim Abrufen der Container-Logs: {e}")
        logger.error(f"Fehler-Output: {e.stderr}")
        return []
    except Exception as e:
        logger.error(f"Unerwarteter Fehler beim Abrufen der Container-Logs: {e}")
        return []

def parse_log_line(log_line: str, container_type: str) -> Optional[Dict[str, Any]]:
    """
    Parst eine Log-Zeile und konvertiert sie in ein strukturiertes Format.
    
    Args:
        log_line: Die zu parsende Log-Zeile
        container_type: Typ des Containers (processor, api, etc.)
        
    Returns:
        Dictionary mit strukturierten Log-Daten oder None, wenn die Zeile nicht geparst werden kann
    """
    try:
        # Versuche, die Zeile als JSON zu parsen (für MongoDB, Redis)
        if container_type in ['mongo', 'redis']:
            try:
                # MongoDB verwendet ein spezielles JSON-Format
                if container_type == 'mongo':
                    # Extrahiere den Zeitstempel und die Nachricht
                    match = re.search(r'{"t":\{"\\$date":"([^"]+)"\},"s":"([^"]+)","c":"([^"]+)","id":(\d+),"ctx":"([^"]+)","msg":"([^"]+)"', log_line)
                    if match:
                        timestamp_str, severity, component, id_str, context, message = match.groups()
                        timestamp = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
                        
                        # Mappe die MongoDB-Severity auf Standard-Log-Levels
                        level_map = {'D': 'debug', 'I': 'info', 'W': 'warning', 'E': 'error', 'F': 'critical'}
                        level = level_map.get(severity, 'info')
                        
                        return {
                            'timestamp': timestamp.isoformat(),
                            'level': level,
                            'component': f'mongo.{component}',
                            'message': message,
                            'context': {
                                'id': id_str,
                                'ctx': context
                            },
                            'raw': log_line
                        }
                
                # Redis verwendet ein einfacheres Format
                if container_type == 'redis':
                    # Beispiel: 1:M 16 May 2025 15:25:41.261 * 100 changes in 300 seconds. Saving...
                    match = re.search(r'(\d+):([A-Z]) (\d+ [A-Za-z]+ \d+ \d+:\d+:\d+\.\d+) (\*|\.) (.+)', log_line)
                    if match:
                        process_id, role, timestamp_str, marker, message = match.groups()
                        
                        # Konvertiere den Redis-Zeitstempel in ISO-Format
                        try:
                            timestamp = datetime.strptime(timestamp_str, '%d %b %Y %H:%M:%S.%f')
                            timestamp_iso = timestamp.isoformat()
                        except ValueError:
                            timestamp_iso = datetime.now().isoformat()
                        
                        # Bestimme das Log-Level basierend auf dem Marker
                        level = 'info' if marker == '*' else 'debug'
                        
                        return {
                            'timestamp': timestamp_iso,
                            'level': level,
                            'component': f'redis.{role}',
                            'message': message,
                            'context': {
                                'process_id': process_id,
                                'role': role
                            },
                            'raw': log_line
                        }
            except json.JSONDecodeError:
                pass  # Keine JSON-Nachricht, versuche andere Formate
            except Exception as e:
                logger.warning(f"Fehler beim Parsen von {container_type}-Log-JSON: {e}")
        
        # Für Python-basierte Services (processor, api, gateway, auth)
        if container_type in ['processor', 'api', 'gateway', 'auth']:
            # Versuche, verschiedene Python Logging-Formate zu erkennen
            
            # Format 1: "2025-05-16 15:32:02,748 - api-handlers - INFO - Erfolgreiche Anfrage..."
            match = re.search(r'(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d{3}) - ([^-]+) - ([A-Z]+) - (.+)', log_line)
            if match:
                timestamp_str, component, level, message = match.groups()
                try:
                    timestamp = datetime.strptime(timestamp_str, '%Y-%m-%d %H:%M:%S,%f')
                    return {
                        'timestamp': timestamp.isoformat(),
                        'level': level.lower(),
                        'component': f'{container_type}.{component.strip()}',
                        'message': message.strip(),
                        'raw': log_line
                    }
                except ValueError:
                    pass  # Falsches Zeitstempelformat
            
            # Format 2: "INFO:api-handlers:Erfolgreiche Anfrage..."
            match = re.search(r'([A-Z]+):([^:]+):(.+)', log_line)
            if match:
                level, component, message = match.groups()
                return {
                    'timestamp': datetime.now().isoformat(),  # Kein Zeitstempel im Log, verwende aktuellen
                    'level': level.lower(),
                    'component': f'{container_type}.{component.strip()}',
                    'message': message.strip(),
                    'raw': log_line
                }
            
            # Format 3: Werkzeug-Access-Logs: "127.0.0.1 - - [16/May/2025 15:33:01] "GET /api/v1/health HTTP/1.1" 200 -"
            match = re.search(r'([0-9.]+) - - \[([^\]]+)\] "([^"]+)" (\d+) ', log_line)
            if match:
                ip, timestamp_str, request, status_code = match.groups()
                try:
                    timestamp = datetime.strptime(timestamp_str, '%d/%b/%Y %H:%M:%S')
                    
                    # Bestimme Log-Level basierend auf Status-Code
                    level = 'info'
                    if status_code.startswith('4'):
                        level = 'warning'
                    elif status_code.startswith('5'):
                        level = 'error'
                    
                    return {
                        'timestamp': timestamp.isoformat(),
                        'level': level,
                        'component': f'{container_type}.werkzeug',
                        'message': f"{request} - Status {status_code}",
                        'context': {
                            'ip': ip,
                            'request': request,
                            'status_code': status_code
                        },
                        'raw': log_line
                    }
                except ValueError:
                    pass  # Falsches Zeitstempelformat
        
        # Fallback für nicht erkannte Formate
        return {
            'timestamp': datetime.now().isoformat(),
            'level': 'info',
            'component': container_type,
            'message': log_line,
            'raw': log_line
        }
    
    except Exception as e:
        logger.error(f"Fehler beim Parsen der Log-Zeile: {e}")
        logger.error(f"Problematische Zeile: {log_line}")
        return None

def get_logs(log_type: str, 
             limit: int = 100, 
             level: str = 'info', 
             from_time: Optional[str] = None,
             to_time: Optional[str] = None,
             search_term: Optional[str] = None) -> Dict[str, Any]:
    """
    Hauptfunktion zum Abrufen und Filtern von Logs.
    
    Args:
        log_type: Typ der Logs (system, processor, gateway, api, auth, database)
        limit: Maximale Anzahl zurückzugebender Logs
        level: Minimales Log-Level (debug, info, warning, error, critical)
        from_time: ISO 8601 Zeitstempel für Beginn des Zeitraums
        to_time: ISO 8601 Zeitstempel für Ende des Zeitraums
        search_term: Suchbegriff für Volltextsuche in Logs
        
    Returns:
        Dictionary mit gefilterten Logs und Metadaten
    """
    # Bestimme, welche Container basierend auf log_type verwendet werden sollen
    containers = []
    if log_type == LOG_TYPE_SYSTEM:
        # Für System-Logs alle Container verwenden
        for container_list in CONTAINER_MAPPING.values():
            if isinstance(container_list, list):
                containers.extend(container_list)
            else:
                containers.append(container_list)
    else:
        # Für spezifische Log-Typen
        container_spec = CONTAINER_MAPPING.get(log_type)
        if container_spec:
            if isinstance(container_spec, list):
                containers = container_spec
            else:
                containers = [container_spec]
        else:
            logger.error(f"Unbekannter Log-Typ: {log_type}")
            return {"status": "error", "error": f"Unbekannter Log-Typ: {log_type}", "logs": []}
    
    # Bestimme den minimalen Log-Level für die Filterung
    min_level_value = LOG_LEVEL_VALUES.get(level.lower(), 0)
    
    # Parse Zeiträume, falls angegeben
    from_datetime = None
    to_datetime = None
    
    if from_time:
        try:
            from_datetime = datetime.fromisoformat(from_time)
        except ValueError:
            logger.warning(f"Ungültiges from_time Format: {from_time}")
    
    if to_time:
        try:
            to_datetime = datetime.fromisoformat(to_time)
        except ValueError:
            logger.warning(f"Ungültiges to_time Format: {to_time}")
    
    # Sammle und parse Logs von allen relevanten Containern
    all_logs = []
    
    for container in containers:
        # Extrahiere den Container-Typ aus dem Namen (z.B. processor aus roombankerrestapiweb-processor-1)
        container_type = None
        for type_name in ['processor', 'gateway', 'api', 'auth', 'mongo', 'redis']:
            if type_name in container.lower():
                container_type = type_name
                break
        
        if not container_type:
            container_type = 'unknown'
        
        # Hole Logs mit einem Puffer für Filterung
        log_lines = get_container_logs(container, lines=limit * 3)  # Hole mehr für Filterung
        
        for line in log_lines:
            parsed_log = parse_log_line(line, container_type)
            if parsed_log:
                # Füge den Container-Namen hinzu
                parsed_log['container'] = container
                
                # Füge den Log hinzu, wenn er die Filterkriterien erfüllt
                should_include = True
                
                # Log-Level-Filterung
                log_level = parsed_log.get('level', 'info').lower()
                log_level_value = LOG_LEVEL_VALUES.get(log_level, 0)
                if log_level_value < min_level_value:
                    should_include = False
                
                # Zeitraum-Filterung
                if should_include and (from_datetime or to_datetime):
                    try:
                        log_timestamp = datetime.fromisoformat(parsed_log.get('timestamp', '').replace('Z', '+00:00'))
                        
                        if from_datetime and log_timestamp < from_datetime:
                            should_include = False
                        
                        if to_datetime and log_timestamp > to_datetime:
                            should_include = False
                    except (ValueError, TypeError):
                        # Bei Zeitstempelproblemen überspringen wir die Zeitfilterung
                        pass
                
                # Volltext-Suche
                if should_include and search_term:
                    # Suche in Nachricht und Rohdaten
                    message = parsed_log.get('message', '')
                    raw = parsed_log.get('raw', '')
                    
                    if (search_term.lower() not in message.lower() and 
                        search_term.lower() not in raw.lower()):
                        should_include = False
                
                if should_include:
                    all_logs.append(parsed_log)
    
    # Sortiere nach Zeitstempel (neueste zuerst)
    try:
        all_logs.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
    except Exception as e:
        logger.error(f"Fehler beim Sortieren der Logs: {e}")
    
    # Begrenze auf die angeforderte Anzahl
    all_logs = all_logs[:limit]
    
    return {
        "status": "success",
        "logs": all_logs,
        "metadata": {
            "total": len(all_logs),
            "containers": containers,
            "filters": {
                "log_type": log_type,
                "level": level,
                "from_time": from_time,
                "to_time": to_time,
                "search_term": search_term
            }
        }
    } 