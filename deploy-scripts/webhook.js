/**
 * GitHub Webhook Server für automatisches Deployment
 * Robuste Version mit verbesserter Fehlerbehandlung
 */

const express = require('express');
const { exec } = require('child_process');
const app = express();
const port = 8000;

// Body-Parser für JSON-Requests
app.use(express.json({
  verify: (req, res, buf, encoding) => {
    // Speichere Rohdaten für Verifizierung
    req.rawBody = buf;
  }
}));

// Einfaches Logging-Middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Gesundheits-Check-Endpunkt
app.get('/health', (req, res) => {
  res.status(200).send('Webhook-Server ist gesund');
});

// Status-Endpunkt
app.get('/status', (req, res) => {
  res.status(200).send('Webhook-Server läuft');
});

// Deployment-Endpunkt
app.post('/deploy', (req, res) => {
  console.log('Deployment-Webhook empfangen');
  
  // Antworte sofort, um Timeout zu vermeiden
  res.status(202).send('Deployment gestartet');
  
  // Verzögerung bevor der Prozess beginnt
  setTimeout(() => {
    // Führe das Deployment asynchron aus
    exec('/bin/bash -c "cd /var/www/iot-gateway && git pull && . venv/bin/activate && pip install -r api/requirements.txt && cd frontend && npm install && npm run build && cd .. && pm2 reload all"', 
      {
        timeout: 300000, // 5 Minuten Timeout
        maxBuffer: 1024 * 1024 // 1MB Puffer für Ausgabe
      },
      (error, stdout, stderr) => {
        if (error) {
          console.error(`Fehler beim Deployment: ${error}`);
          console.error(stderr);
          return;
        }
        console.log(`Deployment erfolgreich: ${stdout}`);
        if (stderr) console.log(`Deployment-Ausgabe: ${stderr}`);
      }
    );
  }, 100);
});

// Catch-all für 404
app.use((req, res) => {
  res.status(404).send('Nicht gefunden');
});

// Fehlerbehandlung
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Interner Serverfehler');
});

// Server starten
const server = app.listen(port, () => {
  console.log(`Webhook-Server läuft auf Port ${port}`);
});

// Verbindungs-Timeout auf 5 Minuten setzen
server.timeout = 300000; // 5 Minuten 