const express = require('express');
const router = express.Router();
const axios = require('axios');
const Emiten = require('../models/Emiten');
const { getStockbitClient } = require('../lib/stockbit');
const STOCKBIT_BASE = 'https://exodus.stockbit.com';

router.get('/ipo/list', async (req, res) => {
  try {
    const { filter = 'ongoing' } = req.query;
    const { getCurrentToken } = require('../lib/stockbit');
    const token = await getCurrentToken();
    const headers = { 'Accept': 'application/json', 'Origin': 'https://stockbit.com', 'Referer': 'https://stockbit.com/' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const response = await axios.get('https://api.trading.stockbit.com/eipo/social/company/list', { params: { filter }, headers, timeout: 10000 });
    res.json(response.data);
  } catch (error) {
    if (error.response?.status === 404) return res.json({ data: [] });
    res.status(500).json({ error: 'Gagal mengambil data IPO', detail: error.message });
  }
});

router.get('/screener', async (req, res) => {
  try {
    const { search, sector, industry, minPrice, maxPrice, minChange, maxChange, minVolume, minMarketCap, sort = 'symbol', order = 'asc', page = 1, limit = 30 } = req.query;
    const filter = { isActive: true };
    if (search) filter.$or = [{ symbol: { $regex: search, $options: 'i' } }, { name: { $regex: search, $options: 'i' } }];
    if (sector) filter.sector = { $regex: sector, $options: 'i' };
    if (industry) filter.industry = { $regex: industry, $options: 'i' };
    if (minPrice || maxPrice) { filter.lastPrice = {}; if (minPrice) filter.lastPrice.$gte = parseFloat(minPrice); if (maxPrice) filter.lastPrice.$lte = parseFloat(maxPrice); }
    if (minChange || maxChange) { filter.change = {}; if (minChange) filter.change.$gte = parseFloat(minChange); if (maxChange) filter.change.$lte = parseFloat(maxChange); }
    if (minVolume) filter.volume = { $gte: parseInt(minVolume) };
    if (minMarketCap) filter.marketCap = { $gte: parseInt(minMarketCap) };
    const sortMap = { symbol: 'symbol', price: 'lastPrice', change: 'change', volume: 'volume', marketCap: 'marketCap' };
    const sortField = sortMap[sort] || 'symbol';
    const sortDir = order === 'desc' ? -1 : 1;
    const [data, total] = await Promise.all([
      Emiten.find(filter).sort({ [sortField]: sortDir }).skip((parseInt(page) - 1) * parseInt(limit)).limit(parseInt(limit)).lean(),
      Emiten.countDocuments(filter)
    ]);
    const sectors = await Emiten.distinct('sector', { isActive: true });
    res.json({
      data: data.map(e => ({ symbol: e.symbol, name: e.name, sector: e.sector, industry: e.industry, lastPrice: e.lastPrice, change: e.change, changePercent: e.changePercent, volume: e.volume, marketCap: e.marketCap })),
      pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) },
      filters: { sectors: sectors.filter(Boolean).sort() }
    });
  } catch (error) { res.status(500).json({ error: 'Gagal menjalankan screener', detail: error.message }); }
});

router.get('/research', async (req, res) => {
  try {
    const { keyword = '' } = req.query;
    try {
      const client = getStockbitClient();
      const response = await client.get('/research', { params: keyword ? { keyword } : {} });
      if (response.data?.data) {
        const Research = require('../models/Research');
        for (const item of response.data.data) {
          if (!item.id) continue;
          await Research.findOneAndUpdate({ researchId: item.id }, { researchId: item.id, title: item.title, categoryLabel: item.category_label || 'Snips', url: item.url || '', iconUrl: item.icon_url || '', imageUrl: item.image_url || '', description: item.description || '', compressedImageUrl: item.compressed_image_url || '', created: item.created ? new Date(item.created) : new Date(), fetchedAt: new Date() }, { upsert: true, new: true });
        }
        return res.json(response.data);
      }
    } catch (apiErr) { console.warn('[RESEARCH] Stockbit API error, fallback to MongoDB:', apiErr.message); }
    const Research = require('../models/Research');
    const query = {}; if (keyword) query.title = { $regex: keyword, $options: 'i' };
    const items = await Research.find(query).sort({ created: -1 }).limit(50).lean();
    res.json({
      message: items.length > 0 ? 'Successfully retrieved research (from cache)' : 'No research data available',
      data: items.map(r => ({ id: r.researchId, title: r.title, category_label: r.categoryLabel, url: r.url, icon_url: r.iconUrl, image_url: r.imageUrl, compressed_image_url: r.compressedImageUrl, description: r.description, created: r.created }))
    });
  } catch (error) { res.status(500).json({ error: 'Gagal mengambil research', detail: error.message }); }
});

router.get('/broker/flow', async (req, res) => {
  try {
    const { symbol, days = 30 } = req.query;
    if (!symbol) return res.status(400).json({ error: 'Symbol diperlukan' });
    const client = getStockbitClient();
    const response = await client.get('/order-trade/broker/flow', {
      params: { period: 'TB_PERIOD_LAST_1_DAY', ...(days && { days: parseInt(days) }), 'symbols[]': symbol.toUpperCase(), _t: Date.now() }
    });
    res.json(response.data);
  } catch (error) { res.status(error.response?.status || 500).json({ error: 'Gagal mengambil broker flow', detail: error.response?.data || error.message }); }
});

router.get('/broker/page', async (req, res) => {
  try {
    const { sort = 'TB_SORT_BY_TOTAL_VALUE', order = 'ORDER_BY_DESC', period = 'TB_PERIOD_LAST_1_DAY' } = req.query;
    const client = getStockbitClient();
    const response = await client.get('/order-trade/broker/page', { params: { sort, order, period, _t: Date.now() } });
    res.json(response.data);
  } catch (error) { res.status(error.response?.status || 500).json({ error: 'Gagal mengambil broker page', detail: error.response?.data || error.message }); }
});

module.exports = router;
