const express = require('express');
const router = express.Router();
const Emiten = require('../models/Emiten');
const ChartPrice = require('../models/ChartPrice');
const Snapshot = require('../models/Snapshot');
const { seedEmiten } = require('../seeds/emitenSeed');
const { getCache, setCache } = require('../lib/stockbit');
const { getStockbitClient, checkTokenMiddleware } = require('../lib/stockbit');

router.post('/seed', async (req, res) => {
  try {
    const result = await seedEmiten();
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ error: 'Gagal seed emiten', detail: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const { sector, search, page = 1, limit = 50 } = req.query;
    const query = { isActive: true };
    if (sector) query.sector = sector;
    if (search) query.$or = [{ symbol: { $regex: search, $options: 'i' } }, { name: { $regex: search, $options: 'i' } }];
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const emitens = await Emiten.find(query).sort({ symbol: 1 }).skip(skip).limit(parseInt(limit));
    const total = await Emiten.countDocuments(query);
    res.json({ data: emitens, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } });
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil daftar emiten', detail: error.message });
  }
});

router.get('/trending', async (req, res) => {
  try {
    const cached = await Snapshot.findOne({ type: 'trending' }).sort({ createdAt: -1 }).lean();
    if (cached && (Date.now() - new Date(cached.createdAt).getTime() < 5 * 60 * 1000)) return res.json(cached.data);
    const token = process.env.STOCKBIT_TOKEN;
    if (!token) return res.status(503).json({ error: 'No cached data and no token configured' });
    const client = getStockbitClient();
    const response = await client.get('/emitten/trending', { params: { _t: Date.now() } });
    await Snapshot.deleteMany({ type: 'trending' });
    await Snapshot.create({ type: 'trending', data: response.data });
    setCache('emiten_trending', response.data);
    res.json(response.data);
  } catch (error) {
    const stale = await Snapshot.findOne({ type: 'trending' }).sort({ createdAt: -1 }).lean();
    if (stale) return res.json(stale.data);
    res.status(error.response?.status === 401 ? 401 : 500).json({ error: 'Gagal mengambil data trending' });
  }
});

router.get('/:symbol/info', async (req, res) => {
  try {
    const client = getStockbitClient();
    const response = await client.get(`/emitten/${req.params.symbol}/info`);
    const data = response.data?.data;
    if (!data) return res.status(404).json({ error: 'Data tidak ditemukan' });
    res.json({
      symbol: data.symbol, name: data.name, sector: data.sector, subSector: data.sub_sector,
      price: data.price ? parseFloat(data.price) : null, previous: data.previous ? parseFloat(data.previous) : null,
      change: data.change || null, percentage: data.percentage || null,
      volume: data.volume ? parseInt(data.volume) : null, averageVolume: data.average ? parseInt(data.average) : null,
      high: null, low: null, open: null,
      orderbook: data.orderbook ? {
        bid: { price: parseFloat(data.orderbook.bid.price) || null, volume: parseFloat(data.orderbook.bid.volume) || null },
        offer: { price: parseFloat(data.orderbook.offer.price) || null, volume: parseFloat(data.orderbook.offer.volume) || null }
      } : null,
      iconUrl: data.icon_url || null, updatedAt: data.updated || null
    });
  } catch (error) {
    if (error.response?.status === 404) return res.status(404).json({ error: 'Data tidak ditemukan' });
    res.status(500).json({ error: 'Gagal mengambil data emiten', detail: error.message });
  }
});

router.get('/:symbol', async (req, res) => {
  try {
    const emiten = await Emiten.findOne({ symbol: req.params.symbol.toUpperCase() });
    if (!emiten) return res.status(404).json({ error: 'Emiten tidak ditemukan' });
    res.json(emiten);
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil data emiten', detail: error.message });
  }
});

router.post('/:symbol/fetch-chart', checkTokenMiddleware, async (req, res) => {
  try {
    const { symbol } = req.params;
    const { timeframe = '1w' } = req.body;
    const client = getStockbitClient();
    const response = await client.get(`/charts/${symbol}/daily`, {
      params: { timeframe, is_include_previous_historical: 'true', _t: Date.now() }
    });
    const chartData = response.data;
    const latestPrice = chartData?.data?.prices?.[chartData.data.prices.length - 1];
    await Emiten.findOneAndUpdate({ symbol: symbol.toUpperCase() }, {
      chartData, chartUpdatedAt: new Date(),
      ...(latestPrice && { lastPrice: parseFloat(latestPrice.value) || 0, change: latestPrice.change || 0, changePercent: latestPrice.percentage || '0' })
    }, { upsert: true });
    if (chartData?.data?.prices?.length > 0) {
      await ChartPrice.findOneAndUpdate({ symbol: symbol.toUpperCase(), timeframe }, {
        symbol: symbol.toUpperCase(), timeframe, prices: chartData.data.prices, previous: chartData.data.previous || 0,
        metadata: { lastPrice: latestPrice ? parseFloat(latestPrice.value) || 0 : 0, change: latestPrice?.change || 0, changePercent: latestPrice?.percentage || '0' },
        updatedAt: new Date()
      }, { upsert: true });
    }
    res.json({ success: true, data: chartData });
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil data chart', detail: error.message });
  }
});

router.post('/batch-fetch', checkTokenMiddleware, async (req, res) => {
  try {
    const { limit = 10 } = req.body;
    const emitens = await Emiten.find({ isActive: true }).limit(parseInt(limit));
    const results = [];
    const client = getStockbitClient();
    for (const emiten of emitens) {
      try {
        const response = await client.get(`/charts/${emiten.symbol}/daily`, {
          params: { timeframe: '1d', is_include_previous_historical: 'true', _t: Date.now() }
        });
        const chartData = response.data;
        const latestPrice = chartData?.data?.prices?.[chartData.data.prices.length - 1];
        await Emiten.findByIdAndUpdate(emiten._id, { chartData, chartUpdatedAt: new Date(), ...(latestPrice && { lastPrice: parseFloat(latestPrice.value) || 0, change: latestPrice.change || 0, changePercent: latestPrice.percentage || '0' }) });
        results.push({ symbol: emiten.symbol, status: 'success' });
        await new Promise(r => setTimeout(r, 1000));
      } catch (err) { results.push({ symbol: emiten.symbol, status: 'error', error: err.message }); }
    }
    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ error: 'Gagal batch fetch', detail: error.message });
  }
});

module.exports = router;
