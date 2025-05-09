cat > /usr/bin/mqtt-sniffer-relay.sh << 'EOF'
#!/bin/sh

# Konfiguration
INTERFACE="eth0"
SERVER_URL="http://192.168.178.44/api/test"
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