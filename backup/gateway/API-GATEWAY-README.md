# API-Gateway für evAlarm-IoT Gateway System

Das API-Gateway dient als zentraler Einstiegspunkt für alle API-Anfragen des evAlarm-IoT Gateway Systems. Es leitet Anfragen an die entsprechenden Backend-Services (Auth, API, Processor, Worker) weiter und stellt eine einheitliche Schnittstelle für Clients bereit.

## Funktionen

- **Zentraler Einstiegspunkt**: Alle Client-Anfragen gehen über einen einzigen Endpunkt
- **Dynamisches Routing**: Automatische Weiterleitung an die zuständigen Microservices
- **Service Discovery**: Konfigurierbare Service-Hosts für verschiedene Umgebungen
- **Einheitliche Fehlerbehandlung**: Konsistente Fehlerbehandlung über alle Services hinweg
- **Monitoring**: Überwachung der Service-Verfügbarkeit und Performance

## Architektur

Das API-Gateway implementiert das Gateway-Pattern für Microservice-Architekturen:

```
Client → API-Gateway → [Auth Service | API Service | Processor Service | Worker Service]
```

### Routinglogik

Die Weiterleitung basiert auf der Kategorie im URL-Pfad:

- `/api/v1/auth/*` → Auth Service
- `/api/v1/gateways/*`, `/api/v1/customers/*`, `/api/v1/devices/*` → API Service
- `/api/v1/messages/*`, `/api/v1/templates/*` → Worker Service
- `/api/v1/health`, `/api/v1/iot-status`, `/api/v1/endpoints` → Worker Service

## Installation und Konfiguration

### Voraussetzungen

- Python 3.6+
- Flask
- Requests

### Installation

1. Sicherstellen, dass das Hauptrepository geklont wurde
2. Abhängigkeiten installieren:
```bash
pip install flask requests
```

### Konfiguration

Die Konfiguration erfolgt über Umgebungsvariablen:

- `GATEWAY_PORT`: Port, auf dem das Gateway läuft (Standard: 8000)
- `FLASK_ENV`: Umgebung (`development` oder `production`, Standard: `development`)

Die Service-Hosts werden in `utils/api_config.py` konfiguriert.

## Verwendung

### Starten des Gateways

```bash
# Manuell starten
cd /pfad/zum/projekt
chmod +x gateway/start_gateway.sh
./gateway/start_gateway.sh

# Oder direkt
GATEWAY_PORT=8000 FLASK_ENV=production python -m gateway.api_gateway
```

### Status prüfen

```bash
curl http://localhost:8000/api/v1/gateway/status
```

### API-Anfragen stellen

Alle API-Anfragen werden über das Gateway geleitet:

```bash
# Beispiel-Anfrage an den Auth-Service
curl -X POST http://localhost:8000/api/v1/auth/login -H "Content-Type: application/json" -d '{"username":"admin","password":"secret"}'

# Beispiel-Anfrage an den API-Service
curl http://localhost:8000/api/v1/gateways/list

# Beispiel-Anfrage an den Worker-Service
curl http://localhost:8000/api/v1/messages/status
```

## NGINX-Integration

Für Produktionsumgebungen empfehlen wir, NGINX als Reverse Proxy vor dem API-Gateway zu betreiben:

```nginx
server {
    listen 80;
    server_name example.com;

    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Frontend-Assets
    location / {
        root /path/to/frontend/build;
        try_files $uri $uri/ /index.html;
    }
}
```

## Fehlerbehandlung und Logging

Das Gateway protokolliert alle Anfragen und Fehler in der Datei `gateway/gateway.log`. Im Entwicklungsmodus werden Logs auch auf der Konsole ausgegeben.

Bei Fehlern in den Backend-Services leitet das Gateway die Fehlerantworten unverändert weiter. Falls ein Service nicht erreichbar ist, generiert das Gateway selbst eine entsprechende Fehlerantwort.

## Entwicklung und Erweiterung

### Hinzufügen neuer Service-Routen

Um neue Service-Routen hinzuzufügen:

1. Aktualisieren Sie die `service_mapping` in der `determine_target_service`-Funktion
2. Fügen Sie die entsprechenden Endpunkt-Definitionen in `utils/api_config.py` hinzu

### Erweiterte Funktionen

In zukünftigen Versionen sind folgende Erweiterungen geplant:

- Rate Limiting
- Caching
- JWT-Validierung direkt im Gateway
- Erweiterte Metriken und Monitoring
- Circuit Breaker-Pattern für robustere Fehlerbehandlung 