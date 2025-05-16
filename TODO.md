# TODO: evAlarm-IoT Gateway Management System

## 1. Datenbank-Erweiterung

### Datenbank-Setup
- [x] MongoDB für persistente Daten einrichten
- [x] Redis für Caching und Message Queue weiter nutzen
- [x] Verbindungskonfiguration und Absicherung

### Kundenmanagement
- [x] Tabelle/Collection für Kunden anlegen
  - Kunden-ID als Primärschlüssel
  - Name, Ansprechpartner, Kontaktdaten
  - API-Credentials für evAlarm-Schnittstelle (Benutzername/Passwort für Basic Auth)
  - evAlarm-Namespace
  - Status (aktiv, inaktiv)
  - Weiterleitung: sofort oder intervallbasiert
  - Notifikationseinstellungen
- [x] CRUD-API-Endpunkte für Kundenverwaltung
- [x] Zuordnung von Gateways zu Kunden

### Gateway-Verwaltung
- [x] Tabelle/Collection für Gateways anlegen
  - Gateway UUID als Primärschlüssel
  - Kunde (Foreign Key)
  - Name und Beschreibung
  - Status (online, offline, wartung)
  - Template-Zuordnung
  - Konfigurationseinstellungen
  - Letzter Kontakt
- [x] CRUD-API-Endpunkte für Gateway-Verwaltung
- [x] Automatisierte Status-Aktualisierung
- [x] Monitoring-System für Gateway-Status
- [x] Erkennung und Anzeige nicht zugeordneter Gateways
  - [x] Erkennung von Gateway-IDs aus empfangenen Nachrichten
  - [x] Abgleich mit registrierten Gateways
  - [x] Speicherung unregistrierter Gateway-IDs in separater Collection oder Cache

### Geräte-Verwaltung
- [x] Tabelle/Collection für Geräte anlegen
  - Interne ID als Primärschlüssel
  - Gateway-Zuordnung (Foreign Key)
  - Geräte-ID des Herstellers (aus subdevicelist)
  - Typ (Sensor, Kontakt, etc.) basierend auf empfangenen Werten
  - Name und Beschreibung (automatisch generiert, manuell anpassbar)
  - Status-Felder basierend auf empfangenen Werten
  - Letzter Status-Update
- [x] Automatische Geräteerkennung bei Gateway-Kommunikation
  - Parsen der subdevicelist und Anlegen neuer Geräte
  - Aktualisierung bestehender Geräte
- [x] Gerätestatus-Verlauf speichern

### Template-Verwaltung
- [x] System für JavaScript-Transformationen implementieren
  - Upload-Funktionalität für JS-Dateien
  - Sichere Sandbox-Ausführung mit VM2
  - Versionierung der Transformationsskripte
  - Standardvorlage für evAlarm-Format erstellen
- [x] Test-Framework für Transformationen
  - Test mit Beispieldaten
  - Validierung gegen evAlarm-API-Format
- [x] Integration mit JSONata für vereinfachte Transformationen

## 2. Backend-Erweiterung

### Routing-System
- [x] Dynamisches Routing basierend auf Kundenstruktur implementieren
  - Gateway → Kunde → evAlarm-API
  - Für unseren Anwendungsfall: Ausschließliche Verwendung des evAlarm-Formats
- [x] Bestehende Templates mit Kundendaten verknüpfen
  - Verwendung der Kunden-Credentials für API-Authentifizierung
  - Einfügen des korrekten Namespace aus Kundendaten
- [x] Dual-Mode-Weiterleitung implementieren
  - Sofortige Übermittlung (Echtzeit) für Alarme
  - Optional: Gepuffertes Senden (z.B. alle 5 Minuten) für Status-Updates
- [x] Authentifizierungssystem für evAlarm-API
  - Basic Auth mit kundenspezifischen Credentials
  - Header-Verwaltung (X-EVALARM-API-VERSION)
- [x] Retry-Mechanismus bei Übertragungsfehlern
- [x] Backup-Storage für nicht zustellbare Nachrichten

### Monitoring & Alarmierung
- [x] Gateway-Statusüberwachung
- [x] Automatische Benachrichtigung bei Offline-Status
- [x] Protokollierung aller Aktivitäten und API-Aufrufe
- [x] Fehlerbehandlung und -reporting

## 3. Frontend-Erweiterung

### Kundenmanagement-UI
- [x] Kundenübersicht mit Such- und Filterfunktion
- [x] Kunden-Detailseite
  - Gateway-Zuordnung
  - evAlarm-API-Konfiguration (Credentials, Namespace)
  - Kontaktdaten
- [x] Kundenzugangsmanagement

### Gateway-Management-UI
- [x] Dashboard-Übersicht aller Gateways mit Status
- [x] Gateway-Detailseite
  - Kundenzuordnung
  - Template-Zuweisung
  - Konfigurationseinstellungen
  - Geräteübersicht
- [x] Gateway-Hinzufügen/Bearbeiten-Dialog
- [x] Monitoring-Widgets für Gateway-Status
- [x] Verbesserter Gateway-Registrierungsprozess
  - [x] API-Endpunkt für unregistrierte Gateways implementieren (`/api/gateways/unassigned`)
  - [x] Dropdown-Liste nicht zugeordneter Gateways im Hinzufügen/Bearbeiten-Dialog
  - [x] Automatisches Befüllen des UUID-Felds bei Auswahl
  - [x] Anzeige zusätzlicher Informationen (erster Kontakt, Nachrichtenanzahl)

### Geräte-Management-UI
- [x] Automatisch erkannte Geräte anzeigen
- [x] Geräteliste mit Filterung und Suche
- [x] Gruppierung nach Gateway und Kunde
- [x] Statusanzeige und Verlaufsdiagramme
- [x] Gerätedetailseite mit Ereignisverlauf
- [x] Manuelle Anpassungsmöglichkeiten (Namen, Beschreibungen)

### Template-Management-UI
- [x] JavaScript-Editor für Transformationen
- [x] Vorschaufunktion mit Testdaten aus sample.md
- [x] Vorschau der evAlarm-API-Anfrage
- [x] Versionsvergleich und Rollback-Möglichkeit
- [x] JSONata-Integration für vereinfachte Transformationen

### Frontend-Verbesserungen

- [x] **API-Client-Generator**
  - [x] Zentrale API-Client Implementierung (`frontend/src/api.js`)
  - [x] Einheitliches Error-Handling
  - [x] Konsistente API-Aufrufe über alle Komponenten

- [x] **Zentralisierte API-Konfiguration**
  - [x] Konfigurierbare Basis-URL für verschiedene Umgebungen
  - [x] Vereinheitlichung aller API-Aufrufe

## 4. Benutzerverwaltung & Sicherheit

- [x] Benutzerrollen für verschiedene Zugriffsebenen
  - Administrator (voller Zugriff)
  - Operator (Überwachung und Konfiguration)
  - Betrachter (nur Lesezugriff)
- [x] API-Schlüsselverwaltung für externe Systeme
- [x] Sichere Speicherung der Kundenzugänge für evAlarm-API
- [x] Audit-Logging für Sicherheitsrelevante Aktionen
- [x] Datenverschlüsselung für sensible Informationen

## Implementierungsplan

### Phase 1: Kundenverwaltung & Datenbank (Priorität: Hoch)
- [x] MongoDB-Integration
- [x] Kundenmanagement-System mit evAlarm-API-Konfiguration
- [x] Gateway-Zuordnung zu Kunden
- [x] Grundlegende UI-Komponenten

### Phase 2: Gateway & Gerätemanagement (Priorität: Hoch)
- [x] Automatische Geräteerkennung aus Nachrichten
- [x] Gateway-Statusüberwachung
- [x] Gerätemanagement-UI
- [x] Verbesserter Gateway-Onboarding-Prozess (Priorität: Mittel)
  - [x] Erkennung und Anzeige unregistrierter Gateways
  - [x] Vereinfachte Registrierung über Dropdown-Liste

### Phase 3: Transformationen & Routing (Priorität: Hoch)
- [x] Dynamisches Routing zur evAlarm-API
- [x] Sofortige Weiterleitung an evAlarm-API
- [x] Konfigurierbare Routing-Regeln
- [x] JavaScript-Transformation mit Upload

### Phase 4: Monitoring & Optimierung (Priorität: Mittel)
- [x] Umfassendes Monitoring
- [x] Benachrichtigungssystem
- [x] Erweiterte Reporting-Funktionen

## 5. UI-Optimierung und Vereinheitlichung (Priorität: Hoch, AKTUELLER TASK)

### Systematischer Ansatz für einheitliches UI-System
- [x] **CSS-Bereinigung**
  - [x] Reduzieren auf drei CSS-Dateien:
    - `global.css` - Allgemeine Stile und Bootstrap-Erweiterungen
    - `App.css` - Minimale anwendungsspezifische Stile
    - `index.css` - Nur grundlegende Browser-Resets
  - [x] Alle anderen komponentenspezifischen CSS-Dateien entfernen
  - [x] Konsequente Verwendung von Bootstrap-Klassen für Layouts

- [x] **Einheitliches Seitenlayout**
  - [x] Jede Seite nach `PageTemplate.jsx` anpassen mit:
    - Konsistenter Seitentitel mit Icon
    - Konsistente Card-Struktur für Inhalte
    - Einheitliche Abstände (mb-4, etc.)

- [ ] **Komponenten-Standardisierung**
  - [x] Navbar & Footer: Einheitlich und global gestylt
  - [ ] GatewayStatusIcons: Als wiederverwendbare Komponente überall identisch einsetzen
  - [ ] Formulare: Überall Bootstrap-Formularklassen verwenden

- [ ] **Entwicklungsprozess**
  - [x] Erst eine Beispielseite vollständig umsetzen (z.B. Dashboard)
  - [ ] Dann systematisch alle anderen Seiten nach diesem Muster anpassen
  - [ ] Gemeinsame Komponenten extrahieren wo sinnvoll

- [ ] **Qualitätssicherung**
  - [ ] Desktop- und Mobile-Ansicht für jede Seite prüfen
  - [ ] Konsistenz zwischen allen Seiten sicherstellen
  - [ ] Unnötige CSS-Regeln entfernen

### Phase 1: Grundlagen (Priorität: Hoch)
- [x] PageTemplate.jsx als verbindliche Referenz etablieren
- [x] Global.css optimieren und alle redundanten Stile entfernen

### Phase 2: Systematische Umsetzung (Priorität: Hoch)
- [x] Dashboard nach einheitlichem Muster umsetzen
- [x] Gateways-Seite anpassen
- [x] GatewayDetail-Seite anpassen
- [x] Alle weiteren Seiten systematisch vereinheitlichen
  - [x] Messages-Seite anpassen
  - [x] Customers-Seite anpassen
  - [x] Templates-Seite anpassen
  - [x] Devices-Seite anpassen
  - [x] Settings-Seite anpassen

### Phase 3: Abschluss und Tests (Priorität: Mittel)
- [ ] Cross-Browser-Tests
- [ ] Responsive Design-Überprüfung
- [ ] Finale Optimierung und Cleanup

## 6. Refactoring und Architektur-Verbesserungen

### Zentralisierung der API-Struktur

- [x] **Vereinheitlichung des API-Formats**
  - [x] Einheitliches Format `/api/v1/resource/action` für alle Routen
  - [x] Konsistentes Response-Format `{status, data, error}`
  - [x] Message Worker API-Endpunkte angepasst

- [x] **API-Gateway-Pattern implementieren**
  - [x] Zentraler API-Gateway-Dienst, der alle Anfragen verarbeitet
  - [x] Dynamische Route-Weiterleitung zu spezifischen Service-Funktionen
  - [x] Einheitliche Fehlerbehandlung und Logging

- [x] **Zentrale Konfigurationsverwaltung**
  - [x] Zentrale API-Konfigurationsdatei (`utils/api_config.py`) erstellt
  - [x] Einheitliche Endpunktverwaltung über alle Services hinweg
  - [x] API-Versionsmanagement (aktuell v1)

- [ ] **Service-Module reorganisieren**
  - [ ] Aufteilung nach Funktionen statt nach Diensten
  - [ ] Gemeinsame Schnittstellen zwischen Modulen
  - [ ] Weniger Abhängigkeiten und zirkuläre Importe

- [ ] **Automatisierte NGINX-Konfiguration**
  - [ ] Generator für NGINX-Konfiguration aus Route-Definitionen
  - [ ] Automatische Aktualisierung bei Deployment
  - [ ] Vermeidung von manuellen Konfigurationsfehlern

- [ ] **API-Framework evaluieren und implementieren**
  - [ ] FastAPI als modernen Ersatz für Flask evaluieren
  - [ ] Flask-RestX für bestehende Flask-Anwendung prüfen
  - [ ] Evaluierungskriterien definieren

- [ ] **Zentrale Konfigurationsverwaltung**
  - [ ] Umgebungsvariablen einheitlich verwalten
  - [ ] Konfigurationsdateien pro Umgebung (Entwicklung, Produktion)
  - [ ] Sichere Speicherung von Geheimnissen (z.B. mit python-dotenv)

### Monolithische Architektur mit logischer Trennung

- [ ] **Restrukturierung des Projekts**
- [ ] **Einheitliche Prozessverwaltung**

### Implementierungsplan

- [x] **Phase 1: Evaluation und Planung**
  - [x] Erstellung der ARCHITECTURE.md-Datei zur Dokumentation des API-Designs
  - [x] Analyse des bestehenden Codes auf Refactoring-Möglichkeiten
  - [x] Detaillierter Migrationsplan mit Prioritäten

- [x] **Phase 2: Minimale Implementation**
  - [x] Vereinheitlichung der API-Routen im Message Worker
  - [x] Zentrale API-Konfiguration implementiert (`utils/api_config.py`)
  - [x] Frontend-API-Client erstellt (`frontend/src/api.js`)
  - [x] Vereinheitlichung der API-Routen im Auth-Service
  - [x] Vereinheitlichung der API-Routen im API-Service
  - [x] Vereinheitlichung der API-Routen im Processor-Service
  - [x] NGINX-Konfigurationsgenerator implementieren (`utils/nginx_config_generator.py`)
  - [x] Erste Dienste in das neue Format umziehen
    - [x] Gemeinsame API-Handler erstellt (`utils/api_handlers.py`)
    - [x] Auth-Service in das neue Format umgestellt
    - [x] API-Service in das neue Format umgestellt
    - [x] Processor-Service in das neue Format umgestellt
    - [x] Worker-Service in das neue Format umstellen

- [ ] **Phase 3: Vollständige Umstellung**
  - [ ] Alle Dienste migrieren
  - [ ] Legacy-Code entfernen
  - [ ] Vollständige Testabdeckung sicherstellen

- [ ] **Phase 4: Optimierung**
  - [ ] Performance-Benchmarking
  - [ ] Code-Qualitätsmetriken erheben
  - [ ] Sicherheitsüberprüfung 

## 7. Docker-Implementierung (HOHE PRIORITÄT)

### Containerisierung der Komponenten
- [x] **Separate Container für einzelne Dienste**
  - [x] API-Gateway Container (Port 8000) erstellen
  - [x] API-Service Container (Port 8080) erstellen
  - [x] Auth-Service Container (Port 8081) erstellen
  - [x] Processor-Service Container (Port 8082) erstellen
  - [x] Frontend-Container mit Node.js erstellen
  - [x] Redis Container einbinden
  - [x] MongoDB Container einbinden

- [x] **Docker Compose für Entwicklungsumgebung**
  - [x] docker-compose.yml erstellen mit allen Services
  - [x] Umgebungsvariablen in .env Datei auslagern
  - [x] Sinnvolle Defaults für Entwicklungsumgebung setzen
  - [x] Container-Netzwerk für interne Kommunikation konfigurieren
  - [x] Volume-Mounts für Persistenz und Entwicklung einrichten

- [x] **Einheitliche Dockerfile-Struktur**
  - [x] Python-Services mit gemeinsamer Basis-Image
  - [x] Frontend mit Node-Basis für Entwicklung
  - [x] Health Checks für alle Services implementieren

- [x] **Container-Kommunikation optimieren**
  - [x] Interne Service-Discovery über Container-Namen statt localhost
  - [x] API-Gateway als zentraler Service für Kommunikation zwischen Komponenten
  - [x] Docker-spezifische Konfiguration in api_config.py hinzugefügt

### Deployment-Strategie mit Docker
- [x] **Entwicklungsumgebung**
  - [x] Schnelles Setup mit Docker Compose
  - [x] Zugriff auf Services über API-Gateway
  - [x] Vereinfachte Logging und Fehlerdiagnose

- [ ] **Testumgebung**
  - [ ] Docker Compose für Integrationstests
  - [ ] CI/CD-Pipeline mit automatischen Tests in Containern

- [ ] **Produktionsumgebung**
  - [ ] Docker Compose für einfaches Deployment
  - [ ] Sicherheitsoptimierungen für Produktionsumgebung
  - [ ] Backups und Datenwiederherstellungslösungen

### Nächste Schritte
- [ ] **Optimierungen**
  - [ ] Multi-Stage-Builds für optimierte Container-Größe
  - [ ] Docker Volume-Management verbessern
  - [ ] Performance-Tuning für Redis und MongoDB Container

- [ ] **Erweiterungen**
  - [ ] Monitoring und Health-Checks verbessern
  - [ ] Container-Orchestrierung für Skalierung evaluieren
  - [ ] Automatische Backups der Datenbanken konfigurieren

## 8. Bugfixing nach Refactoring (HÖCHSTE PRIORITÄT)

### API-Gateway und Routing-Probleme
- [x] **CORS-Konfiguration korrigieren**
  - [x] CORS-Headers im API-Gateway für alle Services aktivieren
  - [x] CORS-Präflight-Anfragen (OPTIONS) korrekt behandeln
  - [x] CORS-Konfiguration in allen Microservices vereinheitlichen

- [x] **API-Routing-Probleme beheben**
  - [x] Login-Route korrigieren
  - [x] API-Weiterleitungsregeln im Gateway überprüft und korrigiert
  - [x] Frontend API-Client auf neue Routen angepasst

- [x] **API-Endpunkt-Konsistenz**
  - [x] Frontend-API-Aufrufe mit Backend-Endpunkten abgeglichen
  - [x] Überprüfung auf doppelte Implementierungen
  - [x] Sicherstellen, dass v1 überall konsistent verwendet wird
  - [x] Dashboard-Komponente auf richtige API-Endpunkte angepasst

- [x] **Token-Management verbessert**
  - [x] Konsistente Verwendung von `authToken` statt `auth_token`
  - [x] Auth-Header korrekt gesetzt für alle Anfragen

### Docker-Kompatibilität sicherstellen (HÖCHSTE PRIORITÄT)

- [x] **Docker-spezifische Konfiguration überprüft**
  - [x] Bestätigt, dass `FLASK_ENV=docker` in allen Containern korrekt gesetzt ist
  - [x] Überprüft, ob `utils/api_config.py` die Docker-Hosts korrekt verwendet
  - [x] Bestätigt, dass die Docker-Container-Namen mit den in `HOSTS['docker']` definierten übereinstimmen
  - [x] Worker-Service in Processor integriert und Routing angepasst

- [x] **Netzwerk-Konfiguration in Docker validiert**
  - [x] Kommunikation zwischen Containern über Container-Namen (statt localhost) getestet
  - [x] Sichergestellt, dass das API-Gateway alle Services im Docker-Netzwerk erreichen kann
  - [x] Volume-Mounts und Dateipfade in Docker überprüft

- [x] **CORS für Docker-Umgebung optimiert**
  - [x] CORS-Konfiguration dynamisch über Umgebungsvariablen gesteuert
  - [x] `ALLOWED_ORIGINS` für alle Umgebungen konfigurierbar gemacht
  - [x] Sichergestellt, dass sowohl localhost als auch 127.0.0.1 funktionieren
  - [x] Doppelte CORS-Header entfernt, die zu Browser-Fehlern führten

- [x] **Frontend-Konfiguration für Docker optimiert**
  - [x] Frontend API-Client für Docker-Umgebung optimiert
  - [x] Korrekte URLs für API-Zugriffe in Frontend-Config eingerichtet
  - [x] Hostname-Auflösung für Browser -> Docker korrekt behandelt

### Aktuelle Probleme (Zu bearbeiten)

- [x] **Dashboard-Status korrekt anzeigen**
  - [x] API-Server-Status korrekt anzeigen
  - [x] Message Processor-Status korrekt anzeigen
  - [x] Testnachricht-Funktionalität implementieren

- [x] **API-Endpunkte implementieren**
  - [x] `/api/v1/health` Endpunkt im API-Service implementieren
  - [x] `/api/v1/system/health` Endpunkt im Processor-Service implementieren
  - [x] `/api/v1/system/endpoints` und `/api/v1/templates` implementieren

- [ ] **Frontend-Komponenten aktualisieren**
  - [x] Sicherstellen, dass alle Komponenten die korrekten API-Routen verwenden
  - [ ] Überprüfen, dass die Datenstrukturen korrekt verarbeitet werden
  - [ ] Fehlerbehandlung in Frontend-Komponenten verbessern

## 9. Systematische Überprüfung des Frontend (HÖCHSTE PRIORITÄT)

Eine detaillierte Überprüfung aller Frontend-Komponenten ist notwendig, um die Konsistenz und Funktionalität sicherzustellen.

### Grundlegende API-Kompatibilität überprüfen

- [x] **API-Versionierung durchsetzen**
  - [x] Alle Frontend-API-Aufrufe auf `/api/v1/...` umstellen
  - [x] Verwendung der Funktionen aus api.js erzwingen
  - [x] Keine direkten axios/fetch-Aufrufe ohne zentrale API-Client-Nutzung

- [x] **Antwortformat standardisieren**
  - [x] Einheitliches Format `{status, data, error}` für alle API-Antworten
  - [x] Frontend auf konsistentes Handling dieser Struktur umstellen
  - [x] Error-Handling in jeder Komponente überprüfen

### Seiten-für-Seite-Überprüfung

- [x] **Dashboard**
  - [x] API-Status-Anzeige prüfen
  - [x] Message-Processor-Status verifizieren
  - [x] Testnachricht-Funktionalität validieren
  - [x] Messages-Liste korrekt anzeigen

- [x] **Kundenverwaltung**
  - [x] Kunden-Erstellung mit vollständigen Daten testen
  - [x] Kundenliste API-Aufruf korrigieren (v1-Pfad)
  - [x] Kunden-Bearbeitung auf korrekten API-Pfad umstellen
  - [x] Gateway-Zuordnung überprüfen
  - [x] evAlarm API-Konfiguration validieren

- [x] **Gateway-Verwaltung**
  - [x] Gateway-Erstellung testen
  - [x] Gateway-Liste Abruf überprüfen
  - [x] Gateway-Status-Anzeige prüfen
  - [x] Kundenverknüpfung validieren
  - [x] Nicht zugeordnete Gateways anzeigen

- [ ] **Geräte-Übersicht**
  - [ ] Vollständigen API-Pfad für Geräteliste verwenden
  - [ ] Gerätestatus-Anzeige prüfen
  - [ ] Gateway-Zuordnung bei Geräten validieren

- [ ] **Nachrichtenverwaltung**
  - [ ] Nachrichtenliste mit korrektem v1-Pfad abrufen
  - [ ] Nachrichtendetails korrekt anzeigen
  - [ ] Testnachricht-Erzeugung prüfen

- [ ] **Vorlagen-Verwaltung**
  - [ ] Template-Liste über `/api/v1/templates` abrufen
  - [ ] Template-Test-Funktionalität überprüfen

- [ ] **Login & Authentifizierung**
  - [ ] Login-Prozess mit `/api/v1/auth/login` validieren
  - [ ] Token-Management überprüfen
  - [ ] Logout-Funktionalität testen

### Gemeinsame Komponenten

- [ ] **Status-Icons**
  - [ ] Konsistente Verwendung der Status-Icons
  - [ ] Einheitliche Darstellung über alle Seiten

- [ ] **Tabellen & Listen**
  - [ ] Einheitliches Tabellen-Layout
  - [ ] Konsistente Sortier- und Filterfunktionen
  - [ ] Standard-Paginierung wo notwendig

- [ ] **Formular-Komponenten**
  - [ ] Validierung in allen Formularen
  - [ ] Fehlermeldungen einheitlich darstellen
  - [ ] Sicherstellung der Barrierefreiheit

### Fehlerbehandlung

- [ ] **Konsistente Fehlerbehandlung**
  - [ ] API-Fehlerbehandlung in allen Komponenten
  - [ ] Benutzerfreundliche Fehlermeldungen
  - [ ] Fallback-Inhalte bei API-Ausfällen

- [ ] **Netzwerkfehler**
  - [ ] Timeout-Management
  - [ ] Automatische Wiederholungsversuche
  - [ ] Offline-Status-Anzeige

### Einheitliches CSS und Design

- [ ] **Design-System durchsetzen**
  - [ ] Bootstrap-Klassen konsistent verwenden
  - [ ] Custom-CSS minimieren
  - [ ] Einheitliche Farbpalette

- [ ] **Responsives Design**
  - [ ] Mobile-Ansicht für alle Seiten überprüfen
  - [ ] Flexbox/Grid-Layout durchgehend verwenden
  - [ ] Tablet-Darstellung testen

### Implementierungsplan

- [ ] **Phase 1: Analyse und Dokumentation**
  - [ ] Status Quo jeder Komponente dokumentieren
  - [ ] Hauptprobleme identifizieren
  - [ ] Prioritätenliste erstellen

- [ ] **Phase 2: API-Refactoring**
  - [ ] Alle API-Aufrufe zentralisieren 
  - [ ] Versionierte Pfade überall verwenden
  - [ ] Einheitliches Antworthandling

- [ ] **Phase 3: Komponenten-Update**
  - [ ] Jede Seite systematisch korrigieren
  - [ ] Unit-Tests für kritische Funktionen schreiben
  - [ ] Wiederverwendbare Komponenten extrahieren

- [ ] **Phase 4: Testrunde**
  - [ ] Manuelle Tests aller Funktionen
  - [ ] Automatisierte Tests implementieren
  - [ ] Browserübergreifende Tests

## 10. UI-Daten-Fetching Probleme (HÖCHSTE PRIORITÄT)

Das System hat ein persistentes Problem mit der Anzeige von aktuellen Daten in der UI, obwohl diese korrekt in der Datenbank und im Backend vorhanden sind. Dieser Abschnitt enthält Aufgaben zur systematischen Lösung des Problems.

### Bereits durchgeführte Tests

- [x] **Backend und externe API-Kommunikation erfolgreich getestet**
  - [x] Direkter Test der evAlarm-API mit curl erfolgreich:
    ```
    curl -u "test.christian:h54mY9eBsp" -X POST "https://tas01.evalarm.de/api/v1/espa" \
      -H "Content-Type: application/json" \
      -H "X-EVALARM-API-VERSION: 2.1.5" \
      -d '{
        "events": [
          {
            "message": "Alarm Knopf",
            "address": "0",
            "namespace": "test.christian",
            "id": "1747169970",
            "device_id": "673922542395461"
          }
        ]
      }'
    ```
  - [x] Backend-Gateway-API akzeptiert Nachrichten über `/api/v1/messages/process`
  - [x] Gateway-Nachrichten werden korrekt transformiert und an evAlarm weitergeleitet
  - [x] API-Antwort zeigt erfolgreiche Verarbeitung (Status 200)
  - [x] Bestätigt, dass Daten korrekt in der Datenbank gespeichert, aber nicht immer in der UI angezeigt werden

### Frontend Data Fetching Optimierung

- [x] **UI-Aktualisierungszyklus überprüft und verbessert**
  - [x] Implementierung von automatischen Aktualisierungsintervallen für kritische Daten
  - [x] Polling-Mechanismus für Echtzeit-Updates (10-Sekunden-Intervall) implementiert
  - [x] Refresh-Buttons auf Dashboard und Gateways-Ansicht implementiert
  - [x] Loading-States für alle Daten-Fetch-Operationen eingeführt

- [x] **API-Client Verbesserungen implementiert**
  - [x] Einheitliche Verwendung des zentralen API-Clients in allen Komponenten
  - [x] Fehlerbehandlung bei Netzwerkproblemen verbessert
  - [x] Einführung von Status-Feedback für Benutzeraktionen (z.B. Testnachricht senden)
  - [x] API-Aufrufe optimiert und konsolidiert

- [ ] **State Management überarbeiten**
  - [ ] React Context API oder Redux für globalen Zustand implementieren
  - [ ] Zentrales State Management für Kundendaten, Gateway-Daten und Gerätedaten
  - [ ] Cache-Invalidierung implementieren nach Create/Update/Delete-Operationen

### Backend API-Optimierungen

- [x] **Konsistenz bei API-Antworten sicherstellen**
  - [x] Einheitliches Antwortformat in allen API-Endpunkten implementiert
  - [x] Verbesserte Fehlerbehandlung in API-Routen
  - [x] Gateway-ID-Extraktion aus Nachrichten korrigiert
  - [x] Geräteregistrierung aus verschiedenen Nachrichtenformaten implementiert

- [x] **MongoDB-Abfragen optimieren**
  - [x] Verbindungsinitialisierung und -handling in models.py verbessert
  - [x] Query-Performance durch besseres Verbindungsmanagement optimiert
  - [x] Sichergestellt, dass alle Felder korrekt zurückgegeben werden
  - [x] Robustere Fehlerbehandlung bei Datenbankabfragen implementiert

### Spezifische UI-Komponenten

- [x] **Dashboard**
  - [x] Zentralisierte Datenladestrategie implementiert
  - [x] Promise.all für parallele API-Aufrufe implementiert
  - [x] Manuelle Refresh-Funktion hinzugefügt
  - [x] Loading-States für besseres Benutzerfeedback

- [x] **Gateway-Verwaltung**
  - [x] Gateway-Listenaktualisierung nach CRUD-Operationen implementiert
  - [x] Zentralisierten API-Client für alle Anfragen implementiert
  - [x] Verbesserte Fehlerbehandlung für Gateway-Operationen
  - [x] Optimierte Datenverarbeitung beim Abrufen von Gateway-Informationen

- [x] **Geräteansicht**
  - [x] Automatische Erkennung und Registrierung von Geräten aus Gateway-Nachrichten
  - [x] Korrekte Typbestimmung für verschiedene Gerätearten (Panic-Button, Sensoren, etc.)
  - [x] Korrekte Gateway-Zuordnung bei Gerätelistung
  - [x] Verbesserte Darstellung der Gerätedaten in der UI

### Testplan

- [x] **Systematische Tests für Data Fetching**
  - [x] Testskript für Gateway-Registrierung mit echtem Hardware-Gateway erstellt
  - [x] Test der Geräteregistrierung über Testnachrichten
  - [x] Test der Datenkonsistenz zwischen Backend und Frontend
  - [x] Validierung der korrekten Anzeige in der Benutzeroberfläche

- [x] **Debugging-Werkzeuge**
  - [x] Verbesserte Konsolen-Logging für API-Aufrufe und -Antworten
  - [x] Detaillierte Logs für Gateway- und Geräteregistrierung
  - [x] Verbessertes Error-Handling im Backend mit aussagekräftigen Fehlermeldungen
  - [x] API-Endpunkt für Testnachrichten mit realistischen Daten implementiert

### Implementierte Lösungen

- [x] **Dashboard-Komponente optimiert**
  - [x] Direkte axios-Aufrufe durch zentralen API-Client ersetzt
  - [x] Zentrale Funktion `loadAllData()` für koordinierte Datenaktualisierung
  - [x] Promise.all für parallele API-Aufrufe
  - [x] Explizite Loading-States und Fehlerbehandlung
  - [x] Manueller Refresh-Button für sofortige Aktualisierung

- [x] **Gateway-Komponente optimiert**
  - [x] Direkte axios-Aufrufe durch API-Client ersetzt
  - [x] Verbesserte Fehlerbehandlung bei API-Anfragen
  - [x] Status-Feedback für CRUD-Operationen
  - [x] Optimierte Verarbeitung von Gateway-Telemetriedaten

- [x] **API-Client erweitert**
  - [x] Fehlende Endpunkte (testMessage, latest) implementiert
  - [x] Konsolidierung der API-URLs auf v1-Format
  - [x] Verbesserte Fehlerbehandlung und -meldungen
  - [x] Einheitliches Response-Format-Handling

### Implementierungsplan

- [x] **Phase 1: Analyse und Dokumentation** 
  - [x] Vollständige Analyse des aktuellen Data-Fetching-Verhaltens
  - [x] Identifizierung der problematischen Komponenten (Dashboard, Gateways)
  - [x] Dokumentation der erwarteten vs. tatsächlichen Verhaltensweisen

- [x] **Phase 2: Frontend-Verbesserungen**
  - [x] Komponenten mit fehlerhaftem Data Fetching identifiziert und korrigiert
  - [x] Zentrale API-Client-Nutzung durchgesetzt
  - [x] Automatische Datenaktualisierung implementiert (Polling)
  - [x] Manuelle Refresh-Funktionen hinzugefügt

- [x] **Phase 3: Gateway- und Geräte-Integration**
  - [x] Korrektur der Gateway-ID-Extraktion aus Nachrichten
  - [x] Verbesserte Geräteregistrierung für verschiedene Nachrichtenformate
  - [x] Robuste Aktualisierung von Gerätestatus bei eingehenden Nachrichten
  - [x] Testnachrichten mit realistischen Daten für Debugging

- [ ] **Phase 4: Validierung und Tests**
  - [ ] Umfassende Tests aller UI-Komponenten
  - [ ] Validierung der Datenkonsistenz zwischen Frontend und Backend
  - [ ] Dokumentation der Verbesserungen und verbleibender Probleme

# evAlarm-IoT Gateway TODO List

## High Priority Tasks

### Message Processor Enhancement
- [x] Implement retry mechanism for failed message deliveries
- [x] Add detailed logging for message transformation process
- [x] Create monitoring dashboard for message queue status
- [ ] Implement rate limiting for API calls to evAlarm

### Gateway Management
- [x] Add gateway health check endpoint
- [x] Implement automatic gateway registration process
- [x] Create gateway configuration validation system
- [x] Add gateway metrics collection

### Template System
- [x] Create template versioning system
- [x] Add template validation before deployment
- [x] Implement template testing framework
- [ ] Create template documentation generator

## Medium Priority Tasks

### Authentication & Security
- [x] Implement API key rotation mechanism
- [ ] Add rate limiting for authentication endpoints
- [x] Create security audit logging system
- [ ] Implement IP whitelisting for gateway connections

### System Monitoring
- [x] Set up centralized logging system
- [x] Create system health dashboard
- [x] Implement automated system alerts
- [x] Add performance metrics collection

### Documentation
- [x] Update API documentation with new endpoints
- [x] Create troubleshooting guide
- [x] Document deployment procedures
- [x] Create user manual for template creation

## Low Priority Tasks

### Development Tools
- [x] Create development environment setup script
- [ ] Implement automated testing pipeline
- [ ] Add code quality checks
- [x] Create development documentation

### UI Improvements
- [ ] Add dark mode support
- [x] Implement responsive design improvements
- [ ] Create user preference system
- [ ] Add accessibility features

## 15. Implementierung der verbesserten Nachrichtenverarbeitungsarchitektur (HÖCHSTE PRIORITÄT)

Die aktuelle Implementierung der Nachrichtenverarbeitung ist zu sehr auf bestimmte Gerätetypen (insbesondere Panic-Buttons) zugeschnitten und nicht flexibel genug für ein wachsendes System mit diversen Geräten. Es wird eine neue, generische Architektur implementiert, die auf dem folgenden Datenfluss basiert:

```
Nachricht → Extraktion → Normalisierung → Filterung → Transformation → Weiterleitung
```

### Phase 1: Generische Extraktions- und Normalisierungsschicht

- [x] **Generischer Message-Extraktor implementieren**
  - [x] Gateway-ID aus beliebigem Format extrahieren
  - [x] Geräte-IDs aus beliebigen Formaten extrahieren
  - [x] Gerätewerte aus verschiedenen Nachrichtenformaten extrahieren
  - [x] Automatische Typ-Bestimmung für Geräte basierend auf vorhandenen Werten

- [x] **Normalisierungsschicht entwickeln**
  - [x] Einheitliches internes Datenformat definieren
  - [x] Extraktion von Gateway- und Gerätedaten in das normalisierte Format
  - [x] Transformation von Werten in konsistente Datentypen
  - [x] Behandlung von fehlenden oder ungültigen Daten

- [ ] **Zwischenspeicherung normalisierter Daten**
  - [ ] Datenbankschema für normalisierte Daten erstellen
  - [ ] Speichern von normalisierten Daten vor der Transformation
  - [ ] Historische Daten für Analyse und Debugging bewahren

### Phase 2: Regelbasierte Filterung und Template-System

- [x] **Filterregelsystem implementieren**
  - [x] JSON-Schema für Filterregeln definieren
  - [x] Min/Max-Werteprüfung implementieren
  - [x] Präzise Werteübereinstimmungsprüfungen
  - [x] Listen-basierte Werte-Filterung
  - [x] Logische Verknüpfungen zwischen Regeln (UND/ODER)

- [x] **Erweitertes Template-System**
  - [x] Templates mit integrierten Filterregeln
  - [x] Zugriff auf alle normalisierten Daten in Templates
  - [x] Erweiterte Jinja2-Funktionen für Datentransformation
  - [x] Versionierung von Templates

- [x] **Automatische Template-Generierung**
  - [x] Generierung von Template-Grundgerüsten aus normalisierten Daten
  - [x] Erkennung typischer Variablen und ihrer Typen
  - [x] Vorschläge für sinnvolle Filterregeln basierend auf beobachteten Daten
  - [ ] GUI für die Template-Generierung

### Phase 3: Verbesserte Benutzerschnittstelle

- [x] **Message-Debugging-Interface**
  - [x] Neue dedizierte Debug-Seite für Nachrichtenverarbeitung implementieren
  - [x] Visualisierung des Verarbeitungspipeline-Flusses
  - [x] Anzeige des Zustands nach jedem Verarbeitungsschritt
  - [x] Copy-to-Clipboard Funktionalität für JSON-Daten
  - [x] Möglichkeit zum Einreichen einer Nachricht zur erneuten Verarbeitung
  - [x] Integration des Nachrichten-Debuggers in die reguläre Nachrichtenansicht
  - [x] Debug-Funktion für historische Nachrichten implementiert

- [x] **Zentrales Debug-Dashboard**
  - [x] Umwandlung der "Nachrichten-Debugger"-Seite in ein zentrales "Debugger"-Dashboard
  - [x] Implementierung von Tabs für verschiedene Debug-Bereiche (Nachrichten, System-Logs)
  - [x] Sidebar zur Auswahl verschiedener Komponenten (Gateway, Processor, API, etc.)
  - [x] Filtern der Debug-Informationen nach Typ und Detailgrad
  - [x] Echtzeitanzeige von System-Logs mit Filtermöglichkeiten
  - [x] Visuelle Darstellung von Fehlern und Warnungen
  - [x] Export-Funktion für Debug-Informationen und Logs

- [x] **Echte System-Logs-Integration**
  - [x] Backend-Endpunkte für Systemlogs implementieren
    - [x] Endpoint `/api/v1/logs/system` für allgemeine Systemlogs (aggregierte Ansicht)
    - [x] Endpoint `/api/v1/logs/processor` für Processor-Logs und Message-Worker
    - [x] Endpoint `/api/v1/logs/gateway` für Gateway-Logs und NGINX
    - [x] Endpoint `/api/v1/logs/api` für API-Server-Logs
    - [x] Endpoint `/api/v1/logs/auth` für Authentifizierungs-Logs
    - [x] Endpoint `/api/v1/logs/database` für MongoDB und Redis Operationen
  - [x] Docker-Container-Log-Extraktion implementieren
    - [x] Zugriff auf Docker-Logs über Docker API oder Log-Files
    - [x] Strukturiertes Parsen von Container-Logs (JSON-Format)
    - [x] Extrahieren relevanter Informationen aus den Log-Zeilen
    - [x] Vereinheitlichung unterschiedlicher Log-Formate
  - [x] Log-Filterung im Backend implementieren
    - [x] Filterung nach Zeitraum (von-bis) mit ISO 8601 Format
    - [x] Filterung nach Log-Level (error, warning, info, debug)
    - [x] Filterung nach Komponente und Subkomponente
    - [x] Filterung nach bestimmten Ereignistypen via Volltextsuche
    - [x] Volltextsuche im Log-Inhalt
    - [x] Pagination für große Log-Mengen
  - [x] Frontend-Integration
    - [x] API-Client erweitern um Log-Abruf-Funktionen
    - [x] Ersetzen der simulierten Logs durch echte Backend-Daten
    - [x] Echtzeit-Aktualisierung von Logs mit Polling
    - [x] Verbesserte Fehlerbehandlung für Log-Anfragen
  - [x] Erweiterte Log-Features
    - [x] Detail-Ansicht für komplexe Log-Einträge mit Kontext-Information
    - [x] Farbliche Hervorhebung von Warnungen und Fehlern
    - [x] Log-Export als JSON/TXT
    - [ ] Log-Historie mit persistenter Speicherung in MongoDB (zukünftige Erweiterung)
    - [ ] Einstellung der Log-Level für verschiedene Komponenten über UI (zukünftige Erweiterung)

- [x] **Fehler in Nachrichtenanzeige beheben**
  - [x] Problem analysieren, warum Nachrichten nur im Dashboard und nicht in der Nachrichtenseite erscheinen
  - [x] API-Endpunkte für Nachrichtenabfrage überprüfen
  - [x] Datenflussprobleme in der Frontend-Komponente beheben
  - [x] Konsistente Nachrichtenanzeige über alle Seiten sicherstellen

- [ ] **Verbesserte Dashboard-Widgets**
  - [ ] Anzeige normalisierter Daten für eingehende Nachrichten
  - [ ] Live-Vorschau der Transformationen mit verschiedenen Templates
  - [ ] Visualisierung der Filterwirkung auf reale Daten

- [ ] **Template- und Filter-Editor**
  - [ ] Grafischer Editor für Template-Bearbeitung
  - [ ] Visuelles Interface zur Konfiguration von Filterregeln
  - [ ] Min/Max-Slider für numerische Werte
  - [ ] Dropdown-Menüs für kategorische Werte
  - [ ] Echtzeit-Vorschau der Transformation

### Phase 4: Systemintegration und Optimierung

- [x] **Integration mit dem bestehenden System**
  - [x] Parallelbetrieb mit dem aktuellen System während der Umstellung
  - [x] Migration bestehender Templates und Konfigurationen
  - [x] Kompatibilitätsschicht für ältere API-Clients

- [ ] **Performance-Optimierung**
  - [ ] Effiziente Verarbeitung großer Nachrichtenmengen
  - [x] Caching von häufig verwendeten Templates und Filterregeln
  - [ ] Optimierung der Datenbankzugriffe für normalisierte Daten

- [x] **Dokumentation und Tests**
  - [x] Umfassende Dokumentation der neuen Architektur
  - [x] Automatisierte Tests für alle Komponenten
  - [ ] Belastungstests für Hochlastsituationen

## 16. Standardisierung der Datenhaltung (HÖCHSTE PRIORITÄT)

Ein architektonisches Problem wurde identifiziert: Das System verwendet parallel sowohl JSON-Konfigurationsdateien als auch die MongoDB-Datenbank für die gleichen Daten. Diese duale Datenhaltung führt zu schwer auffindbaren Fehlern und Inkonsistenzen.

### Identifizierte Probleme

- [x] **Inkonsistente Datenspeicherung für Kundenkonfiguration**
  - [x] `templates/customer_config.json` enthält Gateway-Zuordnungen zu Kunden, die aber nicht mit der Datenbank synchronisiert sind
  - [x] UI lädt Daten aus der Datenbank, während Nachrichtenverarbeitung die JSON-Datei nutzt
  - [x] Dadurch erscheinen Gateways nicht in der Benutzeroberfläche, obwohl sie in der JSON-Datei einem Kunden zugeordnet sind

- [ ] **Weitere potenzielle Inkonsistenzen**
  - [ ] Template-Definitionen möglicherweise in mehreren Speicherorten
  - [ ] Gateway-Konfigurationen in Dateien und Datenbank
  - [ ] Geräte-Mapping in verschiedenen Formaten

### Migration zu zentraler Datenbankarchitektur

- [x] **Phase 1: Kundenspezifische Gateway-Konfiguration migrieren**
  - [x] Code-Analyse aller Zugriffe auf `customer_config.json`
  - [x] Initialen Migration-Skript für die Übertragung aller Daten von JSON in die Datenbank erstellen (`utils/migrate_customer_config.py`)
  - [x] Code-Stellen identifizieren, die auf die JSON-Datei zugreifen
  - [x] Gateway-Zuordnungen erfolgreich migriert und getestet

- [x] **Phase 2: Code-Refactoring für Gateway-Zuordnungen**
  - [x] Message-Processor aktualisiert, um Kundenzuordnungen aus der Datenbank zu lesen
  - [x] Prüfung der korrekten Gateway-Registrierung und -Zuordnung
  - [x] Tests zur Sicherstellung der korrekten Funktionalität
  - [x] Überprüfung der Kundenzuordnung aus der Datenbank statt aus der JSON-Datei

- [ ] **Phase 3: Administrative Funktionen hinzufügen**
  - [ ] UI-Komponente zum Import/Export der Konfiguration für Backup-Zwecke
  - [ ] Bestehende Admin-Funktionen überprüfen und erweitern
  - [ ] Konsistenzprüfungen implementieren

- [ ] **Phase 4: Legacy-JSON entfernen**
  - [ ] Bestätigung, dass keine Code-Stellen mehr auf JSON-Dateien zugreifen
  - [ ] Legacy-JSON-Dateien archivieren
  - [ ] Dokumentation aktualisieren

### Implementierungsplan

1. **Analyse (Priorität: HÖCHST)**
   - [x] Umfassende Code-Analyse aller JSON-Datei-Zugriffesstellen
   - [x] Identifikation aller Daten-Inkonsistenzen zwischen JSON und Datenbank
   - [x] Risikobewertung für jeden Migrationsschritt

2. **Migration (Priorität: HÖCHST)**
   - [x] Migrationsskripte entwickeln für jeden identifizierten Bereich
   - [x] Testumgebung für die Migration einrichten
   - [x] Schrittweise Migration mit Validierung nach jedem Schritt

3. **Code-Aktualisierung (Priorität: HÖCHST)**
   - [x] Refactoring aller betroffenen Code-Stellen für Datenbankzugriffe
   - [x] Besondere Behandlung der kritischen Stelle in `message_processor.py`
   - [x] Aktualisierung der Frontend-Komponenten für konsistente Datendarstellung

4. **Tests und Validierung (Priorität: HOCH)**
   - [x] Umfassende End-to-End-Tests des gesamten Nachrichtenflusses
   - [x] Gateway-Registrierung und Geräteerkennung testen
   - [x] Benutzeroberfläche auf Konsistenz prüfen
   - [x] Leistungs- und Lasttests durchführen

## Completed Tasks
- [x] Initial Message Processor implementation
- [x] Basic Gateway-ID handling
- [x] evAlarm API integration
- [x] Customer-specific configuration system
- [x] Basic template engine implementation
- [x] Advanced normalized template system
- [x] Rule-based filtering system
- [x] Debug dashboard implementation
- [x] Container logs integration
- [x] Database-centered architecture migration
- [x] Gateway-ID/UUID standardization

## 17. UI-Modernisierung nach Design-Konzept (HOHE PRIORITÄT)

Die UI soll modernisiert werden, orientiert an modernen Server-Management-Konsolen, unter Beibehaltung des React/Bootstrap-Stacks. Das Konzept basiert auf dem Dokument UI.md und umfasst folgende Komponenten:

### Phase 1: Grundlegende UI-Struktur (Sprint 1-2)

- [x] **Side-Navigation einführen**
  - [x] Permanente Navigation links (240px breit)
  - [x] Responsive Anpassung: Offcanvas bei < lg Breakpoint
  - [x] Neue Menüstruktur nach menu.ts-Vorlage implementieren
  - [x] Top-Bar auf Logo + User-Menu + Command Palette reduzieren
  - [x] Breadcrumbs integrieren

- [x] **Drawer statt Modals**
  - [x] `<Offcanvas placement="end">` als Basis-Komponente
  - [x] URL-basierte Detail-Drawer mit Deep-Linking
  - [x] Gateway-Detail als erstes Implementierungsbeispiel
  - [ ] Bestehende Modals schrittweise migrieren

### Phase 2: Erweiterte Komponenten (Sprint 3-4)

- [ ] **TanStack Table einführen**
  - [ ] Headless Table-Implementation für flexibles Styling
  - [ ] Sticky Header, Virtual Scrolling, Sort/Filter-API
  - [ ] Migration aller Listen-Ansichten auf TanStack Table
  - [ ] Einheitliche Status-Badge-Darstellung

- [ ] **Command Palette implementieren**
  - [ ] Globales Overlay mit `⌘K`-Shortcut
  - [ ] Fuzzy-Suche über Routen und Objekte
  - [ ] Integration von react-hotkeys-hook
  - [ ] Implementierung mit fuse.js für Fuzzy-Matching

- [ ] **Toast-Notification-System**
  - [ ] react-toastify global im AppShell einrichten
  - [ ] Ersatz für bestehende Alert-Komponenten
  - [ ] Einheitliches API für Notifications

### Phase 3: Styling & Design-System (Sprint 5-6)

- [ ] **CSS-Variablen-System aufbauen**
  - [ ] Farb-Tokens definieren (Primärfarbe #E02424)
  - [ ] Abstands- und Größen-System standardisieren
  - [ ] Bootstrap-Token über CSS-Variablen überschreiben
  - [ ] Schriftart Inter einbinden

- [ ] **Icon-System standardisieren**
  - [ ] lucide-react integrieren (18px Standardgröße)
  - [ ] Bestehende Icons ersetzen
  - [ ] Icon-Komponente für einheitliches Styling

- [ ] **Dark-Mode implementieren**
  - [ ] CSS-Variablen für Dark-Mode definieren
  - [ ] Theme-Switcher in User-Menu integrieren
  - [ ] Persistieren der User-Präferenz
  - [ ] Respektieren des System-Farbschemas

### Phase 4: Qualitätssicherung und Dokumentation

- [ ] **Cross-Browser-Tests**
  - [ ] Desktop: Chrome, Firefox, Safari, Edge
  - [ ] Mobile: iOS Safari, Android Chrome

- [ ] **Responsive Design Qualitätssicherung**
  - [ ] Test aller Komponenten auf verschiedenen Bildschirmgrößen
  - [ ] Sicherstellen der korrekten Funktionalität des Offcanvas-Menüs
  - [ ] Optimierung für Tablets und mobile Geräte

- [ ] **Dokumentation**
  - [ ] Styling-Guide aktualisieren
  - [ ] Komponenten-Dokumentation
  - [ ] Migration-Guide für Entwickler

### Implementierungsplan 

| Sprint | Deliverable                        | Owner   |
| ------ | ---------------------------------- | ------- |
|  1     | Side-Nav + Top-Bar Refactor        | FE Team |
|  2     | Drawer-Pattern für *Gateways*      | FE Team |
|  3     | TanStack Table in allen Listen     | FE Team |
|  4     | Command Palette + Toasts           | FE Team |
|  5     | Nachrichten-Refactor (Tabs, Retry) | FE + BE |
|  6     | Dark-Mode, QA, Docs                | QA      |

Das Feature-Flag-System sollte für jede Komponente implementiert werden, um rollbacks zu erleichtern (z.B. `REACT_APP_ENABLE_DRAWER`).