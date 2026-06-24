const express = require('express');
const router = express.Router();
const News = require('../models/News');
const ChartPrice = require('../models/ChartPrice');
const Emiten = require('../models/Emiten');
const { getStockbitClient } = require('../lib/stockbit');
const { analyzeSentimentBatch, chatWithContext } = require('../lib/gemini');

router.post('/analyze-sentiment', async (req, res) => {
  try {
    const { streamId } = req.body;
    let newsItems;
    if (streamId) {
      const item = await News.findOne({ streamId: parseInt(streamId) }).lean();
      if (!item) return res.status(404).json({ error: 'Berita tidak ditemukan' });
      newsItems = [item];
    } else {
      newsItems = await News.find({ 'sentiment.analyzedAt': null, title: { $ne: null } }).sort({ createdAt: -1 }).limit(20).lean();
    }
    if (!newsItems?.length) return res.json({ message: 'Semua berita sudah dianalisis', analyzed: 0 });
    const input = newsItems.map(n => ({ streamId: n.streamId, title: n.title, content: n.content || n.contentOriginal || '', topics: n.topics || [] }));
    const results = await analyzeSentimentBatch(input);
    let saved = 0;
    for (const r of results) {
      if (r.streamId) {
        await News.findOneAndUpdate({ streamId: r.streamId }, { 'sentiment.score': r.score, 'sentiment.label': r.label, 'sentiment.explanation': r.explanation, 'sentiment.analyzedAt': new Date() });
        saved++;
      }
    }
    res.json({ message: `${saved} berita dianalisis`, analyzed: saved, results });
  } catch (error) {
    res.status(500).json({ error: 'Gagal menganalisis sentimen', detail: error.message });
  }
});

router.get('/sentiment-stats', async (req, res) => {
  try {
    const { symbol, days = 7 } = req.query;
    const since = new Date();
    since.setDate(since.getDate() - parseInt(days));
    const match = { 'sentiment.analyzedAt': { $ne: null }, createdAt: { $gte: since } };
    if (symbol) match.topics = symbol.toUpperCase();
    const stats = await News.aggregate([{ $match: match }, { $group: { _id: '$sentiment.label', count: { $sum: 1 } } }]);
    const total = stats.reduce((s, x) => s + x.count, 0);
    const result = { positif: 0, netral: 0, negatif: 0 };
    stats.forEach(s => { if (result[s._id] !== undefined) result[s._id] = s.count; });
    const topTopics = await News.aggregate([
      { $match: match }, { $unwind: '$topics' }, { $match: { topics: { $regex: '^[A-Z]{2,5}$' } } },
      { $group: { _id: '$topics', count: { $sum: 1 }, avgScore: { $avg: '$sentiment.score' } } }, { $sort: { count: -1 } }, { $limit: 20 }
    ]);
    res.json({ period: `${days} hari`, total, ...result, topTopics });
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil statistik sentimen', detail: error.message });
  }
});

router.post('/ask', async (req, res) => {
  try {
    let { question, symbol } = req.body;
    if (!question) return res.status(400).json({ error: 'Pertanyaan tidak boleh kosong' });

    if (!symbol) {
      const matches = question.toUpperCase().match(/\b([A-Z]{4})\b/g);
      if (matches) {
        const found = await Emiten.findOne({ symbol: { $in: matches }, isActive: true }).select('symbol').lean();
        if (found) symbol = found.symbol;
      }
      if (!symbol) {
        const anyMatch = question.match(/\b([A-Za-z]{3,5})\b/g);
        if (anyMatch) {
          const found = await Emiten.findOne({ symbol: { $in: anyMatch.map(s => s.toUpperCase()) }, isActive: true }).select('symbol').lean();
          if (found) symbol = found.symbol;
        }
      }
    }

    const context = {};
    if (symbol) {
      context.symbol = symbol.toUpperCase();
      let closePrices = [], volumes = [], priceMeta = null;
      try {
        const client = getStockbitClient();
        const stockbitRes = await client.get(`/charts/${symbol.toUpperCase()}/daily`, { params: { timeframe: '1d', is_include_previous_historical: 'true', _t: Date.now() } });
        const rawPrices = stockbitRes.data?.data?.prices;
        if (rawPrices?.length > 0) {
          priceMeta = { lastPrice: parseFloat(rawPrices[rawPrices.length - 1]?.value) || 0, change: rawPrices[rawPrices.length - 1]?.change || 0, changePercent: rawPrices[rawPrices.length - 1]?.percentage || '0' };
          closePrices = rawPrices.map(p => (typeof p.value === 'string' ? parseFloat(p.value.replace(/,/g, '')) : Number(p.value))).filter(v => !isNaN(v) && v > 0);
          volumes = rawPrices.map(p => Number(p.volume) || 0);
        }
      } catch (e) {
        const dbData = await ChartPrice.findOne({ symbol: symbol.toUpperCase(), timeframe: '1d' }).lean();
        if (dbData?.prices?.length > 0) {
          priceMeta = dbData.metadata || null;
          closePrices = dbData.prices.map(p => (typeof p.value === 'string' ? parseFloat(p.value.replace(/,/g, '')) : Number(p.value))).filter(v => !isNaN(v) && v > 0);
          volumes = dbData.prices.map(p => Number(p.volume) || 0);
        }
      }
      if (volumes.length === 0 || volumes.every(v => v === 0)) {
        try { const { fetchStockData } = require('../lib/yahoo-finance'); const y = await fetchStockData(symbol.toUpperCase(), 365); if (y?.length > 0) volumes = y.map(d => Number(d.volume) || 0); } catch (e) {}
      }
      if (closePrices.length >= 20) {
        try {
          const { calculate } = require('../lib/technical-analysis');
          const sma20 = calculate(closePrices, 'SMA', { period: 20 });
          const sma50 = closePrices.length >= 50 ? calculate(closePrices, 'SMA', { period: 50 }) : null;
          const sma200 = closePrices.length >= 200 ? calculate(closePrices, 'SMA', { period: 200 }) : null;
          const ema20 = calculate(closePrices, 'EMA', { period: 20 });
          const rsi = calculate(closePrices, 'RSI', { period: 14 });
          const macd = calculate(closePrices, 'MACD');
          const lastAr = arr => arr?.length > 0 ? Number(arr[arr.length - 1]) : 0;
          context.technicalIndicators = {
            lastPrice: Number(closePrices[closePrices.length - 1]).toFixed(0),
            sma20: lastAr(sma20.data.sma).toFixed(0), sma50: sma50 ? lastAr(sma50.data.sma).toFixed(0) : '-',
            sma200: sma200 ? lastAr(sma200.data.sma).toFixed(0) : '-', ema20: lastAr(ema20.data.ema).toFixed(0),
            rsi14: lastAr(rsi.data.rsi).toFixed(1), macd: lastAr(macd.data.MACD).toFixed(2),
            macdSignal: lastAr(macd.data.signal).toFixed(2), macdHistogram: lastAr(macd.data.histogram).toFixed(2),
            volume: volumes.length > 0 ? volumes[volumes.length - 1].toLocaleString() : '-',
            avgVolume10: volumes.length >= 10 ? Math.round(volumes.slice(-10).reduce((a, b) => a + b, 0) / 10).toLocaleString() : '-',
          };
        } catch (e) {}
      }
      context.priceData = priceMeta;
      const emitenData = await Emiten.findOne({ symbol: symbol.toUpperCase() }).lean();
      if (emitenData) {
        context.extraContext = `Nama: ${emitenData.name}\nSektor: ${emitenData.sector || '-'}\nIndustri: ${emitenData.industry || '-'}`;
        if (!context.priceData && emitenData.lastPrice) context.priceData = { lastPrice: emitenData.lastPrice, change: emitenData.change, changePercent: emitenData.changePercent };
      }
    }

    const newsQuery = symbol ? { topics: symbol.toUpperCase() } : {};
    const recentNews = await News.find(newsQuery).sort({ createdAt: -1 }).limit(10).select('title content sentiment createdAt createdDisplay').lean();
    context.newsItems = recentNews;
    if (symbol) {
      const FinancialReport = require('../models/FinancialReport');
      context.financialReports = await FinancialReport.find({ kodeEmiten: symbol.toUpperCase() }).sort({ fileModified: -1 }).limit(5).lean();
    }

    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive', 'X-Accel-Buffering': 'no' });
    let fullResponse = '';
    const enrichedQuestion = context.technicalIndicators
      ? `[DATA TEKNIKAL ${context.symbol}]\nHarga: ${context.technicalIndicators.lastPrice} | SMA20: ${context.technicalIndicators.sma20} | SMA50: ${context.technicalIndicators.sma50} | EMA20: ${context.technicalIndicators.ema20} | RSI14: ${context.technicalIndicators.rsi14} | MACD: ${context.technicalIndicators.macd} (signal: ${context.technicalIndicators.macdSignal}) | Volume: ${context.technicalIndicators.volume} (avg10: ${context.technicalIndicators.avgVolume10})\n\nPertanyaan user: ${question}`
      : question;
    await chatWithContext(enrichedQuestion, context, chunk => { fullResponse += chunk; const e = chunk.replace(/\n/g, '\\n'); res.write(`data: ${e}\n\n`); });
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    try { res.write(`data: [ERROR] ${error.message}\n\n`); res.end(); } catch (_) { res.status(500).json({ error: 'Gagal memproses pertanyaan' }); }
  }
});

module.exports = router;
