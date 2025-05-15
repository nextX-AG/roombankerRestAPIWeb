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
- [ ] Implement retry mechanism for failed message deliveries
- [ ] Add detailed logging for message transformation process
- [ ] Create monitoring dashboard for message queue status
- [ ] Implement rate limiting for API calls to evAlarm

### Gateway Management
- [ ] Add gateway health check endpoint
- [ ] Implement automatic gateway registration process
- [ ] Create gateway configuration validation system
- [ ] Add gateway metrics collection

### Template System
- [ ] Create template versioning system
- [ ] Add template validation before deployment
- [ ] Implement template testing framework
- [ ] Create template documentation generator

## Medium Priority Tasks

### Authentication & Security
- [ ] Implement API key rotation mechanism
- [ ] Add rate limiting for authentication endpoints
- [ ] Create security audit logging system
- [ ] Implement IP whitelisting for gateway connections

### System Monitoring
- [ ] Set up centralized logging system
- [ ] Create system health dashboard
- [ ] Implement automated system alerts
- [ ] Add performance metrics collection

### Documentation
- [ ] Update API documentation with new endpoints
- [ ] Create troubleshooting guide
- [ ] Document deployment procedures
- [ ] Create user manual for template creation

## Low Priority Tasks

### Development Tools
- [ ] Create development environment setup script
- [ ] Implement automated testing pipeline
- [ ] Add code quality checks
- [ ] Create development documentation

### UI Improvements
- [ ] Add dark mode support
- [ ] Implement responsive design improvements
- [ ] Create user preference system
- [ ] Add accessibility features

## Completed Tasks
- [x] Initial Message Processor implementation
- [x] Basic Gateway-ID handling
- [x] evAlarm API integration
- [x] Customer-specific configuration system
- [x] Basic template engine implementation

## 11. Sicherheit bei der Nachrichtenweiterleitung (HÖCHSTE PRIORITÄT)

Ein kritisches Sicherheitsproblem wurde identifiziert: Nachrichten von nicht zugeordneten Gateways ohne Kundenzuordnung werden dennoch an evAlarm weitergeleitet. Dies ist ein signifikantes Sicherheitsrisiko, da:
1. Jeder Kunde eine eigene evAlarm API-Adresse besitzt
2. Nur registrierte und einem Kunden zugeordnete Gateways sollten Nachrichten weiterleiten dürfen
3. Die korrekten Kundenzugangsdaten müssen für die Weiterleitung verwendet werden

### API-Weiterleitungsvalidierung

- [x] **Gateway-Zuordnungsprüfung implementieren**
  - [x] Überprüfen, ob Gateway einem Kunden zugeordnet ist, bevor Nachrichten weitergeleitet werden
  - [x] Bei nicht zugeordneten Gateways die Weiterleitung blockieren
  - [x] Nachrichten von nicht zugeordneten Gateways in separatem Queue/Speicher ablegen
  - [x] Warn-Logs generieren, wenn nicht zugeordnete Gateways Nachrichten senden

- [x] **Kundenspezifische evAlarm-API-Konfiguration**
  - [x] Dynamische Verwendung der korrekten API-URL basierend auf Kundendaten
  - [x] Kundenspezifische Zugangsdaten (Benutzername/Passwort) für evAlarm verwenden
  - [x] Validierung der Kundenkonfiguration vor Weiterleitung

- [x] **Sicherheitsprotokollierung**
  - [x] Detaillierte Logs aller Weiterleitungsversuche
  - [x] Tracking blockierter Weiterleitungen für Sicherheitsaudit
  - [ ] Benachrichtigung bei verdächtigen Aktivitäten (z.B. viele Nachrichten von nicht zugeordneten Gateways)

### Architekturanpassungen

- [ ] **Routing-System überarbeiten**
  - [ ] Zentrale Routing-Komponente implementieren
  - [ ] Prüfung der Gateway → Kunde → evAlarm-Zuordnung vor jeder Weiterleitung
  - [ ] Fehlerhafte oder nicht zugeordnete Weiterleitungen blockieren und protokollieren

- [ ] **Warteschlangenmanagement**
  - [ ] Separate Warteschlangen für zugeordnete und nicht zugeordnete Gateways
  - [ ] Priorisierung von Nachrichten zugeordneter Gateways
  - [ ] Optionale manuelle Freigabe von Nachrichten nicht zugeordneter Gateways nach Kundenzuordnung

### Implementierungsplan

- [x] **Phase 1: Sofortige Sicherheitsmaßnahmen**
  - [x] Blockieren der Weiterleitung für nicht zugeordnete Gateways
  - [x] Implementierung der Gateway-Zuordnungsprüfung
  - [x] Erweitertes Logging für alle Weiterleitungsversuche

- [ ] **Phase 2: Erweiterte Funktionen**
  - [ ] UI-Komponente für die Anzeige blockierter Nachrichten
  - [ ] Dashboard-Benachrichtigungen für Administratoren
  - [ ] Möglichkeit zur manuellen Freigabe nach Zuordnung

- [ ] **Phase 3: Langfristige Architekturverbesserungen**
  - [ ] Vollständige Überarbeitung des Routing-Systems
  - [ ] Implementierung eines Audit-Trails für alle Nachrichtenweiterleitungen
  - [ ] Automatisierte Sicherheitstests und -validierungen

## 12. Standardisierung der Gateway-Nachrichtenroute (HÖCHSTE PRIORITÄT)

Ein kritisches Problem mit der Gateway-Nachrichtenroute wurde identifiziert: Aktuell wird die URL `http://192.168.178.44:8000/api/v1/messages/process` für die Weiterleitung verwendet, was die Geräteregistrierung verhindert. Um dieses Problem systematisch zu lösen, ist eine Vereinheitlichung des Nachrichteneingangs mit einem neuen eindeutigen Endpunkt notwendig.

### Aktueller Status der Nachrichtenrouten

- [x] **Problem identifiziert**: 
  - [x] Gateway sendet Nachrichten an `http://192.168.178.44:8000/api/v1/messages/process`
  - [x] Nachrichten kommen zwar an, aber Geräteregistrierung funktioniert nicht
  - [x] Unterschiedliche Endpunkte verursachen Inkonsistenzen

- [x] **Betroffene Endpunkte analysiert**:
  - [x] `/api/test` - Legacy-Eingangspunkt in `api/app.py` (empfängt Nachrichten, registriert Geräte)
  - [x] `/api/process-message` - In `api/routes.py` (verarbeitet und registriert Geräte)
  - [x] `/api/process` - Leitet an die Template-Engine weiter
  - [x] `/api/v1/messages/process` - In `api/processor_service.py` und `api/message_processor.py` (beide haben unterschiedliche Implementierungen)

### Standardisierung der Nachrichtenroute

- [ ] **Neuen Endpunkt `/api/v1/process` implementieren**
  - [ ] Eindeutiger Endpunkt für einfachere Migration und Nachvollziehbarkeit
  - [ ] Klare Trennung vom bestehenden `/api/v1/messages/process`

- [ ] **Konsolidierung der Geräteregistrierungslogik**
  - [ ] Die Funktion `register_device_from_message` aus `api/models.py` als zentrale Funktion nutzen
  - [ ] Sicherstellen, dass diese Funktion im neuen Endpunkt konsistent verwendet wird
  - [ ] Optimierung der Gerätetypenerkennung für verschiedene Nachrichtenformate

- [ ] **Implementierung des `/api/v1/process`-Endpunkts**
  - [ ] Integration aller notwendigen Funktionen in diesem Endpunkt:
    - [ ] Gateway-Extraktion aus der Nachricht (aktuell in `processor_service.py` implementiert)
    - [ ] Gateway-Registrierung/Update wie in `/api/test` implementiert
    - [ ] Geräteerkennung und -registrierung aus `/api/process-message` übernehmen
    - [ ] Nachrichtentransformation und Weiterleitung wie in `message_processor.py`
  - [ ] Konsistentes Antwortformat und Fehlerbehandlung implementieren
  - [ ] Ausführliche Protokollierung aller Verarbeitungsschritte

- [ ] **Sicherheitsüberprüfungen implementieren**
  - [ ] Kunden-/Gateway-Zuordnungsprüfung wie in `forward_message` der `MessageForwarder`-Klasse
  - [ ] Validierung der Gateway-ID und Nachrichtenformat
  - [ ] Speicherung von Nachrichten nicht zugeordneter Gateways für spätere Überprüfung

- [ ] **Alte Routen auf den neuen Endpunkt umleiten**
  - [ ] Temporäre Weiterleitungen für `/api/test` und `/api/process-message` einrichten
  - [ ] Warnung-Logs erstellen, wenn alte Endpunkte verwendet werden
  - [ ] Plan für das schrittweise Entfernen alter Endpunkte entwickeln

### Implementierung im Processor-Service

- [ ] **Neue `process`-Funktion implementieren**
  - [ ] Gemeinsame Funktion basierend auf den Implementierungen in `processor_service.py` und `message_processor.py` erstellen
  - [ ] Integration der Geräteregistrierung direkt im Prozess
  - [ ] Sicherstellen, dass sowohl synchrone als auch asynchrone (Queue-basierte) Verarbeitung unterstützt wird

- [ ] **Optimierung der Nachrichtenweiterleitung**
  - [ ] Nutzung der bestehenden `MessageForwarder`-Klasse für alle Weiterleitungen
  - [ ] Verbesserung der Gateway → Kunde → evAlarm-API-Zuordnung
  - [ ] Sicherstellen, dass kundenspezifische Zugangsdaten korrekt verwendet werden

### Gateway-Konfiguration und Dokumentation

- [ ] **Dokumentation und Konfigurationsanleitung**
  - [ ] Detaillierte API-Dokumentation für den neuen `/api/v1/process`-Endpunkt erstellen
  - [ ] Unterstützte Nachrichtenformate und Beispiele dokumentieren
  - [ ] Anleitung zur Gateway-Konfiguration erstellen
  - [ ] Testverfahren für korrekte Gateway-Einrichtung definieren

- [ ] **Interne Dokumentation aktualisieren**
  - [ ] ARCHITECTURE.md mit dem aktualisierten Nachrichtenfluss aktualisieren
  - [ ] API-DOKUMENTATION.md mit dem neuen vereinheitlichten Endpunkt aktualisieren

### Monitoring und Fehlerbehebung

- [ ] **Verbesserte Diagnosetools**
  - [ ] Dashboard-Komponente für Gateway-Nachrichtenverarbeitung erweitern
  - [ ] Monitoring der Nachrichtenverarbeitung durch jede Phase (Empfang, Registrierung, Transformation, Weiterleitung)
  - [ ] Logging-Framework für detaillierte Verfolgung der Nachrichtenverarbeitung

- [ ] **Test-Suite entwickeln**
  - [ ] Simulierte Gateway-Nachrichten für verschiedene Szenarien
  - [ ] Automatisierte Tests für den gesamten Nachrichtenverarbeitungsweg
  - [ ] Tests für die Geräteregistrierung bei verschiedenen Nachrichtenformaten

### Implementierungsplan

- [ ] **Phase 1: Refactoring und Konsolidierung**
  - [ ] Entwicklung des neuen `/api/v1/process`-Endpunkts
  - [ ] Analyse und Zusammenführung der Geräteregistrierungslogik
  - [ ] Erstellung von Tests für die grundlegenden Funktionen

- [ ] **Phase 2: Erweiterte Implementierung**
  - [ ] Sicherheitsprüfungen und Gateway-Zuordnungsvalidierung implementieren
  - [ ] Weiterleitungsmechanismus verbessern
  - [ ] Temporäre Weiterleitungen für alte Endpunkte einrichten

- [ ] **Phase 3: Tests und Dokumentation**
  - [ ] End-to-End-Tests mit echten und simulierten Gateways
  - [ ] Ausführliche Dokumentation erstellen
  - [ ] API-Dokumentation und ARCHITECTURE.md mit dem neuen Endpunkt aktualisieren

- [ ] **Phase 4: Produktionseinführung und Überwachung**
  - [ ] Gateway auf den neuen Endpunkt `/api/v1/process` umstellen
  - [ ] Schrittweise Einführung mit intensiver Überwachung
  - [ ] Sammlung von Metriken und Leistungsdaten
  - [ ] Optimierung basierend auf Produktionserfahrungen