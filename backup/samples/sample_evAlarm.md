curl -u "eva.herford:GWB0oLZE" -X POST "https://tas.dev.evalarm.de/api/v1/espa" \
-H "Content-Type: application/json" \
-H "X-EVALARM-API-VERSION: 2.1.5" \
-d '{
  "events": [
    {
      "message": "Alarm Knopf",
      "address": "0",
      "namespace": "eva.herford",
      "id": "uniqeID", //zum Beispiel datum Uhrzeit als Timestamp
      "device_id": "UUID"
    }
  ]
}'