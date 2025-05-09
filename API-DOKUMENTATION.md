# API-Dokumentation: evAlarm-IoT Gateway Management System

## Systemübersicht

Das System besteht aus mehreren Komponenten:

1. **API-Server** (Port 8080): Hauptschnittstelle für das Frontend, verwaltet Kunde, Gateways und Geräte
2. **Message Processor** (Port 8081): Verarbeitet eingehende Nachrichten und leitet sie weiter
3. **Auth Service** (Port 8082): Verwaltet Benutzerauthentifizierung und -autorisierung
4. **Frontend**: React-basierte Benutzeroberfläche

## Datenbanken

- **MongoDB**: Persistente Datenspeicherung für Kunden, Gateways, Geräte
- **Redis**: Message Queue und Caching

## API-Endpunkte

### Gateway-Nachrichteneingang

Eingehende Nachrichten von IoT-Gateways können über verschiedene Wege ins System gelangen:

| Endpunkt | Methode | Beschreibung | Implementierung |
|----------|---------|--------------|-----------------|
| `/api/test` | POST | Haupteingangspunkt für Gateway-Nachrichten | `app.py` |
| `/api/process-message` | POST | Verarbeitet Nachrichten und registriert Geräte | `routes.py` |
| `/api/process` | POST | Verarbeitet und leitet Nachrichten an Template-Engine weiter | `message_processor.py` |

### Kunden-API

| Endpunkt | Methode | Beschreibung |
|----------|---------|--------------|
| `/api/customers` | GET | Liste aller Kunden |
| `/api/customers/<id>` | GET | Details zu einem Kunden |
| `/api/customers` | POST | Neuen Kunden erstellen |
| `/api/customers/<id>` | PUT | Kunden aktualisieren |
| `/api/customers/<id>` | DELETE | Kunden löschen |

### Gateway-API

| Endpunkt | Methode | Beschreibung |
|----------|---------|--------------|
| `/api/gateways` | GET | Liste aller Gateways (mit optionalem Filter `customer_id`) |
| `/api/gateways/unassigned` | GET | Liste aller nicht zugeordneten Gateways |
| `/api/gateways/<uuid>` | GET | Details zu einem Gateway |
| `/api/gateways` | POST | Neues Gateway erstellen |
| `/api/gateways/<uuid>` | PUT | Gateway aktualisieren |
| `/api/gateways/<uuid>` | DELETE | Gateway löschen |
| `/api/gateways/<uuid>/status` | PUT | Gateway-Status aktualisieren |

### Geräte-API

| Endpunkt | Methode | Beschreibung |
|----------|---------|--------------|
| `/api/devices` | GET | Liste aller Geräte (mit optionalem Filter `gateway_uuid`) |
| `/api/devices/<gateway_uuid>/<device_id>` | GET | Details zu einem Gerät |
| `/api/devices` | POST | Neues Gerät erstellen |
| `/api/devices/<gateway_uuid>/<device_id>` | PUT | Gerät aktualisieren |
| `/api/devices/<gateway_uuid>/<device_id>/status` | PUT | Gerätestatus aktualisieren |
| `/api/devices/<gateway_uuid>/<device_id>` | DELETE | Gerät löschen |

### Template-API

| Endpunkt | Methode | Beschreibung |
|----------|---------|--------------|
| `/api/templates` | GET | Liste aller verfügbaren Templates |
| `/api/reload-templates` | POST | Alle Templates neu laden |
| `/api/test-transform` | POST | Transformation mit einem Template testen |

### Queue-API

| Endpunkt | Methode | Beschreibung |
|----------|---------|--------------|
| `/api/queue/status` | GET | Status der Message Queue |
| `/api/queue/failed` | GET | Liste fehlgeschlagener Nachrichten |
| `/api/queue/retry/<message_id>` | POST | Fehlgeschlagene Nachricht erneut verarbeiten |
| `/api/queue/clear` | POST | Alle Queues leeren (nur für Entwicklung) |

### Auth-API

| Endpunkt | Methode | Beschreibung |
|----------|---------|--------------|
| `/api/auth/login` | POST | Benutzer anmelden |
| `/api/auth/verify` | POST | Token verifizieren |
| `/api/auth/users` | GET | Liste aller Benutzer |

## Datenmodelle

### Kunde (Customer)

```python
{
    "_id": ObjectId,
    "name": String,  # Pflichtfeld, eindeutig
    "contact_person": String,
    "email": String,
    "phone": String,
    "evalarm_username": String,
    "evalarm_password": String,
    "evalarm_namespace": String,
    "status": String,  # "active" oder "inactive"
    "immediate_forwarding": Boolean,
    "created_at": DateTime,
    "updated_at": DateTime
}
```

### Gateway

```python
{
    "_id": ObjectId,
    "uuid": String,  # Pflichtfeld, eindeutig
    "customer_id": ObjectId,  # Kann null sein (unzugeordnet)
    "name": String,
    "description": String,
    "template_id": String,
    "status": String,  # "online", "offline", "unknown", "maintenance"
    "last_contact": DateTime,
    "created_at": DateTime,
    "updated_at": DateTime
}
```

### Gerät (Device)

```python
{
    "_id": ObjectId,
    "gateway_uuid": String,  # Pflichtfeld
    "device_id": String,  # Pflichtfeld
    "device_type": String,
    "name": String,
    "description": String,
    "status": Object,  # JSON-Objekt mit Gerätestatus
    "last_update": DateTime,
    "created_at": DateTime,
    "updated_at": DateTime
}
```

## Nachrichtenformate

### Eingehende Gateway-Nachricht

```json
{
  "gateway": {
    "dbm": "-117",
    "uuid": "gw-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
  },
  "gateway_id": "gw-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "ts": 1234567890,
  "subdevicelist": [
    {
      "id": 1234567890123456,
      "value": {
        "alarmstatus": "alarm",
        "alarmtype": "panic",
        "currenttemperature": 22.5
      }
    }
  ]
}
```

## Wichtige Hinweise

1. **Gateway-ID-Erkennung**: Das System versucht, die Gateway-ID aus verschiedenen Feldern zu extrahieren:
   - `gateway.uuid`
   - `gateway_id`
   - `id`
   - `uuid`
   - `gatewayId`

2. **Routenreihenfolge**: Bei Flask/Blueprint ist die Reihenfolge der Routen wichtig. Spezifische Routen (z.B. `/gateways/unassigned`) müssen VOR generischen Routen mit Platzhaltern (z.B. `/gateways/<uuid>`) definiert werden.

3. **API-Server-Start**: Der Hauptserver wird mit `python3 api/app.py` gestartet und ist auf Port 8080 erreichbar.

4. **Message Processor**: Der Message Processor wird mit `python3 api/message_processor.py` gestartet und ist auf Port 8081 erreichbar.

5. **Auth Service**: Der Auth Service wird mit `python3 api/auth_service.py` gestartet und ist auf Port 8082 erreichbar.

## Deployment

Das System wird über einen GitHub-Webhook automatisch auf dem Server aktualisiert. Die Konfiguration ist in `/var/www/webhook` zu finden.

## Nginx-Konfiguration

Die Nginx-Konfiguration (`/etc/nginx/sites-enabled/iot-gateway`) leitet verschiedene Anfragen an die entsprechenden Services weiter. Wichtig ist die Reihenfolge der Locations:

1. Frontend-Dateien unter `/`
2. Spezifische API-Routen zuerst
3. Allgemeine API-Routen als Fallback 