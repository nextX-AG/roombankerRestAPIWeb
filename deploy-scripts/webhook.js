/**
 * GitHub Webhook Server für automatisches Deployment
 * 
 * Dieser Server überwacht GitHub-Webhooks und führt automatische Deployments durch,
 * wenn Änderungen im Main-Branch erkannt werden.
 */

const express = require('express');
const { exec } = require('child_process');
const crypto = require('crypto');
const app = express();
const port = process.env.PORT || 8000;

// Konfiguration
const PROJECT_DIR = '/var/www/iot-gateway';
const GIT_BRANCH = 'main';
const SECRET = process.env.WEBHOOK_SECRET || ''; // GitHub-Webhook-Secret

// Express-Middleware
app.use(express.json());

// Webhook-Handler für GitHub
app.post('/deploy', (req, res) => {
  console.log('Webhook empfangen');
  
  // Optional: Verifizieren des Webhook-Secrets
  if (SECRET) {
    const signature = req.headers['x-hub-signature-256'];
    if (!signature) {
      console.error('Keine Signatur gefunden');
      return res.status(401).send('Unauthorized');
    }
    
    const hmac = crypto.createHmac('sha256', SECRET);
    const digest = 'sha256=' + hmac.update(JSON.stringify(req.body)).digest('hex');
    
    if (signature !== digest) {
      console.error('Signatur stimmt nicht überein');
      return res.status(401).send('Unauthorized');
    }
  }
  
  // Branch-Prüfung (nur Main-Branch deployments)
  const payload = req.body;
  if (payload.ref !== `refs/heads/${GIT_BRANCH}`) {
    console.log(`Ignoriere Push zu ${payload.ref}, deploye nur ${GIT_BRANCH}`);
    return res.status(200).send('Ignored');
  }
  
  // Bestätige sofort, um Timeouts zu vermeiden
  res.status(202).send('Deployment wird ausgeführt');
  
  // Führe Deployment aus
  console.log('Starte Deployment-Prozess...');
  
  const commands = [
    `cd ${PROJECT_DIR}`,
    'git pull origin main',
    'source venv/bin/activate',
    'pip install -r requirements.txt',
    'cd frontend && npm install && npm run build',
    
    // Stelle sicher, dass alle PM2-Prozesse, einschließlich API-Gateway, aktualisiert werden
    'pm2 reload all --update-env'
  ];
  
  exec(commands.join(' && '), (error, stdout, stderr) => {
    if (error) {
      console.error(`Deployment-Fehler: ${error}`);
      console.error(stderr);
      return;
    }
    
    console.log('Deployment erfolgreich:');
    console.log(stdout);
    
    // Optional: Nginx-Konfiguration aktualisieren, wenn sich relevante Dateien geändert haben
    const changedFiles = payload.commits.reduce((files, commit) => {
      return [...files, ...commit.added, ...commit.modified, ...commit.removed];
    }, []);
    
    const nginxConfigChanged = changedFiles.some(file => 
      file.includes('nginx_config_generator.py') || 
      file.includes('generate_nginx_config.sh')
    );
    
    if (nginxConfigChanged) {
      console.log('Nginx-Konfiguration muss aktualisiert werden...');
      exec(`cd ${PROJECT_DIR}/deploy-scripts && ./generate_nginx_config.sh --server-name 157.180.37.234 --restart`, 
        (err, out, stderr) => {
          if (err) {
            console.error(`Nginx-Konfigurationsfehler: ${err}`);
            console.error(stderr);
            return;
          }
          console.log('Nginx-Konfiguration aktualisiert:');
          console.log(out);
        }
      );
    }
  });
});

// Health-Check für Server-Monitoring
app.get('/health', (req, res) => {
  res.status(200).send('Webhook-Server läuft');
});

// Server starten
app.listen(port, () => {
  console.log(`Webhook-Server läuft auf Port ${port}`);
  console.log(`Überwacht Deployments für ${PROJECT_DIR}`);
}); 