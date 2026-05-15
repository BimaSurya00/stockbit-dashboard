/**
 * Worker: Fetch market snapshots from Stockbit API and store in MongoDB
 * 
 * Run every 5 minutes via PM2 cron during market hours
 * 
 * Usage: node workers/fetch-snapshots.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const axios = require('axios');
const Snapshot = require('../models/Snapshot');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/stockbit_dashboard';
const STOCKBIT_BASE = 'https://exodus.stockbit.com';

const token = process.env.STOCKBIT_TOKEN;
if (!token) {
  console.error('[ERROR] STOCKBIT_TOKEN missing');
  process.exit(1);
}

const client = axios.create({
  baseURL: STOCKBIT_BASE,
  headers: {
    'Authorization': token,
    'User-Agent': process.env.USER_AGENT || 'StockbitDashboard/1.0',
    'Accept': 'application/json'
  },
  timeout: 15000
});

const FILTER_BOARDS = [
  'FILTER_STOCKS_TYPE_MAIN_BOARD',
  'FILTER_STOCKS_TYPE_DEVELOPMENT_BOARD',
  'FILTER_STOCKS_TYPE_ACCELERATION_BOARD',
  'FILTER_STOCKS_TYPE_NEW_ECONOMY_BOARD'
];

const qs = require('qs');

async function saveSnapshot(type, data) {
  try {
    // Delete old snapshots of same type to keep only the latest
    await Snapshot.deleteMany({ type });
    await Snapshot.create({ type, data });
    return true;
  } catch (err) {
    if (err.code === 11000) {
      // Duplicate — replace
      await Snapshot.deleteMany({ type });
      await Snapshot.create({ type, data });
      return true;
    }
    throw err;
  }
}

async function fetchIHSG() {
  try {
    const res = await client.get('/company-price-feed/v2/orderbook/companies/IHSG', {
      params: { _t: Date.now() }
    });
    await saveSnapshot('ihsg', res.data);
    return `✓ ${(res.data?.data?.close || 0).toLocaleString('id-ID')}`;
  } catch (err) {
    return `✗ ${err.response?.status || 'ERR'}`;
  }
}

async function fetchTrending() {
  try {
    const res = await client.get('/emitten/trending', { params: { _t: Date.now() } });
    await saveSnapshot('trending', res.data);
    const count = Array.isArray(res.data) ? res.data.length : (res.data?.data?.length || '?');
    return `✓ ${count} stocks`;
  } catch (err) {
    return `✗ ${err.response?.status || 'ERR'}`;
  }
}

async function fetchMovers(type) {
  try {
    const res = await client.get('/order-trade/market-mover', {
      params: {
        mover_type: type,
        filter_stocks: FILTER_BOARDS,
        _t: Date.now()
      },
      paramsSerializer: (p) => qs.stringify(p, { arrayFormat: 'repeat' })
    });
    const snapType = type === 'MOVER_TYPE_TOP_GAINER' ? 'top_gainer'
      : type === 'MOVER_TYPE_TOP_LOSER' ? 'top_loser'
      : 'top_value';
    await saveSnapshot(snapType, res.data);
    const count = res.data?.data?.mover_list?.length || '?';
    return `✓ ${count} entries`;
  } catch (err) {
    return `✗ ${err.response?.status || 'ERR'}`;
  }
}

async function main() {
  const ts = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
  console.log(`[${ts}] Fetching snapshots...`);

  await mongoose.connect(MONGODB_URI);

  const results = [];

  results.push(['IHSG     ', await fetchIHSG()]);
  results.push(['Trending ', await fetchTrending()]);
  results.push(['Gainer   ', await fetchMovers('MOVER_TYPE_TOP_GAINER')]);
  results.push(['Loser    ', await fetchMovers('MOVER_TYPE_TOP_LOSER')]);
  results.push(['Value    ', await fetchMovers('MOVER_TYPE_TOP_VALUE')]);

  for (const [label, result] of results) {
    console.log(`  ${label} ${result}`);
  }

  await mongoose.disconnect();
  console.log('  Done.\n');
}

main().catch(err => {
  console.error('[FATAL]', err.message);
  process.exit(1);
});
