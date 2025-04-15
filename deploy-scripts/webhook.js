/**
 * GitHub Webhook Server für automatisches Deployment
 * 
 * Dieser Server empfängt Webhook-Anfragen von GitHub und führt
 * das Deployment-Skript aus.
 */

const express = require('express');
const { exec } = require('child_process');
const app = express();
const port = 8000;

app.use(express.json());

app.post('/deploy', (req, res) => {
  console.log('Deployment-Webhook empfangen');
  
  // Verwende explizit bash mit -c und . statt source für die venv-Aktivierung
  exec('/bin/bash -c "cd /var/www/iot-gateway && git pull && . venv/bin/activate && pip install -r api/requirements.txt && cd frontend && npm install && npm run build && cd .. && pm2 reload all"', 
    (error, stdout, stderr) => {
      if (error) {
        console.error(`Fehler beim Deployment: ${error}`);
        return res.status(500).send('Deployment fehlgeschlagen');
      }
      console.log(`Deployment erfolgreich: ${stdout}`);
      if (stderr) console.error(`Deployment-Ausgabe: ${stderr}`);
      res.status(200).send('Deployment erfolgreich');
    }
  );
});

// Einfacher Status-Endpunkt
app.get('/status', (req, res) => {
  res.status(200).send('Webhook-Server läuft');
});

app.listen(port, () => {
  console.log(`Webhook-Server läuft auf Port ${port}`);
}); 