# IoT Gateway MQTT-Sniffer und Relay

Dieses Verzeichnis enthält Skripte und Konfigurationen für das IoT-Gateway, das MQTT-Nachrichten abfängt und an den Backend-Server weiterleitet.

## Komponenten

### 1. MQTT-Sniffer-Relay

Das `mqtt-sniffer-relay.sh` Skript überwacht den Netzwerkverkehr auf Port 1883 (MQTT) und leitet JSON-Daten an den zentralen Server weiter.

#### Funktionsweise:
- Überwacht das konfigurierte Netzwerkinterface auf MQTT-Verkehr
- Extrahiert JSON-Payloads aus den abgefangenen MQTT-Nachrichten
- Erweitert die JSON-Daten um eine eindeutige Gateway-ID
- Sendet die Daten an den konfigurierten API-Endpunkt

#### Installation auf dem Gateway:
Per SSH mit Router verbinden: 
ssh -oHostKeyAlgorithms=+ssh-rsa -oPubkeyAcceptedKeyTypes=+ssh-rsa root@"routerIP"
TestROuter: XmXj8pEM

opkg update

```bash
#Erstelle das Skript
cat > /usr/bin/mqtt-sniffer-relay.sh << 'EOF'
#!/bin/sh

# Konfiguration
INTERFACE="eth0"
SERVER_URL="http://157.180.37.234/api/test"
TMP_FILE="/tmp/mqtt-sniff-last.json"
UUID_FILE="/etc/gateway-uuid"

# UUID erzeugen falls nicht vorhanden
[ -f "$UUID_FILE" ] || echo "gw-$(cat /proc/sys/kernel/random/uuid)" > "$UUID_FILE"
UUID=$(cat "$UUID_FILE")

echo "[*] MQTT Sniffer-Relay gestartet..."
echo "[*] Gateway-ID: $UUID"
echo "[*] Sende erkannte JSON-Daten an: $SERVER_URL"
echo

tcpdump -A -l -i "$INTERFACE" port 1883 2>/dev/null | while read line; do
    echo "$line" | grep -Eo '\{.*\}' | while read json; do
        [ "$(echo "$json" | wc -c)" -lt 10 ] && continue
        if [ -f "$TMP_FILE" ]; then
            LAST=$(cat "$TMP_FILE")
            [ "$json" = "$LAST" ] && continue
        fi
        echo "[+] Neue JSON erkannt:"
        echo "$json"
        echo "$json" > "$TMP_FILE"

        # JSON mit Gateway-ID erweitern
        payload=$(echo "$json" | sed 's/^{/{ "gateway_id": "'"$UUID"'", /')

        curl -s -X POST "$SERVER_URL" -H "Content-Type: application/json" -d "$payload"
        echo
    done
done
EOF

# Skript ausführbar machen
chmod +x /usr/bin/mqtt-sniffer-relay.sh

# Konfiguriere das Interface/URL falls nötig
nano /usr/bin/mqtt-sniffer-relay.sh

# Stelle sicher, dass tcpdump installiert ist
sudo apt update
opkg install tcpdump
opkg apt install curl

# Starte das Skript manuell zum Testen
 /usr/bin/mqtt-sniffer-relay.sh
```

### 2. Automatischer Start beim Hochfahren

Die Datei  konfiguriert das System so, dass das MQTT-Sniffer-Relay beim Hochfahren automatisch gestartet wird.

#### Installation:

(Achtung: OpenWrt hat meist kein tcpdump vorinstalliert. Falls möglich: opkg update && opkg install tcpdump)

```bash
# Kopiere rc.local
sudo cp rc.local /etc/
sudo chmod +x /etc/rc.local

# Bei systemd-basierten Systemen den rc-local Service aktivieren
cat > /etc/init.d/mqtt-sniffer-relay << 'EOF'
#!/bin/sh /etc/rc.common

START=99
STOP=10

start() {
    echo "Starte MQTT Sniffer Relay..."
    /usr/bin/mqtt-sniffer-relay.sh &
}

stop() {
    echo "Stoppe MQTT Sniffer Relay..."
    killall mqtt-sniffer-relay.sh 2>/dev/null
}
EOF

chmod +x /etc/init.d/mqtt-sniffer-relay
/etc/init.d/mqtt-sniffer-relay enable
/etc/init.d/mqtt-sniffer-relay start
```

## Konfiguration

### Gateway-ID

Jedes Gateway generiert beim ersten Start eine eindeutige ID, die in `/etc/gateway-uuid` gespeichert wird. Diese ID wird mit jeder gesendeten Nachricht übermittelt und ermöglicht die Identifizierung des Gateways.

### Server-URL

Die URL des Backend-Servers ist im Skript konfiguriert:
```
SERVER_URL="http://http://167.235.56.144//api/test"
```

Bei Änderungen am Backend (z.B. Domain-Änderung) muss diese URL aktualisiert werden.

**Hinweis:** Seit der Migration auf Nginx als Reverse Proxy wird Port 80 (Standard-HTTP) verwendet statt des direkten Service-Ports.

## Fehlerbehebung

Falls das Gateway keine Daten sendet:

1. Prüfen Sie, ob das Skript läuft: `ps aux | grep mqtt-sniffer`
2. Überprüfen Sie das konfigurierte Interface: `ip addr show`
3. Testen Sie den Zugriff auf den Server: `curl -v http://157.180.37.234/api/health`
4. Überprüfen Sie die MQTT-Kommunikation: `sudo tcpdump -A -l -i eth0 port 1883`
