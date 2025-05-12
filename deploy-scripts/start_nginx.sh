#!/bin/bash

# Skript zum Generieren und optional Starten einer NGINX-Konfiguration
# für die Entwicklungsumgebung des evAlarm-IoT Gateway Systems

# Farbige Ausgabe
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Bestimme das Projektverzeichnis
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Konfigurationsdateien
CONFIG_DIR="$PROJECT_DIR/gateway/nginx"
CONFIG_FILE="$CONFIG_DIR/development.conf"

# Stelle sicher, dass das Konfigurationsverzeichnis existiert
mkdir -p "$CONFIG_DIR"

echo -e "${BLUE}NGINX-Konfiguration für Entwicklungsumgebung generieren${NC}"

# Python-Umgebung prüfen und aktivieren
VENV_DIR="$PROJECT_DIR/venv"
if [ -d "$VENV_DIR" ] && [ -f "$VENV_DIR/bin/activate" ]; then
    source "$VENV_DIR/bin/activate"
fi

# Konfiguration generieren
echo -e "${GREEN}Generiere NGINX-Konfiguration für Entwicklungsumgebung...${NC}"
python "$PROJECT_DIR/utils/nginx_config_generator.py" --server-name "localhost" --output "$CONFIG_FILE"

if [ $? -ne 0 ]; then
    echo -e "${RED}Fehler beim Generieren der NGINX-Konfiguration!${NC}"
    exit 1
fi

echo -e "${GREEN}NGINX-Konfiguration wurde generiert: ${CONFIG_FILE}${NC}"

# Prüfe, ob Nginx installiert ist
if command -v nginx >/dev/null 2>&1; then
    echo -e "${GREEN}NGINX ist installiert.${NC}"
    
    # Prüfe, ob wir auf macOS oder Linux sind
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS: Prüfe, ob Homebrew verwendet wird
        if command -v brew >/dev/null 2>&1; then
            NGINX_CONF_DIR=$(brew --prefix)/etc/nginx
            NGINX_SITES_DIR="$NGINX_CONF_DIR/servers"
            
            # Stelle sicher, dass das Verzeichnis existiert
            mkdir -p "$NGINX_SITES_DIR"
            
            # Symlink zur Konfiguration erstellen
            echo -e "${BLUE}Erstelle Symlink zur NGINX-Konfiguration in ${NGINX_SITES_DIR}...${NC}"
            ln -sf "$CONFIG_FILE" "$NGINX_SITES_DIR/evalarm-dev.conf"
            
            # Prüfe, ob Nginx läuft
            if pgrep -x "nginx" >/dev/null; then
                echo -e "${YELLOW}NGINX läuft bereits, lade Konfiguration neu...${NC}"
                nginx -s reload
            else
                echo -e "${YELLOW}NGINX ist nicht gestartet, starte NGINX...${NC}"
                nginx
            fi
        else
            echo -e "${YELLOW}Homebrew nicht gefunden. Sie können NGINX manuell starten mit:${NC}"
            echo "nginx -c $CONFIG_FILE"
        fi
    else
        # Linux: Versuche, die Konfiguration in sites-available zu platzieren
        if [ -d "/etc/nginx/sites-available" ]; then
            echo -e "${YELLOW}Sie können die Konfiguration mit folgendem Befehl installieren:${NC}"
            echo "sudo cp \"$CONFIG_FILE\" /etc/nginx/sites-available/evalarm-dev"
            echo "sudo ln -sf /etc/nginx/sites-available/evalarm-dev /etc/nginx/sites-enabled/evalarm-dev"
            echo "sudo nginx -t && sudo systemctl restart nginx"
        else
            echo -e "${YELLOW}Sie können NGINX manuell starten mit:${NC}"
            echo "nginx -c $CONFIG_FILE"
        fi
    fi
else
    echo -e "${YELLOW}NGINX ist nicht installiert. Die Konfiguration wurde generiert, aber NGINX kann nicht gestartet werden.${NC}"
    echo -e "${YELLOW}Für macOS können Sie NGINX installieren mit: brew install nginx${NC}"
    echo -e "${YELLOW}Für Ubuntu können Sie NGINX installieren mit: sudo apt install nginx${NC}"
fi

echo -e "${GREEN}NGINX-Konfiguration abgeschlossen.${NC}" 