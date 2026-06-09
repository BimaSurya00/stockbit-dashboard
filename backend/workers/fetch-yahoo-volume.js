require('dotenv').config();
const mongoose = require('mongoose');

const Emiten = require('../models/Emiten');
const ChartPrice = require('../models/ChartPrice');
const { fetchVolumeForSymbol } = require('../lib/yahoo-finance');

const DELAY_MS = 500;

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function dateToString(timestamp) {
  const date = new Date(parseInt(timestamp));
  return date.toISOString().split('T')[0];
}

async function main() {
  try {
    console.log('[START] Yahoo Finance volume worker\n');

    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/stockbit_dashboard');
    console.log('[DB] Connected to MongoDB\n');

    const emitens = await Emiten.find({ isActive: true }).select('symbol name').lean();
    console.log(`[INFO] Processing ${emitens.length} emiten\n`);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < emitens.length; i++) {
      const emiten = emitens[i];
      const progress = `[${i + 1}/${emitens.length}]`;

      try {
        const volumeData = await fetchVolumeForSymbol(emiten.symbol, 30);

        if (Object.keys(volumeData).length === 0) {
          failCount++;
          console.log(`${progress} ❌ ${emiten.symbol} - no data`);
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
          console.log(`${progress} ✅ ${emiten.symbol} - ${updatedCount} updated`);
        } else {
          failCount++;
          console.log(`${progress} ❌ ${emiten.symbol} - no chart data`);
        }
      } catch (err) {
        failCount++;
        console.log(`${progress} ❌ ${emiten.symbol} - ${err.message}`);
      }

      await delay(DELAY_MS);
    }

    console.log('\n' + '='.repeat(60));
    console.log('[SELESAI] Yahoo volume worker selesai!');
    console.log('='.repeat(60));
    console.log(`Berhasil: ${successCount}`);
    console.log(`Gagal: ${failCount}`);

    await mongoose.disconnect();
    console.log('\n[DB] Disconnected');

  } catch (error) {
    console.error('[FATAL ERROR]:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

main();
