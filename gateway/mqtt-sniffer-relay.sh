cat > /usr/bin/mqtt-sniffer-relay.sh << 'EOF'
#!/bin/sh

# Konfiguration
INTERFACE="eth0"
SERVER_URL="http://157.180.37.234/api/v1/process"
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

        # JSON mit Gateway-ID erweitern (korrigierte Version)
        payload=$(echo '{ "gateway_id": "'"$UUID"'", "message": '"$json"' }')

        # Debug-Ausgabe vor dem Senden
        echo "[*] Sende Payload:"
        echo "$payload" | python3 -m json.tool 2>/dev/null || echo "$payload"

        # Senden mit erweitertem Error-Handling
        response=$(curl -s -X POST "$SERVER_URL" \
            -H "Content-Type: application/json" \
            -d "$payload" \
            -w "\nHTTP-Status: %{http_code}")
        
        echo "[*] Server-Antwort:"
        echo "$response"
        echo "----------------------------------------"
    done
done
EOF

# Korrekter Endpunkt: http://157.180.37.234/api/v1/process
