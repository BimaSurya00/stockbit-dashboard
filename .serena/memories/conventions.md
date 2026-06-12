# Code Conventions

## Language
- Plain JavaScript only (no TypeScript)
- No build step for backend

## Naming
- Files: kebab-case.js (e.g., fetch-daily-prices.js)
- Vue components: PascalCase.vue (e.g., StockChart.vue, DashboardPage.vue)
- Variables/functions: camelCase
- Mongoose models: PascalCase, singular (Emiten, ChartPrice, Snapshot, User, Config, News, FinancialReport, BrokerSnapshot, WorkerJob)
- API routes: kebab-case paths (/api/running-trade/:symbol)
- MongoDB collections: auto-pluralized by Mongoose from model names

## Backend Architecture
- Monolithic server.js (~1500 lines) with all routes inline
- No separate route files or controllers
- Middleware in middleware/auth.js (authMiddleware, adminMiddleware)
- Models in models/ directory
- Library utilities in lib/ directory
- Workers in workers/ directory
- Seeds in seeds/ directory
- Each worker gets dedicated Docker container in docker compose

## Frontend Architecture
- Composition API with `<script setup>`
- No state management library: reactive object from Vue's reactive() in stores/auth.js
- Router in router/index.js with lazy-loaded components
- Route guards: beforeEach checks initAuth() before navigation
- Two routes: /login (guest), /dashboard (auth), catch-all redirects to /dashboard
- Auth: JWT stored in localStorage, axios default header, auto-refresh every 6 days

## Caching
- In-memory Map for chart data (60s TTL) and running trade (10s TTL)
- MongoDB Snapshot collection for trending/IHSG/movers (5min refresh, 1h TTL auto-delete)
- MongoDB ChartPrice collection for price data (24h refresh by worker)
- Yahoo Finance responses cached in-memory (5min TTL)

## Error Handling
- API responses: { error: "message" } on failure
- No global error handler — each route handles errors inline
- Workers log to console with [TAG] prefixes

## No linting or formatting config in repository
- No ESLint, Prettier, or Biome config found