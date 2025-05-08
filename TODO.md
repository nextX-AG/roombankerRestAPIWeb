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
- [ ] Monitoring-System für Gateway-Status

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

### Phase 3: Transformationen & Routing (Priorität: Hoch)
- [ ] JavaScript-Transformation mit Upload
- [ ] Sofortige Weiterleitung an evAlarm-API
- [ ] Konfigurierbare Routing-Regeln

### Phase 4: Monitoring & Optimierung (Priorität: Mittel)
- [ ] Umfassendes Monitoring
- [ ] Benachrichtigungssystem
- [ ] Erweiterte Reporting-Funktionen 