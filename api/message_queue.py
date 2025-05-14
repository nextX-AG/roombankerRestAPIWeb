import json
import logging
import redis
import time
import uuid
import os
from typing import Dict, Any, Union, List, Optional

# Konfiguriere Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('message-queue')

class RedisMessageQueue:
    """
    Redis-basierte Message Queue für das IoT Gateway
    """
    
    def __init__(self, host='localhost', port=6379, db=0, password=None, prefix='iot_gateway'):
        """
        Initialisiere die Redis-Verbindung
        
        Args:
            host: Redis Host
            port: Redis Port
            db: Redis DB Index
            password: Redis Passwort (optional)
            prefix: Präfix für Redis-Schlüssel
        """
        self.redis_client = redis.Redis(
            host=host,
            port=port,
            db=db,
            password=password,
            decode_responses=True
        )
        self.prefix = prefix
        self.main_queue = f"{prefix}:queue:messages"
        self.processing_queue = f"{prefix}:queue:processing"
        self.failed_queue = f"{prefix}:queue:failed"
        self.results_list = f"{prefix}:results"
        self.stats_key = f"{prefix}:stats"
        
        # Initialisiere Stats, falls nicht vorhanden
        if not self.redis_client.exists(self.stats_key):
            self.redis_client.hset(self.stats_key, mapping={
                'total_received': 0,
                'total_processed': 0,
                'total_failed': 0,
                'processing_time_avg': 0
            })
        
        logger.info(f"Redis Message Queue initialisiert: {host}:{port}, DB: {db}")
    
    def enqueue_message(self, message: Dict[str, Any], template_name: str, endpoint_name: str, customer_config: Dict[str, Any] = None, gateway_id: str = None) -> str:
        """
        Füge eine Nachricht in die Queue ein
        
        Args:
            message: Die zu verarbeitende Nachricht
            template_name: Name des zu verwendenden Templates
            endpoint_name: Name des Ziel-Endpunkts
            customer_config: Optionale Kundenkonfiguration
            gateway_id: Gateway-ID
        
        Returns:
            Die Message-ID
        """
        # Generiere eine eindeutige Message-ID
        message_id = str(uuid.uuid4())
        
        # Erstelle Job-Daten
        job_data = {
            'id': message_id,
            'message': message,
            'template': template_name,
            'endpoint': endpoint_name,
            'created_at': int(time.time()),
            'status': 'pending'
        }
        
        # Füge Kundenkonfiguration hinzu, wenn vorhanden
        if customer_config:
            job_data['customer_config'] = customer_config
        
        # Füge Gateway-ID hinzu, wenn vorhanden
        if gateway_id:
            job_data['gateway_id'] = gateway_id
        
        # Konvertiere in JSON
        job_json = json.dumps(job_data)
        
        # Füge in die Haupt-Queue ein
        self.redis_client.lpush(self.main_queue, job_json)
        
        # Aktualisiere Statistiken
        self.redis_client.hincrby(self.stats_key, 'total_enqueued', 1)
        
        logger.info(f"Nachricht {message_id} in Queue eingefügt")
        return message_id
    
    def get_next_message(self) -> Optional[Dict[str, Any]]:
        """
        Hole die nächste zu verarbeitende Nachricht aus der Queue
        
        Returns:
            Die nächste Nachricht oder None, wenn die Queue leer ist
        """
        # Verschiebe eine Nachricht von der Haupt-Queue in die Verarbeitungs-Queue
        # und gib sie zurück (atomic operation)
        job_json = self.redis_client.lpop(self.main_queue)
        
        if not job_json:
            return None
            
        job = json.loads(job_json)
        
        # Markiere die Nachricht als "in Bearbeitung"
        job['status'] = 'processing'
        job['processing_started'] = time.time()
        
        # Speichere die Nachricht in der Verarbeitungs-Queue
        self.redis_client.hset(self.processing_queue, job['id'], json.dumps(job))
        
        logger.debug(f"Nachricht aus Queue geholt: {job['id']}")
        return job
    
    def mark_as_completed(self, job_id: str, result: Dict[str, Any]) -> None:
        """
        Markiere eine Nachricht als erfolgreich verarbeitet
        
        Args:
            job_id: Die ID der Nachricht
            result: Das Ergebnis der Verarbeitung
        """
        # Hole die Nachricht aus der Verarbeitungs-Queue
        job_json = self.redis_client.hget(self.processing_queue, job_id)
        
        if not job_json:
            logger.warning(f"Nachricht nicht in der Verarbeitungs-Queue gefunden: {job_id}")
            return
            
        job = json.loads(job_json)
        
        # Berechne die Verarbeitungszeit
        processing_time = time.time() - job.get('processing_started', time.time())
        
        # Aktualisiere die Nachricht
        job['status'] = 'completed'
        job['completed_at'] = time.time()
        job['processing_time'] = processing_time
        job['result'] = result
        
        # Speichere das Ergebnis in der Ergebnisliste (begrenzt auf 100 Einträge)
        self.redis_client.lpush(self.results_list, json.dumps(job))
        self.redis_client.ltrim(self.results_list, 0, 99)  # Behalte nur die letzten 100 Ergebnisse
        
        # Entferne die Nachricht aus der Verarbeitungs-Queue
        self.redis_client.hdel(self.processing_queue, job_id)
        
        # Aktualisiere Statistiken
        self.redis_client.hincrby(self.stats_key, 'total_processed', 1)
        
        # Aktualisiere durchschnittliche Verarbeitungszeit
        current_avg = float(self.redis_client.hget(self.stats_key, 'processing_time_avg') or 0)
        processed_count = int(self.redis_client.hget(self.stats_key, 'total_processed') or 1)
        
        # Gewichteter Durchschnitt
        new_avg = ((current_avg * (processed_count - 1)) + processing_time) / processed_count
        self.redis_client.hset(self.stats_key, 'processing_time_avg', new_avg)
        
        logger.info(f"Nachricht erfolgreich verarbeitet: {job_id}, Zeit: {processing_time:.2f}s")
    
    def mark_as_failed(self, job_id: str, error: str) -> None:
        """
        Markiere eine Nachricht als fehlgeschlagen
        
        Args:
            job_id: Die ID der Nachricht
            error: Die Fehlermeldung
        """
        # Hole die Nachricht aus der Verarbeitungs-Queue
        job_json = self.redis_client.hget(self.processing_queue, job_id)
        
        if not job_json:
            logger.warning(f"Nachricht nicht in der Verarbeitungs-Queue gefunden: {job_id}")
            return
            
        job = json.loads(job_json)
        
        # Aktualisiere die Nachricht
        job['status'] = 'failed'
        job['failed_at'] = time.time()
        job['error'] = error
        job['retry_count'] = job.get('retry_count', 0) + 1
        
        # Verschiebe die Nachricht in die Failed-Queue, falls die maximale Anzahl
        # an Wiederholungen erreicht ist (hier: 3)
        if job['retry_count'] >= 3:
            self.redis_client.hset(self.failed_queue, job_id, json.dumps(job))
            self.redis_client.hdel(self.processing_queue, job_id)
            self.redis_client.hincrby(self.stats_key, 'total_failed', 1)
            logger.error(f"Nachricht endgültig fehlgeschlagen: {job_id}, Fehler: {error}")
        else:
            # Ansonsten: Zurück in die Haupt-Queue für einen erneuten Versuch
            self.redis_client.hdel(self.processing_queue, job_id)
            self.redis_client.rpush(self.main_queue, json.dumps(job))
            logger.warning(f"Nachricht fehlgeschlagen, wird erneut versucht: {job_id}, Versuch: {job['retry_count']}, Fehler: {error}")
    
    def retry_failed_message(self, job_id: str) -> bool:
        """
        Versuche eine fehlgeschlagene Nachricht erneut
        
        Args:
            job_id: Die ID der Nachricht
            
        Returns:
            True, wenn die Nachricht für einen erneuten Versuch in die Queue verschoben wurde
        """
        # Hole die Nachricht aus der Failed-Queue
        job_json = self.redis_client.hget(self.failed_queue, job_id)
        
        if not job_json:
            logger.warning(f"Nachricht nicht in der Failed-Queue gefunden: {job_id}")
            return False
            
        job = json.loads(job_json)
        
        # Aktualisiere die Nachricht
        job['status'] = 'pending'
        job['retry_count'] = 0  # Zurücksetzen für einen Neustart
        
        # Verschiebe die Nachricht zurück in die Haupt-Queue
        self.redis_client.hdel(self.failed_queue, job_id)
        self.redis_client.rpush(self.main_queue, json.dumps(job))
        
        # Aktualisiere Statistiken
        self.redis_client.hincrby(self.stats_key, 'total_failed', -1)
        
        logger.info(f"Fehlgeschlagene Nachricht wird erneut versucht: {job_id}")
        return True
    
    def get_queue_status(self) -> Dict[str, Any]:
        """
        Gibt den Status der Queue zurück
        
        Returns:
            Ein Dictionary mit Informationen über den Queue-Status
        """
        pending_count = self.redis_client.llen(self.main_queue)
        processing_count = self.redis_client.hlen(self.processing_queue)
        failed_count = self.redis_client.hlen(self.failed_queue)
        
        # Hole Statistiken
        stats = self.redis_client.hgetall(self.stats_key)
        
        # Konvertiere String-Werte in Zahlen
        for key in stats:
            try:
                stats[key] = float(stats[key])
                if key != 'processing_time_avg':  # Durchschnittszeit bleibt Float
                    stats[key] = int(stats[key])
            except (ValueError, TypeError):
                pass
        
        return {
            'pending_count': pending_count,
            'processing_count': processing_count,
            'failed_count': failed_count,
            'stats': stats
        }
    
    def get_failed_messages(self) -> List[Dict[str, Any]]:
        """
        Gibt alle fehlgeschlagenen Nachrichten zurück
        
        Returns:
            Eine Liste mit allen fehlgeschlagenen Nachrichten
        """
        failed_jobs = []
        
        # Hole alle Schlüssel aus der Failed-Queue
        failed_ids = self.redis_client.hkeys(self.failed_queue)
        
        # Hole für jeden Schlüssel die Nachricht
        for job_id in failed_ids:
            job_json = self.redis_client.hget(self.failed_queue, job_id)
            if job_json:
                failed_jobs.append(json.loads(job_json))
        
        return failed_jobs
    
    def clear_all_queues(self) -> None:
        """
        Löscht alle Queues (nur für Tests und Resets)
        """
        self.redis_client.delete(self.main_queue)
        self.redis_client.delete(self.processing_queue)
        self.redis_client.delete(self.failed_queue)
        self.redis_client.delete(self.results_list)
        self.redis_client.delete(self.stats_key)
        
        # Initialisiere Stats neu
        self.redis_client.hset(self.stats_key, mapping={
            'total_received': 0,
            'total_processed': 0,
            'total_failed': 0,
            'processing_time_avg': 0
        })
        
        logger.warning("Alle Queues wurden gelöscht!")


# Singleton-Instanz für die Anwendung
message_queue = None

def init_message_queue(host='localhost', port=6379, db=0, password=None, prefix='iot_gateway'):
    """
    Initialisiere die Message Queue als Singleton
    """
    global message_queue
    if message_queue is None:
        message_queue = RedisMessageQueue(host, port, db, password, prefix)
    return message_queue

def get_message_queue():
    """
    Hole die Message Queue-Instanz
    """
    global message_queue
    if message_queue is None:
        # Hole Parameter aus Umgebungsvariablen
        host = os.environ.get('REDIS_HOST', 'localhost')
        port = int(os.environ.get('REDIS_PORT', 6379))
        db = int(os.environ.get('REDIS_DB', 0))
        password = os.environ.get('REDIS_PASSWORD')
        prefix = os.environ.get('REDIS_PREFIX', 'iot_gateway')
        
        message_queue = init_message_queue(host, port, db, password, prefix)
    return message_queue 