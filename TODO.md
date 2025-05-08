# TODO: evAlarm-IoT Gateway Management System

## 1. Datenbank-Erweiterung

### Gateway-Verwaltung
- [ ] Tabelle/Collection für Gateways anlegen
  - Gateway UUID als Primärschlüssel
  - Name und Beschreibung
  - Status (online, offline, wartung)
  - Template-Zuordnung
  - API-Ziel-Endpunkt 
  - API-Credentials (verschlüsselt)
  - Letzter Kontakt
- [ ] CRUD-API-Endpunkte für Gateway-Verwaltung
- [ ] Automatisierte Status-Aktualisierung

### Geräte-Verwaltung
- [ ] Tabelle/Collection für Geräte anlegen
  - Interne ID als Primärschlüssel
  - Gateway-Zuordnung (Foreign Key)
  - Geräte-ID des Herstellers
  - Typ (Sensor, Kontakt, etc.)
  - Name und Beschreibung
  - Status
  - Letzter Status-Update
- [ ] Automatische Geräteerkennung bei Gateway-Kommunikation
- [ ] Gerätestatus-Verlauf speichern

### Template-Verwaltung
- [ ] Erweiterte Template-Struktur
  - Mandantenfähigkeit (Multi-Tenant)
  - Versionierung
  - Validierungssystem

## 2. Backend-Erweiterung

### Routing-System
- [ ] Dynamisches Routing basierend auf Gateway-UUID implementieren
- [ ] Template-Zuweisung pro Gateway
- [ ] Authentifizierungssystem für externe APIs
- [ ] Retry-Mechanismus bei Übertragungsfehlern
- [ ] Backup-Storage für nicht zustellbare Nachrichten

### Monitoring & Alarmierung
- [ ] Gateway-Statusüberwachung
- [ ] Automatische Benachrichtigung bei Offline-Status
- [ ] Protokollierung aller Aktivitäten
- [ ] Fehlerbehandlung und -reporting

## 3. Frontend-Erweiterung

### Gateway-Management-UI
- [ ] Dashboard-Übersicht aller Gateways mit Status
- [ ] Gateway-Detailseite
  - Template-Zuweisung
  - API-Konfiguration
  - Credential-Management
  - Geräteübersicht
- [ ] Gateway-Hinzufügen/Bearbeiten-Dialog

### Geräte-Management-UI
- [ ] Geräteliste mit Filterung und Suche
- [ ] Gruppierung nach Gateway
- [ ] Statusanzeige und Verlaufsdiagramme
- [ ] Gerätedetailseite mit Ereignisverlauf

### Template-Management-UI
- [ ] Erweiterter Template-Editor
- [ ] Vorschaufunktion mit Testdaten
- [ ] Versionsverwaltung und Rollback-Möglichkeit

## 4. Benutzerverwaltung & Sicherheit

- [ ] Benutzerrollen für verschiedene Zugriffsebenen
  - Administrator (voller Zugriff)
  - Operator (Überwachung und Konfiguration)
  - Betrachter (nur Lesezugriff)
- [ ] API-Schlüsselverwaltung für externe Systeme
- [ ] Audit-Logging für Sicherheitsrelevante Aktionen
- [ ] Datenverschlüsselung für sensible Informationen

## Implementierungsplan

### Phase 1: Datenbankmodell & Grundfunktionen (Priorität: Hoch)
- [ ] Datenbankschema implementieren
- [ ] Backend-API für Gateway-Management
- [ ] Grundlegende UI-Komponenten

### Phase 2: Geräteverwaltung & Routing (Priorität: Hoch)
- [ ] Gerätemanagement-System
- [ ] Dynamisches Nachrichtenrouting
- [ ] Erweiterte UI-Funktionen

### Phase 3: Template-System & Benutzerverwaltung (Priorität: Mittel)
- [ ] Erweitertes Template-System
- [ ] Benutzerverwaltung & Berechtigungen
- [ ] UI-Verfeinerung

### Phase 4: Monitoring & Optimierung (Priorität: Niedrig)
- [ ] Umfassendes Monitoring
- [ ] Leistungsoptimierung
- [ ] Erweiterte Reporting-Funktionen 