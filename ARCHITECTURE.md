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

### Optimale Datensynchronisation im Frontend

Die Implementierung von effizienten Frontend-Backend-Synchronisationsmechanismen folgt diesen Prinzipien:

#### 1. Zentrale Datenlade-Funktionen

Jede Komponente implementiert eine zentrale Funktion zum Laden aller benötigten Daten:

```javascript
const loadAllData = async () => {
  setLoading(true);
  try {
    await Promise.all([
      checkApiStatus(),
      fetchTemplates(),
      fetchMessages()
    ]);
  } catch (error) {
    console.error('Fehler beim Laden der Daten:', error);
    setError('Daten konnten nicht geladen werden.');
  } finally {
    setLoading(false);
  }
};
```

#### 2. Automatisches Polling

Für Echtzeit-Updates wird ein automatischer Polling-Mechanismus verwendet:

```javascript
useEffect(() => {
  // Initial laden
  loadAllData();

  // Polling-Intervall einrichten
  const interval = setInterval(() => {
    loadAllData();
  }, 10000); // alle 10 Sekunden

  // Aufräumen beim Unmounten
  return () => clearInterval(interval);
}, []);
```

#### 3. Manuelle Refresh-Funktionen

Zusätzlich zum automatischen Polling werden manuelle Refresh-Optionen angeboten:

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

#### 4. Statusrückmeldung für Benutzeraktionen

Bei benutzerinitierten Aktionen wird direktes Feedback gezeigt:

```javascript
const createTestMessage = async () => {
  try {
    setCreatingMessage(true);
    const response = await systemApi.testMessage();
    if (response.status === 'success') {
      setCreationSuccess(true);
      
      // Daten sofort aktualisieren
      await fetchMessages();
      
      setTimeout(() => setCreationSuccess(false), 3000);
    } else {
      throw new Error(response.error?.message);
    }
  } catch (error) {
    setCreationError(true);
    setTimeout(() => setCreationError(false), 3000);
  } finally {
    setCreatingMessage(false);
  }
};
```

#### 5. Konsistente Loading-States

Alle Komponenten verwenden einheitliche Loading-States für besseres UX:

```jsx
{loading ? (
  <div className="text-center p-5">Lade Daten...</div>
) : data.length === 0 ? (
  <div className="text-center p-5">Keine Daten vorhanden.</div>
) : (
  <Table>
    {/* Daten anzeigen */}
  </Table>
)}
```

#### 6. Direkte Cache-Invalidierung

Nach CRUD-Operationen werden betroffene Daten sofort aktualisiert:

```javascript
const handleAddItem = async () => {
  const response = await api.items.create(formData);
  if (response.status === 'success') {
    // Dialog schließen
    setShowAddModal(false);
    
    // Formular zurücksetzen
    resetForm();
    
    // Daten neu laden
    fetchItems();
  }
};
```

Diese Prinzipien gewährleisten eine optimale Datensynchronisation zwischen Frontend und Backend und verbessern die Benutzererfahrung signifikant.

### Deployment-Integration

Die Anwendung bietet einen automatischen NGINX-Konfigurationsgenerator, der auf Basis der zentralen API-Konfiguration die Routing-Regeln erstellt:

```bash
# Generieren einer NGINX-Konfiguration
./deploy-scripts/generate_nginx_config.sh --server-name evaluapp.example.com --output /etc/nginx/sites-available/evaluapp

# Im Dry-Run-Modus (ohne Installation)
./deploy-scripts/generate_nginx_config.sh --server-name evaluapp.example.com --dry-run
```

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

## 10. Flexible Nachrichtenverarbeitungs-Pipeline (Neue Architektur)

Die Nachrichtenverarbeitungs-Pipeline wurde neu konzipiert, um eine maximale Flexibilität bei der Verarbeitung verschiedener Gerätetypen und Nachrichtenformate zu gewährleisten. Die neue Architektur folgt einem klaren, mehrstufigen Prozess, der eine saubere Trennung von Verantwortlichkeiten ermöglicht und die Erweiterbarkeit des Systems deutlich verbessert.

### 10.1 Pipeline-Übersicht

```
Nachricht → Extraktion → Normalisierung → Filterung → Transformation → Weiterleitung
```

Jede dieser Stufen hat eine klar definierte Verantwortung und Schnittstelle:

#### 1. Extraktion
- Empfang der Nachrichten im Rohformat von verschiedenen Gateway-Typen
- Identifikation des Gateway und Bestimmung des Nachrichtentyps
- Extraktion von Gateway-ID und grundlegenden Metadaten
- Keine formatspezifische Transformationslogik in dieser Stufe

#### 2. Normalisierung
- Konvertierung der Rohdaten in ein standardisiertes internes Format
- Extrahieren aller Gerätedaten, unabhängig vom ursprünglichen Format
- Typenkonvertierung und Validierung von Werten
- Erzeugung eines normalisierten Datenmodells mit einheitlicher Struktur

#### 3. Filterung
- Anwendung konfigurierbarer Filterregeln auf normalisierte Daten
- Entscheidung, ob Nachrichten weitergeleitet werden sollen
- Min/Max-Werte-Prüfungen und spezifische Wertefilterung
- Protokollierung der Filterentscheidungen für Analyse und Debugging

#### 4. Transformation
- Anwendung von Templates auf die normalisierten Daten
- Umwandlung in das Zielformat (z.B. evAlarm-Format)
- Zugriff auf alle normalisierten Daten im Template
- Versionierte und kundenspezifische Templates

#### 5. Weiterleitung
- Authentifizierung mit dem Zielsystem (z.B. evAlarm-API)
- Protokollierung des Weiterleitungserfolgs
- Umgang mit Fehlern und Wiederholungsversuchen
- Statistiken zur Weiterleitungsperformance

### 10.2 Normalisiertes Datenmodell

Das Herzstück der neuen Architektur ist das standardisierte, normalisierte Datenmodell:

```json
{
  "gateway": {
    "id": "gw-c490b022-cc18-407e-a07e-a355747a8fdd",
    "type": "roombanker_gateway",
    "metadata": {
      "dbm": "-117",
      "electricity": 100,
      "batterystatus": "connected",
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
        "batterystatus": "connected",
        "onlinestatus": "online"
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

Dieses Modell bietet:
- Einheitliche Zugriffsstruktur für Templates
- Klar getrennte Gateway- und Gerätedaten
- Typisierte und validierte Werte
- Erhaltung der Originalnachricht für Debugging

### 10.3 Filterregel-System

Das neue Filterregel-System ermöglicht eine detaillierte Konfiguration, welche Nachrichten weitergeleitet werden sollen. Es unterstützt verschiedene Regeltypen:

#### Wertebasierte Regeln
```json
{
  "name": "panic_alarm",
  "type": "ValueComparisonRule",
  "description": "Filtert Panic-Button-Alarme",
  "field_path": "devices[0].values.alarmtype",
  "expected_value": "panic"
}
```

#### Numerische Bereichsregeln
```json
{
  "name": "temperature_range",
  "type": "RangeRule",
  "description": "Filtert Temperaturen zwischen 18 und 30 Grad",
  "field_path": "devices[0].values.temperature",
  "min_value": 18,
  "max_value": 30,
  "inclusive": true
}
```

#### Textmuster-Regeln
```json
{
  "name": "gateway_pattern",
  "type": "RegexRule",
  "description": "Filtert Gateway-IDs, die mit 'gw-' beginnen",
  "field_path": "gateway.id",
  "pattern": "^gw-.*"
}
```

#### Listenwert-Regeln
```json
{
  "name": "allowed_status",
  "type": "ListContainsRule",
  "description": "Filtert nach erlaubten Status-Werten",
  "field_path": "devices[0].values.status",
  "allowed_values": ["online", "warning", "alarm"]
}
```

#### Logisch verknüpfte Regeln (AND/OR)
```json
{
  "name": "combined_conditions",
  "type": "AndRule",
  "description": "Kombinierte Bedingung (Alarm UND Batterie OK)",
  "rules": [
    {
      "name": "is_alarm",
      "type": "ValueComparisonRule",
      "field_path": "devices[0].values.alarmstatus",
      "expected_value": "alarm"
    },
    {
      "name": "battery_ok",
      "type": "ValueComparisonRule",
      "field_path": "devices[0].values.batterystatus",
      "expected_value": "connected"
    }
  ]
}
```

Die Filterregeln werden in einer JSON-Datei gespeichert und durch ein JSON-Schema validiert. Das System stellt eine `FilterRuleEngine`-Klasse bereit, die die Regeln verwaltet und auf normalisierte Nachrichten anwendet.

#### Frontend-Integration der Filterregeln

Im visuellen Template-Generator wurden Filterregeln vollständig integriert:

1. **API-Integration**: 
   - Neue Endpunkte in der Template-API für Filterregeln
   - `getFilterRules()` zum Abrufen aller verfügbaren Regeln
   - `testFilterRule()` zum Testen einer Regel gegen eine Nachricht

2. **Benutzeroberfläche**:
   - Liste aller verfügbaren Filterregeln im Template-Builder
   - Einfache Auswahl durch Anklicken einer Regel
   - Visuelle Hervorhebung aktivierter Regeln
   - Anzeige der Regelanzahl im Template-Header
   - **Erweiterte Bearbeitungsmöglichkeiten**:
     - Detailansicht für Parameter jeder Regelart (Slider für Bereiche, Dropdown für Werte)
     - Automatische Extraktion möglicher Werte aus normalisierten Daten
     - Benutzerdefinierte Regelerstellung mit intuitiver UI
     - Typen-Badges zur schnellen visuellen Unterscheidung der Regelarten

3. **Datenmodell-Integration**:
   - Filterregeln werden im `filter_rules`-Array des Templates gespeichert
   - Regeln werden bei Template-Speicherung und -Anwendung berücksichtigt
   - Fallback auf vordefinierte Standardregeln, falls API nicht verfügbar
   - Unterstützung für komplexe Regeltypen wie `AndRule` und `OrRule`

4. **Optimierte Benutzerführung**:
   - Einheitliches Drawer-Pattern für Transformationsergebnisse
   - Dialogbasierte Regelbearbeitung mit kontextabhängigen Eingabefeldern
   - Automatische Vorschläge basierend auf verfügbaren Daten
   - Feldpfad-Validierung gegen normalisierte Datenstruktur

Diese Frontend-Integration ermöglicht es Benutzern, Filterregeln ohne tieferes technisches Verständnis intuitiv auszuwählen und anzuwenden, was die Benutzerfreundlichkeit des Systems erheblich verbessert.

### 10.4 Erweitertes Template-System

Das neue Template-System bietet eine leistungsstarke und flexible Möglichkeit, normalisierte Nachrichten zu transformieren und weiterzuleiten.

#### Integrierte Filterregeln in Templates

Templates können jetzt Filterregeln direkt integrieren, was eine präzise Steuerung ermöglicht, welche Nachrichten transformiert werden:

```json
{
  "name": "evalarm_panic_v2",
  "description": "Template für Panic-Button-Alarme",
  "version": "2.0.0",
  "filter_rules": ["panic_alarm", "battery_ok"],
  "transform": {
    "events": [
      {
        "message": "{{ devices[0].values.alarmtype | default('Alarm') }}",
        "device_id": "{{ devices[0].id }}"
      }
    ]
  }
}
```

Nachrichten werden nur dann transformiert und weitergeleitet, wenn sie die angegebenen Filterregeln erfüllen.

#### Erweiterter Zugriff auf normalisierte Daten

Das Template-System bietet direkten Zugriff auf alle Teile der normalisierten Daten:

- `gateway`: Alle Gateway-Informationen
- `devices`: Liste aller Geräte
- `metadata`: Metadaten wie Zeitstempel und Nachrichtenformat
- `raw_message`: Die ursprüngliche Nachricht für Debugging-Zwecke

Dies ermöglicht eine viel präzisere Kontrolle über die Transformation als das alte System.

#### Erweiterte Jinja2-Funktionen

Das Template-System bietet zahlreiche Hilfsfunktionen und Filter:

```jinja2
{# Datums- und Zeitformatierung #}
{{ timestamp | datetime }}

{# Array-Operationen #}
{{ devices | first | get('id') }}

{# Typ-Konvertierungen #}
{{ value | int }}
{{ value | float }}
{{ value | str }}
{{ value | bool }}

{# Hilfsfunktionen #}
{{ get_device_by_type(devices, 'panic_button') }}
{{ get_device_value(device, 'temperature', 20) }}
{{ get_gateway_metadata(gateway, 'rssi', -80) }}
```

Diese Funktionen machen die Templates leistungsfähiger und lesbarer.

#### Automatische Template-Generierung

Das System kann nun Basis-Templates automatisch aus normalisierten Nachrichten generieren:

```python
template = template_engine.generate_template(normalized_message, "new_template")
```

Dies ist besonders nützlich für die schnelle Entwicklung neuer Templates oder für neue Gerätetypen.

#### Versionierte Templates

Templates unterstützen jetzt explizite Versionierung, was die Verwaltung mehrerer Versionen desselben Templates erleichtert:

```json
{
  "name": "evalarm_panic",
  "version": "2.0.0", 
  "created_at": "2023-05-15T10:00:00.000Z",
  "updated_at": "2023-05-15T10:00:00.000Z"
}
```

### 10.5 Implementierte Komponenten

Folgende Komponenten der neuen Nachrichtenverarbeitungsarchitektur wurden bereits implementiert:

#### Message Normalizer (utils/message_normalizer.py)
- Konvertiert verschiedene Nachrichtenformate in das normalisierte Datenmodell
- Unterstützt automatische Format-Erkennung
- Extrahiert Gateway- und Geräteinformationen
- Bestimmt automatisch Gerätetypen anhand von Werten

#### Filter Rules System (utils/filter_rules.py)
- Definiert die Basisklasse für alle Filterregeln
- Implementiert verschiedene Regeltypen:
  - ValueComparisonRule für exakte Wertevergleiche
  - RangeRule für numerische Wertebereiche
  - RegexRule für Textmustervergleiche
  - ListContainsRule für Listenprüfungen
  - AndRule/OrRule für logische Verknüpfungen
- Enthält die FilterRuleEngine zur Anwendung von Regeln

#### Normalized Template Engine (utils/normalized_template_engine.py)
- Implementiert das erweiterte Template-System
- Integriert das Filterregel-System
- Bietet erweiterte Jinja2-Funktionen und Filter
- Unterstützt die automatische Template-Generierung
- Ermöglicht Versionierung von Templates

#### Filter Rule Schema (utils/filter_rule_schema.json)
- JSON-Schema zur Validierung von Filterregeldefinitionen
- Unterstützt alle implementierten Regeltypen
- Enthält Beispiele für verschiedene Regelanwendungen

## 11. Debug-Dashboard und Logging-Architektur (NEU)

Im Rahmen der Verbesserung der Entwickler- und Administratorwerkzeuge wurde ein umfassendes Debug-Dashboard implementiert, das die Fehlersuche und Analyse erheblich erleichtert.

### 11.1 Debug-Dashboard-Komponenten

Das Debug-Dashboard besteht aus mehreren integrierten Modulen:

#### Nachrichtendebugger
- Visualisierung der kompletten Nachrichtenverarbeitungspipeline
- Schrittweise Anzeige von Extraktion, Normalisierung, Filterung, Transformation und Weiterleitung
- Testfunktionalität für neue Nachrichten
- Detaillierte Anzeige der Zwischenergebnisse jedes Verarbeitungsschritts

#### System-Logs-Viewer
- Echtzeitanzeige von Logs aller Systemkomponenten
- Filterung nach Komponente (API, Processor, Gateway, Auth, Database)
- Filterung nach Log-Level (debug, info, warning, error)
- Volltextsuche in Log-Nachrichten
- Zeitraum-basierte Filterung
- Export-Funktionalität für Logs

#### Nachrichtenanalyse
- Detaillierte Ansicht aller empfangenen Nachrichten
- Sortierung nach Zeit, Gateway oder Gerätetyp
- Detailansicht mit JSON-Datenstruktur
- Debug-Funktion zum Nachverfolgen der Verarbeitung

### 11.2 Log-Service-Architektur

Eine zentrale Komponente des Debug-Systems ist der neu implementierte Log-Service:

#### Container-Log-Extraktion
- Direkter Zugriff auf Docker-Container-Logs
- Automatische Strukturierung und Normalisierung verschiedener Log-Formate
- Echtzeitverfügbarkeit der neuesten Logs
- Persistente Speicherung für spätere Analyse

#### Log-API-Endpunkte
- Vereinheitlichte Schnittstelle für alle Log-Typen
- Filter- und Suchmöglichkeiten
- Pagination für große Logmengen
- Unterstützung verschiedener Ausgabeformate (JSON, TXT)

#### Frontend-Integration
- Reaktives UI-Update bei neuen Log-Einträgen
- Farbliche Hervorhebung nach Log-Level
- Erweiterte Filteroptionen
- Automatisches Polling für Echtzeit-Updates

### 11.3 Gateway-ID/UUID-Konvention

Um die Konsistenz im Gesamtsystem zu verbessern, wurde eine klare Konvention für die Identifikation von Gateways etabliert:

#### Datenbankschema
- Verwendet einheitlich `uuid` als Feldnamen für Gateway-IDs
- Alle Datenbank-Lookups verwenden `find_by_uuid()`

#### API-Kommunikation
- Verwendet einheitlich `gateway_id` als Parameter-Name in JSON-Payloads
- Unterstützt für Abwärtskompatibilität alternative Feldnamen wie `gateway_uuid`, `uuid`, `gateway.uuid`
- Bei der internen Verarbeitung wird immer auf `uuid` normalisiert

#### Gateway-Skripte
- Alle Gateway-Skripte wurden standardisiert, um konsistent `gateway_id` zu verwenden
- Einheitliches Format `gw-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` für alle Gateway-IDs

Diese Vereinheitlichung löst frühere Inkonsistenzen und vermeidet Fehler bei der Identifikation von Gateways.

## 12. Datenbankzentrierte Architektur (NEU)

Das System wurde von einer Mischung aus JSON-Konfigurationsdateien und Datenbanknutzung zu einer vollständig datenbankzentrierten Architektur migriert. Diese Migration löst ein kritisches architektonisches Problem, bei dem die gleichen Daten an mehreren Stellen gespeichert wurden und Inkonsistenzen entstanden.

### 12.1 Migration von JSON zu MongoDB

#### Frühere Probleme
- Gateway-zu-Kunde-Zuordnungen waren in `templates/customer_config.json` gespeichert
- UI lud Daten aus der Datenbank, während Nachrichtenverarbeitung die JSON-Datei verwendete
- Gateways erschienen nicht in der UI, obwohl sie in der JSON-Datei einem Kunden zugeordnet waren

#### Lösungsansatz
- Entwicklung eines Migrationsskripts (`utils/migrate_customer_config.py`)
- Vollständige Migration aller Daten aus JSON-Dateien in die MongoDB
- Aktualisierung aller Codestellen, die auf JSON-Dateien zugriffen
- Vereinheitlichung der Datenquelle für alle Systemkomponenten

#### Hauptkomponenten
- `message_processor.py` wurde aktualisiert, um Kundenzuordnungen aus der Datenbank zu lesen
- Die Gateway-Registrierung und -Zuordnung nutzt nun ausschließlich die Datenbank
- Alle Frontend-Komponenten beziehen ihre Daten konsistent aus der gleichen Datenbank

### 12.2 Vorteile der datenbankzentrierten Architektur

- **Konsistenz**: Alle Komponenten sehen den gleichen Datenstand
- **Zuverlässigkeit**: Keine Synchronisationsprobleme zwischen verschiedenen Speicherorten
- **Flexibilität**: Leichtere Implementierung neuer Features durch einheitlichen Datenzugriff
- **Skalierbarkeit**: Bessere Unterstützung für Clustering und Hochverfügbarkeit
- **Sicherheit**: Verbesserte Zugangskontrolle und Audit-Möglichkeiten

### 12.3 Aktuelle Datenbankmodelle

#### Customer
- MongoDB-Collection für Kundendaten
- Zentrale Speicherung aller kundenspezifischen Konfigurationen
- API-Zugangsdaten für evAlarm werden sicher in der Datenbank gespeichert

#### Gateway
- UUID als primärer Identifikator
- Kundenreferenz als Foreign Key (ObjectId)
- Status- und Konfigurationsinformationen

#### Device
- Gerätedaten werden mit Gateway verknüpft
- Automatische Erkennung und Registrierung neuer Geräte
- Statusverfolgung in der Datenbank

### 12.4 Zukünftige Erweiterungen

- Vollständige Integration aller Template-Definitionen in die Datenbank
- UI-Komponenten für Datenbank-Backup und -Wiederherstellung
- Erweiterte Validierung und Konsistenzprüfung für Datenbankoperationen 

## 13. UI-Modernisierung und Standardisierung (NEU)

Das Frontend wurde umfassend modernisiert, um eine konsistentere und benutzerfreundlichere Oberfläche zu schaffen. Die UI-Modernisierung orientiert sich an modernen Server-Management-Konsolen und behält gleichzeitig den bestehenden React/Bootstrap-Stack bei.

### 13.1 Side-Navigation

Die Navigation wurde grundlegend überarbeitet:

- Implementierung einer permanenten seitlichen Navigation (240px breit)
- Responsive Anpassung: Offcanvas-Menü bei kleineren Bildschirmen (<lg Breakpoint)
- Hierarchische Menüstruktur nach modernem Design-Pattern
- Reduzierung der Top-Bar auf Logo, User-Menü und Command Palette
- Integration von Breadcrumbs für verbesserte Navigation

#### Optimierte Side-Navigation-Implementierung

Die Side-Navigation wurde technisch verbessert, um Überlappungsprobleme zu vermeiden und die Benutzerführung zu optimieren:

- **Dynamisches Layout-System**:
  - Korrekte Positionierung unter der Top-Navbar (`top: 56px`)
  - Automatische Höhenberechnung (`height: calc(100vh - 56px)`)
  - Konsistentes Margin-Management für den Hauptinhalt (`margin-left: 250px`)
  - Reduzierter Abstand im eingeklappten Zustand (`margin-left: 60px`)

- **Verbesserte Transition-Effekte**:
  - Weiche Übergänge beim Ein-/Ausklappen des Menüs
  - Konsistente Animation-Geschwindigkeit (0.3s)
  - Flüssige Anpassung des Hauptinhalts

- **Responsive Verhalten**:
  - Automatisches Ausblenden auf mobilen Geräten
  - Offcanvas-Menü mit eigener Schließen-Funktion
  - Angepasste Menüpunkte mit Fokus auf Touch-Bedienung

Diese Implementierung verbessert nicht nur die optische Konsistenz, sondern optimiert auch die Benutzererfahrung durch ein zuverlässigeres Layout ohne Überlappungen oder Darstellungsprobleme.

### 13.2 Drawer-Pattern statt Modals

Ein zentrales Element der UI-Modernisierung ist die Umstellung von modalen Dialogen auf Drawer-Komponenten:

```javascript
// Basiskomponente für alle Detail-Drawer
const Drawer = ({ show, onClose, title, children }) => (
  <Offcanvas 
    show={show} 
    onHide={onClose} 
    placement="end" 
    backdrop={false} 
    scroll
    className="drawer"
  >
    <Offcanvas.Header className="border-bottom">
      <Offcanvas.Title>{title}</Offcanvas.Title>
      <button className="btn btn-sm btn-close" onClick={onClose} />
    </Offcanvas.Header>
    <Offcanvas.Body className="p-0">
      <div className="drawer-content p-4">{children}</div>
    </Offcanvas.Body>
  </Offcanvas>
);
```

Vorteile des Drawer-Patterns:
- Größere Fläche für komplexe Inhalte
- Deep-Linking durch URL-Parameter möglich
- Verbesserte Navigation durch Beibehaltung des Kontexts
- Konsistentes UX-Pattern in der gesamten Anwendung

#### Erweiterte Drawer-Funktionalität

Die Drawer-Komponente wurde mit einer flexiblen Größenanpassungsfunktion ausgestattet:

- **Größenanpassung durch Ziehen**: Benutzer können die Breite des Drawers durch Ziehen an der linken Kante anpassen
- **Dynamische CSS-Variablen**: Die aktuelle Drawer-Breite wird als CSS-Variable (`--drawer-width`) gespeichert
- **Responsives Verhalten**: Der Hauptinhalt passt sich automatisch an die Drawer-Breite an
- **Kontextbasierte Verwaltung**: Ein zentraler DrawerContext verwaltet den Drawer-Zustand global

```javascript
// DrawerContext.jsx
export const DrawerProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [width, setWidth] = useState(480); // Standardbreite
  
  const value = {
    isOpen,
    setIsOpen,
    width,
    setWidth,
  };
  
  return (
    <DrawerContext.Provider value={value}>
      {children}
    </DrawerContext.Provider>
  );
};
```

Die Drawer-Komponente verwendet diesen Kontext für eine konsistente Verwaltung des Zustands:

```javascript
// Resize-Funktionalität in der Drawer-Komponente
const ResizableDrawer = () => {
  const { isOpen, setWidth, width } = useContext(DrawerContext);
  const startResizing = useCallback(/* Implementierung der Resize-Logik */);
  
  return (
    <div 
      className={`drawer ${isOpen ? 'open' : ''}`} 
      style={{ width: `${width}px` }}
    >
      <div 
        className="drawer-resize-handle"
        onMouseDown={startResizing}
      />
      {/* Drawer-Inhalt */}
    </div>
  );
};
```

#### Konsistente Lösch-Funktionalität

Für eine verbesserte Benutzerführung wurde die Löschfunktionalität vereinheitlicht:

- **Entfernung redundanter Löschbuttons**: Löschbuttons wurden aus Hauptübersichtstabellen entfernt
- **Konsolidierung im Detail-Drawer**: Alle Entitäten (Kunden, Gateways, Geräte) nutzen nun konsistent den Löschbutton im Detail-Drawer
- **Bestätigungsdialoge**: Zweistufiger Bestätigungsprozess für das Löschen wichtiger Entitäten

Diese Vereinheitlichung verbessert die Benutzererfahrung durch konsistente Interaktionsmuster und reduziert die Gefahr versehentlicher Löschungen.

#### Implementierte Drawer-Komponenten:
- `GatewayDetailDrawer` für Gateway-Details
- `CustomerDetailDrawer` für Kundendetails
- `DeviceDetailDrawer` für Gerätedetails
- `MessageDetailDrawer` für Nachrichtendetails
- `TemplateDetailDrawer` für Template-Details

Diese Komponenten wurden in die bestehende Routing-Struktur als verschachtelte Routen integriert:

```javascript
<Route path="/customers" element={<Customers />}>
  <Route path=":id" element={<CustomerDetailDrawer />} />
</Route>
<Route path="/gateways" element={<Gateways />}>
  <Route path=":uuid" element={<GatewayDetailDrawer />} />
</Route>
<Route path="/devices" element={<Devices />}>
  <Route path=":gatewayUuid/:deviceId" element={<DeviceDetailDrawer />} />
</Route>
<Route path="/messages" element={<Messages />}>
  <Route path=":messageId" element={<MessageDetailDrawer />} />
</Route>
<Route path="/templates" element={<Templates />}>
  <Route path=":id" element={<TemplateDetailDrawer />} />
</Route>
```

#### Klickbare Tabellenzeilen
Als Ergänzung zum Drawer-Pattern wurden Tabellenzeilen klickbar gemacht, um eine intuitivere Navigation zu den Detail-Drawern zu ermöglichen:

```javascript
<tr 
  key={gateway.uuid} 
  onClick={() => navigateToDetail(gateway)}
  style={{ cursor: 'pointer' }}
  className="cursor-pointer"
>
  {/* Zelleninhalt */}
  <td onClick={(e) => e.stopPropagation()}>
    {/* Aktionsbuttons mit stopPropagation */}
  </td>
</tr>
```

Vorteile der klickbaren Zeilen:
- Größere Klickfläche für eine einfachere Bedienung
- Intuitivere Benutzerführung
- Weniger Buttons in der Benutzeroberfläche
- Konsistenz mit modernen Web-Anwendungen

### 13.3 Einheitliches Styling

Zur Verbesserung der visuellen Konsistenz wurden folgende Maßnahmen umgesetzt:

- Reduzierung auf drei zentrale CSS-Dateien (global.css, App.css, index.css)
- Konsequente Verwendung von Bootstrap-Klassen für Layouts
- Einheitliches Seitenlayout nach PageTemplate.jsx-Muster
- Standardisierte Icon-Verwendung mit lucide-react (18px Standardgröße)
- Konsistente Verwendung von Status-Badges und Spacing

### 13.4 TanStack Table

Die Anwendung verwendet TanStack Table (früher React Table) als moderne, headless Tabellenlösung, die erweiterte Funktionen und bessere Performance bietet:

```javascript
// Beispiel für eine TanStack Table-Konfiguration
const table = useReactTable({
  data,
  columns,
  state: {
    globalFilter
  },
  onGlobalFilterChange: setGlobalFilter,
  enableSorting: true,
  enableGlobalFilter: true,
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
  getPaginationRowModel: getPaginationRowModel(),
});
```

#### Vorteile gegenüber nativen Bootstrap-Tabellen:

- **Erweiterte Funktionalität**: Sortierung, Filterung, Paginierung und globale Suche
- **Headless-Architektur**: Trennung von Logik und Darstellung für maximale Flexibilität 
- **Bessere Performance**: Optimierte Rendering-Prozesse, besonders bei großen Datenmengen
- **Virtuelle Scrolling-Möglichkeit**: Für besonders große Tabellen
- **Keine Festlegung auf ein CSS-Framework**: Funktioniert mit Bootstrap, Tailwind oder eigenem CSS

Die Anwendung implementiert eine wiederverwendbare `BasicTable`-Komponente, die als Wrapper um die TanStack Table-Funktionalität dient und ein konsistentes Erscheinungsbild in der gesamten Anwendung gewährleistet:

```jsx
<BasicTable 
  data={customers}
  columns={columns}
  isLoading={loading}
  emptyMessage="Keine Kunden vorhanden."
  onRowClick={openCustomerDetail}
/>
```

#### Spalten-Definition:

Spalten werden mit einer deklarativen API definiert, die eine klare Trennung von Daten und Darstellung ermöglicht:

```javascript
const columns = [
  {
    accessorKey: 'name',
    header: 'Name',
    size: 200,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  // Weitere Spalten...
];
```

#### Implementierte Tabellen

Die TanStack Table wurde für alle Hauptdaten-Tabellen der Anwendung implementiert:

1. **Kundenliste** (`Customers.jsx`) - Zeigt alle Kunden mit Status und Gateway-Anzahl
2. **Gateway-Liste** (`Gateways.jsx`) - Zeigt alle Gateways mit Status, Kundenzuordnung und Statusicons
3. **Geräteliste** (`Devices.jsx`) - Zeigt alle verbundenen Geräte mit Typ, Gateway-Zuordnung und Letztem Update
4. **Nachrichtenliste** (`Messages.jsx`) - Zeigt alle Nachrichten mit Gateway-ID, Typ und Empfangszeitpunkt
5. **Templateliste** (`Templates.jsx`) - Zeigt alle Templates mit Name, Anbieter-Typ und Erstellungsdatum

Jede Tabelle bietet:
- Spaltenbasierte Sortierung durch Klick auf den Spaltenkopf
- Globale Suche über alle Spalten
- Paginierung mit konfigurierbarer Seitengröße
- Klickbare Zeilen, die zum Detail-Drawer navigieren
- Aktionen-Spalte mit stopPropagation für Inline-Aktionen

Diese Architektur verbessert die Wartbarkeit und Erweiterbarkeit der Tabellenkomponenten erheblich.

### 13.5 Geplante Erweiterungen

Folgende UI-Verbesserungen sind für kommende Iterationen geplant:

- Command Palette für schnelle Keyboard-Navigation
- Toast-Notification-System für einheitliches Feedback
- Dark-Mode für verbesserte Benutzerfreundlichkeit
- CSS-Variablen-System für einheitliche Designsprache 

## 14. Template-Gruppen-System (NEU)

Das Template-Gruppen-System wurde entwickelt, um die Verwaltung von Templates für verschiedene Gerätetypen und Nachrichtenformate zu vereinfachen. Es löst das Problem, dass ein Gateway verschiedene Nachrichtentypen senden kann, die unterschiedliche Templates benötigen.

### 14.1 Konzept

Template-Gruppen ermöglichen es, mehrere zusammengehörige Templates zu bündeln und intelligent basierend auf dem Nachrichteninhalt auszuwählen. Dies ist besonders wichtig für Gateways, die verschiedene Nachrichtentypen senden:

- Alarmnachrichten (z.B. Panic-Button)
- Statusnachrichten (z.B. Batteriestatus, Online-Status)
- Sensordaten (z.B. Temperatur, Luftfeuchtigkeit)

### 14.2 Datenmodell

#### TemplateGroup

```javascript
{
  "_id": ObjectId,
  "name": "Roombanker Panic System",  // Eindeutiger Name der Gruppe
  "description": "Templates für Roombanker Panic-Button-Systeme",
  "templates": [
    {
      "template_id": "evalarm_panic",
      "template_name": "Panic Alarm",  // Für UI-Anzeige
      "priority": 100  // Höhere Priorität = wird bevorzugt ausgewählt
    },
    {
      "template_id": "evalarm_battery_low",
      "template_name": "Batterie Warnung",
      "priority": 90
    },
    {
      "template_id": "evalarm_status",
      "template_name": "Status-Update",
      "priority": 10
    }
  ],
  "usage_count": 47,  // Anzahl der Gateways, die diese Gruppe verwenden
  "created_at": DateTime,
  "updated_at": DateTime
}
```

#### Gateway-Erweiterung

Das Gateway-Modell wurde um das `template_group_id` Feld erweitert:

```javascript
{
  // ... bestehende Felder ...
  "template_id": String,  // Legacy: Einzelnes Template (Rückwärtskompatibilität)
  "template_group_id": String,  // NEU: Referenz zur Template-Gruppe
  // ... weitere Felder ...
}
```

### 14.3 Template-Auswahl-Logik

Die Template-Auswahl erfolgt durch die `template_selector.py` Komponente:

```python
def select_template_for_message(gateway, message):
    # 1. Prüfe, ob Gateway eine Template-Gruppe hat
    if gateway.template_group_id:
        template_group = TemplateGroup.find_by_id(gateway.template_group_id)
        
        # 2. Normalisiere die Nachricht
        normalized = normalize_message(message)
        
        # 3. Gehe durch alle Templates (sortiert nach Priorität)
        for template_config in sorted_templates:
            template = Template.get(template_config['template_id'])
            
            # 4. Prüfe Filterregeln
            if check_filter_rules(normalized, template.filter_rules):
                return template_config['template_id']
    
    # 5. Fallback auf Legacy-Template oder Standard
    return gateway.template_id or 'evalarm_status'
```

### 14.4 UI-Komponenten

#### Template-Gruppen-Verwaltung

Die `TemplateGroups.jsx` Seite bietet:
- Übersicht aller Template-Gruppen
- Anzeige der enthaltenen Templates und ihrer Prioritäten
- Verwendungsstatistiken
- Erstellen, Bearbeiten und Löschen von Gruppen

#### Template-Gruppen-Modal

Das `TemplateGroupModal.jsx` ermöglicht:
- Hinzufügen/Entfernen von Templates zu einer Gruppe
- Prioritätsvergabe für jedes Template
- Drag-and-Drop-Sortierung (vorbereitet für zukünftige Implementierung)

#### Gateway-Integration

In der Gateway-Verwaltung (`Gateways.jsx`) kann jetzt:
- Eine Template-Gruppe aus einer Dropdown-Liste ausgewählt werden
- Die Anzahl der enthaltenen Templates angezeigt werden
- Eine visuelle Vorschau der Template-Gruppe erfolgen

### 14.5 API-Endpunkte

Neue API-Endpunkte für Template-Gruppen:

```javascript
// In api.js
templateApi.listGroups()     // GET /api/v1/template-groups
templateApi.getGroup(id)      // GET /api/v1/template-groups/:id
templateApi.createGroup(data) // POST /api/v1/template-groups
templateApi.updateGroup(id, data) // PUT /api/v1/template-groups/:id
templateApi.deleteGroup(id)   // DELETE /api/v1/template-groups/:id
```

### 14.6 Workflow-Beispiel

1. **Administrator erstellt Template-Gruppe**:
   - Name: "Roombanker Panic System"
   - Fügt Templates hinzu: evalarm_panic (Priorität 100), evalarm_status (Priorität 10)

2. **Gateway-Konfiguration**:
   - Administrator wählt beim Gateway-Setup die Template-Gruppe aus
   - Keine einzelne Template-Auswahl mehr nötig

3. **Nachrichtenverarbeitung**:
   - Gateway sendet Panic-Alarm
   - System normalisiert die Nachricht
   - Prüft alle Templates der Gruppe nach Priorität
   - evalarm_panic-Template erfüllt die Filterregeln und wird ausgewählt
   - Nachricht wird transformiert und weitergeleitet

### 14.7 Vorteile des Systems

- **Flexibilität**: Ein Gateway kann verschiedene Nachrichtentypen mit unterschiedlichen Templates verarbeiten
- **Wiederverwendbarkeit**: Einmal konfigurierte Template-Gruppen können für mehrere Gateways genutzt werden
- **Benutzerfreundlichkeit**: Vereinfachtes Gateway-Setup durch Auswahl vorgefertigter Gruppen
- **Skalierbarkeit**: Neue Templates können einfach zu bestehenden Gruppen hinzugefügt werden
- **Wartbarkeit**: Zentrale Verwaltung von Template-Konfigurationen

### 14.8 Zukünftige Erweiterungen

- **Import/Export**: Template-Gruppen zwischen Installationen teilen
- **Marketplace**: Community-basierte Template-Gruppen
- **Auto-Learning**: Automatische Template-Gruppen-Generierung basierend auf Nachrichtenmustern
- **A/B-Testing**: Verschiedene Template-Gruppen für dasselbe Gateway testen
- **Versionierung**: Änderungsverlauf für Template-Gruppen

## 15. Template-Lernsystem (NEU)

Das Template-Lernsystem ermöglicht es, neue Gateways automatisch "einzulernen", indem es deren Nachrichten über einen Zeitraum von 24-48 Stunden sammelt, analysiert und daraus automatisch passende Templates generiert.

### 15.1 Konzept

Das Lernsystem basiert auf Mustererkennung:

1. **Datensammlung**: Alle Nachrichten eines Gateways werden über einen definierten Zeitraum gesammelt
2. **Musteranalyse**: Das System identifiziert wiederkehrende Nachrichtentypen und deren Struktur
3. **Template-Generierung**: Basierend auf den Mustern werden automatisch Templates vorgeschlagen
4. **Überprüfung**: Ein Administrator kann die generierten Templates überprüfen und anpassen
5. **Gruppierung**: Die Templates werden zu einer wiederverwendbaren Template-Gruppe zusammengefasst

### 15.2 UI-Komponenten

#### 15.2.1 Template-Lernsystem-Dashboard

```jsx
frontend/src/pages/TemplateLearning.jsx
```

Hauptfunktionen:
- Übersicht aller Gateways im Lernmodus
- Fortschrittsanzeige (Prozent der Lernzeit)
- Statistiken (Anzahl gesammelter Nachrichten, erkannte Muster)
- Start/Stopp des Lernmodus

#### 15.2.2 Nachrichtenmuster-Analyse

Die Komponente visualisiert erkannte Nachrichtenmuster:
- Häufigkeit verschiedener Nachrichtentypen
- Gemeinsame Felder und deren Wertebereiche
- Beispielnachrichten für jedes Muster
- Automatische Kategorisierung (Alarm, Status, Sensordaten)

#### 15.2.3 Template-Vorschläge

Nach Abschluss der Lernphase:
- Automatisch generierte Templates basierend auf Mustern
- Vorschau der Transformation mit Beispieldaten
- Filterregeln für jedes Template
- Prioritätsvergabe basierend auf Nachrichtenhäufigkeit

### 15.3 Workflow

```
1. Gateway auswählen → Lernmodus starten
2. 24-48 Stunden Datensammlung
3. Musteranalyse → Template-Generierung
4. Admin-Review → Anpassungen
5. Template-Gruppe erstellen
6. Gruppe für ähnliche Gateways wiederverwenden
```

### 15.4 Datenmodell (geplant)

```javascript
// Learning Session
{
  gateway_id: "gw-xyz",
  start_time: ISODate(),
  end_time: ISODate(),
  status: "learning|analyzing|completed",
  message_count: 4896,
  patterns: [
    {
      pattern_id: "p1",
      type: "panic_alarm",
      count: 12,
      frequency: "hourly",
      common_fields: {
        "alarmtype": { constant: true, value: "panic" },
        "temperature": { min: 18.5, max: 23.2 }
      },
      sample_messages: [...]
    }
  ],
  generated_templates: [...]
}
```

### 15.5 Integration mit Template-Gruppen

Das Lernsystem arbeitet nahtlos mit dem Template-Gruppen-System zusammen:
- Generierte Templates werden automatisch gruppiert
- Die Gruppe kann für ähnliche Gateways wiederverwendet werden
- Reduziert die Einrichtungszeit für neue Gateways erheblich

### 15.6 Vorteile

1. **Automatisierung**: Keine manuelle Template-Erstellung nötig
2. **Genauigkeit**: Templates basieren auf echten Daten
3. **Zeitersparnis**: Einmal lernen, vielfach wiederverwenden
4. **Benutzerfreundlichkeit**: Keine technischen Kenntnisse erforderlich
5. **Skalierbarkeit**: Neue Gerätetypen werden automatisch unterstützt

### 15.7 Nächste Schritte

Die Backend-Implementierung für das Lernsystem steht noch aus:
- API-Endpunkte für Lernmodus-Verwaltung
- Nachrichtenspeicherung und -analyse
- Mustererkennung-Algorithmen
- Automatische Template-Generierung
- Integration mit dem Message-Processor

</rewritten_file> 