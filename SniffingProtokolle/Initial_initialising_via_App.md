root@RGBW202:~# /usr/bin/mqtt-sniffer-relay.sh
[*] MQTT Sniffer-Relay gestartet...
[*] Gateway-ID: gw-c490b022-cc18-407e-a07e-a355747a8fdd
[*] Sende erkannte JSON-Daten an: http://157.180.37.234/api/test

[+] Neue JSON erkannt:
{"id":673919141171271,"username":"ZNpvjVCr6UMd87eQd6sQ/SS5vuItVQhRY1cp0F8YBi4=","usertype":"superadmin","keypassword":null,"linkrooms":{"method":"all","rooms":[]},"notificationenable":false,"notification":{"alarm":{"message":true,"sms":false,"dial":false},"operation":{"message":true,"sms":false,"dial":false},"fault":{"message":true,"sms":false,"dial":false},"event":{"message":true,"sms":false,"dial":false}},"phone":{"enable":false,"areacode":null,"phonenum":null},"userid":673919141171271,"url":"/rbapi/user/id","method":"POST"}
{
  "message_id": "e0f4ca6d-b29d-4538-944c-ecb917398619",
  "status": "success"
}

[+] Neue JSON erkannt:
{ "ts": 1746696242, "gateway": { "faultstatus": "fault" } }
{
  "message_id": "460260e3-4ee3-4414-9daf-8d978ba9274d",
  "status": "success"
}

[+] Neue JSON erkannt:
{ "code": 4020, "userid": 673919141171271, "ts": 1746696242 }2....gateway/telemetry..{ "gateway": { "powerstatus": "connected", "wanstatus": "connected", "wifistatus": "disconnected", "simstatus": "none", "cellularstatus": "disconnected", "pinstatus": "valid", "batterystatus": "connected", "electricity": 20, "lidstatus": "open", "alarmstatus": "normal", "faultstatus": "fault", "dbm": "-110" }, "ts": 1746696243 }2....gateway/systemconfiguration..{ "timezone": "UTC+8:0", "time": "2025/05/08 17:24:03", "lidenable": false, "rbfantennaenable": false, "celluarantennaenable": false, "dstconfig": { "enable": false }, "cellularconfig": { "username": "", "password": "", "apn": "em", "flowused": 0.00, "flowlimitenable": false, "flowlimit": 0 }, "faultcheckconfig": { "batterylostenable": true, "lowbatteryenable": true, "externalpowerlostenable": false, "lanlostenable": false, "lanlost": 0, "wifilostenable": false, "wifilost": 0, "cellularlostenable": false, "cellularlost": 0 }, "ipaddress": "192.168.178.67" }2x.Edevices/612241228902470/rpc/response/35434b050a3e45e2ab4e0d0711cb721a..{ "result": "OK", "errorcode": 0, "userid": 1 }
{
  "message": "Invalid JSON",
  "status": "error"
}

[+] Neue JSON erkannt:
{"Id":673919148429381,"EnterDelay":20,"ExitDelay":20,"mode":"all","sensorList":[],"userid":673919141171271,"url":"/rbapi/defence/out","method":"POST"}
{
  "message_id": "42ef0e4d-2de9-4fc1-aaec-c6084f4ada9a",
  "status": "success"
}

[+] Neue JSON erkannt:
{ "result": "OK", "errorcode": 0 }
{
  "message_id": "2b24b285-e600-4bdb-a305-cca7eb326198",
  "status": "success"
}

[+] Neue JSON erkannt:
{"Id":673919149076549,"DisableSensorList":[],"IsAlarm":1,"userid":673919141171271,"url":"/rbapi/defence/in","method":"POST"}
{
  "message_id": "18215ea2-fef6-4d3c-8ce1-f3d8b2f5cd52",
  "status": "success"
}

[+] Neue JSON erkannt:
{ "result": "OK", "errorcode": 0 }
{
  "message_id": "9ee578c2-d77e-4ffc-bb9a-145114d93421",
  "status": "success"
}

[+] Neue JSON erkannt:
{"language":"DE","userid":673919141171271,"url":"/rbapi/system/language","method":"PUT"}
{
  "message_id": "328fbf6c-c5d9-46ab-b7c9-360e82fc16ea",
  "status": "success"
}

[+] Neue JSON erkannt:
{ "result": "OK", "errorcode": 0 }
{
  "message_id": "6c7e2087-bfcf-4908-a486-bc2811900ba8",
  "status": "success"
}

[+] Neue JSON erkannt:
{"timezone":"UTC+0:00","DST":{"enable":false,"bias":0},"userid":673919141171271,"url":"/rbapi/system/datetime","method":"PUT"}
{
  "message_id": "f27246d2-5404-4241-86ce-c06b788300d8",
  "status": "success"
}

[+] Neue JSON erkannt:
{ "result": "OK", "errorcode": 0 }
{
  "message_id": "9b23d8a2-6f31-4d01-b7f1-37d3ac6ebfb2",
  "status": "success"
}

[+] Neue JSON erkannt:
{ "ts": 1746696300, "gateway": { "batterystatus": "connected", "electricity": 30 } }
{
  "message_id": "ad205ffa-afff-40cd-9a91-4b33314ca804",
  "status": "success"
}

[+] Neue JSON erkannt:
{ "ts": 1746696300, "gateway": { "faultstatus": "normal" } }
{
  "message_id": "4f72e497-174b-4f2c-94bd-055d7979c25b",
  "status": "success"
}


