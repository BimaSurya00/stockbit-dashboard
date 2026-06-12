# Vue Components Reference

## Component Tree
```
App.vue
├── LoginPage.vue          # Route: /login (guest-only)
└── DashboardPage.vue      # Route: /dashboard (auth-required)
    ├── StockbitDashboard.vue    # Tab: Overview (IHSG, stats)
    ├── StockDetail.vue          # Tab: Stock Detail
    │   ├── StockChart.vue       #   Chart.js line chart
    │   ├── IndicatorSelector.vue #   TA indicator selector
    │   ├── OscillatorPanel.vue  #   RSI, MACD, etc panels
    │   └── RunningTrade.vue     #   Live trade stream
    ├── TrendingView.vue         # Tab: Trending
    ├── EmitenList.vue           # Tab: Daftar Emiten (957+)
    ├── BrokerTop.vue            # Tab: Top Broker
    ├── BrokerFlow.vue           # Tab: Broker Flow
    ├── NewsView.vue             # Tab: News
    ├── FinancialReports.vue     # Tab: Financial Reports
    ├── VolumeAnalysis.vue       # Tab: Volume Analysis
    ├── QuickAnalysis.vue        # Tab: Quick Analysis
    ├── UserManagement.vue       # Tab: Users (admin only)
    ├── BackfillStatus.vue       # Tab: Backfill (admin only)
    └── WorkerMonitor.vue        # Tab: Workers (admin only)
```

## Key Implementation Notes
- All components use `<script setup>` (Composition API)
- DashboardPage.vue manages tab state with reactive currentTab ref
- Sidebar navigation filtered by user role (admin sees extra tabs)
- StockbitDashboard.vue has auto-refresh interval for market data
- EmitenList.vue has search (by symbol/name), sector filter, pagination
- StockDetail.vue loads stock data + chart on mount, supports symbol change
- FinancialReports.vue supports filtering by year, period, report type
- IndicatorSelector.vue dynamically loads indicator list from GET /api/indicators
- No prop drilling: components fetch their own data via axios
- All API calls use relative URLs (proxied in dev, same origin in prod)