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
    console.log(`${new Date().toISOString()} - Starte Deployment-Prozess in /var/www/iot-gateway`);
    
    // Verbessertes Deployment-Skript
    const deploymentScript = `
      cd /var/www/iot-gateway && 
      
      # Git-Berechtigungen korrigieren
      git config --global --add safe.directory /var/www/iot-gateway &&
      
      # Repository aktualisieren
      git stash &&
      git reset --hard origin/main &&
      git pull &&
      
      # Virtuelle Umgebung aktualisieren
      source venv/bin/activate &&
      pip install --upgrade pip &&
      pip install -r api/requirements.txt &&
      
      # Frontend bauen
      cd frontend &&
      npm install &&
      npm run build &&
      cd .. &&
      
      # PM2-Konfiguration erstellen und starten
      cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'iot-api',
      script: 'api/app.py',
      interpreter: '/var/www/iot-gateway/venv/bin/python3',
      cwd: '/var/www/iot-gateway',
      env: {
        'FLASK_ENV': 'production',
        'PORT': '8080',
        'REDIS_HOST': 'localhost',
        'REDIS_PORT': '6379',
        'REDIS_PASSWORD': 'OW!p3x?',
        'MONGODB_URI': 'mongodb://localhost:27017/',
        'MONGODB_DB': 'evalarm_gateway'
      }
    },
    {
      name: 'iot-processor',
      script: 'api/message_processor.py',
      interpreter: '/var/www/iot-gateway/venv/bin/python3',
      cwd: '/var/www/iot-gateway',
      env: {
        'FLASK_ENV': 'production',
        'PORT': '8081',
        'REDIS_HOST': 'localhost',
        'REDIS_PORT': '6379',
        'REDIS_PASSWORD': 'OW!p3x?',
        'MONGODB_URI': 'mongodb://localhost:27017/',
        'MONGODB_DB': 'evalarm_gateway'
      }
    },
    {
      name: 'iot-auth',
      script: 'api/auth_service.py',
      interpreter: '/var/www/iot-gateway/venv/bin/python3',
      cwd: '/var/www/iot-gateway',
      env: {
        'FLASK_ENV': 'production',
        'PORT': '8082',
        'REDIS_HOST': 'localhost',
        'REDIS_PORT': '6379',
        'REDIS_PASSWORD': 'OW!p3x?',
        'MONGODB_URI': 'mongodb://localhost:27017/',
        'MONGODB_DB': 'evalarm_gateway'
      }
    }
  ]
};
EOF
      &&
      
      # Alle Dienste neustarten
      pm2 delete all || true &&
      pm2 start ecosystem.config.js &&
      pm2 save
    `;
    
    // Führe das Deployment asynchron aus
    exec(`/bin/bash -c "${deploymentScript}"`, 
      {
        timeout: 600000, // 10 Minuten Timeout
        maxBuffer: 2 * 1024 * 1024 // 2MB Puffer für Ausgabe
      },
      (error, stdout, stderr) => {
        if (error) {
          console.error(`${new Date().toISOString()} - Fehler beim Deployment: ${error}`);
          console.error(`${new Date().toISOString()} - Stderr: ${stderr}`);
          return;
        }
        console.log(`${new Date().toISOString()} - Deployment erfolgreich abgeschlossen`);
        console.log(`${new Date().toISOString()} - Stdout: ${stdout}`);
        if (stderr) console.log(`${new Date().toISOString()} - Stderr: ${stderr}`);
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

// Verbindungs-Timeout auf 10 Minuten setzen
server.timeout = 600000; // 10 Minuten 