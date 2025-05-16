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

### Template-API

| Endpunkt | Methode | Beschreibung |
|----------|---------|--------------|
| `/api/v1/templates` | GET | Liste aller verfügbaren Templates |
| `/api/v1/templates/reload` | POST | Alle Templates neu laden |
| `/api/v1/templates/test-transform` | POST | Transformation mit einem Template testen |

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
| `logsApi.getSystemLogs()` | `/api/v1/logs/system` | System-Logs abrufen |
| `logsApi.getProcessorLogs()` | `/api/v1/logs/processor` | Processor-Logs abrufen |
| `logsApi.getGatewayLogs()` | `/api/v1/logs/gateway` | Gateway-Logs abrufen |

### Häufige Fehlerquellen bei der API-Integration

1. **Direkte Axios-Aufrufe:** Verwenden Sie niemals direkte `axios.get()` oder `fetch()` Aufrufe, sondern immer den zentralen API-Client
2. **Inkonsistente URL-Pfade:** Stellen Sie sicher, dass alle Pfade mit `/api/v1/` beginnen
3. **Fehlende Error-Handling:** Behandeln Sie stets alle möglichen Fehlerfälle
4. **Unvollständige Response-Verarbeitung:** Überprüfen Sie immer das `status`-Feld und extrahieren Sie Daten aus dem `data`-Feld
5. **Simultane API-Aufrufe ohne Promise.all:** Bei mehreren Anfragen verwenden Sie `Promise.all` für bessere Performance 