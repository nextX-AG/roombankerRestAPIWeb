#!/bin/bash

# Skript zum Generieren und Installieren der NGINX-Konfiguration
# für das evAlarm-IoT Gateway System

# Bestimme das Projektverzeichnis
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Standardwerte
SERVER_NAME="157.180.37.234"
OUTPUT_FILE="/tmp/iot-gateway-nginx.conf"
INSTALL_PATH="/etc/nginx/sites-available/iot-gateway"
ENABLE_PATH="/etc/nginx/sites-enabled/iot-gateway"
RESTART_NGINX=false
DRY_RUN=false
SITE_ONLY=true  # Standard: Nur Site-Konfiguration ohne globale Direktiven

# Farbige Ausgabe
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Hilfetext
function show_help {
    echo -e "${BLUE}NGINX-Konfigurationsgenerator für evAlarm-IoT Gateway${NC}"
    echo ""
    echo "Verwendung: $0 [optionen]"
    echo ""
    echo "Optionen:"
    echo "  -h, --help                   Zeigt diese Hilfe an"
    echo "  -n, --server-name <name>     Servername für die NGINX-Konfiguration (default: $SERVER_NAME)"
    echo "  -o, --output <file>          Speicherort für die generierte Konfiguration (default: $OUTPUT_FILE)"
    echo "  -i, --install <path>         Installationsort für die NGINX-Konfiguration (default: $INSTALL_PATH)"
    echo "  -r, --restart                NGINX nach Installation neu starten"
    echo "  -d, --dry-run                Konfiguration nur ausgeben, nicht installieren"
    echo "  -f, --full                   Generiert eine vollständige NGINX-Konfiguration mit globalen Direktiven"
    echo ""
    echo "Beispiel:"
    echo "  $0 --server-name evalarm.example.com --restart"
    echo ""
}

# Parameter verarbeiten
while [[ $# -gt 0 ]]; do
    key="$1"
    case $key in
        -h|--help)
            show_help
            exit 0
            ;;
        -n|--server-name)
            SERVER_NAME="$2"
            shift 2
            ;;
        -o|--output)
            OUTPUT_FILE="$2"
            shift 2
            ;;
        -i|--install)
            INSTALL_PATH="$2"
            shift 2
            ;;
        -r|--restart)
            RESTART_NGINX=true
            shift
            ;;
        -d|--dry-run)
            DRY_RUN=true
            shift
            ;;
        -f|--full)
            SITE_ONLY=false
            shift
            ;;
        *)
            echo -e "${RED}Unbekannte Option: $1${NC}"
            show_help
            exit 1
            ;;
    esac
done

echo -e "${BLUE}evAlarm-IoT Gateway NGINX-Konfigurationsgenerator${NC}"
echo -e "${YELLOW}Projektverzeichnis:${NC} $PROJECT_DIR"
echo -e "${YELLOW}Servername:${NC} $SERVER_NAME"
echo -e "${YELLOW}Ausgabedatei:${NC} $OUTPUT_FILE"
echo -e "${YELLOW}Konfigurationstyp:${NC} $([ "$SITE_ONLY" == "true" ] && echo "Site-Konfiguration" || echo "Vollständige Konfiguration")"

# Python-Umgebung prüfen und aktivieren
VENV_DIR="$PROJECT_DIR/venv"
if [ -d "$VENV_DIR" ] && [ -f "$VENV_DIR/bin/activate" ]; then
    echo -e "${GREEN}Aktiviere virtuelle Python-Umgebung...${NC}"
    source "$VENV_DIR/bin/activate"
fi

# Konfiguration generieren
echo -e "${BLUE}Generiere NGINX-Konfiguration...${NC}"
SITE_ONLY_ARG=$([ "$SITE_ONLY" == "true" ] && echo "--site-only" || echo "")
python "$PROJECT_DIR/utils/nginx_config_generator.py" --server-name "$SERVER_NAME" --output "$OUTPUT_FILE" $SITE_ONLY_ARG

if [ $? -ne 0 ]; then
    echo -e "${RED}Fehler beim Generieren der NGINX-Konfiguration!${NC}"
    exit 1
fi

echo -e "${GREEN}NGINX-Konfiguration wurde generiert: ${OUTPUT_FILE}${NC}"

# Konfiguration anzeigen, wenn DRY_RUN aktiviert ist
if [ "$DRY_RUN" = true ]; then
    echo -e "${BLUE}Generierte Konfiguration (Dry Run):${NC}"
    echo "========================================"
    cat "$OUTPUT_FILE"
    echo "========================================"
    echo -e "${YELLOW}Dry Run abgeschlossen. Keine Installation durchgeführt.${NC}"
    exit 0
fi

# NGINX-Konfiguration installieren, wenn nicht im Dry-Run-Modus
if [ "$DRY_RUN" = false ]; then
    # Prüfen, ob Root-Rechte vorhanden sind
    if [ "$(id -u)" -ne 0 ]; then
        echo -e "${YELLOW}Warnung: Für die Installation werden Root-Rechte benötigt.${NC}"
        echo -e "${YELLOW}Bitte führen Sie den folgenden Befehl als Root aus:${NC}"
        echo "sudo cp \"$OUTPUT_FILE\" \"$INSTALL_PATH\""
        
        if [ "$RESTART_NGINX" = true ]; then
            echo "sudo rm -f \"$ENABLE_PATH\""  # Alte Symlink entfernen
            echo "sudo ln -sf \"$INSTALL_PATH\" \"$ENABLE_PATH\""
            echo "sudo nginx -t && sudo systemctl restart nginx"
        fi
        
        exit 0
    fi
    
    # Mit Root-Rechten fortfahren
    echo -e "${BLUE}Installiere NGINX-Konfiguration...${NC}"
    
    # Sicherstellen, dass das Zielverzeichnis existiert
    mkdir -p "$(dirname "$INSTALL_PATH")"
    
    # Bereinige alle vorhandenen Gateway-Konfigurationen
    echo -e "${YELLOW}Bereinige vorhandene Gateway-Konfigurationen...${NC}"
    
    # Stoppe Nginx kurz, um Fehlern beim Entfernen von Dateien vorzubeugen
    if systemctl is-active --quiet nginx; then
        echo -e "${BLUE}Stoppe Nginx temporär...${NC}"
        systemctl stop nginx
        NGINX_WAS_RUNNING=true
    else
        NGINX_WAS_RUNNING=false
    fi
    
    # Entferne ALLE möglichen Symlinks und Dateien für Gateway-Konfigurationen
    echo -e "${YELLOW}Entferne alle Konfigurationen und Backups...${NC}"
    rm -f /etc/nginx/sites-enabled/iot-gateway*
    rm -f /etc/nginx/sites-enabled/evalarm-iot*
    rm -f /etc/nginx/sites-available/iot-gateway*
    rm -f /etc/nginx/sites-available/evalarm-iot*
    
    # Alte Konfiguration sichern, falls vorhanden
    if [ -f "$INSTALL_PATH" ]; then
        BACKUP_FILE="${INSTALL_PATH}.bak.$(date +%Y%m%d%H%M%S)"
        echo -e "${YELLOW}Erstelle Backup der alten Konfiguration: ${BACKUP_FILE}${NC}"
        cp "$INSTALL_PATH" "$BACKUP_FILE"
    fi
    
    # Alten Symlink entfernen, falls vorhanden
    if [ -L "$ENABLE_PATH" ]; then
        echo -e "${YELLOW}Entferne alte Symlink: ${ENABLE_PATH}${NC}"
        rm -f "$ENABLE_PATH"
    fi
    
    # Konfiguration kopieren
    cp "$OUTPUT_FILE" "$INSTALL_PATH"
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}Fehler beim Kopieren der Konfigurationsdatei!${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}NGINX-Konfiguration installiert: ${INSTALL_PATH}${NC}"
    
    # Symlink erstellen
    ln -sf "$INSTALL_PATH" "$ENABLE_PATH"
    echo -e "${GREEN}NGINX-Konfiguration aktiviert: ${ENABLE_PATH}${NC}"
    
    # NGINX neu starten, wenn gewünscht
    if [ "$RESTART_NGINX" = true ]; then
        echo -e "${BLUE}Prüfe NGINX-Konfiguration...${NC}"
        nginx -t
        
        if [ $? -ne 0 ]; then
            echo -e "${RED}Fehler in der NGINX-Konfiguration!${NC}"
            echo -e "${YELLOW}Stelle alte Konfiguration wieder her...${NC}"
            
            # Alte Konfiguration wiederherstellen, falls Backup vorhanden
            if [ -f "$BACKUP_FILE" ]; then
                cp "$BACKUP_FILE" "$INSTALL_PATH"
                nginx -t && systemctl restart nginx
                if [ $? -eq 0 ]; then
                    echo -e "${GREEN}Alte Konfiguration wiederhergestellt.${NC}"
                else
                    echo -e "${RED}Konnte alte Konfiguration nicht wiederherstellen!${NC}"
                fi
            fi
            
            exit 1
        fi
        
        echo -e "${BLUE}Starte NGINX neu...${NC}"
        systemctl restart nginx
        
        if [ $? -ne 0 ]; then
            echo -e "${RED}Fehler beim Neustart von NGINX!${NC}"
            exit 1
        fi
        
        echo -e "${GREEN}NGINX wurde erfolgreich neu gestartet.${NC}"
        
        # Prüfe, ob die Services auf den korrekten Ports laufen
        echo -e "${BLUE}Prüfe Port-Zuweisungen der Services...${NC}"
        AUTH_PORT=$(netstat -tulpn 2>/dev/null | grep auth_service | grep -o ":[0-9]\+" | grep -o "[0-9]\+")
        PROCESSOR_PORT=$(netstat -tulpn 2>/dev/null | grep message_processor | grep -o ":[0-9]\+" | grep -o "[0-9]\+")
        
        if [ "$AUTH_PORT" != "8081" ]; then
            echo -e "${RED}Warnung: Auth Service läuft nicht auf Port 8081 (aktuell: $AUTH_PORT)${NC}"
            echo -e "${YELLOW}Die Nginx-Konfiguration leitet Auth-Anfragen an Port 8081 weiter!${NC}"
            echo -e "${YELLOW}Bitte prüfe die PM2-Konfiguration in production.config.js${NC}"
        else
            echo -e "${GREEN}Auth Service läuft korrekt auf Port 8081.${NC}"
        fi
        
        if [ "$PROCESSOR_PORT" != "8082" ]; then
            echo -e "${RED}Warnung: Message Processor läuft nicht auf Port 8082 (aktuell: $PROCESSOR_PORT)${NC}"
            echo -e "${YELLOW}Die Nginx-Konfiguration leitet Processor-Anfragen an Port 8082 weiter!${NC}"
            echo -e "${YELLOW}Bitte prüfe die PM2-Konfiguration in production.config.js${NC}"
        else
            echo -e "${GREEN}Message Processor läuft korrekt auf Port 8082.${NC}"
        fi
    else
        # Wenn RESTART_NGINX nicht gesetzt ist, aber Nginx lief zuvor, starte es wieder
        if [ "$NGINX_WAS_RUNNING" = true ]; then
            echo -e "${BLUE}Nginx lief vor der Konfiguration, starte es wieder...${NC}"
            nginx -t && systemctl start nginx
            
            if [ $? -eq 0 ]; then
                echo -e "${GREEN}NGINX wurde erfolgreich gestartet.${NC}"
            else
                echo -e "${RED}Fehler beim Starten von NGINX!${NC}"
            fi
        fi
    
        echo -e "${YELLOW}NGINX wurde nicht neu gestartet. Verwenden Sie --restart, um NGINX neu zu starten.${NC}"
        echo -e "${YELLOW}Oder führen Sie manuell aus: sudo nginx -t && sudo systemctl restart nginx${NC}"
    fi
fi

echo -e "${GREEN}Konfigurationsgenerierung abgeschlossen.${NC}"
exit 0 