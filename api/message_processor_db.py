"""
Modifizierte Version des message_processor, die die Datenbank statt der customer_config.json für
Gateway-Kundenzuordnungen verwendet.

Diese Datei dient als Vorlage für die Änderungen, die an der originalen message_processor.py
vorgenommen werden müssen.
"""

import os
import sys
import json
import logging
from bson import ObjectId
from datetime import datetime
from typing import Dict, Any, Optional

# Importiere bestehende Komponenten
from api.models import Customer, Gateway, Device, initialize_db, register_device_from_message

# Beispielfunktion, die angepasst werden muss
def get_customer_for_gateway(gateway_id: str) -> Optional[Dict[str, Any]]:
    """
    Findet den zugehörigen Kunden basierend auf der Gateway-ID aus der Datenbank (nicht aus der JSON-Datei)
    
    Args:
        gateway_id: Die Gateway-ID/UUID
        
    Returns:
        Kundenkonfiguration als Dict oder None, wenn kein Kunde gefunden wurde
    """
    # Stelle sicher, dass die Datenbank initialisiert ist
    try:
        initialize_db()
    except Exception as e:
        logging.error(f"Fehler bei der Datenbankinitialisierung: {str(e)}")
        return None
    
    try:
        # Gateway in der Datenbank suchen
        gateway = Gateway.find_by_uuid(gateway_id)
        
        # Wenn Gateway nicht gefunden, sofort zurück
        if not gateway:
            logging.warning(f"Gateway {gateway_id} nicht in der Datenbank gefunden")
            return None
        
        # Wenn Gateway keinem Kunden zugeordnet ist
        if not gateway.customer_id:
            logging.warning(f"Gateway {gateway_id} ist keinem Kunden zugeordnet")
            return None
        
        # Kunde in der Datenbank suchen
        customer = Customer.find_by_id(gateway.customer_id)
        if not customer:
            logging.warning(f"Kunde für Gateway {gateway_id} nicht gefunden (ID: {gateway.customer_id})")
            return None
        
        # Kundenobjekt in ein ähnliches Format wie in der customer_config.json umwandeln
        # für Kompatibilität mit bestehendem Code
        customer_config = {
            "name": customer.name,
            "api_config": {
                "url": customer.evalarm_url,
                "username": customer.evalarm_username,
                "password": customer.evalarm_password,
                "namespace": customer.evalarm_namespace,
                "headers": {
                    "Content-Type": "application/json",
                    "X-EVALARM-API-VERSION": "2.1.5"  # Standardwert, könnte später konfigurierbar sein
                }
            },
            # Wichtig: gateways-Array auch hier behalten für Kompatibilität
            "gateways": [gateway_id],
            # Weitere Kundendaten können hier hinzugefügt werden
            "status": customer.status,
            "customer_id": str(customer._id)
        }
        
        logging.info(f"Gateway {gateway_id} zugeordnet zu Kunde {customer.name}")
        return customer_config
    
    except Exception as e:
        logging.error(f"Fehler beim Abfragen des Kunden für Gateway {gateway_id}: {str(e)}")
        import traceback
        logging.error(traceback.format_exc())
        return None

# Beispiel für die modifizierte process_message-Funktion (Nur relevanter Teil)
def process_message_db_example(gateway_id: str, message: Dict[str, Any]) -> Dict[str, Any]:
    """
    Beispiel für die modifizierte process_message-Funktion, die direkt die Datenbank verwendet
    
    Diese Funktion dient nur als Vorlage und muss in die bestehende process_message-Funktion
    integriert werden.
    
    Args:
        gateway_id: Die Gateway-ID
        message: Die zu verarbeitende Nachricht
        
    Returns:
        Antwort mit Verarbeitungsstatus
    """
    logging.info(f"Verarbeite Nachricht für Gateway: {gateway_id}")
    
    # ÄNDERUNG: Statt customer_config.json zu lesen, frage die Datenbank direkt ab
    customer_config = get_customer_for_gateway(gateway_id)
    
    # Registriere oder aktualisiere das Gateway in der Datenbank, falls es nicht existiert
    # Diese Funktionalität sollte außerhalb dieser Bedingung sein, damit Gateways immer
    # registriert werden, auch wenn sie bereits einem Kunden zugeordnet sind
    try:
        # Prüfe, ob das Gateway bereits existiert
        gateway = Gateway.find_by_uuid(gateway_id)
        
        if not gateway:
            # Gateway existiert nicht, erstelle es als "unassigned"
            logging.info(f"Registriere neues unbekanntes Gateway: {gateway_id}")
            gateway = Gateway.create(
                uuid=gateway_id, 
                customer_id=None,  # Keinem Kunden zugeordnet
                status="unassigned",
                name=f"Gateway {gateway_id[-8:]}"
            )
            logging.info(f"Gateway {gateway_id} als 'unassigned' registriert")
        else:
            # Gateway existiert, aktualisiere den Status auf "online"
            gateway.update_status("online")
            logging.info(f"Gateway-Status für {gateway_id} auf 'online' aktualisiert")
    except Exception as e:
        logging.error(f"Fehler bei Gateway-Registrierung oder -Aktualisierung: {str(e)}")
    
    # Geräteregistrierung sollte unabhängig von der Kundenzuordnung erfolgen
    try:
        if isinstance(message, dict):
            # Format 1: Nachricht mit subdevicelist
            if 'subdevicelist' in message and isinstance(message['subdevicelist'], list):
                for device_data in message.get('subdevicelist', []):
                    try:
                        device = register_device_from_message(gateway_id, device_data)
                        if device:
                            logging.info(f"Gerät für Gateway {gateway_id} registriert: {device.device_id}")
                    except Exception as e:
                        logging.error(f"Fehler bei Geräteregistrierung: {str(e)}")
            
            # Format 2: Nachricht mit subdeviceid (ohne subdevicelist)
            elif 'subdeviceid' in message:
                # Hier Code zum Registrieren von Geräten mit subdeviceid
                # Identisch zum bestehenden Code in message_processor.py
                pass
    except Exception as e:
        logging.error(f"Fehler bei der Geräteregistrierung: {str(e)}")
    
    # Weiterer Code folgt dem bestehenden Ablauf in process_message
    if not customer_config:
        # Keine Kundenzuordnung gefunden - Speichere die Nachricht und antworte mit entsprechendem Status
        pass
    else:
        # Kunde gefunden - Führe die normale Verarbeitungslogik aus
        pass
    
    # Hier folgt der Rest der bestehenden Funktion...
    return {
        'status': 'success',
        'message': 'Beispiel für DB-basierte Verarbeitung'
    }

# Anmerkungen zur Integration:
"""
Um die Änderungen zu integrieren, müssen folgende Stellen angepasst werden:

1. In message_processor.py:
   - Die Funktion process_message() muss den customer_config.json-Zugriff durch den 
     Datenbankzugriff ersetzen, wie oben demonstriert.
   - Die Gateway-Registrierung sollte auch erfolgen, wenn das Gateway bereits in der 
     Datenbank existiert, aber nur um den Online-Status zu aktualisieren.
   - Die Geräteerkennung sollte unabhängig von der Kundenzuordnung erfolgen.

2. In template_engine.py:
   - Die MessageForwarder.forward_message()-Methode muss angepasst werden, um die 
     customer_config.json-Abfrage zu entfernen und stattdessen direkt die Datenbank zu nutzen.

3. Bei der ersten Verwendung des modifizierten Codes:
   - Das migrate_customer_config.py-Skript ausführen, um sicherzustellen, dass alle
     bestehenden Gateway-Zuordnungen in die Datenbank migriert wurden.
""" 