/**
 * Research Worker
 *
 * Fetches research/snips data from Stockbit API and stores in MongoDB.
 * Runs periodically via PM2 cron.
 */

require('dotenv').config();
const axios = require('axios');
const connectDB = require('../db');
const Research = require('../models/Research');
const WorkerJob = require('../models/WorkerJob');
const Config = require('../models/Config');

const STOCKBIT_BASE = 'https://exodus.stockbit.com';

let currentToken = process.env.STOCKBIT_TOKEN || '';

async function loadToken() {
  try {
    const config = await Config.findOne({ key: 'stockbit_token' });
    if (config?.value) {
      const raw = config.value.trim();
      // Remove "Bearer " prefix if present
      currentToken = raw.startsWith('Bearer ') ? raw.slice(7) : raw;
    }
  } catch (e) {
    console.warn('[RESEARCH-WORKER] Failed to load token from DB:', e.message);
  }
}

function getClient() {
  const headers = {
    'User-Agent': process.env.USER_AGENT || 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
    'Accept': 'application/json',
    'Origin': 'https://stockbit.com',
    'Referer': 'https://stockbit.com/',
  };

  if (currentToken) {
    headers['Authorization'] = `Bearer ${currentToken}`;
  }

  return axios.create({
    baseURL: STOCKBIT_BASE,
    headers,
    timeout: 15000
  });
}

async function updateJobStatus(status, message = '') {
  await WorkerJob.findOneAndUpdate(
    { worker: 'research' },
    {
      worker: 'research',
      status,
      message,
      lastRun: new Date(),
      ...(status === 'error' ? {} : { errorMessage: null })
    },
    { upsert: true, new: true }
  );
}

async function fetchResearchPage(page = 1) {
  const client = getClient();
  const params = {};
  if (page > 1) params.page = page;

  console.log(`[RESEARCH-WORKER] Fetching page ${page}...`);
  const response = await client.get('/research', { params });
  return response.data?.data || [];
}

async function run() {
  console.log('[RESEARCH-WORKER] Starting research fetch...');
  await updateJobStatus('running', 'Fetching research data...');

  try {
    await loadToken();
    console.log(`[RESEARCH-WORKER] Token length: ${currentToken.length}`);

    let allItems = [];
    let page = 1;

    // Fetch up to 5 pages (each page ~25 items, total ~125 items)
    while (page <= 5) {
      try {
        const items = await fetchResearchPage(page);
        if (items.length === 0) break;
        allItems = allItems.concat(items);
        console.log(`[RESEARCH-WORKER] Page ${page}: ${items.length} items`);
        page++;
      } catch (err) {
        if (err.response?.status === 401) {
          console.warn('[RESEARCH-WORKER] Token expired/unauthorized, stopping fetch');
          break;
        }
        console.error(`[RESEARCH-WORKER] Error page ${page}:`, err.message);
        break;
      }
    }

    console.log(`[RESEARCH-WORKER] Total fetched: ${allItems.length} items`);

    // Save to MongoDB
    let saved = 0;
    for (const item of allItems) {
      if (!item.id) continue;

      await Research.findOneAndUpdate(
        { researchId: item.id },
        {
          researchId: item.id,
          title: item.title,
          categoryLabel: item.category_label || 'Snips',
          url: item.url || '',
          iconUrl: item.icon_url || '',
          imageUrl: item.image_url || '',
          description: item.description || '',
          compressedImageUrl: item.compressed_image_url || '',
          created: item.created ? new Date(item.created) : new Date(),
          fetchedAt: new Date()
        },
        { upsert: true, new: true }
      );
      saved++;
    }

    console.log(`[RESEARCH-WORKER] Saved ${saved} items to MongoDB`);
    await updateJobStatus('idle', `Fetched ${allItems.length} items, saved ${saved}`);

  } catch (error) {
    console.error('[RESEARCH-WORKER] Fatal error:', error.message);
    await updateJobStatus('error', error.message);
  }
}

// Run
(async () => {
  try {
    await connectDB();
    await run();
  } catch (err) {
    console.error('[RESEARCH-WORKER] Startup error:', err.message);
    await updateJobStatus('error', err.message).catch(() => {});
  } finally {
    // PM2 cron mode: exit after completion
    // For standalone: setTimeout to keep alive
    if (process.env.PM2_USAGE) {
      process.exit(0);
    }
  }
})();
