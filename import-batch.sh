#!/bin/bash
#
# Batch Import IDX JSON ke MongoDB via SSH Tunnel
#
# Import SEMUA file idx-YYYY-*.json sekaligus.
#
# CARA PENGGUNAAN:
#   1. Buka terminal baru, jalankan tunnel:
#      ssh -L 27018:127.0.0.1:27017 root@8.215.33.70 -N
#
#   2. Di terminal lain, jalankan:
#      ./import-batch.sh
#
#   Atau import file tertentu saja:
#      ./import-batch.sh idx-2022-tw1 idx-2022-audit
#

set -e

# Load NVM (Deepin butuh ini)
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

cd /home/Bima/Documents/stockbit-dashboard/backend

# Patern: jika ada argumen, filter file; jika tidak, semua idx-*.json
if [ $# -gt 0 ]; then
    PATTERNS=("$@")
    FILES=()
    for pattern in "${PATTERNS[@]}"; do
        for f in /home/Bima/Documents/stockbit-dashboard/idx-${pattern}*.json; do
            [ -f "$f" ] && FILES+=("$f")
        done
    done
else
    FILES=(/home/Bima/Documents/stockbit-dashboard/idx-*.json)
fi

if [ ${#FILES[@]} -eq 0 ] || [ ! -f "${FILES[0]}" ]; then
    echo "=========================================="
    echo "  ERROR: Tidak ada file JSON ditemukan!"
    echo "=========================================="
    echo ""
    echo "Letakkan file JSON di: /home/Bima/Documents/stockbit-dashboard/"
    exit 1
fi

echo "=========================================="
echo "  Batch Import IDX JSON ke MongoDB"
echo "=========================================="
echo "Total file: ${#FILES[@]}"
echo ""
echo "Pastikan SSH tunnel aktif:"
echo "  ssh -L 27018:127.0.0.1:27017 root@8.215.33.70 -N"
echo ""

TOTAL_IMPORTED=0
TOTAL_SKIPPED=0

for file in "${FILES[@]}"; do
    if [ ! -f "$file" ]; then
        continue
    fi

    echo "------------------------------------------"
    echo "Import: $(basename "$file")"
    echo "------------------------------------------"

    MONGODB_URI="mongodb://localhost:27018/stockbit_dashboard" \
        node workers/import-idx-json.js "$file" || {
        echo "WARNING: Import gagal untuk $(basename "$file")"
        continue
    }

echo ""
done

echo "=========================================="
echo "  BATCH IMPORT SELESAI!"
echo "=========================================="
