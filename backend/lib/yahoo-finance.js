const YahooFinance2 = require('yahoo-finance2').default;

const yahooFinance = new YahooFinance2();

const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;
const REQUEST_DELAY = 300;

let lastRequestTime = 0;

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function throttledFetch() {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < REQUEST_DELAY) {
    await delay(REQUEST_DELAY - timeSinceLastRequest);
  }
  lastRequestTime = Date.now();
}

async function fetchStockData(symbol, days = 365) {
  const cacheKey = `${symbol}_${days}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    await throttledFetch();

    const yahooSymbol = `${symbol.toUpperCase()}.JK`;
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    const result = await yahooFinance.chart(yahooSymbol, {
      period1: startDate,
      period2: endDate,
      interval: '1d'
    });

    if (!result || !result.quotes || result.quotes.length === 0) {
      return [];
    }

    const data = result.quotes
      .filter(q => q.date && q.close !== null && q.close !== undefined)
      .map(q => ({
        date: q.date.toISOString().split('T')[0],
        open: q.open || null,
        high: q.high || null,
        low: q.low || null,
        close: q.close,
        volume: q.volume || null
      }));

    cache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });

    return data;
  } catch (error) {
    if (error.message && error.message.includes('429')) {
      console.warn(`[YAHOO] Rate limited for ${symbol}, waiting 5s...`);
      await delay(5000);
      return fetchStockData(symbol, days);
    }
    console.error(`[YAHOO] Error fetching ${symbol}:`, error.message);
    return [];
  }
}

async function fetchVolumeForSymbol(symbol, days = 365) {
  const data = await fetchStockData(symbol, days);
  
  const volumeMap = {};
  data.forEach(d => {
    if (d.volume && d.volume > 0) {
      volumeMap[d.date] = {
        volume: d.volume,
        open: d.open,
        high: d.high,
        low: d.low
      };
    }
  });

  return volumeMap;
}

function clearCache() {
  cache.clear();
}

module.exports = {
  fetchStockData,
  fetchVolumeForSymbol,
  clearCache
};
