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
const User = require('./models/User');
const Config = require('./models/Config');
const News = require('./models/News');
const { seedEmiten } = require('./seeds/emitenSeed');
const { seedAdmin } = require('./seeds/adminSeed');
const { generateToken, authMiddleware, adminMiddleware, JWT_SECRET } = require('./middleware/auth');

// Yahoo Finance (used for candlestick chart only, imported inline)

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
// --- Token management (centralized in MongoDB, cached in-memory) ---
let currentToken = null;
let tokenCacheTs = 0;
const TOKEN_CACHE_MS = 60 * 1000; // 60 detik

async function loadTokenFromDB() {
  try {
    const config = await Config.findOne({ key: 'stockbit_token' });
    if (config && config.value) {
      currentToken = config.value;
      tokenCacheTs = Date.now();
      console.log(`[TOKEN] Loaded from database`);
      return;
    }
  } catch (err) {
    console.warn('[TOKEN] Cannot read from DB, fallback to env');
  }
  if (process.env.STOCKBIT_TOKEN) {
    currentToken = process.env.STOCKBIT_TOKEN;
    tokenCacheTs = Date.now();
  }
}

async function getCurrentToken() {
  if (currentToken && (Date.now() - tokenCacheTs < TOKEN_CACHE_MS)) {
    return currentToken;
  }
  try {
    const config = await Config.findOne({ key: 'stockbit_token' });
    if (config && config.value) {
      currentToken = config.value;
      tokenCacheTs = Date.now();
      return currentToken;
    }
  } catch (err) {}
  if (currentToken) return currentToken;
  return null;
}

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

// --- Middleware: cek stockbit token ---
function checkTokenMiddleware(req, res, next) {
  if (!currentToken) {
    return res.status(401).json({
      error: 'Stockbit token not configured',
      hint: 'PUT /api/admin/token to update'
    });
  }
  const info = getTokenInfo(currentToken);
  if (!info.valid) {
    return res.status(401).json({
      error: 'Token tidak valid atau sudah expired',
      tokenInfo: info,
      hint: 'Admin: PUT /api/admin/token untuk update token'
    });
  }
  next();
}

// === AUTH ROUTES ===

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const match = await user.comparePassword(password);
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = generateToken(user);
    res.json({ token, user: { id: user._id, username: user.username, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: 'Login failed', detail: err.message });
  }
});

app.post('/api/auth/register', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { username, password, role } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    const existing = await User.findOne({ username: username.toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: 'Username already exists' });
    }
    const user = await User.create({
      username: username.toLowerCase(),
      password,
      role: role || 'user'
    });
    res.status(201).json({ message: 'User created', user: { id: user._id, username: user.username, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed', detail: err.message });
  }
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

app.post('/api/auth/refresh', authMiddleware, (req, res) => {
  try {
    const { generateToken } = require('./middleware/auth');
    const newToken = generateToken(req.user);
    res.json({ 
      success: true, 
      token: newToken,
      user: {
        id: req.user._id,
        username: req.user.username,
        role: req.user.role
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Gagal refresh token', detail: err.message });
  }
});

// === STOCKBIT TOKEN MANAGEMENT (admin only) ===

app.put('/api/admin/token', authMiddleware, adminMiddleware, async (req, res) => {
  const { token } = req.body;
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Body harus ada field "token" (string)' });
  }
  try {
    await Config.findOneAndUpdate(
      { key: 'stockbit_token' },
      { key: 'stockbit_token', value: token, description: 'Stockbit API Bearer token' },
      { upsert: true, new: true }
    );
    currentToken = token;
    tokenCacheTs = Date.now();
    const info = getTokenInfo(currentToken);
    console.log(`[TOKEN UPDATE] ${info.message}`);
    res.json({ success: true, tokenInfo: info });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save token', detail: err.message });
  }
});

app.get('/api/token-status', (req, res) => {
  const info = getTokenInfo(currentToken);
  res.json(info);
});

// === WORKER STATUS ===
const WorkerJob = require('./models/WorkerJob');

app.get('/api/worker-status', async (req, res) => {
  try {
    const workers = await WorkerJob.find().sort({ updatedAt: -1 });
    res.json({ workers });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch worker status', detail: err.message });
  }
});

// === FINANCIAL REPORTS ===
const FinancialReport = require('./models/FinancialReport');

app.get('/api/financial-reports', async (req, res) => {
  try {
    const {
      year = '2026',
      reportType = 'rdf',
      periode = 'tw1',
      emitenType = 's',
      kodeEmiten,
      pageSize = 12,
      indexFrom = 1,
      sortColumn = 'KodeEmiten',
      sortOrder = 'asc'
    } = req.query;

    // Build filter for DB query
    // Map frontend periode values to DB reportPeriod values
    const periodeMap = {
      'tw1': 'TW1',
      'tw2': 'TW2',
      'tw3': 'TW3',
      'tahunan': 'Audit',
      'audit': 'Audit'
    };
    const dbReportPeriod = periodeMap[periode.toLowerCase()] || periode.toUpperCase();

    const dbFilter = {
      reportYear: year,
      reportType,
      reportPeriod: dbReportPeriod,
      emitenType
    };
    if (kodeEmiten) {
      dbFilter.kodeEmiten = { $regex: `^${kodeEmiten}`, $options: 'i' };
    }

    // NOTE: IDX API calls are disabled because the server IP is blocked (403).
    // To populate the database, run workers/seed-financial-reports-from-idx.js
    // manually from a machine with an Indonesian IP that can access IDX.
    // This endpoint now only serves cached data from MongoDB.

    // Map sort column to DB field
    const sortFieldMap = {
      'KodeEmiten': 'kodeEmiten',
      'NamaEmiten': 'namaEmiten',
      'Report_Year': 'reportYear',
      'Report_Period': 'reportPeriod',
      'File_Modified': 'fileModified'
    };
    const dbSortField = sortFieldMap[sortColumn] || 'kodeEmiten';

    // Fetch from DB
    const dbResults = await FinancialReport.find(dbFilter)
      .sort({ [dbSortField]: sortOrder === 'asc' ? 1 : -1 })
      .limit(parseInt(pageSize))
      .skip(parseInt(indexFrom) - 1);

    const totalCount = await FinancialReport.countDocuments(dbFilter);

    res.json({
      Search: {
        ReportType: reportType,
        KodeEmiten: kodeEmiten || null,
        Year: year,
        SortColumn: sortColumn,
        SortOrder: sortOrder,
        EmitenType: emitenType,
        Periode: periode,
        indexfrom: parseInt(indexFrom),
        pagesize: parseInt(pageSize)
      },
      ResultCount: totalCount,
      Results: dbResults.map(r => ({
        KodeEmiten: r.kodeEmiten,
        NamaEmiten: r.namaEmiten,
        Report_Year: r.reportYear,
        Report_Period: r.reportPeriod,
        File_Modified: r.fileModified,
        Attachments: r.attachments.map(att => ({
          File_ID: att.fileId,
          File_Name: att.fileName,
          File_Path: att.filePath,
          File_Size: att.fileSize,
          File_Type: att.fileType,
          Report_Period: att.reportPeriod,
          Report_Type: att.reportType,
          Report_Year: att.reportYear
        }))
      }))
    });

  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch financial reports', detail: err.message });
  }
});

// Proxy download dari IDX
app.get('/api/financial-reports/download', async (req, res) => {
  try {
    const { path: filePath } = req.query;
    if (!filePath) {
      return res.status(400).json({ error: 'File path required' });
    }

    const idxUrl = `https://www.idx.co.id${filePath}`;
    
    const response = await axios.get(idxUrl, {
      responseType: 'stream',
      headers: {
        'User-Agent': process.env.USER_AGENT || 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
      },
      timeout: 30000
    });

    // Set headers untuk download
    const filename = filePath.split('/').pop();
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', response.headers['content-type'] || 'application/octet-stream');
    
    response.data.pipe(res);
  } catch (err) {
    res.status(500).json({ error: 'Failed to download file', detail: err.message });
  }
});

// === ADMIN: USER MANAGEMENT ===

app.get('/api/admin/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users', detail: err.message });
  }
});

app.put('/api/admin/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { role, isActive } = req.body;
    const update = {};
    if (role) update.role = role;
    if (typeof isActive === 'boolean') update.isActive = isActive;

    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true }).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user', detail: err.message });
  }
});

app.delete('/api/admin/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.role === 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        return res.status(400).json({ error: 'Cannot delete the last admin' });
      }
    }
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user', detail: err.message });
  }
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

// --- Stockbit emiten info (real-time volume + company data) ---
app.get('/api/emiten/:symbol/info', async (req, res) => {
  try {
    const { symbol } = req.params;
    const client = getStockbitClient();
    const response = await client.get(`/emitten/${symbol}/info`);
    const data = response.data?.data;

    if (!data) {
      return res.status(404).json({ error: 'Data tidak ditemukan untuk ' + symbol });
    }

    res.json({
      symbol: data.symbol,
      name: data.name,
      sector: data.sector,
      subSector: data.sub_sector,
      price: data.price ? parseFloat(data.price) : null,
      previous: data.previous ? parseFloat(data.previous) : null,
      change: data.change || null,
      percentage: data.percentage || null,
      volume: data.volume ? parseInt(data.volume) : null,
      averageVolume: data.average ? parseInt(data.average) : null,
      high: null,
      low: null,
      open: null,
      orderbook: data.orderbook ? {
        bid: { price: data.orderbook.bid.price ? parseFloat(data.orderbook.bid.price) : null, volume: data.orderbook.bid.volume ? parseFloat(data.orderbook.bid.volume) : null },
        offer: { price: data.orderbook.offer.price ? parseFloat(data.orderbook.offer.price) : null, volume: data.orderbook.offer.volume ? parseFloat(data.orderbook.offer.volume) : null }
      } : null,
      iconUrl: data.icon_url || null,
      updatedAt: data.updated || null
    });
  } catch (error) {
    if (error.response?.status === 404) {
      return res.status(404).json({ error: 'Data tidak ditemukan untuk ' + symbol });
    }
    console.error('[INFO] Error fetching emiten info:', error.message);
    res.status(500).json({ error: 'Gagal mengambil data emiten', detail: error.message });
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

    // Also save to ChartPrice collection (for technical indicators)
    if (chartData?.data?.prices && chartData.data.prices.length > 0) {
      await ChartPrice.findOneAndUpdate(
        { symbol: symbol.toUpperCase(), timeframe },
        {
          symbol: symbol.toUpperCase(),
          timeframe,
          prices: chartData.data.prices,
          previous: chartData.data.previous || 0,
          metadata: {
            lastPrice: latestPrice ? parseFloat(latestPrice.value) || 0 : 0,
            change: latestPrice?.change || 0,
            changePercent: latestPrice?.percentage || '0'
          },
          updatedAt: new Date()
        },
        { upsert: true }
      );
    }

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

// --- Technical Analysis: List available indicators ---
const { getIndicatorList, getIndicatorsByCategory, parseIndicatorString } = require('./lib/indicator-registry');
const { calculateMultiple, extractClosePrices, extractVolumeData, formatResponse } = require('./lib/technical-analysis');

app.get('/api/indicators', (req, res) => {
  try {
    const { groupBy } = req.query;

    if (groupBy === 'category') {
      return res.json(getIndicatorsByCategory());
    }

    res.json(getIndicatorList());
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil daftar indikator', detail: error.message });
  }
});

// --- Technical Analysis: Calculate indicators for a symbol ---
app.get('/api/emiten/:symbol/indicators', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { timeframe = '1y', indicators: indicatorsParam } = req.query;

    if (!indicatorsParam) {
      return res.status(400).json({
        error: 'Parameter indicators diperlukan',
        example: '/api/emiten/BBCA/indicators?indicators=SMA:period=20,RSI:period=14,MACD'
      });
    }

    // Parse requested indicators
    const requested = parseIndicatorString(indicatorsParam);
    if (requested.length === 0) {
      return res.status(400).json({ error: 'Tidak ada indikator yang diminta' });
    }

    // Get price data from MongoDB
    const chartData = await ChartPrice.findOne({
      symbol: symbol.toUpperCase(),
      timeframe
    }).lean();

    if (!chartData || !chartData.prices || chartData.prices.length === 0) {
      return res.status(404).json({
        error: 'Data harga tidak ditemukan',
        detail: `Tidak ada data untuk ${symbol} dengan timeframe ${timeframe}`
      });
    }

    // Extract close prices and aligned labels (same indices)
    const { closePrices, validIndices } = extractClosePrices(chartData.prices);
    const labels = validIndices.map(i => chartData.prices[i].formatted_date || chartData.prices[i].date);

    if (closePrices.length < 2) {
      return res.status(400).json({ error: 'Data harga tidak cukup untuk analisis' });
    }

    // Extract volume data for volume-based indicators
    const { volumeData } = extractVolumeData(chartData.prices);

    // Calculate indicators (pass volume data for volume-based indicators)
    const results = calculateMultiple(closePrices, requested, volumeData);

    // Format response
    const response = formatResponse(results, closePrices, labels);

    res.json({
      symbol: symbol.toUpperCase(),
      timeframe,
      ...response
    });
  } catch (error) {
    console.error('Error calculating indicators:', error.message);
    res.status(500).json({ error: 'Gagal menghitung indikator', detail: error.message });
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

    const chartData = response.data;

    cache.set(cacheKey, {
      data: chartData,
      timestamp: Date.now()
    });

    if (chartData?.data?.prices && chartData.data.prices.length > 0) {
      const latestPrice = chartData.data.prices[chartData.data.prices.length - 1];
      
      const pricesData = chartData.data.prices.map(p => ({
        date: p.date,
        formatted_date: p.formatted_date,
        value: p.value,
        change: p.change,
        percentage: p.percentage,
        volume: p.volume ? parseFloat(p.volume) : undefined
      }));

      ChartPrice.findOneAndUpdate(
        { symbol: symbol.toUpperCase(), timeframe },
        {
          symbol: symbol.toUpperCase(),
          timeframe,
          prices: pricesData,
          previous: chartData.data.previous || 0,
          metadata: {
            lastPrice: latestPrice ? parseFloat(latestPrice.value) || 0 : 0,
            change: latestPrice?.change || 0,
            changePercent: latestPrice?.percentage || '0'
          },
          updatedAt: new Date()
        },
        { upsert: true }
      ).catch(err => console.error('Error saving to ChartPrice:', err.message));
    }

    res.json(chartData);
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

// --- Proxy endpoint: Market Movers (always live from Stockbit) ---
app.get('/api/market-movers', async (req, res) => {
  const { type = 'MOVER_TYPE_TOP_GAINER' } = req.query;

  try {
    if (!currentToken) {
      return res.status(503).json({ error: 'No token configured' });
    }

    const url = `${STOCKBIT_BASE}/order-trade/market-mover?mover_type=${encodeURIComponent(type)}&filter_stocks=FILTER_STOCKS_TYPE_MAIN_BOARD&filter_stocks=FILTER_STOCKS_TYPE_DEVELOPMENT_BOARD&filter_stocks=FILTER_STOCKS_TYPE_ACCELERATION_BOARD&filter_stocks=FILTER_STOCKS_TYPE_NEW_ECONOMY_BOARD`;

    console.log('[MarketMovers] fetching:', url.replace(currentToken, 'TOKEN'));

    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${currentToken}`,
        'User-Agent': process.env.USER_AGENT || 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
        'Accept': 'application/json'
      },
      timeout: 10000
    });

    res.json(response.data);
  } catch (error) {
    console.error('Error fetch market movers:', error.message);
    if (error.response?.status === 401) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    res.status(500).json({ error: 'Gagal mengambil data market movers', detail: error.message });
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

// --- Broker History (Historical Flow Data) ---
app.get('/api/broker/history', async (req, res) => {
  try {
    const { days = 30, group } = req.query;
    const BrokerSnapshot = require('./models/BrokerSnapshot');

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days) || 30);
    startDate.setHours(0, 0, 0, 0);

    const query = { date: { $gte: startDate } };
    if (group && ['foreign', 'local', 'government'].includes(group)) {
      query.group = group;
    }

    const snapshots = await BrokerSnapshot.find(query)
      .sort({ date: -1, group: 1 })
      .lean();

    res.json({
      period: `${days} days`,
      data: snapshots
    });
  } catch (error) {
    console.error('Error fetching broker history:', error.message);
    res.status(500).json({ error: 'Gagal mengambil data broker history', detail: error.message });
  }
});



// --- Clear cache endpoint ---
app.post('/api/clear-cache', (req, res) => {
  cache.clear();
  res.json({ success: true, message: 'Cache cleared' });
});

// --- Candlestick Endpoint (Yahoo Finance OHLC) ---
app.get('/api/candlestick/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { days = 90 } = req.query;
    const { fetchStockData } = require('./lib/yahoo-finance');
    const data = await fetchStockData(symbol.toUpperCase(), parseInt(days));
    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Data tidak ditemukan untuk ' + symbol });
    }
    const ohlc = data.map(d => ({ time: d.date, open: d.open, high: d.high, low: d.low, close: d.close, volume: d.volume }));
    res.json({ symbol: symbol.toUpperCase(), source: 'yahoo', count: ohlc.length, data: ohlc });
  } catch (error) {
    console.error('Error fetching candlestick data:', error.message);
    res.status(500).json({ error: 'Gagal mengambil data candlestick', detail: error.message });
  }
});

// --- Stock Screener Endpoint ---
app.get('/api/screener', async (req, res) => {
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
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [data, total] = await Promise.all([
      Emiten.find(filter).sort({ [sortField]: sortDir }).skip(skip).limit(parseInt(limit)).lean(),
      Emiten.countDocuments(filter)
    ]);
    const sectors = await Emiten.distinct('sector', { isActive: true });
    res.json({
      data: data.map(e => ({ symbol: e.symbol, name: e.name, sector: e.sector, industry: e.industry, lastPrice: e.lastPrice, change: e.change, changePercent: e.changePercent, volume: e.volume, marketCap: e.marketCap })),
      pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) },
      filters: { sectors: sectors.filter(Boolean).sort() }
    });
  } catch (error) { console.error('Error in screener:', error.message); res.status(500).json({ error: 'Gagal menjalankan screener', detail: error.message }); }
});

// --- Research Endpoint (Stockbit Snips) ---
app.get('/api/research', async (req, res) => {
  try {
    const { keyword = '' } = req.query;
    try {
      const client = getStockbitClient();
      const params = {}; if (keyword) params.keyword = keyword;
      const response = await client.get('/research', { params });
      if (response.data?.data) {
        const Research = require('./models/Research');
        for (const item of response.data.data) {
          if (!item.id) continue;
          await Research.findOneAndUpdate({ researchId: item.id }, { researchId: item.id, title: item.title, categoryLabel: item.category_label || 'Snips', url: item.url || '', iconUrl: item.icon_url || '', imageUrl: item.image_url || '', description: item.description || '', compressedImageUrl: item.compressed_image_url || '', created: item.created ? new Date(item.created) : new Date(), fetchedAt: new Date() }, { upsert: true, new: true });
        }
        return res.json(response.data);
      }
    } catch (apiErr) { console.warn('[RESEARCH] Stockbit API error, fallback to MongoDB:', apiErr.message); }
    const Research = require('./models/Research');
    const query = {}; if (keyword) query.title = { $regex: keyword, $options: 'i' };
    const items = await Research.find(query).sort({ created: -1 }).limit(50).lean();
    res.json({
      message: items.length > 0 ? 'Successfully retrieved research (from cache)' : 'No research data available',
      data: items.map(r => ({ id: r.researchId, title: r.title, category_label: r.categoryLabel, url: r.url, icon_url: r.iconUrl, image_url: r.imageUrl, compressed_image_url: r.compressedImageUrl, description: r.description, created: r.created }))
    });
  } catch (error) { console.error('Error fetching research:', error.message); res.status(500).json({ error: 'Gagal mengambil research', detail: error.message }); }
});

// --- News Endpoints ---
app.get('/api/news', async (req, res) => {
  try {
    const { limit = 20, cursor, symbol, source } = req.query;
    try {
      const client = getStockbitClient();
      const params = { category: 'STREAM_CATEGORY_NEWS', last_stream_id: cursor || 0, limit: parseInt(limit) };
      const response = await client.get('/stream/v3', { params });
      if (response.data?.data?.stream) {
        const newsItems = response.data.data.stream;
        const streamIds = [];
        for (const item of newsItems) {
          await News.findOneAndUpdate({ streamId: item.stream_id }, { streamId: item.stream_id, title: item.title, content: item.content, contentOriginal: item.content_original, titleUrl: item.title_url, createdAt: new Date(item.created_at), createdDisplay: item.created_display, userId: item.user?.user_id, username: item.user?.username, fullname: item.user?.fullname, userAvatar: item.user?.avatar, type: item.type, images: item.images || [], source: item.news_feed?.source, sourceLabel: item.news_feed?.label, sourceImage: item.news_feed?.img, topics: item.topics || [], totalReplies: item.total_replies || 0, totalLikes: item.total_likes || 0, rawData: item, fetchedAt: new Date() }, { upsert: true, new: true });
          streamIds.push(item.stream_id);
        }
        // Merge sentiment data ke response
        const sentiments = await News.find({ streamId: { $in: streamIds } }).select('streamId sentiment').lean();
        const sentimentMap = {};
        sentiments.forEach(s => { if (s.sentiment?.analyzedAt) sentimentMap[s.streamId] = { score: s.sentiment.score, label: s.sentiment.label, explanation: s.sentiment.explanation }; });
        if (Object.keys(sentimentMap).length > 0) {
          response.data.data.stream = response.data.data.stream.map(item => ({
            ...item,
            sentiment: sentimentMap[item.stream_id] || null
          }));
        }
        return res.json(response.data);
      }
    } catch (apiErr) { console.warn('[NEWS] Stockbit API error, fallback to MongoDB:', apiErr.message); }
    const query = {}; if (symbol) query.topics = symbol.toUpperCase(); if (source) query.source = source;
    const news = await News.find(query).sort({ createdAt: -1 }).limit(parseInt(limit)).lean();
    const stream = news.map(n => {
      const item = n.rawData || n;
      if (n.sentiment && n.sentiment.analyzedAt) {
        item.sentiment = { score: n.sentiment.score, label: n.sentiment.label, explanation: n.sentiment.explanation };
      }
      return item;
    });
    res.json({ data: { stream, pagination: { is_last_page: news.length < parseInt(limit), next_cursor: news.length > 0 ? news[news.length - 1].streamId : null, total: news.length } } });
  } catch (error) { console.error('Error fetching news:', error.message); res.status(500).json({ error: 'Gagal mengambil news', detail: error.message }); }
});

app.get('/api/news/:streamId', async (req, res) => {
  try {
    const { streamId } = req.params;
    const news = await News.findOne({ streamId: parseInt(streamId) }).lean();
    if (!news) return res.status(404).json({ error: 'News tidak ditemukan' });
    const data = news.rawData || news;
    if (news.sentiment) data.sentiment = news.sentiment;
    res.json({ data });
  } catch (error) { console.error('Error fetching news detail:', error.message); res.status(500).json({ error: 'Gagal mengambil detail news', detail: error.message }); }
});

// --- AI / Sentiment Endpoints ---
const { analyzeSentimentBatch, chatWithContext } = require('./lib/gemini');

// Trigger sentiment analysis untuk berita yang belum dianalisis
app.post('/api/ai/analyze-sentiment', async (req, res) => {
  try {
    const { streamId } = req.body;

    let newsItems;
    if (streamId) {
      const item = await News.findOne({ streamId: parseInt(streamId) }).lean();
      if (!item) return res.status(404).json({ error: 'Berita tidak ditemukan' });
      newsItems = [item];
    } else {
      newsItems = await News.find({ 'sentiment.analyzedAt': null, title: { $ne: null } })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();
    }

    if (!newsItems || newsItems.length === 0) {
      return res.json({ message: 'Semua berita sudah dianalisis', analyzed: 0 });
    }

    const input = newsItems.map(n => ({
      streamId: n.streamId,
      title: n.title,
      content: n.content || n.contentOriginal || '',
      topics: n.topics || []
    }));

    const results = await analyzeSentimentBatch(input);

    let saved = 0;
    for (const r of results) {
      if (r.streamId) {
        await News.findOneAndUpdate(
          { streamId: r.streamId },
          { 'sentiment.score': r.score, 'sentiment.label': r.label, 'sentiment.explanation': r.explanation, 'sentiment.analyzedAt': new Date() }
        );
        saved++;
      }
    }

    res.json({ message: `${saved} berita dianalisis`, analyzed: saved, results });
  } catch (error) {
    console.error('[AI] Error analyze sentiment:', error.message);
    res.status(500).json({ error: 'Gagal menganalisis sentimen', detail: error.message });
  }
});

// Ambil statistik sentimen (agregat per label)
app.get('/api/ai/sentiment-stats', async (req, res) => {
  try {
    const { symbol, days = 7 } = req.query;

    const since = new Date();
    since.setDate(since.getDate() - parseInt(days));

    const match = { 'sentiment.analyzedAt': { $ne: null }, createdAt: { $gte: since } };
    if (symbol) match.topics = symbol.toUpperCase();

    const stats = await News.aggregate([
      { $match: match },
      { $group: { _id: '$sentiment.label', count: { $sum: 1 } } }
    ]);

    const total = stats.reduce((sum, s) => sum + s.count, 0);
    const result = { positif: 0, netral: 0, negatif: 0 };
    stats.forEach(s => { if (result[s._id] !== undefined) result[s._id] = s.count; });

  const topTopics = await News.aggregate([
    { $match: match },
    { $unwind: '$topics' },
    { $match: { topics: { $regex: '^[A-Z]{2,5}$' } } },
    { $group: { _id: '$topics', count: { $sum: 1 }, avgScore: { $avg: '$sentiment.score' } } },
    { $sort: { count: -1 } },
    { $limit: 20 }
  ]);

  res.json({
    period: `${days} hari`,
    total,
    ...result,
    topTopics
  });
} catch (error) {
  console.error('[AI] Error sentiment stats:', error.message);
  res.status(500).json({ error: 'Gagal mengambil statistik sentimen', detail: error.message });
}
});

app.post('/api/ai/ask', async (req, res) => {
  try {
    let { question, symbol } = req.body;

    if (!question) {
      return res.status(400).json({ error: 'Pertanyaan tidak boleh kosong' });
    }

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

    // Provider & API key validation handled by gemini.js getProvider()

    const context = {};

    if (symbol) {
      context.symbol = symbol.toUpperCase();

      let closePrices = [];
      let volumes = [];
      let priceMeta = null;

      try {
        const client = getStockbitClient();
        const stockbitRes = await client.get(`/charts/${symbol.toUpperCase()}/daily`, {
          params: { timeframe: '1d', is_include_previous_historical: 'true', _t: Date.now() }
        });
        const rawPrices = stockbitRes.data?.data?.prices;
        if (rawPrices && rawPrices.length > 0) {
          priceMeta = {
            lastPrice: parseFloat(rawPrices[rawPrices.length - 1]?.value) || 0,
            change: rawPrices[rawPrices.length - 1]?.change || 0,
            changePercent: rawPrices[rawPrices.length - 1]?.percentage || '0'
          };
          closePrices = rawPrices
            .map(p => (typeof p.value === 'string' ? parseFloat(p.value.replace(/,/g, '')) : Number(p.value)))
            .filter(v => !isNaN(v) && v > 0);
          volumes = rawPrices.map(p => Number(p.volume) || 0);
          console.log('[AI] Live chart OK:', stockbitRes.status, '|', closePrices.length, 'points');
        }
      } catch (apiErr) {
        console.log('[AI] Stockbit API gagal, fallback ke MongoDB:', apiErr.response?.status || apiErr.message);
        const dbData = await ChartPrice.findOne({ symbol: symbol.toUpperCase(), timeframe: '1d' }).lean();
        if (dbData?.prices && dbData.prices.length > 0) {
          priceMeta = dbData.metadata || null;
          closePrices = dbData.prices
            .map(p => (typeof p.value === 'string' ? parseFloat(p.value.replace(/,/g, '')) : Number(p.value)))
            .filter(v => !isNaN(v) && v > 0);
          volumes = dbData.prices.map(p => Number(p.volume) || 0);
          console.log('[AI] MongoDB fallback OK:', closePrices.length, 'points');
        }
      }

      if (closePrices.length >= 20) {
        try {
          const { calculate } = require('./lib/technical-analysis');
          const sma20 = calculate(closePrices, 'SMA', { period: 20 });
          const sma50 = closePrices.length >= 50 ? calculate(closePrices, 'SMA', { period: 50 }) : null;
          const sma200 = closePrices.length >= 200 ? calculate(closePrices, 'SMA', { period: 200 }) : null;
          const ema20 = calculate(closePrices, 'EMA', { period: 20 });
          const rsi = calculate(closePrices, 'RSI', { period: 14 });
          const macd = calculate(closePrices, 'MACD');

          const last = (arr) => arr && arr.length > 0 ? Number(arr[arr.length - 1]) : 0;

          context.technicalIndicators = {
            lastPrice: Number(closePrices[closePrices.length - 1]).toFixed(0),
            sma20: last(sma20.data.sma).toFixed(0),
            sma50: sma50 ? last(sma50.data.sma).toFixed(0) : '-',
            sma200: sma200 ? last(sma200.data.sma).toFixed(0) : '-',
            ema20: last(ema20.data.ema).toFixed(0),
            rsi14: last(rsi.data.rsi).toFixed(1),
            macd: last(macd.data.MACD).toFixed(2),
            macdSignal: last(macd.data.signal).toFixed(2),
            macdHistogram: last(macd.data.histogram).toFixed(2),
            volume: volumes.length > 0 ? volumes[volumes.length - 1].toLocaleString() : '-',
            avgVolume10: volumes.length >= 10
              ? Math.round(volumes.slice(-10).reduce((a, b) => a + b, 0) / 10).toLocaleString()
              : '-',
          };
          console.log('[AI] Indikator OK:', context.technicalIndicators.lastPrice, '| RSI:', context.technicalIndicators.rsi14, '| Vol:', context.technicalIndicators.volume);
        } catch (e) {
          console.error('[AI] Gagal kalkulasi indikator:', symbol, e.message);
        }
      }

      context.priceData = priceMeta;

      const emitenData = await Emiten.findOne({ symbol: symbol.toUpperCase() }).lean();
      if (emitenData) {
        context.extraContext = `Nama: ${emitenData.name}\nSektor: ${emitenData.sector || '-'}\nIndustri: ${emitenData.industry || '-'}`;
        if (!context.priceData && emitenData.lastPrice) {
          context.priceData = { lastPrice: emitenData.lastPrice, change: emitenData.change, changePercent: emitenData.changePercent };
        }
      }
    }

    const newsQuery = symbol
      ? { topics: symbol.toUpperCase() }
      : {};
    const recentNews = await News.find(newsQuery)
      .sort({ createdAt: -1 })
      .limit(10)
      .select('title content sentiment createdAt createdDisplay')
      .lean();
    context.newsItems = recentNews;

    if (symbol) {
      const FinancialReport = require('./models/FinancialReport');
      const reports = await FinancialReport.find({ kodeEmiten: symbol.toUpperCase() })
        .sort({ fileModified: -1 })
        .limit(5)
        .lean();
      context.financialReports = reports;
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    });

    let fullResponse = '';

    const enrichedQuestion = context.technicalIndicators
      ? `[DATA TEKNIKAL ${context.symbol}]\nHarga: ${context.technicalIndicators.lastPrice} | SMA20: ${context.technicalIndicators.sma20} | SMA50: ${context.technicalIndicators.sma50} | EMA20: ${context.technicalIndicators.ema20} | RSI14: ${context.technicalIndicators.rsi14} | MACD: ${context.technicalIndicators.macd} (signal: ${context.technicalIndicators.macdSignal}) | Volume: ${context.technicalIndicators.volume} (avg10: ${context.technicalIndicators.avgVolume10})\n\nPertanyaan user: ${question}`
      : question;

    await chatWithContext(enrichedQuestion, context, (chunk) => {
      fullResponse += chunk;
      const escaped = chunk.replace(/\n/g, '\\n');
      res.write(`data: ${escaped}\n\n`);
    });

    res.write(`data: [DONE]\n\n`);
    res.end();
  } catch (error) {
    console.error('[AI] Error chat:', error.message);
    try {
      res.write(`data: [ERROR] ${error.message}\n\n`);
      res.end();
    } catch (_) {
      res.status(500).json({ error: 'Gagal memproses pertanyaan', detail: error.message });
    }
  }
});

// --- IPO Endpoint ---
const EIPO_BASE = 'https://api.trading.stockbit.com';

app.get('/api/ipo/list', async (req, res) => {
  try {
    const { filter = 'ongoing' } = req.query;
    const ipoHeaders = {
      'Accept': 'application/json',
      'Origin': 'https://stockbit.com',
      'Referer': 'https://stockbit.com/'
    };
    if (currentToken) {
      ipoHeaders['Authorization'] = `Bearer ${currentToken}`;
    }
    const response = await axios.get(`${EIPO_BASE}/eipo/social/company/list`, {
      params: { filter },
      headers: ipoHeaders,
      timeout: 10000
    });
    res.json(response.data);
  } catch (error) {
    console.error('[IPO] Error fetching list:', error.message);
    if (error.response?.status === 404) {
      return res.json({ data: [] });
    }
    res.status(500).json({ error: 'Gagal mengambil data IPO', detail: error.message });
  }
});


async function startup() {
  await seedAdmin();
  await loadTokenFromDB();

  app.listen(PORT, () => {
    console.log(`Stockbit Proxy running on http://localhost:${PORT}`);
    console.log(`[AUTH] ${getTokenInfo(currentToken).message}`);
  });
}

startup();
