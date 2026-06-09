# Maksimalkan Data Stockbit untuk Trader Aktif

## TL;DR

> **Quick Summary**: Maksimalkan data harga, volume, dan broker yang sudah ada di stockbit-dashboard untuk mendukung trader aktif dengan fitur analisis teknikal, volume analysis, dan broker flow visualization.
> 
> **Deliverables**:
> - Data foundation: ChartPrice model dengan volume + OHLC data
> - Volume Analysis: Volume MA, OBV, Volume Spike Detection
> - Quick Analysis Dashboard: Signal summary + preset indikator
> - Broker Flow: Current-day + historical broker data
> 
> **Estimated Effort**: Medium (4-6 minggu)
> **Parallel Execution**: YES - 4 waves
> **Critical Path**: Task 1 → Task 2 → Task 3 → Task 5 → Task 8 → Task 11

---

## Context

### Original Request
User memiliki project stockbit-dashboard yang sudah berjalan dengan data dari Stockbit API. User bingung mau tambah fitur apa lagi karena ketergantungan pada data pihak ketiga. Setelah analisis, diputuskan untuk **maksimalkan data yang ada** (harga, volume, broker) untuk **trader aktif**.

### Interview Summary
**Key Discussions**:
- **Target User**: Trader aktif (bukan investor jangka panjang)
- **Constraint**: Ketergantungan data pihak ketiga (Stockbit, IDX) - tidak bisa tambah data baru
- **Strategi**: Medium effort, maksimalkan data yang sudah ada
- **Data yang Dipakai**: Harga, Volume, Broker

**Research Findings**:
- **23 indikator teknikal SUDAH ADA** di backend (SMA, EMA, RSI, MACD, BBANDS, dll)
- **Volume data TIDAK DISIMPAN** di MongoDB (hanya ada di live API)
- **Broker data HANYA 1 hari** (live proxy, tidak ada historical)
- **OHLC approximation** - indikator seperti Stochastic, CCI menggunakan high = close × 1.01
- **Volume indicators use dummy data** - OBV, MFI, VWAP menggunakan volume = 1,000,000

### Metis Review
**Identified Gaps** (addressed):
- **NO VOLUME DATA in MongoDB**: ChartPrice.prices[] tidak punya field volume → Modifikasi model
- **Broker data HANYA 1 hari**: Tidak ada historical data → Buat worker untuk daily snapshot
- **OHLC approximation**: Indikator tidak akurat → Cek Stockbit API untuk OHLC data
- **Volume indicators misleading**: OBV, MFI, VWAP menggunakan dummy data → Jangan tampilkan sampai ada real volume

---

## Work Objectives

### Core Objective
Maksimalkan data harga, volume, dan broker yang sudah ada untuk mendukung analisis trader aktif dengan menambahkan fitur Volume Analysis, Quick Analysis Dashboard, dan Broker Flow Visualization.

### Concrete Deliverables
1. **ChartPrice Model Enhancement** - Tambah field volume (dan OHLC jika ada) ke MongoDB
2. **Data Backfill** - Fetch ulang chart dengan volume untuk semua 957+ saham
3. **Volume Analysis Features** - Volume MA, OBV, Volume Spike Detection
4. **Quick Analysis Dashboard** - Signal summary + preset indikator populer
5. **Broker Flow Visualization** - Current-day flow + historical broker worker

### Definition of Done
- [ ] ChartPrice model punya field volume
- [ ] Semua saham punya volume data di MongoDB
- [ ] Volume-based indicators (OBV, MFI, VWAP) menggunakan real data
- [ ] Quick Analysis Dashboard menampilkan signal summary
- [ ] Broker Flow menampilkan foreign vs local aggregation
- [ ] Historical broker data tersedia untuk trend analysis

### Must Have
- **Data Foundation**: ChartPrice model harus simpan volume data
- **Volume Accuracy**: Volume-based indicators harus menggunakan real data (bukan dummy)
- **Broker Aggregation**: Foreign vs local flow harus terpisah jelas
- **Signal Summary**: RSI level, MACD crossover, BB position harus terlihat jelas
- **Preset Indikator**: Minimal 4 preset populer (Moving Averages, Bollinger+RSI, MACD+RSI, Trend Following)

### Must NOT Have (Guardrails)
- **JANGAN** tampilkan volume-based indicators (OBV, MFI, VWAP) dengan dummy data
- **JANGAN** tambah WebSocket infrastructure (tetap gunakan polling)
- **JANGAN** tambah state management library (Pinia/Vuex) - gunakan reactive pattern yang ada
- **JANGAN** panggil Stockbit API langsung dari frontend (semua melalui backend proxy)
- **JANGAN** buat unit tests (gunakan agent-executed QA saja)
- **JANGAN** tambah data dari API lain selain Stockbit

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** - ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: NO (tidak ada test framework)
- **Automated tests**: NO (skip unit tests)
- **Framework**: none
- **Agent-Executed QA**: ALWAYS (mandatory for all tasks)

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.omo/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Backend API**: Use Bash (curl) - Send requests, assert status + response fields
- **Frontend UI**: Use Playwright (playwright skill) - Navigate, interact, assert DOM, screenshot
- **Database**: Use Bash (mongosh or curl) - Query data, verify fields exist

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately - Data Foundation):
├── Task 1: Audit Stockbit API (cek OHLC + volume) [quick]
├── Task 2: Modifikasi ChartPrice model (tambah volume) [quick]
├── Task 3: Update fetch-chart endpoint (simpan volume) [unspecified-high]
└── Task 4: Backfill data untuk semua saham [unspecified-high]

Wave 2 (After Wave 1 - Volume Analysis):
├── Task 5: Volume MA (Moving Average) [unspecified-high]
├── Task 6: OBV (On Balance Volume) [unspecified-high]
├── Task 7: Volume Spike Detection [unspecified-high]
└── Task 8: Quick Analysis Dashboard - Signal Summary [visual-engineering]

Wave 3 (After Wave 2 - Broker Flow):
├── Task 9: Current-day Broker Flow Visualization [visual-engineering]
├── Task 10: Historical Broker Worker [unspecified-high]
└── Task 11: Quick Analysis Dashboard - Preset Indikator [visual-engineering]

Wave FINAL (After ALL tasks — 4 parallel reviews, then user okay):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high)
└── Task F4: Scope fidelity check (deep)
-> Present results -> Get explicit user okay

Critical Path: Task 1 → Task 2 → Task 3 → Task 5 → Task 8 → Task 11 → F1-F4 → user okay
Parallel Speedup: ~60% faster than sequential
Max Concurrent: 4 (Wave 1 & 2)
```

### Dependency Matrix

| Task | Depends On | Blocks |
|------|------------|--------|
| 1 | - | 2, 3 |
| 2 | 1 | 3, 4 |
| 3 | 1, 2 | 4, 5, 6, 7 |
| 4 | 2, 3 | 5, 6, 7 |
| 5 | 3, 4 | 8 |
| 6 | 3, 4 | 8 |
| 7 | 3, 4 | 8 |
| 8 | 5, 6, 7 | 11 |
| 9 | - | 10 |
| 10 | 9 | - |
| 11 | 8 | - |

### Agent Dispatch Summary

- **Wave 1**: 4 tasks - T1 → `quick`, T2 → `quick`, T3 → `unspecified-high`, T4 → `unspecified-high`
- **Wave 2**: 4 tasks - T5-T7 → `unspecified-high`, T8 → `visual-engineering`
- **Wave 3**: 3 tasks - T9 → `visual-engineering`, T10 → `unspecified-high`, T11 → `visual-engineering`
- **FINAL**: 4 tasks - F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

> EVERY task MUST have: Recommended Agent Profile + Parallelization info + QA Scenarios.
> **FORMAT**: Task labels MUST use bare numbers: `1.`, `2.`, `3.` — NOT `T1.`, `Task 1.`, `Phase 1:`.

- [ ] 1. Audit Stockbit API (cek OHLC + volume data)

  **What to do**:
  - Baca `backend/server.js` dan cari endpoint `/api/chart/:symbol`
  - Jalankan curl ke Stockbit API langsung untuk cek response structure
  - Cek apakah response includes: `volume`, `open`, `high`, `low`, `close` fields
  - Document hasil audit ke `docs/api-audit.md`
  - Jika OHLC + volume ada, update task 2 dan 3 untuk include OHLC

  **Must NOT do**:
  - JANGAN modifikasi kode apapun (ini audit saja)
  - JANGAN simpan data ke MongoDB (hanya document findings)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple audit task, hanya perlu baca kode dan test API
  - **Skills**: []
    - Tidak perlu skills spesifik

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2)
  - **Blocks**: Task 2, Task 3
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `backend/server.js:~800-850` - Cari endpoint `/api/chart/:symbol` untuk lihat bagaimana chart data di-fetch dari Stockbit API

  **API/Type References**:
  - `backend/models/ChartPrice.js` - Current schema (hanya ada date, formatted_date, value, change, percentage)

  **External References**:
  - Stockbit API: `https://exodus.stockbit.com` - Endpoint chart data

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Audit Stockbit API response structure
    Tool: Bash (curl)
    Preconditions: Stockbit token valid di environment variable
    Steps:
      1. Jalankan: `curl -s -H "Authorization: Bearer $STOCKBIT_TOKEN" "https://exodus.stockbit.com/chart/v2/BBCA?timeframe=1y" | jq '.data[0] | keys'`
      2. Cek apakah response includes: `volume`, `open`, `high`, `low`, `close`
      3. Document hasilnya ke docs/api-audit.md
    Expected Result: List of fields in response, clearly stating if OHLC + volume exist
    Failure Indicators: curl error, missing fields, empty response
    Evidence: .omo/evidence/task-1-api-audit.txt

  Scenario: Document findings
    Tool: Bash (write)
    Preconditions: API audit selesai
    Steps:
      1. Buat file docs/api-audit.md
      2. Tulis: API response structure, fields available, recommendation
    Expected Result: File docs/api-audit.md exists dengan isi yang lengkap
    Failure Indicators: File tidak created, isi kosong
    Evidence: .omo/evidence/task-1-api-audit.md
  ```

  **Commit**: YES
  - Message: `docs(api): audit stockbit api for OHLC and volume data`
  - Files: `docs/api-audit.md`

- [ ] 2. Modifikasi ChartPrice Model (tambah volume field)

  **What to do**:
  - Baca `backend/models/ChartPrice.js`
  - Tambah field `volume` ke `prices[]` array (Number, optional)
  - Jika Task 1 menemukan OHLC data, tambah juga: `open`, `high`, `low` fields
  - Update index jika perlu
  - Test backward compatibility (data lama tanpa volume masih bisa dibaca)

  **Must NOT do**:
  - JANGAN hapus field yang sudah ada
  - JANGAN buat breaking change (field baru harus optional)
  - JANGAN langsung fetch data (itu Task 3 dan 4)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple schema modification, 1 file change
  - **Skills**: []
    - Tidak perlu skills spesifik

  **Parallelization**:
  - **Can Run In Parallel**: YES (setelah Task 1 selesai)
  - **Parallel Group**: Wave 1 (with Task 1)
  - **Blocks**: Task 3, Task 4
  - **Blocked By**: Task 1 (perlu tahu apakah OHLC ada)

  **References**:

  **Pattern References**:
  - `backend/models/ChartPrice.js:1-50` - Current schema structure, lihat bagaimana prices[] array didefinisikan
  - `backend/models/Emiten.js` - Contoh model dengan field Number (lastPrice, volume, marketCap)

  **API/Type References**:
  - `backend/models/ChartPrice.js:prices[]` - Array yang perlu ditambah volume field

  **WHY Each Reference Matters**:
  - ChartPrice.js: Untuk paham current schema dan cara menambah field baru
  - Emiten.js: Untuk lihat pattern field Number yang sudah ada

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Verify volume field exists in ChartPrice schema
    Tool: Bash (node)
    Preconditions: Backend dependencies installed
    Steps:
      1. Jalankan: `cd backend && node -e "const ChartPrice = require('./models/ChartPrice'); console.log(ChartPrice.schema.paths['prices'].schema.paths);"`
      2. Cek apakah output includes `volume`
    Expected Result: volume field ada di prices schema
    Failure Indicators: volume field tidak ada, error loading model
    Evidence: .omo/evidence/task-2-schema-verification.txt

  Scenario: Test backward compatibility
    Tool: Bash (curl)
    Preconditions: Backend running, ada data lama di MongoDB
    Steps:
      1. Jalankan: `curl -s http://localhost:3001/api/prices/BBCA?timeframe=1y | jq '.data.prices[0]'`
      2. Cek apakah data lama (tanpa volume) masih bisa dibaca tanpa error
    Expected Result: Data lama masih valid, volume field undefined/null (bukan error)
    Failure Indicators: API error, data corrupt, missing fields
    Evidence: .omo/evidence/task-2-backward-compatibility.txt
  ```

  **Commit**: YES
  - Message: `feat(models): add volume field to ChartPrice schema`
  - Files: `backend/models/ChartPrice.js`

- [ ] 3. Update fetch-chart Endpoint (simpan volume ke MongoDB)

  **What to do**:
  - Baca `backend/server.js`, cari endpoint yang fetch chart dari Stockbit API
  - Update response parsing untuk extract `volume` (dan OHLC jika ada)
  - Simpan volume ke ChartPrice.prices[] saat fetch dari Stockbit
  - Update in-memory cache juga jika ada
  - Test dengan fetch 1 saham dan verifikasi volume tersimpan

  **Must NOT do**:
  - JANGAN modifikasi endpoint lain (hanya fetch-chart)
  - JANGAN hapus data yang sudah ada
  - JANGAN fetch semua saham (itu Task 4)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Backend API modification, perlu paham data flow
  - **Skills**: []
    - Tidak perlu skills spesifik

  **Parallelization**:
  - **Can Run In Parallel**: NO (sequential after Task 1 & 2)
  - **Parallel Group**: Wave 1 (sequential)
  - **Blocks**: Task 4, Task 5, Task 6, Task 7
  - **Blocked By**: Task 1 (perlu tahu response structure), Task 2 (schema sudah diupdate)

  **References**:

  **Pattern References**:
  - `backend/server.js:~800-900` - Endpoint yang fetch chart dari Stockbit API dan simpan ke MongoDB
  - `backend/workers/fetch-daily-prices.js` - Contoh worker yang fetch dan simpan data

  **API/Type References**:
  - `backend/models/ChartPrice.js:prices[]` - Schema yang sudah diupdate (Task 2)
  - Stockbit API response structure (dari Task 1)

  **WHY Each Reference Matters**:
  - server.js fetch-chart endpoint: Untuk paham bagaimana data di-fetch dan disimpan
  - fetch-daily-prices.js: Untuk lihat pattern fetch + save yang sudah ada

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Fetch chart dengan volume data
    Tool: Bash (curl)
    Preconditions: Backend running, Stockbit token valid
    Steps:
      1. Jalankan: `curl -s -X POST http://localhost:3001/api/emiten/BBCA/fetch-chart -H "Content-Type: application/json" -d '{"timeframe": "1y"}'`
      2. Cek response: `curl -s http://localhost:3001/api/prices/BBCA?timeframe=1y | jq '.data.prices[0] | has("volume")'`
      3. Verifikasi volume > 0 (bukan dummy 1000000)
    Expected Result: volume field ada dan berisi data real (bukan dummy)
    Failure Indicators: volume tidak ada, volume = 1000000 (dummy), API error
    Evidence: .omo/evidence/task-3-volume-stored.txt

  Scenario: Test tanpa breaking existing data
    Tool: Bash (curl)
    Preconditions: Data lama ada di MongoDB
    Steps:
      1. Fetch chart untuk saham lain: `curl -s -X POST http://localhost:3001/api/emiten/BBRI/fetch-chart -H "Content-Type: application/json" -d '{"timeframe": "1w"}'`
      2. Verifikasi data lama masih valid: `curl -s http://localhost:3001/api/prices/BBRI?timeframe=1w | jq '.data.prices | length'`
    Expected Result: Data lama masih ada, data baru punya volume
    Failure Indicators: Data lama hilang, API error
    Evidence: .omo/evidence/task-3-backward-compat.txt
  ```

  **Commit**: YES
  - Message: `feat(api): store volume data in fetch-chart endpoint`
  - Files: `backend/server.js`

- [ ] 4. Backfill Volume Data untuk Semua Emiten

  **What to do**:
  - Buat script `backend/scripts/backfill-volume.js`
  - Script fetch chart untuk semua 957+ emiten di MongoDB
  - Simpan volume data ke ChartPrice collection
  - Implementasi rate limiting (300ms delay antar request, 2s pause tiap 50 emiten)
  - Log progress: emiten ke-X dari total, berhasil/gagal
  - Handle error gracefully (skip emiten yang gagal, lanjut ke next)

  **Must NOT do**:
  - JANGAN hapus data yang sudah ada
  - JANGAN fetch sekaligus (gunakan rate limiting)
  - JANGAN block server (run sebagai script terpisah)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Backend script dengan rate limiting dan error handling
  - **Skills**: []
    - Tidak perlu skills spesifik

  **Parallelization**:
  - **Can Run In Parallel**: NO (sequential after Task 3)
  - **Parallel Group**: Wave 1 (sequential)
  - **Blocks**: Task 5, Task 6, Task 7
  - **Blocked By**: Task 2 (schema), Task 3 (endpoint updated)

  **References**:

  **Pattern References**:
  - `backend/workers/fetch-daily-prices.js` - Contoh worker dengan rate limiting (300ms delay, 2s pause tiap 50 emiten)
  - `backend/scripts/` - Lokasi untuk script baru

  **API/Type References**:
  - `backend/models/Emiten.js` - Untuk get list semua emiten
  - `backend/models/ChartPrice.js` - Untuk simpan data

  **WHY Each Reference Matters**:
  - fetch-daily-prices.js: Untuk copy pattern rate limiting yang sudah ada dan terbukti work
  - Emiten.js: Untuk get list emiten dari MongoDB

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Run backfill script
    Tool: Bash (node)
    Preconditions: Backend running, MongoDB connected, Task 3 selesai
    Steps:
      1. Jalankan: `cd backend && node scripts/backfill-volume.js`
      2. Tunggu script selesai (akan ambil waktu karena 957+ saham)
      3. Cek log: berapa berhasil, berapa gagal
    Expected Result: Script selesai tanpa crash, log menunjukkan progress
    Failure Indicators: Script crash, semua gagal, MongoDB error
    Evidence: .omo/evidence/task-4-backfill-log.txt

  Scenario: Verify volume data tersimpan
    Tool: Bash (curl)
    Preconditions: Backfill script selesai
    Steps:
      1. Jalankan: `curl -s http://localhost:3001/api/prices/BBCA?timeframe=1y | jq '.data.prices[0] | has("volume")'`
      2. Jalankan: `curl -s http://localhost:3001/api/prices/BBRI?timeframe=1y | jq '.data.prices[0] | has("volume")'`
      3. Jalankan: `curl -s http://localhost:3001/api/prices/TLKM?timeframe=1y | jq '.data.prices[0] | has("volume")'`
    Expected Result: Semua saham punya volume data
    Failure Indicators: volume field tidak ada, volume = 0
    Evidence: .omo/evidence/task-4-volume-verification.txt
  ```

  **Commit**: YES
  - Message: `data: backfill volume data for all emiten`
  - Files: `backend/scripts/backfill-volume.js`

- [ ] 5. Volume Moving Average (Volume MA)

  **What to do**:
  - Baca `backend/lib/indicator-registry.js` dan `backend/lib/technical-analysis.js`
  - Tambah indicator `VOLUME_MA` ke registry
  - Implementasi calculation: Simple Moving Average dari volume data
  - Default period: 20 (bisa dikonfigurasi)
  - Render sebagai overlay pada volume histogram di StockChart.vue
  - Pastikan menggunakan REAL volume data (bukan dummy)

  **Must NOT do**:
  - JANGAN gunakan dummy volume data
  - JANGAN modifikasi indicator yang sudah ada
  - JANGAN tampilkan jika volume data tidak tersedia

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Backend indicator implementation, perlu paham technical analysis library
  - **Skills**: []
    - Tidak perlu skills spesifik

  **Parallelization**:
  - **Can Run In Parallel**: YES (setelah Task 3 & 4 selesai)
  - **Parallel Group**: Wave 2 (with Tasks 6, 7)
  - **Blocks**: Task 8
  - **Blocked By**: Task 3 (endpoint updated), Task 4 (volume data ada)

  **References**:

  **Pattern References**:
  - `backend/lib/indicator-registry.js:1-100` - Contoh indicator definition (SMA, EMA, dll)
  - `backend/lib/technical-analysis.js:calculateSMA()` - Contoh SMA calculation yang bisa diadaptasi untuk volume

  **API/Type References**:
  - `backend/lib/indicator-registry.js:OVERLAY` - Tipe indicator overlay (rendered on chart)
  - `backend/models/ChartPrice.js:prices[].volume` - Data yang akan dihitung

  **WHY Each Reference Matters**:
  - indicator-registry.js: Untuk paham pattern indicator definition dan registration
  - technical-analysis.js: Untuk copy SMA calculation dan adaptasi untuk volume

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Verify Volume MA indicator tersedia
    Tool: Bash (curl)
    Preconditions: Backend running, Task 4 selesai
    Steps:
      1. Jalankan: `curl -s http://localhost:3001/api/indicators | jq '.[] | select(.name == "VOLUME_MA")'`
      2. Cek response: name, type (overlay), params (period)
    Expected Result: VOLUME_MA indicator ada di list
    Failure Indicators: Indicator tidak ada, type salah
    Evidence: .omo/evidence/task-5-volume-ma-registry.txt

  Scenario: Hitung Volume MA untuk BBCA
    Tool: Bash (curl)
    Preconditions: Volume data ada untuk BBCA
    Steps:
      1. Jalankan: `curl -s "http://localhost:3001/api/emiten/BBCA/indicators?timeframe=1y&indicators=VOLUME_MA:period=20" | jq '.indicators[0]'`
      2. Cek response: data array ada, values > 0
      3. Verifikasi bukan dummy: `jq '.indicators[0].data.values[0] != 1000000'`
    Expected Result: Volume MA values calculated dari real volume data
    Failure Indicators: values = 1000000 (dummy), empty array, error
    Evidence: .omo/evidence/task-5-volume-ma-calculation.txt
  ```

  **Commit**: YES
  - Message: `feat(analysis): add volume moving average indicator`
  - Files: `backend/lib/indicator-registry.js`, `backend/lib/technical-analysis.js`

- [ ] 6. OBV (On Balance Volume) dengan Real Volume Data

  **What to do**:
  - Baca `backend/lib/technical-analysis.js` - cari OBV implementation
  - Update OBV calculation untuk menggunakan REAL volume data (bukan dummy)
  - Pastikan OBV menggunakan `prices[].volume` dari MongoDB
  - Jika volume tidak ada, return error/null (bukan dummy data)
  - Test dengan saham yang punya volume data

  **Must NOT do**:
  - JANGAN gunakan dummy volume (1000000)
  - JANGAN tampilkan OBV jika volume data tidak ada
  - JANGAN modifikasi indicator lain

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Backend indicator update, perlu paham OBV calculation
  - **Skills**: []
    - Tidak perlu skills spesifik

  **Parallelization**:
  - **Can Run In Parallel**: YES (setelah Task 3 & 4 selesai)
  - **Parallel Group**: Wave 2 (with Tasks 5, 7)
  - **Blocks**: Task 8
  - **Blocked By**: Task 3 (endpoint updated), Task 4 (volume data ada)

  **References**:

  **Pattern References**:
  - `backend/lib/technical-analysis.js:cacalculateOBV()` - Current OBV implementation (menggunakan dummy volume)
  - `backend/lib/indicator-registry.js:OBV` - OBV indicator definition

  **API/Type References**:
  - `backend/models/ChartPrice.js:prices[].volume` - Real volume data
  - `backend/lib/technical-analysis.js:calculateOBV()` - Function yang perlu diupdate

  **WHY Each Reference Matters**:
  - technical-analysis.js OBV: Untuk lihat current implementation dan update untuk gunakan real volume
  - indicator-registry.js OBV: Untuk paham OBV configuration dan output format

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Verify OBV menggunakan real volume
    Tool: Bash (curl)
    Preconditions: Backend running, Task 4 selesai
    Steps:
      1. Jalankan: `curl -s "http://localhost:3001/api/emiten/BBCA/indicators?timeframe=1y&indicators=OBV" | jq '.indicators[0].data.obv[0:5]'`
      2. Cek values: TIDAK SEMUA SAMA (bukan dummy)
      3. Jalankan: `curl -s "http://localhost:3001/api/emiten/BBCA/indicators?timeframe=1y&indicators=OBV" | jq '.indicators[0].data.obv | unique | length'`
      4. Expected: > 1 (ada variasi, bukan semua 1000000)
    Expected Result: OBV values bervariasi (real calculation)
    Failure Indicators: Semua values sama (dummy), empty array
    Evidence: .omo/evidence/task-6-obv-real-volume.txt

  Scenario: OBV error handling tanpa volume
    Tool: Bash (curl)
    Preconditions: Ada saham tanpa volume data (data lama)
    Steps:
      1. Jalankan: `curl -s "http://localhost:3001/api/emiten/XXXX/indicators?timeframe=1y&indicators=OBV" | jq '.error'`
      2. Expected: Error message tentang volume data tidak tersedia
    Expected Result: Graceful error, bukan crash atau dummy data
    Failure Indicators: Dummy data ditampilkan, server crash
    Evidence: .omo/evidence/task-6-obv-error-handling.txt
  ```

  **Commit**: YES
  - Message: `feat(analysis): add OBV indicator with real volume data`
  - Files: `backend/lib/technical-analysis.js`

- [ ] 7. Volume Spike Detection

  **What to do**:
  - Buat endpoint baru: `GET /api/emiten/:symbol/volume-analysis`
  - Implementasi logic: Detect volume spikes (volume > 2× average 20 hari)
  - Return: list of dates dengan volume spike, spike ratio, price change pada hari tersebut
  - Buat frontend component `VolumeAnalysis.vue` untuk display
  - Tambah tab "Volume Analysis" di StockDetail.vue

  **Must NOT do**:
  - JANGAN gunakan dummy volume data
  - JANGAN modifikasi endpoint yang sudah ada
  - JANGAN tampilkan jika volume data tidak tersedia

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Backend endpoint + frontend component
  - **Skills**: []
    - Tidak perlu skills spesifik

  **Parallelization**:
  - **Can Run In Parallel**: YES (setelah Task 3 & 4 selesai)
  - **Parallel Group**: Wave 2 (with Tasks 5, 6)
  - **Blocks**: Task 8
  - **Blocked By**: Task 3 (endpoint updated), Task 4 (volume data ada)

  **References**:

  **Pattern References**:
  - `backend/server.js:/api/emiten/:symbol/indicators` - Contoh endpoint yang return indicator data
  - `frontend/src/components/StockDetail.vue` - Cara menambah tab baru

  **API/Type References**:
  - `backend/models/ChartPrice.js:prices[]` - Data yang akan dianalisis
  - `frontend/src/components/RunningTrade.vue` - Contoh component dengan summary cards

  **WHY Each Reference Matters**:
  - server.js indicators endpoint: Untuk copy pattern endpoint indicator
  - StockDetail.vue: Untuk paham cara menambah tab baru

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Volume spike detection endpoint
    Tool: Bash (curl)
    Preconditions: Backend running, Task 4 selesai
    Steps:
      1. Jalankan: `curl -s "http://localhost:3001/api/emiten/BBCA/volume-analysis?timeframe=1y" | jq '.'`
      2. Cek response: spikes array, averageVolume, threshold
      3. Cek spike object: date, volume, spikeRatio, priceChange
    Expected Result: Response dengan spikes array (bisa kosong jika tidak ada spike)
    Failure Indicators: Error, missing fields, dummy data
    Evidence: .omo/evidence/task-7-volume-spike-endpoint.txt

  Scenario: Frontend Volume Analysis component
    Tool: Playwright
    Preconditions: Frontend running, Task 4 selesai
    Steps:
      1. Buka: http://localhost:5173/dashboard
      2. Klik saham BBCA
      3. Cari tab "Volume Analysis"
      4. Klik tab tersebut
      5. Verifikasi: Ada summary cards (Average Volume, Spike Count, Highest Spike)
      6. Verifikasi: Ada list spike dates (atau "No spikes detected")
    Expected Result: Component render tanpa error, data ditampilkan
    Failure Indicators: Component tidak ada, error render, data kosong
    Evidence: .omo/evidence/task-7-volume-spike-frontend.png
  ```

  **Commit**: YES
  - Message: `feat(analysis): add volume spike detection`
  - Files: `backend/server.js`, `frontend/src/components/VolumeAnalysis.vue`

- [ ] 8. Quick Analysis Dashboard - Signal Summary Card

  **What to do**:
  - Buat component `QuickAnalysis.vue`
  - Fetch multiple indicators sekaligus: RSI, MACD, BBANDS, SMA(50), SMA(200)
  - Tampilkan signal summary cards:
    - RSI Level: Overbought (>70) / Oversold (<30) / Neutral
    - MACD Signal: Bullish crossover / Bearish crossover / Neutral
    - BB Position: Above upper / Below lower / Middle
    - Trend: SMA(50) > SMA(200) = Uptrend, else Downtrend
  - Tambah sebagai tab baru di DashboardPage.vue
  - User bisa pilih saham dari dropdown

  **Must NOT do**:
  - JANGAN gunakan dummy data
  - JANGAN modifikasi indicator calculation (hanya display)
  - JANGAN tambah state management library

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Frontend UI component dengan visual indicators
  - **Skills**: []
    - Tidak perlu skills spesifik

  **Parallelization**:
  - **Can Run In Parallel**: NO (sequential after Tasks 5, 6, 7)
  - **Parallel Group**: Wave 2 (sequential)
  - **Blocks**: Task 11
  - **Blocked By**: Task 5 (Volume MA), Task 6 (OBV), Task 7 (Volume Spike)

  **References**:

  **Pattern References**:
  - `frontend/src/components/StockDetail.vue` - Cara fetch indicators dan display
  - `frontend/src/components/StockChart.vue` - Cara display stats cards
  - `frontend/src/components/DashboardPage.vue` - Cara menambah tab baru

  **API/Type References**:
  - `GET /api/emiten/:symbol/indicators` - Endpoint untuk fetch multiple indicators
  - `backend/lib/indicator-registry.js:RSI,MACD,BBANDS` - Indicator configs (bounds, levels)

  **WHY Each Reference Matters**:
  - StockDetail.vue: Untuk paham pattern fetch indicators dan split overlay/oscillator
  - DashboardPage.vue: Untuk paham cara menambah tab baru ke menu

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Quick Analysis Dashboard render
    Tool: Playwright
    Preconditions: Frontend running, volume data ada
    Steps:
      1. Buka: http://localhost:5173/dashboard
      2. Klik tab "Quick Analysis" (atau nama yang dipilih)
      3. Verifikasi: Ada dropdown untuk pilih saham
      4. Pilih saham BBCA
      5. Verifikasi: Ada 4 signal cards (RSI, MACD, BB, Trend)
      6. Verifikasi: Setiap card punya icon/warna (hijau=buy, merah=sell, kuning=neutral)
    Expected Result: Dashboard render dengan 4 signal cards
    Failure Indicators: Component tidak ada, error render, missing cards
    Evidence: .omo/evidence/task-8-quick-analysis-dashboard.png

  Scenario: Signal accuracy check
    Tool: Bash (curl)
    Preconditions: Backend running
    Steps:
      1. Fetch RSI: `curl -s "http://localhost:3001/api/emiten/BBCA/indicators?timeframe=1d&indicators=RSI:period=14" | jq '.indicators[0].data.rsi[-1]'`
      2. Fetch MACD: `curl -s "http://localhost:3001/api/emiten/BBCA/indicators?timeframe=1d&indicators=MACD" | jq '.indicators[0].data'`
      3. Compare dengan signal di dashboard
    Expected Result: Signal di dashboard match dengan data API
    Failure Indicators: Signal salah, data mismatch
    Evidence: .omo/evidence/task-8-signal-accuracy.txt
  ```

  **Commit**: YES
  - Message: `feat(dashboard): add quick analysis signal summary`
  - Files: `frontend/src/components/QuickAnalysis.vue`

- [ ] 9. Current-day Broker Flow Visualization

  **What to do**:
  - Buat component `BrokerFlow.vue`
  - Fetch data dari `GET /api/broker/top`
  - Aggregate data per group: Foreign, Local, Government
  - Hitung: total buy, total sell, net flow per group
  - Tampilkan:
    - Summary cards: Foreign Net Buy/Sell, Local Net Buy/Sell
    - Bar chart: Perbandingan net flow antar group
    - Top 5 brokers per group dengan net value
  - Tambah sebagai tab baru di DashboardPage.vue

  **Must NOT do**:
  - JANGAN modifikasi endpoint `/api/broker/top`
  - JANGAN tambah historical data (itu Task 10)
  - JANGAN gunakan WebSocket (tetap polling)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Frontend UI dengan chart visualization
  - **Skills**: []
    - Tidak perlu skills spesifik

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 10, 11)
  - **Blocks**: Task 10 (tidak blocking, tapi related)
  - **Blocked By**: None (data sudah ada di `/api/broker/top`)

  **References**:

  **Pattern References**:
  - `frontend/src/components/BrokerTop.vue` - Current broker display, bisa diextend
  - `frontend/src/components/TrendingView.vue` - Contoh chart dengan vue-chartjs

  **API/Type References**:
  - `GET /api/broker/top` - Response structure: `{data: {list: [{code, name, group, net_value, buy_value, sell_value}]}}`
  - `frontend/src/components/BrokerTop.vue` - Filter by group (Asing/Lokal/Pemerintah)

  **WHY Each Reference Matters**:
  - BrokerTop.vue: Untuk paham data structure dan filter pattern
  - TrendingView.vue: Untuk copy chart pattern dengan vue-chartjs

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Broker Flow Dashboard render
    Tool: Playwright
    Preconditions: Frontend running, Stockbit token valid
    Steps:
      1. Buka: http://localhost:5173/dashboard
      2. Klik tab "Broker Flow" (atau nama yang dipilih)
      3. Verifikasi: Ada 2 summary cards (Foreign Net, Local Net)
      4. Verifikasi: Ada bar chart perbandingan
      5. Verifikasi: Ada top 5 brokers per group
    Expected Result: Dashboard render dengan data broker
    Failure Indicators: Component tidak ada, data kosong, error render
    Evidence: .omo/evidence/task-9-broker-flow-dashboard.png

  Scenario: Data accuracy check
    Tool: Bash (curl)
    Preconditions: Backend running
    Steps:
      1. Fetch broker data: `curl -s http://localhost:3001/api/broker/top | jq '.data.list | group_by(.group) | map({group: .[0].group, count: length})'`
      2. Compare dengan data di dashboard
    Expected Result: Data di dashboard match dengan API
    Failure Indicators: Data mismatch, missing groups
    Evidence: .omo/evidence/task-9-broker-data-accuracy.txt
  ```

  **Commit**: YES
  - Message: `feat(broker): add current-day flow visualization`
  - Files: `frontend/src/components/BrokerFlow.vue`

- [ ] 10. Historical Broker Snapshot Worker

  **What to do**:
  - Buat model `backend/models/BrokerSnapshot.js`
    - Fields: date, group (foreign/local/government), buy_value, sell_value, net_value, top_brokers[]
    - Unique compound index: (date, group)
  - Buat worker `backend/workers/fetch-broker-snapshot.js`
    - Fetch dari `/api/broker/top` (atau langsung dari Stockbit API)
    - Simpan snapshot per group per hari
    - Schedule: Run setiap hari jam 17:00 WIB (setelah market close)
  - Buat endpoint: `GET /api/broker/history?days=30`
    - Return historical broker flow data untuk trend analysis

  **Must NOT do**:
  - JANGAN fetch terlalu sering (1x per hari cukup)
  - JANGAN hapus data lama (simpan untuk historical analysis)
  - JANGAN block server (run sebagai worker/background job)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Backend model + worker implementation
  - **Skills**: []
    - Tidak perlu skills spesifik

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 9, 11)
  - **Blocks**: None (ini enhancement)
  - **Blocked By**: None (bisa dimulai kapan saja)

  **References**:

  **Pattern References**:
  - `backend/workers/fetch-snapshots.js` - Contoh worker dengan schedule (setiap 5 menit)
  - `backend/models/Snapshot.js` - Contoh model dengan TTL auto-delete

  **API/Type References**:
  - `backend/models/BrokerSnapshot.js` - Model baru (akan dibuat)
  - `GET /api/broker/top` - Data source untuk snapshot

  **WHY Each Reference Matters**:
  - fetch-snapshots.js: Untuk copy pattern worker schedule yang sudah ada
  - Snapshot.js: Untuk paham pattern model dengan TTL

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: BrokerSnapshot model creation
    Tool: Bash (node)
    Preconditions: Backend dependencies installed
    Steps:
      1. Jalankan: `cd backend && node -e "const BrokerSnapshot = require('./models/BrokerSnapshot'); console.log(BrokerSnapshot.schema.paths);"`
      2. Cek fields: date, group, buy_value, sell_value, net_value, top_brokers
    Expected Result: Model exists dengan fields yang benar
    Failure Indicators: Model tidak ada, fields missing
    Evidence: .omo/evidence/task-10-model-verification.txt

  Scenario: Worker execution
    Tool: Bash (node)
    Preconditions: Backend running, Stockbit token valid
    Steps:
      1. Jalankan: `cd backend && node workers/fetch-broker-snapshot.js`
      2. Tunggu worker selesai
      3. Cek MongoDB: `curl -s "http://localhost:3001/api/broker/history?days=1" | jq '.data | length'`
      4. Expected: > 0 (ada data snapshot)
    Expected Result: Worker berhasil simpan snapshot ke MongoDB
    Failure Indicators: Worker crash, data tidak tersimpan
    Evidence: .omo/evidence/task-10-worker-execution.txt

  Scenario: Historical endpoint
    Tool: Bash (curl)
    Preconditions: Worker sudah pernah jalan
    Steps:
      1. Jalankan: `curl -s "http://localhost:3001/api/broker/history?days=7" | jq '.data[0]'`
      2. Cek response: date, group, net_value
    Expected Result: Historical data tersedia
    Failure Indicators: Endpoint tidak ada, data kosong
    Evidence: .omo/evidence/task-10-historical-endpoint.txt
  ```

  **Commit**: YES
  - Message: `feat(broker): add historical broker snapshot worker`
  - Files: `backend/models/BrokerSnapshot.js`, `backend/workers/fetch-broker-snapshot.js`

- [ ] 11. Quick Analysis Dashboard - Preset Indikator

  **What to do**:
  - Update component `QuickAnalysis.vue` (dari Task 8)
  - Tambah preset indicators selector:
    - **Moving Averages**: SMA(50) + SMA(200) + EMA(20)
    - **Bollinger + RSI**: BBANDS(20) + RSI(14)
    - **MACD + RSI**: MACD(12,26,9) + RSI(14)
    - **Trend Following**: SMA(50) + SMA(200) + MACD
  - User bisa pilih preset dari dropdown
  - Fetch indicators sesuai preset yang dipilih
  - Tampilkan di chart (overlay) dan oscillator panel

  **Must NOT do**:
  - JANGAN modifikasi indicator calculation (hanya display)
  - JANGAN hapus signal summary cards (Task 8)
  - JANGAN tambah state management library

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Frontend UI dengan preset selector dan chart integration
  - **Skills**: []
    - Tidak perlu skills spesifik

  **Parallelization**:
  - **Can Run In Parallel**: NO (sequential after Task 8)
  - **Parallel Group**: Wave 3 (sequential)
  - **Blocks**: None (ini final feature)
  - **Blocked By**: Task 8 (Quick Analysis Dashboard harus ada dulu)

  **References**:

  **Pattern References**:
  - `frontend/src/components/StockDetail.vue` - Cara fetch indicators dan pass ke StockChart
  - `frontend/src/components/StockChart.vue` - Cara render overlay indicators

  **API/Type References**:
  - `backend/lib/indicator-registry.js` - Indicator configs untuk preset definitions
  - `GET /api/emiten/:symbol/indicators` - Endpoint untuk fetch multiple indicators

  **WHY Each Reference Matters**:
  - StockDetail.vue: Untuk paham pattern fetch indicators dan split overlay/oscillator
  - indicator-registry.js: Untuk copy preset definitions yang sudah ada (4 presets)

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Preset selector render
    Tool: Playwright
    Preconditions: Frontend running, Task 8 selesai
    Steps:
      1. Buka: http://localhost:5173/dashboard
      2. Klik tab "Quick Analysis"
      3. Cari dropdown "Preset Indicators" (atau nama yang dipilih)
      4. Verifikasi: Ada 4 preset options (Moving Averages, Bollinger+RSI, MACD+RSI, Trend Following)
      5. Pilih preset "Moving Averages"
      6. Verifikasi: Chart update dengan SMA(50), SMA(200), EMA(20) overlays
    Expected Result: Preset selector works, chart updates dengan indicators
    Failure Indicators: Dropdown tidak ada, chart tidak update, indicators salah
    Evidence: .omo/evidence/task-11-preset-selector.png

  Scenario: Preset indicators accuracy
    Tool: Bash (curl)
    Preconditions: Backend running
    Steps:
      1. Fetch preset indicators: `curl -s "http://localhost:3001/api/emiten/BBCA/indicators?timeframe=1y&indicators=SMA:period=50,SMA:period=200,EMA:period=20" | jq '.indicators | length'`
      2. Expected: 3 (tiga indicators)
      3. Compare dengan data di dashboard
    Expected Result: Indicators match antara API dan dashboard
    Failure Indicators: Data mismatch, missing indicators
    Evidence: .omo/evidence/task-11-preset-accuracy.txt
  ```

  **Commit**: YES
  - Message: `feat(dashboard): add preset indicators to quick analysis`
  - Files: `frontend/src/components/QuickAnalysis.vue`

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, curl endpoint, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .omo/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run linter + check all changed files for: empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names (data/result/item/temp).
  Output: `Lint [PASS/FAIL] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high`
  Start from clean state. Execute EVERY QA scenario from EVERY task — follow exact steps, capture evidence. Test cross-task integration (features working together, not isolation). Test edge cases: empty state, invalid input, rapid actions. Save to `.omo/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff (git log/diff). Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance. Detect cross-task contamination: Task N touching Task M's files. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

| Task | Commit Message | Files |
|------|----------------|-------|
| 1 | `docs(api): audit stockbit api for OHLC and volume data` | docs/api-audit.md |
| 2 | `feat(models): add volume field to ChartPrice schema` | backend/models/ChartPrice.js |
| 3 | `feat(api): store volume data in fetch-chart endpoint` | backend/server.js |
| 4 | `data: backfill volume data for all emiten` | backend/scripts/backfill-volume.js |
| 5 | `feat(analysis): add volume moving average indicator` | backend/lib/indicator-registry.js, backend/lib/technical-analysis.js |
| 6 | `feat(analysis): add OBV indicator with real volume data` | backend/lib/indicator-registry.js, backend/lib/technical-analysis.js |
| 7 | `feat(analysis): add volume spike detection` | backend/server.js, frontend/src/components/VolumeAnalysis.vue |
| 8 | `feat(dashboard): add quick analysis signal summary` | frontend/src/components/QuickAnalysis.vue |
| 9 | `feat(broker): add current-day flow visualization` | frontend/src/components/BrokerFlow.vue |
| 10 | `feat(broker): add historical broker snapshot worker` | backend/workers/fetch-broker-snapshot.js, backend/models/BrokerSnapshot.js |
| 11 | `feat(dashboard): add preset indicators to quick analysis` | frontend/src/components/QuickAnalysis.vue |

---

## Success Criteria

### Verification Commands
```bash
# Data Foundation
curl -s http://localhost:3001/api/prices/BBCA?timeframe=1y | jq '.data.prices[0] | has("volume")'
# Expected: true

# Volume Analysis
curl -s "http://localhost:3001/api/emiten/BBCA/indicators?timeframe=1y&indicators=OBV" | jq '.indicators[0].data.obv | length'
# Expected: > 0

# Broker Flow
curl -s "http://localhost:3001/api/broker/flow-summary" | jq '.foreign | has("net_value")'
# Expected: true

# Quick Analysis
curl -s "http://localhost:3001/api/emiten/BBCA/indicators?timeframe=1y&indicators=RSI:period=14,MACD,BBANDS:period=20" | jq '.indicators | length'
# Expected: 3
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] All QA scenarios pass
- [ ] Evidence files exist in .omo/evidence/
- [ ] No dummy volume data displayed to users
