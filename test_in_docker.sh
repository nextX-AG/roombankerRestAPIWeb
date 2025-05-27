#!/bin/bash

# Test Runner für Docker-Container
# Führt Tests innerhalb der Docker-Umgebung aus, wo alle Dependencies verfügbar sind

echo "🧪 Running tests in Docker container..."

# Farben für die Ausgabe
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Container-Name
CONTAINER="roombankerrestapiweb-api-1"

# Prüfe ob Container läuft
if ! docker ps | grep -q $CONTAINER; then
    echo -e "${RED}❌ Container $CONTAINER is not running!${NC}"
    echo -e "${YELLOW}Please start the containers with: ./start.sh${NC}"
    exit 1
fi

# Sync der aktuellen Code-Änderungen in den Container
echo "📦 Syncing code changes to container..."

# Kopiere geänderte Python-Dateien
docker cp api/. $CONTAINER:/app/api/ 2>/dev/null
docker cp utils/. $CONTAINER:/app/utils/ 2>/dev/null
docker cp tests/. $CONTAINER:/app/tests/ 2>/dev/null

# Führe Tests aus
if [ -z "$1" ]; then
    # Wenn kein spezifischer Test angegeben, führe alle Tests aus
    echo -e "\n${YELLOW}Running all tests...${NC}"
    docker exec -it $CONTAINER python -m pytest tests/ -v
else
    # Führe spezifischen Test aus
    echo -e "\n${YELLOW}Running test: $1${NC}"
    docker exec -it $CONTAINER python $1
fi

# Prüfe Exit-Code
if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}✅ Tests completed successfully!${NC}"
else
    echo -e "\n${RED}❌ Tests failed!${NC}"
    exit 1
fi 