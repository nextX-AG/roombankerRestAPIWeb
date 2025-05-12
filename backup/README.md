# Backup von entfernten Dateien

Dieser Ordner enthält Dateien, die während des Refactorings entfernt oder ersetzt wurden, aber für Referenzzwecke aufbewahrt werden.

## Inhalt

### API-Verzeichnis
- `api/requirements.txt`: Ursprüngliche dienstspezifische requirements.txt, die durch die zentrale requirements.txt im Wurzelverzeichnis ersetzt wurde.

### Gateway-Verzeichnis
- `gateway/API-GATEWAY-README.md`: Ursprüngliche Gateway-Dokumentation, die in die Architektur-Dokumentation integriert wurde.
- `gateway/ngix.md`: Alte NGINX-Dokumentation, die durch die automatisierte NGINX-Konfiguration überflüssig wurde.

### Scripts-Verzeichnis
- `fix_local.sh`: Fix-Skript für lokale Umgebung (veraltet)
- `fix_processor.sh`: Fix-Skript für den Processor (veraltet)
- `fix_server.sh`: Fix-Skript für Server (veraltet)
- `test.sh`: Altes Testskript, das nicht mehr verwendet wird

### Samples-Verzeichnis
- `sample.md`: Beispieldaten für Entwicklung und Tests
- `sample_evAlarm.md`: evAlarm-spezifische Beispieldaten

### Logs-Verzeichnis
- `worker.log`: Alte Worker-Logs, die nicht im Hauptverzeichnis liegen sollten

## Entfernte Dateien

Folgende Dateien wurden vollständig entfernt, da sie nicht mehr benötigt werden:

- `utils/redis_client.py`: Redis-Mock-Implementierung, die entfernt wurde, da wir in allen Umgebungen eine reale Redis-Verbindung erfordern.

## Änderungen an der Systemarchitektur

- **Mock-Entfernung**: Das System verwendet keine Mocks mehr für Redis oder andere Dienste, um konsistentes Verhalten zwischen allen Umgebungen zu gewährleisten.
- **Zentrale Requirements**: Alle Python-Abhängigkeiten werden jetzt zentral in einer einzigen `requirements.txt` im Wurzelverzeichnis verwaltet.
- **Redis-Konfiguration**: Die robuste Redis-Verbindungsstrategie wurde beibehalten, die mehrere potenzielle Hosts testet und nur startet, wenn eine echte Verbindung hergestellt werden kann.
- **NGINX-Konfiguration**: Die NGINX-Konfiguration wird jetzt automatisch aus der zentralen API-Konfiguration generiert.
- **Bereinigtes Hauptverzeichnis**: Veraltete Skripte, Beispieldateien und Logs wurden in den Backup-Ordner verschoben, um das Hauptverzeichnis übersichtlicher zu gestalten. 