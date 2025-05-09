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
- [ ] System für JavaScript-Transformationen implementieren
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
- [ ] Dynamisches Routing basierend auf Kundenstruktur implementieren
  - Gateway → Kunde → evAlarm-API
- [ ] JavaScript-basierte Transformationen pro Gateway/Kunde
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
- [ ] JavaScript-Transformation mit Upload
- [ ] Sofortige Weiterleitung an evAlarm-API
- [ ] Konfigurierbare Routing-Regeln

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