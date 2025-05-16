#!/usr/bin/env python
"""
Migrationsskript zur Übertragung von Gateway-Zuordnungen aus customer_config.json in die MongoDB.

Dieses Skript sollte in einer Umgebung mit Zugriff auf die MongoDB ausgeführt werden und löst das 
Problem der dualen Datenhaltung zwischen JSON-Dateien und Datenbank.
"""

import os
import sys
import json
import logging
from typing import Dict, List, Any

# Projektverzeichnis zum Pfad hinzufügen, um imports aus anderen Modulen zu ermöglichen
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Aus api.models die entsprechenden Klassen importieren
from api.models import Customer, Gateway, initialize_db

# Logging konfigurieren
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('config-migration')

def load_customer_config() -> Dict[str, Any]:
    """
    Lädt die customer_config.json-Datei und gibt deren Inhalt zurück.
    
    Returns:
        Dict mit dem Inhalt der customer_config.json
    """
    PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    config_path = os.path.join(PROJECT_DIR, 'templates', 'customer_config.json')
    
    try:
        with open(config_path, 'r') as f:
            config = json.load(f)
        logger.info(f"customer_config.json erfolgreich geladen")
        return config
    except Exception as e:
        logger.error(f"Fehler beim Laden der customer_config.json: {str(e)}")
        return {"customers": {}}

def find_customer_by_name(name: str) -> Customer:
    """
    Findet einen Kunden in der Datenbank anhand seines Namens.
    
    Args:
        name: Der Name des Kunden
        
    Returns:
        Customer-Objekt oder None, wenn kein Kunde mit diesem Namen gefunden wurde
    """
    try:
        # Da es keine direkte find_by_name-Methode gibt, müssen wir alle Kunden durchsuchen
        customers = Customer.find_all()
        for customer in customers:
            if customer.name == name:
                return customer
        return None
    except Exception as e:
        logger.error(f"Fehler beim Suchen des Kunden '{name}': {str(e)}")
        return None

def migrate_gateway_assignments():
    """
    Hauptfunktion zur Migration der Gateway-Zuordnungen.
    
    Für jeden Kunden und dessen Gateways in der config-Datei:
    1. Prüft, ob der Kunde in der Datenbank existiert
    2. Aktualisiert oder erstellt fehlende Kunden
    3. Aktualisiert Gateway-Zuordnungen in der Datenbank
    """
    # Datenbank-Verbindung initialisieren
    try:
        initialize_db()
        logger.info("Datenbank-Verbindung hergestellt")
    except Exception as e:
        logger.error(f"Fehler bei der Datenbankverbindung: {str(e)}")
        return
    
    # Konfiguration laden
    config = load_customer_config()
    if not config or 'customers' not in config:
        logger.error("Keine gültige Kundenkonfiguration gefunden")
        return
    
    # Statistik für Migrations-Zusammenfassung
    stats = {
        "customers_processed": 0,
        "customers_created": 0,
        "customers_updated": 0,
        "gateways_processed": 0,
        "gateways_assigned": 0,
        "gateways_created": 0,
        "gateways_ignored": 0,
        "errors": 0
    }
    
    # Jeden Kunden in der Konfiguration verarbeiten
    for customer_id, customer_data in config['customers'].items():
        stats["customers_processed"] += 1
        try:
            # Kundenname aus der Konfiguration extrahieren
            customer_name = customer_data.get('name', customer_id)
            logger.info(f"Verarbeite Kunde: {customer_name}")
            
            # Prüfen, ob der Kunde in der Datenbank existiert
            db_customer = find_customer_by_name(customer_name)
            
            # Wenn der Kunde nicht existiert, erstellen wir ihn
            if not db_customer:
                logger.info(f"Kunde '{customer_name}' nicht in der Datenbank gefunden, erstelle neu")
                
                # Kundenobjekt aus den verfügbaren Daten erstellen
                customer_create_data = {
                    "name": customer_name,
                    "evalarm_username": customer_data.get('api_config', {}).get('username'),
                    "evalarm_password": customer_data.get('api_config', {}).get('password'),
                    "evalarm_namespace": customer_data.get('api_config', {}).get('namespace'),
                    "evalarm_url": customer_data.get('api_config', {}).get('url', "https://tas.dev.evalarm.de/api/v1/espa"),
                    "status": "active"
                }
                
                # Kunde in der Datenbank erstellen
                db_customer = Customer.create(**customer_create_data)
                stats["customers_created"] += 1
                logger.info(f"Kunde '{customer_name}' in der Datenbank erstellt (ID: {db_customer._id})")
            else:
                logger.info(f"Kunde '{customer_name}' in der Datenbank gefunden (ID: {db_customer._id})")
                
                # Optionale Aktualisierung der Kundendaten, falls gewünscht
                update_data = {}
                
                # Beispiel: API-Konfiguration aktualisieren
                if 'api_config' in customer_data:
                    if 'username' in customer_data['api_config'] and not db_customer.evalarm_username:
                        update_data['evalarm_username'] = customer_data['api_config']['username']
                    
                    if 'password' in customer_data['api_config'] and not db_customer.evalarm_password:
                        update_data['evalarm_password'] = customer_data['api_config']['password']
                    
                    if 'namespace' in customer_data['api_config'] and not db_customer.evalarm_namespace:
                        update_data['evalarm_namespace'] = customer_data['api_config']['namespace']
                    
                    if 'url' in customer_data['api_config'] and not db_customer.evalarm_url:
                        update_data['evalarm_url'] = customer_data['api_config']['url']
                
                # Aktualisiere den Kunden, wenn Änderungen notwendig sind
                if update_data:
                    db_customer.update(**update_data)
                    stats["customers_updated"] += 1
                    logger.info(f"Kunde '{customer_name}' in der Datenbank aktualisiert")
            
            # Gateway-Zuordnungen verarbeiten
            if 'gateways' in customer_data and isinstance(customer_data['gateways'], list):
                gateways = customer_data['gateways']
                logger.info(f"Verarbeite {len(gateways)} Gateways für Kunde '{customer_name}'")
                
                for gateway_uuid in gateways:
                    stats["gateways_processed"] += 1
                    
                    # Prüfen, ob das Gateway existiert
                    gateway = Gateway.find_by_uuid(gateway_uuid)
                    
                    if gateway:
                        # Gateway existiert bereits
                        if gateway.customer_id:
                            # Gateway ist bereits einem Kunden zugeordnet
                            if str(gateway.customer_id) == str(db_customer._id):
                                logger.info(f"Gateway {gateway_uuid} ist bereits dem Kunden '{customer_name}' zugeordnet")
                            else:
                                # Gateway ist einem anderen Kunden zugeordnet - Konflikt!
                                logger.warning(f"KONFLIKT: Gateway {gateway_uuid} ist bereits einem anderen Kunden zugeordnet!")
                                # In diesem Fall nicht ändern, nur protokollieren
                                stats["gateways_ignored"] += 1
                                continue
                        else:
                            # Gateway existiert, aber ist keinem Kunden zugeordnet
                            # Wir ordnen es dem aktuellen Kunden zu
                            gateway.update(customer_id=db_customer._id)
                            stats["gateways_assigned"] += 1
                            logger.info(f"Gateway {gateway_uuid} dem Kunden '{customer_name}' zugeordnet")
                    else:
                        # Gateway existiert nicht, wir erstellen es
                        try:
                            Gateway.create(
                                uuid=gateway_uuid, 
                                customer_id=db_customer._id,
                                name=f"Gateway {gateway_uuid[-8:]}",
                                status="unknown"
                            )
                            stats["gateways_created"] += 1
                            logger.info(f"Gateway {gateway_uuid} neu erstellt und dem Kunden '{customer_name}' zugeordnet")
                        except Exception as e:
                            logger.error(f"Fehler beim Erstellen des Gateways {gateway_uuid}: {str(e)}")
                            stats["errors"] += 1
            else:
                logger.warning(f"Keine Gateways für Kunde '{customer_name}' gefunden")
                
        except Exception as e:
            logger.error(f"Fehler bei der Verarbeitung des Kunden {customer_id}: {str(e)}")
            stats["errors"] += 1
    
    # Migrations-Zusammenfassung ausgeben
    logger.info("=== Migration abgeschlossen ===")
    logger.info(f"Verarbeitete Kunden: {stats['customers_processed']}")
    logger.info(f"Erstellte Kunden: {stats['customers_created']}")
    logger.info(f"Aktualisierte Kunden: {stats['customers_updated']}")
    logger.info(f"Verarbeitete Gateways: {stats['gateways_processed']}")
    logger.info(f"Zugeordnete Gateways: {stats['gateways_assigned']}")
    logger.info(f"Erstellte Gateways: {stats['gateways_created']}")
    logger.info(f"Ignorierte Gateways (Konflikte): {stats['gateways_ignored']}")
    logger.info(f"Fehler: {stats['errors']}")

if __name__ == "__main__":
    # Banner ausgeben
    print("=" * 80)
    print("Gateway-Zuordnungs-Migration".center(80))
    print("=" * 80)
    print("Dieses Skript migriert Gateway-Zuordnungen von der customer_config.json")
    print("in die MongoDB-Datenbank.")
    print("-" * 80)
    
    # Bestätigung vor dem Start der Migration
    confirm = input("Migration starten? (j/n): ")
    if confirm.lower() != 'j':
        print("Migration abgebrochen.")
        sys.exit(0)
    
    # Migration ausführen
    migrate_gateway_assignments() 