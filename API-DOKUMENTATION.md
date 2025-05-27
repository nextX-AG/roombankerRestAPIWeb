# API-Dokumentation: evAlarm-IoT Gateway Management System

## Systemübersicht

Das System besteht aus mehreren Komponenten:

1. **API-Gateway** (Port 8000): Zentraler Einstiegspunkt für alle API-Anfragen
2. **API-Server** (Port 8080): Hauptschnittstelle für das Frontend, verwaltet Kunde, Gateways und Geräte
3. **Auth Service** (Port 8081): Verwaltet Benutzerauthentifizierung und -autorisierung
4. **Message Processor** (Port 8082): Verarbeitet eingehende Nachrichten und leitet sie weiter, beinhaltet auch Worker-Funktionalität
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
- `/api/v1/messages/*`, `/api/v1/templates/*`, `/api/v1/system/*` → Processor Service (Port 8082)

In der Docker-Umgebung geschieht die Weiterleitung über die Container-Namen:
- `http://auth:8081` für Auth Service
- `http://api:8080` für API Service
- `http://processor:8082` für Processor Service

Die Umgebungsvariable `FLASK_ENV=docker` wird verwendet, um diese Container-basierte Kommunikation zu aktivieren.

### Gateway-Nachrichteneingang

Eingehende Nachrichten von IoT-Gateways können über verschiedene Wege ins System gelangen:

| Endpunkt | Methode | Beschreibung | Implementierung |
|----------|---------|--------------|-----------------|
| `/api/v1/messages/process` | POST | **Aktiver Hauptendpunkt** für Gateway-Nachrichten, der Gateway-Registrierung, Geräteerkennung und Weiterleitung kombiniert | `processor_service.py` |
| `/api/test` | POST | Legacy-Eingangspunkt für Gateway-Nachrichten | `app.py` |
| `/api/process-message` | POST | Legacy-Endpunkt: Verarbeitet Nachrichten und registriert Geräte | `routes.py` |
| `/api/process` | POST | Legacy-Endpunkt: Verarbeitet und leitet Nachrichten an Template-Engine weiter | `message_processor.py` |

**Hinweis**: Der Endpunkt `/api/v1/messages/process` ist der einzige aktive und korrekt funktionierende Endpunkt und sollte für alle Gateway-Kommunikation verwendet werden. Die anderen Endpunkte werden aus Gründen der Abwärtskompatibilität beibehalten, bieten jedoch nicht die gleiche Funktionalität.

### Nachrichtenformat für `/api/v1/messages/process`

Der Gateway-Endpunkt unterstützt verschiedene Nachrichtenformate:

```json
{
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

Alternative Gateway-ID-Formate werden ebenfalls unterstützt:
- `gateway.uuid`
- `gateway_uuid`
- `gatewayId`
- `uuid`
- `id`

### Funktionsweise des `/api/v1/messages/process`-Endpunkts

1. **Gateway-Erkennung**: Extrahiert die Gateway-ID aus der Nachricht
2. **Gateway-Registrierung**: Registriert das Gateway oder aktualisiert seinen Status
3. **Geräteregistrierung**: Erkennt und registriert Geräte aus der `subdevicelist` oder bei Panic-Button-Nachrichten aus dem `subdeviceid`-Feld
4. **Sicherheitsprüfung**: Überprüft, ob das Gateway einem Kunden zugeordnet ist
5. **Nachrichtenweiterleitung**: Leitet die Nachricht nur bei zugeordneten Gateways an evAlarm weiter

### Antwortformat für `/api/v1/messages/process`

Erfolgreiche Antwort mit registrierten Geräten und Weiterleitung:
```json
{
  "status": "success",
  "data": {
    "message_id": 1234567890123,
    "gateway_id": "gw-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "devices": [
      {
        "device_id": "1234567890123456",
        "device_type": "panic_button",
        "status": {
          "alarmstatus": "alarm",
          "alarmtype": "panic"
        }
      }
    ],
    "template": "evalarm_panic",
    "status": "queued"
  }
}
```

Erfolgreiche Antwort ohne Weiterleitung (Gateway keinem Kunden zugeordnet):
```json
{
  "status": "success",
  "data": {
    "gateway_id": "gw-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "devices": [
      {
        "device_id": "1234567890123456",
        "device_type": "panic_button",
        "status": {
          "alarmstatus": "alarm",
          "alarmtype": "panic"
        }
      }
    ],
    "message": "Gateway und Geräte aktualisiert, Nachricht wird nicht weitergeleitet (Gateway keinem Kunden zugeordnet)"
  }
}
```

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

### Device Registry API (NEU - 27.01.2025)

| Endpunkt | Methode | Beschreibung |
|----------|---------|--------------|
| `/api/v1/devices/registry` | GET | Komplette Device Registry mit allen Gerätetypen und Message Codes |
| `/api/v1/devices/registry/<device_type>` | GET | Details zu einem spezifischen Gerätetyp |
| `/api/v1/devices/registry` | POST | Neuen benutzerdefinierten Gerätetyp hinzufügen |
| `/api/v1/devices/registry/<device_type>` | PUT | Benutzerdefinierten Gerätetyp aktualisieren |
| `/api/v1/devices/registry/validate` | POST | Nachricht gegen einen Gerätetyp validieren |

#### Device Registry Response-Format

```json
GET /api/v1/devices/registry
{
  "status": "success",
  "data": {
    "device_types": {
      "panic_button": {
        "name": "Panic Button",
        "description": "Notfall-Taster für Alarmsituationen",
        "codes": [2030],
        "identifying_fields": ["alarmtype", "alarmstatus"],
        "required_fields": ["alarmtype", "alarmstatus"],
        "optional_fields": ["batterystatus", "onlinestatus"],
        "value_mappings": {
          "alarmtype": ["panic", "none"],
          "alarmstatus": ["alarm", "normal"]
        },
        "mqtt_topics": ["alarm/panic", "device/status/panic_button"],
        "default_template": "evalarm_panic",
        "icon": "alert-triangle"
      }
      // ... weitere Gerätetypen
    },
    "message_codes": {
      "2001": {
        "name": "Environmental Status",
        "description": "Reguläre Statusnachricht von Umgebungssensoren",
        "typical_devices": ["temperature_humidity_sensor"]
      },
      "2030": {
        "name": "Panic Alarm",
        "description": "Notfall-Alarm von Panic Button",
        "typical_devices": ["panic_button"],
        "priority": "critical"
      }
      // ... weitere Message Codes
    }
  }
}
```

### Template-API

| Endpunkt | Methode | Beschreibung |
|----------|---------|--------------|
| `/api/v1/templates` | GET | Liste aller verfügbaren Templates |
| `/api/v1/templates/<id>` | GET | Details zu einem spezifischen Template |
| `/api/v1/templates` | POST | Neues Template erstellen |
| `/api/v1/templates/<id>` | PUT | Template aktualisieren |
| `/api/v1/templates/<id>` | DELETE | Template löschen |
| `/api/v1/templates/<id>/test` | POST | Template mit Beispieldaten testen |
| `/api/v1/templates/test-code` | POST | Template-Code ohne Speichern testen |
| `/api/v1/templates/generate` | POST | Template aus normalisierten Daten generieren |
| `/api/v1/templates/filter-rules` | GET | Liste aller verfügbaren Filterregeln |
| `/api/v1/templates/reload` | POST | Alle Templates neu laden |
| `/api/v1/templates/test-transform` | POST | Transformation mit einem Template testen |

### Template-Gruppen-API

| Endpunkt | Methode | Beschreibung |
|----------|---------|--------------|
| `/api/v1/template-groups` | GET | Liste aller Template-Gruppen |
| `/api/v1/template-groups/<id>` | GET | Details zu einer Template-Gruppe |
| `/api/v1/template-groups` | POST | Neue Template-Gruppe erstellen |
| `/api/v1/template-groups/<id>` | PUT | Template-Gruppe aktualisieren |
| `/api/v1/template-groups/<id>` | DELETE | Template-Gruppe löschen |

### Template-Lernsystem-API

| Endpunkt | Methode | Beschreibung |
|----------|---------|--------------|
| `/api/v1/learning` | GET | Liste aller aktiven Lernsessions |
| `/api/v1/learning/start` | POST | Startet eine neue Lernsession für ein Gateway |
| `/api/v1/learning/stop/<gateway_id>` | POST | Stoppt eine laufende Lernsession |
| `/api/v1/learning/status/<gateway_id>` | GET | Zeigt den Status einer Lernsession |
| `/api/v1/learning/patterns/<gateway_id>` | GET | Zeigt erkannte Nachrichtenmuster |
| `/api/v1/learning/generate-templates/<gateway_id>` | POST | Generiert Templates aus Lerndaten |

#### Lernsystem-Workflow

1. **Lernsession starten**:
   ```json
   POST /api/v1/learning/start
   {
     "gateway_id": "gw-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
     "duration_hours": 48  // Standard: 48 Stunden
   }
   ```

2. **Status abfragen**:
   ```json
   GET /api/v1/learning/status/gw-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   {
     "status": "success",
     "data": {
       "gateway_id": "gw-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
       "status": "learning",
       "start_time": "2025-05-26T20:19:19.524000",
       "end_time": "2025-05-28T20:19:19.524000",
       "message_count": 21,
       "patterns": [],
       "devices": ["444444", "555555", "777777"]
     }
   }
   ```

3. **Muster analysieren** (nach Abschluss):
   ```json
   GET /api/v1/learning/patterns/gw-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   {
     "status": "success",
     "data": {
       "patterns": [
         {
           "pattern_id": "panic_alarm",
           "type": "alarm",
           "count": 4,
           "percentage": 20,
           "common_fields": {
             "alarmtype": "panic",
             "alarmstatus": "alarm"
           }
         },
         {
           "pattern_id": "normal_status",
           "type": "status",
           "count": 16,
           "percentage": 80,
           "common_fields": {
             "alarmstatus": "normal",
             "batterystatus": "ok"
           }
         }
       ]
     }
   }
   ```

4. **Templates generieren**:
   ```json
   POST /api/v1/learning/generate-templates/gw-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   {
     "create_group": true,
     "group_name": "Mein Panic-System"
   }
   ```

Das Lernsystem sammelt automatisch alle Nachrichten eines Gateways über den konfigurierten Zeitraum, analysiert Muster und kann daraus automatisch passende Templates generieren.

### Gateway-Forwarding-Kontrolle

Das Gateway-Modell unterstützt jetzt die Kontrolle der Nachrichtenweiterleitung:

#### Gateway-Felder für Forwarding

```json
{
  "uuid": "gw-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "forwarding_enabled": true,  // Ob Nachrichten weitergeleitet werden
  "forwarding_mode": "production"  // production, test, learning
}
```

#### Forwarding-Modi

- **production**: Normale Weiterleitung an evAlarm
- **test**: Nachrichten werden NICHT weitergeleitet
- **learning**: Automatisch im Lernmodus, keine Weiterleitung

#### Nachrichten-Blockierung

Nachrichten werden in folgenden Fällen blockiert:
1. Gateway ist keinem Kunden zugeordnet
2. `forwarding_enabled` ist `false`
3. `forwarding_mode` ist nicht `production`
4. Globale Umgebungsvariable `EVALARM_TEST_MODE=true`

Blockierte Nachrichten werden in `/data/blocked_messages/` gespeichert.

#### UI-Integration

Die Forwarding-Kontrolle ist vollständig in die Benutzeroberfläche integriert:

1. **Gateway-Detail-Drawer**:
   - Anzeige des aktuellen Weiterleitungsstatus im Info-Tab
   - Visuelle Badges für Status (Aktiviert/Blockiert) und Modus (Produktion/Test/Lernmodus)
   - Hinweistexte bei eingeschränkter Weiterleitung

2. **Gateway-Bearbeitung**:
   - Toggle-Switch zum Aktivieren/Deaktivieren der Weiterleitung
   - Dropdown-Auswahl für den Weiterleitungsmodus
   - Hilftexte zur Erklärung der verschiedenen Modi

3. **Gateway-Übersicht**:
   - Status-Icons zeigen den aktuellen Weiterleitungsmodus
   - Farbkodierung für schnelle visuelle Erkennung

### Logs-API (NEU)

| Endpunkt | Methode | Beschreibung |
|----------|---------|--------------|
| `/api/v1/logs/system` | GET | Aggregierte System-Logs aller Komponenten |
| `/api/v1/logs/processor` | GET | Logs des Message Processors |
| `/api/v1/logs/gateway` | GET | Logs des API-Gateways und NGINX |
| `/api/v1/logs/api` | GET | Logs des API-Servers |
| `/api/v1/logs/auth` | GET | Logs des Auth-Services |
| `/api/v1/logs/database` | GET | Logs der Datenbank-Operationen (MongoDB, Redis) |

Alle Log-Endpunkte unterstützen folgende Query-Parameter:
- `limit`: Maximale Anzahl an Log-Einträgen (default: 100)
- `level`: Log-Level Filter (error, warning, info, debug, all)
- `from_time`: ISO 8601 Zeitstempel für Beginn des Zeitfensters
- `to_time`: ISO 8601 Zeitstempel für Ende des Zeitfensters
- `search`: Volltextsuche in Log-Nachrichten

### Debugging-API (NEU)

| Endpunkt | Methode | Beschreibung |
|----------|---------|--------------|
| `/api/v1/messages/debug` | POST | Debugging von Nachrichten durch die gesamte Verarbeitungspipeline |

Dieser Endpunkt zeigt detaillierte Informationen für jeden Schritt der Nachrichtenverarbeitung:
1. Extraktion der Gateway-ID und Rohdaten
2. Normalisierung der Nachricht in ein einheitliches Format
3. Filterung basierend auf konfigurierten Regeln
4. Transformation mit dem ausgewählten Template
5. Simulierte Weiterleitung an das Zielsystem

Antwortformat für `/api/v1/messages/debug`:
```json
{
  "status": "success",
  "data": {
    "gateway_id": "gw-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "extraction_result": { ... },
    "normalized_message": { ... },
    "filter_result": {
      "should_forward": true,
      "matching_rules": [ ... ],
      "all_rules": [ ... ]
    },
    "template_name": "evalarm_panic_v2",
    "transformed_message": { ... },
    "forwarding_result": {
      "success": true,
      "endpoint": "evalarm",
      "response_status": 200,
      "response_data": { ... }
    }
  }
}
```

### Queue-API (im Processor)

| Endpunkt | Methode | Beschreibung |
|----------|---------|--------------|
| `/api/v1/messages/queue/status` | GET | Status der Message Queue |
| `/api/v1/messages/failed` | GET | Liste fehlgeschlagener Nachrichten |
| `/api/v1/messages/retry/<message_id>` | POST | Fehlgeschlagene Nachricht erneut verarbeiten |
| `/api/v1/messages/clear` | POST | Alle Queues leeren (nur für Entwicklung) |

**Hinweis**: Der ursprünglich separate Worker-Service wurde in den Message Processor integriert. Beide Funktionen laufen jetzt im selben Container auf Port 8082. Das API-Gateway verweist auf einen nicht existierenden Worker-Service in seiner Status-Ausgabe, was jedoch für die Funktionalität des Systems nicht kritisch ist.

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
    "template_id": String,  # Legacy: Einzelnes Template (wird beibehalten für Rückwärtskompatibilität)
    "template_group_id": String,  # NEU: ID der Template-Gruppe für intelligente Template-Auswahl
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

### Template-Gruppe (TemplateGroup)

```python
{
    "_id": ObjectId,
    "name": String,  # Pflichtfeld, z.B. "Roombanker Panic System"
    "description": String,
    "templates": [  # Liste von Templates mit Prioritäten
        {
            "template_id": String,
            "template_name": String,  # Für Anzeige im UI
            "priority": Number  # Höhere Zahlen = höhere Priorität
        }
    ],
    "usage_count": Number,  # Anzahl der Gateways, die diese Gruppe verwenden
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

### Panic-Button Nachrichtenformat

```json
{
  "gateway_id": "gw-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "message": {
    "code": 2030,
    "subdeviceid": 1234567890123456,
    "alarmstatus": "alarm",
    "alarmtype": "panic",
    "ts": 1234567890
  }
}
```

## Nachrichtenverarbeitungs-Pipeline (NEU)

Die Nachrichtenverarbeitung folgt einer klaren Pipeline-Architektur:

```
Nachricht → Extraktion → Normalisierung → Filterung → Transformation → Weiterleitung
```

### 1. Extraktion
- Empfang der Nachrichten im Rohformat von verschiedenen Gateway-Typen
- Identifikation des Gateway und Bestimmung des Nachrichtentyps
- Extraktion von Gateway-ID und grundlegenden Metadaten

### 2. Normalisierung
- Konvertierung der Rohdaten in ein standardisiertes internes Format
- Extrahieren aller Gerätedaten, unabhängig vom ursprünglichen Format
- Typenkonvertierung und Validierung von Werten

Normalisiertes Datenmodell:
```json
{
  "gateway": {
    "id": "gw-c490b022-cc18-407e-a07e-a355747a8fdd",
    "type": "roombanker_gateway",
    "metadata": {
      "dbm": "-117",
      "last_seen": "2025-05-15T21:52:32.675Z"
    }
  },
  "devices": [
    {
      "id": "673922542395461",
      "type": "panic_button",
      "values": {
        "alarmstatus": "alarm",
        "alarmtype": "panic",
        "batterystatus": "connected"
      },
      "last_seen": "2025-05-15T21:52:32.675Z"
    }
  ],
  "raw_message": { ... },
  "metadata": {
    "received_at": "2025-05-15T21:52:32.675Z",
    "source_ip": "192.168.1.100",
    "format_type": "roombanker_subdevicelist"
  }
}
```

### 3. Filterung
- Anwendung konfigurierbarer Filterregeln auf normalisierte Daten
- Entscheidung, ob Nachrichten weitergeleitet werden sollen
- Regelbasierte Filterung nach Werten, Bereichen, Textmustern oder komplexen Bedingungen

### 4. Transformation
- Anwendung von Templates auf die normalisierten Daten
- Umwandlung in das Zielformat (z.B. evAlarm-Format)
- Zugriff auf alle normalisierten Daten im Template

### 5. Weiterleitung
- Authentifizierung mit dem Zielsystem (z.B. evAlarm-API)
- Protokollierung des Weiterleitungserfolgs
- Umgang mit Fehlern und Wiederholungsversuchen

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

5. **Datenbankmigration**: Das System ist von JSON-Konfigurationsdateien zu einer vollständigen Datenbanknutzung migriert worden. Die customer_config.json wird nicht mehr verwendet, alle Gateway-Kundenzuordnungen werden jetzt ausschließlich in der MongoDB gespeichert.

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

4. **Docker-Deployment (empfohlen)**:
   ```bash
   # System starten
   docker-compose up -d
   
   # Status prüfen
   docker-compose ps
   
   # Logs anzeigen
   docker-compose logs -f
   
   # System stoppen
   docker-compose down
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

## Docker-Architektur

Das System verwendet Docker-Container für eine vereinfachte Bereitstellung und bessere Isolierung der Komponenten.

### Container-Struktur

| Container | Port | Beschreibung |
|-----------|------|--------------|
| gateway | 8000 | API-Gateway - zentraler Einstiegspunkt für alle API-Anfragen |
| api | 8080 | API-Service - verwaltet Kunden, Gateways und Geräte |
| auth | 8081 | Auth-Service - Authentifizierung und Autorisierung |
| processor | 8082 | Message Processor - verarbeitet und leitet Nachrichten weiter |
| frontend | 80 | Frontend-Anwendung mit Node.js |
| redis | 6380:6379 | Redis für Message Queue und Caching |
| mongo | 27017 | MongoDB für persistente Datenspeicherung |

### Container-Kommunikation

Im Docker-Netzwerk kommunizieren die Services direkt miteinander über ihre Container-Namen:
- `http://api:8080`
- `http://auth:8081`
- `http://processor:8082`
- `http://redis:6379`
- `http://mongo:27017`

Diese Container-basierte Kommunikation wird über eine spezielle Umgebungsvariable `FLASK_ENV=docker` aktiviert, die das System anweist, die Container-Namen statt `localhost` zu verwenden.

### Docker-spezifische Konfiguration

Die `.env`-Datei kann für die Anpassung der Docker-Umgebung verwendet werden:

```
# Umgebung
FLASK_ENV=docker

# Ports für die Dienste
GATEWAY_PORT=8000
API_PORT=8080
AUTH_PORT=8081
PROCESSOR_PORT=8082

# MongoDB Konfiguration
MONGODB_URI=mongodb://mongo:27017/
MONGODB_DB=evalarm_gateway

# Redis Konfiguration
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=
REDIS_PREFIX=iot_gateway
```

### Vorteile des Docker-Deployments

1. **Vereinfachte Einrichtung**: Alle Abhängigkeiten sind in den Containern enthalten
2. **Konsistente Umgebungen**: Identisches Verhalten in Entwicklung und Produktion
3. **Isolierte Komponenten**: Vermeidung von Konflikten zwischen Diensten
4. **Einfache Skalierung**: Einzelne Komponenten können bei Bedarf skaliert werden
5. **Effiziente Ressourcennutzung**: Bessere Kontrolle über die Ressourcenzuweisung
6. **Verbesserte Sicherheit**: Jeder Dienst läuft in einer isolierten Umgebung 

## Frontend-Integration und Datensynchronisation

Für eine optimale Integration des Frontends mit den API-Endpunkten sind folgende Praktiken zu beachten:

### Zentrale API-Client-Nutzung

Das Frontend verwendet einen zentralen API-Client in `frontend/src/api.js`, der alle API-Aufrufe vereinheitlicht:

```javascript
// Import des zentralen API-Clients
import { gatewayApi, customerApi, templateApi, messageApi, systemApi, logsApi } from '../api';

// Beispiel für API-Aufrufe in einer Komponente
async function loadDashboardData() {
  const healthResponse = await systemApi.health();
  const templatesResponse = await templateApi.list();
  const messagesResponse = await messageApi.list();
  const logsResponse = await logsApi.getSystemLogs({ limit: 50, level: 'error' });
  
  // Verarbeitung der Antworten
  if (healthResponse.status === 'success') {
    setSystemStatus('online');
  }
}
```

### Best Practices für Datensynchronisation

1. **Parallele API-Aufrufe:** Verwenden Sie `Promise.all` für das gleichzeitige Laden mehrerer Datenquellen:

   ```javascript
   async function loadAllData() {
     try {
       setLoading(true);
       await Promise.all([
         checkApiStatus(),
         fetchTemplates(),
         fetchMessages()
       ]);
     } catch (error) {
       handleError(error);
     } finally {
       setLoading(false);
     }
   }
   ```

2. **Regelmäßige Aktualisierung:** Implementieren Sie Polling für zeitkritische Daten:

   ```javascript
   useEffect(() => {
     // Initial laden
     loadData();
     
     // Polling-Intervall einrichten
     const interval = setInterval(() => {
       loadData();
     }, 10000); // alle 10 Sekunden
     
     // Cleanup beim Unmounten
     return () => clearInterval(interval);
   }, []);
   ```

3. **Manuelle Aktualisierung:** Bieten Sie Refresh-Buttons für benutzergesteuerte Aktualisierungen:

   ```jsx
   <Button 
     variant="secondary"
     onClick={handleRefresh}
     disabled={loading}
   >
     <FontAwesomeIcon icon={faSync} />
     {loading ? 'Wird aktualisiert...' : 'Aktualisieren'}
   </Button>
   ```

4. **Loading-States:** Zeigen Sie den Ladezustand an, um das Benutzererlebnis zu verbessern:

   ```jsx
   {loading ? (
     <div className="text-center p-5">Daten werden geladen...</div>
   ) : (
     <DataDisplay data={data} />
   )}
   ```

5. **Einheitliche Fehlerbehandlung:** Verwenden Sie ein konsistentes Fehlerbehandlungsmuster:

   ```javascript
   try {
     const response = await api.someAction();
     if (response.status === 'success') {
       // Erfolgsfall behandeln
     } else {
       throw new Error(response.error?.message || 'Ein Fehler ist aufgetreten');
     }
   } catch (error) {
     console.error('API-Fehler:', error);
     setError(error.message);
   }
   ```

### API-Endpunkt-Verzeichnis

Alle Frontend-Komponenten sollten ausschließlich die folgenden API-Endpunkte verwenden:

| API-Client | Endpunkt | Beschreibung |
|------------|----------|--------------|
| `systemApi.health()` | `/api/v1/health` | System-Health-Check |
| `systemApi.endpoints()` | `/api/v1/system/endpoints` | Verfügbare API-Endpunkte |
| `systemApi.testMessage()` | `/api/v1/system/test-message` | Testnachricht senden |
| `templateApi.list()` | `/api/v1/templates` | Liste aller Templates |
| `messageApi.list()` | `/api/v1/list-messages` | Liste aller Nachrichten |
| `messageApi.debugMessage()` | `/api/v1/messages/debug` | Nachricht durch Pipeline debuggen |
| `gatewayApi.list()` | `/api/v1/gateways` | Liste aller Gateways |
| `gatewayApi.latest(uuid)` | `/api/v1/gateways/{uuid}/latest` | Neueste Telemetriedaten eines Gateways |
| `gatewayApi.unassigned()` | `/api/v1/gateways/unassigned` | Liste nicht zugeordneter Gateways |
| `customerApi.list()` | `/api/v1/customers` | Liste aller Kunden |
| `deviceApi.getRegistry()` | `/api/v1/devices/registry` | Device Registry abrufen |
| `deviceApi.getDeviceType(type)` | `/api/v1/devices/registry/{type}` | Spezifischen Gerätetyp abrufen |
| `deviceApi.validateMessage()` | `/api/v1/devices/registry/validate` | Nachricht validieren |
| `logsApi.getSystemLogs()` | `/api/v1/logs/system` | System-Logs abrufen |
| `logsApi.getProcessorLogs()` | `/api/v1/logs/processor` | Processor-Logs abrufen |
| `logsApi.getGatewayLogs()` | `/api/v1/logs/gateway` | Gateway-Logs abrufen | 

## Flow-API (NEU)

### Flow-Verwaltung

#### Alle Flows abrufen
```
GET /api/v1/flows
```

Antwort:
```json
{
  "status": "success",
  "data": [
    {
      "id": "60a5e2e4b3f6a2001c4d5e7f",
      "name": "panic_alarm_flow",
      "description": "Flow für Panic-Button-Alarme",
      "flow_type": "device_flow",
      "version": "1.0.0",
      "steps": [
        {
          "type": "filter",
          "config": {
            "rules": ["panic_alarm_rule"]
          }
        },
        {
          "type": "transform",
          "config": {
            "template": "evalarm_panic_v2"
          }
        },
        {
          "type": "forward",
          "config": {
            "targets": [{"type": "evalarm"}]
          }
        }
      ],
      "error_handling": {
        "retry_count": 3,
        "retry_delay": 1000,
        "fallback_flow_id": null
      },
      "created_at": "2023-05-15T10:00:00.000Z",
      "updated_at": "2023-05-15T10:00:00.000Z"
    }
  ]
}
```

#### Flow erstellen
```
POST /api/v1/flows
```

Body:
```json
{
  "name": "temperature_alert_flow",
  "description": "Flow für Temperatur-Alarme",
  "flow_type": "device_flow",
  "version": "1.0.0",
  "steps": [
    {
      "type": "filter",
      "config": {
        "rules": [
          {
            "field": "devices[0].values.temperature",
            "operator": "greater_than",
            "value": 30
          }
        ]
      }
    },
    {
      "type": "transform",
      "config": {
        "template": "evalarm_temperature_alert"
      }
    },
    {
      "type": "forward",
      "config": {
        "targets": [
          {"type": "evalarm", "endpoint": "alert"},
          {"type": "log", "level": "warning"}
        ]
      }
    }
  ]
}
```

#### Flow aktualisieren
```
PUT /api/v1/flows/<flow_id>
```

#### Flow löschen
```
DELETE /api/v1/flows/<flow_id>
```

### Flow-Gruppen-Verwaltung

#### Alle Flow-Gruppen abrufen
```
GET /api/v1/flow-groups
```

Antwort:
```json
{
  "status": "success",
  "data": [
    {
      "id": "60a5e2e4b3f6a2001c4d5e80",
      "name": "Panic Button Device Flows",
      "description": "Flows für Panic-Button-Geräte",
      "group_type": "device_flows",
      "flows": [
        {
          "flow_id": "60a5e2e4b3f6a2001c4d5e7f",
          "flow_name": "Panic Alarm",
          "priority": 100
        },
        {
          "flow_id": "60a5e2e4b3f6a2001c4d5e81",
          "flow_name": "Battery Warning",
          "priority": 90
        }
      ],
      "usage_count": 25,
      "created_at": "2023-05-15T10:00:00.000Z",
      "updated_at": "2023-05-15T10:00:00.000Z"
    }
  ]
}
```

#### Flow-Gruppe erstellen
```
POST /api/v1/flow-groups
```

Body:
```json
{
  "name": "Temperature Sensor Flows",
  "description": "Flows für Temperatur-Sensoren",
  "group_type": "device_flows",
  "flows": [
    {
      "flow_id": "60a5e2e4b3f6a2001c4d5e82",
      "flow_name": "High Temperature Alert",
      "priority": 100
    },
    {
      "flow_id": "60a5e2e4b3f6a2001c4d5e83",
      "flow_name": "Normal Status Update",
      "priority": 10
    }
  ]
}
```

#### Flow zu Gruppe hinzufügen
```
POST /api/v1/flow-groups/<group_id>/flows
```

Body:
```json
{
  "flow_id": "60a5e2e4b3f6a2001c4d5e84",
  "flow_name": "Low Temperature Alert",
  "priority": 90
}
```

#### Flow aus Gruppe entfernen
```
DELETE /api/v1/flow-groups/<group_id>/flows/<flow_id>
```

### Gateway-Flow-Zuordnung

#### Gateway-Flow zuweisen
```
PUT /api/v1/gateways/<gateway_uuid>/flow
```

Body:
```json
{
  "flow_id": "60a5e2e4b3f6a2001c4d5e85",
  "flow_group_id": null
}
```

oder für Flow-Gruppe:
```json
{
  "flow_id": null,
  "flow_group_id": "60a5e2e4b3f6a2001c4d5e86"
}
```

### Device-Flow-Zuordnung

#### Device-Flow zuweisen
```
PUT /api/v1/devices/<gateway_uuid>/<device_id>/flow
```

Body:
```json
{
  "flow_id": null,
  "flow_group_id": "60a5e2e4b3f6a2001c4d5e80"
}
```

### Flow-Test

#### Flow testen
```
POST /api/v1/flows/<flow_id>/test
```

Body:
```json
{
  "test_message": {
    "gateway": {
      "id": "gw-test-123",
      "type": "roombanker_gateway"
    },
    "devices": [
      {
        "id": "12345",
        "type": "panic_button",
        "values": {
          "alarmtype": "panic",
          "alarmstatus": "alarm"
        }
      }
    ]
  }
}
```

Antwort:
```json
{
  "status": "success",
  "data": {
    "flow_result": "success",
    "steps_executed": [
      {
        "step": 1,
        "type": "filter",
        "result": "passed"
      },
      {
        "step": 2,
        "type": "transform",
        "result": "success",
        "output": {
          "events": [
            {
              "message": "Panic Alarm",
              "device_id": "12345"
            }
          ]
        }
      },
      {
        "step": 3,
        "type": "forward",
        "result": "simulated",
        "targets": ["evalarm"]
      }
    ],
    "execution_time_ms": 45
  }
}
```

### Template-zu-Flow-Migration

#### Template zu Flow migrieren
```
POST /api/v1/templates/<template_id>/migrate-to-flow
```

Antwort:
```json
{
  "status": "success",
  "data": {
    "flow_id": "60a5e2e4b3f6a2001c4d5e87",
    "flow_name": "evalarm_panic_flow",
    "message": "Template erfolgreich zu Flow migriert"
  }
}
```

#### Template-Gruppe zu Flow-Gruppe migrieren
```
POST /api/v1/template-groups/<group_id>/migrate-to-flow-group
```

## Device Registry API 