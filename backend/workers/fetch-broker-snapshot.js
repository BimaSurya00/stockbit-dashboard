require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');

const BrokerSnapshot = require('../models/BrokerSnapshot');
const Config = require('../models/Config');

const STOCKBIT_BASE = 'https://exodus.stockbit.com';

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

async function fetchBrokerData() {
  try {
    const client = getStockbitClient();
    const response = await client.get('/order-trade/broker/top', {
      params: {
        period: 'TB_PERIOD_LAST_1_DAY',
        _t: Date.now()
      }
    });

    if (response.data?.data?.list) {
      return response.data.data.list;
    }
    return null;
  } catch (error) {
    console.error('[ERROR] Fetch broker data:', error.message);
    return null;
  }
}

function aggregateByGroup(brokers) {
  const groups = {
    foreign: { brokers: [], buy_value: 0, sell_value: 0, net_value: 0, total_value: 0, total_volume: 0, total_frequency: 0 },
    local: { brokers: [], buy_value: 0, sell_value: 0, net_value: 0, total_value: 0, total_volume: 0, total_frequency: 0 },
    government: { brokers: [], buy_value: 0, sell_value: 0, net_value: 0, total_value: 0, total_volume: 0, total_frequency: 0 }
  };

  for (const broker of brokers) {
    let group = 'local';
    if (broker.group === 'BROKER_GROUP_FOREIGN') group = 'foreign';
    else if (broker.group === 'BROKER_GROUP_GOVERNMENT') group = 'government';

    groups[group].buy_value += broker.buy_value || 0;
    groups[group].sell_value += broker.sell_value || 0;
    groups[group].net_value += broker.net_value || 0;
    groups[group].total_value += broker.total_value || 0;
    groups[group].total_volume += broker.total_volume || 0;
    groups[group].total_frequency += broker.total_frequency || 0;

    groups[group].brokers.push({
      code: broker.code,
      name: broker.name,
      net_value: broker.net_value || 0,
      buy_value: broker.buy_value || 0,
      sell_value: broker.sell_value || 0
    });
  }

  return groups;
}

async function saveSnapshots(groups) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const operations = [];

  for (const [group, data] of Object.entries(groups)) {
    const topBrokers = data.brokers
      .sort((a, b) => Math.abs(b.net_value) - Math.abs(a.net_value))
      .slice(0, 10);

    operations.push(
      BrokerSnapshot.findOneAndUpdate(
        { date: today, group },
        {
          date: today,
          group,
          buy_value: data.buy_value,
          sell_value: data.sell_value,
          net_value: data.net_value,
          total_value: data.total_value,
          total_volume: data.total_volume,
          total_frequency: data.total_frequency,
          top_brokers: topBrokers,
          createdAt: new Date()
        },
        { upsert: true, new: true }
      )
    );
  }

  await Promise.all(operations);
  console.log(`[SAVED] Broker snapshots for ${today.toISOString().split('T')[0]}`);
}

async function main() {
  try {
    console.log('[START] Fetch broker snapshot\n');

    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/stockbit_dashboard');
    console.log('[DB] Connected to MongoDB\n');

    await loadToken();

    if (!currentToken) {
      console.error('[ERROR] Stockbit token tidak ditemukan!');
      process.exit(1);
    }

    console.log('[FETCH] Mengambil data broker dari Stockbit...');
    const brokers = await fetchBrokerData();

    if (!brokers || brokers.length === 0) {
      console.error('[ERROR] Tidak ada data broker yang diterima');
      process.exit(1);
    }

    console.log(`[INFO] Diterima ${brokers.length} broker\n`);

    console.log('[AGGREGATE] Mengelompokkan berdasarkan grup...');
    const groups = aggregateByGroup(brokers);

    console.log(`[INFO] Foreign: ${groups.foreign.brokers.length} broker`);
    console.log(`[INFO] Local: ${groups.local.brokers.length} broker`);
    console.log(`[INFO] Government: ${groups.government.brokers.length} broker\n`);

    console.log('[SAVE] Menyimpan snapshot ke MongoDB...');
    await saveSnapshots(groups);

    console.log('\n' + '='.repeat(60));
    console.log('[SELESAI] Broker snapshot berhasil disimpan!');
    console.log('='.repeat(60));

    await mongoose.disconnect();
    console.log('\n[DB] Disconnected');

  } catch (error) {
    console.error('[FATAL ERROR]:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

main();
