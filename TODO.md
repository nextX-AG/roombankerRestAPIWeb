# TODO: evAlarm-IoT Gateway Management System

## 1. Datenbank-Erweiterung

### Datenbank-Setup
- [x] MongoDB für persistente Daten einrichten
- [x] Redis für Caching und Message Queue weiter nutzen
- [ ] Verbindungskonfiguration und Absicherung

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
- [ ] Gerätestatus-Verlauf speichern

### Template-Verwaltung
- [ ] System für JavaScript-Transformationen implementieren (NIEDRIGE PRIORITÄT)
  - Upload-Funktionalität für JS-Dateien
  - Sichere Sandbox-Ausführung mit VM2
  - Versionierung der Transformationsskripte
  - Standardvorlage für evAlarm-Format erstellen
    ```javascript
    // Für evAlarm spezifisches Format
    function transform(data, customer) {
      // Als Basis nehmen wir einen Alarm aus subdevicelist oder Gateway-Status
      const hasAlarm = data.gateway?.alarmstatus === "alarm" || 
                      data.subdevicelist?.some(dev => dev.value?.alarmstatus === "alarm");
      
      if (hasAlarm) {
        return {
          events: [{
            message: getAlarmMessage(data),
            address: "0",
            namespace: customer.namespace,
            id: data.ts.toString(),
            device_id: customer.gateway_uuid
          }]
        };
      }
      
      // Kein Alarm, leeres Array senden oder null zurückgeben
      return null;
    }
    ```
- [ ] Test-Framework für Transformationen
  - Test mit Beispieldaten
  - Validierung gegen evAlarm-API-Format
- [ ] Integration mit JSONata für vereinfachte Transformationen

## 2. Backend-Erweiterung

### Routing-System
- [ ] Dynamisches Routing basierend auf Kundenstruktur implementieren (HÖCHSTE PRIORITÄT)
  - Gateway → Kunde → evAlarm-API
  - Für unseren Anwendungsfall: Ausschließliche Verwendung des evAlarm-Formats
- [ ] Bestehende Templates mit Kundendaten verknüpfen
  - Verwendung der Kunden-Credentials für API-Authentifizierung
  - Einfügen des korrekten Namespace aus Kundendaten
- [ ] Dual-Mode-Weiterleitung implementieren
  - Sofortige Übermittlung (Echtzeit) für Alarme
  - Optional: Gepuffertes Senden (z.B. alle 5 Minuten) für Status-Updates
- [ ] Authentifizierungssystem für evAlarm-API
  - Basic Auth mit kundenspezifischen Credentials
  - Header-Verwaltung (X-EVALARM-API-VERSION)
- [ ] Retry-Mechanismus bei Übertragungsfehlern
- [ ] Backup-Storage für nicht zustellbare Nachrichten

### Monitoring & Alarmierung
- [ ] Gateway-Statusüberwachung
- [ ] Automatische Benachrichtigung bei Offline-Status
- [ ] Protokollierung aller Aktivitäten und API-Aufrufe
- [ ] Fehlerbehandlung und -reporting

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
- [ ] Verbesserter Gateway-Registrierungsprozess
  - [ ] API-Endpunkt für unregistrierte Gateways implementieren (`/api/gateways/unassigned`)
  - [ ] Dropdown-Liste nicht zugeordneter Gateways im Hinzufügen/Bearbeiten-Dialog
  - [ ] Automatisches Befüllen des UUID-Felds bei Auswahl
  - [ ] Anzeige zusätzlicher Informationen (erster Kontakt, Nachrichtenanzahl)

### Geräte-Management-UI
- [x] Automatisch erkannte Geräte anzeigen
- [x] Geräteliste mit Filterung und Suche
- [x] Gruppierung nach Gateway und Kunde
- [x] Statusanzeige und Verlaufsdiagramme
- [x] Gerätedetailseite mit Ereignisverlauf
- [x] Manuelle Anpassungsmöglichkeiten (Namen, Beschreibungen)

### Template-Management-UI
- [ ] JavaScript-Editor für Transformationen
- [ ] Vorschaufunktion mit Testdaten aus sample.md
- [ ] Vorschau der evAlarm-API-Anfrage
- [ ] Versionsvergleich und Rollback-Möglichkeit
- [ ] JSONata-Integration für vereinfachte Transformationen

### Frontend-Verbesserungen

- [x] **API-Client-Generator**
  - [x] Zentrale API-Client Implementierung (`frontend/src/api.js`)
  - [x] Einheitliches Error-Handling
  - [x] Konsistente API-Aufrufe über alle Komponenten

- [x] **Zentralisierte API-Konfiguration**
  - [x] Konfigurierbare Basis-URL für verschiedene Umgebungen
  - [x] Vereinheitlichung aller API-Aufrufe

## 4. Benutzerverwaltung & Sicherheit

- [ ] Benutzerrollen für verschiedene Zugriffsebenen
  - Administrator (voller Zugriff)
  - Operator (Überwachung und Konfiguration)
  - Betrachter (nur Lesezugriff)
- [ ] API-Schlüsselverwaltung für externe Systeme
- [ ] Sichere Speicherung der Kundenzugänge für evAlarm-API
- [ ] Audit-Logging für Sicherheitsrelevante Aktionen
- [ ] Datenverschlüsselung für sensible Informationen

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
- [ ] Dynamisches Routing zur evAlarm-API (HÖCHSTE PRIORITÄT)
- [ ] Sofortige Weiterleitung an evAlarm-API
- [ ] Konfigurierbare Routing-Regeln
- [ ] JavaScript-Transformation mit Upload (NIEDRIGE PRIORITÄT)

### Phase 4: Monitoring & Optimierung (Priorität: Mittel)
- [ ] Umfassendes Monitoring
- [ ] Benachrichtigungssystem
- [ ] Erweiterte Reporting-Funktionen

## 5. UI-Optimierung und Vereinheitlichung (Priorität: Hoch, AKTUELLER TASK)

### Systematischer Ansatz für einheitliches UI-System
- [x] **CSS-Bereinigung**
  - [x] Reduzieren auf drei CSS-Dateien:
    - `global.css` - Allgemeine Stile und Bootstrap-Erweiterungen
    - `App.css` - Minimale anwendungsspezifische Stile
    - `index.css` - Nur grundlegende Browser-Resets
  - [x] Alle anderen komponentenspezifischen CSS-Dateien entfernen
  - [x] Konsequente Verwendung von Bootstrap-Klassen für Layouts

- [ ] **Einheitliches Seitenlayout**
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

- [ ] **API-Gateway-Pattern implementieren (HÖCHSTE PRIORITÄT)**
  - [ ] Zentraler API-Gateway-Dienst, der alle Anfragen verarbeitet
  - [ ] Dynamische Route-Weiterleitung zu spezifischen Service-Funktionen
  - [ ] Einheitliche Fehlerbehandlung und Logging

- [x] **Zentrale Konfigurationsverwaltung**
  - [x] Zentrale API-Konfigurationsdatei (`utils/api_config.py`) erstellt
  - [x] Einheitliche Endpunktverwaltung über alle Services hinweg
  - [x] API-Versionsmanagement (aktuell v1)

- [ ] **Service-Module reorganisieren**
  - [ ] Aufteilung nach Funktionen statt nach Diensten
  - [ ] Gemeinsame Schnittstellen zwischen Modulen
  - [ ] Weniger Abhängigkeiten und zirkuläre Importe
  ```
  services/
    __init__.py
    health.py       # Gesundheitschecks
    templates.py    # Template-Verwaltung
    forwarder.py    # Nachrichtenweiterleitung
    messages.py     # Nachrichtenverarbeitung 
    queue.py        # Queue-Management
  ```

- [ ] **Automatisierte NGINX-Konfiguration**
  - [ ] Generator für NGINX-Konfiguration aus Route-Definitionen
  - [ ] Automatische Aktualisierung bei Deployment
  - [ ] Vermeidung von manuellen Konfigurationsfehlern

- [ ] **API-Framework evaluieren und implementieren**
  - [ ] FastAPI als modernen Ersatz für Flask evaluieren
    - Automatische Swagger/OpenAPI-Dokumentation
    - Typ-Validierung mit Pydantic
    - Asynchrone Verarbeitung für bessere Performance
  - [ ] Flask-RestX für bestehende Flask-Anwendung prüfen
    - API-Dokumentation und Validierung
    - Strukturierte Route-Definition
  - [ ] Evaluierungskriterien definieren:
    - Kompatibilität mit bestehendem Code
    - Dokumentationsfunktionen
    - Validierungsmöglichkeiten
    - Performance unter Last
    - Wartbarkeit und Community-Support

- [ ] **Zentrale Konfigurationsverwaltung**
  - [ ] Umgebungsvariablen einheitlich verwalten
  - [ ] Konfigurationsdateien pro Umgebung (Entwicklung, Produktion)
  - [ ] Sichere Speicherung von Geheimnissen (z.B. mit python-dotenv)

### Monolithische Architektur mit logischer Trennung

- [ ] **Restrukturierung des Projekts**
  ```
  evAlarm-IoT-Gateway/
    app.py              # Hauptanwendung, lädt alle Module
    services/           # Dienste nach Funktion gegliedert
    models/             # Datenmodelle
    middleware/         # Middleware (Auth, Logging, etc.)
    utils/              # Hilfsfunktionen
    config/             # Konfigurationsdateien
      routes.py         # Zentrale API-Routendefinition
      nginx.py          # NGINX-Konfigurationsgenerator
  ```

- [ ] **Einheitliche Prozessverwaltung**
  - [ ] Ein Hauptprozess statt mehrerer getrennter Dienste
  - [ ] Worker- und Queue-Funktionalität als Threads/Prozesse
  - [ ] Einfacheres Deployment und Monitoring

### Implementierungsplan

- [x] **Phase 1: Evaluation und Planung**
  - [x] Erstellung der ARCHITECTURE.md-Datei zur Dokumentation des API-Designs
  - [x] Analyse des bestehenden Codes auf Refactoring-Möglichkeiten
  - [x] Detaillierter Migrationsplan mit Prioritäten

- [ ] **Phase 2: Minimale Implementation**
  - [x] Vereinheitlichung der API-Routen im Message Worker
  - [x] Zentrale API-Konfiguration implementiert (`utils/api_config.py`)
  - [x] Frontend-API-Client erstellt (`frontend/src/api.js`)
  - [ ] Vereinheitlichung der API-Routen in anderen Services
  - [ ] NGINX-Konfigurationsgenerator implementieren
  - [ ] Erste Dienste in das neue Format umziehen

- [ ] **Phase 3: Vollständige Umstellung**
  - [ ] Alle Dienste migrieren
  - [ ] Legacy-Code entfernen
  - [ ] Vollständige Testabdeckung sicherstellen

- [ ] **Phase 4: Optimierung**
  - [ ] Performance-Benchmarking
  - [ ] Code-Qualitätsmetriken erheben
  - [ ] Sicherheitsüberprüfung 