# Stockbit Dashboard v1

Proxy server & web dashboard untuk scraping data saham Indonesia dari Stockbit API (`exodus.stockbit.com`) dan menyimpannya ke MongoDB. Menyediakan dashboard monitoring pasar saham dengan data real-time / near-real-time.

> **Status:** Proof-of-concept. Gunakan dengan memperhatikan Terms of Service Stockbit.

---

## Tech Stack

### Frontend

| Teknologi       | Versi    | Keterangan                          |
| --------------- | -------- | ----------------------------------- |
| Vue             | ^3.5.32  | Composition API + `<script setup>`  |
| Vite            | ^8.0.10  | Build tool & dev server             |
| Vue Router      | ^5.0.7   | Client-side routing                 |
| Chart.js        | ^4.5.1   | Chart rendering                     |
| vue-chartjs     | ^5.3.3   | Vue wrapper untuk Chart.js          |
| Axios           | ^1.16.0  | HTTP client                         |

- Tanpa UI library (CSS custom murni)
- Tanpa state management library (reactive object di `stores/auth.js`)
- Font: DM Sans + Inter (Google Fonts)
- Plain JavaScript (bukan TypeScript)

### Backend

| Teknologi       | Versi    | Keterangan                          |
| --------------- | -------- | ----------------------------------- |
| Node.js         | v22      | Runtime (Docker)                    |
| Express         | ^4.18.2  | HTTP server / API framework         |
| Mongoose        | ^9.6.1   | MongoDB ODM                         |
| MongoDB         | Atlas    | Database                            |
| jsonwebtoken    | ^9.0.3   | JWT generation & verification       |
| bcryptjs        | ^3.0.3   | Password hashing                    |
| dotenv          | ^16.3.1  | Environment variables               |
| cors            | ^2.8.5   | Cross-Origin Resource Sharing       |
| axios           | ^1.6.0   | HTTP client (proxy ke Stockbit API) |
| nodemon         | ^3.0.1   | Dev auto-reload                     |

### Lainnya

| Tool            | Keterangan                          |
| --------------- | ----------------------------------- |
| Docker          | Multi-container deployment          |
| Nginx           | Static file serving + reverse proxy |
| PM2             | Production process manager          |
| GitHub Actions  | CI/CD auto-deploy                   |

---

## Struktur Proyek

```
stockbit-v1/
├── frontend/                        # Vue 3 SPA
│   ├── src/
│   │   ├── components/
│   │   │   ├── DashboardPage.vue          # Shell: sidebar + topbar + tab content
│   │   │   ├── StockbitDashboard.vue      # Overview dashboard
│   │   │   ├── StockDetail.vue            # Detail saham (chart + running trade)
│   │   │   ├── StockChart.vue             # Chart.js line chart
│   │   │   ├── TrendingView.vue           # Trending + top gainers/losers
│   │   │   ├── EmitenList.vue             # Grid 957+ perusahaan IDX
│   │   │   ├── RunningTrade.vue           # Live trade stream
│   │   │   ├── BrokerTop.vue              # Top broker rankings
│   │   │   ├── LoginPage.vue              # Login form
│   │   │   └── UserManagement.vue         # Admin user CRUD
│   │   ├── stores/auth.js        # Auth state (token, user, login/logout)
│   │   ├── router/index.js       # Route: /login, /dashboard
│   │   └── main.js               # Entry point
│   ├── docker/nginx/default.conf # Nginx config production
│   ├── docker-compose.yml
│   └── Dockerfile
├── backend/                         # Express API server
│   ├── server.js                    # ~791 baris, 38 route dalam 1 file
│   ├── models/
│   │   ├── Emiten.js               # Data perusahaan IDX
│   │   ├── ChartPrice.js           # Cache harga chart
│   │   ├── Snapshot.js             # Cache trending, IHSG, movers
│   │   ├── User.js                 # User dashboard
│   │   └── Config.js               # Key-value config (token, dll)
│   ├── workers/
│   │   ├── fetch-snapshots.js      # Fetch IHSG/trending/movers tiap 5m
│   │   └── fetch-daily-prices.js   # Fetch chart 957+ saham tiap 24j
│   ├── hardcode-daftar-saham.md    # Data 957 perusahaan
│   ├── docker-compose.yml
│   └── Dockerfile
└── .github/workflows/              # CI/CD
    ├── deploy-backend.yml
    └── deploy-frontend.yml
```

---

## Database (MongoDB — Mongoose Models)

### Emiten
| Field        | Tipe    | Keterangan                              |
| ------------ | ------- | --------------------------------------- |
| `symbol`     | String  | Kode saham (unique, uppercase)          |
| `name`       | String  | Nama perusahaan                         |
| `sector`     | String  | Papan Utama / Pengembangan / dll        |
| `industry`   | String  | Industri                                |
| `lastPrice`  | Number  | Harga terakhir                          |
| `change`     | Number  | Perubahan harga                         |
| `changePercent` | String | Persentase perubahan                 |
| `volume`     | Number  | Volume transaksi                        |
| `marketCap`  | Number  | Kapitalisasi pasar                      |
| `chartData`  | Object  | Cached chart response                   |
| `chartUpdatedAt` | Date | Waktu update chart terakhir           |
| `isActive`   | Boolean | Default true                            |

### ChartPrice
| Field        | Tipe    | Keterangan                              |
| ------------ | ------- | --------------------------------------- |
| `symbol`     | String  | Kode saham                              |
| `timeframe`  | Enum    | 1d, 1w, 1m, 3m, ytd, 1y, 3y, 5y       |
| `prices`     | Array   | [{date, formatted_date, value, change, percentage}] |
| `previous`   | Number  | Previous close price                    |
| `metadata`   | Object  | {lastPrice, change, changePercent}      |

Unique compound index: `(symbol, timeframe)`

### Snapshot
| Field        | Tipe    | Keterangan                              |
| ------------ | ------- | --------------------------------------- |
| `type`       | Enum    | trending, top_gainer, top_loser, top_value, ihsg |
| `data`       | Mixed   | Raw API response                        |
| `createdAt`  | Date    | TTL: auto-delete setelah 1 jam          |

### User
| Field        | Tipe    | Keterangan                              |
| ------------ | ------- | --------------------------------------- |
| `username`   | String  | Unique, lowercase                       |
| `password`   | String  | Hashed (bcrypt, salt 12)                |
| `role`       | Enum    | admin / user                            |
| `isActive`   | Boolean | Default true                            |

- Pre-save hook auto-hash password
- Method `comparePassword()` untuk login

### Config
| Field        | Tipe    | Keterangan                              |
| ------------ | ------- | --------------------------------------- |
| `key`        | String  | Unique config key                       |
| `value`      | String  | Config value                            |
| `description`| String  | Deskripsi                               |

---

## API Endpoints

### Authentication

| Method | Endpoint                | Auth      | Deskripsi                     |
| ------ | ----------------------- | --------- | ----------------------------- |
| POST   | `/api/auth/login`       | None      | Login (username + password)   |
| POST   | `/api/auth/register`    | Admin     | Buat user baru                |
| GET    | `/api/auth/me`          | Any auth  | Info user dari token          |

### Market Data (Proxied from Stockbit)

| Method | Endpoint                    | Auth         | Deskripsi                     |
| ------ | --------------------------- | ------------ | ----------------------------- |
| GET    | `/api/emiten/trending`      | None         | Trending stocks               |
| GET    | `/api/chart/:symbol`        | Token check  | Chart data per saham          |
| GET    | `/api/prices/:symbol`       | None         | Harga dari MongoDB cache      |
| GET    | `/api/ihsg`                 | None         | IHSG index data               |
| GET    | `/api/market-movers`        | None         | Top gainers/losers/value      |
| GET    | `/api/broker/top`           | Token check  | Top broker rankings           |
| GET    | `/api/running-trade/:symbol`| Token check  | Live trade stream             |

### Emiten Management

| Method | Endpoint                         | Auth         | Deskripsi                     |
| ------ | -------------------------------- | ------------ | ----------------------------- |
| POST   | `/api/emiten/seed`               | None         | Seed 957 emiten ke DB         |
| GET    | `/api/emiten`                    | None         | List emiten (paginated)       |
| GET    | `/api/emiten/:symbol`            | None         | Detail satu emiten            |
| POST   | `/api/emiten/:symbol/fetch-chart`| Token check  | Fetch & simpan chart          |
| POST   | `/api/emiten/batch-fetch`        | Token check  | Batch fetch chart N emiten    |

### Admin

| Method | Endpoint                    | Auth      | Deskripsi                     |
| ------ | --------------------------- | --------- | ----------------------------- |
| GET    | `/api/admin/users`          | Admin     | List semua user               |
| PUT    | `/api/admin/users/:id`      | Admin     | Update role/status user       |
| DELETE | `/api/admin/users/:id`      | Admin     | Hapus user                    |
| GET    | `/api/token-status`         | None      | Cek validitas Stockbit token  |
| PUT    | `/api/admin/token`          | Admin     | Update Stockbit token         |

### Utility

| Method | Endpoint            | Deskripsi                     |
| ------ | ------------------- | ----------------------------- |
| POST   | `/api/clear-cache`  | Clear in-memory cache         |

---

## Caching Strategy

| Layer            | Mekanisme     | TTL / Durasi           |
| ---------------- | ------------- | ---------------------- |
| In-memory Map    | Chart data    | 60 detik               |
| In-memory Map    | Running trade | 10 detik               |
| MongoDB Snapshot | Trending, IHSG, movers | 5 menit (auto-delete 1 jam) |
| MongoDB ChartPrice | Harga chart semua timeframe | 24 jam (diperbarui worker) |

Semua API response menyertakan header `Cache-Control: no-store`.

---

## Authentication

### Dashboard Auth (Frontend → Backend)

- JWT-based, secret dari env `JWT_SECRET`, expired 7 hari
- Token disimpan di `localStorage` frontend
- Role: `admin` / `user`
- Default admin: **admin / admin123** (auto-seed saat startup)
- Middleware: `authMiddleware` (verifikasi JWT) + `adminMiddleware` (cek role)

### Stockbit API Auth (Backend → Stockbit)

- JWT Bearer token dari Stockbit website
- Disimpan di MongoDB `Config` model (key: `stockbit_token`)
- Fallback ke env `STOCKBIT_TOKEN`
- Expired setiap 24 jam (JWT Stockbit)
- Bisa diupdate via admin panel tanpa restart server

---

## Workers (Background Jobs)

### fetch-snapshots.js

- **Interval:** Setiap 5 menit
- **Tugas:** Fetch & cache IHSG, trending, top gainers, top losers, top value
- **Output:** MongoDB `Snapshot` collection

### fetch-daily-prices.js

- **Interval:** Setiap 24 jam
- **Tugas:** Fetch chart harga 957+ saham × 8 timeframe
- **Rate limit:** 300ms delay antar request, 2s pause tiap 50 emiten
- **Auto-retry:** 5s wait jika kena 429 (rate limit)
- **Output:** MongoDB `ChartPrice` collection + update `Emiten.lastPrice`

---

## Scripts

### Backend

| Command         | Deskripsi                |
| --------------- | ------------------------ |
| `npm start`     | Production start         |
| `npm run dev`   | Development (nodemon)    |

### Frontend

| Command            | Deskripsi                |
| ------------------ | ------------------------ |
| `npm run dev`      | Vite dev server (port 5173) |
| `npm run build`    | Production build ke `dist/` |
| `npm run preview`  | Preview production build |

---

## Deployment

### Docker

**Backend** — 3 container dalam 1 compose:
- `stockbit-backend` — API server (port `3028:3001`)
- `stockbit-snapshot-worker` — Worker snapshot
- `stockbit-price-worker` — Worker harga harian

**Frontend** — 1 container:
- `stockbit-frontend` — Nginx serve static + reverse proxy `/api` → backend (port `3036:80`)
- Multi-stage build: `node:22-alpine` (build) → `nginx:stable-alpine` (serve)

**Network:** Backend & frontend terhubung via `stockbit_network`. Backend juga terhubung ke `whatsmeow-api_siwa_net` (integrasi WhatsApp bot).

### Nginx Config

```
/               → static files (Vue SPA)
/api/*          → reverse proxy ke stockbit-backend:3001
Fallback        → try_files $uri $uri/ /index.html (SPA mode)
```

### CI/CD (GitHub Actions)

Trigger: push ke `main` branch, hanya file yang berubah:
- `backend/**` → deploy backend
- `frontend/**` → deploy frontend

Runner: self-hosted `stockbit-runner`

### PM2 (Production)

```
stockbit-server   → auto-restart, port 3001
stockbit-fetcher  → cron Mon-Fri 17:00 WIB (daily price fetch)
```

---

## Data Flow

```
Stockbit API (exodus.stockbit.com)
    │  JWT Bearer token
    ▼
Backend Proxy (Express :3001)
    │
    ├── In-memory Map cache (60s chart, 10s trade)
    ├── MongoDB Snapshot (5m trending/IHSG/movers)
    ├── MongoDB ChartPrice (24h harga chart)
    └── MongoDB Emiten (data perusahaan)
    │
    ▼
Frontend (Vue 3 SPA :5173 dev / :80 Nginx)
    │  JWT auth dashboard
    │
    └── Chart.js visualizations
```

---

## Fitur Utama

| Fitur                  | Komponen                    |
| ---------------------- | --------------------------- |
| Overview dashboard     | `StockbitDashboard.vue`     |
| IHSG monitoring        | `StockbitDashboard.vue`     |
| Stock chart (1D-5Y)    | `StockChart.vue`            |
| Trending stocks        | `TrendingView.vue`          |
| Perusahaan IDX (957+)  | `EmitenList.vue`            |
| Detail saham           | `StockDetail.vue`           |
| Running trade          | `RunningTrade.vue`          |
| Top broker             | `BrokerTop.vue`             |
| User management        | `UserManagement.vue` (admin)|
| Token management       | Token Status page (admin)   |

---

## Environments

### Backend

```env
PORT=3001
MONGODB_URI=mongodb+srv://...
STOCKBIT_TOKEN=eyJ...
USER_AGENT=Mozilla/5.0 ...
```

### Frontend

- **Dev:** Vite proxy `/api` → `http://localhost:3001`
- **Production:** Nginx reverse proxy `/api` → `stockbit-backend:3001`
- API base URL kosong (relative URL, same origin)
