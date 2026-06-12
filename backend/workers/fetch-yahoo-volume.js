/**
 * Yahoo Finance Volume Worker
 *
 * Fetches OHLC + volume data from Yahoo Finance for all active stocks
 * and enriches ChartPrice documents. Uses WorkerJob for progress tracking.
 *
 * Run via PM2 cron or manually: node workers/fetch-yahoo-volume.js
 */

require('dotenv').config();
const axios = require('axios');
const connectDB = require('../db');
const Emiten = require('../models/Emiten');
const ChartPrice = require('../models/ChartPrice');
const WorkerJob = require('../models/WorkerJob');
const { fetchVolumeForSymbol } = require('../lib/yahoo-finance');

// Config
const BATCH_SIZE = 50;
const DELAY_PER_STOCK = 500;     // 500ms between stocks
const DELAY_PER_BATCH = 5000;    // 5s pause every BATCH_SIZE
const DAYS_TO_FETCH = 365;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function updateProgress(worker, updates) {
  await WorkerJob.findOneAndUpdate(
    { worker },
    { ...updates, updatedAt: new Date() },
    { upsert: true }
  );
}

async function run() {
  console.log('[YAHOO-VOLUME] Starting volume backfill...');
  const startTime = Date.now();

  await updateProgress('yahoo-volume', {
    status: 'running',
    message: 'Starting...',
    progress: { current: 0, total: 0 },
    lastRun: new Date(),
  });

  // Get active stocks
  const stocks = await Emiten.find({ isActive: true })
    .select('symbol name')
    .lean();

  const total = stocks.length;
  console.log(`[YAHOO-VOLUME] ${total} active stocks to process`);

  await updateProgress('yahoo-volume', {
    status: 'running',
    message: `Processing ${total} stocks...`,
    progress: { current: 0, total },
  });

  let enriched = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < stocks.length; i++) {
    const stock = stocks[i];
    const idx = i + 1;

    try {
      // Check if ChartPrice with volume already exists
      const existing = await ChartPrice.findOne({
        symbol: stock.symbol,
        timeframe: '1y',
      }).lean();

      if (existing && existing.prices && existing.prices.some(p => p.volume && p.volume > 0)) {
        skipped++;
        if (idx % BATCH_SIZE === 0) {
          console.log(`[YAHOO-VOLUME] ${idx}/${total} | enriched=${enriched} skipped=${skipped} failed=${failed}`);
        }
        await updateProgress('yahoo-volume', {
          progress: { current: idx, total },
          message: `${stock.symbol}: already has volume`,
        });
        continue;
      }

      // Fetch volume from Yahoo
      const volumeData = await fetchVolumeForSymbol(stock.symbol, DAYS_TO_FETCH);

      if (!volumeData || Object.keys(volumeData).length === 0) {
        failed++;
        console.log(`[YAHOO-VOLUME] ${idx}/${total} ✗ ${stock.symbol}: no Yahoo data`);
        await updateProgress('yahoo-volume', {
          progress: { current: idx, total },
          message: `${stock.symbol}: no data`,
        });
        await sleep(DELAY_PER_STOCK);
        continue;
      }

      // Find or create ChartPrice
      let chartPrice = await ChartPrice.findOne({
        symbol: stock.symbol,
        timeframe: '1y',
      });

      if (chartPrice && chartPrice.prices && chartPrice.prices.length > 0) {
        // Enrich existing prices with OHLCV
        let updated = 0;
        for (const p of chartPrice.prices) {
          const dateKey = p.formatted_date || (
            typeof p.date === 'number'
              ? new Date(p.date).toISOString().split('T')[0]
              : String(p.date).split('T')[0]
          );

          if (volumeData[dateKey]) {
            p.volume = volumeData[dateKey].volume;
            p.open = volumeData[dateKey].open;
            p.high = volumeData[dateKey].high;
            p.low = volumeData[dateKey].low;
            // Keep value = close from Stockbit, enrich with Yahoo OHLCV
            if (!p.value || p.value === '0') {
              p.value = String(volumeData[dateKey].close || volumeData[dateKey].open || 0);
            }
            updated++;
          }
        }
        chartPrice.markModified('prices');
        await chartPrice.save();
        enriched++;
        if (idx % 10 === 0) {
          console.log(`[YAHOO-VOLUME] ${idx}/${total} ✓ ${stock.symbol}: ${updated} bars enriched`);
        }
      } else {
        // No existing chart data - create from Yahoo
        const prices = Object.entries(volumeData).map(([date, data]) => ({
          date,
          formatted_date: date,
          value: String(data.close || data.open || 0),
          change: '0',
          percentage: '0',
          volume: data.volume,
          open: data.open,
          high: data.high,
          low: data.low,
        }));

        await ChartPrice.findOneAndUpdate(
          { symbol: stock.symbol, timeframe: '1y' },
          { symbol: stock.symbol, timeframe: '1y', prices, metadata: {} },
          { upsert: true }
        );
        enriched++;
        console.log(`[YAHOO-VOLUME] ${idx}/${total} ✓ ${stock.symbol}: created ${prices.length} bars`);
      }

      await updateProgress('yahoo-volume', {
        progress: { current: idx, total },
        message: `${stock.symbol}: enriched`,
      });
    } catch (err) {
      failed++;
      console.error(`[YAHOO-VOLUME] ${idx}/${total} ✗ ${stock.symbol}: ${err.message}`);
      await updateProgress('yahoo-volume', {
        progress: { current: idx, total },
        message: `${stock.symbol}: ${err.message}`,
      });
    }

    // Rate limiting
    await sleep(DELAY_PER_STOCK);
    if (idx % BATCH_SIZE === 0 && idx < total) {
      console.log(`[YAHOO-VOLUME] Batch pause ${DELAY_PER_BATCH / 1000}s...`);
      await sleep(DELAY_PER_BATCH);
    }
  }

  const elapsed = Math.round((Date.now() - startTime) / 1000);
  const summary = `Done: ${enriched} enriched, ${skipped} skipped, ${failed} failed in ${elapsed}s`;
  console.log(`[YAHOO-VOLUME] ${summary}`);

  await updateProgress('yahoo-volume', {
    status: 'idle',
    progress: { current: total, total },
    message: summary,
    lastRun: new Date(),
  });
}

// Main
(async () => {
  try {
    await connectDB();
    await run();
    console.log('[YAHOO-VOLUME] Complete.');
  } catch (err) {
    console.error('[YAHOO-VOLUME] Fatal:', err.message);
    try {
      await updateProgress('yahoo-volume', {
        status: 'error',
        message: err.message,
        errorMessage: err.message,
      });
    } catch (_) {}
  }
  // Exit after completion (PM2 cron mode)
  process.exit(0);
})();
