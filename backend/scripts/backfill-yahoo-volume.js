require('dotenv').config();
const mongoose = require('mongoose');

const Emiten = require('../models/Emiten');
const ChartPrice = require('../models/ChartPrice');
const { fetchVolumeForSymbol } = require('../lib/yahoo-finance');

const DELAY_MS = 500;
const PAUSE_MS = 5000;
const BATCH_SIZE = 50;

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function dateToString(timestamp) {
  const date = new Date(parseInt(timestamp));
  return date.toISOString().split('T')[0];
}

async function main() {
  try {
    console.log('[START] Backfill volume data dari Yahoo Finance\n');

    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/stockbit_dashboard');
    console.log('[DB] Connected to MongoDB\n');

    const emitens = await Emiten.find({ isActive: true }).select('symbol name').lean();
    console.log(`[INFO] Ditemukan ${emitens.length} emiten aktif\n`);

    let successCount = 0;
    let failCount = 0;
    let skipCount = 0;
    const errors = [];

    for (let i = 0; i < emitens.length; i++) {
      const emiten = emitens[i];
      const progress = `[${i + 1}/${emitens.length}]`;

      try {
        const existingData = await ChartPrice.findOne({
          symbol: emiten.symbol,
          timeframe: '1y'
        }).lean();

        if (existingData && existingData.prices && existingData.prices.length > 0) {
          const hasVolume = existingData.prices.some(p => p.volume && p.volume > 0);
          if (hasVolume) {
            skipCount++;
            console.log(`${progress} ⏭️ ${emiten.symbol} - sudah ada volume`);
            continue;
          }
        }

        const volumeData = await fetchVolumeForSymbol(emiten.symbol, 365);

        if (Object.keys(volumeData).length === 0) {
          failCount++;
          errors.push({ symbol: emiten.symbol, error: 'Tidak ada data dari Yahoo' });
          console.log(`${progress} ❌ ${emiten.symbol} - tidak ada data`);
          continue;
        }

        const chartPrice = await ChartPrice.findOne({
          symbol: emiten.symbol,
          timeframe: '1y'
        });

        if (chartPrice && chartPrice.prices) {
          let updatedCount = 0;
          chartPrice.prices.forEach(p => {
            const dateKey = p.formatted_date || dateToString(p.date);
            if (volumeData[dateKey]) {
              p.volume = volumeData[dateKey].volume;
              p.open = volumeData[dateKey].open;
              p.high = volumeData[dateKey].high;
              p.low = volumeData[dateKey].low;
              updatedCount++;
            }
          });

          await chartPrice.save();
          successCount++;
          console.log(`${progress} ✅ ${emiten.symbol} - ${updatedCount} prices updated`);
        } else {
          failCount++;
          errors.push({ symbol: emiten.symbol, error: 'Tidak ada data chart di MongoDB' });
          console.log(`${progress} ❌ ${emiten.symbol} - tidak ada chart data`);
        }
      } catch (err) {
        failCount++;
        errors.push({ symbol: emiten.symbol, error: err.message });
        console.log(`${progress} ❌ ${emiten.symbol} - ${err.message}`);
      }

      if ((i + 1) % BATCH_SIZE === 0) {
        console.log(`\n[BATCH] Pause ${PAUSE_MS}ms setelah ${BATCH_SIZE} emiten...\n`);
        await delay(PAUSE_MS);
      } else {
        await delay(DELAY_MS);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('[SELESAI] Backfill volume data selesai!');
    console.log('='.repeat(60));
    console.log(`Total emiten: ${emitens.length}`);
    console.log(`Berhasil: ${successCount}`);
    console.log(`Skip (sudah ada): ${skipCount}`);
    console.log(`Gagal: ${failCount}`);

    if (errors.length > 0) {
      console.log('\n[ERRORS]:');
      errors.slice(0, 20).forEach(e => console.log(`  - ${e.symbol}: ${e.error}`));
      if (errors.length > 20) {
        console.log(`  ... dan ${errors.length - 20} error lainnya`);
      }
    }

    await mongoose.disconnect();
    console.log('\n[DB] Disconnected');

  } catch (error) {
    console.error('[FATAL ERROR]:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

main();
