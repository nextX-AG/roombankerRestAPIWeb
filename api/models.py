"""
Datenmodelle für das evAlarm-IoT Gateway Management System
"""

import datetime
import os  # Für Umgebungsvariablen
import logging
from pymongo import MongoClient
from bson.objectid import ObjectId

# Logging konfigurieren
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# MongoDB-Verbindung
mongo_client = None
db = None

def initialize_db(connection_string=None, db_name=None):
    """Initialisiert die Verbindung zur MongoDB"""
    global mongo_client, db
    
    # Wenn die Verbindung bereits besteht, nichts tun
    if mongo_client is not None and db is not None:
        try:
            # Teste die bestehende Verbindung
            mongo_client.admin.command('ping')
            logger.info("MongoDB-Verbindung ist noch aktiv")
            return
        except Exception as e:
            logger.warning(f"Bestehende MongoDB-Verbindung fehlgeschlagen: {str(e)}")
            # Bei Verbindungsfehler weitermachen und neu verbinden
            mongo_client = None
            db = None
    
    try:
        # Umgebungsvariablen verwenden, falls parameter nicht angegeben wurden
        if connection_string is None:
            connection_string = os.environ.get('MONGODB_URI', 'mongodb://mongo:27017/')
        
        if db_name is None:
            db_name = os.environ.get('MONGODB_DB', 'evalarm_iot')
        
        logger.info(f"Verbinde mit MongoDB: {connection_string}, DB: {db_name}")
        mongo_client = MongoClient(connection_string, serverSelectionTimeoutMS=5000)
        
        # Teste die Verbindung
        mongo_client.admin.command('ping')
        
        db = mongo_client[db_name]
        
        # Indizes für schnellere Abfragen erstellen
        db.customers.create_index("name", unique=True)
        db.gateways.create_index("uuid", unique=True)
        db.devices.create_index([("gateway_uuid", 1), ("device_id", 1)], unique=True)
        
        logger.info(f"MongoDB-Verbindung erfolgreich hergestellt, Datenbank: {db_name}")
    except Exception as e:
        logger.error(f"Fehler beim Verbinden mit MongoDB: {str(e)}")
        raise

# Initialisiere die Datenbank direkt beim Laden dieses Moduls
try:
    initialize_db()
    logger.info("Datenbankverbindung beim Laden des Moduls erfolgreich initialisiert")
except Exception as e:
    logger.error(f"Fehler beim Initialisieren der Datenbankverbindung beim Laden des Moduls: {str(e)}")

# Kunden-Modell
class Customer:
    """Repräsentiert einen Kunden im System"""
    
    collection = "customers"
    
    def __init__(self, name, contact_person=None, email=None, phone=None, 
                 evalarm_username=None, evalarm_password=None, evalarm_namespace=None,
                 evalarm_url=None, status="active", immediate_forwarding=True, _id=None,
                 created_at=None, updated_at=None):
        self._id = _id or ObjectId()
        self.name = name
        self.contact_person = contact_person
        self.email = email
        self.phone = phone
        self.evalarm_username = evalarm_username
        self.evalarm_password = evalarm_password
        self.evalarm_namespace = evalarm_namespace
        self.evalarm_url = evalarm_url or "https://tas.dev.evalarm.de/api/v1/espa"  # Standardwert als Fallback
        self.status = status  # active, inactive
        self.immediate_forwarding = immediate_forwarding
        self.created_at = created_at or datetime.datetime.now()
        self.updated_at = updated_at or self.created_at
    
    @classmethod
    def create(cls, **kwargs):
        """Erstellt einen neuen Kunden in der Datenbank"""
        customer = cls(**kwargs)
        db[cls.collection].insert_one(customer.__dict__)
        return customer
    
    @classmethod
    def find_by_id(cls, customer_id):
        """Findet einen Kunden anhand seiner ID"""
        data = db[cls.collection].find_one({"_id": ObjectId(customer_id)})
        if data:
            return cls(**data)
        return None
    
    @classmethod
    def find_all(cls):
        """Liefert alle Kunden zurück"""
        return [cls(**data) for data in db[cls.collection].find()]
    
    def update(self, **kwargs):
        """Aktualisiert die Kundeninformationen"""
        kwargs['updated_at'] = datetime.datetime.now()
        db[self.collection].update_one(
            {"_id": self._id},
            {"$set": kwargs}
        )
        for key, value in kwargs.items():
            setattr(self, key, value)
    
    def delete(self):
        """Löscht den Kunden aus der Datenbank"""
        db[self.collection].delete_one({"_id": self._id})
    
    def to_dict(self):
        """Konvertiert das Objekt in ein Dictionary"""
        result = self.__dict__.copy()
        result['id'] = str(result.pop('_id'))
        return result

# Gateway-Modell
class Gateway:
    """Repräsentiert ein Gateway im System"""
    
    collection = "gateways"
    
    def __init__(self, uuid, customer_id, name=None, description=None, 
                 template_id=None, status="unknown", last_contact=None, _id=None,
                 created_at=None, updated_at=None):
        self._id = _id or ObjectId()
        self.uuid = uuid
        self.customer_id = ObjectId(customer_id) if isinstance(customer_id, str) and customer_id else customer_id
        self.name = name or f"Gateway {uuid[-8:]}"
        self.description = description
        self.template_id = template_id
        self.status = status  # online, offline, unknown, maintenance
        self.last_contact = last_contact or datetime.datetime.now()
        self.created_at = created_at or datetime.datetime.now()
        self.updated_at = updated_at or self.created_at
    
    @classmethod
    def create(cls, **kwargs):
        """Erstellt ein neues Gateway in der Datenbank"""
        gateway = cls(**kwargs)
        db[cls.collection].insert_one(gateway.__dict__)
        return gateway
    
    @classmethod
    def find_by_uuid(cls, uuid):
        """Findet ein Gateway anhand seiner UUID"""
        data = db[cls.collection].find_one({"uuid": uuid})
        if data:
            return cls(**data)
        return None
    
    @classmethod
    def find_by_customer(cls, customer_id):
        """Findet alle Gateways eines Kunden"""
        customer_oid = ObjectId(customer_id) if isinstance(customer_id, str) else customer_id
        return [cls(**data) for data in db[cls.collection].find({"customer_id": customer_oid})]
    
    @classmethod
    def find_all(cls):
        """Liefert alle Gateways zurück"""
        return [cls(**data) for data in db[cls.collection].find()]
    
    @classmethod
    def find_unassigned(cls):
        """Findet alle Gateways ohne Kundenzuordnung"""
        return [cls(**data) for data in db[cls.collection].find({"customer_id": None})]
    
    def update(self, **kwargs):
        """Aktualisiert die Gateway-Informationen"""
        kwargs['updated_at'] = datetime.datetime.now()
        
        # Debugging-Log hinzufügen
        logger.info(f"Aktualisiere Gateway {self.uuid} mit Daten: {kwargs}")
        
        # Wenn customer_id ein String ist, in ObjectId umwandeln
        if 'customer_id' in kwargs and isinstance(kwargs['customer_id'], str) and kwargs['customer_id']:
            kwargs['customer_id'] = ObjectId(kwargs['customer_id'])
        
        # Update in der Datenbank durchführen
        update_result = db[self.collection].update_one(
            {"_id": self._id},
            {"$set": kwargs}
        )
        
        logger.info(f"Datenbank-Update für Gateway {self.uuid}: {update_result.modified_count} Dokumente geändert")
        
        # Attribute in der Instanz aktualisieren
        for key, value in kwargs.items():
            setattr(self, key, value)
    
    def update_status(self, status="online"):
        """Aktualisiert den Status und den Zeitpunkt des letzten Kontakts"""
        now = datetime.datetime.now()
        self.update(status=status, last_contact=now)
    
    def delete(self):
        """Löscht das Gateway aus der Datenbank"""
        # Zuerst alle zugehörigen Geräte löschen (Kaskadenlöschung)
        try:
            devices = Device.find_by_gateway(self.uuid)
            for device in devices:
                device.delete()
            logger.info(f"Alle {len(devices)} Geräte des Gateways {self.uuid} gelöscht")
        except Exception as e:
            logger.error(f"Fehler beim Löschen der Geräte für Gateway {self.uuid}: {str(e)}")
        
        # Dann das Gateway selbst löschen
        db[self.collection].delete_one({"_id": self._id})
        logger.info(f"Gateway {self.uuid} gelöscht")
    
    def to_dict(self):
        """Konvertiert das Objekt in ein Dictionary"""
        result = self.__dict__.copy()
        result['id'] = str(result.pop('_id'))
        result['customer_id'] = str(result['customer_id']) if result['customer_id'] else None
        return result

# Geräte-Modell
class Device:
    """Repräsentiert ein Gerät im System"""
    
    collection = "devices"
    
    def __init__(self, gateway_uuid, device_id, device_type=None, name=None, 
                 description=None, status=None, last_update=None, _id=None,
                 created_at=None, updated_at=None):
        self._id = _id or ObjectId()
        self.gateway_uuid = gateway_uuid
        self.device_id = device_id
        self.device_type = device_type or "unknown"
        self.name = name or f"Device {device_id[-8:]}"
        self.description = description
        self.status = status or {}
        self.last_update = last_update or datetime.datetime.now()
        self.created_at = created_at or datetime.datetime.now()
        self.updated_at = updated_at or self.created_at
    
    @classmethod
    def create(cls, **kwargs):
        """Erstellt ein neues Gerät in der Datenbank"""
        device = cls(**kwargs)
        db[cls.collection].insert_one(device.__dict__)
        return device
    
    @classmethod
    def find_by_gateway_and_id(cls, gateway_uuid, device_id):
        """Findet ein Gerät anhand von Gateway-UUID und Geräte-ID"""
        data = db[cls.collection].find_one({
            "gateway_uuid": gateway_uuid,
            "device_id": device_id
        })
        if data:
            return cls(**data)
        return None
    
    @classmethod
    def find_by_gateway(cls, gateway_uuid):
        """Findet alle Geräte eines Gateways"""
        return [cls(**data) for data in db[cls.collection].find({"gateway_uuid": gateway_uuid})]
    
    @classmethod
    def find_all(cls):
        """Liefert alle Geräte zurück"""
        return [cls(**data) for data in db[cls.collection].find()]
    
    def update(self, **kwargs):
        """Aktualisiert die Geräteinformationen"""
        kwargs['updated_at'] = datetime.datetime.now()
        db[self.collection].update_one(
            {"_id": self._id},
            {"$set": kwargs}
        )
        for key, value in kwargs.items():
            setattr(self, key, value)
    
    def update_status(self, status_data):
        """Aktualisiert den Status und den Zeitpunkt des letzten Updates"""
        now = datetime.datetime.now()
        self.update(status=status_data, last_update=now)
    
    def delete(self):
        """Löscht das Gerät aus der Datenbank"""
        db[self.collection].delete_one({"_id": self._id})
    
    def to_dict(self):
        """Konvertiert das Objekt in ein Dictionary"""
        result = self.__dict__.copy()
        result['id'] = str(result.pop('_id'))
        return result

# Helfer-Funktionen für die Geräteerkennung
def determine_device_type(values):
    """Bestimmt den Gerätetyp anhand der empfangenen Werte"""
    if not values:
        return "unknown"
    
    if "alarmtype" in values and values.get("alarmtype") == "panic":
        return "panic_button"
    
    if "currenttemperature" in values and "currenthumidity" in values:
        return "temperature_sensor"
    
    if "alarmstatus" in values:
        return "security_sensor"
    
    return "unknown"

def register_device_from_message(gateway_uuid, device_data):
    """
    Registriert oder aktualisiert ein Gerät basierend auf empfangenen Nachrichten
    
    Parameters:
    -----------
    gateway_uuid : str
        Die UUID des Gateways, zu dem das Gerät gehört.
        WICHTIG: Diese Funktion erwartet die Gateway-UUID/ID genau so, wie sie in der Datenbank 
        im 'uuid'-Feld des Gateway-Dokuments gespeichert ist.
    device_data : dict
        Die Gerätedaten aus der Nachricht
    """
    logger.info(f"=== DEVICE REGISTRATION DEBUG ===")
    logger.info(f"register_device_from_message aufgerufen mit gateway_uuid: '{gateway_uuid}' (Typ: {type(gateway_uuid).__name__})")
    logger.info(f"device_data: {device_data}")
    
    # Sicherstellen, dass gateway_uuid als String vorliegt
    if gateway_uuid is None:
        logger.error("Gateway UUID ist None - Geräteregistrierung abgebrochen")
        return None
    
    if not isinstance(gateway_uuid, str):
        try:
            gateway_uuid = str(gateway_uuid)
            logger.warning(f"Gateway UUID war kein String - konvertiert zu: '{gateway_uuid}'")
        except Exception as e:
            logger.error(f"Konnte Gateway UUID nicht in String konvertieren: {e}")
            return None
    
    if not device_data:
        logger.warning(f"Keine Gerätedaten für Gateway {gateway_uuid}")
        return None
    
    # Extrahiere Geräte-ID aus verschiedenen Formaten
    device_id = None
    values = {}
    
    if isinstance(device_data, dict):
        # Format 1: Standard-Format mit id und value
        if "id" in device_data:
            device_id = str(device_data["id"])
            if "value" in device_data:
                values = device_data["value"]
            elif "values" in device_data:
                values = device_data["values"]
        
        # Format 2: Direkte Werte ohne value-Objekt
        elif "alarmstatus" in device_data or "batterystatus" in device_data:
            # Verwende erste 8 Zeichen der UUID als temporäre ID
            device_id = f"device-{gateway_uuid[-8:]}"
            values = device_data
    
    # Wenn immer noch keine ID gefunden wurde, beende mit Fehler
    if not device_id:
        logger.warning(f"Keine Geräte-ID aus den Daten extrahiert: {device_data}")
        return None
    
    # Wenn values ein String oder eine Zahl ist, konvertiere zu dict
    if not isinstance(values, dict):
        values = {"value": values}
    
    logger.info(f"Verarbeite Gerät mit ID {device_id} für Gateway {gateway_uuid}")
    logger.info(f"Geräte-Werte: {values}")
    
    # Suche nach bestehendem Gerät in der Datenbank
    device = Device.find_by_gateway_and_id(gateway_uuid, device_id)
    
    if device:
        # Gerät aktualisieren
        logger.info(f"Gerät {device_id} gefunden, aktualisiere Status")
        device.update_status(values)
        return device
    else:
        # Neues Gerät anlegen
        device_type = determine_device_type(values)
        logger.info(f"Neues Gerät vom Typ {device_type} für Gateway {gateway_uuid} wird angelegt")
        try:
            new_device = Device.create(
                gateway_uuid=gateway_uuid,
                device_id=device_id,
                device_type=device_type,
                status=values
            )
            logger.info(f"Gerät {device_id} erfolgreich angelegt")
            logger.info(f"=== DEVICE REGISTRATION COMPLETE ===")
            return new_device
        except Exception as e:
            logger.error(f"Fehler beim Anlegen des Geräts {device_id}: {str(e)}")
            return None

def update_all_devices_for_gateway(gateway_uuid):
    """Aktualisiert den Zeitstempel aller Geräte eines Gateways"""
    now = datetime.datetime.now()
    devices = Device.find_by_gateway(gateway_uuid)
    
    for device in devices:
        # Aktualisiere nur den Zeitstempel, ohne die Status-Werte zu ändern
        device.update(last_update=now)
    
    return len(devices)

# Gateway Online-Status-Prüfung
def is_gateway_offline(last_contact, timeout_minutes=15):
    """
    Prüft, ob ein Gateway als offline betrachtet werden sollte
    basierend auf dem Zeitpunkt des letzten Kontakts.
    
    Args:
        last_contact: Zeitpunkt des letzten Kontakts
        timeout_minutes: Zeit in Minuten, nach der ein Gateway als offline gilt
        
    Returns:
        True, wenn das Gateway als offline betrachtet werden sollte, sonst False
    """
    if not last_contact:
        return True
    
    now = datetime.datetime.now()
    timeout = datetime.timedelta(minutes=timeout_minutes)
    
    return (now - last_contact) > timeout

# Erweitere die Gateway-Klasse um eine check_online_status-Methode
def inject_check_online_status_to_gateway():
    """
    Fügt der Gateway-Klasse eine check_online_status-Methode hinzu.
    Diese wird am Ende der Modulinitialisierung aufgerufen.
    """
    def check_online_status(self, timeout_minutes=15):
        """
        Prüft und aktualisiert den Online-Status des Gateways.
        
        Args:
            timeout_minutes: Zeit in Minuten, nach der ein Gateway als offline gilt
            
        Returns:
            True, wenn das Gateway online ist, sonst False
        """
        is_offline = is_gateway_offline(self.last_contact, timeout_minutes)
        
        if is_offline and self.status != 'offline':
            self.update(status='offline')
            return False
        elif not is_offline and self.status != 'online':
            self.update(status='online')
            return True
        
        return not is_offline
    
    # Hänge die Methode an die Gateway-Klasse an
    Gateway.check_online_status = check_online_status

# Methode aufrufen, um die check_online_status Methode zur Gateway-Klasse hinzuzufügen
inject_check_online_status_to_gateway() 