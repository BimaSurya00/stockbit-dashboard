# Frontend Architecture

## Tech
- Vue 3.5 + Composition API + <script setup>
- Vite 8 dev/build
- Vue Router 5 (createWebHistory)
- Chart.js 4 + vue-chartjs 5
- lightweight-charts 5.2 (TradingView-style charting)
- Axios for HTTP
- No TypeScript, no UI library, no state management library

## Routing (router/index.js)
- /login → LoginPage.vue (guest-only)
- /dashboard → DashboardPage.vue (auth-required)
- / → redirects to /dashboard
- Catch-all → redirects to /dashboard
- beforeEach: waits for initAuth() to resolve, then checks auth state

## Auth Store (stores/auth.js)
- Reactive object (Vue's reactive()) — not Pinia/Vuex
- state: user, token, ready
- Token persistence: localStorage (key: session_token)
- setSession(): saves token, sets axios default header, starts auto-refresh
- clearSession(): removes token, stops refresh
- initAuth(): checks localStorage, validates with GET /api/auth/me
- Auto-refresh: POST /api/auth/refresh every 6 days (before 30d expiry)
- isAuthenticated(): state.ready && !!state.user
- isAdmin(): user.role === 'admin'

## Components Overview

### Layout
- DashboardPage.vue: Shell with sidebar navigation, topbar, tab-based content area
- LoginPage.vue: Login form with username/password

### Market Data
- StockbitDashboard.vue: Overview dashboard with IHSG monitoring, stats
- StockChart.vue: Chart.js line chart with timeframe selector (1d-5y), overlay indicator support
- StockDetail.vue: Stock detail page (chart + running trade)
- TrendingView.vue: Trending stocks, top gainers/losers, horizontal bar chart
- RunningTrade.vue: Live trade stream for a symbol
- BrokerTop.vue: Top broker rankings
- BrokerFlow.vue: Broker flow analysis

### Analysis
- IndicatorSelector.vue: UI for selecting TA indicators with parameter inputs
- OscillatorPanel.vue: Renders oscillator panels below main chart
- VolumeAnalysis.vue: Volume analysis with Yahoo Finance data
- QuickAnalysis.vue: Quick stock analysis overview

### Data
- EmitenList.vue: Grid of 957+ IDX companies, search & filter by sector
- FinancialReports.vue: Financial report browser with download
- NewsView.vue: Stockbit news stream viewer

### Admin
- UserManagement.vue: Admin user CRUD (create, update role/status, delete)
- BackfillStatus.vue: Volume backfill status monitoring
- WorkerMonitor.vue: Background worker status dashboard

## Vite Config
- Dev proxy: /api → http://localhost:3001
- Production: API base URL is empty (relative, same origin via Nginx reverse proxy)

## Styling
- Custom CSS only (no framework)
- Font: DM Sans + Inter from Google Fonts
- Public assets: favicon.svg, icons.svg, hero.png