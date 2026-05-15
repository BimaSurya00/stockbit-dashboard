require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;
const STOCKBIT_BASE = 'https://exodus.stockbit.com';

// MongoDB
const connectDB = require('./db');
const Emiten = require('./models/Emiten');
const ChartPrice = require('./models/ChartPrice');
const Snapshot = require('./models/Snapshot');
const { seedEmiten } = require('./seeds/emitenSeed');

// Connect to MongoDB
connectDB();

// In-memory cache (ganti Redis untuk production)
const cache = new Map();
const CACHE_DURATION = 60 * 1000; // 60 detik

app.use(cors());
app.use(express.json());

// --- Middleware: prevent browser caching ---
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// --- Helper: Parse JWT untuk ambil exp timestamp ---
function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = Buffer.from(base64, 'base64').toString('utf8');
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

function getTokenExpiry(token) {
  const payload = parseJwt(token);
  if (payload && payload.exp) {
    return new Date(payload.exp * 1000);
  }
  return null;
}

function isTokenExpired(token) {
  const payload = parseJwt(token);
  if (payload && payload.exp) {
    return Date.now() >= payload.exp * 1000;
  }
  return true;
}

function getTokenInfo(token) {
  if (!token) return { valid: false, message: 'Token belum diatur' };
  const expired = isTokenExpired(token);
  const expiryDate = getTokenExpiry(token);
  const payload = parseJwt(token);
  return {
    valid: !expired,
    expired,
    expiryDate,
    username: payload?.data?.use || null,
    message: expired
      ? `Token EXPIRED pada ${expiryDate?.toLocaleString()}`
      : `Token valid sampai ${expiryDate?.toLocaleString()}`
  };
}

// --- Axios client builder ---
let currentToken = process.env.STOCKBIT_TOKEN || null;

function getStockbitClient() {
  const headers = {
    'User-Agent': process.env.USER_AGENT || 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
    'Accept': 'application/json',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Origin': 'https://stockbit.com',
    'Referer': 'https://stockbit.com/',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-site'
  };

  if (currentToken) {
    headers['Authorization'] = `Bearer ${currentToken}`;
  }

  return axios.create({
    baseURL: STOCKBIT_BASE,
    headers,
    timeout: 10000
  });
}

// --- Middleware: cek token ---
function checkTokenMiddleware(req, res, next) {
  const info = getTokenInfo(currentToken);
  if (!info.valid) {
    return res.status(401).json({
      error: 'Token tidak valid atau sudah expired',
      tokenInfo: info,
      hint: 'POST /api/update-token untuk update token baru tanpa restart server'
    });
  }
  next();
}

// --- Endpoint: update token ---
app.post('/api/update-token', (req, res) => {
  const { token } = req.body;
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Body harus ada field "token" (string)' });
  }

  currentToken = token;
  const info = getTokenInfo(currentToken);
  console.log(`[TOKEN UPDATE] ${info.message}`);
  res.json({ success: true, tokenInfo: info });
});

// --- Endpoint: cek status token ---
app.get('/api/token-status', (req, res) => {
  const info = getTokenInfo(currentToken);
  res.json(info);
});

// === EMITEN MANAGEMENT ===

// Seed emiten ke database
app.post('/api/emiten/seed', async (req, res) => {
  try {
    const result = await seedEmiten();
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ error: 'Gagal seed emiten', detail: error.message });
  }
});

// Get all emiten from database
app.get('/api/emiten', async (req, res) => {
  try {
    const { sector, search, page = 1, limit = 50 } = req.query;
    const query = { isActive: true };

    if (sector) query.sector = sector;
    if (search) {
      query.$or = [
        { symbol: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const emitens = await Emiten.find(query)
      .sort({ symbol: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Emiten.countDocuments(query);

    res.json({
      data: emitens,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil daftar emiten', detail: error.message });
  }
});

// --- Proxy endpoint: daftar emiten trending ---
// NOTE: Route ini HARUS sebelum /api/emiten/:symbol karena Express match route secara berurutan
app.get('/api/emiten/trending', async (req, res) => {
  try {
    // Try MongoDB snapshot first
    const cached = await Snapshot.findOne({ type: 'trending' })
      .sort({ createdAt: -1 }).lean();

    if (cached && (Date.now() - new Date(cached.createdAt).getTime() < 5 * 60 * 1000)) {
      return res.json(cached.data);
    }

    // Fallback to Stockbit API (needs token)
    const token = process.env.STOCKBIT_TOKEN;
    if (!token) {
      return res.status(503).json({ error: 'No cached data and no token configured' });
    }

    const client = getStockbitClient();
    const response = await client.get('/emitten/trending', {
      params: { _t: Date.now() }
    });

    // Save to MongoDB
    await Snapshot.deleteMany({ type: 'trending' });
    await Snapshot.create({ type: 'trending', data: response.data });

    // Keep in-memory cache too
    cache.set('emiten_trending', { data: response.data, timestamp: Date.now() });

    res.json(response.data);
  } catch (error) {
    // Last resort — return stale MongoDB data even if expired
    try {
      const stale = await Snapshot.findOne({ type: 'trending' })
        .sort({ createdAt: -1 }).lean();
      if (stale) return res.json(stale.data);
    } catch (_) { }

    if (error.response?.status === 401) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    res.status(500).json({ error: 'Gagal mengambil data trending' });
  }
});

// Get emiten by symbol
app.get('/api/emiten/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const emiten = await Emiten.findOne({ symbol: symbol.toUpperCase() });
    if (!emiten) {
      return res.status(404).json({ error: 'Emiten tidak ditemukan' });
    }
    res.json(emiten);
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil data emiten', detail: error.message });
  }
});

// Fetch chart data for specific emiten and update DB
app.post('/api/emiten/:symbol/fetch-chart', checkTokenMiddleware, async (req, res) => {
  try {
    const { symbol } = req.params;
    const { timeframe = '1w' } = req.body;

    const client = getStockbitClient();
    const response = await client.get(`/charts/${symbol}/daily`, {
      params: {
        timeframe,
        is_include_previous_historical: 'true',
        _t: Date.now()
      }
    });

    // Update emiten in DB
    const chartData = response.data;
    const latestPrice = chartData?.data?.prices?.[chartData.data.prices.length - 1];

    await Emiten.findOneAndUpdate(
      { symbol: symbol.toUpperCase() },
      {
        chartData,
        chartUpdatedAt: new Date(),
        ...(latestPrice && {
          lastPrice: parseFloat(latestPrice.value) || 0,
          change: latestPrice.change || 0,
          changePercent: latestPrice.percentage || '0'
        })
      },
      { upsert: true }
    );

    res.json({ success: true, data: chartData });
  } catch (error) {
    console.error('Error fetch chart:', error.message);
    res.status(500).json({ error: 'Gagal mengambil data chart', detail: error.message });
  }
});

// Fetch data for all emiten (batch)
app.post('/api/emiten/batch-fetch', checkTokenMiddleware, async (req, res) => {
  try {
    const { limit = 10 } = req.body;
    const emitens = await Emiten.find({ isActive: true }).limit(parseInt(limit));

    const results = [];
    const client = getStockbitClient();

    for (const emiten of emitens) {
      try {
        const response = await client.get(`/charts/${emiten.symbol}/daily`, {
          params: {
            timeframe: '1d',
            is_include_previous_historical: 'true',
            _t: Date.now()
          }
        });

        const chartData = response.data;
        const latestPrice = chartData?.data?.prices?.[chartData.data.prices.length - 1];

        await Emiten.findByIdAndUpdate(emiten._id, {
          chartData,
          chartUpdatedAt: new Date(),
          ...(latestPrice && {
            lastPrice: parseFloat(latestPrice.value) || 0,
            change: latestPrice.change || 0,
            changePercent: latestPrice.percentage || '0'
          })
        });

        results.push({ symbol: emiten.symbol, status: 'success' });

        // Delay untuk hindari rate limit
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (err) {
        results.push({ symbol: emiten.symbol, status: 'error', error: err.message });
      }
    }

    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ error: 'Gagal batch fetch', detail: error.message });
  }
});

// --- Read chart prices from MongoDB (cached) ---
app.get('/api/prices/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { timeframe = '1w' } = req.query;

    const record = await ChartPrice.findOne({
      symbol: symbol.toUpperCase(),
      timeframe
    }).lean();

    if (record && record.prices && record.prices.length > 0) {
      return res.json({
        data: {
          prices: record.prices,
          previous: record.previous,
          timeframe: record.timeframe
        }
      });
    }

    // Fallback: jika data MongoDB belum ada, proxy ke Stockbit
    res.status(404).json({ error: 'No cached data available for this timeframe' });
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil data harga', detail: error.message });
  }
});

// --- Proxy endpoint: chart data ---
app.get('/api/chart/:symbol', checkTokenMiddleware, async (req, res) => {
  try {
    const { symbol } = req.params;
    const { timeframe = '1w' } = req.query;
    const cacheKey = `chart_${symbol}_${timeframe}`;

    if (cache.has(cacheKey)) {
      const cached = cache.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_DURATION) {
        return res.json(cached.data);
      }
    }

    const client = getStockbitClient();
    const response = await client.get(`/charts/${symbol}/daily`, {
      params: {
        timeframe,
        is_include_previous_historical: 'true',
        _t: Date.now()
      }
    });

    cache.set(cacheKey, {
      data: response.data,
      timestamp: Date.now()
    });

    res.json(response.data);
  } catch (error) {
    console.error('Error fetch chart:', error.message);
    if (error.response) {
      const status = error.response.status;
      if (status === 401) {
        return res.status(401).json({
          error: 'Unauthorized - Token Stockbit expired',
          action: 'Silakan login ulang dan POST token baru'
        });
      }
      return res.status(status).json({ error: 'Stockbit API error', detail: error.response.data });
    }
    res.status(500).json({ error: 'Gagal mengambil data chart', detail: error.message });
  }
});

// --- IHSG Index (MongoDB cached) ---
app.get('/api/ihsg', async (req, res) => {
  try {
    // Try MongoDB snapshot first
    const cached = await Snapshot.findOne({ type: 'ihsg' })
      .sort({ createdAt: -1 }).lean();

    if (cached && (Date.now() - new Date(cached.createdAt).getTime() < 5 * 60 * 1000)) {
      return res.json(cached.data);
    }

    // Fallback to Stockbit API
    const token = process.env.STOCKBIT_TOKEN;
    if (!token) {
      const stale = await Snapshot.findOne({ type: 'ihsg' }).sort({ createdAt: -1 }).lean();
      if (stale) return res.json(stale.data);
      return res.status(503).json({ error: 'No cached IHSG data and no token configured' });
    }

    const client = getStockbitClient();
    const response = await client.get('/company-price-feed/v2/orderbook/companies/IHSG', {
      params: { _t: Date.now() }
    });

    // Save to MongoDB
    await Snapshot.deleteMany({ type: 'ihsg' });
    await Snapshot.create({ type: 'ihsg', data: response.data });

    cache.set('ihsg_index', { data: response.data, timestamp: Date.now() });
    res.json(response.data);
  } catch (error) {
    // Return stale data on error
    try {
      const stale = await Snapshot.findOne({ type: 'ihsg' }).sort({ createdAt: -1 }).lean();
      if (stale) return res.json(stale.data);
    } catch (_) { }

    console.error('Error fetch IHSG:', error.message);
    if (error.response?.status === 401) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    res.status(500).json({ error: 'Gagal mengambil data IHSG', detail: error.message });
  }
});

// --- Proxy endpoint: Market Movers ---
app.get('/api/market-movers', async (req, res) => {
  const { type = 'MOVER_TYPE_TOP_GAINER' } = req.query;
  const snapType = type === 'MOVER_TYPE_TOP_GAINER' ? 'top_gainer'
    : type === 'MOVER_TYPE_TOP_LOSER' ? 'top_loser' : 'top_value';

  try {
    // Try MongoDB snapshot first
    const cached = await Snapshot.findOne({ type: snapType })
      .sort({ createdAt: -1 }).lean();

    if (cached && (Date.now() - new Date(cached.createdAt).getTime() < 5 * 60 * 1000)) {
      return res.json(cached.data);
    }

    // Fallback to Stockbit API
    const token = process.env.STOCKBIT_TOKEN;
    if (!token) {
      const stale = await Snapshot.findOne({ type: snapType }).sort({ createdAt: -1 }).lean();
      if (stale) return res.json(stale.data);
      return res.status(503).json({ error: 'No cached data and no token configured' });
    }

    const client = getStockbitClient();
    const response = await client.get('/order-trade/market-mover', {
      params: {
        mover_type: type,
        filter_stocks: [
          'FILTER_STOCKS_TYPE_MAIN_BOARD',
          'FILTER_STOCKS_TYPE_DEVELOPMENT_BOARD',
          'FILTER_STOCKS_TYPE_ACCELERATION_BOARD',
          'FILTER_STOCKS_TYPE_NEW_ECONOMY_BOARD'
        ],
        _t: Date.now()
      },
      paramsSerializer: (p) => { const qs = require('qs'); return qs.stringify(p, { arrayFormat: 'repeat' }); }
    });

    // Save to MongoDB
    await Snapshot.deleteMany({ type: snapType });
    await Snapshot.create({ type: snapType, data: response.data });

    cache.set(`market_movers_${type}`, { data: response.data, timestamp: Date.now() });
    res.json(response.data);
  } catch (error) {
    // Return stale data on error
    try {
      const stale = await Snapshot.findOne({ type: snapType })
        .sort({ createdAt: -1 }).lean();
      if (stale) return res.json(stale.data);
    } catch (_) { }

    console.error('Error fetch market movers:', error.message);
    if (error.response?.status === 401) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    res.status(500).json({ error: 'Gagal mengambil data market movers', detail: error.message });
  }
});

// --- Proxy endpoint: user profile ---
app.get('/api/profile/:username', checkTokenMiddleware, async (req, res) => {
  try {
    const { username } = req.params;
    const client = getStockbitClient();
    const response = await client.get(`/user/profile/${username}`);
    res.json(response.data);
  } catch (error) {
    if (error.response?.status === 401) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    res.status(500).json({ error: 'Gagal mengambil profile' });
  }
});

// --- Proxy endpoint: Top Broker ---
app.get('/api/broker/top', checkTokenMiddleware, async (req, res) => {
  try {
    const cacheKey = 'broker_top';
    const BROKER_CACHE = 5 * 60 * 1000; // 5 menit cache

    if (cache.has(cacheKey)) {
      const cached = cache.get(cacheKey);
      if (Date.now() - cached.timestamp < BROKER_CACHE) {
        console.log(`[CACHE HIT] ${cacheKey}`);
        return res.json(cached.data);
      }
    }

    const client = getStockbitClient();
    const response = await client.get('/order-trade/broker/top', {
      params: {
        sort: 'TB_SORT_BY_TOTAL_VALUE',
        order: 'ORDER_BY_DESC',
        period: 'TB_PERIOD_LAST_1_DAY',
        market_type: 'MARKET_TYPE_ALL',
        eod_only: 'true',
        _t: Date.now()
      }
    });

    cache.set(cacheKey, {
      data: response.data,
      timestamp: Date.now()
    });

    res.json(response.data);
  } catch (error) {
    console.error('Error fetch broker top:', error.message);
    if (error.response) {
      const status = error.response.status;
      if (status === 401) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      return res.status(status).json({ error: 'Stockbit API error', detail: error.response.data });
    }
    res.status(500).json({ error: 'Gagal mengambil data top broker', detail: error.message });
  }
});

// --- Proxy endpoint: Running Trade ---
app.get('/api/running-trade/:symbol', checkTokenMiddleware, async (req, res) => {
  try {
    const { symbol } = req.params;
    const cacheKey = `running_trade_${symbol}`;
    const RUNNING_TRADE_CACHE = 10 * 1000; // 10 detik cache

    if (cache.has(cacheKey)) {
      const cached = cache.get(cacheKey);
      if (Date.now() - cached.timestamp < RUNNING_TRADE_CACHE) {
        console.log(`[CACHE HIT] ${cacheKey}`);
        return res.json(cached.data);
      }
    }

    const client = getStockbitClient();
    const upperSymbol = symbol.toUpperCase();

    // Step 1: Check paywall eligibility
    try {
      await client.get('/paywall/eligibility/check', {
        params: {
          company: upperSymbol,
          features: ['PAYWALL_FEATURE_RUNNING_TRADE', 'PAYWALL_FEATURE_ORDERBOOK'],
          _t: Date.now()
        }
      });
      // Step 2: Increment counter
      await client.post('/paywall/counter/increment', {}, {
        params: { _t: Date.now() }
      });
    } catch (paywallErr) {
      console.error('Paywall check failed:', paywallErr.response?.status, paywallErr.message);
      // Continue anyway — some accounts may not need paywall
    }

    const response = await client.get('/order-trade/running-trade', {
      params: {
        sort: 'DESC',
        limit: 50,
        order_by: 'RUNNING_TRADE_ORDER_BY_TIME',
        'symbols[]': upperSymbol,
        _t: Date.now()
      }
    });

    cache.set(cacheKey, {
      data: response.data,
      timestamp: Date.now()
    });

    res.json(response.data);
  } catch (error) {
    console.error('Error fetch running trade:', error.message);
    if (error.response) {
      const status = error.response.status;
      if (status === 401) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      if (status === 402 || status === 403) {
        return res.status(status).json({
          error: 'Paywall — fitur ini memerlukan langganan Stockbit premium',
          detail: error.response.data
        });
      }
      return res.status(status).json({ error: 'Stockbit API error', detail: error.response.data });
    }
    res.status(500).json({ error: 'Gagal mengambil data running trade', detail: error.message });
  }
});

// --- Clear cache endpoint ---
app.post('/api/clear-cache', (req, res) => {
  cache.clear();
  res.json({ success: true, message: 'Cache cleared' });
});

app.listen(PORT, () => {
  console.log(`Stockbit Proxy running on http://localhost:${PORT}`);
  console.log(`[AUTH] ${getTokenInfo(currentToken).message}`);
});
