const express = require('express');
const router = express.Router();
const axios = require('axios');
const Snapshot = require('../models/Snapshot');
const BrokerSnapshot = require('../models/BrokerSnapshot');
const { getStockbitClient, checkTokenMiddleware, getCache, setCache } = require('../lib/stockbit');
const STOCKBIT_BASE = 'https://exodus.stockbit.com';

router.get('/ihsg', async (req, res) => {
  try {
    const cached = await Snapshot.findOne({ type: 'ihsg' }).sort({ createdAt: -1 }).lean();
    if (cached && (Date.now() - new Date(cached.createdAt).getTime() < 5 * 60 * 1000)) return res.json(cached.data);
    const token = process.env.STOCKBIT_TOKEN;
    if (!token) {
      const stale = await Snapshot.findOne({ type: 'ihsg' }).sort({ createdAt: -1 }).lean();
      return stale ? res.json(stale.data) : res.status(503).json({ error: 'No cached IHSG data and no token configured' });
    }
    const client = getStockbitClient();
    const response = await client.get('/company-price-feed/v2/orderbook/companies/IHSG', { params: { _t: Date.now() } });
    await Snapshot.deleteMany({ type: 'ihsg' });
    await Snapshot.create({ type: 'ihsg', data: response.data });
    setCache('ihsg_index', response.data);
    res.json(response.data);
  } catch (error) {
    const stale = await Snapshot.findOne({ type: 'ihsg' }).sort({ createdAt: -1 }).lean();
    if (stale) return res.json(stale.data);
    res.status(error.response?.status === 401 ? 401 : 500).json({ error: 'Gagal mengambil data IHSG' });
  }
});

router.get('/market-movers', async (req, res) => {
  const { type = 'MOVER_TYPE_TOP_GAINER' } = req.query;
  try {
    const { getCurrentToken } = require('../lib/stockbit');
    const token = await getCurrentToken();
    if (!token) return res.status(503).json({ error: 'No token configured' });
    const url = `${STOCKBIT_BASE}/order-trade/market-mover?mover_type=${encodeURIComponent(type)}&filter_stocks=FILTER_STOCKS_TYPE_MAIN_BOARD&filter_stocks=FILTER_STOCKS_TYPE_DEVELOPMENT_BOARD&filter_stocks=FILTER_STOCKS_TYPE_ACCELERATION_BOARD&filter_stocks=FILTER_STOCKS_TYPE_NEW_ECONOMY_BOARD`;
    const response = await axios.get(url, {
      headers: { 'Authorization': `Bearer ${token}`, 'User-Agent': process.env.USER_AGENT || 'Mozilla/5.0', 'Accept': 'application/json' },
      timeout: 10000
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status === 401 ? 401 : 500).json({ error: 'Gagal mengambil data market movers' });
  }
});

router.get('/broker/top', checkTokenMiddleware, async (req, res) => {
  try {
    const cacheKey = 'broker_top';
    const cached = getCache(cacheKey);
    if (cached) return res.json(cached);
    const client = getStockbitClient();
    const response = await client.get('/order-trade/broker/top', {
      params: { sort: 'TB_SORT_BY_TOTAL_VALUE', order: 'ORDER_BY_DESC', period: 'TB_PERIOD_LAST_1_DAY', market_type: 'MARKET_TYPE_ALL', eod_only: 'true', _t: Date.now() }
    });
    setCache(cacheKey, response.data);
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: 'Gagal mengambil data top broker', detail: error.response?.data || error.message });
  }
});

router.get('/running-trade/:symbol', checkTokenMiddleware, async (req, res) => {
  try {
    const { symbol } = req.params;
    const cacheKey = `running_trade_${symbol}`;
    const cached = getCache(cacheKey);
    if (cached) return res.json(cached);
    const client = getStockbitClient();
    const upperSymbol = symbol.toUpperCase();
    try {
      await client.get('/paywall/eligibility/check', { params: { company: upperSymbol, features: ['PAYWALL_FEATURE_RUNNING_TRADE', 'PAYWALL_FEATURE_ORDERBOOK'], _t: Date.now() } });
      await client.post('/paywall/counter/increment', {}, { params: { _t: Date.now() } });
    } catch (e) { /* continue anyway */ }
    const response = await client.get('/order-trade/running-trade', {
      params: { sort: 'DESC', limit: 50, order_by: 'RUNNING_TRADE_ORDER_BY_TIME', 'symbols[]': upperSymbol, _t: Date.now() }
    });
    setCache(cacheKey, response.data);
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: 'Gagal mengambil data running trade', detail: error.response?.data || error.message });
  }
});

router.get('/broker/history', async (req, res) => {
  try {
    const { days = 30, group } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days) || 30);
    startDate.setHours(0, 0, 0, 0);
    const query = { date: { $gte: startDate } };
    if (group && ['foreign', 'local', 'government'].includes(group)) query.group = group;
    const snapshots = await BrokerSnapshot.find(query).sort({ date: -1, group: 1 }).lean();
    res.json({ period: `${days} days`, data: snapshots });
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil data broker history', detail: error.message });
  }
});

module.exports = router;
