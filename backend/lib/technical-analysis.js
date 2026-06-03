/**
 * Technical Analysis Calculator
 *
 * Uses technicalindicators library to calculate various TA indicators.
 * Works with single close price data from Stockbit API.
 */

const ti = require('technicalindicators');
const { INDICATORS, getIndicator, parseIndicatorString } = require('./indicator-registry');

/**
 * Approximate high/low from close prices for indicators that need them.
 * Uses a simple 1% band around close price.
 */
function approximateHighLow(closePrices) {
  return {
    high: closePrices.map(c => c * 1.01),
    low: closePrices.map(c => c * 0.99),
  };
}

/**
 * Calculate a single indicator
 *
 * @param {number[]} closePrices - Array of close prices
 * @param {string} indicatorKey - Indicator key from registry (e.g., 'SMA', 'RSI')
 * @param {Object} params - Parameters to override defaults
 * @returns {Object} - { indicator, params, data, config }
 */
function calculate(closePrices, indicatorKey, params = {}) {
  const config = getIndicator(indicatorKey);
  if (!config) {
    throw new Error(`Unknown indicator: ${indicatorKey}`);
  }

  // Merge default params with user params
  const finalParams = {};
  let autoAdjusted = false;
  config.params.forEach(p => {
    let val = params[p.key] !== undefined ? params[p.key] : p.default;
    // Auto-adjust: if period >= data length, reduce to fit
    // Ensures indicator always has some visible data
    if (p.min && val >= closePrices.length) {
      val = Math.max(p.min, Math.floor(closePrices.length * 0.5));
      autoAdjusted = true;
    }
    finalParams[p.key] = val;
  });

  // Build input object for technicalindicators
  const input = {
    ...finalParams,
  };

  // Different indicators expect different input formats
  if (config.inputType === 'close') {
    // Simple close-price indicators (SMA, EMA, RSI, MACD, etc.)
    input.values = closePrices;
  } else if (config.inputType === 'highlow' || config.requiresHL) {
    // Indicators that need high/low/close (PSAR, etc.)
    const { high, low } = approximateHighLow(closePrices);
    input.high = high;
    input.low = low;
    input.close = closePrices;
  } else if (config.inputType === 'ohlc') {
    // Indicators that need full OHLC (VWAP, etc.)
    const { high, low } = approximateHighLow(closePrices);
    input.open = closePrices; // approximate open = close
    input.high = high;
    input.low = low;
    input.close = closePrices;
    input.volume = closePrices.map(() => 1000000); // dummy volume
  } else if (config.inputType === 'hlclose') {
    // Indicators that explicitly need high, low, close (CCI, WilliamsR, ADX, Stochastic, ATR, MFI)
    const { high, low } = approximateHighLow(closePrices);
    input.high = high;
    input.low = low;
    input.close = closePrices;
    // Add dummy volume if needed
    if (config.requiresVolume) {
      input.volume = closePrices.map(() => 1000000);
    }
  }

  // Call the indicator function
  const fn = ti[config.fn];
  if (!fn) {
    throw new Error(`Indicator function not found: ${config.fn}`);
  }

  let result;
  try {
    result = fn.calculate(input);
  } catch (err) {
    throw new Error(`Error calculating ${indicatorKey}: ${err.message}`);
  }

  // Format output
  const data = {};

  if (Array.isArray(result)) {
    // Some indicators return array of numbers (SMA, EMA, RSI, etc.)
    // Some return array of objects (MACD, BBANDS, Stochastic, etc.)
    if (result.length > 0 && typeof result[0] === 'object') {
      // Object output (MACD, BBANDS, Stochastic)
      config.outputs.forEach((key, i) => {
        data[key] = result.map(item => {
          const values = Object.values(item);
          return values[i] !== undefined ? values[i] : null;
        });
      });
    } else {
      // Simple array output (SMA, EMA, RSI, etc.)
      if (config.outputs.length === 1) {
        data[config.outputs[0]] = result;
      } else {
        config.outputs.forEach((key, i) => {
          data[key] = result;
        });
      }
    }
  }

  // Pad data to match input length (indicators lose initial data points)
  const padding = closePrices.length - (data[config.outputs[0]]?.length || 0);
  const paddedData = {};
  config.outputs.forEach(key => {
    const arr = data[key] || [];
    paddedData[key] = [
      ...new Array(padding).fill(null),
      ...arr,
    ];
  });

  return {
    indicator: indicatorKey,
    params: finalParams,
    autoAdjusted,
    data: paddedData,
    config: {
      name: config.name,
      category: config.category,
      overlay: config.overlay,
      bounds: config.bounds || null,
      outputs: config.outputs,
      fillBetween: config.fillBetween || false,
      hasHistogram: config.hasHistogram || false,
    },
  };
}

/**
 * Calculate multiple indicators at once
 *
 * @param {number[]} closePrices - Array of close prices
 * @param {Array} indicators - Array of { key, params } objects
 * @returns {Array} - Array of indicator results
 */
function calculateMultiple(closePrices, indicators) {
  return indicators.map(({ key, params }) => {
    try {
      return calculate(closePrices, key, params);
    } catch (err) {
      return {
        indicator: key,
        error: err.message,
        params: params || {},
        data: {},
        config: null,
      };
    }
  });
}

/**
 * Extract close prices from ChartPrice.prices array
 * Returns aligned closePrices and the validIndices used to filter,
 * so that labels can be built from the same indices.
 *
 * @param {Array} prices - Array from ChartPrice document
 * @returns {{ closePrices: number[], validIndices: number[] }}
 */
function extractClosePrices(prices) {
  const closePrices = [];
  const validIndices = [];
  prices.forEach((p, i) => {
    const v = parseFloat(p.value);
    if (!isNaN(v) && v > 0) {
      closePrices.push(v);
      validIndices.push(i);
    }
  });
  return { closePrices, validIndices };
}

/**
 * Format indicators response for API
 *
 * @param {Array} results - Array from calculateMultiple
 * @param {number[]} closePrices - Original close prices
 * @param {string[]} labels - Date labels for each data point
 * @returns {Object} - Formatted response
 */
function formatResponse(results, closePrices, labels) {
  return {
    dataPoints: closePrices.length,
    labels: labels,
    indicators: results.map(r => ({
      indicator: r.indicator,
      params: r.params,
      autoAdjusted: r.autoAdjusted || false,
      data: r.data,
      config: r.config,
      error: r.error || null,
    })),
  };
}

module.exports = {
  calculate,
  calculateMultiple,
  extractClosePrices,
  formatResponse,
  approximateHighLow,
};
