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

```bash
# Kopiere das Skript
sudo cp mqtt-sniffer-relay.sh /usr/bin/
sudo chmod +x /usr/bin/mqtt-sniffer-relay.sh

# Konfiguriere das Interface/URL falls nötig
sudo nano /usr/bin/mqtt-sniffer-relay.sh

# Stelle sicher, dass tcpdump installiert ist
sudo apt update
sudo apt install -y tcpdump curl

# Starte das Skript manuell zum Testen
sudo /usr/bin/mqtt-sniffer-relay.sh
```

### 2. Automatischer Start beim Hochfahren

Die Datei `rc.local` konfiguriert das System so, dass das MQTT-Sniffer-Relay beim Hochfahren automatisch gestartet wird.

#### Installation:

```bash
# Kopiere rc.local
sudo cp rc.local /etc/
sudo chmod +x /etc/rc.local

# Bei systemd-basierten Systemen den rc-local Service aktivieren
if [ -d /lib/systemd/system ]; then
  cat > /lib/systemd/system/rc-local.service << EOF
[Unit]
Description=/etc/rc.local Compatibility
ConditionPathExists=/etc/rc.local

[Service]
Type=forking
ExecStart=/etc/rc.local start
TimeoutSec=0
StandardOutput=tty
RemainAfterExit=yes
SysVStartPriority=99

[Install]
WantedBy=multi-user.target
EOF

  systemctl enable rc-local
  systemctl start rc-local
fi
```

## Konfiguration

### Gateway-ID

Jedes Gateway generiert beim ersten Start eine eindeutige ID, die in `/etc/gateway-uuid` gespeichert wird. Diese ID wird mit jeder gesendeten Nachricht übermittelt und ermöglicht die Identifizierung des Gateways.

### Server-URL

Die URL des Backend-Servers ist im Skript konfiguriert:
```
SERVER_URL="http://157.180.37.234/api/test"
```

Bei Änderungen am Backend (z.B. Domain-Änderung) muss diese URL aktualisiert werden.

**Hinweis:** Seit der Migration auf Nginx als Reverse Proxy wird Port 80 (Standard-HTTP) verwendet statt des direkten Service-Ports.

## Fehlerbehebung

Falls das Gateway keine Daten sendet:

1. Prüfen Sie, ob das Skript läuft: `ps aux | grep mqtt-sniffer`
2. Überprüfen Sie das konfigurierte Interface: `ip addr show`
3. Testen Sie den Zugriff auf den Server: `curl -v http://157.180.37.234/api/health`
4. Überprüfen Sie die MQTT-Kommunikation: `sudo tcpdump -A -l -i eth0 port 1883`
