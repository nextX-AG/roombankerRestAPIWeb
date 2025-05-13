# evAlarm-IoT Gateway Architektur

## 1. Systemübersicht

Das evAlarm-IoT Gateway System besteht aus mehreren Komponenten, die zusammenarbeiten, um IoT-Gerätedaten zu empfangen, zu transformieren und an evAlarm-Systeme weiterzuleiten.

### Hauptkomponenten

- **API-Gateway**: Empfängt alle API-Anfragen und leitet sie an die zuständigen Services weiter
- **API-Service**: Stellt REST-APIs für Frontend und externe Systeme bereit
- **Auth Service**: Verwaltet Authentifizierung und Autorisierung
- **Message Processor**: Verarbeitet Nachrichten, transformiert sie und leitet sie weiter
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

#### API-Gateway (Port 8000)
- Zentraler Einstiegspunkt für alle API-Anfragen
- Routing zu den entsprechenden Services
- Status-Endpunkt: `/api/v1/gateway/status`

#### Message Worker (Port 8082)
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

### Redis-Konfiguration

Der Processor Service implementiert eine robuste Redis-Verbindungsstrategie:

1. Mehrere potenzielle Redis-Hosts werden in einer priorisierten Liste konfiguriert
2. Jeder Host wird systematisch mit definierten Verbindungsparametern getestet
3. Der erste erfolgreich antwortende Host wird für die Verbindung verwendet
4. Der Service wird nicht gestartet, wenn keine Verbindung hergestellt werden kann
5. Umfangreiche Logging-Funktionen für die Verbindungsdiagnostik sind integriert

Diese Strategie gewährleistet eine zuverlässige Verbindung zur Message Queue und stellt sicher, dass die Anwendung in allen Umgebungen konsistent funktioniert.

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

- **Backend**: Python mit Flask
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

## 7. Deployment-Strategien

### Lokales Deployment

Für Entwicklungs- und Testzwecke stehen folgende Optionen zur Verfügung:

1. **Standard-Deployment mit direktem Zugriff**:
   ```bash
   ./start.sh
   ```
   - Jeder Service ist auf seinem eigenen Port erreichbar
   - API-Gateway auf Port 8000 leitet Anfragen weiter

2. **Deployment mit NGINX**:
   ```bash
   USE_NGINX=1 ./start.sh
   ```
   - NGINX-Konfiguration wird generiert und aktiviert
   - Alle Anfragen gehen über NGINX zum API-Gateway

### Produktions-Deployment

Für Produktionsumgebungen wird ein robustes Deployment mit NGINX empfohlen:

1. **NGINX-Konfiguration generieren**:
   ```bash
   cd deploy-scripts
   ./generate_nginx_config.sh --server-name your-domain.com --restart
   ```

2. **Systemdienste konfigurieren** (optional):
   ```bash
   # PM2 für Prozessverwaltung
   pm2 start deploy-scripts/production.config.js
   pm2 save
   pm2 startup
   ```

Die Anwendung unterstützt auch automatisches Deployment via GitHub-Webhooks für kontinuierliche Integration.

## 8. Sicherheitskonzept

- JWT-basierte Authentifizierung für alle API-Zugriffe
- CORS-Konfiguration über API-Gateway oder NGINX
- Zentralisierte Fehlerbehandlung und -protokollierung
- Redis-Verbindungssicherheit mit Passwort-Authentifizierung
- Sichere HTTPS-Kommunikation in Produktionsumgebungen 

## 9. Docker-Deployment und Konfiguration

Das System ist vollständig für Docker-basiertes Deployment optimiert, was Entwicklung, Tests und Produktion vereinfacht.

### Container-Struktur

Das System besteht aus den folgenden Containern:

| Container | Port | Beschreibung |
|-----------|------|--------------|
| gateway | 8000 | API-Gateway - zentraler Einstiegspunkt für alle API-Anfragen |
| api | 8080 | API-Service - verwaltet Kunden, Gateways und Geräte |
| auth | 8081 | Auth-Service - Authentifizierung und Autorisierung |
| processor | 8082 | Message Processor - verarbeitet und leitet Nachrichten weiter (inkl. Worker-Funktionalität) |
| frontend | 80:5173 | Frontend-Anwendung (Vite/React) |
| redis | 6380:6379 | Redis für Message Queue und Caching |
| mongo | 27017 | MongoDB für persistente Datenspeicherung |

### Umgebungsvariablen

Die Umgebungsvariable `FLASK_ENV=docker` wird in allen Backend-Containern gesetzt, um die korrekte Host-Konfiguration zu verwenden:

```python
# In utils/api_config.py
HOSTS = {
    'docker': {
        'api': 'http://api:8080',
        'auth': 'http://auth:8081',
        'processor': 'http://processor:8082',
        'worker': 'http://processor:8082'  # Worker ist in Processor integriert
    }
}
```

### Frontend-Konfiguration in Docker

Die Frontend-Anwendung läuft im Browser des Benutzers und muss daher `localhost` verwenden, auch wenn der Rest des Systems in Docker läuft:

```javascript
// In frontend/src/config.js
export const GATEWAY_URL = 
  isProduction ? '/api' :
  // Immer localhost verwenden, da der Browser nicht im Docker-Netzwerk läuft
  'http://localhost:8000/api';
```

### Health-Checks

Alle Docker-Container sind mit Health-Checks konfiguriert, um den Zustand des Systems zu überwachen:

```yaml
# Beispiel aus docker-compose.yml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:8000/api/v1/gateway/status"]
  interval: 30s
  timeout: 10s
  retries: 3
```

### CORS-Konfiguration

Die Cross-Origin Resource Sharing (CORS) Konfiguration wurde besonders für den Docker-Betrieb optimiert und ist hochgradig anpassbar:

#### Dynamische CORS-Konfiguration

Das System verwendet einen flexiblen CORS-Mechanismus, der über Umgebungsvariablen gesteuert wird:

1. **ALLOWED_ORIGINS**: Umgebungsvariable für alle Services
   - `*` (Standard): Alle Origins erlauben
   - Komma-getrennte Liste von erlaubten Origins (z.B. `http://localhost,http://example.com`)

2. **Dynamische Origin-Erkennung**: 
   - Das System gibt den Origin-Header exakt so zurück, wie er in der Anfrage empfangen wurde
   - Jede Anfrage wird mit dem korrekten Origin beantwortet, ohne harte Codierung

3. **Bereitstellung für Produktion**:
   - In Produktionsumgebungen muss `ALLOWED_ORIGINS` mit der tatsächlichen Domain aktualisiert werden
   - Beispiel: `ALLOWED_ORIGINS=https://meine-produktionsseite.de,https://admin.meine-produktionsseite.de`

4. **CORS-Header**:
   - `Access-Control-Allow-Origin`: Dynamisch basierend auf dem Origin der Anfrage
   - `Access-Control-Allow-Methods`: GET, POST, PUT, DELETE, OPTIONS
   - `Access-Control-Allow-Headers`: Content-Type, Authorization, X-Requested-With
   - `Access-Control-Allow-Credentials`: true (für authentifizierte Anfragen)

5. **Frontend API-Client Konfiguration**:
   - Der Frontend API-Client aktiviert `credentials: 'include'` für alle Anfragen
   - Dies ermöglicht das Senden und Empfangen von Cookies/Credentials bei Cross-Origin-Anfragen
   - Beispiel in `frontend/src/api.js`:
   ```javascript
   // CORS-Credentials für Cross-Origin-Anfragen aktivieren
   options.credentials = 'include';
   ```

Diese Konfiguration erlaubt dem System, in verschiedenen Umgebungen zu funktionieren, ohne Code-Änderungen vornehmen zu müssen. Die CORS-Einstellungen werden zur Laufzeit durch die Docker-Umgebungsvariablen bestimmt.

### Fehlerbehebung bei Docker-Deployment

Häufige Probleme und Lösungen im Docker-Setup:

1. **Container-Namen vs. Localhost**: Browser-Anfragen müssen immer `localhost` verwenden, da Browser nicht im Docker-Netzwerk laufen
2. **Worker-Service fehlt**: Die Worker-Funktionalität wurde in den Processor-Service integriert
3. **CORS-Fehler**: Sichergestellt durch erweiterte Header im API-Gateway
4. **Gesundheitszustand der Container**: Überwachung über Health-Checks mit entsprechenden Timeouts

### Startup-Reihenfolge

Die Container starten in der folgenden Reihenfolge:
1. MongoDB und Redis (Datenbanken)
2. Backend-Services (api, auth, processor)
3. API-Gateway (abhängig von Backend-Services)
4. Frontend (abhängig vom API-Gateway)

Diese Abhängigkeiten werden über `depends_on` mit Bedingungen in docker-compose.yml gesteuert. 