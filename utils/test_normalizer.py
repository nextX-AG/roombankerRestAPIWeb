#!/usr/bin/env python3
"""
Testskript für den Message Normalizer

Dieses Skript testet den Message Normalizer mit verschiedenen Nachrichtenformaten,
um seine Funktionalität zu demonstrieren und zu validieren.
"""

import sys
import json
import os
from pprint import pprint

# Projektverzeichnis zum Python-Pfad hinzufügen
current_dir = os.path.dirname(os.path.abspath(__file__))
project_dir = os.path.dirname(current_dir)
sys.path.append(project_dir)

# Normalizer importieren
from utils.message_normalizer import MessageNormalizer

def print_separator():
    """Druckt einen Trennstrich für bessere Lesbarkeit."""
    print("\n" + "=" * 80 + "\n")

def test_normalizer():
    """Testet den MessageNormalizer mit verschiedenen Nachrichtenformaten."""
    print("MessageNormalizer Test-Suite")
    print_separator()
    
    # Normalizer initialisieren
    normalizer = MessageNormalizer()
    
    # Liste der Testfälle
    test_cases = [
        {
            "name": "Roombanker Panic Button (code 2030)",
            "message": {
                "gateway_id": "gw-c490b022-cc18-407e-a07e-a355747a8fdd",
                "message": {
                    "code": 2030,
                    "subdeviceid": 673922542395461,
                    "alarmstatus": "alarm",
                    "alarmtype": "panic",
                    "ts": 1747344697
                }
            }
        },
        {
            "name": "Roombanker Standard (subdevicelist)",
            "message": {
                "gateway_id": "gw-c490b022-cc18-407e-a07e-a355747a8fdd",
                "ts": 1747344697,
                "subdevicelist": [
                    {
                        "id": 673922542395461,
                        "value": {
                            "alarmstatus": "alarm",
                            "alarmtype": "panic",
                            "batterystatus": "connected",
                            "onlinestatus": "online"
                        }
                    }
                ]
            }
        },
        {
            "name": "Roombanker Gateway Status",
            "message": {
                "gateway": {
                    "uuid": "gw-c490b022-cc18-407e-a07e-a355747a8fdd",
                    "dbm": "-117",
                    "cellularstatus": "disconnected",
                    "batterystatus": "connected",
                    "electricity": 100,
                    "faultstatus": "normal",
                    "lidstatus": "open",
                    "pinstatus": "valid",
                    "powerstatus": "connected",
                    "simstatus": "none",
                    "wanstatus": "connected",
                    "wifistatus": "disconnected"
                },
                "ts": 1747355000
            }
        },
        {
            "name": "Multi-Device Nachricht",
            "message": {
                "gateway_id": "gw-multi-device-test",
                "ts": 1747344697,
                "subdevicelist": [
                    {
                        "id": 1234567890123456,
                        "value": {
                            "currenttemperature": 22.5,
                            "currenthumidity": 55,
                            "batterystatus": "ok"
                        }
                    },
                    {
                        "id": 6789012345678901,
                        "value": {
                            "contactstate": "closed",
                            "batterystatus": "ok"
                        }
                    },
                    {
                        "id": 9876543210987654,
                        "value": {
                            "motiondetected": True,
                            "batterystatus": "low"
                        }
                    }
                ]
            }
        },
        {
            "name": "Unbekanntes Format",
            "message": {
                "gateway_uuid": "gw-unknown-format",
                "unknown_field": "test",
                "some_value": 123,
                "nested": {
                    "field": "value"
                }
            }
        }
    ]
    
    # Testfälle durchlaufen
    for idx, test_case in enumerate(test_cases, 1):
        print(f"Test {idx}: {test_case['name']}")
        print("-" * 40)
        
        try:
            # Nachricht normalisieren
            normalized = normalizer.normalize(test_case["message"])
            
            # Format-Typ ausgeben
            print(f"Erkanntes Format: {normalized['metadata']['format_type']}")
            
            # Gateway-Informationen ausgeben
            print(f"Gateway ID: {normalized['gateway']['id']}")
            print(f"Gateway Typ: {normalized['gateway']['type']}")
            
            # Geräte ausgeben
            print(f"Gefundene Geräte: {len(normalized['devices'])}")
            for i, device in enumerate(normalized['devices'], 1):
                print(f"  Gerät {i}:")
                print(f"    ID: {device['id']}")
                print(f"    Typ: {device['type']}")
                print(f"    Werte: {json.dumps(device['values'], indent=2, ensure_ascii=False)}")
            
            # Reine Ausgabeformatierung
            if idx < len(test_cases):
                print_separator()
                
        except Exception as e:
            print(f"Fehler bei der Normalisierung: {str(e)}")
            if idx < len(test_cases):
                print_separator()

if __name__ == "__main__":
    test_normalizer() 