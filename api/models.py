"""
Datenmodelle für das evAlarm-IoT Gateway Management System
"""

from datetime import datetime, timezone
import os  # Für Umgebungsvariablen
import logging
from pymongo import MongoClient
from bson.objectid import ObjectId
import sys

# Import the new device registry
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utils.device_registry import device_registry, detect_device_type as registry_detect_device_type

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
        self.created_at = created_at or datetime.now(timezone.utc)
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
        kwargs['updated_at'] = datetime.now(timezone.utc)
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
                 template_id=None, template_group_id=None, status="unknown", last_contact=None, _id=None,
                 created_at=None, updated_at=None, forwarding_enabled=True, forwarding_mode='production',
                 flow_id=None, flow_group_id=None):
        self._id = _id or ObjectId()
        self.uuid = uuid
        self.customer_id = ObjectId(customer_id) if isinstance(customer_id, str) and customer_id else customer_id
        self.name = name or f"Gateway {uuid[-8:]}"
        self.description = description
        self.template_id = template_id  # DEPRECATED - behalten für Rückwärtskompatibilität
        self.template_group_id = template_group_id  # DEPRECATED - wird zu flow_group_id
        self.flow_id = flow_id  # NEU: Einzelner Gateway-Flow (optional)
        self.flow_group_id = flow_group_id  # NEU: Gateway-Flow-Gruppe (bevorzugt)
        self.status = status  # online, offline, unknown, maintenance
        self.last_contact = last_contact or datetime.now(timezone.utc)
        self.created_at = created_at or datetime.now(timezone.utc)
        self.updated_at = updated_at or self.created_at
        self.forwarding_enabled = forwarding_enabled
        self.forwarding_mode = forwarding_mode
    
    @classmethod
    def create(cls, uuid, customer_id=None, name=None, description=None, 
               template_id=None, template_group_id=None, status='online',
               forwarding_enabled=True, forwarding_mode='production',
               flow_id=None, flow_group_id=None):
        """
        Erstellt ein neues Gateway
        
        Args:
            uuid: Eindeutige Gateway-ID
            customer_id: Zugehöriger Kunde (ObjectId oder None)
            name: Gateway-Name
            description: Beschreibung
            template_id: Template-ID (DEPRECATED)
            template_group_id: Template-Gruppen-ID (DEPRECATED)
            flow_id: Flow-ID für Gateway-spezifische Flows
            flow_group_id: Flow-Gruppen-ID für Gateway-spezifische Flows
            status: Gateway-Status
            forwarding_enabled: Ob Nachrichten weitergeleitet werden sollen
            forwarding_mode: Modus der Weiterleitung (production, test, learning)
            
        Returns:
            Gateway-Instanz
        """
        try:
            gateway_doc = {
                'uuid': uuid,
                'customer_id': customer_id,
                'name': name or f"Gateway {uuid[-8:]}",
                'description': description or '',
                'template_id': template_id,
                'template_group_id': template_group_id,
                'flow_id': flow_id,
                'flow_group_id': flow_group_id,
                'status': status,
                'forwarding_enabled': forwarding_enabled,
                'forwarding_mode': forwarding_mode,
                'last_contact': datetime.now(timezone.utc),
                'created_at': datetime.now(timezone.utc),
                'updated_at': datetime.now(timezone.utc)
            }
            
            result = db[cls.collection].insert_one(gateway_doc)
            gateway_doc['_id'] = result.inserted_id
            # Erstelle Gateway-Objekt mit korrekten Parametern
            return cls(
                uuid=gateway_doc['uuid'],
                customer_id=gateway_doc.get('customer_id'),
                name=gateway_doc.get('name'),
                description=gateway_doc.get('description'),
                template_id=gateway_doc.get('template_id'),
                template_group_id=gateway_doc.get('template_group_id'),
                flow_id=gateway_doc.get('flow_id'),
                flow_group_id=gateway_doc.get('flow_group_id'),
                status=gateway_doc.get('status', 'online'),
                last_contact=gateway_doc.get('last_contact'),
                _id=gateway_doc['_id'],
                created_at=gateway_doc.get('created_at'),
                updated_at=gateway_doc.get('updated_at'),
                forwarding_enabled=gateway_doc.get('forwarding_enabled', True),
                forwarding_mode=gateway_doc.get('forwarding_mode', 'production')
            )
        except Exception as e:
            logger.error(f"Fehler beim Erstellen des Gateways: {str(e)}")
            raise
    
    @classmethod
    def find_by_uuid(cls, uuid):
        """
        Findet ein Gateway anhand seiner UUID
        
        Args:
            uuid: Die UUID des Gateways
            
        Returns:
            Gateway-Instanz oder None
        """
        try:
            gateway_doc = db[cls.collection].find_one({'uuid': uuid})
            if gateway_doc:
                if 'forwarding_enabled' not in gateway_doc:
                    gateway_doc['forwarding_enabled'] = True
                if 'forwarding_mode' not in gateway_doc:
                    gateway_doc['forwarding_mode'] = 'production'
                if 'flow_id' not in gateway_doc:
                    gateway_doc['flow_id'] = None
                if 'flow_group_id' not in gateway_doc:
                    gateway_doc['flow_group_id'] = None
                    
                return cls(
                    uuid=gateway_doc['uuid'],
                    customer_id=gateway_doc.get('customer_id'),
                    name=gateway_doc.get('name'),
                    description=gateway_doc.get('description'),
                    template_id=gateway_doc.get('template_id'),
                    template_group_id=gateway_doc.get('template_group_id'),
                    flow_id=gateway_doc.get('flow_id'),
                    flow_group_id=gateway_doc.get('flow_group_id'),
                    status=gateway_doc.get('status', 'unknown'),
                    last_contact=gateway_doc.get('last_contact'),
                    _id=gateway_doc['_id'],
                    created_at=gateway_doc.get('created_at'),
                    updated_at=gateway_doc.get('updated_at'),
                    forwarding_enabled=gateway_doc.get('forwarding_enabled', True),
                    forwarding_mode=gateway_doc.get('forwarding_mode', 'production')
                )
            return None
        except Exception as e:
            logger.error(f"Fehler beim Finden des Gateways: {str(e)}")
            return None
    
    @classmethod
    def find_by_customer(cls, customer_id):
        """Findet alle Gateways eines Kunden"""
        customer_oid = ObjectId(customer_id) if isinstance(customer_id, str) else customer_id
        gateways = []
        for doc in db[cls.collection].find({"customer_id": customer_oid}):
            # Setze Standardwerte für neue Felder
            if 'forwarding_enabled' not in doc:
                doc['forwarding_enabled'] = True
            if 'forwarding_mode' not in doc:
                doc['forwarding_mode'] = 'production'
            if 'flow_id' not in doc:
                doc['flow_id'] = None
            if 'flow_group_id' not in doc:
                doc['flow_group_id'] = None
            # Erstelle Gateway-Objekt mit korrekten Parametern
            gateway = cls(
                uuid=doc['uuid'],
                customer_id=doc.get('customer_id'),
                name=doc.get('name'),
                description=doc.get('description'),
                template_id=doc.get('template_id'),
                template_group_id=doc.get('template_group_id'),
                flow_id=doc.get('flow_id'),
                flow_group_id=doc.get('flow_group_id'),
                status=doc.get('status', 'unknown'),
                last_contact=doc.get('last_contact'),
                _id=doc['_id'],
                created_at=doc.get('created_at'),
                updated_at=doc.get('updated_at'),
                forwarding_enabled=doc.get('forwarding_enabled', True),
                forwarding_mode=doc.get('forwarding_mode', 'production')
            )
            gateways.append(gateway)
        return gateways
    
    @classmethod
    def find_all(cls):
        """Liefert alle Gateways zurück"""
        gateways = []
        for doc in db[cls.collection].find({}):
            # Setze Standardwerte für neue Felder
            if 'forwarding_enabled' not in doc:
                doc['forwarding_enabled'] = True
            if 'forwarding_mode' not in doc:
                doc['forwarding_mode'] = 'production'
            if 'flow_id' not in doc:
                doc['flow_id'] = None
            if 'flow_group_id' not in doc:
                doc['flow_group_id'] = None
            # Erstelle Gateway-Objekt mit korrekten Parametern
            gateway = cls(
                uuid=doc['uuid'],
                customer_id=doc.get('customer_id'),
                name=doc.get('name'),
                description=doc.get('description'),
                template_id=doc.get('template_id'),
                template_group_id=doc.get('template_group_id'),
                flow_id=doc.get('flow_id'),
                flow_group_id=doc.get('flow_group_id'),
                status=doc.get('status', 'unknown'),
                last_contact=doc.get('last_contact'),
                _id=doc['_id'],
                created_at=doc.get('created_at'),
                updated_at=doc.get('updated_at'),
                forwarding_enabled=doc.get('forwarding_enabled', True),
                forwarding_mode=doc.get('forwarding_mode', 'production')
            )
            gateways.append(gateway)
        return gateways
    
    @classmethod
    def find_unassigned(cls):
        """Findet alle Gateways ohne Kundenzuordnung"""
        gateways = []
        for doc in db[cls.collection].find({"customer_id": None}):
            # Setze Standardwerte für neue Felder
            if 'forwarding_enabled' not in doc:
                doc['forwarding_enabled'] = True
            if 'forwarding_mode' not in doc:
                doc['forwarding_mode'] = 'production'
            if 'flow_id' not in doc:
                doc['flow_id'] = None
            if 'flow_group_id' not in doc:
                doc['flow_group_id'] = None
            # Erstelle Gateway-Objekt mit korrekten Parametern
            gateway = cls(
                uuid=doc['uuid'],
                customer_id=doc.get('customer_id'),
                name=doc.get('name'),
                description=doc.get('description'),
                template_id=doc.get('template_id'),
                template_group_id=doc.get('template_group_id'),
                flow_id=doc.get('flow_id'),
                flow_group_id=doc.get('flow_group_id'),
                status=doc.get('status', 'unknown'),
                last_contact=doc.get('last_contact'),
                _id=doc['_id'],
                created_at=doc.get('created_at'),
                updated_at=doc.get('updated_at'),
                forwarding_enabled=doc.get('forwarding_enabled', True),
                forwarding_mode=doc.get('forwarding_mode', 'production')
            )
            gateways.append(gateway)
        return gateways
    
    def update(self, **kwargs):
        """
        Aktualisiert das Gateway mit den angegebenen Feldern
        
        Args:
            **kwargs: Zu aktualisierende Felder
            
        Returns:
            True bei Erfolg, False bei Fehler
        """
        try:
            # Erlaubte Felder für Update
            allowed_fields = ['name', 'description', 'customer_id', 'template_id', 
                            'template_group_id', 'flow_id', 'flow_group_id', 'status', 
                            'forwarding_enabled', 'forwarding_mode', 'last_contact']
            
            update_doc = {}
            for field, value in kwargs.items():
                if field in allowed_fields:
                    update_doc[field] = value
                    setattr(self, field, value)
            
            if update_doc:
                update_doc['updated_at'] = datetime.now(timezone.utc)
                self.updated_at = update_doc['updated_at']
                
                result = db[self.collection].update_one(
                    {'_id': self._id},
                    {'$set': update_doc}
                )
                return result.modified_count > 0
            return False
        except Exception as e:
            logger.error(f"Fehler beim Aktualisieren des Gateways: {str(e)}")
            return False

    def set_forwarding_mode(self, mode, enabled=None):
        """
        Setzt den Forwarding-Modus des Gateways
        
        Args:
            mode: 'production', 'test' oder 'learning'
            enabled: Optional - ob Forwarding aktiviert sein soll
            
        Returns:
            True bei Erfolg
        """
        update_fields = {'forwarding_mode': mode}
        if enabled is not None:
            update_fields['forwarding_enabled'] = enabled
            
        # Wenn Lernmodus aktiviert wird, Forwarding automatisch deaktivieren
        if mode == 'learning' and enabled is None:
            update_fields['forwarding_enabled'] = False
            
        return self.update(**update_fields)
    
    def enable_forwarding(self):
        """Aktiviert die Nachrichtenweiterleitung"""
        return self.update(forwarding_enabled=True)
    
    def disable_forwarding(self):
        """Deaktiviert die Nachrichtenweiterleitung"""
        return self.update(forwarding_enabled=False)
    
    def update_status(self, status="online"):
        """Aktualisiert den Status und den Zeitpunkt des letzten Kontakts"""
        now = datetime.now(timezone.utc)
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
        # Stelle sicher, dass die neuen Felder enthalten sind
        if 'forwarding_enabled' not in result:
            result['forwarding_enabled'] = True
        if 'forwarding_mode' not in result:
            result['forwarding_mode'] = 'production'
        return result

# Geräte-Modell
class Device:
    """Repräsentiert ein Gerät im System"""
    
    collection = "devices"
    
    def __init__(self, gateway_uuid, device_id, device_type=None, name=None, 
                 description=None, status=None, last_update=None, _id=None,
                 created_at=None, updated_at=None, template_id=None, template_group_id=None,
                 flow_id=None, flow_group_id=None):
        self._id = _id or ObjectId()
        self.gateway_uuid = gateway_uuid
        self.device_id = device_id
        self.device_type = device_type or "unknown"
        self.name = name or f"Device {device_id[-8:]}"
        self.description = description
        self.status = status or {}
        self.last_update = last_update or datetime.now(timezone.utc)
        self.created_at = created_at or datetime.now(timezone.utc)
        self.updated_at = updated_at or self.created_at
        self.template_id = template_id  # DEPRECATED - wird zu flow_id
        self.template_group_id = template_group_id  # DEPRECATED - wird zu flow_group_id
        self.flow_id = flow_id  # NEU: Einzelner Device-Flow (optional)
        self.flow_group_id = flow_group_id  # NEU: Device-Flow-Gruppe (bevorzugt)
    
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
        kwargs['updated_at'] = datetime.now(timezone.utc)
        db[self.collection].update_one(
            {"_id": self._id},
            {"$set": kwargs}
        )
        for key, value in kwargs.items():
            setattr(self, key, value)
    
    def update_status(self, status_data):
        """Aktualisiert den Status und den Zeitpunkt des letzten Updates"""
        now = datetime.now(timezone.utc)
        self.update(status=status_data, last_update=now)
    
    def delete(self):
        """Löscht das Gerät aus der Datenbank"""
        db[self.collection].delete_one({"_id": self._id})
    
    def to_dict(self):
        """Konvertiert das Objekt in ein Dictionary"""
        result = self.__dict__.copy()
        result['id'] = str(result.pop('_id'))
        return result

# Template-Gruppen-Modell
class TemplateGroup:
    """Repräsentiert eine Template-Gruppe für verschiedene Gerätetypen"""
    
    collection = "template_groups"
    
    def __init__(self, name, description=None, templates=None, usage_count=0,
                 _id=None, created_at=None, updated_at=None):
        self._id = _id or ObjectId()
        self.name = name
        self.description = description
        self.templates = templates or []  # [{template_id: str, priority: int}, ...]
        self.usage_count = usage_count
        self.created_at = created_at or datetime.now(timezone.utc)
        self.updated_at = updated_at or self.created_at
    
    @classmethod
    def create(cls, **kwargs):
        """Erstellt eine neue Template-Gruppe in der Datenbank"""
        template_group = cls(**kwargs)
        db[cls.collection].insert_one(template_group.__dict__)
        return template_group
    
    @classmethod
    def find_by_id(cls, group_id):
        """Findet eine Template-Gruppe anhand ihrer ID"""
        data = db[cls.collection].find_one({"_id": ObjectId(group_id)})
        if data:
            return cls(**data)
        return None
    
    @classmethod
    def find_all(cls):
        """Liefert alle Template-Gruppen zurück"""
        return [cls(**data) for data in db[cls.collection].find()]
    
    def update(self, **kwargs):
        """Aktualisiert die Template-Gruppen-Informationen"""
        kwargs['updated_at'] = datetime.now(timezone.utc)
        
        # Entferne die _id aus den Update-Daten, falls vorhanden
        if '_id' in kwargs:
            del kwargs['_id']
        if 'id' in kwargs:
            del kwargs['id']
            
        db[self.collection].update_one(
            {"_id": self._id},
            {"$set": kwargs}
        )
        for key, value in kwargs.items():
            setattr(self, key, value)
    
    def add_template(self, template_id, priority=50):
        """Fügt ein Template zur Gruppe hinzu"""
        # Prüfe, ob das Template bereits in der Gruppe ist
        existing = next((t for t in self.templates if t.get('template_id') == template_id), None)
        
        if existing:
            # Aktualisiere die Priorität
            existing['priority'] = priority
        else:
            # Füge neues Template hinzu
            self.templates.append({
                'template_id': template_id,
                'priority': priority
            })
        
        self.update(templates=self.templates)
    
    def remove_template(self, template_id):
        """Entfernt ein Template aus der Gruppe"""
        self.templates = [t for t in self.templates if t.get('template_id') != template_id]
        self.update(templates=self.templates)
    
    def increment_usage(self):
        """Erhöht den Verwendungszähler"""
        self.usage_count += 1
        self.update(usage_count=self.usage_count)
    
    def delete(self):
        """Löscht die Template-Gruppe aus der Datenbank"""
        db[self.collection].delete_one({"_id": self._id})
    
    def to_dict(self):
        """Konvertiert das Objekt in ein Dictionary"""
        result = self.__dict__.copy()
        result['id'] = str(result.pop('_id'))
        return result

# Flow-Modell (NEU)
class Flow:
    """Repräsentiert einen Flow für die Nachrichtenverarbeitung"""
    
    collection = "flows"
    
    def __init__(self, name, description=None, flow_type="device_flow", version="1.0.0",
                 steps=None, error_handling=None, _id=None, created_at=None, updated_at=None):
        self._id = _id or ObjectId()
        self.name = name
        self.description = description
        self.flow_type = flow_type  # "gateway_flow" oder "device_flow"
        self.version = version  # Semantic Versioning
        self.steps = steps or []  # Array von Step-Objekten
        self.error_handling = error_handling or {
            "retry_count": 3,
            "retry_delay": 1000,  # in Millisekunden
            "fallback_flow_id": None
        }
        self.created_at = created_at or datetime.now(timezone.utc)
        self.updated_at = updated_at or self.created_at
    
    @classmethod
    def create(cls, **kwargs):
        """Erstellt einen neuen Flow in der Datenbank"""
        flow = cls(**kwargs)
        db[cls.collection].insert_one(flow.__dict__)
        return flow
    
    @classmethod
    def find_by_id(cls, flow_id):
        """Findet einen Flow anhand seiner ID"""
        try:
            data = db[cls.collection].find_one({"_id": ObjectId(flow_id)})
            if data:
                return cls(**data)
        except:
            # Falls flow_id keine gültige ObjectId ist, versuche nach name zu suchen
            data = db[cls.collection].find_one({"name": flow_id})
            if data:
                return cls(**data)
        return None
    
    @classmethod
    def find_by_type(cls, flow_type):
        """Findet alle Flows eines bestimmten Typs"""
        return [cls(**data) for data in db[cls.collection].find({"flow_type": flow_type})]
    
    @classmethod
    def find_all(cls):
        """Liefert alle Flows zurück"""
        return [cls(**data) for data in db[cls.collection].find()]
    
    def add_step(self, step_type, config, position=None):
        """Fügt einen Schritt zum Flow hinzu"""
        step = {
            "type": step_type,  # "filter", "transform", "forward", "conditional"
            "config": config
        }
        
        if position is not None and 0 <= position <= len(self.steps):
            self.steps.insert(position, step)
        else:
            self.steps.append(step)
        
        self.update(steps=self.steps)
    
    def remove_step(self, position):
        """Entfernt einen Schritt aus dem Flow"""
        if 0 <= position < len(self.steps):
            self.steps.pop(position)
            self.update(steps=self.steps)
            return True
        return False
    
    def update(self, **kwargs):
        """Aktualisiert die Flow-Informationen"""
        kwargs['updated_at'] = datetime.now(timezone.utc)
        db[self.collection].update_one(
            {"_id": self._id},
            {"$set": kwargs}
        )
        for key, value in kwargs.items():
            setattr(self, key, value)
    
    def delete(self):
        """Löscht den Flow aus der Datenbank"""
        db[self.collection].delete_one({"_id": self._id})
    
    def to_dict(self):
        """Konvertiert das Objekt in ein Dictionary"""
        result = self.__dict__.copy()
        result['id'] = str(result.pop('_id'))
        return result

# FlowGroup-Modell (NEU)
class FlowGroup:
    """Repräsentiert eine Flow-Gruppe für Gateway- oder Device-spezifische Verarbeitung"""
    
    collection = "flow_groups"
    
    def __init__(self, name, description=None, group_type="device_flows", flows=None,
                 usage_count=0, _id=None, created_at=None, updated_at=None):
        self._id = _id or ObjectId()
        self.name = name
        self.description = description
        self.group_type = group_type  # "gateway_flows" oder "device_flows"
        self.flows = flows or []  # Array von {flow_id, flow_name, priority}
        self.usage_count = usage_count
        self.created_at = created_at or datetime.now(timezone.utc)
        self.updated_at = updated_at or self.created_at
    
    @classmethod
    def create(cls, **kwargs):
        """Erstellt eine neue Flow-Gruppe in der Datenbank"""
        flow_group = cls(**kwargs)
        db[cls.collection].insert_one(flow_group.__dict__)
        return flow_group
    
    @classmethod
    def find_by_id(cls, group_id):
        """Findet eine Flow-Gruppe anhand ihrer ID"""
        try:
            data = db[cls.collection].find_one({"_id": ObjectId(group_id)})
            if data:
                return cls(**data)
        except:
            pass
        return None
    
    @classmethod
    def find_by_type(cls, group_type):
        """Findet alle Flow-Gruppen eines bestimmten Typs"""
        return [cls(**data) for data in db[cls.collection].find({"group_type": group_type})]
    
    @classmethod
    def find_all(cls):
        """Liefert alle Flow-Gruppen zurück"""
        return [cls(**data) for data in db[cls.collection].find()]
    
    def add_flow(self, flow_id, flow_name=None, priority=50):
        """Fügt einen Flow zur Gruppe hinzu"""
        # Prüfe ob Flow bereits in Gruppe
        for flow in self.flows:
            if flow.get('flow_id') == str(flow_id):
                return False
        
        # Flow zur Gruppe hinzufügen
        flow_config = {
            'flow_id': str(flow_id),
            'flow_name': flow_name or str(flow_id),
            'priority': priority
        }
        
        self.flows.append(flow_config)
        
        # Nach Priorität sortieren (höchste zuerst)
        self.flows.sort(key=lambda x: x.get('priority', 0), reverse=True)
        
        self.update(flows=self.flows)
        return True
    
    def remove_flow(self, flow_id):
        """Entfernt einen Flow aus der Gruppe"""
        original_length = len(self.flows)
        self.flows = [f for f in self.flows if f.get('flow_id') != str(flow_id)]
        
        if len(self.flows) < original_length:
            self.update(flows=self.flows)
            return True
        return False
    
    def update_flow_priority(self, flow_id, new_priority):
        """Aktualisiert die Priorität eines Flows in der Gruppe"""
        for flow in self.flows:
            if flow.get('flow_id') == str(flow_id):
                flow['priority'] = new_priority
                # Nach Priorität neu sortieren
                self.flows.sort(key=lambda x: x.get('priority', 0), reverse=True)
                self.update(flows=self.flows)
                return True
        return False
    
    def increment_usage(self):
        """Erhöht den Verwendungszähler"""
        self.usage_count += 1
        self.update(usage_count=self.usage_count)
    
    def update(self, **kwargs):
        """Aktualisiert die Flow-Gruppen-Informationen"""
        kwargs['updated_at'] = datetime.now(timezone.utc)
        db[self.collection].update_one(
            {"_id": self._id},
            {"$set": kwargs}
        )
        for key, value in kwargs.items():
            setattr(self, key, value)
    
    def delete(self):
        """Löscht die Flow-Gruppe aus der Datenbank"""
        db[self.collection].delete_one({"_id": self._id})
    
    def to_dict(self):
        """Konvertiert das Objekt in ein Dictionary"""
        result = self.__dict__.copy()
        result['id'] = str(result.pop('_id'))
        return result

# Hilfsfunktion zur Migration von Templates zu Flows
def migrate_template_to_flow(template_id, template_name=None):
    """
    Konvertiert ein Template zu einem Flow
    
    Args:
        template_id: ID des Templates
        template_name: Optionaler Name für den Flow
        
    Returns:
        Flow-Objekt oder None
    """
    try:
        # Erstelle einen neuen Flow basierend auf dem Template
        flow = Flow.create(
            name=f"{template_name or template_id}_flow",
            description=f"Automatisch migriert von Template {template_id}",
            flow_type="device_flow",  # Standard für migrierte Templates
            version="1.0.0",
            steps=[
                {
                    "type": "transform",
                    "config": {
                        "template": template_id
                    }
                },
                {
                    "type": "forward",
                    "config": {
                        "targets": [{"type": "evalarm"}]
                    }
                }
            ]
        )
        return flow
    except Exception as e:
        logger.error(f"Fehler bei der Migration von Template zu Flow: {str(e)}")
        return None

# Hilfsfunktion zur Migration von Template-Gruppen zu Flow-Gruppen
def migrate_template_group_to_flow_group(template_group_id):
    """
    Konvertiert eine Template-Gruppe zu einer Flow-Gruppe
    
    Args:
        template_group_id: ID der Template-Gruppe
        
    Returns:
        FlowGroup-Objekt oder None
    """
    try:
        # Hole die Template-Gruppe
        template_group = TemplateGroup.find_by_id(template_group_id)
        if not template_group:
            return None
        
        # Erstelle eine neue Flow-Gruppe
        flow_group = FlowGroup.create(
            name=f"{template_group.name} (Flows)",
            description=template_group.description,
            group_type="device_flows"
        )
        
        # Migriere alle Templates zu Flows
        for template_config in template_group.templates:
            template_id = template_config.get('template_id')
            template_name = template_config.get('template_name')
            priority = template_config.get('priority', 50)
            
            # Erstelle Flow aus Template
            flow = migrate_template_to_flow(template_id, template_name)
            if flow:
                flow_group.add_flow(flow._id, flow.name, priority)
        
        return flow_group
    except Exception as e:
        logger.error(f"Fehler bei der Migration von Template-Gruppe zu Flow-Gruppe: {str(e)}")
        return None

# Helfer-Funktionen für die Geräteerkennung
def determine_device_type(values):
    """
    Bestimmt den Gerätetyp anhand der empfangenen Werte
    
    DEPRECATED: Diese Funktion nutzt jetzt die zentrale Device Registry
    """
    # Create a message format that the registry understands
    message_data = {"value": values} if isinstance(values, dict) else {"value": {"data": values}}
    return registry_detect_device_type(message_data)

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
        # Neues Gerät anlegen - nutze die zentrale Registry für Typerkennung
        device_type = registry_detect_device_type(device_data)
        logger.info(f"Neues Gerät vom Typ {device_type} für Gateway {gateway_uuid} wird angelegt (erkannt durch zentrale Registry)")
        
        # Validiere die Nachricht gegen die Device-Anforderungen
        is_valid, errors = device_registry.validate_device_message(device_type, device_data)
        if not is_valid:
            logger.warning(f"Gerätedaten für Typ {device_type} nicht vollständig valide: {', '.join(errors)}")
            # Trotzdem fortfahren, aber warnen
        
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
    now = datetime.now(timezone.utc)
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
    
    now = datetime.now(timezone.utc)
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