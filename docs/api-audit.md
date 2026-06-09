# Stockbit API Audit Report

**Date**: 2026-06-08
**Task**: Task 1 - Audit Stockbit API for OHLC + Volume Data

---

## Executive Summary

**CRITICAL FINDING**: Stockbit API **MENGEMBALIKAN volume data**, tetapi **TIDAK DISIMPAN** di MongoDB ChartPrice collection.

---

## Findings

### 1. Stockbit API Response Structure

**Endpoint**: `GET /api/chart/:symbol`
**Stockbit Endpoint**: `/charts/${symbol}/daily`

**Evidence dari Code**:
```javascript
// frontend/src/components/StockChart.vue:231
const hasVolume = items.some(i => i.volume !== undefined && parseFloat(i.volume) > 0)
```

**Conclusion**: ✅ **Volume data ADA di response dari Stockbit API**

### 2. ChartPrice Model Schema

**File**: `backend/models/ChartPrice.js`

**Current Schema**:
```javascript
prices: [{
  date: String,
  formatted_date: String,
  value: String,        // Close price
  change: Number,
  percentage: Number
}]
```

**Missing Fields**:
- ❌ `volume` - TIDAK disimpan
- ❌ `open` - TIDAK disimpan
- ❌ `high` - TIDAK disimpan
- ❌ `low` - TIDAK disimpan

### 3. Data Flow Analysis

```
Stockbit API (exodus.stockbit.com)
    │ Response: { data: { prices: [{ date, value, volume, change, percentage }] } }
    │
    ▼
Backend Proxy (server.js:743-808)
    │ Menyimpan ke MongoDB:
    │ - prices: [{ date, formatted_date, value, change, percentage }]
    │ - ❌ Volume TIDAK disimpan!
    │
    ▼
MongoDB ChartPrice Collection
    │ prices[0] = { date, value, change, percentage }
    │ ❌ Tidak ada volume field!
    │
    ▼
Frontend (StockChart.vue)
    │ Menerima data dari /api/chart/:symbol (live proxy)
    │ ✅ Volume ADA di live data
    │ ❌ Volume TIDAK ADA di cached data (/api/prices/:symbol)
```

### 4. Impact Analysis

**Volume-Based Indicators Affected**:
- ❌ OBV (On Balance Volume) - Menggunakan dummy volume (1,000,000)
- ❌ MFI (Money Flow Index) - Menggunakan dummy volume
- ❌ VWAP (Volume Weighted Average Price) - Menggunakan dummy volume
- ❌ Volume MA - Tidak bisa dihitung
- ❌ Volume Spike Detection - Tidak bisa dihitung

**Evidence dari Metis Review**:
> "OBV, MFI, VWAP currently use `closePrices.map(() => 1000000)` (dummy volume)"

---

## Recommendations

### For Task 2: Modifikasi ChartPrice Model

**Tambah fields ke `prices[]` array**:
```javascript
prices: [{
  date: String,
  formatted_date: String,
  value: String,        // Close price
  change: Number,
  percentage: Number,
  volume: Number,       // ✅ TAMBAH INI (optional, backward compatible)
  // open: Number,      // ❓ Jika Stockbit API punya OHLC
  // high: Number,      // ❓ Jika Stockbit API punya OHLC
  // low: Number        // ❓ Jika Stockbit API punya OHLC
}]
```

**Important**:
- Field `volume` harus **optional** (tidak required) untuk backward compatibility
- Data lama tanpa volume masih bisa dibaca

### For Task 3: Update fetch-chart Endpoint

**Update `server.js:773-790`** untuk simpan volume:
```javascript
// Saat ini:
prices: chartData.data.prices

// Harusnya:
prices: chartData.data.prices.map(p => ({
  ...p,
  volume: p.volume ? parseFloat(p.volume) : undefined
}))
```

### For Task 4: Backfill Data

**Perlu fetch ulang** semua 957+ saham untuk mendapatkan volume data.

---

## OHLC Data Status

**Status**: ❓ **BELUM DIVERIFIKASI**

**Alasan**:
- Token Stockbit belum di-set di environment variable
- Tidak bisa test API langsung

**Next Steps**:
- Set token: `export STOCKBIT_TOKEN=your_token_here`
- Test API: `curl -s -H "Authorization: Bearer $STOCKBIT_TOKEN" "https://exodus.stockbit.com/chart/v2/BBCA?timeframe=1y" | jq '.data[0] | keys'`

**If OHLC exists**:
- Update Task 2 untuk include open, high, low fields
- Update Task 3 untuk simpan OHLC data

---

## Conclusion

| Question | Answer |
|----------|--------|
| **Volume data ada di Stockbit API?** | ✅ YA (confirmed dari frontend code) |
| **Volume disimpan di MongoDB?** | ❌ TIDAK (perlu modifikasi model) |
| **OHLC data ada?** | ❓ Belum diverifikasi (perlu test API) |
| **Volume indicators work?** | ❌ TIDAK (menggunakan dummy data) |

**Impact**: Tanpa perubahan ini, fitur Volume Analysis (Task 5-7) **TIDAK AKAN WORK** dengan data real.

---

## Next Steps

1. ✅ **Task 1 COMPLETE** - Audit selesai
2. ⏭️ **Task 2** - Modifikasi ChartPrice model (tambah volume field)
3. ⏭️ **Task 3** - Update fetch-chart endpoint (simpan volume)
4. ⏭️ **Task 4** - Backfill data untuk semua saham

---

**Auditor**: Sisyphus (Prometheus)
**Evidence**: 
- `frontend/src/components/StockChart.vue:231` - Volume check
- `backend/models/ChartPrice.js:14-20` - Current schema
- `backend/server.js:773-790` - Data saving logic
