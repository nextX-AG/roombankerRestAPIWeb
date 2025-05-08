# TODO: evAlarm-IoT Gateway Management System

## 1. Datenbank-Erweiterung

### Datenbank-Setup
- [ ] MongoDB für persistente Daten einrichten
- [ ] Redis für Caching und Message Queue weiter nutzen
- [ ] Verbindungskonfiguration und Absicherung

### Kundenmanagement
- [ ] Tabelle/Collection für Kunden anlegen
  - Kunden-ID als Primärschlüssel
  - Name, Ansprechpartner, Kontaktdaten
  - API-Credentials für evAlarm-Schnittstelle
  - Status (aktiv, inaktiv)
  - Notifikationseinstellungen
- [ ] CRUD-API-Endpunkte für Kundenverwaltung
- [ ] Zuordnung von Gateways zu Kunden

### Gateway-Verwaltung
- [ ] Tabelle/Collection für Gateways anlegen
  - Gateway UUID als Primärschlüssel
  - Kunde (Foreign Key)
  - Name und Beschreibung
  - Status (online, offline, wartung)
  - Template-Zuordnung
  - Konfigurationseinstellungen
  - Letzter Kontakt
- [ ] CRUD-API-Endpunkte für Gateway-Verwaltung
- [ ] Automatisierte Status-Aktualisierung
- [ ] Monitoring-System für Gateway-Status

### Geräte-Verwaltung
- [ ] Tabelle/Collection für Geräte anlegen
  - Interne ID als Primärschlüssel
  - Gateway-Zuordnung (Foreign Key)
  - Geräte-ID des Herstellers (aus subdevicelist)
  - Typ (Sensor, Kontakt, etc.) basierend auf empfangenen Werten
  - Name und Beschreibung (automatisch generiert, manuell anpassbar)
  - Status-Felder basierend auf empfangenen Werten
  - Letzter Status-Update
- [ ] Automatische Geräteerkennung bei Gateway-Kommunikation
  - Parsen der subdevicelist und Anlegen neuer Geräte
  - Aktualisierung bestehender Geräte
- [ ] Gerätestatus-Verlauf speichern

### Template-Verwaltung
- [ ] System für JavaScript-Transformationen implementieren
  - Upload-Funktionalität für JS-Dateien
  - Sichere Sandbox-Ausführung mit VM2
  - Versionierung der Transformationsskripte
- [ ] Test-Framework für Transformationen
  - Test mit Beispieldaten
  - Validierung der Ausgabe
- [ ] Integration mit JSONata für vereinfachte Transformationen

## 2. Backend-Erweiterung

### Routing-System
- [ ] Dynamisches Routing basierend auf Kundenstruktur implementieren
  - Gateway → Kunde → API-Endpunkt
- [ ] JavaScript-basierte Transformationen pro Gateway/Kunde
- [ ] Intervallbasierte Übermittlung konfigurierbar machen
  - Sofortige Übermittlung (Echtzeit)
  - Gepuffertes Senden (z.B. alle 5 Minuten)
  - Aggregation von Werten (min, max, avg)
- [ ] Authentifizierungssystem für externe APIs
- [ ] Retry-Mechanismus bei Übertragungsfehlern
- [ ] Backup-Storage für nicht zustellbare Nachrichten

### Monitoring & Alarmierung
- [ ] Gateway-Statusüberwachung
- [ ] Automatische Benachrichtigung bei Offline-Status
- [ ] Protokollierung aller Aktivitäten
- [ ] Fehlerbehandlung und -reporting

## 3. Frontend-Erweiterung

### Kundenmanagement-UI
- [ ] Kundenübersicht mit Such- und Filterfunktion
- [ ] Kunden-Detailseite
  - Gateway-Zuordnung
  - API-Konfiguration
  - Kontaktdaten
- [ ] Kundenzugangsmanagement

### Gateway-Management-UI
- [ ] Dashboard-Übersicht aller Gateways mit Status
- [ ] Gateway-Detailseite
  - Kundenzuordnung
  - Template-Zuweisung
  - Konfigurationseinstellungen
  - Geräteübersicht
- [ ] Gateway-Hinzufügen/Bearbeiten-Dialog
- [ ] Monitoring-Widgets für Gateway-Status

### Geräte-Management-UI
- [ ] Automatisch erkannte Geräte anzeigen
- [ ] Geräteliste mit Filterung und Suche
- [ ] Gruppierung nach Gateway und Kunde
- [ ] Statusanzeige und Verlaufsdiagramme
- [ ] Gerätedetailseite mit Ereignisverlauf
- [ ] Manuelle Anpassungsmöglichkeiten (Namen, Beschreibungen)

### Template-Management-UI
- [ ] JavaScript-Editor für Transformationen
- [ ] Vorschaufunktion mit Testdaten aus sample.md
- [ ] Versionsvergleich und Rollback-Möglichkeit
- [ ] JSONata-Integration für vereinfachte Transformationen

## 4. Benutzerverwaltung & Sicherheit

- [ ] Benutzerrollen für verschiedene Zugriffsebenen
  - Administrator (voller Zugriff)
  - Operator (Überwachung und Konfiguration)
  - Betrachter (nur Lesezugriff)
- [ ] API-Schlüsselverwaltung für externe Systeme
- [ ] Audit-Logging für Sicherheitsrelevante Aktionen
- [ ] Datenverschlüsselung für sensible Informationen

## Implementierungsplan

### Phase 1: Kundenverwaltung & Datenbank (Priorität: Hoch)
- [ ] MongoDB-Integration
- [ ] Kundenmanagement-System
- [ ] Gateway-Zuordnung zu Kunden
- [ ] Grundlegende UI-Komponenten

### Phase 2: Gateway & Gerätemanagement (Priorität: Hoch)
- [ ] Automatische Geräteerkennung aus Nachrichten
- [ ] Gateway-Statusüberwachung
- [ ] Gerätemanagement-UI

### Phase 3: Transformationen & Routing (Priorität: Mittel)
- [ ] JavaScript-Transformation mit Upload
- [ ] Intervallbasierte Übermittlung
- [ ] Konfigurierbare Routing-Regeln

### Phase 4: Monitoring & Optimierung (Priorität: Niedrig)
- [ ] Umfassendes Monitoring
- [ ] Benachrichtigungssystem
- [ ] Erweiterte Reporting-Funktionen 