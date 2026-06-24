const express = require('express');
const router = express.Router();
const News = require('../models/News');
const { getStockbitClient } = require('../lib/stockbit');

router.get('/', async (req, res) => {
  try {
    const { limit = 20, cursor, symbol, source } = req.query;
    try {
      const client = getStockbitClient();
      const response = await client.get('/stream/v3', { params: { category: 'STREAM_CATEGORY_NEWS', last_stream_id: cursor || 0, limit: parseInt(limit) } });
      if (response.data?.data?.stream) {
        const newsItems = response.data.data.stream;
        const streamIds = [];
        for (const item of newsItems) {
          await News.findOneAndUpdate({ streamId: item.stream_id }, {
            streamId: item.stream_id, title: item.title, content: item.content, contentOriginal: item.content_original,
            titleUrl: item.title_url, createdAt: new Date(item.created_at), createdDisplay: item.created_display,
            userId: item.user?.user_id, username: item.user?.username, fullname: item.user?.fullname, userAvatar: item.user?.avatar,
            type: item.type, images: item.images || [], source: item.news_feed?.source, sourceLabel: item.news_feed?.label,
            sourceImage: item.news_feed?.img, topics: item.topics || [], totalReplies: item.total_replies || 0,
            totalLikes: item.total_likes || 0, rawData: item, fetchedAt: new Date()
          }, { upsert: true, new: true });
          streamIds.push(item.stream_id);
        }
        const sentiments = await News.find({ streamId: { $in: streamIds } }).select('streamId sentiment').lean();
        const sentimentMap = {};
        sentiments.forEach(s => { if (s.sentiment?.analyzedAt) sentimentMap[s.streamId] = { score: s.sentiment.score, label: s.sentiment.label, explanation: s.sentiment.explanation }; });
        if (Object.keys(sentimentMap).length > 0) {
          response.data.data.stream = response.data.data.stream.map(item => ({ ...item, sentiment: sentimentMap[item.stream_id] || null }));
        }
        return res.json(response.data);
      }
    } catch (apiErr) { console.warn('[NEWS] Stockbit API error, fallback to MongoDB:', apiErr.message); }
    const query = {}; if (symbol) query.topics = symbol.toUpperCase(); if (source) query.source = source;
    const news = await News.find(query).sort({ createdAt: -1 }).limit(parseInt(limit)).lean();
    const stream = news.map(n => {
      const item = n.rawData || n;
      if (n.sentiment?.analyzedAt) item.sentiment = { score: n.sentiment.score, label: n.sentiment.label, explanation: n.sentiment.explanation };
      return item;
    });
    res.json({ data: { stream, pagination: { is_last_page: news.length < parseInt(limit), next_cursor: news.length > 0 ? news[news.length - 1].streamId : null, total: news.length } } });
  } catch (error) { res.status(500).json({ error: 'Gagal mengambil news', detail: error.message }); }
});

router.get('/:streamId', async (req, res) => {
  try {
    const news = await News.findOne({ streamId: parseInt(req.params.streamId) }).lean();
    if (!news) return res.status(404).json({ error: 'News tidak ditemukan' });
    const data = news.rawData || news;
    if (news.sentiment) data.sentiment = news.sentiment;
    res.json({ data });
  } catch (error) { res.status(500).json({ error: 'Gagal mengambil detail news', detail: error.message }); }
});

module.exports = router;
