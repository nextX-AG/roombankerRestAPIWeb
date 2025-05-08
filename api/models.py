"""
Datenmodelle für das evAlarm-IoT Gateway Management System
"""

import datetime
from pymongo import MongoClient
from bson.objectid import ObjectId

# MongoDB-Verbindung
mongo_client = None
db = None

def initialize_db(connection_string="mongodb://localhost:27017/", db_name="evalarm_gateway"):
    """Initialisiert die Verbindung zur MongoDB"""
    global mongo_client, db
    mongo_client = MongoClient(connection_string)
    db = mongo_client[db_name]
    
    # Indizes für schnellere Abfragen erstellen
    db.customers.create_index("name", unique=True)
    db.gateways.create_index("uuid", unique=True)
    db.devices.create_index([("gateway_uuid", 1), ("device_id", 1)], unique=True)

# Kunden-Modell
class Customer:
    """Repräsentiert einen Kunden im System"""
    
    collection = "customers"
    
    def __init__(self, name, contact_person=None, email=None, phone=None, 
                 evalarm_username=None, evalarm_password=None, evalarm_namespace=None,
                 status="active", immediate_forwarding=True, _id=None,
                 created_at=None, updated_at=None):
        self._id = _id or ObjectId()
        self.name = name
        self.contact_person = contact_person
        self.email = email
        self.phone = phone
        self.evalarm_username = evalarm_username
        self.evalarm_password = evalarm_password
        self.evalarm_namespace = evalarm_namespace
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
    
    def update(self, **kwargs):
        """Aktualisiert die Gateway-Informationen"""
        kwargs['updated_at'] = datetime.datetime.now()
        db[self.collection].update_one(
            {"_id": self._id},
            {"$set": kwargs}
        )
        for key, value in kwargs.items():
            setattr(self, key, value)
    
    def update_status(self, status="online"):
        """Aktualisiert den Status und den Zeitpunkt des letzten Kontakts"""
        now = datetime.datetime.now()
        self.update(status=status, last_contact=now)
    
    def delete(self):
        """Löscht das Gateway aus der Datenbank"""
        db[self.collection].delete_one({"_id": self._id})
    
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
    """Registriert oder aktualisiert ein Gerät basierend auf empfangenen Nachrichten"""
    if not device_data or "id" not in device_data:
        return None
    
    device_id = str(device_data["id"])
    values = device_data.get("value", {})
    
    device = Device.find_by_gateway_and_id(gateway_uuid, device_id)
    
    if device:
        # Gerät aktualisieren
        device.update_status(values)
        return device
    else:
        # Neues Gerät anlegen
        device_type = determine_device_type(values)
        new_device = Device.create(
            gateway_uuid=gateway_uuid,
            device_id=device_id,
            device_type=device_type,
            status=values
        )
        return new_device 