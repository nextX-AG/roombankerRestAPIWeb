"""
NGINX-Konfigurationsgenerator für das evAlarm-IoT Gateway System

Generiert eine NGINX-Konfigurationsdatei basierend auf den definierten API-Routen 
und Services in der zentralen API-Konfiguration.
"""

import os
import sys
import logging
from typing import Dict, Any, List, Optional, Tuple
import json

# Projektverzeichnis zum Python-Pfad hinzufügen
current_dir = os.path.dirname(os.path.abspath(__file__))
project_dir = os.path.dirname(current_dir)
sys.path.append(project_dir)

# Importiere die zentrale API-Konfiguration
from api_config import PORTS, API_VERSION, ENDPOINTS, API_BASE

# Konfiguriere Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('nginx-config-generator')

# Standard-NGINX-Konfiguration (Template)
NGINX_TEMPLATE = """
# Automatisch generierte NGINX-Konfiguration für evAlarm-IoT Gateway
# Generiert am: {timestamp}

# Worker-Prozesse und Verbindungslimits
worker_processes auto;
worker_rlimit_nofile 65535;

events {{
    worker_connections 1024;
    multi_accept on;
}}

http {{
    # Grundlegende HTTP-Einstellungen
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 20M;

    # MIME-Typen
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging-Einstellungen
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log warn;

    # Gzip-Kompression
    gzip on;
    gzip_disable "msie6";
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_buffers 16 8k;
    gzip_http_version 1.1;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Upstream-Definitionen für die verschiedenen Services
{upstream_blocks}

    # Server-Konfiguration
    server {{
        listen 80;
        server_name {server_name};

        # Root-Verzeichnis für statische Dateien
        root /var/www/iot-gateway/frontend/dist;
        index index.html;

        # Globale CORS-Header für alle Anfragen
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization, X-Requested-With' always;
        
        # Spezielle Behandlung von OPTIONS-Requests (Preflight)
        if ($request_method = 'OPTIONS') {{
            add_header 'Access-Control-Allow-Origin' '*';
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS';
            add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization, X-Requested-With';
            add_header 'Access-Control-Max-Age' '1728000';
            add_header 'Content-Type' 'text/plain charset=UTF-8';
            add_header 'Content-Length' '0';
            return 204;
        }}

        # API-Gateway als zentraler Einstiegspunkt für alle API-Anfragen
        location /api/ {{
            proxy_pass http://gateway_backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_buffering off;
            
            # Timeout-Konfiguration
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
            
            # Buffer-Größen
            proxy_buffer_size 4k;
            proxy_buffers 4 32k;
            proxy_busy_buffers_size 64k;
        }}

        # Legacy-Routen zu den Mikroservices (falls benötigt)
{location_blocks}

        # Frontend-Routing für React-App (SPA)
        location / {{
            try_files $uri $uri/ /index.html;
        }}

        # Statische Dateien
        location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {{
            expires 7d;
            add_header Cache-Control "public, max-age=604800";
        }}

        # Zusätzliche Sicherheitsheader
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header Referrer-Policy "no-referrer-when-downgrade" always;
    }}
}}
"""

def generate_nginx_config(server_name: str = "evalarm-iot.example.com", 
                          output_file: Optional[str] = None) -> str:
    """
    Generiert eine NGINX-Konfiguration basierend auf der API-Konfiguration.
    
    Args:
        server_name: Der Servername für die NGINX-Konfiguration
        output_file: Optionaler Dateipfad zum Speichern der Konfiguration
    
    Returns:
        Die generierte NGINX-Konfiguration als String
    """
    # Upstream-Blöcke für jeden Service generieren
    upstream_blocks = []
    
    # Service-Namen und Ports
    services = {
        "gateway": 8000,  # API-Gateway auf Port 8000
        "api": PORTS["api"],
        "processor": PORTS["processor"],
        "auth": PORTS["auth"],
        "worker": PORTS["worker"]
    }
    
    for service_name, port in services.items():
        upstream = f"""
    upstream {service_name}_backend {{
        server 127.0.0.1:{port};
        keepalive 64;
    }}"""
        upstream_blocks.append(upstream)
    
    # Kombinierter Upstream-Block
    combined_upstream = "\n".join(upstream_blocks)
    
    # Routenmapping für Service-Zuordnung
    # Kategorien zu Service-Namen zuordnen
    service_mapping = {
        "auth": "auth",
        "gateways": "api",
        "customers": "api",
        "devices": "api",
        "messages": "worker",
        "templates": "worker",
        "system": "worker"
    }
    
    # Spezielles Routing für den Processor
    processor_routes = [
        ("/api/v1/messages/process", "processor_backend"),
        ("/api/v1/messages/queue_status", "processor_backend"),
        ("/api/v1/messages/failed", "processor_backend"),
        ("/api/v1/messages/retry", "processor_backend"),
        ("/api/v1/messages/clear", "processor_backend"),
        ("/api/v1/system/health", "processor_backend"),
        ("/api/v1/system/endpoints", "processor_backend"),
        ("/api/v1/system/logs", "processor_backend"),
        ("/api/v1/templates/list", "processor_backend"),
        ("/api/v1/templates/reload", "processor_backend"),
        ("/api/v1/templates/test", "processor_backend")
    ]
    
    # Location-Blöcke für jede API-Route generieren (als Legacy-Routen)
    location_blocks = []
    
    # Kommentar für Legacy-Routen hinzufügen
    location_blocks.append("""
        # Hinweis: Die folgenden Location-Blöcke sind Legacy-Routen, 
        # die direkt zu den einzelnen Services führen.
        # Für neue Entwicklungen sollte das API-Gateway unter /api/ verwendet werden.""")
    
    # Allgemeine API-Routen basierend auf Kategorien
    for category, endpoints in ENDPOINTS.items():
        service = service_mapping.get(category, "api")  # Standardmäßig zum API-Service routen
        
        # Unterschiedliche Struktur für system-Kategorie behandeln
        if category == 'system':
            # system-Kategorie hat eine andere Struktur
            for endpoint_name, path in endpoints.items():
                location = f"""
        location {path} {{
            proxy_pass http://{service}_backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_buffering off;
        }}"""
                location_blocks.append(location)
        else:
            # Standard-Struktur für andere Kategorien
            if 'base' in endpoints:
                location_path = endpoints["base"]
                location = f"""
        location {location_path} {{
            proxy_pass http://{service}_backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_buffering off;
        }}"""
                location_blocks.append(location)
    
    # Spezielles Routing für den Processor hinzufügen
    for route, backend in processor_routes:
        location = f"""
        location {route} {{
            proxy_pass http://{backend};
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_buffering off;
        }}"""
        location_blocks.append(location)
    
    # Kombinierte Location-Blöcke
    combined_locations = "\n".join(location_blocks)
    
    # NGINX-Konfiguration mit den generierten Blöcken erstellen
    from datetime import datetime
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    nginx_config = NGINX_TEMPLATE.format(
        timestamp=timestamp,
        upstream_blocks=combined_upstream,
        location_blocks=combined_locations,
        server_name=server_name
    )
    
    # Ggf. in Datei speichern
    if output_file:
        os.makedirs(os.path.dirname(os.path.abspath(output_file)), exist_ok=True)
        with open(output_file, 'w') as f:
            f.write(nginx_config)
        logger.info(f"NGINX-Konfiguration gespeichert in: {output_file}")
    
    return nginx_config

def main():
    """Hauptfunktion zum Ausführen des Generators von der Kommandozeile"""
    import argparse
    parser = argparse.ArgumentParser(description="NGINX-Konfigurationsgenerator für evAlarm-IoT Gateway")
    parser.add_argument('--server-name', type=str, default="evalarm-iot.example.com", 
                        help="Servername für die NGINX-Konfiguration")
    parser.add_argument('--output', type=str, help="Dateipfad zum Speichern der Konfiguration")
    args = parser.parse_args()
    
    config = generate_nginx_config(args.server_name, args.output)
    
    if not args.output:
        print(config)

if __name__ == "__main__":
    main() 