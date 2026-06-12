# Stockbit Dashboard - Core

## Project Identity
- Proxy server + web dashboard for scraping Indonesian stock data from Stockbit API
- Stores data in MongoDB, serves via Express API and Vue 3 SPA
- Status: Proof-of-concept (respect Stockbit ToS)

## Top-level Structure
```
stockbit-dashboard/
├── frontend/          # Vue 3 SPA (Composition API, <script setup>)
├── backend/           # Express API server + workers
├── data-scrap/        # Raw scraped IDX financial report data (JSON dumps)
├── scripts/           # Shell scripts for import
├── .github/workflows/ # CI/CD: deploy-backend.yml, deploy-frontend.yml
└── PROJECT.md         # Comprehensive project documentation (canonical reference)
```

## Module References
- Backend architecture, models, workers: `mem:backend/core`
- Database models detail (Emiten, ChartPrice, Snapshot, User, Config, News, FinancialReport, BrokerSnapshot, WorkerJob): `mem:backend/models`
- Background workers: `mem:backend/workers`
- Technical analysis system: `mem:backend/technical-analysis`
- Frontend components, routing: `mem:frontend/core`

## Key Invariants
- Frontend and backend are separate npm projects with their own package.json
- Backend port: 3001 (configurable via PORT env)
- Vite dev server port: 5173, proxies /api → localhost:3001
- Production: Nginx serves frontend static + reverse proxy /api to backend
- All API responses include Cache-Control: no-store headers
- Auth is JWT-based for dashboard users, JWT Bearer for Stockbit API proxy
- Stockbit token stored in MongoDB Config model (key: stockbit_token), fallback to env STOCKBIT_TOKEN
- Default admin created on startup: admin / admin123
- Stockbit JWT tokens expire every 24h, auto-detection + admin-updatable

## Documentation
- PROJECT.md is the canonical project overview (read first)
- README.md is the getting-started guide
- CLAUDE.md contains RTK command usage instructions (tooling, not project)