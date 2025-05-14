import os
import sys
import json
import time
import signal
import logging
import threading
import uuid
from flask import Flask, jsonify, request, Blueprint
from flask_cors import CORS
from typing import Dict, Any, List, Optional
from datetime import datetime
import redis

# Füge das Projektverzeichnis zum Python-Pfad hinzu
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Füge den utils-Ordner zum Pfad hinzu, damit wir message_forwarder.py importieren können
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from api.message_queue import get_message_queue
from utils.template_engine import TemplateEngine, MessageForwarder
from utils.api_config import get_route, API_VERSION
from utils.api_handlers import (
    success_response, error_response, 
    not_found_response, validation_error_response,
    unauthorized_response, forbidden_response,
    api_error_handler
)

# Konfiguriere Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    filename=os.path.join(os.path.dirname(os.path.abspath(__file__)), 'worker.log'),
    filemode='a'
)
logger = logging.getLogger('message-worker')

# Flask-Blueprint für API-Endpunkte
app = Blueprint('worker', __name__)
CORS(app)  # Erlaube Cross-Origin Requests

# Globale Worker-Instanz
worker_instance = None

class MessageWorker:
    """
    Worker zum Verarbeiten von Nachrichten aus der Redis-Queue
    """
    
    def __init__(self, num_threads: int = 2, poll_interval: float = 0.5):
        """
        Initialisiere den Message Worker
        
        Args:
            num_threads: Anzahl der Worker-Threads
            poll_interval: Zeit zwischen Queue-Abfragen in Sekunden
        """
        self.queue = get_message_queue()
        self.num_threads = num_threads
        self.poll_interval = poll_interval
        self.running = False
        self.threads: List[threading.Thread] = []
        
        # Projektverzeichnis
        PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        
        # Stelle sicher, dass das Templates-Verzeichnis existiert
        templates_dir = os.path.join(PROJECT_DIR, 'templates')
        if not os.path.exists(templates_dir):
            try:
                os.makedirs(templates_dir)
                logger.info(f"Templates-Verzeichnis {templates_dir} erstellt")
            except Exception as e:
                logger.error(f"Fehler beim Erstellen des Templates-Verzeichnisses: {str(e)}")
        
        # Initialisiere Template-Engine und Message-Forwarder
        self.template_engine = TemplateEngine(templates_dir)
        self.message_forwarder = MessageForwarder()
        self.message_forwarder.template_engine = self.template_engine  # Verbinde MessageForwarder mit TemplateEngine
        
        # Signal Handler für graceful shutdown
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)
        
        logger.info(f"Message Worker initialisiert mit {num_threads} Threads")
    
    def _signal_handler(self, signum, frame):
        """
        Handler für SIGINT und SIGTERM
        """
        logger.info(f"Signal {signum} empfangen, Worker wird gestoppt...")
        self.stop()
    
    def _worker_thread(self):
        """
        Worker-Thread zum Verarbeiten von Nachrichten
        """
        thread_id = threading.get_ident()
        logger.info(f"Worker-Thread {thread_id} gestartet")
        
        while self.running:
            try:
                # Hole nächste Nachricht aus der Queue
                job = self.queue.get_next_message()
                
                if job:
                    logger.info(f"Verarbeite Nachricht: {job['id']}")
                    self._process_message(job)
                else:
                    # Keine Nachrichten in der Queue, warte kurz
                    time.sleep(self.poll_interval)
            
            except Exception as e:
                logger.error(f"Fehler im Worker-Thread {thread_id}: {str(e)}")
                time.sleep(1)  # Kurze Pause bei Fehlern
        
        logger.info(f"Worker-Thread {thread_id} beendet")
    
    def _process_message(self, job: Dict[str, Any]):
        """
        Verarbeite eine Nachricht aus der Queue
        
        Args:
            job: Die zu verarbeitende Nachricht mit Metadaten
        """
        try:
            message = job['message']
            template_name = job['template']
            customer_config = job.get('customer_config')
            
            # Gateway-ID aus der Job-Daten extrahieren
            gateway_id = job.get('gateway_id')
            if not gateway_id:
                error_msg = "Keine Gateway-ID in den Job-Daten gefunden"
                logger.error(error_msg)
                self.queue.mark_as_failed(job['id'], error_msg)
                return
            
            # Sicherheitscheck: Prüfe, ob ein Kundenkontext vorhanden ist
            if not customer_config:
                error_msg = "SICHERHEITSWARNUNG: Nachricht von nicht zugeordnetem Gateway - Weiterleitung blockiert"
                logger.error(f"{error_msg} - Gateway-ID: {gateway_id}")
                self.queue.mark_as_failed(job['id'], error_msg)
                # Speichere die blockierte Nachricht für spätere Überprüfung
                try:
                    import os
                    import json
                    from datetime import datetime
                    
                    security_log_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'security_logs')
                    os.makedirs(security_log_dir, exist_ok=True)
                    
                    log_file = os.path.join(security_log_dir, f"blocked_message_{datetime.now().strftime('%Y%m%d-%H%M%S')}_{job['id']}.json")
                    with open(log_file, 'w') as f:
                        json.dump({
                            'timestamp': datetime.now().isoformat(),
                            'gateway_id': gateway_id,
                            'message': message,
                            'reason': 'Gateway ist keinem Kunden zugeordnet'
                        }, f, indent=2)
                    
                    logger.info(f"Blockierte Nachricht in {log_file} protokolliert")
                except Exception as e:
                    logger.error(f"Fehler beim Protokollieren der blockierten Nachricht: {str(e)}")
                return
            
            # Transformiere Nachricht mit dem Template und Kundenkonfiguration
            transformed_message = self.template_engine.transform_message(
                message, 
                template_name,
                customer_config=customer_config,
                gateway_id=gateway_id
            )
            
            if not transformed_message:
                error_msg = f'Fehler bei der Transformation mit Template "{template_name}"'
                logger.error(error_msg)
                self.queue.mark_as_failed(job['id'], error_msg)
                return
            
            # Leite transformierte Nachricht weiter
            response = self.message_forwarder.forward_message(
                transformed_message,
                'auto',  # 'evalarm' durch 'auto' ersetzt für automatische Endpunktauswahl
                gateway_uuid=gateway_id
            )
            
            if not response or response.status_code >= 400:
                error_msg = f'Fehler bei der Weiterleitung an evAlarm API: {response.text if response else "Keine Antwort"}'
                logger.error(error_msg)
                self.queue.mark_as_failed(job['id'], error_msg)
                return
            
            # Erstelle Ergebnis
            result = {
                'original_message': message,
                'transformed_message': transformed_message,
                'customer': customer_config['name'],
                'response_status': response.status_code,
                'response_text': response.text,
                'template_used': template_name
            }
            
            # Markiere als erfolgreich
            self.queue.mark_as_completed(job['id'], result)
            logger.info(f"Nachricht erfolgreich verarbeitet und weitergeleitet: {job['id']}")
            
        except Exception as e:
            logger.error(f"Fehler bei der Verarbeitung von Nachricht {job['id']}: {str(e)}")
            self.queue.mark_as_failed(job['id'], str(e))
    
    def start(self):
        """
        Starte den Message Worker
        """
        if self.running:
            logger.warning("Worker läuft bereits")
            return
        
        self.running = True
        
        # Starte Worker-Threads
        for _ in range(self.num_threads):
            thread = threading.Thread(target=self._worker_thread)
            thread.daemon = True
            thread.start()
            self.threads.append(thread)
        
        logger.info(f"Message Worker gestartet mit {self.num_threads} Threads")
    
    def stop(self):
        """
        Stoppe den Message Worker
        """
        if not self.running:
            logger.warning("Worker läuft nicht")
            return
        
        self.running = False
        
        # Warte auf Beendigung aller Threads
        for thread in self.threads:
            thread.join(timeout=5.0)
        
        self.threads = []
        logger.info("Message Worker gestoppt")
    
    def get_status(self) -> Dict[str, Any]:
        """
        Gibt den Status des Workers zurück
        
        Returns:
            Ein Dictionary mit Informationen über den Worker-Status
        """
        return {
            'running': self.running,
            'num_threads': self.num_threads,
            'active_threads': len([t for t in self.threads if t.is_alive()]),
            'queue_status': self.queue.get_queue_status()
        }

# Hilfsfunktion zur Überprüfung der Worker-Initialisierung
def check_worker_initialized():
    """
    Überprüft, ob der Worker initialisiert ist und gibt eine Fehlerantwort zurück, wenn nicht
    
    Returns:
        None, wenn der Worker initialisiert ist, sonst eine Fehlerantwort
    """
    if worker_instance is None:
        return error_response("Worker ist nicht initialisiert", 500)
    return None

# API-Endpunkte mit der zentralen API-Konfiguration
@app.route(get_route('messages', 'status'), methods=['GET'])
@api_error_handler
def get_message_status():
    """Gibt den Status aller verarbeiteten Nachrichten zurück"""
    error = check_worker_initialized()
    if error:
        return error
    
    queue = worker_instance.queue
    
    # Hole die letzten Ergebnisse
    results_json = queue.redis_client.lrange(queue.results_list, 0, 99)
    results = [json.loads(result) for result in results_json]
    
    # Hole fehlgeschlagene Nachrichten
    failed_messages = queue.get_failed_messages()
    
    # Kombiniere alle Statusnachrichten
    all_statuses = results + failed_messages
    
    # Sortiere nach Zeit (neueste zuerst)
    all_statuses.sort(key=lambda x: x.get('completed_at', 0) or x.get('failed_at', 0) or 0, reverse=True)
    
    logger.info(f"Nachrichtenstatus abgefragt: {len(all_statuses)} Nachrichten gefunden")
    return success_response(all_statuses)

@app.route(get_route('messages', 'queue_status'), methods=['GET'])
@api_error_handler
def get_queue_status():
    """Gibt den Status der Nachrichtenqueue zurück"""
    error = check_worker_initialized()
    if error:
        return error
    
    queue = worker_instance.queue
    status = queue.get_queue_status()
    
    logger.info(f"Queue-Status abgefragt: {status.get('queue_length', 0)} Nachrichten in der Queue")
    return success_response(status)

@app.route(get_route('messages', 'forwarding'), methods=['GET'])
@api_error_handler
def get_forwarding_status():
    """Gibt den Status der Nachrichtenweiterleitung zurück"""
    error = check_worker_initialized()
    if error:
        return error
    
    queue = worker_instance.queue
    
    # Hole die letzten Ergebnisse
    results_json = queue.redis_client.lrange(queue.results_list, 0, 99)
    results = [json.loads(result) for result in results_json]
    
    # Hole fehlgeschlagene Nachrichten
    failed_messages = queue.get_failed_messages()
    
    # Hole aktuelle Verarbeitungsqueue
    processing_ids = queue.redis_client.hkeys(queue.processing_queue)
    processing_messages = []
    for job_id in processing_ids:
        job_json = queue.redis_client.hget(queue.processing_queue, job_id)
        if job_json:
            processing_messages.append(json.loads(job_json))
    
    # Zähle nach Status
    forwarding_status = {
        "pending": queue.redis_client.llen(queue.main_queue),
        "processing": len(processing_messages),
        "completed": len([msg for msg in results if msg.get('status') == 'completed']),
        "failed": len(failed_messages),
        "details": {
            "pending": [],
            "processing": processing_messages,
            "completed": [msg for msg in results if msg.get('status') == 'completed'],
            "failed": failed_messages
        }
    }
    
    logger.info(f"Weiterleitungsstatus abgefragt: {forwarding_status['pending']} ausstehend, {forwarding_status['processing']} in Verarbeitung, {forwarding_status['completed']} abgeschlossen, {forwarding_status['failed']} fehlgeschlagen")
    return success_response(forwarding_status)

@app.route(get_route('messages', 'retry'), methods=['POST'])
@api_error_handler
def retry_message(message_id):
    """Versucht, eine fehlgeschlagene Nachricht erneut zu senden"""
    error = check_worker_initialized()
    if error:
        return error
    
    # Implementiere Retry-Logik hier
    queue = worker_instance.queue
    success = queue.retry_failed_message(message_id)
    
    if success:
        logger.info(f"Nachricht {message_id} erfolgreich für erneuten Versuch eingeplant")
        return success_response({"retried": True, "message_id": message_id})
    else:
        logger.warning(f"Nachricht {message_id} nicht in der Failed-Queue gefunden")
        return not_found_response("message", message_id)

@app.route(get_route('system', 'health'), methods=['GET'])
@api_error_handler
def health_check():
    """Gesundheitscheck für den Worker"""
    error = check_worker_initialized()
    if error:
        return error
    
    status = worker_instance.get_status()
    health_status = "healthy" if status['running'] else "unhealthy"
    
    logger.info(f"Health-Check durchgeführt: {health_status}")
    return success_response({
        "service": "worker",
        "version": API_VERSION,
        "health_status": health_status,
        "worker_status": status
    })

@app.route(get_route('system', 'iot_status'), methods=['GET'])
@api_error_handler
def iot_system_status():
    """Gibt den Status des gesamten IoT-Systems zurück"""
    error = check_worker_initialized()
    if error:
        return error
    
    # Systeminformationen sammeln
    import platform
    try:
        import psutil
    except ImportError:
        logger.warning("psutil ist nicht installiert, einige Systeminformationen sind nicht verfügbar")
        psutil = None
    
    # Worker-Status
    worker_status = worker_instance.get_status()
    
    # Redis-Status
    redis_status = {"connected": False, "error": None}
    try:
        queue = worker_instance.queue
        if queue and queue.redis_client:
            ping_result = queue.redis_client.ping()
            redis_status["connected"] = ping_result
            redis_status["queue_status"] = queue.get_queue_status()
    except Exception as e:
        redis_status["error"] = str(e)
    
    # Template-Status
    template_status = {"loaded": 0, "error": None}
    try:
        if worker_instance.template_engine:
            template_status["loaded"] = len(worker_instance.template_engine.templates)
            template_status["directory"] = worker_instance.template_engine.templates_dir
            template_status["exists"] = os.path.exists(worker_instance.template_engine.templates_dir)
    except Exception as e:
        template_status["error"] = str(e)
    
    # System-Informationen
    system_info = {
        "platform": platform.platform(),
        "python_version": platform.python_version()
    }
    
    # Optional: psutil-Informationen
    if psutil:
        system_info.update({
            "cpu_usage": psutil.cpu_percent(),
            "memory_usage": psutil.virtual_memory().percent,
            "disk_usage": psutil.disk_usage('/').percent
        })
    
    health_status = "healthy" if worker_status['running'] and redis_status["connected"] else "unhealthy"
    
    result = {
        "service": "worker",
        "version": API_VERSION,
        "health_status": health_status,
        "worker": worker_status,
        "redis": redis_status,
        "templates": template_status,
        "system": system_info,
        "timestamp": datetime.now().isoformat()
    }
    
    logger.info(f"System-Status abgefragt: {health_status}")
    return success_response(result)

@app.route(get_route('system', 'endpoints'), methods=['GET'])
@api_error_handler
def get_endpoints():
    """Gibt alle verfügbaren Endpunkte zurück"""
    error = check_worker_initialized()
    if error:
        return error
    
    # Leere Liste zurückgeben, wenn message_forwarder nicht existiert
    if not hasattr(worker_instance, 'message_forwarder') or worker_instance.message_forwarder is None:
        logger.warning("Message Forwarder ist nicht initialisiert")
        return success_response([])
    
    endpoints = worker_instance.message_forwarder.get_endpoint_names()
    logger.info(f"{len(endpoints)} Endpunkte gefunden")
    return success_response(endpoints)

@app.route(get_route('templates', 'list'), methods=['GET'])
@api_error_handler
def get_templates():
    """Gibt alle verfügbaren Templates zurück"""
    error = check_worker_initialized()
    if error:
        return error
    
    # Prüfe, ob das Templates-Verzeichnis existiert
    if not os.path.exists(worker_instance.template_engine.templates_dir):
        logger.warning(f"Templates-Verzeichnis {worker_instance.template_engine.templates_dir} existiert nicht")
        # Leere Liste zurückgeben statt Fehler
        return success_response([])
    
    # Versuche, die Templates neu zu laden (für den Fall, dass sich etwas geändert hat)
    worker_instance.template_engine.reload_templates()
    
    templates = worker_instance.template_engine.get_template_names()
    logger.info(f"{len(templates)} Templates gefunden")
    return success_response(templates)

@app.route(get_route('templates', 'detail'), methods=['GET'])
@api_error_handler
def get_template(template_id):
    """Gibt ein spezifisches Template zurück"""
    error = check_worker_initialized()
    if error:
        return error
    
    template = worker_instance.template_engine.get_template(template_id)
    if template:
        logger.info(f"Template {template_id} abgerufen")
        return success_response(template)
    else:
        logger.warning(f"Template {template_id} nicht gefunden")
        return not_found_response("template", template_id)

@app.route(get_route('templates', 'test'), methods=['POST'])
@api_error_handler
def test_transform():
    """Testet die Transformation einer Nachricht mit einem Template"""
    error = check_worker_initialized()
    if error:
        return error
    
    data = request.json
    
    # Validierung
    validation_errors = {}
    if not data or not isinstance(data, dict):
        return validation_error_response({"request": "Ungültiges JSON-Format"})
    
    if 'template_id' not in data:
        validation_errors['template_id'] = "Template-ID ist erforderlich"
    
    if 'message' not in data:
        validation_errors['message'] = "Nachricht ist erforderlich"
    
    if validation_errors:
        return validation_error_response(validation_errors)
    
    template_id = data.get('template_id')
    message = data.get('message')
    
    transformed = worker_instance.template_engine.transform_message(message, template_id)
    
    if transformed:
        logger.info(f"Test-Transformation mit Template {template_id} erfolgreich")
        return success_response({
            'original_message': message,
            'transformed_message': transformed,
            'template_used': template_id
        })
    else:
        logger.warning(f"Test-Transformation mit Template {template_id} fehlgeschlagen")
        return error_response(f"Transformation mit Template '{template_id}' fehlgeschlagen", 400)

@app.route('/api/endpoints', methods=['GET'])
@api_error_handler
def list_worker_endpoints():
    """
    Listet alle verfügbaren Endpunkte dieses Services auf
    """
    endpoints = [
        {'path': get_route('messages', 'status'), 'method': 'GET', 'description': 'Nachrichtenstatus abrufen'},
        {'path': get_route('messages', 'queue_status'), 'method': 'GET', 'description': 'Queue-Status abrufen'},
        {'path': get_route('messages', 'forwarding'), 'method': 'GET', 'description': 'Weiterleitungsstatus abrufen'},
        {'path': get_route('messages', 'retry'), 'method': 'POST', 'description': 'Nachricht erneut verarbeiten'},
        {'path': get_route('system', 'health'), 'method': 'GET', 'description': 'Systemstatus abrufen'},
        {'path': get_route('system', 'iot_status'), 'method': 'GET', 'description': 'IoT-Systemstatus abrufen'},
        {'path': get_route('system', 'endpoints'), 'method': 'GET', 'description': 'Verfügbare Endpunkte auflisten'},
        {'path': get_route('templates', 'list'), 'method': 'GET', 'description': 'Templates auflisten'},
        {'path': get_route('templates', 'detail'), 'method': 'GET', 'description': 'Template-Details abrufen'},
        {'path': get_route('templates', 'test'), 'method': 'POST', 'description': 'Template-Transformation testen'},
        {'path': '/api/endpoints', 'method': 'GET', 'description': 'API-Endpunkte auflisten'}
    ]
    
    return success_response(endpoints)

# Singleton-Instanz für die Anwendung
worker_instance = None

def init_worker(num_threads: int = 2, poll_interval: float = 0.5, auto_start: bool = True):
    """
    Initialisiere den Message Worker als Singleton
    
    Args:
        num_threads: Anzahl der Worker-Threads
        poll_interval: Zeit zwischen Queue-Abfragen in Sekunden
        auto_start: Automatisch starten?
    
    Returns:
        Die Worker-Instanz
    """
    global worker_instance
    if worker_instance is None:
        worker_instance = MessageWorker(num_threads, poll_interval)
        if auto_start:
            worker_instance.start()
    return worker_instance

def get_worker():
    """
    Hole die Worker-Instanz
    
    Returns:
        Die Worker-Instanz oder None, falls noch nicht initialisiert
    """
    return worker_instance


if __name__ == '__main__':
    # Standalone-Worker-Prozess
    logger.info("Message Worker wird als eigenständiger Prozess gestartet...")
    
    # Worker mit 2 Threads starten
    worker = init_worker(num_threads=2, poll_interval=0.5)
    
    # Starte Flask-App in einem separaten Thread
    flask_port = int(os.environ.get('WORKER_API_PORT', 8083))
    
    # WICHTIG: Debug-Modus deaktivieren, da er Probleme mit Threads verursacht
    app.debug = False
    flask_thread = threading.Thread(
        target=lambda: app.run(host='0.0.0.0', port=flask_port, debug=False, use_reloader=False, threaded=True)
    )
    flask_thread.daemon = True
    flask_thread.start()
    logger.info(f"Worker API gestartet auf Port {flask_port}")
    print(f"Worker Service läuft auf Port {flask_port} - API Version {API_VERSION}")
    
    try:
        # Halte den Hauptthread am Leben, bis SIGINT oder SIGTERM empfangen wird
        while worker.running:
            time.sleep(1)
    except KeyboardInterrupt:
        logger.info("Keyboard-Interrupt empfangen, Worker wird gestoppt...")
    finally:
        worker.stop() 