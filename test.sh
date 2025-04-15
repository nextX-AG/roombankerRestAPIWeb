#!/bin/bash

# Testskript für das IoT Gateway-Relay System
echo "Starte Tests für das IoT Gateway-Relay System..."

# Projektverzeichnis
PROJECT_DIR="$(dirname "$(readlink -f "$0")")"
API_DIR="$PROJECT_DIR/api"
DATA_DIR="$PROJECT_DIR/data"

# Erstelle Testverzeichnis, falls es nicht existiert
mkdir -p "$PROJECT_DIR/tests"
TEST_LOG="$PROJECT_DIR/tests/test_results.log"

# Lösche alte Testlogs
rm -f "$TEST_LOG"

# Funktion zum Loggen von Testergebnissen
log_test() {
  echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$TEST_LOG"
}

# Funktion zum Testen von API-Endpunkten
test_endpoint() {
  local url="$1"
  local expected_status="$2"
  local description="$3"
  
  log_test "Test: $description"
  log_test "URL: $url"
  
  # Führe Anfrage aus und speichere Status und Antwort
  response=$(curl -s -o /dev/null -w "%{http_code}" "$url")
  
  if [ "$response" -eq "$expected_status" ]; then
    log_test "✅ Erfolgreich: Status $response (erwartet: $expected_status)"
    return 0
  else
    log_test "❌ Fehlgeschlagen: Status $response (erwartet: $expected_status)"
    return 1
  fi
}

# Funktion zum Testen von POST-Endpunkten
test_post_endpoint() {
  local url="$1"
  local data="$2"
  local expected_status="$3"
  local description="$4"
  
  log_test "Test: $description"
  log_test "URL: $url"
  log_test "Daten: $data"
  
  # Führe Anfrage aus und speichere Status und Antwort
  response=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -d "$data" "$url")
  
  if [ "$response" -eq "$expected_status" ]; then
    log_test "✅ Erfolgreich: Status $response (erwartet: $expected_status)"
    return 0
  else
    log_test "❌ Fehlgeschlagen: Status $response (erwartet: $expected_status)"
    return 1
  fi
}

# Starte alle Dienste
log_test "Starte alle Dienste..."
"$PROJECT_DIR/start.sh" > /dev/null 2>&1 &

# Warte, bis alle Dienste gestartet sind
log_test "Warte 10 Sekunden, bis alle Dienste gestartet sind..."
sleep 10

# Zähler für erfolgreiche und fehlgeschlagene Tests
success_count=0
failure_count=0

# Teste API-Server Health-Check
if test_endpoint "http://localhost:8080/api/health" 200 "API-Server Health-Check"; then
  ((success_count++))
else
  ((failure_count++))
fi

# Teste Message Processor Templates-Endpunkt
if test_endpoint "http://localhost:8081/api/templates" 200 "Message Processor Templates-Endpunkt"; then
  ((success_count++))
else
  ((failure_count++))
fi

# Teste Auth Service Login-Endpunkt
if test_post_endpoint "http://localhost:8082/api/auth/login" '{"username":"admin","password":"password"}' 200 "Auth Service Login-Endpunkt"; then
  ((success_count++))
else
  ((failure_count++))
fi

# Teste Testnachricht-Endpunkt
if test_post_endpoint "http://localhost:8080/api/test-message" '{}' 200 "API-Server Testnachricht-Endpunkt"; then
  ((success_count++))
else
  ((failure_count++))
fi

# Teste Template-Transformation
test_message='{
  "message": {
    "data": {
      "ts": 1744663550,
      "subdevicelist": [
        {
          "id": 665531142918213,
          "values": {
            "alarmstatus": "alarm",
            "alarmtype": "panic"
          }
        }
      ]
    },
    "id": "test-123",
    "timestamp": 1744663550,
    "received_at": "2025-04-15T14:40:00.000Z"
  },
  "template": "standard"
}'

if test_post_endpoint "http://localhost:8081/api/test-transform" "$test_message" 200 "Message Processor Template-Transformation"; then
  ((success_count++))
else
  ((failure_count++))
fi

# Prüfe, ob Nachrichten im Datenverzeichnis gespeichert wurden
log_test "Prüfe, ob Nachrichten im Datenverzeichnis gespeichert wurden..."
message_count=$(ls -1 "$DATA_DIR"/*.json 2>/dev/null | wc -l)

if [ "$message_count" -gt 0 ]; then
  log_test "✅ Erfolgreich: $message_count Nachricht(en) im Datenverzeichnis gefunden"
  ((success_count++))
else
  log_test "❌ Fehlgeschlagen: Keine Nachrichten im Datenverzeichnis gefunden"
  ((failure_count++))
fi

# Zusammenfassung der Testergebnisse
log_test "=== Zusammenfassung der Testergebnisse ==="
log_test "Erfolgreiche Tests: $success_count"
log_test "Fehlgeschlagene Tests: $failure_count"
log_test "Gesamtzahl Tests: $((success_count + failure_count))"

if [ "$failure_count" -eq 0 ]; then
  log_test "🎉 Alle Tests erfolgreich!"
else
  log_test "⚠️ Einige Tests sind fehlgeschlagen. Siehe Details oben."
fi

# Stoppe alle Dienste
log_test "Stoppe alle Dienste..."
"$PROJECT_DIR/stop.sh" > /dev/null 2>&1

log_test "Tests abgeschlossen. Ergebnisse wurden in $TEST_LOG gespeichert."

# Zeige Testergebnisse an
cat "$TEST_LOG"
