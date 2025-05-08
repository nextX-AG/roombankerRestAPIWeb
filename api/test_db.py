"""
Testskript für die MongoDB-Verbindung und Datenmodelle
"""

import os
import sys
import json
import random
from datetime import datetime

# Füge das aktuelle Verzeichnis zum Pfad hinzu
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api.models import initialize_db, Customer, Gateway, Device

def test_mongodb_connection():
    """Testet die Verbindung zur MongoDB"""
    print("Teste MongoDB-Verbindung...")
    try:
        # Initialisiere die Datenbankverbindung
        initialize_db()
        print("MongoDB-Verbindung erfolgreich hergestellt!")
        return True
    except Exception as e:
        print(f"Fehler bei der MongoDB-Verbindung: {str(e)}")
        return False

def clean_previous_test_data():
    """Bereinigt vorherige Testdaten aus der Datenbank"""
    print("\nBereinige vorherige Testdaten...")
    
    # Finde den Kunden "evAlarm Test GmbH"
    test_customer = None
    for customer in Customer.find_all():
        if "Test" in customer.name:
            test_customer = customer
            break
    
    if test_customer:
        # Finde die zugehörigen Gateways
        test_gateways = Gateway.find_by_customer(test_customer._id)
        
        # Lösche alle zugehörigen Geräte
        for gateway in test_gateways:
            devices = Device.find_by_gateway(gateway.uuid)
            for device in devices:
                device.delete()
                print(f"Gerät gelöscht: {device.name}")
            
            # Lösche das Gateway
            gateway.delete()
            print(f"Gateway gelöscht: {gateway.name}")
        
        # Lösche den Kunden
        test_customer.delete()
        print(f"Kunde gelöscht: {test_customer.name}")
    else:
        print("Keine vorherigen Testdaten gefunden.")

def create_test_data():
    """Erstellt Testdaten in der Datenbank"""
    print("\nErstelle Testdaten...")
    
    # Ein zufälliger Suffix für eindeutige Namen
    suffix = random.randint(1000, 9999)
    
    # Erstelle einen Testkunden
    customer = Customer.create(
        name=f"evAlarm Test GmbH {suffix}",
        contact_person="Max Mustermann",
        email="test@evalarm.de",
        phone="+49123456789",
        evalarm_username="evalarm_test",
        evalarm_password="test_password",
        evalarm_namespace="test_namespace"
    )
    print(f"Kunde erstellt: {customer.name} (ID: {customer._id})")
    
    # Erstelle ein Test-Gateway
    gateway = Gateway.create(
        uuid=f"test-gateway-{suffix}",
        customer_id=customer._id,
        name=f"Test Gateway {suffix}",
        description="Ein Gateway für Testzwecke"
    )
    print(f"Gateway erstellt: {gateway.name} (UUID: {gateway.uuid})")
    
    # Erstelle ein Test-Gerät
    device = Device.create(
        gateway_uuid=gateway.uuid,
        device_id=f"test-device-{suffix}",
        device_type="panic_button",
        name=f"Test Panic Button {suffix}",
        description="Ein Panic-Button für Testzwecke",
        status={"alarmstatus": "ok", "battery": "ok"}
    )
    print(f"Gerät erstellt: {device.name} (ID: {device.device_id})")
    
    return customer, gateway, device

def query_test_data(customer, gateway, device):
    """Fragt die Testdaten aus der Datenbank ab"""
    print("\nFrage Testdaten ab...")
    
    # Finde den Kunden
    found_customer = Customer.find_by_id(customer._id)
    print(f"Kunde gefunden: {found_customer.name}")
    
    # Finde das Gateway
    found_gateway = Gateway.find_by_uuid(gateway.uuid)
    print(f"Gateway gefunden: {found_gateway.name}")
    
    # Finde das Gerät
    found_device = Device.find_by_gateway_and_id(gateway.uuid, device.device_id)
    print(f"Gerät gefunden: {found_device.name}")
    
    # Finde alle Gateways des Kunden
    customer_gateways = Gateway.find_by_customer(customer._id)
    print(f"Anzahl der Gateways für Kunde {customer.name}: {len(customer_gateways)}")
    
    # Finde alle Geräte des Gateways
    gateway_devices = Device.find_by_gateway(gateway.uuid)
    print(f"Anzahl der Geräte für Gateway {gateway.name}: {len(gateway_devices)}")

def update_test_data(customer, gateway, device):
    """Aktualisiert die Testdaten in der Datenbank"""
    print("\nAktualisiere Testdaten...")
    
    # Aktualisiere den Kunden
    customer.update(
        contact_person="Erika Musterfrau",
        phone="+49987654321"
    )
    print(f"Kunde aktualisiert: {customer.name}, neuer Kontakt: {customer.contact_person}")
    
    # Aktualisiere den Gateway-Status
    gateway.update_status("online")
    print(f"Gateway-Status aktualisiert: {gateway.name}, Status: {gateway.status}")
    
    # Aktualisiere den Gerätestatus
    device.update_status({"alarmstatus": "alarm", "alarmtype": "panic"})
    print(f"Gerätestatus aktualisiert: {device.name}, Status: {device.status}")

def clean_up_test_data(customer, gateway, device):
    """Entfernt die Testdaten aus der Datenbank"""
    print("\nEntferne Testdaten...")
    
    # Lösche das Gerät
    device.delete()
    print(f"Gerät gelöscht: {device.name}")
    
    # Lösche das Gateway
    gateway.delete()
    print(f"Gateway gelöscht: {gateway.name}")
    
    # Lösche den Kunden
    customer.delete()
    print(f"Kunde gelöscht: {customer.name}")

def main():
    """Hauptfunktion für den Datenbank-Test"""
    if not test_mongodb_connection():
        return
    
    # Bereinige vorherige Testdaten
    clean_previous_test_data()
    
    # Erstelle Testdaten
    customer, gateway, device = create_test_data()
    
    # Frage Testdaten ab
    query_test_data(customer, gateway, device)
    
    # Aktualisiere Testdaten
    update_test_data(customer, gateway, device)
    
    # Frage aktualisierte Testdaten ab
    query_test_data(customer, gateway, device)
    
    # Bereinige Testdaten
    clean_up_test_data(customer, gateway, device)
    
    print("\nTest abgeschlossen!")

if __name__ == "__main__":
    main() 