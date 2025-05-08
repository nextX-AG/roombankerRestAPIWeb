/**
 * GitHub Webhook Server für automatisches Deployment
 * Robuste Version mit verbesserter Fehlerbehandlung und Infrastrukturprüfungen
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
    
    // Verbessertes Deployment-Skript mit Infrastrukturprüfungen
    const deploymentScript = `
      echo "[$(date)] Deployment-Prozess gestartet" >> /var/log/webhook-deploy.log &&
      
      # MongoDB prüfen und starten
      if ! systemctl is-active mongodb > /dev/null; then
        echo "[$(date)] MongoDB ist nicht aktiv, starte den Dienst..." >> /var/log/webhook-deploy.log
        systemctl start mongodb
        systemctl enable mongodb
        sleep 2 # Warte, bis der Dienst gestartet ist
      else
        echo "[$(date)] MongoDB läuft bereits" >> /var/log/webhook-deploy.log
      fi &&
      
      # Redis prüfen und starten
      if ! systemctl is-active redis-server > /dev/null; then
        echo "[$(date)] Redis ist nicht aktiv, starte den Dienst..." >> /var/log/webhook-deploy.log
        systemctl start redis-server
        systemctl enable redis-server
        sleep 2 # Warte, bis der Dienst gestartet ist
      else
        echo "[$(date)] Redis läuft bereits" >> /var/log/webhook-deploy.log
      fi &&
      
      cd /var/www/iot-gateway && 
      
      # Git-Berechtigungen korrigieren
      echo "[$(date)] Korrigiere Git-Berechtigungen" >> /var/log/webhook-deploy.log &&
      git config --global --add safe.directory /var/www/iot-gateway &&
      
      # Repository aktualisieren
      echo "[$(date)] Aktualisiere Git-Repository" >> /var/log/webhook-deploy.log &&
      git stash &&
      git reset --hard origin/main &&
      git pull &&
      
      # Virtuelle Umgebung aktualisieren
      echo "[$(date)] Aktualisiere virtuelle Python-Umgebung" >> /var/log/webhook-deploy.log &&
      source venv/bin/activate &&
      pip install --upgrade pip &&
      pip install -r api/requirements.txt &&
      
      # Prüfen, ob alle Abhängigkeiten korrekt installiert wurden
      echo "[$(date)] Prüfe Python-Abhängigkeiten" >> /var/log/webhook-deploy.log &&
      if ! pip freeze | grep -q "flask=="; then
        echo "[$(date)] FEHLER: Flask nicht korrekt installiert!" >> /var/log/webhook-deploy.log
        exit 1
      fi &&
      
      if ! pip freeze | grep -q "pymongo=="; then
        echo "[$(date)] FEHLER: PyMongo nicht korrekt installiert!" >> /var/log/webhook-deploy.log
        exit 1
      fi &&
      
      if ! pip freeze | grep -q "redis=="; then
        echo "[$(date)] FEHLER: Redis-Python nicht korrekt installiert!" >> /var/log/webhook-deploy.log
        exit 1
      fi &&
      
      # Frontend bauen
      echo "[$(date)] Baue Frontend" >> /var/log/webhook-deploy.log &&
      cd frontend &&
      npm install &&
      npm run build &&
      cd .. &&
      
      # PM2-Konfiguration erstellen und starten
      echo "[$(date)] Erstelle und starte PM2-Konfiguration" >> /var/log/webhook-deploy.log &&
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
      name: 'message-processor',
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
      name: 'auth-service',
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
    },
    {
      name: 'webhook',
      script: 'deploy-scripts/webhook.js',
      cwd: '/var/www/iot-gateway',
      env: {
        'NODE_ENV': 'production'
      }
    }
  ]
};
EOF
      &&
      
      # Alle Dienste neustarten
      echo "[$(date)] Starte PM2-Dienste neu" >> /var/log/webhook-deploy.log &&
      pm2 delete all || true &&
      pm2 start ecosystem.config.js &&
      pm2 save &&
      
      # Nginx neu starten
      echo "[$(date)] Starte Nginx neu" >> /var/log/webhook-deploy.log &&
      systemctl restart nginx &&
      
      # Prüfen, ob alle Dienste laufen
      echo "[$(date)] Prüfe, ob alle Dienste laufen" >> /var/log/webhook-deploy.log &&
      sleep 5 &&
      
      # Überprüfe, ob alle Ports aktiv sind
      if ! netstat -tulpn | grep -q ":8080"; then
        echo "[$(date)] WARNUNG: API-Server auf Port 8080 nicht gefunden!" >> /var/log/webhook-deploy.log
      fi &&
      
      if ! netstat -tulpn | grep -q ":8081"; then
        echo "[$(date)] WARNUNG: Message-Processor auf Port 8081 nicht gefunden!" >> /var/log/webhook-deploy.log
      fi &&
      
      if ! netstat -tulpn | grep -q ":8082"; then
        echo "[$(date)] WARNUNG: Auth-Service auf Port 8082 nicht gefunden!" >> /var/log/webhook-deploy.log
      fi &&
      
      # Teste die Dienste direkt
      echo "[$(date)] Teste Dienste" >> /var/log/webhook-deploy.log &&
      if curl -s http://localhost:8082/api/auth/users > /dev/null; then
        echo "[$(date)] Auth-Service läuft und antwortet" >> /var/log/webhook-deploy.log
      else
        echo "[$(date)] WARNUNG: Auth-Service antwortet nicht!" >> /var/log/webhook-deploy.log
      fi &&
      
      echo "[$(date)] Deployment abgeschlossen" >> /var/log/webhook-deploy.log
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
          
          // Speichere Fehlerdetails in Datei
          exec(`echo "${new Date().toISOString()} - DEPLOYMENT FEHLER: ${error}" >> /var/log/webhook-deploy-errors.log`);
          return;
        }
        console.log(`${new Date().toISOString()} - Deployment erfolgreich abgeschlossen`);
        console.log(`${new Date().toISOString()} - Stdout: ${stdout}`);
        if (stderr) console.log(`${new Date().toISOString()} - Stderr: ${stderr}`);
        
        // Speichere Erfolg in Datei
        exec(`echo "${new Date().toISOString()} - DEPLOYMENT ERFOLGREICH" >> /var/log/webhook-deploy.log`);
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