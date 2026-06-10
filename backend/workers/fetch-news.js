require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const axios = require('axios');
const News = require('../models/News');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/stockbit_dashboard';
const STOCKBIT_BASE = 'https://exodus.stockbit.com';

let token = process.env.STOCKBIT_TOKEN || null;

async function loadTokenFromDB() {
  const Config = require('../models/Config');
  try {
    const config = await Config.findOne({ key: 'stockbit_token' });
    if (config && config.value) {
      token = config.value;
      console.log('[TOKEN] Loaded from database');
      return;
    }
  } catch (err) {}
  if (process.env.STOCKBIT_TOKEN) {
    token = process.env.STOCKBIT_TOKEN;
  }
}

function getStockbitClient() {
  const headers = {
    'User-Agent': process.env.USER_AGENT || 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
    'Accept': 'application/json',
    'Origin': 'https://stockbit.com',
    'Referer': 'https://stockbit.com/'
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return axios.create({
    baseURL: STOCKBIT_BASE,
    headers,
    timeout: 15000
  });
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchNews(cursor = 0, limit = 20) {
  try {
    const client = getStockbitClient();
    const response = await client.get('/stream/v3', {
      params: {
        category: 'STREAM_CATEGORY_NEWS',
        last_stream_id: cursor,
        limit
      }
    });
    return response.data;
  } catch (error) {
    console.error('[NEWS] Error fetching:', error.message);
    return null;
  }
}

async function saveNews(items) {
  let saved = 0;
  for (const item of items) {
    try {
      await News.findOneAndUpdate(
        { streamId: item.stream_id },
        {
          streamId: item.stream_id,
          title: item.title,
          content: item.content,
          contentOriginal: item.content_original,
          titleUrl: item.title_url,
          createdAt: new Date(item.created_at),
          createdDisplay: item.created_display,
          userId: item.user?.user_id,
          username: item.user?.username,
          fullname: item.user?.fullname,
          userAvatar: item.user?.avatar,
          type: item.type,
          images: item.images || [],
          source: item.news_feed?.source,
          sourceLabel: item.news_feed?.label,
          sourceImage: item.news_feed?.img,
          topics: item.topics || [],
          totalReplies: item.total_replies || 0,
          totalLikes: item.total_likes || 0,
          rawData: item,
          fetchedAt: new Date()
        },
        { upsert: true, new: true }
      );
      saved++;
    } catch (err) {
      console.error(`[NEWS] Error saving ${item.stream_id}:`, err.message);
    }
  }
  return saved;
}

async function main() {
  try {
    console.log('[START] News fetcher worker\n');

    await mongoose.connect(MONGODB_URI);
    console.log('[DB] Connected to MongoDB\n');

    await loadTokenFromDB();

    if (!token) {
      console.error('[ERROR] Stockbit token tidak ditemukan!');
      process.exit(1);
    }

    let cursor = 0;
    let totalSaved = 0;
    let pageCount = 0;
    const maxPages = 5; // Fetch max 5 pages (100 news)

    while (pageCount < maxPages) {
      console.log(`[FETCH] Page ${pageCount + 1}, cursor: ${cursor}`);
      
      const data = await fetchNews(cursor, 20);
      
      if (!data?.data?.stream || data.data.stream.length === 0) {
        console.log('[INFO] No more news');
        break;
      }

      const saved = await saveNews(data.data.stream);
      totalSaved += saved;
      pageCount++;

      console.log(`[SAVED] ${saved} news items`);

      if (data.data.pagination?.is_last_page) {
        console.log('[INFO] Last page reached');
        break;
      }

      cursor = data.data.pagination?.next_cursor || 0;
      
      if (!cursor) {
        break;
      }

      // Rate limiting
      await delay(500);
    }

    console.log('\n' + '='.repeat(60));
    console.log('[SELESAI] News fetcher selesai!');
    console.log('='.repeat(60));
    console.log(`Total pages: ${pageCount}`);
    console.log(`Total saved: ${totalSaved}`);

    await mongoose.disconnect();
    console.log('\n[DB] Disconnected');

  } catch (error) {
    console.error('[FATAL ERROR]:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

main();
