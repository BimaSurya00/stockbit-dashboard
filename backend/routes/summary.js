const express = require('express');
const router = express.Router();
const Snapshot = require('../models/Snapshot');

router.get('/', async (req, res) => {
  try {
    const [ihsg, gainers, losers, value] = await Promise.all([
      Snapshot.findOne({ type: 'ihsg' }).sort({ createdAt: -1 }).lean(),
      Snapshot.findOne({ type: 'market-movers' }).sort({ createdAt: -1 }).lean(),
      Snapshot.findOne({ type: 'market-movers-losers' }).sort({ createdAt: -1 }).lean(),
      Snapshot.findOne({ type: 'market-movers-value' }).sort({ createdAt: -1 }).lean(),
    ]);

    const topGainer = gainers?.data?.data?.[0] || null;
    const topLoser = losers?.data?.data?.[0] || null;
    const topValue = value?.data?.data?.[0] || null;

    res.json({
      ihsg: ihsg?.data ? {
        close: ihsg.data.close,
        change: ihsg.data.change,
        changePercent: ihsg.data.percentage_change,
        high: ihsg.data.high,
        low: ihsg.data.low,
        volume: ihsg.data.market_data?.[0]?.volume?.formatted || null,
        value: ihsg.data.market_data?.[0]?.value?.formatted || null,
        freq: ihsg.data.market_data?.[0]?.frequency?.formatted || null,
        up: ihsg.data.up || 0,
        down: ihsg.data.down || 0,
        unchanged: ihsg.data.unchanged || 0,
        updated: ihsg.data.updated || ihsg.createdAt,
      } : null,
      topGainer: topGainer ? { symbol: topGainer.symbol, name: topGainer.name, price: topGainer.price, change: topGainer.change, changePercent: topGainer.percentage } : null,
      topLoser: topLoser ? { symbol: topLoser.symbol, name: topLoser.name, price: topLoser.price, change: topLoser.change, changePercent: topLoser.percentage } : null,
      topValue: topValue ? { symbol: topValue.symbol, name: topValue.name, price: topValue.price, value: topValue.value } : null,
    });
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil ringkasan pasar', detail: error.message });
  }
});

module.exports = router;
