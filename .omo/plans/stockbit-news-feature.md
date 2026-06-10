# Stockbit News Feature

## TL;DR

> **Quick Summary**: Tambah fitur berita/news dari Stockbit API untuk memberikan informasi terkini kepada trader aktif
> 
> **Deliverables**:
> - News API endpoint
> - MongoDB model untuk news storage
> - Worker untuk fetch news berkala
> - Frontend component untuk display news
> 
> **Estimated Effort**: Short (2-3 hari)
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Task 1 → Task 2 → Task 3 → Task 4
//
---

## Context

### Original Request
User ingin menambah fitur berita/news dari Stockbit API (`/stream/v3?category=STREAM_CATEGORY_NEWS`) untuk memberikan informasi terkini kepada trader aktif.

### Interview Summary
**Key Discussions**:
- **API Endpoint**: `https://exodus.stockbit.com/stream/v3?category=STREAM_CATEGORY_NEWS`
- **Auth**: Bearer token (sudah ada di project)
- **Storage**: Simpan ke MongoDB
- **Target**: Trader aktif yang butuh informasi terkini

**Research Findings**:
- Stockbit API sudah terintegrasi di project
- Pattern untuk fetch data sudah ada (getStockbitClient)
- Worker pattern sudah ada (fetch-snapshots.js)
- MongoDB pattern sudah ada (Snapshot model dengan TTL)

### Actual API Response Structure (Verified)
```json
{
  "message": "20 stream post(s) retrieved",
  "data": {
    "stream": [
      {
        "stream_id": 32606400,
        "title_url": "https://...",
        "title": "CEO CIMB Group...",
        "content": "KUALA LUMPUR - CIMB Group...",
        "content_original": "Full content...",
        "created_at": "2026-06-10 09:30:12",
        "created_display": "10 Jun 26, 09:30",
        "user": {
          "user_id": 472,
          "username": "StockbitNews",
          "fullname": "Stockbit News",
          "avatar": "https://..."
        },
        "type": "STREAM_TYPE_NEWS",
        "images": ["https://..."],
        "news_feed": {
          "source": "www.idnfinancials.com",
          "label": "idnfinancials",
          "img": "https://..."
        },
        "topics": ["IHSG", "BBNI"],
        "total_replies": 1,
        "total_likes": 3
      }
    ],
    "pagination": {
      "is_last_page": false,
      "next_cursor": 1781056814,
      "total": 20
    }
  }
}
```

**Key Fields for Database:**
- `stream_id` - Unique identifier
- `title` - News title
- `content` - News content
- `created_at` - Timestamp
- `news_feed.source` - Original source (idnfinancials, katadata, etc.)
- `topics` - Related stock symbols
- `images` - Image URLs
- `total_replies`, `total_likes` - Engagement metrics
- `pagination.next_cursor` - For pagination

---

## Work Objectives

### Core Objective
Tambah fitur berita/news dari Stockbit API untuk memberikan informasi terkini kepada trader aktif, dengan penyimpanan di MongoDB untuk akses cepat.

### Concrete Deliverables
1. **News Model** - `backend/models/News.js`
2. **News API Endpoint** - `/api/news` dan `/api/news/:id`
3. **News Worker** - `backend/workers/fetch-news.js`
4. **News Frontend** - `frontend/src/components/NewsView.vue`

### Definition of Done
- [ ] News bisa di-fetch dari Stockbit API
- [ ] News tersimpan di MongoDB
- [ ] News bisa diakses via API endpoint
- [ ] News ditampilkan di frontend
- [ ] Auto-refresh news setiap 5 menit

### Must Have
- **News Fetching**: Ambil news dari Stockbit API
- **MongoDB Storage**: Simpan news untuk akses cepat
- **API Endpoints**: GET news list, GET news by ID
- **Frontend Component**: Display news dengan format yang baik
- **Auto-refresh**: Update news secara berkala

### Must NOT Have (Guardrails)
- **JANGAN** buat WebSocket (tetap polling)
- **JANGAN** buat push notification
- **JANGAN** buat sentiment analysis
- **JANGAN** buat user-generated content
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
- **Frontend UI**: Use Playwright - Navigate, interact, assert DOM, screenshot

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately - Foundation):
├── Task 1: News Model [quick]
├── Task 2: News API Endpoint [unspecified-high]
└── Task 3: News Worker [unspecified-high]

Wave 2 (After Wave 1 - Frontend):
└── Task 4: News Frontend Component [visual-engineering]

Wave FINAL (After ALL tasks):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high)
└── Task F4: Scope fidelity check (deep)
-> Present results -> Get explicit user okay

Critical Path: Task 1 → Task 2 → Task 4 → F1-F4
Parallel Speedup: ~50% faster than sequential
Max Concurrent: 3 (Wave 1)
```

### Dependency Matrix

| Task | Depends On | Blocks |
|------|------------|--------|
| 1 | - | 2, 3, 4 |
| 2 | 1 | 4 |
| 3 | 1 | 4 |
| 4 | 1, 2, 3 | - |

### Agent Dispatch Summary

- **Wave 1**: 3 tasks - T1 → `quick`, T2 → `unspecified-high`, T3 → `unspecified-high`
- **Wave 2**: 1 task - T4 → `visual-engineering`
- **FINAL**: 4 tasks - F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

> EVERY task MUST have: Recommended Agent Profile + Parallelization info + QA Scenarios.

- [ ] 1. News Model

  **What to do**:
  - Buat file `backend/models/News.js`
  - Schema fields (berdasarkan actual API response):
    - `streamId`: Number (unique, dari `stream_id`)
    - `title`: String
    - `content`: String
    - `contentOriginal`: String (dari `content_original`)
    - `titleUrl`: String (dari `title_url`)
    - `createdAt`: Date (dari `created_at`)
    - `createdDisplay`: String (dari `created_display`)
    - `userId`: Number (dari `user.user_id`)
    - `username`: String (dari `user.username`)
    - `fullname`: String (dari `user.fullname`)
    - `userAvatar`: String (dari `user.avatar`)
    - `type`: String (default: 'STREAM_TYPE_NEWS')
    - `images`: [String] (array of image URLs)
    - `source`: String (dari `news_feed.source`)
    - `sourceLabel`: String (dari `news_feed.label`)
    - `sourceImage`: String (dari `news_feed.img`)
    - `topics`: [String] (array of related stock symbols)
    - `totalReplies`: Number
    - `totalLikes`: Number
    - `fetchedAt`: Date (auto)
  - Indexes: `(streamId)`, `(createdAt)`, `(topics)`, `(source)`

  **Must NOT do**:
  - JANGAN buat schema terlalu kompleks
  - JANGAN hapus field yang mungkin dibutuhkan nanti

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple model creation, 1 file
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3)
  - **Blocks**: Task 2, Task 3, Task 4
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `backend/models/Snapshot.js` - Contoh model dengan TTL dan indexes
  - `backend/models/Emiten.js` - Contoh model dengan array field

  **External References**:
  - Actual API response structure (documented di Context section)

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: News model exists
    Tool: Bash (node)
    Steps:
      1. Jalankan: `cd backend && node -e "const News = require('./models/News'); console.log(News.modelName)"`
    Expected Result: Output: "News"
    Evidence: .omo/evidence/task-1-model.txt
  ```

  **Commit**: YES
  - Message: `feat(models): add News model for Stockbit news`
  - Files: `backend/models/News.js`

- [ ] 2. News API Endpoint

  **What to do**:
  - Tambah endpoint di `backend/server.js`:
    - `GET /api/news` - List news (paginated, filterable)
    - `GET /api/news/:id` - Detail news by streamId
  - Query params untuk `/api/news`:
    - `limit` (default: 20)
    - `cursor` (untuk pagination, dari `next_cursor`)
    - `symbol` (filter by topics)
    - `source` (filter by news_feed.source)
  - Fetch dari Stockbit API: `/stream/v3?category=STREAM_CATEGORY_NEWS`
  - Gunakan cursor-based pagination (`next_cursor` dari response)
  - Simpan ke MongoDB jika belum ada (upsert berdasarkan stream_id)

  **Must NOT do**:
  - JANGAN fetch Stockbit API setiap request (gunakan cache/MongoDB)
  - JANGAN hapus endpoint yang sudah ada

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Backend API dengan multiple endpoints
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (after Task 1)
  - **Parallel Group**: Wave 1 (with Tasks 1, 3)
  - **Blocks**: Task 4
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `backend/server.js:474-520` - Endpoint `/api/emiten/trending` (proxy ke Stockbit)
  - `backend/server.js:870-930` - Endpoint `/api/market-movers` (proxy + MongoDB cache)

  **External References**:
  - Actual API response structure (documented di Context section)
  - Pagination pattern: `next_cursor` dari response

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: News list endpoint
    Tool: Bash (curl)
    Steps:
      1. Jalankan: `curl -s http://localhost:3001/api/news | jq '.data.stream | length'`
    Expected Result: > 0 (ada news)
    Evidence: .omo/evidence/task-2-news-list.txt

  Scenario: News pagination
    Tool: Bash (curl)
    Steps:
      1. Get cursor: `CURSOR=$(curl -s http://localhost:3001/api/news | jq -r '.data.pagination.next_cursor')`
      2. Jalankan: `curl -s "http://localhost:3001/api/news?cursor=$CURSOR" | jq '.data.stream | length'`
    Expected Result: > 0 (ada news di page berikutnya)
    Evidence: .omo/evidence/task-2-news-pagination.txt

  Scenario: News filter by symbol
    Tool: Bash (curl)
    Steps:
      1. Jalankan: `curl -s "http://localhost:3001/api/news?symbol=IHSG" | jq '.data.stream | length'`
    Expected Result: >= 0 (filtered results)
    Evidence: .omo/evidence/task-2-news-filter.txt
  ```

  **Commit**: YES
  - Message: `feat(api): add news endpoints with cursor pagination`
  - Files: `backend/server.js`

- [ ] 3. News Worker

  **What to do**:
  - Buat `backend/workers/fetch-news.js`
  - Fetch news dari Stockbit API setiap 5 menit
  - Simpan ke MongoDB (skip jika sudah ada)
  - Rate limiting: 500ms antar request
  - Log progress

  **Must NOT do**:
  - JANGAN fetch terlalu sering (5 menit interval)
  - JANGAN hapus news lama (biarkan untuk historis)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Backend worker dengan schedule
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (after Task 1)
  - **Parallel Group**: Wave 1 (with Tasks 1, 2)
  - **Blocks**: Task 4
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `backend/workers/fetch-snapshots.js` - Contoh worker dengan schedule
  - `backend/workers/fetch-yahoo-volume.js` - Contoh worker dengan rate limiting

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: News worker execution
    Tool: Bash (node)
    Steps:
      1. Jalankan: `cd backend && node workers/fetch-news.js`
    Expected Result: Worker berhasil fetch dan simpan news
    Evidence: .omo/evidence/task-3-worker.txt
  ```

  **Commit**: YES
  - Message: `feat(workers): add news fetcher worker`
  - Files: `backend/workers/fetch-news.js`

- [ ] 4. News Frontend Component

  **What to do**:
  - Buat `frontend/src/components/NewsView.vue`
  - Fitur:
    - News list dengan infinite scroll
    - Filter by symbol/category
    - News detail modal
    - Auto-refresh setiap 5 menit
    - Loading & error states
  - Tambah tab "News" di DashboardPage.vue

  **Must NOT do**:
  - JANGAN buat halaman terpisah (gunakan tab)
  - JANGAN buat real-time update (polling cukup)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Frontend UI component
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (after Wave 1)
  - **Blocks**: None
  - **Blocked By**: Task 1, Task 2, Task 3

  **References**:

  **Pattern References**:
  - `frontend/src/components/TrendingView.vue` - Contoh list dengan filter
  - `frontend/src/components/FinancialReports.vue` - Contoh list dengan pagination

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: News tab renders
    Tool: Playwright
    Steps:
      1. Buka http://localhost:5173
      2. Login
      3. Klik tab "News"
    Expected Result: News list muncul
    Evidence: .omo/evidence/task-4-news-tab.png
  ```

  **Commit**: YES
  - Message: `feat(frontend): add News view component`
  - Files: `frontend/src/components/NewsView.vue`, `frontend/src/components/DashboardPage.vue`

---

## Final Verification Wave

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists. For each "Must NOT Have": search codebase for forbidden patterns.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | VERDICT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Check all changed files for: empty catches, console.log in prod, commented-out code, unused imports.
  Output: `Files [N clean/N issues] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high`
  Execute EVERY QA scenario from EVERY task. Test edge cases.
  Output: `Scenarios [N/N pass] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  Verify: everything in spec was built, nothing beyond spec was built.
  Output: `Tasks [N/N compliant] | VERDICT`

---

## Commit Strategy

| Task | Commit Message | Files |
|------|----------------|-------|
| 1 | `feat(models): add News model for Stockbit news` | backend/models/News.js |
| 2 | `feat(api): add news endpoints` | backend/server.js |
| 3 | `feat(workers): add news fetcher worker` | backend/workers/fetch-news.js |
| 4 | `feat(frontend): add News view component` | frontend/src/components/NewsView.vue, DashboardPage.vue |

---

## Success Criteria

### Verification Commands
```bash
# News list
curl -s http://localhost:3001/api/news | jq '.data | length'
# Expected: > 0

# News detail
curl -s http://localhost:3001/api/news/<id> | jq '.title'
# Expected: news title

# Frontend
# Buka http://localhost:5173 → Tab "News"
# Expected: News list muncul
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] News bisa di-fetch dari API
- [ ] News tersimpan di MongoDB
- [ ] News ditampilkan di frontend
