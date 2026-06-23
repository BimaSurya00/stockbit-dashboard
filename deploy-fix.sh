#!/bin/bash
# Run di production server: /home/stockbit/actions-runner/_work/stockbit-dashboard/stockbit-dashboard
# bash deploy-fix.sh

set -e
cd "$(dirname "$0")/backend"

echo "=== Backup ==="
cp lib/gemini.js lib/gemini.js.bak 2>/dev/null || true
cp server.js server.js.bak 2>/dev/null || true

echo "=== Patch gemini.js: remove self-defeating prompt + strengthen instruction ==="
node -e "
const fs = require('fs');
let c = fs.readFileSync('lib/gemini.js', 'utf8');

// 1. Remove 'Jika ditanya tentang data yang tidak tersedia, katakan dengan jujur...'
const oldLine = 'Jika ditanya tentang data yang tidak tersedia, katakan dengan jujur bahwa data tersebut tidak tersedia.\n';
c = c.replace(oldLine, '');

// 2. Strengthen the instruction
const oldInst = 'Gunakan data di atas untuk memberikan analisa teknikal singkat dan relevan.';
const newInst = 'WAJIB: Sertakan analisa teknikal menggunakan data di atas dalam jawabanmu. JANGAN bilang data tidak tersedia.';
c = c.replace(new RegExp(oldInst.replace(/[.*+?^${}()|[\]\\]/g, '\\\\$&'), 'g'), newInst);

// 3. Add 'Semua data di bawah ini ADALAH DATA REAL'
c = c.replace(
  'Kamu adalah asisten analis saham Indonesia yang membantu investor memahami data pasar.',
  'Kamu adalah asisten analis saham Indonesia profesional dengan akses data real-time. Semua data di bawah adalah DATA REAL yang wajib digunakan.'
);

fs.writeFileSync('lib/gemini.js', c);
console.log('gemini.js patched OK');
"

echo "=== Patch server.js: inject indicators into user question ==="
node -e "
const fs = require('fs');
let c = fs.readFileSync('server.js', 'utf8');

const oldQ = 'await chatWithContext(question, context, (chunk) => {';
const newQ = `const enrichedQuestion = context.technicalIndicators
      ? \\\`[DATA TEKNIKAL \\\${context.symbol}]\\nHarga: \\\${context.technicalIndicators.lastPrice} | SMA20: \\\${context.technicalIndicators.sma20} | SMA50: \\\${context.technicalIndicators.sma50} | RSI14: \\\${context.technicalIndicators.rsi14} | MACD: \\\${context.technicalIndicators.macd} (sig: \\\${context.technicalIndicators.macdSignal})\\n\\nPertanyaan: \\\${question}\\nJawab dengan menyertakan analisa teknikal dari data di atas.\\\`
      : question;

    await chatWithContext(enrichedQuestion, context, (chunk) => {`;

c = c.replace(oldQ, newQ);
fs.writeFileSync('server.js', c);
console.log('server.js patched OK');
"

echo "=== Verify patches ==="
grep -c "WAJIB:" lib/gemini.js && echo "gemini.js OK" || echo "gemini.js FAIL"
grep -c "enrichedQuestion" server.js && echo "server.js OK" || echo "server.js FAIL"

echo "=== Rebuild backend ==="
docker compose build --no-cache stockbit-backend && docker compose up -d stockbit-backend

echo "=== Done. Test AI chat now. ==="
docker logs stockbit-backend 2>&1 | grep "\[AI\]" | tail -3
