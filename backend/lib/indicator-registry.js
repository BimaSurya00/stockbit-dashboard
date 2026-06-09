/**
 * Technical Analysis Indicator Registry
 *
 * Defines all available indicators from technicalindicators library.
 * Each indicator specifies its category, parameters, output format,
 * and whether it renders as an overlay on the main chart or in a separate panel.
 */

const INDICATORS = {
  // ==================== OVERLAY STUDIES ====================
  SMA: {
    name: 'Simple Moving Average',
    category: 'overlay',
    description: 'Rata-rata harga penutupan dalam periode tertentu',
    fn: 'SMA',
    params: [
      { key: 'period', label: 'Period', default: 20, min: 2, max: 500 }
    ],
    outputs: ['sma'],
    overlay: true,
    inputType: 'close',
  },
  EMA: {
    name: 'Exponential Moving Average',
    category: 'overlay',
    description: 'Rata-rata bergerak eksponensial, lebih responsif terhadap harga terbaru',
    fn: 'EMA',
    params: [
      { key: 'period', label: 'Period', default: 12, min: 2, max: 500 }
    ],
    outputs: ['ema'],
    overlay: true,
    inputType: 'close',
  },
  WMA: {
    name: 'Weighted Moving Average',
    category: 'overlay',
    description: 'Rata-rata bergerak dengan bobot yang lebih tinggi untuk harga terbaru',
    fn: 'WMA',
    params: [
      { key: 'period', label: 'Period', default: 20, min: 2, max: 500 }
    ],
    outputs: ['wma'],
    overlay: true,
    inputType: 'close',
  },
  TRIMA: {
    name: 'Weighted Exponential Moving Average',
    category: 'overlay',
    description: 'Rata-rata bergerak eksponensial tertimbang',
    fn: 'WEMA',
    params: [
      { key: 'period', label: 'Period', default: 20, min: 2, max: 500 }
    ],
    outputs: ['trima'],
    overlay: true,
    inputType: 'close',
  },
  BBANDS: {
    name: 'Bollinger Bands',
    category: 'overlay',
    description: 'Pita volatilitas di atas dan di bawah moving average',
    fn: 'BollingerBands',
    params: [
      { key: 'period', label: 'Period', default: 20, min: 2 },
      { key: 'stdDev', label: 'Std Dev', default: 2, min: 0.1, max: 5, step: 0.1 }
    ],
    outputs: ['upper', 'middle', 'lower'],
    overlay: true,
    inputType: 'close',
    fillBetween: true, // render as filled area between upper and lower
  },
  PSAR: {
    name: 'Parabolic SAR',
    category: 'overlay',
    description: 'Stop and Reverse, indikator tren yang mengikuti harga',
    fn: 'PSAR',
    params: [
      { key: 'step', label: 'Step', default: 0.02, min: 0.01, max: 0.1, step: 0.01 },
      { key: 'max', label: 'Max', default: 0.2, min: 0.1, max: 0.5, step: 0.05 }
    ],
    outputs: ['psar'],
    overlay: true,
    inputType: 'highlow',
    requiresHL: true,
  },
  VWAP: {
    name: 'Volume Weighted Average Price',
    category: 'overlay',
    description: 'Harga rata-rata tertimbang volume',
    fn: 'VWAP',
    params: [],
    outputs: ['vwap'],
    overlay: true,
    inputType: 'ohlc',
    requiresOHLCV: true,
  },

  // ==================== MOMENTUM / OSCILLATOR ====================
  RSI: {
    name: 'Relative Strength Index',
    category: 'oscillator',
    description: 'Mengukur kecepatan perubahan harga, overbought >70, oversold <30',
    fn: 'RSI',
    params: [
      { key: 'period', label: 'Period', default: 14, min: 2, max: 100 }
    ],
    outputs: ['rsi'],
    overlay: false,
    inputType: 'close',
    bounds: { min: 0, max: 100, levels: [30, 70] },
  },
  MACD: {
    name: 'MACD',
    category: 'oscillator',
    description: 'Moving Average Convergence Divergence, momentum dan tren',
    fn: 'MACD',
    params: [
      { key: 'fastPeriod', label: 'Fast', default: 12, min: 2 },
      { key: 'slowPeriod', label: 'Slow', default: 26, min: 2 },
      { key: 'signalPeriod', label: 'Signal', default: 9, min: 2 }
    ],
    outputs: ['macd', 'signal', 'histogram'],
    overlay: false,
    inputType: 'close',
    hasHistogram: true,
  },
  CCI: {
    name: 'Commodity Channel Index',
    category: 'oscillator',
    description: 'Mengukur harga relatif terhadap rata-rata statistik',
    fn: 'CCI',
    params: [
      { key: 'period', label: 'Period', default: 20, min: 2 }
    ],
    outputs: ['cci'],
    overlay: false,
    inputType: 'hlclose',
    bounds: { min: -200, max: 200, levels: [-100, 100] },
  },
  ROC: {
    name: 'Rate of Change',
    category: 'oscillator',
    description: 'Persentase perubahan harga',
    fn: 'ROC',
    params: [
      { key: 'period', label: 'Period', default: 12, min: 1 }
    ],
    outputs: ['roc'],
    overlay: false,
    inputType: 'close',
  },
  WILLR: {
    name: 'Williams %R',
    category: 'oscillator',
    description: 'Mengukur level overbought/oversold, -20 sampai -80',
    fn: 'WilliamsR',
    params: [
      { key: 'period', label: 'Period', default: 14, min: 2 }
    ],
    outputs: ['willr'],
    overlay: false,
    inputType: 'hlclose',
    bounds: { min: -100, max: 0, levels: [-80, -20] },
  },
  ADX: {
    name: 'Average Directional Index',
    category: 'oscillator',
    description: 'Mengukur kekuatan tren, >25 berarti tren kuat',
    fn: 'ADX',
    params: [
      { key: 'period', label: 'Period', default: 14, min: 2 }
    ],
    outputs: ['adx'],
    overlay: false,
    inputType: 'hlclose',
    bounds: { min: 0, max: 100, levels: [25, 50] },
  },
  STOCH: {
    name: 'Stochastic',
    category: 'oscillator',
    description: 'Membandingkan harga penutupan dengan range harga',
    fn: 'Stochastic',
    params: [
      { key: 'period', label: '%K Period', default: 14, min: 2 },
      { key: 'signalPeriod', label: '%D Period', default: 3, min: 2 }
    ],
    outputs: ['k', 'd'],
    overlay: false,
    inputType: 'hlclose',
    bounds: { min: 0, max: 100, levels: [20, 80] },
    note: 'Menggunakan close price sebagai high/low approximation',
  },
  ATR: {
    name: 'Average True Range',
    category: 'oscillator',
    description: 'Mengukur volatilitas pasar',
    fn: 'ATR',
    params: [
      { key: 'period', label: 'Period', default: 14, min: 2 }
    ],
    outputs: ['atr'],
    overlay: false,
    inputType: 'hlclose',
    note: 'Menggunakan close price sebagai high/low approximation',
  },

  // ==================== VOLUME-BASED ====================
  VOLUME_MA: {
    name: 'Volume Moving Average',
    category: 'overlay',
    description: 'Rata-rata volume dalam periode tertentu',
    fn: 'VOLUME_MA',
    params: [
      { key: 'period', label: 'Period', default: 20, min: 2, max: 500 }
    ],
    outputs: ['volume_ma'],
    overlay: true,
    inputType: 'volume',
    requiresVolume: true,
    note: 'Overlay pada volume histogram',
  },
  OBV: {
    name: 'On Balance Volume',
    category: 'oscillator',
    description: 'Mengkumulasi volume berdasarkan pergerakan harga',
    fn: 'OBV',
    params: [],
    outputs: ['obv'],
    overlay: false,
    inputType: 'close',
    requiresVolume: true,
    note: 'Memerlukan data volume',
  },

  // ==================== ADDITIONAL INDICATORS ====================
  KST: {
    name: 'Know Sure Thing',
    category: 'oscillator',
    description: 'Momentum oscillator berdasarkan ROC',
    fn: 'KST',
    params: [
      { key: 'ROCPer1', label: 'ROC Period 1', default: 10, min: 1 },
      { key: 'ROCPer2', label: 'ROC Period 2', default: 15, min: 1 },
      { key: 'ROCPer3', label: 'ROC Period 3', default: 20, min: 1 },
      { key: 'ROCPer4', label: 'ROC Period 4', default: 30, min: 1 },
      { key: 'SMAROCPer1', label: 'SMA ROC 1', default: 10, min: 1 },
      { key: 'SMAROCPer2', label: 'SMA ROC 2', default: 15, min: 1 },
      { key: 'SMAROCPer3', label: 'SMA ROC 3', default: 20, min: 1 },
      { key: 'SMAROCPer4', label: 'SMA ROC 4', default: 30, min: 1 }
    ],
    outputs: ['kst', 'signal'],
    overlay: false,
    inputType: 'close',
  },
  TRIX: {
    name: 'Triple Exponential Average',
    category: 'oscillator',
    description: 'Rate of change dari EMA triple',
    fn: 'TRIX',
    params: [
      { key: 'period', label: 'Period', default: 15, min: 2 }
    ],
    outputs: ['trix'],
    overlay: false,
    inputType: 'close',
  },
  MFI: {
    name: 'Money Flow Index',
    category: 'oscillator',
    description: 'RSI yang ditimbang dengan volume',
    fn: 'MFI',
    params: [
      { key: 'period', label: 'Period', default: 14, min: 2 }
    ],
    outputs: ['mfi'],
    overlay: false,
    inputType: 'hlclose',
    requiresVolume: true,
    bounds: { min: 0, max: 100, levels: [20, 80] },
    note: 'Memerlukan data volume (menggunakan dummy volume)',
  },
  STOCHRSI: {
    name: 'Stochastic RSI',
    category: 'oscillator',
    description: 'Stochastic yang diaplikasikan pada RSI',
    fn: 'StochasticRSI',
    params: [
      { key: 'rsiPeriod', label: 'RSI Period', default: 14, min: 2 },
      { key: 'stochasticPeriod', label: 'Stochastic Period', default: 14, min: 2 },
      { key: 'kPeriod', label: '%K Period', default: 3, min: 2 },
      { key: 'dPeriod', label: '%D Period', default: 3, min: 2 }
    ],
    outputs: ['k', 'd'],
    overlay: false,
    inputType: 'close',
    bounds: { min: 0, max: 100, levels: [20, 80] },
  },
  ICHIMOKU: {
    name: 'Ichimoku Cloud',
    category: 'overlay',
    description: 'Sistem indikator tren komprehensif dari Jepang',
    fn: 'IchimokuCloud',
    params: [
      { key: 'conversionPeriod', label: 'Tenkan', default: 9, min: 2 },
      { key: 'basePeriod', label: 'Kijun', default: 26, min: 2 },
      { key: 'spanPeriod', label: 'Senkou', default: 52, min: 2 },
      { key: 'displacement', label: 'Displacement', default: 26, min: 1 }
    ],
    outputs: ['conversion', 'base', 'spanA', 'spanB'],
    overlay: true,
    inputType: 'hlclose',
    note: 'Menggunakan close price sebagai high/low approximation',
  },
  KELTNER: {
    name: 'Keltner Channels',
    category: 'overlay',
    description: 'Channel volatilitas berbasis ATR',
    fn: 'KeltnerChannels',
    params: [
      { key: 'period', label: 'Period', default: 20, min: 2 },
      { key: 'atrPeriod', label: 'ATR Period', default: 10, min: 2 },
      { key: 'multiplier', label: 'Multiplier', default: 2, min: 0.1, max: 5, step: 0.1 }
    ],
    outputs: ['upper', 'middle', 'lower'],
    overlay: true,
    inputType: 'hlclose',
    fillBetween: true,
    note: 'Menggunakan close price sebagai high/low approximation',
  },
};

/**
 * Get all indicators as an array (for API response)
 */
function getIndicatorList() {
  return Object.entries(INDICATORS).map(([key, config]) => ({
    key,
    name: config.name,
    category: config.category,
    description: config.description,
    params: config.params,
    overlay: config.overlay,
    bounds: config.bounds || null,
    note: config.note || null,
  }));
}

/**
 * Get indicators grouped by category
 */
function getIndicatorsByCategory() {
  const grouped = {};
  for (const [key, config] of Object.entries(INDICATORS)) {
    if (!grouped[config.category]) {
      grouped[config.category] = [];
    }
    grouped[config.category].push({
      key,
      name: config.name,
      description: config.description,
      params: config.params,
      overlay: config.overlay,
      bounds: config.bounds || null,
      note: config.note || null,
    });
  }
  return grouped;
}

/**
 * Get a single indicator config
 */
function getIndicator(key) {
  return INDICATORS[key] || null;
}

/**
 * Parse indicator string from query param
 * Format: "SMA:period=20,RSI:period=14,MACD"
 * Returns: [{ key: 'SMA', params: { period: 20 } }, { key: 'RSI', params: { period: 14 } }, { key: 'MACD', params: {} }]
 */
function parseIndicatorString(str) {
  if (!str) return [];

  return str.split(',').map(item => {
    const [key, ...paramParts] = item.split(':');
    const params = {};

    if (paramParts.length > 0) {
      paramParts.join(':').split(';').forEach(p => {
        const [k, v] = p.split('=');
        if (k && v !== undefined) {
          params[k] = isNaN(Number(v)) ? v : Number(v);
        }
      });
    }

    return { key: key.trim().toUpperCase(), params };
  });
}

module.exports = {
  INDICATORS,
  getIndicatorList,
  getIndicatorsByCategory,
  getIndicator,
  parseIndicatorString,
};
