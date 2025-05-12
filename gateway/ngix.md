server {
    listen 80;
    server_name 157.180.37.234;  # Oder deine Domain, falls vorhanden

    # Frontend (statische Dateien)
    location / {
        root /var/www/iot-gateway/frontend/dist;
        try_files $uri $uri/ /index.html;
        index index.html;
    }

    # ---- Message Worker API (Port 8083) ----
    # Weiterleitungsendpunkte
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

    # API-Endpunkte für Templates und Endpoints (jetzt auch auf Worker-Port 8083)
    location /api/templates {
        proxy_pass http://localhost:8083/api/templates;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /api/endpoints {
        proxy_pass http://localhost:8083/api/endpoints;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # ---- Message Processor API (Port 8081) ----
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

    # ---- API Server (Port 8080) ----
    location /api/health {
        proxy_pass http://localhost:8080/api/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /api/gateways/unassigned {
       proxy_pass http://localhost:8080/api/gateways/unassigned;
       proxy_http_version 1.1;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # ---- Auth-Service API (Port 8082) ----
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

    # ---- ALLGEMEINE API (Fallback) ----
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

    # ---- Webhook Endpunkt ----
    location /deploy {
        proxy_pass http://localhost:8000/deploy;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}