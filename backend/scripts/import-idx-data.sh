#!/bin/bash
#
# Import IDX JSON ke MongoDB di server production
# 
# Usage:
#   cd backend
#   ./scripts/import-idx-data.sh data/idx-2025-tw1.json
#

set -e

JSON_FILE="$1"

if [ -z "$JSON_FILE" ]; then
    echo "Usage: $0 <path-to-json-file>"
    echo ""
    echo "Examples:"
    echo "  $0 data/idx-2025-tw1.json"
    echo "  $0 /tmp/idx-2026-tw1.json"
    exit 1
fi

if [ ! -f "$JSON_FILE" ]; then
    echo "ERROR: File not found: $JSON_FILE"
    exit 1
fi

echo "=========================================="
echo "  Import IDX JSON to MongoDB (Server)"
echo "=========================================="
echo "File: $JSON_FILE"
echo ""

# Detect MongoDB URI for server environment
if docker ps --format '{{.Names}}' | grep -q "mongodb"; then
    # Running inside Docker environment
    echo "[INFO] Docker detected. Using container approach..."
    
    BACKEND_CONTAINER=$(docker ps --format '{{.Names}}' | grep -i backend | head -1)
    
    if [ -z "$BACKEND_CONTAINER" ]; then
        echo "ERROR: Backend container not found. Is the backend running?"
        echo "       Try: docker compose ps"
        exit 1
    fi
    
    echo "[INFO] Backend container: $BACKEND_CONTAINER"
    echo "[INFO] Copying JSON into container..."
    docker cp "$JSON_FILE" "$BACKEND_CONTAINER:/tmp/idx-import.json"
    
    echo "[INFO] Running import inside container..."
    docker exec -w /app "$BACKEND_CONTAINER" node workers/import-idx-json.js /tmp/idx-import.json
    
    echo "[INFO] Cleaning up..."
    docker exec "$BACKEND_CONTAINER" rm -f /tmp/idx-import.json
    
else
    # Running directly on server
    echo "[INFO] Running directly with Node.js..."
    
    # Set server MongoDB URI if not already set
    if [ -z "$MONGODB_URI" ]; then
        export MONGODB_URI="mongodb://siwa-service-mongodb:27017/stockbit_dashboard"
    fi
    
    node workers/import-idx-json.js "$JSON_FILE"
fi

echo ""
echo "=========================================="
echo "  Import Complete!"
echo "=========================================="
