# Features des evAlarm-IoT Gateway Management Systems

Diese Dokumentation beschreibt die Hauptfunktionen des evAlarm-IoT Gateway Management Systems, deren Implementierungsstatus und weitere Entwicklungspläne.

## Übersicht der Hauptfunktionen

| Funktion | Status | Priorität | Beschreibung |
|----------|--------|-----------|--------------|
| Gateway-Verwaltung | ✅ Implementiert | Hoch | Zentrale Verwaltung von IoT-Gateways |
| Kunden-Verwaltung | ✅ Implementiert | Hoch | Verwaltung von Kunden mit API-Credentials |
| Geräte-Verwaltung | ✅ Implementiert | Hoch | Automatische Erkennung und Verwaltung von Geräten |
| Template-Verwaltung | ⚠️ Teilweise | Mittel | Verwaltung von Transformations-Templates |
| Nachrichten-Weiterleitung | ⚠️ Teilweise | Hoch | Transformieren und Weiterleiten von Nachrichten an evAlarm |
| Authentifizierung | ✅ Implementiert | Mittel | Benutzer-Authentifizierung |
| Status-Monitoring | ⚠️ Teilweise | Mittel | Überwachung von Gateways und Geräten |
| API-Gateway | ❌ Geplant | Hoch | Zentraler Zugangspunkt für alle API-Anfragen |

## Detaillierte Funktionsbeschreibungen

### 1. Gateway-Verwaltung

Die Gateway-Verwaltung ermöglicht das Registrieren, Überwachen und Konfigurieren von IoT-Gateways.

**Implementierte Funktionen:**
- Registrierung von Gateways mit eindeutiger UUID
- Zuweisung von Gateways zu Kunden
- Status-Tracking (online, offline, wartung)
- Automatische Erkennung nicht registrierter Gateways

**Geplante Erweiterungen:**
- Verbesserte Gateway-Statusüberwachung
- Benachrichtigungen bei Status-Änderungen
- Konsolidierte Konfigurationsmanagement für Gateways

### 2. Kunden-Verwaltung

Die Kundenverwaltung erlaubt die Organsation von Gateways nach Kunden und speichert Authentifizierungsdaten für evAlarm.

**Implementierte Funktionen:**
- CRUD-Operationen für Kunden
- Speichern von evAlarm-API-Credentials pro Kunde
- Namespace-Verwaltung für die evAlarm-API
- Zuordnung von Gateways zu Kunden

**Geplante Erweiterungen:**
- Erweiterte Kontaktdatenverwaltung
- Kundenspezifische Einstellungen für Alarme
- Multi-Tenancy-Funktionen

### 3. Geräte-Verwaltung

Die Geräteverwaltung ermöglicht die automatische Erkennung und Überwachung von mit Gateways verbundenen Geräten.

**Implementierte Funktionen:**
- Automatische Geräteerkennung aus Gateway-Nachrichten
- Anzeige von Geräten und deren Status
- Zuordnung zu Gateways und Kunden
- Filterfunktionen nach verschiedenen Kriterien

**Geplante Erweiterungen:**
- Umfassendere Gerätekonfiguration
- Verbesserte Gerätetype-Erkennung
- Historische Datenerfassung und -visualisierung

### 4. Template-Verwaltung

Die Template-Verwaltung definiert, wie Nachrichten transformiert werden, bevor sie an evAlarm weitergeleitet werden.

**Implementierte Funktionen:**
- Verwaltung von JSON-Templates
- Grundlegende Transformationslogik
- Template-Auswahl pro Gateway

**Geplante Erweiterungen:**
- JavaScript-basierte Transformationen mit VM2
- Template-Editor im Frontend
- Versionierung von Templates
- Testfunktionen für Templates mit Beispieldaten

### 5. Nachrichten-Weiterleitung

Die Nachrichtenweiterleitung empfängt, transformiert und leitet Nachrichten an evAlarm weiter.

**Implementierte Funktionen:**
- Empfang von MQTT-Nachrichten über HTTP
- Transformation basierend auf Templates
- Weiterleitung an evAlarm-API
- Protokollierung von Weiterleitungen

**Geplante Erweiterungen:**
- Kundenspezifisches Routing
- Erweiterte Fehlerbehandlung und Wiederholungslogik
- Gepufferte Sendungen für Status-Updates
- Priorisierung von Alarmnachrichten

### 6. Authentifizierung

Das Authentifizierungssystem steuert den Zugriff auf die Web-UI und API.

**Implementierte Funktionen:**
- JWT-basierte Authentifizierung
- Rollenbasierte Zugriffssteuerung (Admin, User)
- Session-Management

**Geplante Erweiterungen:**
- Feinere Berechtigungssteuerung
- OAuth-Integration
- Zwei-Faktor-Authentifizierung
- Kundenzugang mit eingeschränkten Rechten

### 7. Status-Monitoring

Das Status-Monitoring zeigt den aktuellen Zustand des Systems und aller Komponenten an.

**Implementierte Funktionen:**
- Dashboard mit Systemstatus
- Gateway-Status-Anzeige
- Einfache Benachrichtigungen im UI

**Geplante Erweiterungen:**
- Umfassende Statusüberwachung aller Komponenten
- E-Mail/SMS-Benachrichtigungen
- Grafische Auswertungen und Statistiken
- Status-Historie und Trends

### 8. API-Gateway (Geplant)

Der API-Gateway wird als zentraler Zugangspunkt für alle API-Anfragen dienen und das aktuelle verteilte System vereinfachen.

**Geplante Funktionen:**
- Zentrale Anfrageverarbeitung
- Einheitliche Fehlerbehandlung
- Vereinfachte Routing-Logik
- Verbesserte Sicherheit durch zentralisierte Authentifizierung
- Automatisierte API-Dokumentation

## Architektur-Roadmap

Folgende Architektur-Verbesserungen sind geplant:

1. **API-Gateway Pattern**
   - Zentralisierung der API-Anfragen
   - Einheitliche Fehlerbehandlung
   - Vereinfachte Routinglogik

2. **Service-Modul-Reorganisation**
   - Aufteilung nach Funktion, nicht nach Dienst
   - Reduzierung zirkulärer Abhängigkeiten
   - Klare Schnittstellendefinitionen

3. **Automatisierte NGINX-Konfiguration**
   - Generierung aus Route-Definitionen 
   - Konsistente Konfiguration

4. **Verbessertes API-Framework**
   - Evaluierung von FastAPI oder Flask-RestX
   - Automatische API-Dokumentation
   - Verbesserte Typsicherheit

Diese Features und Architektur-Änderungen sind Teil des laufenden Refactoring-Prozesses und werden schrittweise implementiert. 