const axios = require('axios');
const Config = require('../models/Config');

const STOCKBIT_BASE = 'https://exodus.stockbit.com';
const cache = new Map();
const CACHE_DURATION = 60 * 1000;

let currentToken = null;
let tokenCacheTs = 0;
const TOKEN_CACHE_MS = 60 * 1000;

function parseJwt(token) {
  try {
    const base64 = Buffer.from(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
    return JSON.parse(base64);
  } catch (e) { return null; }
}

function getTokenExpiry(token) {
  const payload = parseJwt(token);
  return payload?.exp ? new Date(payload.exp * 1000) : null;
}

function isTokenExpired(token) {
  const payload = parseJwt(token);
  return payload?.exp ? Date.now() >= payload.exp * 1000 : true;
}

function getTokenInfo(token) {
  if (!token) return { valid: false, message: 'Token belum diatur' };
  const expired = isTokenExpired(token);
  const payload = parseJwt(token);
  return {
    valid: !expired, expired,
    expiryDate: getTokenExpiry(token),
    username: payload?.data?.use || null,
    message: expired ? `Token EXPIRED pada ${getTokenExpiry(token)?.toLocaleString()}` : `Token valid sampai ${getTokenExpiry(token)?.toLocaleString()}`
  };
}

async function loadTokenFromDB() {
  try {
    const config = await Config.findOne({ key: 'stockbit_token' });
    if (config?.value) {
      currentToken = config.value;
      tokenCacheTs = Date.now();
      console.log('[TOKEN] Loaded from database');
      return;
    }
  } catch (err) { console.warn('[TOKEN] Cannot read from DB, fallback to env'); }
  if (process.env.STOCKBIT_TOKEN) {
    currentToken = process.env.STOCKBIT_TOKEN;
    tokenCacheTs = Date.now();
  }
}

async function getCurrentToken() {
  if (currentToken && (Date.now() - tokenCacheTs < TOKEN_CACHE_MS)) return currentToken;
  try {
    const config = await Config.findOne({ key: 'stockbit_token' });
    if (config?.value) { currentToken = config.value; tokenCacheTs = Date.now(); return currentToken; }
  } catch (err) {}
  return currentToken || null;
}

function getStockbitClient() {
  const headers = {
    'User-Agent': process.env.USER_AGENT || 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
    'Accept': 'application/json', 'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Origin': 'https://stockbit.com', 'Referer': 'https://stockbit.com/',
    'Sec-Fetch-Dest': 'empty', 'Sec-Fetch-Mode': 'cors', 'Sec-Fetch-Site': 'same-site'
  };
  if (currentToken) headers['Authorization'] = `Bearer ${currentToken}`;
  return axios.create({ baseURL: STOCKBIT_BASE, headers, timeout: 10000 });
}

function checkTokenMiddleware(req, res, next) {
  if (!currentToken) return res.status(401).json({ error: 'Stockbit token not configured', hint: 'PUT /api/admin/token to update' });
  const info = getTokenInfo(currentToken);
  if (!info.valid) return res.status(401).json({ error: 'Token tidak valid atau sudah expired', tokenInfo: info, hint: 'Admin: PUT /api/admin/token untuk update token' });
  next();
}

function getCache(key) {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_DURATION) return entry.data;
  return null;
}

function setCache(key, data) {
  cache.set(key, { data, ts: Date.now() });
}

module.exports = {
  getTokenInfo, loadTokenFromDB, getCurrentToken, getStockbitClient, checkTokenMiddleware,
  getCache, setCache, CACHE_DURATION, STOCKBIT_BASE
};
