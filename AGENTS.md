# AGENTS.md — Stockbit Dashboard

## What This Is

Proxy + dashboard for Indonesian stock market data from Stockbit API (`exodus.stockbit.com`), stored in MongoDB. Vue 3 SPA frontend, Express backend. Proof-of-concept, not production-hardened.

## Critical Architecture Facts

- **Backend is a single file**: `backend/server.js` (~1524 lines, 38+ routes). All routes, middleware setup, and startup logic in one file. Do NOT expect modular route files.
- **Plain JavaScript everywhere** — no TypeScript, no type checking, no lint/format config exists.
- **No test framework** — zero test files, zero test dependencies. No `npm test` script.
- **Two separate auth systems**:
  1. **Dashboard auth**: JWT for user login (admin/user roles), secret from `JWT_SECRET` env, 30-day expiry
  2. **Stockbit API auth**: Bearer token from stockbit.com website, stored in MongoDB `Config` collection (key: `stockbit_token`), expires every 24h, updateable via admin panel without restart
- **Default admin**: `admin` / `admin123` (auto-seeded on startup via `seeds/adminSeed.js`)

## Commands

```bash
# Backend
cd backend && npm install
cd backend && npm start          # production
cd backend && npm run dev         # nodemon auto-reload

# Frontend
cd frontend && npm install --legacy-peer-deps   # legacy-peer-deps REQUIRED
cd frontend && npm run dev        # Vite dev server on :5173
cd frontend && npm run build      # output to dist/
cd frontend && npm run preview    # preview production build
```

There are no test, lint, typecheck, or format commands. Skip them.

## Project Structure

```
backend/
  server.js              # ALL routes + startup (~1524 lines)
  db.js                  # MongoDB connection (mongoose)
  middleware/auth.js     # JWT auth + admin middleware
  models/                # 9 Mongoose models (Emiten, ChartPrice, Snapshot, User, Config, News, BrokerSnapshot, FinancialReport, WorkerJob)
  seeds/                 # adminSeed.js (auto), emitenSeed.js (manual)
  workers/               # Background jobs (separate processes, NOT part of server.js)
  lib/                   # technical-analysis.js, yahoo-finance.js, indicator-registry.js

frontend/
  src/
    components/          # 19 Vue SFCs (all in one flat directory)
    stores/auth.js       # Reactive state (no Vuex/Pinia)
    router/index.js      # /login, /dashboard (SPA catch-all)
  docker/nginx/          # Nginx config for production

scripts/                 # IDX scraper scripts (browser console, NOT Node.js)
data-scrap/              # Scraped JSON data files
```

## Docker & Deployment

- **Two separate docker-compose files**: `backend/docker-compose.yml` and `frontend/docker-compose.yml`
- Backend compose runs 3 containers: `stockbit-backend`, `stockbit-snapshot-worker`, `stockbit-price-worker`
- Both require external Docker network `stockbit_network` (create with `docker network create stockbit_network`)
- Backend also connects to `whatsmeow-api_siwa_net` (WhatsApp bot integration)
- CI/CD: GitHub Actions on push to `main`, self-hosted runner `stockbit-runner`, path-filtered (`backend/**` or `frontend/**`)
- Production uses PM2 (`ecosystem.config.js`): server + yahoo-worker (cron 18:00 Mon-Fri) + news-worker (every 5min)

## Workers (Background Jobs)

Workers run as **separate processes** (Docker containers or PM2), NOT inside server.js:

| Worker | Interval | Purpose |
|--------|----------|---------|
| `fetch-snapshots.js` | 5 min | IHSG, trending, gainers, losers, value |
| `fetch-daily-prices.js` | 24h | Chart prices for 957+ saham × 8 timeframes |
| `fetch-broker-snapshot.js` | — | Broker rankings |
| `fetch-news.js` | 5 min (PM2) | News feed |
| `fetch-yahoo-volume.js` | 18:00 Mon-Fri (PM2) | Volume data from Yahoo Finance |

## IDX Scraper Scripts

`scripts/idx-scraper*.js` are **browser console scripts** for scraping `idx.co.id`. They run in DevTools, NOT Node.js. Output goes to `data-scrap/`.

To import scraped data into MongoDB:
```bash
# Requires SSH tunnel first:
ssh -L 27018:127.0.0.1:27017 root@8.215.33.70 -N

# Then run (from project root):
./import-to-mongodb.sh                    # auto-detect newest file
./import-to-mongodb.sh path/to/file.json  # specific file
./import-batch.sh                         # import all idx-*.json
./import-batch.sh idx-2025-tw1            # filter by pattern
```

Import scripts load NVM internally (needed on Deepin).

## Caching

- In-memory `Map` in server.js: 60s for chart data, 10s for running trade
- MongoDB `Snapshot` collection: TTL auto-delete after 1 hour
- MongoDB `ChartPrice`: 24h refresh via worker
- All API responses: `Cache-Control: no-store` header

## Frontend Quirks

- **No UI library** — all CSS is custom/hand-written
- **No state management library** — `stores/auth.js` uses Vue `reactive()`
- **`--legacy-peer-deps` required** for `npm install` (peer dependency conflicts)
- Fonts: DM Sans + Inter (Google Fonts)
- Vite dev proxy: `/api` → `http://localhost:3001`
- Production: Nginx reverse proxy `/api` → `stockbit-backend:3001`

## Environment Variables

### Backend (.env)
```
PORT=3001
MONGODB_URI=mongodb+srv://...
STOCKBIT_TOKEN=eyJ...        # From browser DevTools on stockbit.com
USER_AGENT=Mozilla/5.0 ...
JWT_SECRET=...               # For dashboard auth (default: stockbit-dashboard-secret-change-me)
```

## Conventions

- Indonesian comments and UI text throughout — match existing style
- Commit messages: mixed Indonesian/English, match existing patterns
- No `.editorconfig`, no Prettier, no ESLint — formatting is inconsistent, do not normalize
- Models use Mongoose with explicit schema definitions
- Error responses: `{ error: "message" }` format
- API responses: `{ data: ... }` wrapper pattern
