# Anleitung zur Korrektur der Portkonfiguration auf dem Produktionsserver

## Problem

Es gibt eine Diskrepanz zwischen den dokumentierten Portzuweisungen und der tatsächlichen Konfiguration auf dem Server:

**Dokumentation (API-DOKUMENTATION.md)**:
- Auth Service: Port 8081
- Message Processor: Port 8082

**Aktuelle Server-Konfiguration**:
- Auth Service: Port 8082
- Message Processor: Port 8081

Dies führt zu Problemen mit der Nginx-Konfiguration, da Anfragen an die falschen Services weitergeleitet werden.

## Lösungsschritte

### 1. PM2-Konfiguration korrigieren

Die korrigierte Datei `production.config.js` muss auf den Server übertragen werden:

```bash
scp deploy-scripts/production.config.js root@157.180.37.234:/var/www/iot-gateway/deploy-scripts/
```

### 2. Alte Nginx-Konfiguration sichern

```bash
ssh root@157.180.37.234 "cp /etc/nginx/sites-enabled/iot-gateway /etc/nginx/sites-enabled/iot-gateway.bak"
ssh root@157.180.37.234 "cp /etc/nginx/sites-available/iot-gateway /etc/nginx/sites-available/iot-gateway.bak"
```

### 3. Nginx-Konfiguration neu generieren und installieren

Wir verwenden unser verbessertes Script, um eine neue Nginx-Konfiguration zu generieren:

```bash
# Zuerst die aktualisierten Scripts auf den Server kopieren
scp utils/nginx_config_generator.py root@157.180.37.234:/var/www/iot-gateway/utils/
scp deploy-scripts/generate_nginx_config.sh root@157.180.37.234:/var/www/iot-gateway/deploy-scripts/
chmod +x /var/www/iot-gateway/deploy-scripts/generate_nginx_config.sh

# Dann alte Symlinks entfernen und neue Konfiguration generieren
ssh root@157.180.37.234 "rm -f /etc/nginx/sites-enabled/iot-gateway && cd /var/www/iot-gateway/deploy-scripts && ./generate_nginx_config.sh --server-name 157.180.37.234 --output /etc/nginx/sites-available/iot-gateway --restart"
```

### 4. Services neu starten

```bash
ssh root@157.180.37.234 "cd /var/www/iot-gateway && pm2 reload deploy-scripts/production.config.js"
```

### 5. Validierung

Überprüfe die aktualisierten Port-Zuweisungen:

```bash
ssh root@157.180.37.234 "netstat -tulpn | grep python"
```

Erwartet:
- Auth Service sollte auf Port 8081 laufen
- Message Processor sollte auf Port 8082 laufen

## Fehlerbehandlung

Falls Probleme auftreten:

1. PM2-Logs prüfen:
```bash
ssh root@157.180.37.234 "pm2 logs"
```

2. Nginx-Logs prüfen:
```bash
ssh root@157.180.37.234 "tail -f /var/log/nginx/error.log"
```

3. Zurück zur alten Konfiguration:
```bash
ssh root@157.180.37.234 "cp /etc/nginx/sites-available/iot-gateway.bak /etc/nginx/sites-available/iot-gateway && ln -sf /etc/nginx/sites-available/iot-gateway /etc/nginx/sites-enabled/iot-gateway && systemctl restart nginx" 