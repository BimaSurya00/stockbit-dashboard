# Plan: Yahoo Volume Refactor

## Goal
Hapus backfill Yahoo Finance volume, ganti dengan real-time volume dari Stockbit `/emitten/{symbol}/info` endpoint. Hapus VolumeAnalysis page, keep hanya candlestick real-time dari Yahoo (stripped down).

## Arsitektur Final
```
Stockbit /emitten/{symbol}/info       ──►  GET /api/emiten/:symbol/info (proxy)  ──►  Info Card di StockDetail.vue
Yahoo Finance (real-time, no storage)  ──►  GET /api/candlestick/:symbol           ──►  Candlestick toggle di StockChart.vue
Stockbit chart API                    ──►  GET /api/chart/:symbol                  ──►  Line chart (unchanged)
```

## Todo List (Execution Order)

### Phase 1: Backend — Hapus Backfill Code (parallel-safe)

#### [1] `backend/lib/yahoo-finance.js` — Strip ke fetchStockData only
- Hapus `fetchVolumeForSymbol()` function
- Hapus `fetchStockData()` tetap dipertahankan (dipakai candlestick endpoint)
- Hapus throttled fetch (cuma volume worker yang butuh)
- Export hanya `{ fetchStockData, clearCache }`
- **Files to edit**: `backend/lib/yahoo-finance.js`

#### [2] `backend/server.js` — Hapus 3 bagian
- **Line 22-23**: Hapus import `fetchVolumeForSymbol`
- **Line 811-832**: Hapus volume enrichment block di GET `/api/chart/:symbol`
- **Line 1122-1194**: Hapus route `GET /api/emiten/:symbol/volume-analysis`
- **Line 1308-1378**: Hapus 3 backfill routes (`/api/admin/backfill-yahoo`, `/api/admin/backfill-cancel`, `/api/admin/backfill-status`)

#### [3] `backend/workers/fetch-yahoo-volume.js` — Hapus file

#### [4] `backend/ecosystem.config.js` — Hapus stockbit-yahoo-worker entry

### Phase 2: Backend — Tambah Route Stockbit Info

#### [5] `backend/server.js` — Tambah GET `/api/emiten/:symbol/info`
- Gunakan `getStockbitClient()` yang sudah ada
- Proxy ke `GET /emitten/{symbol}/info` di Stockbit
- Cache 60 detik (in-memory Map)
- Return: `{ data: { volume, price, change, percentage, previous, average, name, sector, subsector, orderbook } }`
- Error handling: return `{ error: "message" }` jika Stockbit API gagal
- **Letakkan DI ATAS route `GET /api/emiten/:symbol`** (biar gak ke-match duluan)

### Phase 3: Frontend — Hapus Volume Analysis Page

#### [6] `frontend/src/components/VolumeAnalysis.vue` — Hapus file

#### [7] `frontend/src/components/DashboardPage.vue` — Hapus VolumeAnalysis
- Line 18: Hapus `import VolumeAnalysis from './VolumeAnalysis.vue'`
- Line 79: Hapus menu item `{ key: 'volume', label: 'Volume Analysis', icon: 'activity' }`
- Line 117: Hapus `volume: 'Volume Analysis'` dari `tabLabels`
- Line 339-342: Hapus `<!-- Volume Analysis -->` block

### Phase 4: Frontend — Hapus Backfill Status

#### [8] `frontend/src/components/BackfillStatus.vue` — Hapus file

#### [9] `frontend/src/components/SystemMonitor.vue` — Hapus BackfillStatus tab
- Line 19-22: Hapus sub-tab button "Backfill Status"
- Line 63-65: Hapus `<BackfillStatus />` block
- Line 73: Hapus `import BackfillStatus from './BackfillStatus.vue'`

### Phase 5: Frontend — Info Card di StockDetail

#### [10] `frontend/src/components/StockDetail.vue` — Tambah info card
- Panggil `GET /api/emiten/:symbol/info` paralel dengan fetchChart
- Tampilkan info card di atas chart:
  - Company name + sector
  - Current price + change %
  - Volume + average volume + ratio
  - Orderbook bid/offer
  - Icon URL (dari `icon_url`)
- Style: bento card grid, match existing design (Inter font, rounded corners, shadow)
- Loading + error state

## Files to Delete
| File | Reason |
|------|--------|
| `backend/workers/fetch-yahoo-volume.js` | Backfill worker — no longer needed |
| `frontend/src/components/VolumeAnalysis.vue` | Volume analysis page — removed |
| `frontend/src/components/BackfillStatus.vue` | Backfill status UI — removed |

## Files to Edit
| File | Changes |
|------|---------|
| `backend/lib/yahoo-finance.js` | Strip `fetchVolumeForSymbol`, keep `fetchStockData` + `clearCache` |
| `backend/server.js` | Hapus 3 blocks, tambah route `/info` |
| `backend/ecosystem.config.js` | Hapus `stockbit-yahoo-worker` |
| `frontend/src/components/DashboardPage.vue` | Hapus VolumeAnalysis import + menu + tab |
| `frontend/src/components/SystemMonitor.vue` | Hapus BackfillStatus sub-tab + import |
| `frontend/src/components/StockDetail.vue` | Tambah info card dengan data dari `/info` |
| `frontend/src/components/DashboardPage.vue` | Mungkin hapus `import BackfillStatus` (cek apakah masih di-import di tempat lain) |

## Files NOT Touched
| File | Reason |
|------|--------|
| `backend/docker-compose.yml` | No yahoo worker here (only PM2) |
| `backend/lib/technical-analysis.js` | Unrelated to volume backfill |
| `frontend/src/components/StockChart.vue` | Line chart unchanged; candlestick still hits same endpoint |
| `backend/workers/fetch-daily-prices.js` | Stockbit chart worker — unrelated |

## Verification Steps
1. Backend starts without errors (check console on `npm run dev`)
2. `GET /api/emiten/BBRI/info` returns valid data with volume
3. `GET /api/candlestick/BBRI` still works (Yahoo Finance real-time)
4. Volume Analysis tab no longer appears in sidebar
5. Backfill Status sub-tab no longer appears in System Monitor
6. StockDetail page shows info card with volume data
7. Backend routes for backfill return 404

## Rollback
- Files deleted can be restored from git: `git checkout -- backend/workers/fetch-yahoo-volume.js frontend/src/components/VolumeAnalysis.vue frontend/src/components/BackfillStatus.vue`
- All edits in server.js: restore from git diff
