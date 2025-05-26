# MQTT-Sniffer-Relay für OpenWRT

Diese Anleitung beschreibt, wie das MQTT-Sniffer-Relay auf OpenWRT-Geräten eingerichtet wird, um Gateway-Nachrichten an das evAlarm-IoT Gateway Management System weiterzuleiten.

## Überblick

Das MQTT-Sniffer-Relay erfasst Nachrichten von IoT-Gateways im lokalen Netzwerk und leitet sie an den evAlarm-IoT Gateway Management Server weiter. Dies ermöglicht die zentrale Verwaltung von Gateways und die Weiterleitung von Alarmen.

## Voraussetzungen

- OpenWRT-basiertes Gerät (Router/Gateway)
- Internetzugang zum evAlarm-Server
- Schreibrechte auf dem OpenWRT-Gerät (root-Zugriff)

## Installationsschritte

### 1. MQTT-Sniffer-Relay-Skript erstellen

Erstellen Sie das Hauptskript unter `/usr/bin/mqtt-sniffer-relay.sh`:

```bash
cat > /usr/bin/mqtt-sniffer-relay.sh << 'EOF'
#!/bin/sh

# Konfiguration
SERVER_URL="https://iot.evalarm.de/api/test"
INTERFACE="br-lan"  # Anpassen an Ihr Netzwerk-Interface
FILTER="port 1883"  # MQTT Standard-Port
LOG_FILE="/var/log/mqtt-sniffer.log"

# Endlosschleife für kontinuierliches Sniffing
while true; do
    echo "$(date): MQTT-Sniffer gestartet" >> $LOG_FILE
    
    # tcpdump ausführen und Pakete abfangen
    tcpdump -i $INTERFACE -l -nn "$FILTER" 2>/dev/null | while read line; do
        # Hier Logik zum Extrahieren der relevanten Daten
        if echo "$line" | grep -q "PUBLISH"; then
            payload=$(echo "$line" | grep -o '{.*}' || echo "")
            if [ -n "$payload" ]; then
                echo "$(date): Nachricht gefunden: $payload" >> $LOG_FILE
                
                # Nachricht an Server weiterleiten
                response=$(curl -s -X POST -H "Content-Type: application/json" \
                           -d "$payload" $SERVER_URL 2>&1)
                
                echo "$(date): Server-Antwort: $response" >> $LOG_FILE
            fi
        fi
    done
    
    echo "$(date): MQTT-Sniffer beendet, Neustart in 5 Sekunden..." >> $LOG_FILE
    sleep 5
done
EOF

# Skript ausführbar machen
chmod +x /usr/bin/mqtt-sniffer-relay.sh
```

### 2. Init-Skript für OpenWRT erstellen

Erstellen Sie ein OpenWRT-kompatibles Init-Skript:

```bash
cat > /etc/init.d/mqtt-sniffer-relay << 'EOF'
#!/bin/sh /etc/rc.common

START=99
STOP=10

USE_PROCD=1
PROG=/usr/bin/mqtt-sniffer-relay.sh

start_service() {
    procd_open_instance
    procd_set_param command $PROG
    procd_set_param stdout 1
    procd_set_param stderr 1
    procd_set_param respawn
    procd_close_instance
}
EOF

# Init-Skript ausführbar machen
chmod +x /etc/init.d/mqtt-sniffer-relay
```

### 3. Abhängigkeiten installieren

Installieren Sie die benötigten Pakete:

```bash
opkg update
opkg install tcpdump curl
```

### 4. Dienst aktivieren und starten

```bash
# Dienst beim Systemstart aktivieren
/etc/init.d/mqtt-sniffer-relay enable

# Dienst sofort starten
/etc/init.d/mqtt-sniffer-relay start
```

### 5. Status überprüfen

```bash
# Prüfen, ob der Dienst läuft
ps | grep mqtt-sniffer

# Log-Datei überprüfen
tail -f /var/log/mqtt-sniffer.log
```

## Anpassung der Konfiguration

Bei Bedarf können Sie folgende Parameter im Skript `/usr/bin/mqtt-sniffer-relay.sh` anpassen:

- `SERVER_URL`: Die URL des evAlarm-IoT Gateway Management Servers
- `INTERFACE`: Das Netzwerk-Interface, auf dem der MQTT-Verkehr überwacht werden soll
- `FILTER`: Der tcpdump-Filter (standardmäßig MQTT-Port 1883)

## Fehlersuche

- **Dienst startet nicht**: Überprüfen Sie das System-Log mit `logread`
- **Keine Nachrichten werden erkannt**: Überprüfen Sie, ob das richtige Interface ausgewählt ist
- **Verbindungsprobleme zum Server**: Überprüfen Sie die Internetverbindung und die SERVER_URL

## Hinweis zur Sicherheit

ssh -oHostKeyAlgorithms=+ssh-rsa -oPubkeyAcceptedKeyTypes=+ssh-rsa root@192.168.178.67

Dieses Skript erfasst MQTT-Verkehr im Netzwerk. Stellen Sie sicher, dass Sie die rechtlichen Anforderungen für das Monitoring von Netzwerkverkehr in Ihrer Umgebung erfüllen. 