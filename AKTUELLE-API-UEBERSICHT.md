# Aktuelle API-Übersicht des RoomBanker REST API Systems

## Tatsächlicher Systemzustand

Das System besteht aus den folgenden Komponenten:

1. **API-Gateway** (Port 8000): Zentraler Einstiegspunkt für alle Anfragen
2. **Message Processor** (Port 8082): Verarbeitet eingehende Nachrichten und leitet sie weiter

## Tatsächliche Port-Zuordnungen

| Service | Port | Container-Name | Tatsächliche Nutzung |
|---------|------|----------------|----------------------|
| API-Gateway | 8000 | roombankerrestapiweb-gateway-1 | Hauptzugangspunkt für Gateway-Nachrichten |
| Message Processor | 8082 | roombankerrestapiweb-processor-1 | Intern für Nachrichtenverarbeitung (nicht von außen erreichbar) |
| MongoDB | 27017 | roombankerrestapiweb-mongo-1 | Datenbank für Gateways, Devices und Kunden |
| Redis | 6379 | roombankerrestapiweb-redis-1 | Message Queue |

## Gateway-Nachrichteneingang

| Endpunkt | Methode | Tatsächliche Implementierung | Status | 
|----------|---------|------------------------------|--------|
| `/api/v1/messages/process` | POST | Haupteingangspunkt für Gateway-Nachrichten | **AKTIV und FUNKTIONIERT** |

## Kompletter Nachrichtenfluss (IST-Zustand)

1. **Gateway sendet Nachricht an:**
   ```
   http://192.168.178.44:8000/api/v1/messages/process
   ```

2. **API-Gateway leitet weiter an:**
   ```
   http://processor:8082/api/v1/messages/process
   ```

3. **Prozessor empfängt Nachricht und:**
   - Extrahiert gateway_id oder gateway_uuid
   - Prüft ob Gateway existiert
   - Registriert Gateway als "unassigned" falls nicht
   - Erkennt und registriert Geräte
   - Speichert Nachricht und wartet auf manuelle Zuordnung zu Kunden

## Problemursachen

1. **Fehlende Gateway-Registrierung:**
   - Gateway-Nachrichten kommen korrekt an, aber der Message Processor findet kein Gateway in der Datenbank
   - Erwartet aber, dass ein Gateway bereits zugeordnet ist, obwohl Registrierung funktioniert

2. **Template-Verarbeitungsprobleme:**
   - Fehler bei Nachrichtenformat 'dict object' has no attribute 'subdevicelist'
   - Fehler bei Template-Syntax (% am Ende)

## Implementierte Funktionsweise von `/api/v1/messages/process`

```python
@app.route('/api/v1/messages/process', methods=['POST'])
def process_message():
    # Gateway-ID aus der Nachricht extrahieren
    message = data.get('message', data)
    gateway_id = data.get('gateway_id')
    
    # Gateway in der Datenbank registrieren (wenn nicht vorhanden)
    gateway = Gateway.find_by_uuid(gateway_id)
    if not gateway:
        Gateway.create(uuid=gateway_id, customer_id=None, status="unassigned")
        
    # Geräte registrieren
    if 'subdevicelist' in message:
        for device_data in message.get('subdevicelist', []):
            device = register_device_from_message(gateway_id, device_data)
    elif 'subdeviceid' in message:
        # Für Panic-Button-Format mit subdeviceid
        device_data = {
            "id": str(message['subdeviceid']),
            "value": {}
        }
        device = register_device_from_message(gateway_id, device_data)
    
    # Nachricht in Queue einfügen
    message_id = queue.enqueue_message(
        message=message,
        template_name=template_name,
        endpoint_name='auto',
        customer_config=customer_config,
        gateway_id=gateway_id
    )
    
    return success_response({
        'message_id': message_id,
        'status': 'queued',
        'message': f'Nachricht wurde in die Queue eingefügt (ID: {message_id})'
    })
```

## Message-Forwarder Bedingungen (IST-Zustand)

Der Message-Forwarder überprüft folgende Bedingungen:

```python
# Prüfe zunächst, ob das Gateway überhaupt existiert
gateway = self.Gateway.find_by_uuid(gateway_uuid)
if not gateway:
    logger.error(f"Weiterleitung blockiert: Gateway {gateway_uuid} existiert nicht in der Datenbank")
    return None
            
# Prüfe ob das Gateway einem Kunden zugeordnet ist
if not gateway.customer_id:
    logger.error(f"Weiterleitung blockiert: Gateway {gateway_uuid} ist keinem Kunden zugeordnet")
    return None
```

## Fehlerquelle Template Engine (Panic Buttons)

In der Template-Engine wird erwartet, dass bei Panic Buttons ein bestimmtes Format vorliegt:

1. **Format 1 (im Template erwartet):** 
   ```json
   {
     "subdevicelist": [
       {
         "id": 673922542395461,
         "value": {...}
       }
     ]
   }
   ```

2. **Format 2 (tatsächlich vom Gateway):** 
   ```json
   {
     "code": 2030,
     "subdeviceid": 673922542395461,
     ...
   }
   ```

**Lösungsansatz in Implementierung:**
```python
# Besondere Behandlung für Panic-Button-Nachrichten (Code 2030)
if template_name == 'evalarm_panic' and isinstance(message, dict):
    # Stellen sicher, dass message.subdevicelist existiert, auch als leere Liste
    if 'subdevicelist' not in message:
        message['subdevicelist'] = []
```

## Nächste Schritte für eine Lösung

1. **Anpassung der Template-Engine:**
   - Sicherstellen, dass alle Nachrichtenformate korrekt erkannt werden
   - Logik für Panic-Button-Nachrichten verbessern

2. **Gateway-Zuordnung direkt im Nachrichtenfluss:**
   - Automatische Gateway-Registrierung testen und bestätigen (bereits funktionierend)
   - Option für automatische Kundenzuordnung prüfen

3. **Korrekte Template-Syntax sicherstellen:**
   - Templates auf Syntaxfehler prüfen
   - Sicherstellen, dass alle % und {} korrekt abgeschlossen sind 