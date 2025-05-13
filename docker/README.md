# Docker-Setup für evAlarm-IoT Gateway

Diese Anleitung beschreibt, wie Sie das evAlarm-IoT Gateway-System mit Docker einrichten und starten können.

## Voraussetzungen

- [Docker](https://docs.docker.com/get-docker/) installiert
- [Docker Compose](https://docs.docker.com/compose/install/) installiert

## Schnellstart

1. Klonen Sie das Repository
   ```bash
   git clone https://github.com/yourusername/evalarm-iot-gateway.git
   cd evalarm-iot-gateway
   ```

2. Erstellen Sie eine `.env`-Datei basierend auf `.env.docker.example`
   ```bash
   cp .env.docker.example .env
   # Bearbeiten Sie die .env-Datei nach Bedarf
   ```

3. Starten Sie die Services mit Docker Compose
   ```bash
   docker-compose up -d
   ```

4. Überprüfen Sie, ob alle Services laufen
   ```bash
   docker-compose ps
   ```

## Zugriff auf die Services

- **Frontend**: http://localhost
- **API-Gateway**: http://localhost:8000
- **API-Service**: http://localhost:8080
- **Auth-Service**: http://localhost:8081
- **Processor-Service**: http://localhost:8082
- **MongoDB**: mongodb://localhost:27017
- **Redis**: redis://localhost:6379

## Entwicklungshinweise

Im Entwicklungsmodus werden Volumes für den Code eingerichtet, sodass Änderungen direkt übernommen werden (Hot-Reload):

- Backend-Code: Änderungen werden sofort wirksam (Flask-Debug-Modus)
- Frontend-Code: Bei Verwendung des Frontend-Entwicklungsservers werden Änderungen sofort übernommen

## Logs anzeigen

```bash
# Logs aller Services
docker-compose logs -f

# Logs eines bestimmten Service
docker-compose logs -f gateway
```

## Container neu starten

```bash
# Alle Services neu starten
docker-compose restart

# Einen bestimmten Service neu starten
docker-compose restart gateway
```

## Container stoppen

```bash
# Alle Services stoppen, aber Container und Volumes behalten
docker-compose stop

# Alle Services stoppen und Container entfernen (Volumes bleiben erhalten)
docker-compose down

# Alle Services stoppen, Container und Volumes entfernen
docker-compose down -v
```

## Produktionsdeployment

Für die Produktion sollten Sie zusätzliche Maßnahmen ergreifen:

1. Anpassen der Umgebungsvariablen in `.env` für Produktion
   ```
   FLASK_ENV=production
   # Sichere Passwörter für Redis und MongoDB setzen
   ```

2. Sicherheitsmaßnahmen implementieren:
   - HTTPS-Terminierung mit Letsencrypt/Certbot
   - Firewall-Konfiguration
   - Netzwerksicherheit überprüfen

3. Backup-Strategie für die Volumes einrichten

## Fehlersuche

Wenn ein Container nicht startet oder fehlschlägt:

1. Überprüfen Sie die Logs des spezifischen Services:
   ```bash
   docker-compose logs gateway
   ```

2. Stellen Sie sicher, dass alle abhängigen Services laufen:
   ```bash
   docker-compose ps
   ```

3. Überprüfen Sie die Netzwerkkonnektivität zwischen den Containern:
   ```bash
   docker-compose exec gateway ping redis
   ```

4. Überprüfen Sie die Umgebungsvariablen:
   ```bash
   docker-compose exec gateway env
   ``` 