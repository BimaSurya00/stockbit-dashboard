require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');

const Emiten = require('../models/Emiten');
const ChartPrice = require('../models/ChartPrice');
const Config = require('../models/Config');

const STOCKBIT_BASE = 'https://exodus.stockbit.com';
const DELAY_MS = 300; // 300ms antar request
const PAUSE_MS = 2000; // 2s pause tiap 50 emiten
const BATCH_SIZE = 50;

let currentToken = null;

async function loadToken() {
  try {
    const config = await Config.findOne({ key: 'stockbit_token' });
    if (config && config.value) {
      currentToken = config.value;
      console.log('[TOKEN] Loaded from database');
      return;
    }
  } catch (err) {
    console.warn('[TOKEN] Cannot read from DB, fallback to env');
  }
  currentToken = process.env.STOCKBIT_TOKEN;
  console.log('[TOKEN] Loaded from environment');
}

function getStockbitClient() {
  return axios.create({
    baseURL: STOCKBIT_BASE,
    headers: {
      'Authorization': `Bearer ${currentToken}`,
      'User-Agent': process.env.USER_AGENT || 'Mozilla/5.0',
      'Accept': 'application/json'
    },
    timeout: 30000
  });
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchAndSaveChart(symbol, timeframe = '1y') {
  try {
    const client = getStockbitClient();
    const response = await client.get(`/charts/${symbol}/daily`, {
      params: {
        timeframe,
        is_include_previous_historical: 'true',
        _t: Date.now()
      }
    });

    const chartData = response.data;

    if (chartData?.data?.prices && chartData.data.prices.length > 0) {
      const latestPrice = chartData.data.prices[chartData.data.prices.length - 1];
      
      const pricesWithVolume = chartData.data.prices.map(p => ({
        date: p.date,
        formatted_date: p.formatted_date,
        value: p.value,
        change: p.change,
        percentage: p.percentage,
        volume: p.volume ? parseFloat(p.volume) : undefined
      }));

      await ChartPrice.findOneAndUpdate(
        { symbol: symbol.toUpperCase(), timeframe },
        {
          symbol: symbol.toUpperCase(),
          timeframe,
          prices: pricesWithVolume,
          previous: chartData.data.previous || 0,
          metadata: {
            lastPrice: latestPrice ? parseFloat(latestPrice.value) || 0 : 0,
            change: latestPrice?.change || 0,
            changePercent: latestPrice?.percentage || '0'
          },
          updatedAt: new Date()
        },
        { upsert: true }
      );

      return { success: true, count: pricesWithVolume.length };
    }

    return { success: false, error: 'No price data' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function main() {
  try {
    console.log('[START] Backfill volume data untuk semua emiten\n');

    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/stockbit_dashboard');
    console.log('[DB] Connected to MongoDB\n');

    await loadToken();

    if (!currentToken) {
      console.error('[ERROR] Stockbit token tidak ditemukan!');
      process.exit(1);
    }

    const emitens = await Emiten.find({ isActive: true }).select('symbol name').lean();
    console.log(`[INFO] Ditemukan ${emitens.length} emiten aktif\n`);

    let successCount = 0;
    let failCount = 0;
    const errors = [];

    for (let i = 0; i < emitens.length; i++) {
      const emiten = emitens[i];
      const progress = `[${i + 1}/${emitens.length}]`;

      const result = await fetchAndSaveChart(emiten.symbol, '1y');

      if (result.success) {
        successCount++;
        console.log(`${progress} ✅ ${emiten.symbol} - ${result.count} prices`);
      } else {
        failCount++;
        errors.push({ symbol: emiten.symbol, error: result.error });
        console.log(`${progress} ❌ ${emiten.symbol} - ${result.error}`);
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
    console.log(`Gagal: ${failCount}`);

    if (errors.length > 0) {
      console.log('\n[ERRORS]:');
      errors.forEach(e => console.log(`  - ${e.symbol}: ${e.error}`));
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
