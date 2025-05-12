/**
 * GitHub Webhook Server für automatisches Deployment
 * Robuste Version mit verbesserter Fehlerbehandlung und vollständiger Infrastrukturinstallation
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
    
    // Verbessertes Deployment-Skript mit vollständiger Infrastrukturinstallation
    const deploymentScript = `
      echo "[$(date)] Deployment-Prozess gestartet" >> /var/log/webhook-deploy.log &&
      
      # MongoDB prüfen und ggf. installieren und starten
      if ! command -v mongod &> /dev/null && ! command -v mongodb &> /dev/null; then
        echo "[$(date)] MongoDB ist nicht installiert. Installation wird durchgeführt..." >> /var/log/webhook-deploy.log
        apt-get update &&
        apt-get install -y mongodb || {
          echo "[$(date)] Standard-MongoDB-Installation fehlgeschlagen, versuche offizielle MongoDB..." >> /var/log/webhook-deploy.log
          apt-get install -y gnupg curl &&
          curl -fsSL https://pgp.mongodb.com/server-7.0.asc | gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor &&
          echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list &&
          apt-get update &&
          apt-get install -y mongodb-org
        }
      fi
      
      # MongoDB-Service prüfen und starten
      if systemctl list-unit-files | grep -q mongodb; then
        echo "[$(date)] Überprüfe/starte MongoDB (Standardpaket)..." >> /var/log/webhook-deploy.log
        systemctl start mongodb
        systemctl enable mongodb
      elif systemctl list-unit-files | grep -q mongod; then
        echo "[$(date)] Überprüfe/starte MongoDB (MongoDB-Org)..." >> /var/log/webhook-deploy.log
        systemctl start mongod
        systemctl enable mongod
      else
        echo "[$(date)] WARNUNG: MongoDB-Service nicht gefunden!" >> /var/log/webhook-deploy.log
      fi
      
      # Prüfen, ob MongoDB tatsächlich läuft
      sleep 3
      if ! pgrep -x "mongod" > /dev/null; then
        echo "[$(date)] FEHLER: MongoDB konnte nicht gestartet werden!" >> /var/log/webhook-deploy.log
      fi
      
      # Redis prüfen und ggf. installieren und starten
      if ! command -v redis-server &> /dev/null; then
        echo "[$(date)] Redis ist nicht installiert. Installation wird durchgeführt..." >> /var/log/webhook-deploy.log
        apt-get update &&
        apt-get install -y redis-server
      fi
      
      # Redis-Service prüfen und starten
      if systemctl list-unit-files | grep -q redis; then
        echo "[$(date)] Überprüfe/starte Redis..." >> /var/log/webhook-deploy.log
        systemctl start redis-server
        systemctl enable redis-server
      else
        echo "[$(date)] WARNUNG: Redis-Service nicht gefunden!" >> /var/log/webhook-deploy.log
      fi
      
      # Prüfen, ob Redis tatsächlich läuft
      sleep 3
      if ! pgrep -x "redis-server" > /dev/null; then
        echo "[$(date)] FEHLER: Redis konnte nicht gestartet werden!" >> /var/log/webhook-deploy.log
      fi
      
      # Node.js prüfen und ggf. installieren
      if ! command -v node &> /dev/null || ! command -v npm &> /dev/null; then
        echo "[$(date)] Node.js oder npm fehlen. Installation wird durchgeführt..." >> /var/log/webhook-deploy.log
        curl -fsSL https://deb.nodesource.com/setup_18.x | bash - &&
        apt-get install -y nodejs
      fi
      
      # Python prüfen und ggf. installieren
      if ! command -v python3 &> /dev/null; then
        echo "[$(date)] Python3 fehlt. Installation wird durchgeführt..." >> /var/log/webhook-deploy.log
        apt-get update &&
        apt-get install -y python3 python3-pip python3-venv
      fi
      
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
      if [ ! -d "venv" ]; then
        python3 -m venv venv
      fi &&
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
      
      # PM2 installieren, falls nicht vorhanden
      if ! command -v pm2 &> /dev/null; then
        echo "[$(date)] PM2 ist nicht installiert. Installation wird durchgeführt..." >> /var/log/webhook-deploy.log
        npm install -g pm2
      fi &&
      
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
        'REDIS_PASSWORD': '78WDQEuz',
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
        'REDIS_PASSWORD': '78WDQEuz',
        'MONGODB_URI': 'mongodb://localhost:27017/',
        'MONGODB_DB': 'evalarm_gateway'
      }
    },
    {
      name: 'message-worker',
      script: 'api/message_worker.py',
      interpreter: '/var/www/iot-gateway/venv/bin/python3',
      cwd: '/var/www/iot-gateway',
      env: {
        'FLASK_ENV': 'production',
        'REDIS_HOST': 'localhost',
        'REDIS_PORT': '6379',
        'REDIS_PASSWORD': '78WDQEuz',
        'MONGODB_URI': 'mongodb://localhost:27017/',
        'MONGODB_DB': 'evalarm_gateway',
        'WORKER_THREADS': '2',
        'WORKER_POLL_INTERVAL': '0.5',
        'WORKER_API_PORT': '8083'
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
        'REDIS_PASSWORD': '78WDQEuz',
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
      pm2 startup &&
      
      # Nginx installieren, falls nicht vorhanden
      if ! command -v nginx &> /dev/null; then
        echo "[$(date)] Nginx ist nicht installiert. Installation wird durchgeführt..." >> /var/log/webhook-deploy.log
        apt-get update &&
        apt-get install -y nginx
      fi &&
      
      # Nginx-Konfiguration
      echo "[$(date)] Konfiguriere Nginx" >> /var/log/webhook-deploy.log &&
      cat > /etc/nginx/sites-available/iot-gateway << 'EOF'
server {
    listen 80;
    server_name 157.180.37.234;  # Oder deine Domain, falls vorhanden

    # Frontend (statische Dateien)
    location / {
        root /var/www/iot-gateway/frontend/dist;
        try_files $uri $uri/ /index.html;
        index index.html;
    }

    # Message Processor API - SPEZIFISCHE ROUTEN ZUERST
    location /api/templates {
        proxy_pass http://localhost:8081/api/templates;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /api/endpoints {
        proxy_pass http://localhost:8081/api/endpoints;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /api/process {
        proxy_pass http://localhost:8081/api/process;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /api/queue {
        proxy_pass http://localhost:8081/api/queue;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /api/health {
        proxy_pass http://localhost:8080/api/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Auth-Service API
    location /api/auth/ {
        proxy_pass http://localhost:8082/api/auth/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # ALLGEMEINE API ZULETZT (Fallback für nicht spezifische Endpunkte)
    location /api/ {
        proxy_pass http://localhost:8080/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Webhook Endpunkt
    location /deploy {
        proxy_pass http://localhost:8000/deploy;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api/messages/status {
        proxy_pass http://localhost:8083/api/messages/status;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /api/messages/queue/status {
        proxy_pass http://localhost:8083/api/messages/queue/status;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /api/messages/forwarding {
        proxy_pass http://localhost:8083/api/messages/forwarding;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
EOF
      &&
      
      ln -sf /etc/nginx/sites-available/iot-gateway /etc/nginx/sites-enabled/ &&
      
      # Firewall-Regeln
      echo "[$(date)] Konfiguriere Firewall-Regeln" >> /var/log/webhook-deploy.log &&
      if command -v ufw &> /dev/null; then
        ufw allow 80/tcp
        ufw allow 8000/tcp
        ufw allow 22/tcp
      fi &&
      
      # Nginx neu starten
      echo "[$(date)] Starte Nginx neu" >> /var/log/webhook-deploy.log &&
      systemctl restart nginx &&
      
      # Prüfen, ob alle Dienste laufen
      echo "[$(date)] Prüfe, ob alle Dienste laufen" >> /var/log/webhook-deploy.log &&
      sleep 10 &&
      
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
        timeout: 1200000, // 20 Minuten Timeout (für die Installation von Paketen)
        maxBuffer: 5 * 1024 * 1024 // 5MB Puffer für Ausgabe
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

// Verbindungs-Timeout auf 20 Minuten setzen
server.timeout = 1200000; // 20 Minuten 