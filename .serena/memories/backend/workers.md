# Background Workers

All workers are standalone Node.js scripts in backend/workers/. Each directly connects to MongoDB.

## fetch-snapshots.js
- Interval: every 5 minutes (setInterval)
- Fetches from Stockbit API: IHSG, trending, top_gainers, top_losers, top_value
- Stores in MongoDB Snapshot collection
- TTL: 1 hour auto-delete on Snapshot docs

## fetch-daily-prices.js
- Interval: every 24 hours (setInterval)
- Fetches chart data for 957+ emitens × 8 timeframes (1d,1w,1m,3m,ytd,1y,3y,5y)
- Rate limiting: 300ms delay between requests, 2s pause every 50 emitens
- Auto-retry: 5s wait on 429 (rate limit)
- Stores in MongoDB ChartPrice collection, updates Emiten.lastPrice
- Updates WorkerJob collection with progress

## fetch-broker-snapshot.js
- Fetches broker trading data from Stockbit
- Groups: foreign, local, government
- Stores in BrokerSnapshot collection
- Unique per (date, group)

## fetch-news.js
- Fetches news streams from Stockbit API
- Stores in News collection (unique by streamId)
- PM2 cron: every 5 minutes

## fetch-yahoo-volume.js
- Fetches volume data from Yahoo Finance for stocks
- Used for volume analysis feature
- PM2 cron: Mon-Fri 18:00 WIB

## Import/Seed workers
- import-idx-json.js: imports IDX JSON files to FinancialReport collection
- seed-financial-reports-from-idx.js: seeds financial reports from data/ directory
- test-idx-connection.js: tests IDX data connectivity

## Backfill Scripts (scripts/)
- backfill-volume.js: backfill volume data from Stockbit
- backfill-yahoo-volume.js: backfill volume from Yahoo Finance

## PM2 Configuration (ecosystem.config.js)
- stockbit-server: main API, autorestart, max 1GB memory
- stockbit-yahoo-worker: cron Mon-Fri 18:00
- stockbit-news-worker: cron every 5 min

## Docker (backend/docker-compose.yml)
- stockbit-backend: API server on port 3028:3001
- stockbit-snapshot-worker: fetch-snapshots.js
- stockbit-price-worker: fetch-daily-prices.js

## Worker Monitoring
- WorkerJob model tracks status/progress
- API: GET /api/worker-status returns all worker states
- Frontend: WorkerMonitor.vue component