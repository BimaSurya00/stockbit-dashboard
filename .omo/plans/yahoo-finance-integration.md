# Yahoo Finance Volume Integration

## TL;DR

> **Quick Summary**: Integrasi Yahoo Finance API untuk mendapatkan volume dan OHLC data yang tidak tersedia di Stockbit API, sehingga 23 technical indicators bisa fully functional.
> 
> **Deliverables**:
> - Yahoo Finance service module
> - Volume data untuk 957+ saham IDX
> - OHLC data untuk chart lebih akurat
> - Backfill script dan worker
> 
> **Estimated Effort**: Short (3-5 hari)
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Task 1 → Task 2 → Task 3 → Task 4

---

## Context

### Original Request
User ingin menambah fitur volume-based indicators (Volume MA, OBV, VWAP, MFI) tetapi Stockbit API tidak menyediakan volume data (selalu empty string). Solusi: integrasi Yahoo Finance sebagai sumber data volume dan OHLC.

### Interview Summary
**Key Discussions**:
- **Problem**: Stockbit API volume = "" (kosong)
- **Solution**: Hybrid approach - Stockbit untuk live, Yahoo untuk historical
- **Scope**: Phase 1 - Volume data saja
- **Target**: 957+ saham IDX

**Research Findings**:
- **API**: `https://query1.finance.yahoo.com/v8/finance/chart/{symbol}.JK`
- **Library**: `yahoo-finance2` (180K weekly downloads, TypeScript-first)
- **Rate Limit**: ~2000 requests/hour, need 200-500ms delays
- **Gotchas**: 10-minute delay, `.JK` suffix required
- **Response**: Includes open, high, low, close, volume

### Metis Review
**Identified Gaps** (addressed):
- **Rate limiting**: Perlu 200-500ms delay antar request
- **Error handling**: Handle 429 (rate limit) dengan exponential backoff
- **Data validation**: Verify volume data valid sebelum simpan
- **Backward compatibility**: Data lama tanpa volume masih bisa dibaca

---

## Work Objectives

### Core Objective
Integrasi Yahoo Finance API untuk mendapatkan volume dan OHLC data, sehingga volume-based technical indicators (Volume MA, OBV, VWAP, MFI) bisa fully functional.

### Concrete Deliverables
1. **Yahoo Finance Service** - `backend/lib/yahoo-finance.js`
2. **Updated ChartPrice** - Volume dan OHLC data tersimpan
3. **Backfill Script** - `backend/scripts/backfill-yahoo-volume.js`
4. **Yahoo Worker** - `backend/workers/fetch-yahoo-volume.js`

### Definition of Done
- [ ] Volume data tersedia untuk semua saham di MongoDB
- [ ] Volume MA, OBV, VWAP bisa dihitung dengan data real
- [ ] Backfill script berhasil fetch 957+ saham
- [ ] Worker berjalan otomatis untuk update volume

### Must Have
- **Yahoo Finance Service**: Module untuk fetch data dari Yahoo
- **Volume Data**: Simpan ke ChartPrice.prices[].volume
- **OHLC Data**: Simpan ke ChartPrice.prices[].open, high, low
- **Rate Limiting**: 200-500ms delay antar request
- **Error Handling**: Handle 429, network errors, invalid data
- **Backfill Script**: Fetch historical volume untuk semua saham

### Must NOT Have (Guardrails)
- **JANGAN** hapus Stockbit integration (tetap untuk live data)
- **JANGAN** fetch Yahoo terlalu sering (respect rate limit)
- **JANGAN** simpan data invalid (validasi dulu)
- **JANGAN** breaking existing functionality
- **JANGAN** buat unit tests (agent-executed QA only)

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** - ALL verification is agent-executed.

### Test Decision
- **Infrastructure exists**: NO
- **Automated tests**: NO
- **Agent-Executed QA**: ALWAYS

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.omo/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Backend API**: Use Bash (curl) - Send requests, assert status + response fields
- **Database**: Use Bash (curl) - Query data, verify fields exist

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately - Foundation):
├── Task 1: Install yahoo-finance2 package [quick]
├── Task 2: Create Yahoo Finance service module [unspecified-high]
└── Task 3: Update ChartPrice model untuk OHLC [quick]

Wave 2 (After Wave 1 - Integration):
├── Task 4: Update fetch-chart endpoint untuk include Yahoo data [unspecified-high]
└── Task 5: Create backfill script [unspecified-high]

Wave 3 (After Wave 2 - Automation):
├── Task 6: Create Yahoo volume worker [unspecified-high]
└── Task 7: Testing dan verifikasi [quick]

Wave FINAL (After ALL tasks):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high)
└── Task F4: Scope fidelity check (deep)
-> Present results -> Get explicit user okay

Critical Path: Task 1 → Task 2 → Task 4 → Task 5 → Task 6 → F1-F4
Parallel Speedup: ~50% faster than sequential
Max Concurrent: 3 (Wave 1)
```


### Dependency Matrix

| Task | Depends On | Blocks |
|------|------------|--------|
| 1 | - | 2, 4 |
| 2 | 1 | 4, 5, 6 |
| 3 | - | 4 |
| 4 | 1, 2, 3 | 5 |
| 5 | 2, 4 | 6 |
| 6 | 2, 5 | 7 |
| 7 | 6 | - |

### Agent Dispatch Summary

- **Wave 1**: 3 tasks - T1 → `quick`, T2 → `unspecified-high`, T3 → `quick`
- **Wave 2**: 2 tasks - T4 → `unspecified-high`, T5 → `unspecified-high`
- **Wave 3**: 2 tasks - T6 → `unspecified-high`, T7 → `quick`
- **FINAL**: 4 tasks - F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

> EVERY task MUST have: Recommended Agent Profile + Parallelization info + QA Scenarios.

- [ ] 1. Install yahoo-finance2 Package

  **What to do**:
  - Jalankan `npm install yahoo-finance2` di backend folder
  - Verify package terinstall dengan benar
  - Cek compatibility dengan Node.js version

  **Must NOT do**:
  - JANGAN install package lain yang tidak diperlukan
  - JANGAN update package lain

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple npm install, 1 command
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3)
  - **Blocks**: Task 2, Task 4
  - **Blocked By**: None

  **References**:

  **External References**:
  - NPM: https://www.npmjs.com/package/yahoo-finance2
  - Docs: https://github.com/gadicc/node-yahoo-finance2

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Verify package installed
    Tool: Bash
    Steps:
      1. Jalankan: `cd backend && npm list yahoo-finance2`
      2. Cek output: package name dan version
    Expected Result: yahoo-finance2 terdaftar
    Evidence: .omo/evidence/task-1-package-install.txt
  ```

  **Commit**: YES
  - Message: `deps: add yahoo-finance2 for volume data`
  - Files: `backend/package.json`, `backend/package-lock.json`

- [ ] 2. Create Yahoo Finance Service Module

  **What to do**:
  - Buat file `backend/lib/yahoo-finance.js`
  - Implementasi fungsi `fetchStockData(symbol, days)`:
    - Convert symbol ke format Yahoo (`BBCA` → `BBCA.JK`)
    - Fetch OHLCV data dari Yahoo Finance API
    - Return array: `[{ date, open, high, low, close, volume }]`
  - Implementasi rate limiting (300ms delay antar request)
  - Implementasi error handling (429, network errors)
  - Implementasi caching (in-memory, 5 menit TTL)

  **Must NOT do**:
  - JANGAN fetch tanpa delay (rate limit)
  - JANGAN simpan data invalid
  - JANGAN blocking main thread

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Backend service dengan error handling dan rate limiting
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (after Task 1)
  - **Parallel Group**: Wave 1 (with Tasks 1, 3)
  - **Blocks**: Task 4, Task 5, Task 6
  - **Blocked By**: Task 1

  **References**:

  **External References**:
  - yahoo-finance2 docs: https://github.com/gadicc/node-yahoo-finance2
  - Chart API: `https://query1.finance.yahoo.com/v8/finance/chart/{symbol}.JK`

  **Pattern References**:
  - `backend/lib/technical-analysis.js` - Contoh backend module pattern
  - `backend/workers/fetch-daily-prices.js` - Contoh rate limiting pattern

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Fetch single stock data
    Tool: Bash (node)
    Steps:
      1. Jalankan: `cd backend && node -e "const yf = require('./lib/yahoo-finance'); yf.fetchStockData('BBCA', 30).then(d => console.log(JSON.stringify(d[0], null, 2)))"`
      2. Cek output: object dengan date, open, high, low, close, volume
    Expected Result: Data valid dengan volume > 0
    Evidence: .omo/evidence/task-2-fetch-single.txt

  Scenario: Rate limiting works
    Tool: Bash (node)
    Steps:
      1. Jalankan fetch untuk 3 saham berurutan
      2. Measure waktu antara request
    Expected Result: Delay ~300ms antara request
    Evidence: .omo/evidence/task-2-rate-limit.txt
  ```

  **Commit**: YES
  - Message: `feat(lib): add yahoo-finance service for volume data`
  - Files: `backend/lib/yahoo-finance.js`

- [ ] 3. Update ChartPrice Model untuk OHLC

  **What to do**:
  - Baca `backend/models/ChartPrice.js`
  - Tambah field `open`, `high`, `low` ke `prices[]` array (Number, optional)
  - Pastikan backward compatible (data lama masih bisa dibaca)

  **Must NOT do**:
  - JANGAN hapus field yang sudah ada
  - JANGAN buat breaking change

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple schema modification
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2)
  - **Blocks**: Task 4
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `backend/models/ChartPrice.js` - Current schema (sudah ada volume field)

  **Acceptance Criteria****

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: OHLC fields exist
    Tool: Bash (node)
    Steps:
      1. Jalankan: `cd backend && node -e "const CP = require('./models/ChartPrice'); console.log(CP.schema.paths['prices'].schema.paths)"`
      2. Cek: open, high, low fields ada
    Expected Result: Fields exist
    Evidence: .omo/evidence/task-3-schema.txt
  ```

  **Commit**: YES
  - Message: `feat(models): add OHLC fields to ChartPrice schema`
  - Files: `backend/models/ChartPrice.js`

- [ ] 4. Update fetch-chart Endpoint untuk Include Yahoo Data

  **What to do**:
  - Baca `backend/server.js` (endpoint `/api/chart/:symbol`)
  - Setelah fetch dari Stockbit, fetch juga dari Yahoo Finance
  - Gabungkan data: harga dari Stockbit + volume/OHLC dari Yahoo
  - Simpan ke MongoDB dengan volume dan OHLC

  **Must NOT do**:
  - JANGAN hapus Stockbit integration
  - JANGAN fetch Yahoo jika Stockbit sudah punya volume (future-proof)
  - JANGAN blocking response (fetch Yahoo async)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Backend endpoint modification dengan multiple data sources
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (sequential)
  - **Blocks**: Task 5
  - **Blocked By**: Task 1, Task 2, Task 3

  **References**:

  **Pattern References**:
  - `backend/server.js:743-808` - Current fetch-chart endpoint
  - `backend/lib/yahoo-finance.js` - Yahoo Finance service (Task 2)

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Fetch chart dengan volume dari Yahoo
    Tool: Bash (curl)
    Steps:
      1. Jalankan: `curl -s -X POST http://localhost:3001/api/emiten/BBCA/fetch-chart -H "Content-Type: application/json" -d '{"timeframe": "1y"}'`
      2. Cek: `curl -s http://localhost:3001/api/prices/BBCA?timeframe=1y | jq '.data.prices[0] | {date, value, volume, open, high, low}'`
    Expected Result: volume > 0, open/high/low terisi
    Evidence: .omo/evidence/task-4-fetch-chart.txt
  ```

  **Commit**: YES
  - Message: `feat(api): integrate Yahoo Finance for volume/OHLC data`
  - Files: `backend/server.js`

- [ ] 5. Create Backfill Script

  **What to do**:
  - Buat `backend/scripts/backfill-yahoo-volume.js`
  - Fetch volume/OHLC dari Yahoo untuk semua 957+ saham
  - Simpan ke MongoDB (update ChartPrice)
  - Rate limiting: 500ms delay antar request
  - Log progress: emiten ke-X dari total, berhasil/gagal

  **Must NOT do**:
  - JANGAN fetch terlalu cepat (rate limit)
  - JANGAN hapus data yang sudah ada
  - JANGAN block server

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Backend script dengan rate limiting dan error handling
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (after Task 4)
  - **Blocks**: Task 6
  - **Blocked By**: Task 2, Task 4

  **References**:

  **Pattern References**:
  - `backend/scripts/backfill-volume.js` - Existing backfill script pattern
  - `backend/workers/fetch-daily-prices.js` - Rate limiting pattern

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Run backfill script
    Tool: Bash (node)
    Steps:
      1. Jalankan: `cd backend && node scripts/backfill-yahoo-volume.js`
      2. Tunggu selesai (estimasi 10-15 menit untuk 957 saham)
      3. Cek log: berapa berhasil, berapa gagal
    Expected Result: >90% berhasil
    Evidence: .omo/evidence/task-5-backfill.txt

  Scenario: Verify volume data
    Tool: Bash (curl)
    Steps:
      1. Jalankan: `curl -s http://localhost:3001/api/prices/BBCA?timeframe=1y | jq '.data.prices[0].volume'`
      2. Jalankan: `curl -s http://localhost:3001/api/prices/BBRI?timeframe=1y | jq '.data.prices[0].volume'`
    Expected Result: volume > 0 untuk semua saham
    Evidence: .omo/evidence/task-5-verify-volume.txt
  ```

  **Commit**: YES
  - Message: `data: add Yahoo Finance backfill script for volume`
  - Files: `backend/scripts/backfill-yahoo-volume.js`

- [ ] 6. Create Yahoo Volume Worker

  **What to do**:
  - Buat `backend/workers/fetch-yahoo-volume.js`
  - Fetch volume dari Yahoo untuk semua saham
  - Schedule: Jalankan setiap hari jam 18:00 WIB (setelah market close)
  - Rate limiting: 500ms delay antar request
  - Log hasil ke console

  **Must NOT do**:
  - JANGAN fetch terlalu sering
  - JANGAN block server

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Backend worker dengan schedule dan rate limiting
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (after Task 5)
  - **Blocks**: Task 7
  - **Blocked By**: Task 2, Task 5

  **References**:

  **Pattern References**:
  - `backend/workers/fetch-daily-prices.js` - Existing worker pattern
  - `backend/workers/fetch-snapshots.js` - Worker schedule pattern

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Worker execution
    Tool: Bash (node)
    Steps:
      1. Jalankan: `cd backend && node workers/fetch-yahoo-volume.js`
      2. Tunggu selesai
      3. Cek log: berhasil fetch berapa saham
    Expected Result: Worker berhasil tanpa error
    Evidence: .omo/evidence/task-6-worker.txt
  ```

  **Commit**: YES
  - Message: `feat(workers): add Yahoo Finance volume worker`
  - Files: `backend/workers/fetch-yahoo-volume.js`

- [ ] 7. Testing dan Verifikasi

  **What to do**:
  - Test volume-based indicators dengan data real:
    - Volume MA
    - OBV
    - VWAP
    - MFI
  - Verifikasi semua indicators bisa dihitung
  - Verifikasi data akurat (bukan dummy)

  **Must NOT do**:
  - JANGAN skip testing
  - JANGAN terima dummy data

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Testing dan verifikasi
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (after Task 6)
  - **Blocks**: F1-F4
  - **Blocked By**: Task 6

  **References**:

  **Pattern References**:
  - `docs/testing-guide.md` - Existing testing guide

  **Acceptance Criteria****

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Volume MA dengan real data
    Tool: Bash (curl)
    Steps:
      1. Jalankan: `curl -s "http://localhost:3001/api/emiten/BBCA/indicators?timeframe=1y&indicators=VOLUME_MA:period=20" | jq '.indicators[0].data.volume_ma[0:3]'`
    Expected Result: Values bervariasi (bukan semua sama)
    Evidence: .omo/evidence/task-7-volume-ma.txt

  Scenario: OBV dengan real data
    Tool: Bash (curl)
    Steps:
      1. Jalankan: `curl -s "http://localhost:3001/api/emiten/BBCA/indicators?timeframe=1y&indicators=OBV" | jq '.indicators[0].data.obv[0:3]'`
    Expected Result: Values bervariasi (bukan dummy 1000000)
    Evidence: .omo/evidence/task-7-obv.txt
  ```

  **Commit**: NO (testing only)

---

## Final Verification Wave

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists. For each "Must NOT Have": search codebase for forbidden patterns. Check evidence files exist.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | VERDICT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Check all changed files for: empty catches, console.log in prod, commented-out code, unused imports.
  Output: `Files [N clean/N issues] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high`
  Execute EVERY QA scenario from EVERY task. Test edge cases: empty data, invalid symbols, rate limiting.
  Output: `Scenarios [N/N pass] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  Verify: everything in spec was built, nothing beyond spec was built. Check "Must NOT do" compliance.
  Output: `Tasks [N/N compliant] | VERDICT`

---

## Commit Strategy

| Task | Commit Message | Files |
|------|----------------|-------|
| 1 | `deps: add yahoo-finance2 for volume data` | package.json, package-lock.json |
| 2 | `feat(lib): add yahoo-finance service for volume data` | backend/lib/yahoo-finance.js |
| 3 | `feat(models): add OHLC fields to ChartPrice schema` | backend/models/ChartPrice.js |
| 4 | `feat(api): integrate Yahoo Finance for volume/OHLC data` | backend/server.js |
| 5 | `data: add Yahoo Finance backfill script for volume` | backend/scripts/backfill-yahoo-volume.js |
| 6 | `feat(workers): add Yahoo Finance volume worker` | backend/workers/fetch-yahoo-volume.js |

---

## Success Criteria

### Verification Commands
```bash
# Volume data exists
curl -s http://localhost:3001/api/prices/BBCA?timeframe=1y | jq '.data.prices[0].volume'
# Expected: > 0

# Volume MA works
curl -s "http://localhost:3001/api/emiten/BBCA/indicators?timeframe=1y&indicators=VOLUME_MA:period=20" | jq '.indicators[0].data.volume_ma | length'
# Expected: > 0

# OBV works
curl -s "http://localhost:3001/api/emiten/BBCA/indicators?timeframe=1y&indicators=OBV" | jq '.indicators[0].data.obv | length'
# Expected: > 0
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] Volume data tersedia untuk semua saham
- [ ] Volume-based indicators bisa dihitung
- [ ] Backfill script berhasil
- [ ] Worker berjalan otomatis
