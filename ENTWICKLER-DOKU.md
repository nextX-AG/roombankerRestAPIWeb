# Entwicklerdokumentation: evAlarm-IoT Gateway Management System

Diese Dokumentation richtet sich an Entwickler, die am evAlarm-IoT Gateway Management System arbeiten. Sie enthält Informationen zur Architektur, Codestandards, Best Practices und Refactoring-Guidelines.

## Inhaltsverzeichnis

1. [Systemarchitektur](#systemarchitektur)
2. [Codeorganisation](#codeorganisation)
3. [Entwicklungsumgebung](#entwicklungsumgebung)
4. [Best Practices](#best-practices)
5. [Refactoring-Guidelines](#refactoring-guidelines)
6. [Debugging und Troubleshooting](#debugging-und-troubleshooting)
7. [Deployment](#deployment)

## Systemarchitektur

Das evAlarm-IoT Gateway Management System besteht aus mehreren Komponenten, die zusammenarbeiten:

### Backend-Komponenten

1. **API-Server (app.py, Port 8080)**
   - Haupteinstiegspunkt für API-Anfragen
   - Verwaltet Kunden, Gateways und Geräte
   - Dient als Datenbank-Schnittstelle
   - Implementiert in Flask

2. **Message Processor (message_processor.py, Port 8081)**
   - Verarbeitet eingehende Nachrichten 
   - Leitet Nachrichten an die Message Queue weiter
   - Stellt Endpunkte für Template-Management bereit
   - Implementiert in Flask

3. **Message Worker (message_worker.py, Port 8083)**
   - Verarbeitet Nachrichten aus der Message Queue
   - Transformiert Nachrichten mit Templates
   - Leitet transformierte Nachrichten an evAlarm weiter
   - Implementiert in Flask mit Redis als Message Queue

4. **Auth Service (auth_service.py, Port 8082)**
   - Verwaltet Benutzerauthentifizierung
   - Implementiert JWT-basierte Authentifizierung
   - Implementiert in Flask

### Frontend-Komponenten

1. **React-App (frontend/src)**
   - Single-Page-Application
   - Verwendet React, React Router, Bootstrap
   - Kommuniziert mit den Backend-Services über HTTP-API

### Datenbanken

1. **MongoDB**
   - Speichert persistente Daten (Kunden, Gateways, Geräte)
   - Zugegriffen über PyMongo

2. **Redis**
   - Dient als Message Queue
   - Zwischenspeichert Verarbeitungsstatus
   - Verwendet für Worker-Kommunikation

### Problemstellen der aktuellen Architektur

Die aktuelle Architektur hat folgende Probleme, die im Refactoring adressiert werden sollen:

1. **Verteilte API-Endpunkte**
   - Endpunkte sind auf mehrere Services verteilt
   - Inkonsistente API-Struktur und -Fehlerbehandlung
   - Komplexe NGINX-Konfiguration erforderlich

2. **Zirkuläre Abhängigkeiten**
   - Verschiedene Module importieren sich gegenseitig
   - Erschwert Erweiterbarkeit und Testbarkeit

3. **Inkonsistente Fehlerbehandlung**
   - Unterschiedliche Fehlerformate zwischen Services
   - Mangelndes zentrales Logging

4. **Duplizierter Code**
   - Ähnliche Funktionen in verschiedenen Diensten implementiert
   - Erschwert die Wartung

## Codeorganisation

Die aktuelle Codeorganisation folgt dieser Struktur:

```
roombankerRestAPIWeb/
├── api/                   # Backend-Services
│   ├── app.py             # Hauptanwendung (Port 8080)
│   ├── auth_service.py    # Authentifizierungsdienst (Port 8082)
│   ├── message_processor.py # Nachrichtenverarbeitung (Port 8081)
│   ├── message_worker.py  # Nachrichtenverarbeitung Worker (Port 8083)
│   ├── message_queue.py   # Redis Queue-Implementierung
│   ├── models.py          # Datenmodelle für MongoDB
│   └── routes.py          # API-Routen
├── data/                  # Datenspeicherung
├── frontend/              # React-Frontend
│   ├── dist/              # Build-Ausgabe
│   ├── public/            # Statische Dateien
│   └── src/               # Quellcode
│       ├── assets/        # Bilder und Assets
│       ├── components/    # React-Komponenten
│       ├── context/       # React-Kontexte
│       ├── pages/         # Seitenkomponenten
│       └── styles/        # CSS-Dateien
├── gateway/               # Gateway-Skripte und -Dokumente
├── templates/             # Transformations-Templates
├── utils/                 # Hilfsfunktionen
│   └── template_engine.py # Template-Engine
└── venv/                  # Python-Virtuelle Umgebung
```

### Geplante Codeorganisation nach Refactoring

Die Zielstruktur nach dem Refactoring sieht so aus:

```
roombankerRestAPIWeb/
├── api/                   # Backend-Services
│   ├── app.py             # Hauptanwendung mit API-Gateway
│   ├── services/          # Service-Module nach Funktion
│   │   ├── __init__.py    
│   │   ├── auth.py        # Authentifizierung
│   │   ├── customers.py   # Kundenverwaltung
│   │   ├── devices.py     # Geräteverwaltung
│   │   ├── gateways.py    # Gateway-Verwaltung
│   │   ├── health.py      # Gesundheitschecks
│   │   ├── messages.py    # Nachrichtenverarbeitung
│   │   ├── templates.py   # Template-Verwaltung
│   │   └── queue.py       # Queue-Management
│   ├── models/            # Datenmodelle
│   │   ├── __init__.py
│   │   ├── customer.py
│   │   ├── device.py
│   │   ├── gateway.py
│   │   └── user.py
│   ├── middleware/        # Middleware-Funktionen
│   │   ├── __init__.py
│   │   ├── auth.py        # Authentifizierung
│   │   └── logging.py     # Logging
│   └── config/            # Konfiguration
│       ├── __init__.py
│       ├── routes.py      # Routendefinitionen
│       └── nginx.py       # NGINX-Konfigurationsgenerator
├── client/                # API-Client-Bibliothek
├── data/                  # Datenspeicherung
├── frontend/              # React-Frontend (bleibt gleich)
├── gateway/               # Gateway-Skripte (bleibt gleich)
├── templates/             # Transformations-Templates
├── utils/                 # Hilfsfunktionen
└── tests/                 # Automatisierte Tests
```

## Entwicklungsumgebung

### Anforderungen

- Python 3.10+
- Node.js 20+
- MongoDB 5.0+
- Redis 6.0+

### Setup

1. **Virtuelle Umgebung einrichten**

   ```bash
   python3 -m venv venv
   source venv/bin/activate  # Unter Windows: venv\Scripts\activate
   pip install -r api/requirements.txt
   ```

2. **Frontend-Abhängigkeiten installieren**

   ```bash
   cd frontend
   npm install
   cd ..
   ```

3. **Datenbanken starten**

   Stelle sicher, dass MongoDB und Redis laufen:

   ```bash
   # MongoDB Status prüfen
   mongod --version

   # Redis Status prüfen
   redis-cli ping
   ```

4. **Services starten**

   ```bash
   # Hauptanwendung
   python api/app.py

   # Auth Service (separates Terminal)
   python api/auth_service.py

   # Message Processor (separates Terminal)
   python api/message_processor.py

   # Message Worker (separates Terminal)
   python api/message_worker.py
   ```

5. **Frontend-Entwicklungsserver starten**

   ```bash
   cd frontend
   npm run dev
   ```

## Best Practices

### Allgemeine Prinzipien

1. **Single Responsibility Principle**
   - Jedes Modul/Klasse sollte nur eine Verantwortung haben
   - Funktionen sollten nur eine Aufgabe erfüllen

2. **Dependency Injection**
   - Abhängigkeiten von außen übergeben statt hart zu kodieren
   - Verbessert Testbarkeit und Flexibilität

3. **Konfiguration über Umgebungsvariablen**
   - Keine hartkodierten Konfigurationswerte
   - Verwende `os.environ.get()` mit Standardwerten

### Python-Code

1. **Typ-Annotationen verwenden**
   - Verwende Python-Typ-Annotationen für bessere Dokumentation
   - Hilft bei der Fehlererkennung und IDE-Unterstützung

   ```python
   def process_gateway(gateway_id: str, status: bool = True) -> dict:
       # Implementierung
       return {"id": gateway_id, "processed": status}
   ```

2. **Fehlerbehandlung**
   - Verwende aussagekräftige Ausnahmen
   - Logge Fehler mit Kontext
   - Zeige dem Benutzer nur nötige Informationen

   ```python
   try:
       result = process_data(data)
   except ValueError as e:
       logger.error(f"Fehler bei der Datenverarbeitung: {str(e)}")
       return jsonify({"error": "Ungültige Daten"}), 400
   except Exception as e:
       logger.exception("Unerwarteter Fehler")
       return jsonify({"error": "Interner Serverfehler"}), 500
   ```

3. **Logging**
   - Verwende strukturiertes Logging
   - Verschiedene Log-Level (DEBUG, INFO, WARNING, ERROR)
   - Kontextinformationen in Logs einbeziehen

   ```python
   logger.info(f"Verarbeite Gateway {gateway_id}")
   logger.error(f"Fehler bei Gateway {gateway_id}: {str(e)}")
   ```

### Frontend-Code

1. **Komponentenstruktur**
   - Funktionale Komponenten mit Hooks verwenden
   - Kleine, wiederverwendbare Komponenten erstellen
   - Props mit PropTypes dokumentieren

2. **API-Aufrufe**
   - Zentrale API-Client-Funktionen verwenden
   - Axios für HTTP-Requests einsetzen
   - Fehlerbehandlung konsistent implementieren

3. **State-Management**
   - React Context für globalen Zustand
   - useState für lokalen Zustand
   - useEffect für Seiteneffekte

## Refactoring-Guidelines

### Ziele des Refactorings

1. **API-Gateway-Pattern**
   - Zentraler Einstiegspunkt für alle API-Anfragen
   - Einheitliche Fehlerbehandlung und Logging
   - Vereinfachtes Routing

2. **Modulare Services**
   - Funktionale Aufteilung statt Service-Aufteilung
   - Klare Schnittstellen zwischen Modulen
   - Reduzierte Abhängigkeiten

3. **Verbesserte Fehlerbehandlung**
   - Einheitliches Fehlerformat
   - Zentrales Logging
   - Benutzerfreundliche Fehlermeldungen

4. **Automatisierte Tests**
   - Unit-Tests für kritische Funktionen
   - Integrationstests für API-Endpunkte
   - End-to-End-Tests für wichtige Workflows

### Refactoring-Prozess

1. **API-Endpunkte katalogisieren**
   - Alle vorhandenen Endpunkte dokumentieren
   - Endpunkte nach Funktionalität gruppieren
   - Inkonsistenzen identifizieren

2. **Servicefunktionen extrahieren**
   - Geschäftslogik von Route-Handlern trennen
   - Servicefunktionen nach Domäne gruppieren
   - Gemeinsame Hilfsfunktionen identifizieren

3. **API-Gateway implementieren**
   - Zentralen Router erstellen
   - Dynamisches Routing zu Service-Funktionen
   - Fehlerbehandlung und Logging integrieren

4. **Automatisierte Tests schreiben**
   - Tests für kritische Geschäftslogik
   - API-Tests für wichtige Endpunkte
   - Regressionstests für bekannte Fehler

5. **Schrittweise Umstellung**
   - Jeden Service einzeln migrieren
   - Nach jeder Migration testen
   - Bei Bedarf Rollback-Mechanismus vorsehen

## Debugging und Troubleshooting

### Backend-Debugging

1. **Logging aktivieren**
   ```python
   import logging
   logging.basicConfig(level=logging.DEBUG)
   ```

2. **Debug-Endpunkte**
   - `/api/debug/state` für Zustandsinformationen
   - `/api/debug/config` für Konfigurationsübersicht

3. **Häufige Probleme**
   - Redis-Verbindungsprobleme: Prüfe Authentifizierung und Port
   - MongoDB-Fehler: Prüfe Verbindungsstring und Berechtigungen
   - CORS-Fehler: Prüfe CORS-Einstellungen und zulässige Origins

### Frontend-Debugging

1. **React Developer Tools**
   - Browser-Erweiterung für Komponenten-Inspektion
   - Zustand und Props überwachen

2. **Redux DevTools** (falls Redux verwendet wird)
   - Aktionen und Zustandsänderungen überwachen

3. **Netzwerkanalyse**
   - Browser-Entwicklertools > Netzwerk
   - API-Anfragen und -Antworten analysieren

## Deployment

### Produktionsumgebung

- Linux-Server (Ubuntu 22.04 LTS)
- NGINX als Reverse Proxy
- PM2 für Prozessverwaltung
- SSL mit Let's Encrypt

### Deployment-Prozess

1. **Code auf Server übertragen**
   ```bash
   git pull origin main
   ```

2. **Backend aktualisieren**
   ```bash
   source venv/bin/activate
   pip install -r api/requirements.txt
   ```

3. **Frontend bauen**
   ```bash
   cd frontend
   npm ci
   npm run build
   cd ..
   ```

4. **Services neustarten**
   ```bash
   pm2 restart iot-api
   pm2 restart iot-auth
   pm2 restart iot-processor
   pm2 restart iot-worker
   ```

### Automatisiertes Deployment

Die Anwendung wird durch einen GitHub-Webhook automatisch aktualisiert, wenn Änderungen am main-Branch vorgenommen werden.

1. **Webhook-Empfänger**
   - `/var/www/webhook/server.js` empfängt GitHub-Webhooks
   - Validiert den Webhook-Secret
   - Führt `deploy.sh` aus

2. **Deployment-Skript**
   - `/var/www/webhook/deploy.sh` führt die Deployment-Schritte aus
   - Pullt Code, installiert Abhängigkeiten, baut die Anwendung, startet Dienste neu

3. **Monitoring**
   - PM2 überwacht Prozesse und startet sie automatisch neu
   - Logs werden in `/var/log/pm2/` gespeichert

---

Diese Dokumentation wird kontinuierlich aktualisiert, um den aktuellen Entwicklungsstand widerzuspiegeln.

Letzte Aktualisierung: DATUM 