# Backend Architecture

## Entry Point: server.js
- Monolithic Express app, ~1500 lines, all 38+ routes defined inline
- No separate route/controller files
- Startup sequence: connectDB → seedAdmin → start listening

## Middleware Stack
- CORS enabled globally
- JSON body parser
- Cache-Control: no-store on all responses (prevents browser caching)
- authMiddleware: verifies JWT from Authorization Bearer header
- adminMiddleware: checks req.user.role === 'admin'
- checkTokenMiddleware: light token check (no DB lookup, for Stockbit proxy routes)

## API Route Groups
1. **Auth** — /api/auth/login, /register, /me, /refresh
2. **Market Data (proxied from Stockbit)** — /api/chart/:symbol, /api/emiten/trending, /api/ihsg, /api/market-movers, /api/broker/top, /api/running-trade/:symbol
3. **Emiten Management** — /api/emiten CRUD, /seed, /batch-fetch, /indicators, /volume-analysis
4. **Admin** — /api/admin/users CRUD, /api/admin/token, /api/admin/backfill-*
5. **Financial Reports** — /api/financial-reports, /download
6. **News** — /api/news, /api/news/:streamId
7. **Utility** — /api/token-status, /api/indicators, /api/clear-cache, /api/worker-status

## Stockbit Proxy
- Base URL: https://exodus.stockbit.com
- Token management: loadTokenFromDB (Config model) → fallback to env STOCKBIT_TOKEN
- Token expiry detection: parseJwt → check exp claim
- Client created via getStockbitClient() which checks token freshness before each request
- Auto-detects 401 responses and marks token as expired

## Environment
- PORT=3001 (default)
- MONGODB_URI (required)
- STOCKBIT_TOKEN (fallback if DB Config missing)
- USER_AGENT (for Stockbit requests)
- JWT_SECRET (for dashboard auth, default: 'stockbit-dashboard-secret-change-me')
- JWT_EXPIRES (default: '30d')

## Data Sources
- Stockbit API (exodus.stockbit.com): chart data, trending, IHSG, brokers, running trades
- Yahoo Finance (yahoo-finance2): volume data backfill
- IDX JSON files (data/): financial report imports

## Technical Analysis
- Full TA indicator system: `mem:backend/technical-analysis`
- Workers for background data fetching: `mem:backend/workers`
- Database models detail: `mem:backend/models`

## Docker
- docker-compose.yml runs 3 services: stockbit-backend (API), stockbit-snapshot-worker, stockbit-price-worker
- Network: stockbit_network, also connects to whatsmeow-api_siwa_net