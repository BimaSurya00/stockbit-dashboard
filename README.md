# Stockbit Dashboard v1

Project ini adalah proxy + dashboard untuk mengambil data dari Stockbit API, dengan fitur scraping daftar emiten dan penyimpanan ke MongoDB.

## Struktur Folder

```
stockbit-v1/
├── backend/              # Proxy server (Node.js + Express)
│   ├── models/           # Mongoose models
│   │   └── Emiten.js
│   ├── seeds/            # Database seeds
│   │   └── emitenSeed.js
│   ├── .env.example      # Contoh konfigurasi
│   ├── db.js             # MongoDB connection
│   ├── package.json
│   └── server.js         # Entry point
└── frontend/             # Dashboard (Vue 3 + Vite)
    ├── src/
    │   ├── components/
    │   │   ├── StockChart.vue
    │   │   ├── TrendingView.vue
    │   │   └── EmitenList.vue
    │   ├── App.vue
    │   └── main.js
    ├── index.html
    └── package.json
```

## Prerequisites

- Node.js (v18+)
- MongoDB (local atau MongoDB Atlas)
- Bearer Token dari Stockbit

## Setup MongoDB

### Option 1: Local MongoDB
```bash
# Install MongoDB (Ubuntu/Debian)
sudo apt-get install mongodb

# Start MongoDB
sudo systemctl start mongodb

# Default URI: mongodb://localhost:27017/stockbit_dashboard
```

### Option 2: MongoDB Atlas (Cloud)
1. Buat akun di [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Buat cluster baru
3. Copy connection string
4. Paste ke `backend/.env` di `MONGODB_URI`

## Setup Backend

1. Install dependencies:
```bash
cd backend
npm install
```

2. Copy dan edit environment:
```bash
cp .env.example .env
# Edit .env:
# - MONGODB_URI=mongodb://localhost:27017/stockbit_dashboard
# - STOCKBIT_TOKEN=your_token_here
```

3. Jalankan server:
```bash
npm start
```

Server berjalan di `http://localhost:3001`

## Setup Frontend (Vue 3)

1. Install dependencies:
```bash
cd frontend
npm install
```

2. Jalankan dev server:
```bash
npm run dev
```

Frontend berjalan di `http://localhost:5173`

## Cara Ambil Bearer Token

1. Login ke [stockbit.com](https://stockbit.com)
2. Buka DevTools (F12) → Network tab
3. Cari request ke `exodus.stockbit.com`
4. Klik request → Headers → Request Headers → cari `authorization: Bearer eyJ...`
5. Copy token setelah kata "Bearer"
6. Paste ke file `backend/.env` di `STOCKBIT_TOKEN`

## Seed Database (Penting!)

Setelah MongoDB terhubung, jalankan seed untuk mengisi database dengan daftar emiten:

```bash
# Via API endpoint
curl -X POST http://localhost:3001/api/emiten/seed
```

Atau buka tab "Daftar Emiten" di frontend dan klik "Refresh".

## Endpoint API

### Auth & Token
| Endpoint | Method | Deskripsi |
|----------|--------|-----------|
| `GET /api/token-status` | - | Cek status token |
| `POST /api/update-token` | body: `{token: "..."}` | Update token tanpa restart |

### Chart Data
| Endpoint | Method | Deskripsi |
|----------|--------|-----------|
| `GET /api/chart/:symbol` | query: `timeframe` | Data chart saham |
| `POST /api/emiten/:symbol/fetch-chart` | body: `{timeframe: "1w"}` | Fetch & save chart ke DB |

### Emiten Management
| Endpoint | Method | Deskripsi |
|----------|--------|-----------|
| `POST /api/emiten/seed` | - | Seed database dengan daftar emiten |
| `GET /api/emiten` | query: `page`, `limit`, `search`, `sector` | Daftar emiten dari DB |
| `GET /api/emiten/:symbol` | - | Detail emiten by symbol |
| `POST /api/emiten/batch-fetch` | body: `{limit: 10}` | Fetch chart untuk N emiten |

### Trending & Profile
| Endpoint | Method | Deskripsi |
|----------|--------|-----------|
| `GET /api/emiten/trending` | - | Daftar emiten trending |
| `GET /api/profile/:username` | - | User profile (test auth) |

## Cara Penggunaan

### 1. Inisialisasi Database
```bash
# Seed daftar emiten ke MongoDB
curl -X POST http://localhost:3001/api/emiten/seed
```

### 2. Fetch Data untuk Satu Emiten
```bash
# Ambil chart GOTO dan simpan ke DB
curl -X POST http://localhost:3001/api/emiten/GOTO/fetch-chart \
  -H "Content-Type: application/json" \
  -d '{"timeframe": "1w"}'
```

### 3. Batch Fetch (Multiple Emiten)
```bash
# Ambil chart untuk 10 emiten pertama
curl -X POST http://localhost:3001/api/emiten/batch-fetch \
  -H "Content-Type: application/json" \
  -d '{"limit": 10}'
```

### 4. Lihat Daftar Emiten
Buka frontend → Tab "Daftar Emiten"
- Search by symbol/nama
- Filter by sektor
- Klik emiten untuk lihat detail

## Fitur Dashboard

### Tab Chart Saham
- Input symbol manual
- Pilih timeframe (1d, 1w, 1m, 3m, ytd, 1y, 3y, 5y)
- Visualisasi line chart dengan Chart.js
- Stats card (harga, perubahan, tertinggi, terendah)

### Tab Trending
- Daftar emiten trending dari Stockbit
- Top Gainers & Losers
- Horizontal bar chart
- Tabel data lengkap

### Tab Daftar Emiten (Baru!)
- Grid view semua emiten dari MongoDB
- Search & filter by sektor
- Harga terakhir (jika sudah di-fetch)
- Modal detail dengan chart data

## Catatan Penting

- **Token expired**: JWT token dari Stockbit biasanya expire dalam 24 jam. Gunakan `POST /api/update-token` untuk update tanpa restart server.
- **Rate Limit**: Stockbit punya rate limit. Jangan batch fetch terlalu banyak sekaligus.
- **MongoDB**: Pastikan MongoDB berjalan sebelum start backend.
- **Ini adalah proof-of-concept**: Gunakan dengan bijak, perhatikan ToS Stockbit.

## Troubleshooting

### 304 Not Modified
- Backend sudah handle dengan cache-busting
- Frontend juga sudah tambah no-cache headers

### Chart tidak muncul untuk timeframe panjang
- Data timeframe panjang mungkin punya format berbeda
- Cek console log untuk debug info
- Klik "Raw JSON" untuk lihat format data asli

### MongoDB Connection Error
- Pastikan MongoDB berjalan: `sudo systemctl status mongodb`
- Cek URI di `.env`
- Kalau pakai Atlas, pastikan IP whitelist sudah benar
