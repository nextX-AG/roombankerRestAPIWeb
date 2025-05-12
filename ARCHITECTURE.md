# evAlarm-IoT Gateway Architektur

## 1. Systemübersicht

Das evAlarm-IoT Gateway System besteht aus mehreren Komponenten, die zusammenarbeiten, um IoT-Gerätedaten zu empfangen, zu transformieren und an evAlarm-Systeme weiterzuleiten.

### Hauptkomponenten

- **Gateway**: Empfängt Nachrichten von IoT-Geräten und leitet sie an den Message Worker weiter
- **Message Worker**: Verarbeitet Nachrichten, transformiert sie und leitet sie weiter
- **Auth Service**: Verwaltet Authentifizierung und Autorisierung
- **API Service**: Stellt REST-APIs für Frontend und externe Systeme bereit
- **Template Engine**: Transformiert Nachrichten zwischen verschiedenen Formaten
- **Frontend**: Web-Interface zur Verwaltung des Systems

## 2. API-Struktur

### Einheitliches API-Design

Alle API-Endpunkte folgen dem einheitlichen Format:

```
/api/v1/<resource>/<action>
```

Beispiele:
- `/api/v1/messages/status` - Status von Nachrichten abrufen
- `/api/v1/templates/list` - Liste der Templates abrufen
- `/api/v1/auth/login` - Authentifizierung

### Response-Format

Alle API-Antworten verwenden ein konsistentes Format:

```json
{
  "status": "success|error",
  "data": { ... } | null,
  "error": { "message": "..." } | null
}
```

### Service-Endpunkte

#### Message Worker (Port 8083)
- `/api/v1/messages/status` - Status aller Nachrichten
- `/api/v1/messages/queue/status` - Status der Nachrichtenqueue
- `/api/v1/messages/forwarding` - Status der Weiterleitungen
- `/api/v1/messages/retry/<message_id>` - Erneuter Versuch einer fehlgeschlagenen Nachricht
- `/api/v1/health` - Gesundheitsstatus
- `/api/v1/iot-status` - Gesamtstatus des IoT-Systems
- `/api/v1/endpoints` - Liste verfügbarer Endpunkte
- `/api/v1/templates` - Liste verfügbarer Templates
- `/api/v1/templates/<template_id>` - Details zu einem Template
- `/api/v1/test-transform` - Test der Template-Transformation

#### Auth Service (Port 8081)
- `/api/v1/auth/login` - Benutzeranmeldung
- `/api/v1/auth/logout` - Benutzerabmeldung
- `/api/v1/auth/refresh` - Token-Aktualisierung
- `/api/v1/auth/status` - Aktueller Authentifizierungsstatus

#### API Service (Port 8080)
- `/api/v1/gateways` - Gateway-Verwaltung
- `/api/v1/customers` - Kundenverwaltung
- `/api/v1/devices` - Geräteverwaltung

#### Processor Service (Port 8082)
- `/api/v1/messages/process` - Verarbeitung und Weiterleitung von Nachrichten
- `/api/v1/messages/queue_status` - Status der Nachrichtenqueue
- `/api/v1/messages/failed` - Fehlgeschlagene Nachrichten
- `/api/v1/messages/retry/<message_id>` - Erneuter Versuch einer fehlgeschlagenen Nachricht
- `/api/v1/messages/clear` - Löschen aller Queues
- `/api/v1/system/health` - Gesundheitsstatus
- `/api/v1/system/endpoints` - Liste verfügbarer Endpunkte
- `/api/v1/system/logs` - Abruf von Systemlogs
- `/api/v1/templates/list` - Liste verfügbarer Templates
- `/api/v1/templates/reload` - Neuladen der Templates
- `/api/v1/templates/test` - Test der Template-Transformation

## 3. Komponenten-Interaktion

### Nachrichtenfluss

1. IoT-Gerät sendet Daten an Gateway
2. Gateway leitet Daten an Message Queue weiter
3. Message Worker holt Nachrichten aus der Queue
4. Template Engine transformiert Nachrichten ins Zielformat
5. Message Forwarder leitet transformierte Nachrichten weiter

### Authentifizierungsfluss

1. Benutzer sendet Anmeldedaten an Auth Service
2. Auth Service validiert Anmeldedaten und generiert JWT-Token
3. Client verwendet Token für authentifizierte API-Aufrufe
4. API-Endpunkte validieren Token bei jedem Aufruf

## 4. Datenmodell

### Schlüsselentitäten

- **Kunden**: Endnutzer des Systems mit eigenen Zugangsdaten
- **Gateways**: Verbinden IoT-Geräte mit dem System
- **Geräte**: Einzelne IoT-Geräte, die mit Gateways verbunden sind
- **Templates**: Transformationsvorlagen für Nachrichten
- **Nachrichten**: Daten, die von IoT-Geräten empfangen werden

## 5. Technologie-Stack

- **Backend**: Python mit Flask/FastAPI
- **Datenbanken**: MongoDB (persistente Daten), Redis (Caching, Message Queue)
- **Frontend**: React mit Bootstrap
- **Deployment**: PM2 für Prozessverwaltung, NGINX als Reverse-Proxy

## 6. API-Integration

### Backend-Integration

Die zentrale API-Konfiguration (`utils/api_config.py`) definiert alle Endpunkte konsistent über alle Services hinweg. Services können diese Konfiguration wie folgt nutzen:

```python
from utils.api_config import get_route

@app.route(get_route('messages', 'status'), methods=['GET'])
def get_message_status():
    # Implementierung
```

### Frontend-Integration

Das Frontend nutzt eine zentrale API-Client-Implementierung (`frontend/src/api.js`), die alle API-Aufrufe vereinheitlicht:

```javascript
import api from './api';

// Verwendung in Komponenten
async function loadGateways() {
  const response = await api.gateways.list();
  if (response.status === 'success') {
    setGateways(response.data);
  } else {
    setError(response.error.message);
  }
}
```

Vorteile:
- Einheitliches Error-Handling
- Zentrale Authentifizierung
- Konfigurierbare Basis-URLs für unterschiedliche Umgebungen
- Typsichere API-Aufrufe durch Intellisense

### Deployment-Integration

Die Anwendung bietet einen automatischen NGINX-Konfigurationsgenerator, der auf Basis der zentralen API-Konfiguration die Routing-Regeln erstellt:

```bash
# Generieren einer NGINX-Konfiguration
./deploy-scripts/generate_nginx_config.sh --server-name evaluapp.example.com --output /etc/nginx/sites-available/evaluapp

# Im Dry-Run-Modus (ohne Installation)
./deploy-scripts/generate_nginx_config.sh --server-name evaluapp.example.com --dry-run
```

Der Generator:
- Erstellt Upstream-Definitionen für jeden Service
- Generiert Location-Blöcke für alle API-Endpunkte
- Leitet Requests automatisch an den jeweils zuständigen Service weiter
- Fügt Best-Practice-Konfigurationen für Sicherheit und Performance hinzu

Diese automatische Konfiguration vereinfacht Deployments und verhindert Inkonsistenzen zwischen den Services.

## 7. Zukünftige Architektur (geplant)

Die zukünftige Architektur sieht folgende Verbesserungen vor:

### API-Gateway-Pattern

- Zentraler API-Gateway-Dienst, der alle Anfragen verarbeitet
- Dynamische Route-Weiterleitung zu spezifischen Service-Funktionen
- Einheitliche Fehlerbehandlung und Logging

### Migration zu FastAPI

- Automatische Swagger/OpenAPI-Dokumentation
- Typ-Validierung mit Pydantic
- Asynchrone Verarbeitung für bessere Performance

### Zentrale Konfigurationsverwaltung

- Umgebungsvariablen einheitlich verwalten
- Konfigurationsdateien pro Umgebung (Entwicklung, Produktion)
- Sichere Speicherung von Geheimnissen 