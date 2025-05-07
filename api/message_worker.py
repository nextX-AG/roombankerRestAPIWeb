import os
import sys
import json
import time
import signal
import logging
import threading
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
            
            # Transformiere Nachricht
            transformed_message = self.template_engine.transform_message(message, template_name)
            
            if not transformed_message:
                error_msg = f'Fehler bei der Transformation mit Template "{template_name}"'
                self.queue.mark_as_failed(job['id'], error_msg)
                return
            
            # Leite transformierte Nachricht weiter
            response = self.message_forwarder.forward_message(transformed_message, endpoint_name)
            
            if not response:
                error_msg = f'Fehler bei der Weiterleitung an Endpunkt "{endpoint_name}"'
                self.queue.mark_as_failed(job['id'], error_msg)
                return
            
            # Erstelle Ergebnis
            result = {
                'original_message': message,
                'transformed_message': transformed_message,
                'endpoint': endpoint_name,
                'response_status': response.status_code,
                'response_text': response.text
            }
            
            # Markiere als erfolgreich
            self.queue.mark_as_completed(job['id'], result)
            
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
    
    try:
        # Halte den Hauptthread am Leben, bis SIGINT oder SIGTERM empfangen wird
        while worker.running:
            time.sleep(1)
    except KeyboardInterrupt:
        logger.info("Keyboard-Interrupt empfangen, Worker wird gestoppt...")
    finally:
        worker.stop() 