# TODO: evAlarm-IoT Gateway Management System

## ✅ Erfolgreiche Tests und Validierungen (26.05.2025)

### Hardware-Test mit echtem Gateway und Panic-Button
- **Test durchgeführt am**: 26.05.2025, 14:20 Uhr
- **Testaufbau**:
  - Echtes Hardware-Gateway mit MQTT-Sniffer-Script
  - Panic-Button-Device (ID: 673922542395461)
  - Gateway-ID: gw-c490b022-cc18-407e-a07e-a355747a8fdd
  
- **Testergebnisse**:
  - ✅ Gateway registriert sich automatisch beim ersten Kontakt
  - ✅ Gateway erscheint als "unassigned" in der UI
  - ✅ Manuelle Zuordnung zu Kunde "Christian Kreuter" über UI erfolgreich
  - ✅ Panic-Button-Gerät wird automatisch erkannt und registriert
  - ✅ Nachrichtenverarbeitung funktioniert korrekt
  - ✅ Template-Anwendung (evalarm_panic) erfolgreich
  - ✅ Weiterleitung an evAlarm API erfolgreich (Status 200, eva_id erhalten)
  - ✅ Durchschnittliche Verarbeitungszeit: 0.51 Sekunden

- **Bestätigte Funktionalität**:
  - Kompletter End-to-End-Workflow vom Hardware-Button bis zur evAlarm-API
  - Automatische Geräteregistrierung
  - Korrekte Template-Transformation
  - Zuverlässige API-Weiterleitung

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

- [x] **Template-Gruppen-System implementiert**
  - [x] Backend-Modelle für Template-Gruppen erstellt
  - [x] API-Endpunkte für CRUD-Operationen
  - [x] UI-Komponenten für Template-Gruppen-Verwaltung
  - [x] Integration in Gateway-Verwaltung
  - [x] Template-Selector mit intelligenter Auswahl
  - [x] Prioritätsbasierte Template-Auswahl

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
  - [x] **Menü-Überlappungsproblem behoben**
    - [x] Korrektes margin-left für die main-content Klasse implementiert
    - [x] Korrekte Positionierung und Höhenberechnung der Side-Navigation
    - [x] CSS-Transitions für flüssigere Animation beim Ein-/Ausklappen

- [x] **Drawer statt Modals**
  - [x] `<Offcanvas placement="end">` als Basis-Komponente
  - [x] URL-basierte Detail-Drawer mit Deep-Linking
  - [x] Gateway-Detail als erstes Implementierungsbeispiel
  - [x] Kunden-Detail als zweites Implementierungsbeispiel
  - [x] Geräte-Detail als drittes Implementierungsbeispiel
  - [x] Nachrichten-Detail als viertes Implementierungsbeispiel
  - [x] Klickbare Tabellenzeilen für einfachere Navigation zu Detail-Drawern
  - [x] Gateway-Bearbeitungsfunktion direkt im Drawer implementieren
  - [x] Geräteanzeige im Gateway-Detail korrekt implementieren
  - [x] Verbesserte Drawer-Funktionalität (resizable)
    - [x] Implementierung der Größenanpassung durch Ziehen an der linken Kante
    - [x] Anpassung des Hauptinhalts an die Drawer-Größe
    - [x] Implementierung des DrawerContext für globale Zustandsverwaltung
  - [x] Konsistente Löschfunktionalität
    - [x] Entfernung redundanter Löschbuttons aus Hauptansichten
    - [x] Konsolidierung der Löschfunktion im Detail-Drawer für alle Entitäten
    - [x] Bestätigungsdialoge für wichtige Löschoperationen
  - [ ] Restliche Modals schrittweise migrieren

### Phase 2: Erweiterte Komponenten (Sprint 3-4)

- [x] **TanStack Table einführen**
  - [x] Headless Table-Implementation für flexibles Styling
  - [x] Sticky Header, Virtual Scrolling, Sort/Filter-API
  - [x] Kunden-Komponente als erstes Implementierungsbeispiel
  - [x] Migration der Listen-Ansichten auf TanStack Table
    - [x] Kundenliste auf TanStack Table migriert
    - [x] Gateway-Liste auf TanStack Table migriert
    - [x] Geräteliste auf TanStack Table migriert
    - [x] Nachrichtenliste auf TanStack Table migriert
    - [x] Templates-Liste auf TanStack Table migriert (AKTUELLER TASK)
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

| Sprint | Deliverable                          | Owner   |
|--------|--------------------------------------|---------|
| 1      | Side-Nav + Top-Bar Refactor        | FE Team |
| 2      | Drawer-Pattern für *Gateways*      | FE Team |
| 3      | TanStack Table in allen Listen     | FE Team |
| 4      | Command Palette + Toasts           | FE Team |
| 5      | Nachrichten-Refactor (Tabs, Retry) | FE + BE |
| 6      | Dark-Mode, QA, Docs                | QA      |

Das Feature-Flag-System sollte für jede Komponente implementiert werden, um rollbacks zu erleichtern (z.B. `

## 18. Multiuser-Fähigkeit und Kundentrennung (HOHE PRIORITÄT)

Das System verfügt bereits über eine grundlegende Authentifizierungsstruktur und ein Datenmodell mit klarer Hierarchie (Kunden -> Gateways -> Geräte), ist aber aktuell nicht vollständig multiuser-fähig. Jeder authentifizierte Benutzer kann derzeit auf alle Daten zugreifen, unabhängig vom Kunden.

### Phase 1: Verknüpfung von Benutzern und Kunden (Sprint 1)

- [ ] **Erweiterung des Datenmodells**
  - [ ] Benutzer-Modell mit Kundenzuordnung (`user.customer_id` oder Zuordnungstabelle)
  - [ ] Feinere Rollendefinition (System-Admin, Kunden-Admin, Benutzer)
  - [ ] Schema-Migration und Datenbankanpassungen
  - [ ] Schnittstelle zur Verwaltung von Benutzer-Kunden-Zuordnungen

- [ ] **Frontend-Anpassungen für Benutzerverwaltung**
  - [ ] Benutzerverwaltungsseite mit Kundenzuordnung
  - [ ] Rollen- und Berechtigungsanzeige
  - [ ] Kundenspezifische Einschränkungen in der Benutzeroberfläche

### Phase 2: API-Zugriffsbeschränkungen (Sprint 2)

- [ ] **Schutz aller API-Endpunkte**
  - [ ] Alle API-Routen mit `@require_auth` schützen
  - [ ] Implementierung von Middleware für kundenbezogene Zugriffsbeschränkungen
  - [ ] Endpoint für `/api/v1/gateways` filtern nach Kunde des angemeldeten Benutzers
  - [ ] Endpoint für `/api/v1/devices` filtern nach Kunde des angemeldeten Benutzers
  - [ ] Neue Helper-Funktion `get_customer_id_from_token()` implementieren
  - [ ] API-Response-Filterung basierend auf Benutzerberechtigungen

- [ ] **Erweiterung der Auth-Middleware**
  - [ ] Erweiterter Token-Payload mit Kundeninformationen und Berechtigungen
  - [ ] Validierungsfunktionen für Ressourcenzugriff (`check_resource_permission()`)
  - [ ] Abfangen unberechtigter Zugriffe mit spezifischen Fehlermeldungen
  - [ ] Logging aller Zugriffsversuche für Audit-Zwecke

### Phase 3: Frontend-Anpassungen (Sprint 3)

- [ ] **Benutzerspezifische UI-Anpassungen**
  - [ ] Dashboard nach Kundenberechtigungen filtern
  - [ ] Gateways-Liste für den Kunden des Benutzers einschränken
  - [ ] Geräteliste für den Kunden des Benutzers einschränken
  - [ ] Kunde in Navigation anzeigen, wenn Benutzer einem Kunden zugeordnet ist
  - [ ] Admin-Ansicht mit allen Kunden für System-Administratoren

- [ ] **Verbesserte Benutzerführung**
  - [ ] Klare Anzeige der aktuellen Berechtigungen
  - [ ] Hilfetext bei Zugriffsversuchen auf nicht erlaubte Ressourcen
  - [ ] Kontextabhängige Navigation basierend auf Benutzerrolle

### Phase 4: System-Admin-Funktionen (Sprint 4)

- [ ] **Erweiterte Admin-Funktionen**
  - [ ] Kundenübergreifende Datenansicht für Administratoren
  - [ ] Möglichkeit zum Wechseln zwischen Kunden für Support-Zwecke
  - [ ] Audit-Logs für alle kundenübergreifenden Aktionen
  - [ ] Administratives Dashboard mit System-Übersicht

- [ ] **Berechtigungsmanagement**
  - [ ] Detaillierte Berechtigungsmatrix (Lesen/Schreiben/Löschen pro Ressource)
  - [ ] Dynamische Rollenzuweisung
  - [ ] Temporäre Zugriffsberechtigungen für Support-Zwecke
  - [ ] Audit-Trail für Berechtigungsänderungen

### Implementierungsplan

| Sprint | Deliverable                        | Owner   |
| ------ | ---------------------------------- | ------- |
|  1     | Datenmodell-Erweiterung            | BE Team |
|  1     | Benutzerverwaltung im Frontend     | FE Team |
|  2     | API-Zugriffsbeschränkungen         | BE Team |
|  2     | Auth-Middleware-Erweiterung        | BE Team |
|  3     | Frontend-Filterung                 | FE Team |
|  3     | Kontextabhängige UI-Elemente       | FE Team |
|  4     | Admin-Funktionen                   | BE+FE   |
|  4     | Berechtigungsmatrix                | BE+FE   |

### Vorteile der Implementierung

- **Sicherheit**: Klare Trennung der Kundendaten verhindert unberechtigten Zugriff
- **Skalierbarkeit**: System kann sicher für mehrere Kunden gleichzeitig betrieben werden
- **Compliance**: Einhaltung von Datenschutzbestimmungen durch Datentrennung
- **Servicefähigkeit**: Verbesserte Support-Möglichkeiten durch Admin-Funktionen

## 19. Visueller Template-Generator (HOHE PRIORITÄT)

Das aktuelle Template-System ist für technisch weniger versierte Benutzer zu komplex. Die Template-Erstellung erfordert tiefes Verständnis der JSON-Struktur und der verfügbaren Datenfelder in den Gerätenachrichten. Es wird ein visueller Template-Generator benötigt, der diesen Prozess vereinfacht und den Benutzern eine intuitive Oberfläche zur Verfügung stellt.

### Phase 1: Grundlegende Funktionalität (Sprint 1-2)

- [x] **Live-Datenvisualisierung**
  - [x] Integration des `MessageNormalizer` in die Frontend-Komponente
  - [x] Anzeige der normalisierten Gerätedaten in übersichtlicher Baumstruktur
  - [x] Automatische Erkennung aller verfügbaren Datenfelder aus eingehenden Nachrichten
  - [x] Farbliche Hervorhebung von Gateway- und Gerätedaten

- [x] **Auto-Template-Generierung**
  - [x] Implementierung der bestehenden `generate_template`-Funktion im Frontend
  - [x] One-Click-Template-Erstellung basierend auf erkannten Daten
  - [x] Automatisches Erkennen des Gerätetyps und Vorschlagen geeigneter Transformationen
  - [x] Intelligente Extraktion relevanter Datenfelder basierend auf häufigen Anwendungsfällen

- [x] **Template-Vorschau in Echtzeit**
  - [x] Live-Vorschau der transformierten Nachricht neben dem Original
  - [x] Side-by-Side-Vergleich von Rohdaten, normalisierten Daten und Transformation
  - [x] Sofortige Visualisierung der Auswirkungen von Template-Änderungen

### Phase 2: Drag-and-Drop Template-Editor (Sprint 3-4)

- [x] **Visueller Template-Builder**
  - [x] Drag-and-Drop-Interface zum Erstellen der JSON-Struktur 
  - [x] Einfaches Hinzufügen von Variablen aus den verfügbaren Datenfeldern
  - [x] Kontextmenü mit Vorschlägen für häufig verwendete Transformationen
  - [x] **Filter-Regeln-Integration**
    - [x] Auswahl vordefinierter Filterregeln aus Dropdown-Liste
    - [x] Anzeige angewendeter Filterregeln im Template
    - [x] Einfaches Hinzufügen/Entfernen von Filterregeln
    - [x] API-Integrationen für das Laden und Testen von Filterregeln

### Phase 3: UI-Verbesserungen (NEUE HOHE PRIORITÄT)

- [x] **Drawer-Pattern für Transformationsergebnisse**
  - [x] Umstellung der aktuellen Split-View auf Drawer-Pattern
  - [x] Mehr Platz für den Template-Editor durch auslagern des Ergebnisses
  - [x] Konsistente Anwendung des Drawer-Musters wie in anderen Anwendungsteilen
  - [x] Möglichkeit, das Ergebnis bei Bedarf ein- und auszublenden

- [x] **Erweiterte Filterregeln-UI**
  - [x] Detailansicht für jede Filterregel mit Eingabefeldern für Parameter
  - [x] Min/Max-Wert Eingabefelder mit Slider für RangeRule
  - [x] Dropdown mit möglichen Werten aus normalisierten Daten für ValueComparisonRule
  - [x] Typen-Badges für bessere Visualisierung der Regeltypen
  - [x] Bearbeitungsmöglichkeit für bestehende Regeln
  - [x] Möglichkeit, eigene Filterregeln zu erstellen und zu speichern

- [x] **Integration mit der Nachrichtenseite**
  - [x] Button "Template aus dieser Nachricht erstellen" im Nachrichten-Drawer
  - [x] Direkte Übergabe der ausgewählten Nachricht an den Template-Generator
  - [x] Automatische Übernahme der Nachricht in den Template-Generator
  - [x] Mehrere Möglichkeiten zum Erstellen eines Templates (aus Rohdaten oder normalisierter Nachricht)
  - [x] Verbesserter Workflow von der Nachrichtenansicht zum Template-Generator

### Phase 4: Erweiterte Funktionalität (zukünftige Erweiterung)

- [ ] **Flow-basierter visueller Editor (ZUKÜNFTIGE ERWEITERUNG)**
  - [ ] Integration von React-Flow für node-basierte visuelle Programmierung
  - [ ] Verschiedene Knotentypen (Eingabe, Filter, Transformation, Ausgabe)
  - [ ] Visuelles Gestalten des Datenflusses durch Drag-and-Drop
  - [ ] Echtzeit-Vorschau während der Flow-Bearbeitung
  - [ ] Speichern und Laden komplexer Transformationsflüsse

- [ ] **Test-Framework für Validierung**
  - [ ] Automatisches Testen von Templates mit echten Gerätedaten
  - [ ] Simulation verschiedener Nachrichtentypen
  - [ ] Validierung gegen Zielschema (z.B. evAlarm-API)
  - [ ] Automatische Erkennung von Fehlern und Verbesserungsvorschläge

- [ ] **Version-Management und Verlauf**
  - [ ] Versionierte Templates mit Änderungsverlauf
  - [ ] A/B-Tests für verschiedene Template-Versionen
  - [ ] Einfache Rollback-Funktion zu früheren Versionen
  - [ ] Diff-Ansicht zum Vergleich von Template-Versionen

### Implementierungsplan für Phase 3 (UI-Verbesserungen)

| Sprint | Deliverable                          | Owner   | Priorität  |
|--------|--------------------------------------|---------|------------|
| 1      | Drawer für Transformationsergebnisse | FE Team | Hoch       |
| 2      | Erweiterte Filterregeln-UI           | FE Team | Hoch       |
| 3      | Integration mit Nachrichtenseite     | FE+BE   | Hoch       |
| 4      | Flow-basierter Editor (Konzept)      | UX+FE   | Niedrig    |

## 20. Template-Auswahl-Architektur mit intelligentem Matching und Einlern-System (HÖCHSTE PRIORITÄT)

Die aktuelle Template-Auswahl im System ignoriert die Gateway-Template-Einstellung und wählt Templates hart kodiert basierend auf Gerätetypen. Ein Gateway sendet jedoch verschiedene Nachrichtentypen (Status, Alarme, Sensordaten), die unterschiedliche Templates benötigen. Dies erfordert eine grundlegende Neuarchitektur mit einem intelligenten Matching-System.

### Identifizierte Probleme

- **Gateway-Template wird ignoriert**: Obwohl Gateways ein `template_id` Feld haben, wird es in der Nachrichtenverarbeitung nicht verwendet
- **Keine Geräte-Templates**: Geräte haben kein eigenes Template-Feld in der Datenbank oder UI
- **Hart kodierte Template-Auswahl**: Die Auswahl erfolgt im Code basierend auf Alarm-Typen (panic → `evalarm_panic`)
- **Ein Gateway = Viele Nachrichtentypen**: Ein Gateway sendet verschiedene Nachrichten, die unterschiedliche Behandlung erfordern

### Neue Architektur: Intelligentes Template-Matching mit Einlern-System

```
Nachricht → Normalisierung → Regel-Matching → Template-Auswahl → Transformation
                                ↑
                          Learning-System
```

### Phase 1: Einlern-System (Device Discovery & Learning)

- [ ] **Learning-Mode für neue Gateways**
  - [ ] Automatisches Sammeln aller Nachrichten eines neuen Gateways (24-48 Stunden)
  - [ ] Mustererkennung: Welche Nachrichtentypen, Felder, Wertebereiche
  - [ ] Häufigkeitsanalyse der verschiedenen Nachrichtentypen
  - [ ] Speicherung der Lern-Daten in separater Collection

- [ ] **Datenbank-Schema für Learning**
  ```javascript
  {
    gateway_id: "gw-xyz",
    start_time: ISODate(),
    status: "learning|completed|templates_generated",
    message_patterns: [
      {
        pattern_hash: "hash",
        count: 288,
        common_fields: {
          "temperature": {"min": 18.5, "max": 23.2},
          "humidity": {"min": 45, "max": 62}
        },
        sample_messages: [...]
      }
    ]
  }
  ```

- [ ] **API-Endpunkte für Learning**
  - [ ] POST `/api/v1/gateways/{id}/learn` - Startet Einlern-Modus
  - [ ] GET `/api/v1/gateways/{id}/learning-status` - Zeigt Lernfortschritt
  - [ ] POST `/api/v1/gateways/{id}/generate-templates` - Generiert Templates

### Phase 2: Template-Pool mit Regel-basiertem Matching

- [x] **Template-Gruppen-System**
  - [x] Vordefinierte Template-Gruppen für bekannte Gerätetypen
  - [x] Gruppierung von zusammengehörigen Templates (z.B. "Roombanker Panic System")
  - [x] Einmal lernen → Template-Gruppe erstellen → Wiederverwenden
  - [x] Hersteller-spezifische Gruppen mit optimierten Templates
  
  ```json
  {
    "template_group": {
      "id": "roombanker_panic_system",
      "name": "Roombanker Panic Button System",
      "manufacturer": "Roombanker",
      "device_types": ["panic_button", "gateway_status"],
      "templates": [
        {"id": "panic_alarm", "priority": 100},
        {"id": "battery_low", "priority": 90},
        {"id": "gateway_status", "priority": 10}
      ],
      "learned_from": ["gw-abc123"],
      "usage_count": 47
    }
  }
  ```

- [ ] **Template-Pool-Architektur**
  ```json
  {
    "templates": [
      {
        "id": "evalarm_panic",
        "name": "Panic Button Alarm",
        "filter_rules": ["panic_alarm", "battery_ok"],
        "priority": 100,
        "transform": { ... }
      },
      {
        "id": "evalarm_temperature",
        "name": "Temperatur-Update",
        "filter_rules": ["temperature_range"],
        "priority": 50,
        "transform": { ... }
      }
    ]
  }
  ```

- [x] **API-Endpunkte für Template-Gruppen**
  - [x] GET `/api/v1/template-groups` - Liste aller Gruppen
  - [x] POST `/api/v1/template-groups` - Neue Gruppe erstellen
  - [x] PUT `/api/v1/gateways/{id}/template-group` - Gruppe zuweisen
  - [x] POST `/api/v1/template-groups/{id}/clone` - Gruppe duplizieren und anpassen

- [ ] **Erweiterte Filterregeln**
  - [ ] `FieldExistsRule` - Prüft ob ein Feld existiert
  - [ ] `FieldNotExistsRule` - Prüft ob ein Feld NICHT existiert
  - [ ] `MessageTypeRule` - Unterscheidet Gateway- vs. Geräte-Nachrichten
  - [ ] `PatternMatchRule` - Komplexe Mustervergleiche

- [x] **Template-Matching-Engine**
  ```python
  def select_template_for_message(normalized_message, gateway):
      # 1. Hole Template-Gruppe des Gateways
      template_group = gateway.template_group
      templates = template_group.templates if template_group else get_default_templates()
      
      # 2. Prüfe Filterregeln
      matching_templates = []
      for template in templates:
          if all_filter_rules_match(template.filter_rules, normalized_message):
              matching_templates.append(template)
      
      # 3. Wähle nach Priorität
      if matching_templates:
          return max(matching_templates, key=lambda t: t.priority)
      
      # 4. Fallback
      return 'evalarm_status'
  ```

### Phase 3: Automatische Template-Generierung

- [ ] **Template-Generator aus Lern-Daten**
  - [ ] Analyse der gesammelten Nachrichtenmuster
  - [ ] Automatische Erstellung von Filterregeln basierend auf Mustern
  - [ ] Vorschlag von sinnvollen Transformationen
  - [ ] Prioritäten basierend auf Nachrichtenhäufigkeit

- [ ] **Intelligente Regel-Generierung**
  - [ ] Für Panic-Buttons: Erkenne `alarmtype: panic` Muster
  - [ ] Für Sensoren: Erkenne numerische Wertebereiche
  - [ ] Für Status: Erkenne Gateway-spezifische Felder
  - [ ] Kombinierte Regeln für komplexe Geräte

### Phase 4: UI für Einlern-System und Template-Verwaltung

- [x] **Einlern-Dashboard**
  - [x] Status-Anzeige des Lernfortschritts
  - [x] Visualisierung erkannter Nachrichtenmuster
  - [x] Manuelle Klassifizierung unklarer Nachrichten
  - [x] Template-Vorschau basierend auf Lerndaten
  - [x] Übersicht aller Gateways im Lernmodus
  - [x] Fortschrittsbalken und Statistiken
  - [x] Tabs für Übersicht, Muster und Template-Vorschläge

- [x] **Template-Gruppen-Verwaltung**
  - [x] Übersicht aller verfügbaren Template-Gruppen
  - [x] Schnellzuweisung bei Gateway-Erstellung: "Template-Gruppe wählen" statt Einlernen
  - [x] Template-Gruppen-Editor: Templates hinzufügen/entfernen/priorisieren
  - [ ] Import/Export von Template-Gruppen für Sharing zwischen Installationen
  - [ ] Statistiken: Welche Gruppen werden wie oft verwendet
  - [ ] Marketplace-Konzept: Community-Template-Gruppen teilen

- [x] **Gateway-Onboarding vereinfacht**
  ```
  Neues Gateway hinzufügen:
  
  ○ Gateway einlernen (24-48h)
  ● Template-Gruppe verwenden:
     
     [▼ Roombanker Panic System        ]
        ├─ 3 Templates enthalten
        ├─ 47x verwendet
        └─ Zuletzt aktualisiert: vor 2 Tagen
  
  [Gateway hinzufügen]
  ```

- [ ] **Template-Review und -Anpassung**
  - [ ] Übersicht generierter Template-Vorschläge
  - [ ] Drag-and-Drop Anpassung von Filterregeln
  - [ ] Test mit echten Nachrichten aus Lernphase
  - [ ] Bulk-Aktivierung von Templates

- [ ] **Template-Pool-Verwaltung**
  - [ ] Übersicht aller Templates mit Matching-Statistik
  - [ ] Prioritäts-Management
  - [ ] Template-Versionierung
  - [ ] A/B-Testing für Templates

### Phase 5: Migration und Rückwärtskompatibilität

- [ ] **Migration bestehender Konfigurationen**
  - [ ] Konvertierung hart kodierter Logik in Filterregeln
  - [ ] Migration von Gateway-Templates zu Template-Pools
  - [ ] Beibehaltung der Funktionalität während Migration

- [ ] **Monitoring und Optimierung**
  - [ ] Logging welches Template für welche Nachricht gewählt wurde
  - [ ] Statistiken über Template-Nutzung
  - [ ] Automatische Vorschläge für neue Templates bei ungematchten Nachrichten
  - [ ] Performance-Optimierung des Matching-Prozesses

### Implementierungsplan

| Sprint | Deliverable                           | Owner   | Priorität |
|--------|---------------------------------------|---------|-----------|
| 1      | Learning-System Backend               | BE Team | Höchst    |
| 1      | Erweiterte Filterregeln               | BE Team | Höchst    |
| 2      | Template-Matching-Engine              | BE Team | Höchst    |
| 2      | Einlern-Dashboard UI                  | FE Team | Hoch      |
| 3      | Automatische Template-Generierung     | BE Team | Hoch      |
| 3      | Template-Pool-Verwaltung UI           | FE Team | Hoch      |
| 4      | Migration bestehender Systeme         | BE Team | Mittel    |
| 4      | Monitoring und Optimierung            | QA Team | Mittel    |

### Erwartete Vorteile

- **Intelligenz**: System lernt automatisch neue Gerätetypen
- **Flexibilität**: Verschiedene Templates für verschiedene Nachrichtentypen eines Gateways
- **Benutzerfreundlichkeit**: Keine technischen Kenntnisse für Template-Erstellung nötig
- **Genauigkeit**: Templates basieren auf echten Daten
- **Skalierbarkeit**: Neue Geräte = automatisches Lernen, keine Code-Änderungen
- **Wartbarkeit**: Keine hart kodierten Template-Zuordnungen mehr im Code

### Beispiel-Workflow

1. **Erstes Gateway eines Typs**
   - Admin aktiviert "Einlern-Modus"
   - System sammelt 24-48 Stunden alle Nachrichten
   - System erkennt: 3 Panic-Alarme, 576 Temperatur-Updates, 48 Status-Meldungen
   - Admin erstellt Template-Gruppe "Roombanker Panic System"
   - Gruppe wird für zukünftige Verwendung gespeichert

2. **Alle weiteren Gateways desselben Typs**
   - Admin wählt "Template-Gruppe verwenden"
   - Wählt "Roombanker Panic System" aus
   - Gateway ist sofort einsatzbereit - kein Einlernen nötig!

3. **Automatische Analyse (nur beim ersten Mal)**
   - System erkennt Nachrichtenmuster
   - Generiert Template-Vorschläge mit passenden Filterregeln
   - Admin gruppiert diese zu wiederverwendbarer Template-Gruppe

4. **Produktivbetrieb**
   - Jede Nachricht wird gegen alle Templates der Gruppe geprüft
   - Bestes Match wird automatisch gewählt
   - Ungematchte Nachrichten werden geloggt für weitere Optimierung

5. **Template-Gruppen-Sharing (optional)**
   - Exportiere erfolgreiche Template-Gruppen
   - Teile mit Community oder anderen Installationen
   - Importiere bewährte Gruppen von anderen Nutzern

## 21. Cloudflare-Integration und Sicherheitshärtung (HÖCHSTE PRIORITÄT)

Nach dem MongoDB-Ransomware-Angriff vom 26.05.2025 ist die Implementierung zusätzlicher Sicherheitsmaßnahmen kritisch. Die Integration von Cloudflare oder ähnlichen Diensten bietet mehrschichtige Sicherheit und Schutz vor verschiedenen Angriffsarten.

### Identifizierte Sicherheitsprobleme

- **MongoDB-Ransomware-Angriff**: Angreifer von IP 196.251.91.75 (und andere) haben die offene MongoDB auf Port 27017 kompromittiert
- **Offene Server-IP**: Die direkte Server-IP (23.88.59.133) ist öffentlich zugänglich und anfällig für Scans
- **Fehlender DDoS-Schutz**: Keine Absicherung gegen Überlastungsangriffe
- **Keine Bot-Filterung**: Automatisierte Scanner können Services entdecken

### Phase 1: Cloudflare Free Plan Setup (Sofort)

- [ ] **Domain-Registrierung bei Cloudflare**
  - [ ] evalarm.nextxiot.com bei Cloudflare registrieren
  - [ ] DNS-Records auf Cloudflare übertragen
  - [ ] A-Record für evalarm.nextxiot.com → 23.88.59.133
  - [ ] Proxy-Status aktivieren (Orange Wolke) für IP-Verschleierung

- [ ] **Basis-Sicherheitskonfiguration**
  - [ ] SSL/TLS-Modus auf "Full (strict)" setzen
  - [ ] Automatische HTTPS-Umleitung aktivieren
  - [ ] Minimum TLS-Version auf 1.2 setzen
  - [ ] HSTS (HTTP Strict Transport Security) aktivieren

- [ ] **Firewall-Regeln konfigurieren**
  - [ ] Bot-Fight-Mode aktivieren
  - [ ] Security Level auf "Medium" oder "High" setzen
  - [ ] Challenge Passage auf 30 Minuten setzen
  - [ ] Browser Integrity Check aktivieren

### Phase 2: Server-Firewall anpassen (Sprint 1)

- [ ] **Hetzner Firewall-Konfiguration**
  - [ ] Firewall-Regel erstellen: Nur Cloudflare-IPs erlauben (https://www.cloudflare.com/ips/)
  - [ ] Automatisches Update-Skript für Cloudflare-IP-Listen
  - [ ] Alle anderen IPs für Port 80/443 blockieren
  - [ ] SSH-Zugang auf spezifische IPs beschränken

- [ ] **Docker-Sicherheit**
  - [ ] Sicherstellen, dass keine Ports direkt exposed sind
  - [ ] Nur notwendige Ports über Reverse-Proxy zugänglich
  - [ ] Docker-Socket nicht nach außen exponieren
  - [ ] Container-Isolation überprüfen

### Phase 3: Erweiterte Cloudflare-Features (Sprint 2)

- [ ] **Page Rules einrichten (3 kostenlos)**
  - [ ] API-Endpunkte mit Cache-Bypass
  - [ ] Statische Assets mit langem Cache
  - [ ] Admin-Bereiche mit zusätzlicher Sicherheit

- [ ] **Firewall-Rules (5 kostenlos)**
  - [ ] Rate-Limiting für API-Endpunkte
  - [ ] Geo-Blocking für nicht benötigte Regionen
  - [ ] User-Agent-Blocking für bekannte Scanner
  - [ ] Path-basierte Zugriffsbeschränkungen

- [ ] **Zero Trust Access (optional)**
  - [ ] Cloudflare Access für Admin-Bereiche evaluieren
  - [ ] 2FA für kritische Endpunkte
  - [ ] Service-Token für API-Zugriffe

### Phase 4: Monitoring und Alerting (Sprint 3)

- [ ] **Cloudflare Analytics nutzen**
  - [ ] Dashboard für Traffic-Überwachung einrichten
  - [ ] Threat-Analytics regelmäßig überprüfen
  - [ ] Bot-Traffic-Analyse
  - [ ] Performance-Metriken überwachen

- [ ] **Alerting konfigurieren**
  - [ ] DDoS-Angriff-Benachrichtigungen
  - [ ] Ungewöhnliche Traffic-Muster
  - [ ] SSL-Zertifikat-Ablauf
  - [ ] Origin-Server-Erreichbarkeit

- [ ] **Incident Response Plan**
  - [ ] Dokumentation für DDoS-Mitigation
  - [ ] Rollback-Strategien
  - [ ] Kontakt-Eskalation definieren
  - [ ] Backup-Zugangswege dokumentieren

### Phase 5: Alternative Lösungen evaluieren

- [ ] **Andere CDN/WAF-Anbieter prüfen**
  - [ ] AWS CloudFront + WAF (teurer, aber mächtiger)
  - [ ] Fastly (entwicklerfreundlich)
  - [ ] Bunny CDN (kostengünstig)
  - [ ] Sucuri (spezialisiert auf Sicherheit)

- [ ] **Self-Hosted Alternativen**
  - [ ] ModSecurity WAF evaluieren
  - [ ] Fail2ban für Brute-Force-Schutz
  - [ ] CrowdSec für kollaborative Sicherheit
  - [ ] WireGuard VPN für Admin-Zugriff

### Implementierungsplan

| Sprint | Deliverable                          | Owner     | Priorität |
|--------|--------------------------------------|-----------|-----------|
| Sofort | Cloudflare Free Plan Setup           | DevOps    | Höchst    |
| 1      | Server-Firewall Härtung              | DevOps    | Höchst    |
| 2      | Erweiterte Cloudflare-Konfiguration  | DevOps    | Hoch      |
| 3      | Monitoring und Alerting              | DevOps/QA | Hoch      |
| 4      | Alternative Lösungen evaluieren      | Arch Team | Mittel    |

### Erwartete Sicherheitsverbesserungen

- **IP-Verschleierung**: Server-IP nicht mehr direkt erreichbar
- **DDoS-Schutz**: Automatische Mitigation von Überlastungsangriffen
- **Bot-Filterung**: Blockierung automatisierter Scanner
- **WAF-Schutz**: Basis-Schutz gegen Web-Angriffe
- **SSL/TLS**: Durchgängige Verschlüsselung
- **Caching**: Verbesserte Performance und reduzierte Server-Last
- **Analytics**: Einblick in Angriffsmuster und Traffic

### Kritische Sofortmaßnahmen

1. **MongoDB bereits gesichert** ✅
   - Port 27017 geschlossen
   - Authentifizierung implementiert
   - Nur Docker-interne Kommunikation

2. **Cloudflare-Setup** (SOFORT DURCHFÜHREN)
   - Verhindert weitere direkte Scans
   - Sofortiger DDoS-Schutz
   - IP-Verschleierung aktiv

3. **Server-Firewall** (INNERHALB 24H)
   - Nur Cloudflare-IPs erlauben
   - Direkte Zugriffe blockieren
   - SSH absichern

### Template-Gruppen-Implementierung

- [x] **Backend-API für Template-Gruppen**
  - [x] Datenmodell TemplateGroup in api/models.py
  - [x] CRUD-Endpunkte in message_worker.py
  - [x] API-Konfiguration in utils/api_config.py
  - [x] Gateway-Routing für template-groups
  - [x] Erfolgreich getestet auf allen Ebenen (Processor, Gateway, Frontend)

- [x] **Frontend für Template-Gruppen**
  - [x] TemplateGroups.jsx Seite
  - [x] TemplateGroupModal.jsx Komponente
  - [x] API-Integration in frontend/src/api.js
  - [x] Navigation in Navbar.jsx
  - [x] Routing in App.jsx

- [x] **Gateway-Integration**
  - [x] Gateway-Formular erweitert für template_group_id
  - [x] Datenbank-Schema angepasst

- [x] **Dokumentation**
  - [x] API-Endpunkte in API-DOKUMENTATION.md
  - [x] Datenmodelle dokumentiert
  - [x] Architektur in ARCHITECTURE.md beschrieben