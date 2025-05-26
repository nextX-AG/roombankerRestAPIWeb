#!/bin/bash

# Test-Skript für evAlarm-Übermittlungs-Blockierung
# Testet verschiedene Szenarien der Nachrichtenblockierung

GATEWAY_ID="gw-test-block-$(date +%s)"
API_URL="http://192.168.178.44:8000/api/v1"

echo "================================================"
echo "Test der evAlarm-Übermittlungs-Blockierung"
echo "================================================"
echo ""

# 1. Nachricht an nicht registriertes Gateway (sollte blockiert werden)
echo "1. Test: Nachricht an nicht registriertes Gateway"
echo "-------------------------------------------------"
curl -s -X POST $API_URL/messages/process \
  -H "Content-Type: application/json" \
  -d '{
    "gateway_id": "'$GATEWAY_ID'",
    "ts": '$(date +%s)',
    "code": 2030,
    "subdeviceid": 123456,
    "alarmtype": "panic",
    "alarmstatus": "alarm"
  }' | jq .

echo ""
echo "2. Setze Gateway in Lernmodus"
echo "------------------------------"
# Hier würde normalerweise das Gateway über die UI in den Lernmodus versetzt

echo ""
echo "3. Test: Nachricht im Lernmodus (sollte blockiert werden)"
echo "----------------------------------------------------------"
# Simuliere eine Nachricht während des Lernens

echo ""
echo "4. Test mit globaler Umgebungsvariable"
echo "---------------------------------------"
echo "Setze EVALARM_TEST_MODE=true"

# Ausgabe der blockierten Nachrichten
echo ""
echo "5. Blockierte Nachrichten anzeigen"
echo "----------------------------------"
if [ -d "data/blocked_messages" ]; then
  echo "Anzahl blockierter Nachrichten: $(ls -1 data/blocked_messages/*.json 2>/dev/null | wc -l)"
  echo ""
  echo "Letzte blockierte Nachricht:"
  ls -t data/blocked_messages/*.json 2>/dev/null | head -1 | xargs cat | jq .
else
  echo "Verzeichnis für blockierte Nachrichten existiert noch nicht"
fi 