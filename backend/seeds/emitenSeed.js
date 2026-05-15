const fs = require('fs');
const path = require('path');
const Emiten = require('../models/Emiten');

// Map status papan ke sector kategorisasi
const STATUS_MAP = {
  'Utama': 'Papan Utama',
  'Pengembangan': 'Papan Pengembangan', 
  'Pemantauan Khusus': 'Pemantauan Khusus',
  'Akselerasi': 'Papan Akselerasi',
  'Ekonomi Baru': 'Ekonomi Baru'
};

function parseDaftarSaham() {
  const filePath = path.join(__dirname, '..', 'hardcode-daftar-saham.md');
  
  if (!fs.existsSync(filePath)) {
    console.warn('[SEED] hardcode-daftar-saham.md tidak ditemukan, menggunakan data default');
    return [];
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n').filter(line => line.trim());
  
  const emitenList = [];
  
  for (const line of lines) {
    // Parse format: "No\tSymbol\tName\tTanggal IPO\tJumlah Saham\tStatus"
    // Contoh: "1\tAALI\tAstra Agro Lestari Tbk.\t09 Des 1997\t1.924.688.333\tUtama"
    const parts = line.split('\t');
    
    if (parts.length >= 6) {
      const symbol = parts[1]?.trim();
      const name = parts[2]?.trim();
      const status = parts[5]?.trim();
      
      if (symbol && name) {
        emitenList.push({
          symbol: symbol.toUpperCase(),
          name: name,
          sector: STATUS_MAP[status] || status || 'Lainnya'
        });
      }
    }
  }
  
  console.log(`[SEED] Parsed ${emitenList.length} emiten from hardcode-daftar-saham.md`);
  return emitenList;
}

async function seedEmiten() {
  try {
    const emitenList = parseDaftarSaham();
    
    if (emitenList.length === 0) {
      return { created: 0, skipped: 0, total: 0, error: 'No data found' };
    }
    
    console.log(`[SEED] Starting to seed ${emitenList.length} emiten...`);
    
    let created = 0;
    let skipped = 0;
    
    for (const emiten of emitenList) {
      const existing = await Emiten.findOne({ symbol: emiten.symbol });
      if (!existing) {
        await Emiten.create(emiten);
        created++;
      } else {
        // Update data jika sudah ada
        await Emiten.findOneAndUpdate(
          { symbol: emiten.symbol },
          { name: emiten.name, sector: emiten.sector }
        );
        skipped++;
      }
    }
    
    console.log(`[SEED] Completed: ${created} created, ${skipped} updated/skipped`);
    return { created, skipped, total: emitenList.length };
  } catch (error) {
    console.error('[SEED] Error:', error.message);
    throw error;
  }
}

module.exports = { seedEmiten, parseDaftarSaham };
