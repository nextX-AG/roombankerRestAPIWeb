import os
import sys
import logging
import json
import time
from flask import Flask, request, jsonify

# Logging konfigurieren
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('processor')

# Projektverzeichnis zum Python-Pfad hinzufügen
current_dir = os.path.dirname(os.path.abspath(__file__))
project_dir = os.path.dirname(current_dir)
sys.path.append(project_dir)

# Importiere Gateway und Device Models
try:
    from models import Gateway, Device, determine_device_type, register_device_from_message
    MODELS_AVAILABLE = True
    logger.info("Models erfolgreich importiert")
except ImportError as e:
    logger.warning(f"Models konnten nicht importiert werden: {str(e)}")
    MODELS_AVAILABLE = False
    Gateway = None
    Device = None
    determine_device_type = None
    register_device_from_message = None

# Importiere den MessageNormalizer
try:
    from utils.message_normalizer import MessageNormalizer
    NORMALIZER_AVAILABLE = True
    logger.info("MessageNormalizer erfolgreich importiert")
    normalizer = MessageNormalizer()
except ImportError as e:
    logger.warning(f"MessageNormalizer konnte nicht importiert werden: {str(e)}")
    NORMALIZER_AVAILABLE = False
    normalizer = None

app = Flask(__name__)

# Template-Auswahl basierend auf Nachrichteninhalt
def select_template(message):
    """
    Wählt das passende Template basierend auf dem Nachrichteninhalt aus.
    """
    if not isinstance(message, dict):
        return 'default'

    # Überprüfe auf Panic-Button-Nachrichten
    if message.get('code') == 2030:
        return 'evalarm_panic'

    # Überprüfe auf Alarm-Nachrichten
    if message.get('code') in [2000, 2001, 2002]:
        return 'evalarm_alarm'

    # Standard-Template für unbekannte Nachrichten
    return 'default'

# Redis Import und Initialisierung
try:
    import redis
    
    # Prüfen, ob Redis in der Entwicklungsumgebung deaktiviert wurde
    if os.environ.get('REDIS_UNAVAILABLE') == 'true' and os.environ.get('FLASK_ENV') != 'production':
        logger.warning("Redis ist nicht verfügbar. Mock-Modus aktiviert.")
        redis_client = None
        REDIS_AVAILABLE = False
    else:
        # Redis-Verbindung herstellen
        redis_host = os.environ.get('REDIS_HOST', 'localhost')
        redis_port = int(os.environ.get('REDIS_PORT', 6379))
        redis_db = int(os.environ.get('REDIS_DB', 0))
        redis_password = os.environ.get('REDIS_PASSWORD', '')
        
        redis_client = redis.Redis(
            host=redis_host,
            port=redis_port,
            db=redis_db,
            password=redis_password,
            decode_responses=True
        )
        REDIS_AVAILABLE = True
        
        # Verbindung testen
        redis_client.ping()
        logger.info(f"Redis-Verbindung hergestellt: {redis_host}:{redis_port}")
except (ImportError, redis.ConnectionError) as e:
    if os.environ.get('FLASK_ENV') == 'production':
        logger.error(f"Fehler bei Redis-Verbindung: {str(e)}")
        sys.exit(1)
    else:
        logger.warning(f"Fehler bei Redis-Verbindung: {str(e)}")
        logger.warning("Redis ist nicht verfügbar. Einige Funktionen werden nicht funktionieren.")
        redis_client = None
        REDIS_AVAILABLE = False

# Endpunkte für Message Processor

@app.route('/api/v1/messages/process', methods=['POST'])
def process_message_endpoint():
    """
    Hauptendpunkt für die Verarbeitung von Gateway-Nachrichten:
    1. Empfängt Nachrichten von Gateways
    2. Normalisiert die Nachricht in ein einheitliches Format
    3. Registriert oder aktualisiert das Gateway
    4. Erkennt und registriert Geräte
    5. Filtert Nachrichten basierend auf konfigurierbaren Regeln
    6. Transformiert und leitet Nachrichten weiter (wenn Gateway einem Kunden zugeordnet ist)
    """
    data = request.json
    
    if not data:
        return jsonify({
            'status': 'error',
            'error': {
                'message': 'Keine JSON-Daten empfangen',
                'code': 'invalid_input'
            }
        }), 400

    try:
        # Quell-IP für Diagnosezwecke speichern
        source_ip = request.remote_addr
        
        # NEUE IMPLEMENTIERUNG: Nachricht normalisieren
        if NORMALIZER_AVAILABLE and normalizer:
            try:
                logger.info("Verwende neue Nachrichtenverarbeitungsarchitektur")
                normalized_data = normalizer.normalize(data, source_ip)
                
                # Gateway-ID aus der normalisierten Nachricht extrahieren
                gateway_id = normalized_data['gateway']['id']
                logger.info(f"Normalisierte Nachricht für Gateway {gateway_id}")
                
                # Gateway registrieren oder aktualisieren
                if MODELS_AVAILABLE and Gateway:
                    try:
                        current_time = time.time()
                        formatted_time = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(current_time))
                        
                        gateway = Gateway.find_by_uuid(gateway_id)
                        if gateway:
                            logger.info(f"Gateway '{gateway_id}' gefunden, aktualisiere Status")
                            gateway.update(status='online', last_contact=formatted_time)
                        else:
                            logger.info(f"Gateway '{gateway_id}' nicht gefunden, erstelle neuen Eintrag")
                            Gateway.create(uuid=gateway_id, customer_id=None, status='online', last_contact=formatted_time)
                        
                        # Prüfe, ob das Gateway einem Kunden zugeordnet ist
                        customer_id = None
                        if gateway:
                            customer_id = gateway.customer_id
                            logger.info(f"Gateway '{gateway_id}' ist" + (" einem Kunden zugeordnet" if customer_id else " KEINEM Kunden zugeordnet"))
                        
                        # Geräte aus der normalisierten Nachricht registrieren
                        registered_devices = []
                        for device in normalized_data.get('devices', []):
                            try:
                                device_id = device['id']
                                device_type = device['type']
                                
                                # Synthetisches device_data für die bestehende register_device_from_message-Funktion erstellen
                                device_data = {
                                    "id": device_id,
                                    "value": device['values']
                                }
                                
                                if register_device_from_message:
                                    registered_device = register_device_from_message(gateway_id, device_data)
                                    if registered_device:
                                        registered_devices.append(registered_device.to_dict())
                                        logger.info(f"Gerät {registered_device.device_id} für Gateway {gateway_id} registriert/aktualisiert")
                            except Exception as e:
                                logger.error(f"Fehler bei der Registrierung des Geräts: {str(e)}")
                        
                        logger.info(f"{len(registered_devices)} Geräte für Gateway {gateway_id} registriert/aktualisiert")
                        
                        # Filterschritt (wird in zukünftigen Versionen implementiert)
                        should_forward = True
                        forward_reason = "Standardverhalten: Weiterleitung aktiviert"
                        
                        # Prüfen, ob Gateway einem Kunden zugeordnet ist (grundlegende Filterregel)
                        if not customer_id:
                            should_forward = False
                            forward_reason = "Gateway ist keinem Kunden zugeordnet"
                        
                        # Bei fehlender Redis-Verbindung ebenfalls nicht weiterleiten
                        if not REDIS_AVAILABLE:
                            should_forward = False
                            forward_reason = "Redis nicht verfügbar"
                        
                        # Wenn keine Weiterleitung erfolgen soll, Nachricht nur speichern
                        if not should_forward:
                            logger.warning(f"Nachricht wird nicht weitergeleitet: {forward_reason}")
                            return jsonify({
                                'status': 'success',
                                'data': {
                                    'gateway_id': gateway_id,
                                    'devices': registered_devices,
                                    'normalized': True,
                                    'message': f'Gateway und Geräte aktualisiert, Nachricht wird nicht weitergeleitet ({forward_reason})'
                                }
                            })
                        
                        # Transformations- und Weiterleitungsschritt
                        # (Für die Übergangsphase verwenden wir noch das bestehende Template-System)
                        
                        # Template automatisch auswählen
                        is_panic = False
                        for device in normalized_data.get('devices', []):
                            values = device.get('values', {})
                            if values.get('alarmstatus') == 'alarm' and values.get('alarmtype') == 'panic':
                                is_panic = True
                                break
                        
                        template_name = 'evalarm_panic' if is_panic else 'evalarm'
                        
                        # Nachricht in die Queue stellen (bestehende Logik)
                        message_id = int(time.time() * 1000)
                        processed_data = {
                            'gateway_id': gateway_id,
                            'endpoint': 'auto',  # Automatische Endpunktwahl basierend auf Gateway-ID
                            'template': template_name,
                            'message': normalized_data,  # Hier verwenden wir die normalisierte Nachricht!
                            'timestamp': int(time.time())
                        }
                        
                        redis_client.set(f"message:{message_id}", json.dumps(processed_data))
                        redis_client.lpush("message_queue", message_id)
                        
                        logger.info(f"Normalisierte Nachricht {message_id} in Queue gespeichert (Template: {template_name})")
                        
                        return jsonify({
                            'status': 'success',
                            'data': {
                                'message_id': message_id,
                                'gateway_id': gateway_id,
                                'devices': registered_devices,
                                'template': template_name,
                                'normalized': True,
                                'status': 'queued'
                            }
                        })
                        
                    except Exception as e:
                        logger.error(f"Fehler beim Verarbeiten des Gateways {gateway_id}: {str(e)}")
                        logger.error(f"Exception Typ: {type(e).__name__}")
                        import traceback
                        logger.error(f"Stacktrace: {traceback.format_exc()}")
                        return jsonify({
                            'status': 'error',
                            'error': {
                                'message': f'Fehler bei der Gateway-Verarbeitung: {str(e)}',
                                'code': 'gateway_processing_error'
                            }
                        }), 500
                else:
                    logger.warning(f"Models nicht verfügbar. Verwende Fallback-Verarbeitung.")
                    # Fallback auf alte Implementierung, wenn Models nicht verfügbar sind
            except Exception as e:
                logger.error(f"Fehler bei der Nachrichtennormalisierung: {str(e)}")
                logger.error(f"Exception Typ: {type(e).__name__}")
                import traceback
                logger.error(f"Stacktrace: {traceback.format_exc()}")
                logger.warning("Verwende Fallback-Verarbeitung nach Fehler in der Normalisierung.")
                # Fallback auf alte Implementierung bei Fehlern in der Normalisierung
        
        # ALTE IMPLEMENTIERUNG (FALLBACK)
        # Wird verwendet, wenn der Normalisierer nicht verfügbar ist oder ein Fehler aufgetreten ist
        
        # 1. Gateway-ID aus der Nachricht extrahieren
        logger.info("Verwende alte Nachrichtenverarbeitungsarchitektur als Fallback")
        gateway_id = None
        
        logger.info(f"=== GATEWAY IDENTIFICATION DEBUG ===")
        logger.info(f"Empfangene Daten: {json.dumps(data, indent=2)}")
        
        # Verschiedene Möglichkeiten für die Gateway-ID
        if 'gateway_id' in data:
            gateway_id = data['gateway_id']
            logger.info(f"Gateway-ID aus 'gateway_id' gefunden: '{gateway_id}'")
        elif 'gateway' in data and isinstance(data['gateway'], dict) and 'uuid' in data['gateway']:
            gateway_id = data['gateway']['uuid']
            logger.info(f"Gateway-ID aus 'gateway.uuid' gefunden: '{gateway_id}'")
        elif 'gateway_uuid' in data:
            gateway_id = data['gateway_uuid']
            logger.info(f"Gateway-ID aus 'gateway_uuid' gefunden: '{gateway_id}'")
        elif 'gatewayId' in data:
            gateway_id = data['gatewayId']
            logger.info(f"Gateway-ID aus 'gatewayId' gefunden: '{gateway_id}'")
        elif 'uuid' in data:
            gateway_id = data['uuid']
            logger.info(f"Gateway-ID aus 'uuid' gefunden: '{gateway_id}'")
        elif 'id' in data:
            gateway_id = data['id']
            logger.info(f"Gateway-ID aus 'id' gefunden: '{gateway_id}'")
        else:
            logger.warning(f"Keine bekannten Gateway-ID-Felder in den Daten gefunden.")
            
        if not gateway_id:
            logger.error(f"Konnte Gateway-ID nicht extrahieren. Vollständige Daten: {json.dumps(data, indent=2)}")
            return jsonify({
                'status': 'error',
                'error': {
                    'message': 'Gateway-ID konnte nicht gefunden werden',
                    'code': 'missing_gateway_id'
                }
            }), 400
            
        logger.info(f"Gateway-ID aus Nachricht extrahiert: '{gateway_id}' (Typ: {type(gateway_id).__name__})")
        
        # 2. Gateway registrieren oder aktualisieren
        if MODELS_AVAILABLE and Gateway:
            try:
                current_time = time.time()
                formatted_time = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(current_time))
                
                # Entferne mögliche Whitespaces oder Newlines
                gateway_id = gateway_id.strip() if isinstance(gateway_id, str) else gateway_id
                logger.info(f"Suche Gateway mit UUID: '{gateway_id}'")
                
                gateway = Gateway.find_by_uuid(gateway_id)
                if gateway:
                    logger.info(f"Gateway '{gateway_id}' gefunden, aktualisiere Status")
                    # Aktualisiere den Status UND den last_contact-Zeitstempel
                    gateway.update(status='online', last_contact=formatted_time)
                    logger.info(f"Gateway '{gateway_id}' Status auf 'online' aktualisiert, last_contact={formatted_time}")
                else:
                    logger.info(f"Gateway '{gateway_id}' nicht gefunden, erstelle neuen Eintrag")
                    Gateway.create(uuid=gateway_id, customer_id=None, status='online', last_contact=formatted_time)
                    logger.info(f"Neues Gateway '{gateway_id}' ohne Kundenzuordnung erstellt, last_contact={formatted_time}")
                
                # Prüfe, ob das Gateway einem Kunden zugeordnet ist
                customer_id = None
                if gateway:
                    customer_id = gateway.customer_id
                    logger.info(f"Gateway '{gateway_id}' ist" + (" einem Kunden zugeordnet" if customer_id else " KEINEM Kunden zugeordnet"))
                
                # 3. Geräte erkennen und registrieren
                registered_devices = []
                
                # Originalnachricht extrahieren
                message = data.get('message', data)
                
                # Verschiedene Nachrichtenformate verarbeiten
                if 'subdevicelist' in message and isinstance(message['subdevicelist'], list):
                    # Format 1: Nachricht mit subdevicelist
                    subdevices = message['subdevicelist']
                    logger.info(f"Gefundene subdevicelist mit {len(subdevices)} Geräten")
                    for device_data in subdevices:
                        try:
                            if register_device_from_message:
                                registered_device = register_device_from_message(gateway_id, device_data)
                                if registered_device:
                                    registered_devices.append(registered_device.to_dict())
                                    logger.info(f"Gerät {registered_device.device_id} für Gateway {gateway_id} registriert/aktualisiert")
                        except Exception as e:
                            logger.error(f"Fehler bei der Registrierung des Geräts: {str(e)}")
                # Format 2: Nachricht mit subdeviceid (ohne subdevicelist)
                elif 'subdeviceid' in message:
                    try:
                        # Erstelle ein synthetisches device_data im Format, das register_device_from_message erwartet
                        device_data = {
                            "id": str(message['subdeviceid']),
                            "value": {}
                        }
                        
                        # Übertrage relevante Werte in das value-Objekt
                        for key in ['alarmstatus', 'alarmtype', 'currenttemperature', 'currenthumidity', 
                                   'batterystatus', 'onlinestatus', 'electricity', 'armstatus']:
                            if key in message:
                                device_data['value'][key] = message[key]
                                
                        # Code-basierte Alarmtypen
                        if 'code' in message:
                            if message['code'] == 2030:  # Panic-Button-Code
                                device_data['value']['alarmstatus'] = 'alarm'
                                device_data['value']['alarmtype'] = 'panic'
                        
                        logger.info(f"Gerät aus subdeviceid extrahiert: {device_data}")
                        
                        if register_device_from_message:
                            registered_device = register_device_from_message(gateway_id, device_data)
                            if registered_device:
                                registered_devices.append(registered_device.to_dict())
                                logger.info(f"Gerät {registered_device.device_id} für Gateway {gateway_id} registriert/aktualisiert")
                    except Exception as e:
                        logger.error(f"Fehler bei der Registrierung des Geräts mit subdeviceid: {str(e)}")
                        logger.error(f"Exception Typ: {type(e).__name__}")
                        import traceback
                        logger.error(f"Stacktrace: {traceback.format_exc()}")
                
                logger.info(f"{len(registered_devices)} Geräte für Gateway {gateway_id} registriert/aktualisiert")
                logger.info(f"=== GATEWAY PROCESSING COMPLETE ===")
                
                # 4. Nachrichtenweiterleitung (nur wenn Gateway einem Kunden zugeordnet ist)
                if not REDIS_AVAILABLE:
                    logger.warning("Redis nicht verfügbar. Nachricht wird nicht weitergeleitet.")
                    return jsonify({
                        'status': 'success',
                        'data': {
                            'gateway_id': gateway_id,
                            'devices': registered_devices,
                            'message': 'Gateway und Geräte aktualisiert, Nachricht kann nicht weitergeleitet werden (Redis nicht verfügbar)'
                        }
                    })
                
                # Prüfe, ob das Gateway einem Kunden zugeordnet ist
                if not customer_id:
                    logger.warning(f"Gateway {gateway_id} ist keinem Kunden zugeordnet. Nachricht wird nicht weitergeleitet.")
                    return jsonify({
                        'status': 'success',
                        'data': {
                            'gateway_id': gateway_id,
                            'devices': registered_devices,
                            'message': 'Gateway und Geräte aktualisiert, Nachricht wird nicht weitergeleitet (Gateway keinem Kunden zugeordnet)'
                        }
                    })
                
                # Template automatisch auswählen
                # Prüfen auf Panic-Alarm
                is_panic = False
                if isinstance(message, dict) and 'subdevicelist' in message:
                    for device in message.get('subdevicelist', []):
                        if isinstance(device, dict) and 'value' in device:
                            value = device.get('value', {})
                            if value.get('alarmstatus') == 'alarm' and value.get('alarmtype') == 'panic':
                                is_panic = True
                                break
                
                # Template auswählen
                template_name = 'evalarm_panic' if is_panic else 'evalarm'
                
                # Nachricht in die Queue stellen
                message_id = int(time.time() * 1000)
                processed_data = {
                    'gateway_id': gateway_id,
                    'endpoint': 'auto',  # Automatische Endpunktwahl basierend auf Gateway-ID
                    'template': template_name,
                    'message': message,
                    'timestamp': int(time.time())
                }
                
                redis_client.set(f"message:{message_id}", json.dumps(processed_data))
                redis_client.lpush("message_queue", message_id)
                
                logger.info(f"Nachricht {message_id} in Queue gespeichert (Template: {template_name})")
                
                return jsonify({
                    'status': 'success',
                    'data': {
                        'message_id': message_id,
                        'gateway_id': gateway_id,
                        'devices': registered_devices,
                        'template': template_name,
                        'status': 'queued'
                    }
                })
                
            except Exception as e:
                logger.error(f"Fehler beim Verarbeiten des Gateways {gateway_id}: {str(e)}")
                logger.error(f"Exception Typ: {type(e).__name__}")
                import traceback
                logger.error(f"Stacktrace: {traceback.format_exc()}")
                return jsonify({
                    'status': 'error',
                    'error': {
                        'message': f'Fehler bei der Gateway-Verarbeitung: {str(e)}',
                        'code': 'gateway_processing_error'
                    }
                }), 500
        else:
            logger.warning(f"Models nicht verfügbar. Gateway {gateway_id} kann nicht registriert werden.")
            
            # Auch ohne verfügbare Models können wir die Nachricht in die Queue stellen
            if REDIS_AVAILABLE:
                message = data.get('message', data)
                message_id = int(time.time() * 1000)
                processed_data = {
                    'gateway_id': gateway_id,
                    'endpoint': 'evalarm',  # Standard-Endpunkt
                    'template': 'evalarm',  # Standard-Template
                    'message': message,
                    'timestamp': int(time.time())
                }
                
                redis_client.set(f"message:{message_id}", json.dumps(processed_data))
                redis_client.lpush("message_queue", message_id)
                
                logger.info(f"Nachricht {message_id} in Queue gespeichert (Standard-Verarbeitung)")
                
                return jsonify({
                    'status': 'success',
                    'data': {
                        'message_id': message_id,
                        'gateway_id': gateway_id,
                        'status': 'queued'
                    }
                })
            else:
                return jsonify({
                    'status': 'error',
                    'error': {
                        'message': 'Modelle und Redis nicht verfügbar. Nachricht kann nicht verarbeitet werden.',
                        'code': 'services_unavailable'
                    }
                }), 503

    except Exception as e:
        logger.error(f"Fehler bei der Nachrichtenverarbeitung: {str(e)}")
        return jsonify({
            'status': 'error',
            'error': {
                'message': f'Fehler bei der Verarbeitung: {str(e)}',
                'code': 'processing_error'
            }
        }), 500

@app.route('/api/v1/messages/queue_status', methods=['GET'])
def queue_status():
    """
    Gibt den Status der Nachrichtenqueue zurück.
    """
    if not REDIS_AVAILABLE:
        return jsonify({
            'status': 'error',
            'error': {
                'message': 'Redis ist nicht verfügbar. Queue-Status kann nicht abgerufen werden.',
                'code': 'redis_unavailable'
            }
        }), 503
    
    queue_length = redis_client.llen("message_queue")
    processing_count = redis_client.get("processing_count")
    processing_count = int(processing_count) if processing_count else 0
    
    failed_queue_length = redis_client.llen("failed_queue")
    
    return jsonify({
        'status': 'success',
        'data': {
            'queue_length': queue_length,
            'processing': processing_count,
            'failed': failed_queue_length
        }
    })

@app.route('/api/v1/health', methods=['GET'])
def health_check():
    """
    Gibt den Gesundheitsstatus des Services zurück.
    """
    health_data = {
        'service': 'processor',
        'status': 'ok',
        'redis': 'connected' if REDIS_AVAILABLE else 'disconnected',
        'timestamp': int(time.time())
    }
    
    if not REDIS_AVAILABLE and os.environ.get('FLASK_ENV') == 'production':
        health_data['status'] = 'degraded'
    
    return jsonify({
        'status': 'success',
        'data': health_data
    })

@app.route('/api/v1/system/health', methods=['GET'])
def system_health():
    """
    Systemweiter Gesundheitsstatus für das Dashboard
    """
    # System-Informationen sammeln
    import psutil
    import socket
    from datetime import datetime
    
    # Uptime berechnen
    system_start_time = time.time() - 3600  # Vereinfachung: Annahme 1 Stunde Betriebszeit
    uptime_seconds = time.time() - system_start_time
    
    # System-Informationen
    system_info = {
        "cpu_percent": psutil.cpu_percent(),
        "memory_percent": psutil.virtual_memory().percent,
        "hostname": socket.gethostname()
    }
    
    # Detaillierte Health-Informationen
    health_data = {
        "service": "processor",
        "status": "online",
        "uptime_seconds": uptime_seconds,
        "uptime_formatted": f"{int(uptime_seconds // 86400)}d {int((uptime_seconds % 86400) // 3600)}h {int((uptime_seconds % 3600) // 60)}m",
        "system": system_info,
        "connections": {
            "redis": "connected" if REDIS_AVAILABLE else "disconnected"
        },
        "timestamp": datetime.now().isoformat()
    }
    
    return jsonify({
        'status': 'success',
        'data': health_data
    })

@app.route('/api/v1/system/endpoints', methods=['GET'])
def list_endpoints():
    """
    Listet alle verfügbaren Endpunkte des Processor-Service auf
    """
    endpoints = [
        {'path': '/api/v1/messages/process', 'method': 'POST', 'description': 'Hauptendpunkt für Gateway-Nachrichten'},
        {'path': '/api/v1/messages/queue_status', 'method': 'GET', 'description': 'Status der Nachrichtenqueue'},
        {'path': '/api/v1/health', 'method': 'GET', 'description': 'Processor Health-Status'},
        {'path': '/api/v1/system/health', 'method': 'GET', 'description': 'Systemweiter Gesundheitsstatus'},
        {'path': '/api/v1/system/endpoints', 'method': 'GET', 'description': 'Listet alle Endpunkte auf'},
        {'path': '/api/v1/templates', 'method': 'GET', 'description': 'Listet alle verfügbaren Templates'},
        {'path': '/api/v1/messages/retry/<message_id>', 'method': 'POST', 'description': 'Nachricht erneut verarbeiten'},
        {'path': '/api/v1/messages/status', 'method': 'GET', 'description': 'Status aller Nachrichten'}
    ]
    
    return jsonify({
        'status': 'success',
        'data': endpoints
    })

@app.route('/api/v1/templates', methods=['GET'])
def list_templates():
    """
    Listet alle verfügbaren Templates auf
    """
    # Statt nur Beispiel-Template-Namen zurückgeben, echte Template-Objekte erstellen
    templates = []
    template_names = ["evalarm_payload", "evalarm_panic", "standard", "evalarm_panic_v2", "evalarm", "endpoints", "customer_config", "evalarm_alarm", "evalarm_raw"]
    
    # Aktuelle Zeit für created_at
    import datetime
    current_time = datetime.datetime.now().isoformat()
    
    for name in template_names:
        # Provider-Typ bestimmen
        provider_type = 'generic'
        if 'evalarm' in name:
            provider_type = 'evalarm'
        elif 'roombanker' in name:
            provider_type = 'roombanker'
        
        # Template-Objekt erstellen
        template = {
            'id': name,
            'name': name,
            'provider_type': provider_type,
            'created_at': current_time
        }
        templates.append(template)
    
    return jsonify({
        'status': 'success',
        'data': templates
    })

@app.route('/api/v1/messages/status', methods=['GET'])
def get_message_status():
    """
    Gibt den Status aller verarbeiteten Nachrichten zurück
    """
    # In einer echten Implementierung würden wir Nachrichten aus Redis oder MongoDB abrufen
    # Für Demonstrationszwecke liefern wir Beispieldaten
    from datetime import datetime, timedelta
    
    now = datetime.now()
    
    messages = [
        {
            "id": "msg-1234567890",
            "status": "processed",
            "received_at": (now - timedelta(minutes=5)).isoformat(),
            "processed_at": (now - timedelta(minutes=4, seconds=50)).isoformat(),
            "data": {
                "gateway_id": "gw-abcdef123456",
                "ts": int(time.time()) - 300,
                "subdevicelist": [
                    {
                        "id": 12345678,
                        "value": {
                            "alarmstatus": "normal",
                            "batterystatus": "ok"
                        }
                    }
                ]
            }
        },
        {
            "id": "msg-0987654321",
            "status": "processed",
            "received_at": (now - timedelta(minutes=2)).isoformat(),
            "processed_at": (now - timedelta(minutes=1, seconds=55)).isoformat(),
            "data": {
                "gateway_id": "gw-abcdef123456",
                "ts": int(time.time()) - 120,
                "subdevicelist": [
                    {
                        "id": 87654321,
                        "value": {
                            "alarmstatus": "alarm",
                            "alarmtype": "panic"
                        }
                    }
                ]
            }
        }
    ]
    
    return jsonify({
        'status': 'success',
        'data': messages
    })

@app.route('/api/v1/system/test-message', methods=['POST'])
def create_test_message():
    """
    Erstellt eine Test-Panic-Button-Nachricht und stellt sie in die Queue
    """
    import uuid
    from datetime import datetime
    
    # Erstelle eine Test-Nachricht (Panic-Button)
    current_time = int(time.time())
    test_message = {
        "gateway_id": "gw-test-" + str(uuid.uuid4())[:8],
        "ts": current_time,
        "subdevicelist": [
            {
                "id": int(time.time() * 1000) % 1000000000000000,
                "value": {
                    "alarmstatus": "alarm",
                    "alarmtype": "panic",
                    "is_test": True,
                    "created_at": datetime.now().isoformat()
                }
            }
        ]
    }
    
    message_id = str(uuid.uuid4())
    
    # In einer realen Implementierung würden wir die Nachricht in Redis speichern
    # und zur Verarbeitung in die Queue stellen
    if REDIS_AVAILABLE:
        try:
            # Nachricht in Redis speichern
            redis_client.set(f"message:{message_id}", json.dumps(test_message))
            # Nachricht in die Queue stellen
            redis_client.lpush("message_queue", message_id)
            logger.info(f"Test-Nachricht {message_id} in Queue gestellt")
        except Exception as e:
            logger.error(f"Fehler beim Speichern der Test-Nachricht: {str(e)}")
            return jsonify({
                'status': 'error',
                'error': {
                    'message': f"Fehler beim Speichern der Test-Nachricht: {str(e)}",
                    'code': 'redis_error'
                }
            }), 500
    
    # Speichere die Nachricht auch in der In-Memory-Liste für /api/v1/messages/status
    test_message_with_metadata = {
        "id": message_id,
        "status": "queued" if REDIS_AVAILABLE else "processed",
        "received_at": datetime.now().isoformat(),
        "is_test": True,
        "data": test_message
    }
    
    # Hier würden wir die Nachricht in der Datenbank oder einem globalen In-Memory-Store speichern
    
    return jsonify({
        'status': 'success',
        'data': {
            'message_id': message_id,
            'message': test_message_with_metadata
        },
        'message': 'Test-Nachricht erfolgreich erstellt'
    })

@app.route('/api/v1/process', methods=['POST'])
def legacy_process_endpoint():
    """
    Legacy-Endpunkt, der Anfragen an den neuen Hauptendpunkt /api/v1/messages/process weiterleitet.
    VERALTET: Bitte verwenden Sie stattdessen /api/v1/messages/process
    """
    logger.warning(f"VERALTET: /api/v1/process wurde aufgerufen. Bitte verwenden Sie stattdessen /api/v1/messages/process.")
    return process_message_endpoint()

if __name__ == '__main__':
    port = int(os.environ.get('PROCESSOR_PORT', 8082))
    debug = os.environ.get('FLASK_ENV') != 'production'
    
    logger.info(f"Message Processor startet auf Port {port}")
    app.run(host='0.0.0.0', port=port, debug=debug) 