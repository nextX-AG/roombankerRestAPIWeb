import os
import sys
import json
import time
import signal
import logging
import threading
from flask import Flask, jsonify, request
from typing import Dict, Any, List, Optional

# Füge das Projektverzeichnis zum Python-Pfad hinzu
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Importiere die Message Queue
from api.message_queue import get_message_queue
from utils.template_engine import TemplateEngine, MessageForwarder

# Konfiguriere Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('message-worker')

# Flask-App für API-Endpunkte
app = Flask(__name__)

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
        
        # Initialisiere Template-Engine und Message-Forwarder
        self.template_engine = TemplateEngine(os.path.join(PROJECT_DIR, 'templates'))
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

# API-Endpunkte für den Status der Weiterleitung
@app.route('/api/messages/status', methods=['GET'])
def get_message_status():
    """Gibt den Status aller verarbeiteten Nachrichten zurück"""
    if worker_instance is None:
        return jsonify({"error": "Worker ist nicht initialisiert"}), 500
    
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
        
        return jsonify(all_statuses), 200
    except Exception as e:
        logger.error(f"Fehler beim Abrufen des Nachrichtenstatus: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/messages/queue/status', methods=['GET'])
def get_queue_status():
    """Gibt den Status der Nachrichtenqueue zurück"""
    if worker_instance is None:
        return jsonify({"error": "Worker ist nicht initialisiert"}), 500
    
    try:
        queue = worker_instance.queue
        status = queue.get_queue_status()
        
        return jsonify(status), 200
    except Exception as e:
        logger.error(f"Fehler beim Abrufen des Queue-Status: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/messages/forwarding', methods=['GET'])
def get_forwarding_status():
    """Gibt den Status der Nachrichtenweiterleitung zurück"""
    if worker_instance is None:
        return jsonify({"error": "Worker ist nicht initialisiert"}), 500
    
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
        
        return jsonify(forwarding_status), 200
    except Exception as e:
        logger.error(f"Fehler beim Abrufen des Weiterleitungsstatus: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Gesundheitscheck für den Worker"""
    if worker_instance is None:
        return jsonify({"status": "error", "message": "Worker ist nicht initialisiert"}), 500
    
    status = worker_instance.get_status()
    return jsonify({
        "status": "healthy" if status['running'] else "unhealthy",
        "worker_status": status
    }), 200

@app.route('/api/endpoints', methods=['GET'])
def get_endpoints():
    """Gibt alle verfügbaren Endpunkte zurück"""
    if worker_instance is None:
        return jsonify({"error": "Worker ist nicht initialisiert"}), 500
    
    try:
        endpoints = worker_instance.message_forwarder.get_endpoint_names()
        return jsonify(endpoints), 200
    except Exception as e:
        logger.error(f"Fehler beim Abrufen der Endpunkte: {str(e)}")
        import traceback
        logger.error(f"Stacktrace: {traceback.format_exc()}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/templates', methods=['GET'])
def get_templates():
    """Gibt alle verfügbaren Templates zurück"""
    if worker_instance is None:
        return jsonify({"error": "Worker ist nicht initialisiert"}), 500
    
    try:
        templates = worker_instance.template_engine.get_template_names()
        return jsonify(templates), 200
    except Exception as e:
        logger.error(f"Fehler beim Abrufen der Templates: {str(e)}")
        return jsonify({"error": str(e)}), 500

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