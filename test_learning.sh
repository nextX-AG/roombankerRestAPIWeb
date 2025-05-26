#!/bin/bash

# Gateway-ID aus dem Screenshot
GATEWAY_ID="gw-c490b022-cc18-407e-a07e-a355747a8fdd"

# Verwende die interne IP-Adresse mit dem GATEWAY-Port (8000), nicht API-Port (8080)!
API_URL="http://192.168.178.44:8000/api/v1/messages/process"

echo "Sende Test-Nachrichten für Gateway: $GATEWAY_ID"
echo "API-URL: $API_URL"
echo "========================================"

# Sende verschiedene Arten von Nachrichten
for i in {1..20}; do
  # Zufällige Werte generieren
  TEMP=$((18 + RANDOM % 10))
  HUMIDITY=$((40 + RANDOM % 30))
  BATTERY=$((70 + RANDOM % 30))
  
  # Wechsle zwischen normalen und Alarm-Nachrichten
  if [ $((i % 5)) -eq 0 ]; then
    # Alarm-Nachricht (jede 5. Nachricht)
    ALARM_STATUS="alarm"
    ALARM_TYPE="panic"
    echo "[$i/20] Sende ALARM-Nachricht..."
  else
    # Normale Nachricht
    ALARM_STATUS="normal"
    ALARM_TYPE="none"
    echo "[$i/20] Sende normale Nachricht..."
  fi
  
  # Sende die Nachricht mit mehr Details für Debugging
  RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$API_URL" \
    -H "Content-Type: application/json" \
    -d "{
      \"gateway_id\": \"$GATEWAY_ID\",
      \"ts\": $(date +%s),
      \"code\": 2001,
      \"subdevicelist\": [{
        \"id\": $((1000000 + i)),
        \"value\": {
          \"alarmstatus\": \"$ALARM_STATUS\",
          \"alarmtype\": \"$ALARM_TYPE\",
          \"batterystatus\": \"connected\",
          \"batterylevel\": $BATTERY,
          \"temperature\": $TEMP,
          \"humidity\": $HUMIDITY,
          \"onlinestatus\": \"online\"
        }
      }]
    }")
  
  # Extrahiere HTTP-Status-Code
  HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d':' -f2)
  
  # Zeige Status nur bei Fehlern
  if [ "$HTTP_CODE" != "200" ]; then
    echo "  ⚠️  Fehler: HTTP $HTTP_CODE"
    echo "$RESPONSE" | sed '/HTTP_CODE:/d'
  else
    echo "  ✓ Erfolgreich gesendet (HTTP $HTTP_CODE)"
  fi
  
  # Kurze Pause zwischen Nachrichten
  sleep 2
done

echo ""
echo "✅ Fertig! 20 Test-Nachrichten wurden gesendet."
echo ""
echo "Die Nachrichten sollten jetzt vom Lernsystem erfasst werden."
echo "Gehe zum Template-Lernsystem im Browser, um die Fortschritte zu sehen." 