/**
 * Worker: Fetch daily chart prices for all emiten from Stockbit API
 * 
 * Usage:
 *   node workers/fetch-daily-prices.js
 * 
 * Env vars needed:
 *   STOCKBIT_TOKEN=Bearer xxx
 *   MONGODB_URI=mongodb://localhost:27017/stockbit_dashboard
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const axios = require('axios');
const Emiten = require('../models/Emiten');
const ChartPrice = require('../models/ChartPrice');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/stockbit_dashboard';
const STOCKBIT_BASE = 'https://exodus.stockbit.com';
const TIMEFRAMES = ['1d', '1w', '1m', '3m', 'ytd', '1y', '3y', '5y'];
const DELAY_MS = 300;
const BATCH_SIZE = 50;
const BATCH_DELAY_MS = 2000;

let token = process.env.STOCKBIT_TOKEN || null;

async function loadTokenFromDB() {
  const Config = require('../models/Config');
  try {
    const config = await Config.findOne({ key: 'stockbit_token' });
    if (config && config.value) {
      token = config.value;
      console.log('[TOKEN] Loaded from database');
      return;
    }
  } catch (err) {}
  if (process.env.STOCKBIT_TOKEN) {
    token = process.env.STOCKBIT_TOKEN;
  }
}

function getClient() {
  return axios.create({
    baseURL: STOCKBIT_BASE,
    headers: {
      'Authorization': token,
      'User-Agent': process.env.USER_AGENT || 'StockbitDashboard/1.0',
      'Accept': 'application/json'
    },
    timeout: 15000
  });
}

async function fetchChart(symbol, timeframe) {
  const client = getClient();
  try {
    const res = await client.get(`/charts/${symbol}/daily`, {
      params: {
        timeframe,
        is_include_previous_historical: 'true',
        _t: Date.now()
      }
    });
    return res.data;
  } catch (err) {
    if (err.response?.status === 429) {
      console.warn(`  [RATE LIMIT] ${symbol} — waiting 5s...`);
      await sleep(5000);
      return fetchChart(symbol, timeframe);
    }
    throw err;
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function saveChartData(symbol, timeframe, data) {
  try {
    const prices = data?.data?.prices || [];
    const previous = data?.data?.previous || 0;

    const latest = prices[prices.length - 1];
    const metadata = latest ? {
      lastPrice: parseFloat(latest.value) || 0,
      change: latest.change || 0,
      changePercent: parseFloat(latest.percentage) || 0
    } : {};

    await ChartPrice.findOneAndUpdate(
      { symbol: symbol.toUpperCase(), timeframe },
      {
        symbol: symbol.toUpperCase(),
        timeframe,
        prices,
        previous,
        metadata,
        updatedAt: new Date()
      },
      { upsert: true, new: true }
    );

    // Update emiten collection with latest price (from 1d timeframe only)
    if (timeframe === '1d' && metadata.lastPrice > 0) {
      await Emiten.findOneAndUpdate(
        { symbol: symbol.toUpperCase() },
        {
          lastPrice: metadata.lastPrice,
          change: metadata.change,
          changePercent: metadata.changePercent
        }
      );
    }

    return { success: true, priceCount: prices.length };
  } catch (err) {
    throw err;
  }
}

async function main() {
  console.log('=== Stockbit Daily Price Fetcher ===');
  console.log('Time:', new Date().toISOString());
  console.log('Timeframes:', TIMEFRAMES.join(', '));
  console.log('');

  // Connect to MongoDB
  await mongoose.connect(MONGODB_URI);
  console.log('[DB] Connected to MongoDB\n');

  await loadTokenFromDB();
  if (!token) {
    console.error('[ERROR] No Stockbit token available');
    return;
  }

  // Get all active emiten
  const emitens = await Emiten.find({ isActive: true }).lean();
  console.log(`[INFO] ${emitens.length} emiten to process\n`);

  let totalFetched = 0;
  let totalSaved = 0;
  let totalErrors = 0;
  const startTime = Date.now();

  for (let i = 0; i < emitens.length; i++) {
    const emiten = emitens[i];
    const symbol = emiten.symbol;
    const progress = `[${i + 1}/${emitens.length}]`;

    if (!symbol || symbol === '?') {
      console.log(`${progress} SKIP: no symbol`);
      continue;
    }

    for (const tf of TIMEFRAMES) {
      try {
        process.stdout.write(`${progress} ${symbol.padEnd(5)} ${tf.padEnd(4)} `);
        const data = await fetchChart(symbol, tf);
        const result = await saveChartData(symbol, tf, data);
        console.log(`✓ ${result.priceCount} prices`);
        totalFetched++;
        totalSaved += result.priceCount;
        await sleep(DELAY_MS);
      } catch (err) {
        const status = err.response?.status || 'ERR';
        console.log(`✗ ${status}`);
        totalErrors++;

        if (err.response?.status === 401) {
          console.error('[FATAL] Token expired! Update STOCKBIT_TOKEN in .env');
          process.exit(1);
        }

        await sleep(DELAY_MS);
      }
    }

    // Batch pause every BATCH_SIZE emiten
    if ((i + 1) % BATCH_SIZE === 0 && i < emitens.length - 1) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
      console.log(`\n--- Batch pause (${BATCH_SIZE} emiten, ${elapsed}s elapsed) ---\n`);
      await sleep(BATCH_DELAY_MS);
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  console.log('\n=== DONE ===');
  console.log(`Time: ${totalTime} minutes`);
  console.log(`Fetched: ${totalFetched} requests`);
  console.log(`Prices saved: ${totalSaved}`);
  console.log(`Errors: ${totalErrors}`);

  await mongoose.disconnect();
}

const LOOP_INTERVAL = 24 * 60 * 60 * 1000; // 24 jam

async function start() {
  await main();
  const next = new Date(Date.now() + LOOP_INTERVAL).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
  console.log(`Next price fetch: ${next}\n`);
  setTimeout(start, LOOP_INTERVAL);
}

start().catch(err => {
  console.error('[FATAL]', err.message);
  process.exit(1);
});
