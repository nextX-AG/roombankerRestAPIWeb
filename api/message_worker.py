import os
import sys
import json
import time
import signal
import logging
import threading
import uuid
from flask import Flask, jsonify, request
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
from utils.api_config import get_route

# Konfiguriere Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('message-worker')

# Flask-App für API-Endpunkte
app = Flask(__name__)
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
            endpoint_name = job['endpoint']
            
            # Gateway-UUID aus der Nachricht extrahieren
            gateway_uuid = None
            if isinstance(message, dict):
                # Verschiedene mögliche Bezeichnungen für die Gateway-ID prüfen
                for key in ['gateway_uuid', 'gateway_id', 'gateway']:
                    if key in message:
                        if isinstance(message[key], str):
                            gateway_uuid = message[key]
                            break
                        elif isinstance(message[key], dict) and 'id' in message[key]:
                            gateway_uuid = message[key]['id']
                            break
                
                # Aus data.gateway_id extrahieren, falls vorhanden
                if not gateway_uuid and 'data' in message and isinstance(message['data'], dict):
                    data = message['data']
                    if 'gateway_id' in data:
                        gateway_uuid = data['gateway_id']
                    elif 'gateway' in data and isinstance(data['gateway'], dict) and 'id' in data['gateway']:
                        gateway_uuid = data['gateway']['id']
            
            # Wenn template_name "auto" ist oder leer, versuche das Template aus dem Gateway zu laden
            if template_name == "auto" or not template_name:
                if gateway_uuid:
                    # Importiere hier, um zirkuläre Imports zu vermeiden
                    from api.models import Gateway
                    gateway = Gateway.find_by_uuid(gateway_uuid)
                    if gateway and gateway.template_id:
                        logger.info(f"Verwende Template '{gateway.template_id}' aus Gateway-Konfiguration für {gateway_uuid}")
                        template_name = gateway.template_id
                    else:
                        # Standardmäßig evalarm-Template verwenden
                        logger.info(f"Kein Template für Gateway {gateway_uuid} konfiguriert, verwende 'evalarm'")
                        template_name = "evalarm"
                else:
                    # Standardmäßig evalarm-Template verwenden
                    logger.info("Kein Gateway gefunden, verwende 'evalarm' Template")
                    template_name = "evalarm"
            
            # Transformiere Nachricht
            transformed_message = self.template_engine.transform_message(message, template_name)
            
            if not transformed_message:
                error_msg = f'Fehler bei der Transformation mit Template "{template_name}"'
                logger.error(error_msg)
                self.queue.mark_as_failed(job['id'], error_msg)
                return
            
            # Auto-Endpoint verwenden, wenn ein Gateway-UUID verfügbar ist
            actual_endpoint = 'auto' if gateway_uuid and endpoint_name == 'evalarm' else endpoint_name
            
            # Leite transformierte Nachricht weiter
            response = self.message_forwarder.forward_message(
                transformed_message, 
                actual_endpoint, 
                gateway_uuid=gateway_uuid
            )
            
            if not response:
                error_msg = f'Fehler bei der Weiterleitung an Endpunkt "{endpoint_name}"'
                logger.error(error_msg)
                self.queue.mark_as_failed(job['id'], error_msg)
                return
            
            # Erstelle Ergebnis
            result = {
                'original_message': message,
                'transformed_message': transformed_message,
                'endpoint': endpoint_name,
                'gateway_uuid': gateway_uuid,
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

# API-Endpunkte mit der zentralen API-Konfiguration

@app.route(get_route('messages', 'status'), methods=['GET'])
def get_message_status():
    """Gibt den Status aller verarbeiteten Nachrichten zurück"""
    if worker_instance is None:
        return jsonify({"status": "error", "data": None, "error": {"message": "Worker ist nicht initialisiert"}}), 500
    
    queue = worker_instance.queue
    
    try:
        # Hole die letzten Ergebnisse
        results_json = queue.redis_client.lrange(queue.results_list, 0, 99)
        results = [json.loads(result) for result in results_json]
        
        # Hole fehlgeschlagene Nachrichten
        failed_messages = queue.get_failed_messages()
        
        # Kombiniere alle Statusnachrichten
        all_statuses = results + failed_messages
        
        # Sortiere nach Zeit (neueste zuerst)
        all_statuses.sort(key=lambda x: x.get('completed_at', 0) or x.get('failed_at', 0) or 0, reverse=True)
        
        return jsonify({"status": "success", "data": all_statuses, "error": None}), 200
    except Exception as e:
        logger.error(f"Fehler beim Abrufen des Nachrichtenstatus: {str(e)}")
        return jsonify({"status": "error", "data": None, "error": {"message": str(e)}}), 500

@app.route(get_route('messages', 'queue_status'), methods=['GET'])
def get_queue_status():
    """Gibt den Status der Nachrichtenqueue zurück"""
    if worker_instance is None:
        return jsonify({"status": "error", "data": None, "error": {"message": "Worker ist nicht initialisiert"}}), 500
    
    try:
        queue = worker_instance.queue
        status = queue.get_queue_status()
        
        return jsonify({"status": "success", "data": status, "error": None}), 200
    except Exception as e:
        logger.error(f"Fehler beim Abrufen des Queue-Status: {str(e)}")
        return jsonify({"status": "error", "data": None, "error": {"message": str(e)}}), 500

@app.route(get_route('messages', 'forwarding'), methods=['GET'])
def get_forwarding_status():
    """Gibt den Status der Nachrichtenweiterleitung zurück"""
    if worker_instance is None:
        return jsonify({"status": "error", "data": None, "error": {"message": "Worker ist nicht initialisiert"}}), 500
    
    try:
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
        
        return jsonify({"status": "success", "data": forwarding_status, "error": None}), 200
    except Exception as e:
        logger.error(f"Fehler beim Abrufen des Weiterleitungsstatus: {str(e)}")
        return jsonify({"status": "error", "data": None, "error": {"message": str(e)}}), 500

@app.route(get_route('messages', 'retry'), methods=['POST'])
def retry_message(message_id):
    """Versucht, eine fehlgeschlagene Nachricht erneut zu senden"""
    if worker_instance is None:
        return jsonify({"status": "error", "data": None, "error": {"message": "Worker ist nicht initialisiert"}}), 500
    
    try:
        # Implementiere Retry-Logik hier
        queue = worker_instance.queue
        success = queue.retry_failed_message(message_id)
        
        if success:
            return jsonify({"status": "success", "data": {"retried": True}, "error": None}), 200
        else:
            return jsonify({"status": "error", "data": None, "error": {"message": "Nachricht konnte nicht erneut versucht werden"}}), 404
    except Exception as e:
        logger.error(f"Fehler beim erneuten Versuch der Nachricht: {str(e)}")
        return jsonify({"status": "error", "data": None, "error": {"message": str(e)}}), 500

@app.route(get_route('system', 'health'), methods=['GET'])
def health_check():
    """Gesundheitscheck für den Worker"""
    if worker_instance is None:
        return jsonify({"status": "error", "data": None, "error": {"message": "Worker ist nicht initialisiert"}}), 500
    
    status = worker_instance.get_status()
    return jsonify({
        "status": "success",
        "data": {
            "health_status": "healthy" if status['running'] else "unhealthy",
            "worker_status": status
        },
        "error": None
    }), 200

@app.route(get_route('system', 'iot_status'), methods=['GET'])
def iot_system_status():
    """Gibt den Status des gesamten IoT-Systems zurück"""
    if worker_instance is None:
        return jsonify({"status": "error", "data": None, "error": {"message": "Worker ist nicht initialisiert"}}), 500
    
    try:
        # Systeminformationen sammeln
        import platform
        import psutil
        
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
            "python_version": platform.python_version(),
            "cpu_usage": psutil.cpu_percent(),
            "memory_usage": psutil.virtual_memory().percent,
            "disk_usage": psutil.disk_usage('/').percent
        }
        
        result = {
            "health_status": "healthy" if worker_status['running'] and redis_status["connected"] else "unhealthy",
            "worker": worker_status,
            "redis": redis_status,
            "templates": template_status,
            "system": system_info,
            "timestamp": datetime.now().isoformat()
        }
        
        return jsonify({"status": "success", "data": result, "error": None}), 200
    except Exception as e:
        logger.error(f"Fehler beim Abrufen des System-Status: {str(e)}")
        import traceback
        logger.error(f"Stacktrace: {traceback.format_exc()}")
        return jsonify({
            "status": "error",
            "data": None,
            "error": {"message": str(e), "details": traceback.format_exc()}
        }), 500

@app.route(get_route('system', 'endpoints'), methods=['GET'])
def get_endpoints():
    """Gibt alle verfügbaren Endpunkte zurück"""
    if worker_instance is None:
        return jsonify({"status": "error", "data": None, "error": {"message": "Worker ist nicht initialisiert"}}), 500
    
    try:
        # Leere Liste zurückgeben, wenn message_forwarder nicht existiert
        if not hasattr(worker_instance, 'message_forwarder') or worker_instance.message_forwarder is None:
            logger.warning("Message Forwarder ist nicht initialisiert")
            return jsonify({"status": "success", "data": [], "error": None}), 200
        
        endpoints = worker_instance.message_forwarder.get_endpoint_names()
        return jsonify({"status": "success", "data": endpoints, "error": None}), 200
    except Exception as e:
        logger.error(f"Fehler beim Abrufen der Endpunkte: {str(e)}")
        import traceback
        logger.error(f"Stacktrace: {traceback.format_exc()}")
        # Bei Fehler leere Liste zurückgeben mit Erfolgs-Status
        return jsonify({"status": "success", "data": [], "error": None}), 200

@app.route(get_route('templates', 'list'), methods=['GET'])
def get_templates():
    """Gibt alle verfügbaren Templates zurück"""
    if worker_instance is None:
        return jsonify({"status": "error", "data": None, "error": {"message": "Worker ist nicht initialisiert"}}), 500
    
    try:
        # Prüfe, ob das Templates-Verzeichnis existiert
        if not os.path.exists(worker_instance.template_engine.templates_dir):
            logger.warning(f"Templates-Verzeichnis {worker_instance.template_engine.templates_dir} existiert nicht")
            # Leere Liste zurückgeben statt Fehler
            return jsonify({"status": "success", "data": [], "error": None}), 200
        
        # Versuche, die Templates neu zu laden (für den Fall, dass sich etwas geändert hat)
        worker_instance.template_engine.reload_templates()
        
        templates = worker_instance.template_engine.get_template_names()
        return jsonify({"status": "success", "data": templates, "error": None}), 200
    except Exception as e:
        logger.error(f"Fehler beim Abrufen der Templates: {str(e)}")
        import traceback
        logger.error(f"Stacktrace: {traceback.format_exc()}")
        # Bei Fehler leere Liste zurückgeben statt Fehler
        return jsonify({"status": "success", "data": [], "error": None}), 200

@app.route(get_route('templates', 'detail'), methods=['GET'])
def get_template(template_id):
    """Gibt ein spezifisches Template zurück"""
    if worker_instance is None:
        return jsonify({"status": "error", "data": None, "error": {"message": "Worker ist nicht initialisiert"}}), 500
    
    try:
        template = worker_instance.template_engine.get_template(template_id)
        if template:
            return jsonify({"status": "success", "data": template, "error": None}), 200
        else:
            return jsonify({"status": "error", "data": None, "error": {"message": f"Template '{template_id}' nicht gefunden"}}), 404
    except Exception as e:
        logger.error(f"Fehler beim Abrufen des Templates '{template_id}': {str(e)}")
        return jsonify({"status": "error", "data": None, "error": {"message": str(e)}}), 500

@app.route(get_route('templates', 'test'), methods=['POST'])
def test_transform():
    """Testet die Transformation einer Nachricht mit einem Template"""
    if worker_instance is None:
        return jsonify({"status": "error", "data": None, "error": {"message": "Worker ist nicht initialisiert"}}), 500
    
    try:
        data = request.json
        if not data or not isinstance(data, dict):
            return jsonify({"status": "error", "data": None, "error": {"message": "Ungültiges JSON-Format"}}), 400
        
        template_id = data.get('template_id')
        message = data.get('message')
        
        if not template_id:
            return jsonify({"status": "error", "data": None, "error": {"message": "template_id fehlt"}}), 400
        
        if not message:
            return jsonify({"status": "error", "data": None, "error": {"message": "message fehlt"}}), 400
        
        transformed = worker_instance.template_engine.transform_message(message, template_id)
        
        if transformed:
            return jsonify({"status": "success", "data": transformed, "error": None}), 200
        else:
            return jsonify({"status": "error", "data": None, "error": {"message": f"Transformation mit Template '{template_id}' fehlgeschlagen"}}), 400
    
    except Exception as e:
        logger.error(f"Fehler bei der Test-Transformation: {str(e)}")
        return jsonify({"status": "error", "data": None, "error": {"message": str(e)}}), 500

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
    
    try:
        # Halte den Hauptthread am Leben, bis SIGINT oder SIGTERM empfangen wird
        while worker.running:
            time.sleep(1)
    except KeyboardInterrupt:
        logger.info("Keyboard-Interrupt empfangen, Worker wird gestoppt...")
    finally:
        worker.stop() 