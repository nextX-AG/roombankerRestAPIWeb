#!/bin/bash

# Farben für bessere Lesbarkeit
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== IoT Gateway Fixskript für lokale Entwicklung ===${NC}"
echo -e "${YELLOW}Dieses Skript behebt alle erkannten Probleme mit dem IoT Gateway in der lokalen Entwicklungsumgebung.${NC}"
echo ""

echo -e "${YELLOW}Schritt 1: Prüfe, ob MongoDB läuft${NC}"
MONGO_RUNNING=$(pgrep -x mongod || echo "")
if [[ -z "$MONGO_RUNNING" ]]; then
    echo -e "${RED}MongoDB läuft nicht. Versuche zu starten...${NC}"
    # MacOS (mit Homebrew)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew services start mongodb-community || echo "MongoDB konnte nicht gestartet werden. Bitte manuell starten."
    # Linux
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        systemctl start mongod || echo "MongoDB konnte nicht gestartet werden. Bitte manuell starten."
    else
        echo "Betriebssystem nicht erkannt. Bitte MongoDB manuell starten."
    fi
else
    echo -e "${GREEN}MongoDB läuft bereits.${NC}"
fi
echo ""

echo -e "${YELLOW}Schritt 2: Prüfe, ob Redis läuft${NC}"
REDIS_RUNNING=$(pgrep -x redis-server || echo "")
if [[ -z "$REDIS_RUNNING" ]]; then
    echo -e "${RED}Redis läuft nicht. Versuche zu starten...${NC}"
    # MacOS (mit Homebrew)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew services start redis || echo "Redis konnte nicht gestartet werden. Bitte manuell starten."
    # Linux
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        systemctl start redis-server || echo "Redis konnte nicht gestartet werden. Bitte manuell starten."
    else
        echo "Betriebssystem nicht erkannt. Bitte Redis manuell starten."
    fi
else
    echo -e "${GREEN}Redis läuft bereits.${NC}"
fi
echo ""

echo -e "${YELLOW}Schritt 3: Virtuelle Python-Umgebung aktivieren/erstellen${NC}"
if [[ ! -d "venv" ]]; then
    echo "Erstelle virtuelle Python-Umgebung..."
    python3 -m venv venv
    echo -e "${GREEN}Virtuelle Umgebung erstellt.${NC}"
fi

echo "Aktiviere virtuelle Umgebung und installiere Abhängigkeiten..."
source venv/bin/activate
pip install --upgrade pip
pip install -r api/requirements.txt
echo -e "${GREEN}Abhängigkeiten installiert.${NC}"
echo ""

echo -e "${YELLOW}Schritt 4: Frontend-Abhängigkeiten installieren${NC}"
cd frontend
npm install
echo -e "${GREEN}Frontend-Abhängigkeiten installiert.${NC}"
cd ..
echo ""

echo -e "${YELLOW}Schritt 5: Starte alle Dienste${NC}"
# Stoppe möglicherweise laufende Prozesse
pkill -f "python.*app.py" || true
pkill -f "python.*message_processor.py" || true
pkill -f "python.*auth_service.py" || true

# Lokale Umgebungsvariablen setzen
export REDIS_HOST=localhost
export REDIS_PORT=6379
export REDIS_DB=0
export REDIS_PASSWORD=""  # Kein Passwort für lokale Entwicklung
export MONGODB_URI=mongodb://localhost:27017/
export MONGODB_DB=evalarm_gateway

# Starte Server in separaten Terminals mit unterschiedlichen Ports
echo "Starte API-Server auf Port 8080..."
gnome-terminal -- bash -c "source venv/bin/activate && python api/app.py --port 8080" || 
osascript -e 'tell app "Terminal" to do script "cd '$PWD' && source venv/bin/activate && python api/app.py --port 8080"' || 
xterm -e "source venv/bin/activate && python api/app.py --port 8080" &

echo "Starte Message Processor auf Port 8081..."
gnome-terminal -- bash -c "source venv/bin/activate && python api/message_processor.py --port 8081" || 
osascript -e 'tell app "Terminal" to do script "cd '$PWD' && source venv/bin/activate && python api/message_processor.py --port 8081"' || 
xterm -e "source venv/bin/activate && python api/message_processor.py --port 8081" &

echo "Starte Auth Service auf Port 8082..."
gnome-terminal -- bash -c "source venv/bin/activate && python api/auth_service.py --port 8082" || 
osascript -e 'tell app "Terminal" to do script "cd '$PWD' && source venv/bin/activate && python api/auth_service.py --port 8082"' || 
xterm -e "source venv/bin/activate && python api/auth_service.py --port 8082" &

echo "Starte Frontend..."
gnome-terminal -- bash -c "cd frontend && npm run dev" || 
osascript -e 'tell app "Terminal" to do script "cd '$PWD'/frontend && npm run dev"' || 
xterm -e "cd frontend && npm run dev" &

echo -e "${GREEN}Alle Dienste wurden gestartet.${NC}"
echo ""

echo -e "${GREEN}=== Fix-Skript abgeschlossen ===${NC}"
echo -e "${YELLOW}Das Frontend ist unter http://localhost:5173 erreichbar.${NC}"
echo -e "${YELLOW}API-Server: http://localhost:8080${NC}"
echo -e "${YELLOW}Message Processor: http://localhost:8081${NC}"
echo -e "${YELLOW}Auth Service: http://localhost:8082${NC}" 