# Testing Guide - Maksimalkan Data Stockbit

**Last Updated:** 2026-06-08
**Total Features:** 11 tasks

---

## 📋 **Pre-requisites**

### **1. Pastikan Services Running**

```bash
# MongoDB (Docker)
docker ps | grep mongodb
# Expected: mongodb container Up

# Backend
cd backend
npm run dev
# Expected: "Stockbit Proxy running on http://localhost:3001"

# Frontend (opsional, untuk UI testing)
cd frontend
npm run dev
# Expected: "Local: http://localhost:5173"
```

### **2. Pastikan Data Sudah Ada**

```bash
# Cek apakah volume data sudah di-backfill
curl -s http://localhost:3001/api/prices/BBCA?timeframe=1y | jq '.data.prices[0] | has("volume")'
# Expected: true

# Jika belum, jalankan backfill:
cd backend
node scripts/backfill-volume.js
```

---

## 🧪 **TEST CASES**

---

### **TASK 1: Audit Stockbit API**

**Status:** Documentation only (tidak perlu test)

**Verification:**
```bash
cat docs/api-audit.md
# Expected: File ada dengan isi lengkap
```

---

### **TASK 2: ChartPrice Model (Volume Field)**

**TC-2.1: Volume field exists in schema**

```bash
# Method: Inspection
node -e "
  const ChartPrice = require('./backend/models/ChartPrice');
  const schema = ChartPrice.schema.paths['prices'].schema.paths;
  console.log('volume field:', schema.volume ? 'EXISTS' : 'MISSING');
"
# Expected: volume field: EXISTS
```

**TC-2.2: Backward compatibility (data lama)**

```bash
# Method: API
curl -s http://localhost:3001/api/prices/BBRI?timeframe=1w | jq '.data.prices[0]'
# Expected: 
# - Data lama masih bisa dibaca
# - volume field: null/undefined (OK)
# - Tidak ada error
```

---

### **TASK 3: Fetch-Chart Endpoint (Simpan Volume)**

**TC-3.1: Fetch chart dengan volume**

```bash
# Method: API
curl -s -X POST http://localhost:3001/api/emiten/BBCA/fetch-chart \
  -H "Content-Type: application/json" \
  -d '{"timeframe": "1y"}' | jq '.data.prices[0] | {date, value, volume}'
# Expected:
# - volume: <number> (bukan null/undefined)
# - volume > 0
```

**TC-3.2: Verify volume stored di MongoDB**

```bash
# Method: API (cached data)
curl -s http://localhost:3001/api/prices/BBCA?timeframe=1y | jq '.data.prices[0] | {date, value, volume}'
# Expected:
# - volume: <number>
# - volume > 0
```

---

### **TASK 4: Backfill Data**

**TC-4.1: Backfill script execution**

```bash
# Method: Script
cd backend
node scripts/backfill-volume.js
# Expected:
# - [SELESAI] Backfill volume data selesai!
# - Berhasil: >900
# - Gagal: <50 (wajar untuk saham yang delisted)
```

**TC-4.2: Verify multiple stocks have volume**

```bash
# Method: API
for symbol in BBCA BBRI TLKM BMRI ASII; do
  echo -n "$symbol: "
  curl -s http://localhost:3001/api/prices/$symbol?timeframe=1y | jq '.data.prices[0].volume'
done
# Expected: Semua return number > 0
```

---

### **TASK 5: Volume MA (Moving Average)**

**TC-5.1: VOLUME_MA indicator registered**

```bash
# Method: API
curl -s http://localhost:3001/api/indicators | jq '.[] | select(.key == "VOLUME_MA")'
# Expected:
# - key: "VOLUME_MA"
# - name: "Volume Moving Average"
# - overlay: true
```

**TC-5.2: Calculate VOLUME_MA**

```bash
# Method: API
curl -s "http://localhost:3001/api/emiten/BBCA/indicators?timeframe=1y&indicators=VOLUME_MA:period=20" | jq '.'
# Expected:
# - indicators[0].indicator: "VOLUME_MA"
# - indicators[0].data.volume_ma: array dengan values
# - Tidak ada error
```

---

### **TASK 6: OBV (On Balance Volume)**

**TC-6.1: OBV dengan real volume**

```bash
# Method: API
curl -s "http://localhost:3001/api/emiten/BBCA/indicators?timeframe=1y&indicators=OBV" | jq '.indicators[0].data.obv[0:5]'
# Expected:
# - Array dengan 5 values
# - Values bervariasi (bukan semua sama)
# - Bukan dummy data (1000000)
```

**TC-6.2: OBV error handling tanpa volume**

```bash
# Method: API (saham tanpa volume)
curl -s "http://localhost:3001/api/emiten/XXXX/indicators?timeframe=1y&indicators=OBV" | jq '.error'
# Expected: Error message tentang volume data tidak tersedia
# (atau data kosong jika saham tidak ada)
```

---

### **TASK 7: Volume Spike Detection**

**TC-7.1: Volume analysis endpoint**

```bash
# Method: API
curl -s "http://localhost:3001/api/emiten/BBCA/volume-analysis?timeframe=1y" | jq '.analysis'
# Expected:
# - lookbackPeriod: 20
# - spikeThreshold: 2
# - totalDataPoints: >100
# - averageVolume: >0
# - spikeCount: >=0
# - spikes: array (bisa kosong)
```

**TC-7.2: Spike data structure**

```bash
# Method: API
curl -s "http://localhost:3001/api/emiten/BBCA/volume-analysis?timeframe=1y" | jq '.analysis.spikes[0] // "No spikes"'
# Expected (jika ada spike):
# - date: "2024-..."
# - formatted_date: "..."
# - volume: <number>
# - averageVolume: <number>
# - spikeRatio: >2
# - price: <number>
# - priceChange: <number>
```

**TC-7.3: Custom threshold**

```bash
# Method: API
curl -s "http://localhost:3001/api/emiten/BBCA/volume-analysis?timeframe=1y&threshold=3" | jq '.analysis.spikeCount'
# Expected: < spikeCount dengan threshold 2 (lebih sedikit spike)
```

---

### **TASK 8: Quick Analysis Dashboard**

**TC-8.1: Frontend - Quick Analysis tab**

```
Method: Manual (Browser)
Steps:
  1. Buka http://localhost:5173
  2. Login (admin/admin123)
  3. Klik menu "Quick Analysis" di sidebar
  4. Pilih saham "BBCA" dari dropdown
  5. Pilih timeframe "1 Tahun"
  6. Tunggu loading selesai

Expected:
  - ✅ 4 signal cards muncul:
    - RSI (dengan value dan status)
    - MACD (dengan status Bullish/Bearish)
    - Bollinger Bands (dengan status)
    - Trend (dengan status Uptrend/Downtrend)
  - ✅ Warna sesuai signal:
    - Hijau = Bullish
    - Merah = Bearish
    - Kuning = Neutral
  - ✅ Tidak ada error
```

**TC-8.2: Quick Analysis - Preset indicators**

```
Method: Manual (Browser)
Steps:
  1. Di Quick Analysis tab
  2. Pilih preset "Moving Averages (SMA 50/200 + EMA 20)"
  3. Tunggu loading

Expected:
  - ✅ Signal cards update
  - ✅ Trend indicator menunjukkan SMA 50/200
```

**TC-8.3: API - Multiple indicators**

```bash
# Method: API
curl -s "http://localhost:3001/api/emiten/BBCA/indicators?timeframe=1y&indicators=RSI:period=14,MACD,BBANDS:period=20,SMA:period=50,SMA:period=200" | jq '.indicators | length'
# Expected: 5
```

---

### **TASK 9: Broker Flow Visualization**

**TC-9.1: Frontend - Broker Flow tab**

```
Method: Manual (Browser)
Steps:
  1. Buka http://localhost:5173
  2. Login (admin/admin123)
  3. Klik menu "Broker Flow" di sidebar
  4. Tunggu loading

Expected:
  - ✅ 3 summary cards:
    - Foreign Flow (dengan net value)
    - Local Flow (dengan net value)
    - Government Flow (dengan net value)
  - ✅ Bar chart perbandingan
  - ✅ Top 5 brokers per group (Foreign Buy, Foreign Sell, Local Buy)
  - ✅ Warna sesuai:
    - Hijau = Net Buy (positif)
    - Merah = Net Sell (negatif)
```

**TC-9.2: API - Broker top data**

```bash
# Method: API
curl -s http://localhost:3001/api/broker/top | jq '.data.list | length'
# Expected: > 0
```

**TC-9.3: Broker data structure**

```bash
# Method: API
curl -s http://localhost:3001/api/broker/top | jq '.data.list[0]'
# Expected:
# - code: "..."
# - name: "..."
# - group: "BROKER_GROUP_FOREIGN" | "BROKER_GROUP_LOCAL" | "BROKER_GROUP_GOVERNMENT"
# - net_value: <number>
# - buy_value: <number>
# - sell_value: <number>
```

---

### **TASK 10: Historical Broker Worker**

**TC-10.1: BrokerSnapshot model**

```bash
# Method: Inspection
node -e "
  const BrokerSnapshot = require('./backend/models/BrokerSnapshot');
  console.log('Model loaded:', BrokerSnapshot.modelName);
"
# Expected: Model loaded: BrokerSnapshot
```

**TC-10.2: Worker execution**

```bash
# Method: Script
cd backend
node workers/fetch-broker-snapshot.js
# Expected:
# - [SELESAI] Broker snapshot berhasil disimpan!
# - Tidak ada error
```

**TC-10.3: Verify snapshot di MongoDB**

```bash
# Method: API
curl -s "http://localhost:3001/api/broker/history?days=1" | jq '.data | length'
# Expected: > 0 (ada data snapshot)
```

**TC-10.4: Broker history endpoint**

```bash
# Method: API
curl -s "http://localhost:3001/api/broker/history?days=7&group=foreign" | jq '.data[0]'
# Expected:
# - date: "2026-..."
# - group: "foreign"
# - net_value: <number>
# - top_brokers: array
```

---

### **TASK 11: Preset Indikator**

**TC-11.1: Preset dropdown**

```
Method: Manual (Browser)
Steps:
  1. Buka Quick Analysis tab
  2. Klik dropdown "Preset Indicators"

Expected:
  - ✅ 5 options:
    - Custom (RSI+MACD+BB+Trend)
    - Moving Averages (SMA 50/200 + EMA 20)
    - Bollinger + RSI
    - MACD + RSI
    - Trend Following (SMA 50/200 + MACD)
```

**TC-11.2: Preset execution**

```
Method: Manual (Browser)
Steps:
  1. Pilih saham BBCA
  2. Pilih preset "Bollinger + RSI"
  3. Tunggu loading

Expected:
  - ✅ Hanya 2 signal cards yang muncul (RSI dan BB)
  - ✅ MACD dan Trend tidak muncul (atau menunjukkan "-")
```

**TC-11.3: API - Preset indicators**

```bash
# Method: API
curl -s "http://localhost:3001/api/emiten/BBCA/indicators?timeframe=1y&indicators=BBANDS:period=20,RSI:period=14" | jq '.indicators | length'
# Expected: 2
```

---

## 🔍 **EDGE CASES & ERROR HANDLING**

### **EC-1: Invalid symbol**

```bash
curl -s "http://localhost:3001/api/emiten/XXXX/indicators?timeframe=1y&indicators=RSI" | jq '.error'
# Expected: Error message
```

### **EC-2: Invalid timeframe**

```bash
curl -s "http://localhost:3001/api/emiten/BBCA/indicators?timeframe=invalid&indicators=RSI" | jq '.error'
# Expected: Error message
```

### **EC-3: Empty indicators**

```bash
curl -s "http://localhost:3001/api/emiten/BBCA/indicators?timeframe=1y" | jq '.error'
# Expected: Error "Parameter indicators diperlukan"
```

### **EC-4: Volume analysis tanpa data**

```bash
curl -s "http://localhost:3001/api/emiten/XXXX/volume-analysis?timeframe=1y" | jq '.error'
# Expected: Error "Data tidak ditemukan"
```

---

## ✅ **TESTING CHECKLIST**

```
Wave 1: Data Foundation
[ ] TC-2.1: Volume field exists
[ ] TC-2.2: Backward compatibility
[ ] TC-3.1: Fetch chart dengan volume
[ ] TC-3.2: Volume stored di MongoDB
[ ] TC-4.1: Backfill script success
[ ] TC-4.2: Multiple stocks have volume

Wave 2: Volume Analysis
[ ] TC-5.1: VOLUME_MA registered
[ ] TC-5.2: VOLUME_MA calculation
[ ] TC-6.1: OBV real volume
[ ] TC-6.2: OBV error handling
[ ] TC-7.1: Volume analysis endpoint
[ ] TC-7.2: Spike data structure
[ ] TC-7.3: Custom threshold

Wave 3: UI & Broker
[ ] TC-8.1: Quick Analysis UI
[ ] TC-8.2: Preset indicators UI
[ ] TC-8.3: Multiple indicators API
[ ] TC-9.1: Broker Flow UI
[ ] TC-9.2: Broker top API
[ ] TC-9.3: Broker data structure
[ ] TC-10.1: BrokerSnapshot model
[ ] TC-10.2: Worker execution
[ ] TC-10.3: Snapshot di MongoDB
[ ] TC-10.4: Broker history endpoint
[ ] TC-11.1: Preset dropdown
[ ] TC-11.2: Preset execution
[ ] TC-11.3: Preset API

Edge Cases
[ ] EC-1: Invalid symbol
[ ] EC-2: Invalid timeframe
[ ] EC-3: Empty indicators
[ ] EC-4: Volume analysis tanpa data
```

---

## 📊 **TEST RESULTS TEMPLATE**

```
Date: ___________
Tester: ___________

Wave 1: Data Foundation
- TC-2.1: [ ] PASS [ ] FAIL - Notes: ___________
- TC-2.2: [ ] PASS [ ] FAIL - Notes: ___________
- TC-3.1: [ ] PASS [ ] FAIL - Notes: ___________
- TC-3.2: [ ] PASS [ ] FAIL - Notes: ___________
- TC-4.1: [ ] PASS [ ] FAIL - Notes: ___________
- TC-4.2: [ ] PASS [ ] FAIL - Notes: ___________

Wave 2: Volume Analysis
- TC-5.1: [ ] PASS [ ] FAIL - Notes: ___________
- TC-5.2: [ ] PASS [ ] FAIL - Notes: ___________
- TC-6.1: [ ] PASS [ ] FAIL - Notes: ___________
- TC-6.2: [ ] PASS [ ] FAIL - Notes: ___________
- TC-7.1: [ ] PASS [ ] FAIL - Notes: ___________
- TC-7.2: [ ] PASS [ ] FAIL - Notes: ___________
- TC-7.3: [ ] PASS [ ] FAIL - Notes: ___________

Wave 3: UI & Broker
- TC-8.1: [ ] PASS [ ] FAIL - Notes: ___________
- TC-8.2: [ ] PASS [ ] FAIL - Notes: ___________
- TC-8.3: [ ] PASS [ ] FAIL - Notes: ___________
- TC-9.1: [ ] PASS [ ] FAIL - Notes: ___________
- TC-9.2: [ ] PASS [ ] FAIL - Notes: ___________
- TC-9.3: [ ] PASS [ ] FAIL - Notes: ___________
- TC-10.1: [ ] PASS [ ] FAIL - Notes: ___________
- TC-10.2: [ ] PASS [ ] FAIL - Notes: ___________
- TC-10.3: [ ] PASS [ ] FAIL - Notes: ___________
- TC-10.4: [ ] PASS [ ] FAIL - Notes: ___________
- TC-11.1: [ ] PASS [ ] FAIL - Notes: ___________
- TC-11.2: [ ] PASS [ ] FAIL - Notes: ___________
- TC-11.3: [ ] PASS [ ] FAIL - Notes: ___________

Edge Cases
- EC-1: [ ] PASS [ ] FAIL - Notes: ___________
- EC-2: [ ] PASS [ ] FAIL - Notes: ___________
- EC-3: [ ] PASS [ ] FAIL - Notes: ___________
- EC-4: [ ] PASS [ ] FAIL - Notes: ___________

TOTAL: ___/27 PASS

Notes/Issues:
_________________________________
_________________________________
_________________________________
```

---

## 🚀 **QUICK TEST (5 Menit)**

Jika waktu terbatas, test ini saja:

```bash
# 1. Volume data exists
curl -s http://localhost:3001/api/prices/BBCA?timeframe=1y | jq '.data.prices[0].volume'
# Expected: > 0

# 2. VOLUME_MA works
curl -s "http://localhost:3001/api/emiten/BBCA/indicators?timeframe=1y&indicators=VOLUME_MA:period=20" | jq '.indicators[0].data.volume_ma | length'
# Expected: > 0

# 3. Volume spike detection
curl -s "http://localhost:3001/api/emiten/BBCA/volume-analysis?timeframe=1y" | jq '.analysis.spikeCount'
# Expected: >= 0

# 4. Broker flow
curl -s http://localhost:3001/api/broker/top | jq '.data.list | length'
# Expected: > 0

# 5. Quick Analysis (buka browser)
# http://localhost:5173 → Quick Analysis → Pilih BBCA
# Expected: 4 signal cards muncul
```

---

**Testing selesai?** Laporkan hasilnya!
