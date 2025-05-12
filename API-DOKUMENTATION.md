# API-Dokumentation: evAlarm-IoT Gateway Management System

## Systemübersicht

Das System besteht aus mehreren Komponenten:

1. **API-Gateway** (Port 8000): Zentraler Einstiegspunkt für alle API-Anfragen
2. **API-Server** (Port 8080): Hauptschnittstelle für das Frontend, verwaltet Kunde, Gateways und Geräte
3. **Auth Service** (Port 8081): Verwaltet Benutzerauthentifizierung und -autorisierung
4. **Message Processor** (Port 8082): Verarbeitet eingehende Nachrichten und leitet sie weiter
5. **Frontend**: React-basierte Benutzeroberfläche

## Datenbanken

- **MongoDB**: Persistente Datenspeicherung für Kunden, Gateways, Geräte
- **Redis**: Message Queue und Caching

## API-Endpunkte

### API-Gateway

Alle API-Anfragen werden über das API-Gateway geleitet, das als zentraler Einstiegspunkt dient.

| Endpunkt | Methode | Beschreibung |
|----------|---------|--------------|
| `/api/v1/gateway/status` | GET | Status des API-Gateways und aller verbundenen Services |

Das API-Gateway leitet Anfragen basierend auf dem Pfad automatisch an den zuständigen Service weiter:
- `/api/v1/auth/*` → Auth Service (Port 8081)
- `/api/v1/gateways/*`, `/api/v1/customers/*`, `/api/v1/devices/*` → API Service (Port 8080)
- `/api/v1/messages/*`, `/api/v1/templates/*` → Worker Service (Port 8082)

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
| `/api/v1/customers` | GET | Liste aller Kunden |
| `/api/v1/customers/<id>` | GET | Details zu einem Kunden |
| `/api/v1/customers` | POST | Neuen Kunden erstellen |
| `/api/v1/customers/<id>` | PUT | Kunden aktualisieren |
| `/api/v1/customers/<id>` | DELETE | Kunden löschen |

### Gateway-API

| Endpunkt | Methode | Beschreibung |
|----------|---------|--------------|
| `/api/v1/gateways` | GET | Liste aller Gateways (mit optionalem Filter `customer_id`) |
| `/api/v1/gateways/unassigned` | GET | Liste aller nicht zugeordneten Gateways |
| `/api/v1/gateways/<uuid>` | GET | Details zu einem Gateway |
| `/api/v1/gateways` | POST | Neues Gateway erstellen |
| `/api/v1/gateways/<uuid>` | PUT | Gateway aktualisieren |
| `/api/v1/gateways/<uuid>` | DELETE | Gateway löschen |
| `/api/v1/gateways/<uuid>/status` | PUT | Gateway-Status aktualisieren |

### Geräte-API

| Endpunkt | Methode | Beschreibung |
|----------|---------|--------------|
| `/api/v1/devices` | GET | Liste aller Geräte (mit optionalem Filter `gateway_uuid`) |
| `/api/v1/devices/<gateway_uuid>/<device_id>` | GET | Details zu einem Gerät |
| `/api/v1/devices` | POST | Neues Gerät erstellen |
| `/api/v1/devices/<gateway_uuid>/<device_id>` | PUT | Gerät aktualisieren |
| `/api/v1/devices/<gateway_uuid>/<device_id>/status` | PUT | Gerätestatus aktualisieren |
| `/api/v1/devices/<gateway_uuid>/<device_id>` | DELETE | Gerät löschen |

### Template-API

| Endpunkt | Methode | Beschreibung |
|----------|---------|--------------|
| `/api/v1/templates` | GET | Liste aller verfügbaren Templates |
| `/api/v1/templates/reload` | POST | Alle Templates neu laden |
| `/api/v1/templates/test-transform` | POST | Transformation mit einem Template testen |

### Queue-API

| Endpunkt | Methode | Beschreibung |
|----------|---------|--------------|
| `/api/v1/messages/queue/status` | GET | Status der Message Queue |
| `/api/v1/messages/failed` | GET | Liste fehlgeschlagener Nachrichten |
| `/api/v1/messages/retry/<message_id>` | POST | Fehlgeschlagene Nachricht erneut verarbeiten |
| `/api/v1/messages/clear` | POST | Alle Queues leeren (nur für Entwicklung) |

### Auth-API

| Endpunkt | Methode | Beschreibung |
|----------|---------|--------------|
| `/api/v1/auth/login` | POST | Benutzer anmelden |
| `/api/v1/auth/verify` | POST | Token verifizieren |
| `/api/v1/auth/users` | GET | Liste aller Benutzer |

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

3. **API-Gateway**: Der zentrale Gateway-Service auf Port 8000 leitet alle Anfragen an die entsprechenden Dienste weiter und stellt eine einheitliche API-Schnittstelle bereit.

4. **API-Service**: Die wichtigsten Dienste laufen auf verschiedenen Ports:
   - API-Gateway: Port 8000 (zentraler Zugang)
   - API-Server: Port 8080
   - Auth Service: Port 8081
   - Message Processor: Port 8082

## Deployment

Das System kann über folgende Methoden bereitgestellt werden:

1. **Standard-Deployment**:
   ```bash
   ./start.sh  # Startet alle Services direkt
   ```

2. **Mit Nginx-Proxy**:
   ```bash
   USE_NGINX=1 ./start.sh  # Nutzt Nginx als Proxy
   ```

3. **Manuelle Nginx-Konfiguration**:
   ```bash
   cd deploy-scripts && ./generate_nginx_config.sh --server-name your-domain.com --restart
   ```

## Nginx-Konfiguration

Die empfohlene Nginx-Konfiguration leitet alle API-Anfragen an das API-Gateway weiter:

```nginx
# Alle API-Anfragen zum API-Gateway
location /api/ {
    proxy_pass http://localhost:8000/api/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}

# Frontend-Dateien
location / {
    root /var/www/iot-gateway/frontend/dist;
    try_files $uri $uri/ /index.html;
}
```

Alternativ können einzelne Services auch direkt angesprochen werden:

```nginx
# Auth-Service direkt ansprechen
location /api/v1/auth/ {
    proxy_pass http://localhost:8081/api/v1/auth/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
``` 