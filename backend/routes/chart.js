const express = require('express');
const router = express.Router();
const ChartPrice = require('../models/ChartPrice');
const Snapshot = require('../models/Snapshot');
const { getStockbitClient, checkTokenMiddleware, getCache, setCache, CACHE_DURATION } = require('../lib/stockbit');

// Cached chart data
router.get('/chart/:symbol', checkTokenMiddleware, async (req, res) => {
  try {
    const { symbol } = req.params;
    const { timeframe = '1w' } = req.query;
    const cacheKey = `chart_${symbol}_${timeframe}`;
    const cached = getCache(cacheKey);
    if (cached) return res.json(cached);

    const client = getStockbitClient();
    const response = await client.get(`/charts/${symbol}/daily`, {
      params: { timeframe, is_include_previous_historical: 'true', _t: Date.now() }
    });
    const chartData = response.data;
    setCache(cacheKey, chartData);

    if (chartData?.data?.prices?.length > 0) {
      const latestPrice = chartData.data.prices[chartData.data.prices.length - 1];
      const pricesData = chartData.data.prices.map(p => ({
        date: p.date, formatted_date: p.formatted_date, value: p.value,
        change: p.change, percentage: p.percentage, volume: p.volume ? parseFloat(p.volume) : undefined
      }));
      ChartPrice.findOneAndUpdate({ symbol: symbol.toUpperCase(), timeframe }, {
        symbol: symbol.toUpperCase(), timeframe, prices: pricesData, previous: chartData.data.previous || 0,
        metadata: { lastPrice: latestPrice ? parseFloat(latestPrice.value) || 0 : 0, change: latestPrice?.change || 0, changePercent: latestPrice?.percentage || '0' },
        updatedAt: new Date()
      }, { upsert: true }).catch(err => console.error('Error saving ChartPrice:', err.message));
    }
    res.json(chartData);
  } catch (error) {
    if (error.response?.status === 401) return res.status(401).json({ error: 'Unauthorized - Token Stockbit expired' });
    res.status(error.response?.status || 500).json({ error: 'Gagal mengambil data chart', detail: error.response?.data || error.message });
  }
});

// Cached prices from MongoDB
router.get('/prices/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { timeframe = '1w' } = req.query;
    const record = await ChartPrice.findOne({ symbol: symbol.toUpperCase(), timeframe }).lean();
    if (record?.prices?.length > 0) return res.json({ data: { prices: record.prices, previous: record.previous, timeframe: record.timeframe } });
    res.status(404).json({ error: 'No cached data available for this timeframe' });
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil data harga', detail: error.message });
  }
});

// Indicator list
const { getIndicatorList, getIndicatorsByCategory, parseIndicatorString } = require('../lib/indicator-registry');
router.get('/indicators', (req, res) => {
  try {
    res.json(req.query.groupBy === 'category' ? getIndicatorsByCategory() : getIndicatorList());
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil daftar indikator', detail: error.message });
  }
});

// Indicator calculation
const { calculateMultiple, extractClosePrices, extractVolumeData, formatResponse } = require('../lib/technical-analysis');
router.get('/emiten/:symbol/indicators', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { timeframe = '1y', indicators: indicatorsParam } = req.query;
    if (!indicatorsParam) return res.status(400).json({ error: 'Parameter indicators diperlukan' });
    const requested = parseIndicatorString(indicatorsParam);
    if (!requested.length) return res.status(400).json({ error: 'Tidak ada indikator yang diminta' });
    const chartData = await ChartPrice.findOne({ symbol: symbol.toUpperCase(), timeframe }).lean();
    if (!chartData?.prices?.length) return res.status(404).json({ error: 'Data harga tidak ditemukan' });
    const { closePrices, validIndices } = extractClosePrices(chartData.prices);
    const labels = validIndices.map(i => chartData.prices[i].formatted_date || chartData.prices[i].date);
    if (closePrices.length < 2) return res.status(400).json({ error: 'Data harga tidak cukup' });
    const { volumeData } = extractVolumeData(chartData.prices);
    const results = calculateMultiple(closePrices, requested, volumeData);
    const response = formatResponse(results, closePrices, labels);
    res.json({ symbol: symbol.toUpperCase(), timeframe, ...response });
  } catch (error) {
    res.status(500).json({ error: 'Gagal menghitung indikator', detail: error.message });
  }
});

// Candlestick from Yahoo Finance
router.get('/candlestick/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { days = 90 } = req.query;
    const { fetchStockData } = require('../lib/yahoo-finance');
    const data = await fetchStockData(symbol.toUpperCase(), parseInt(days));
    if (!data?.length) return res.status(404).json({ error: 'Data tidak ditemukan untuk ' + symbol });
    res.json({ symbol: symbol.toUpperCase(), source: 'yahoo', count: data.length, data: data.map(d => ({ time: d.date, open: d.open, high: d.high, low: d.low, close: d.close, volume: d.volume })) });
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil data candlestick', detail: error.message });
  }
});

module.exports = router;
