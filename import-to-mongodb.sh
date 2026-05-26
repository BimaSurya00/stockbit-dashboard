#!/bin/bash
#
# Import IDX JSON ke MongoDB via SSH Tunnel (Local Machine)
#
# CARA PENGGUNAAN:
#   1. Buka terminal baru, jalankan tunnel:
#      ssh -L 27018:127.0.0.1:27017 root@8.215.33.70 -N
#
#   2. Di terminal lain, jalankan script ini:
#      ./import-to-mongodb.sh /path/to/idx-2025-tw2-xxx.json
#
#   Atau tanpa argumen (auto-detect file terbaru):
#      ./import-to-mongodb.sh
#

set -e

# Default file: auto-detect file idx-*.json terbaru di project root
DEFAULT_FILE=$(ls -t /home/Bima/Documents/stockbit-dashboard/idx-*.json 2>/dev/null | head -1)

JSON_FILE="${1:-$DEFAULT_FILE}"

if [ -z "$JSON_FILE" ] || [ ! -f "$JSON_FILE" ]; then
    echo "=========================================="
    echo "  ERROR: File JSON tidak ditemukan!"
    echo "=========================================="
    echo ""
    echo "Usage:"
    echo "  $0 /path/to/idx-2022-tw1-xxxxxxxxx.json"
    echo "  $0 /path/to/idx-2022-tw2-xxxxxxxxx.json"
    echo ""
    echo "Atau letakkan file JSON di folder project:"
    echo "  /home/Bima/Documents/stockbit-dashboard/"
    echo ""
    echo "File yang tersedia:"
    ls -1 /home/Bima/Documents/stockbit-dashboard/idx-*.json 2>/dev/null || echo "  (tidak ada)"
    exit 1
fi

echo "=========================================="
echo "  Import IDX JSON ke MongoDB"
echo "=========================================="
echo "File: $JSON_FILE"
echo ""
echo "Pastikan SSH tunnel aktif:"
echo "  ssh -L 27018:127.0.0.1:27017 root@8.215.33.70 -N"
echo ""

# Pindah ke folder backend (butuh .env dan node_modules)
cd /home/Bima/Documents/stockbit-dashboard/backend

# Load NVM (Deepin butuh ini)
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Jalankan import
MONGODB_URI="mongodb://localhost:27018/stockbit_dashboard" \
  node workers/import-idx-json.js "$JSON_FILE"

echo ""
echo "=========================================="
echo "  SELESAI!"
echo "=========================================="
