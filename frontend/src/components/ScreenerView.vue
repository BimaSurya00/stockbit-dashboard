<template>
  <div class="screener-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">Stock Screener</h1>
        <p class="page-subtitle">Cari saham berdasarkan filter teknikal & fundamental</p>
      </div>
      <div class="result-count" v-if="total > 0">
        {{ total }} saham ditemukan
      </div>
    </div>

    <!-- Filters -->
    <div class="filters-panel bento-card">
      <div class="filter-row">
        <div class="filter-group">
          <label>Cari</label>
          <input v-model="filters.search" type="text" placeholder="Symbol atau nama..." class="filter-input" @keyup.enter="applyFilters" />
        </div>
        <div class="filter-group">
          <label>Sektor</label>
          <select v-model="filters.sector" class="filter-select" @change="applyFilters">
            <option value="">Semua Sektor</option>
            <option v-for="s in sectors" :key="s" :value="s">{{ s }}</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Urutkan</label>
          <select v-model="filters.sort" class="filter-select" @change="applyFilters">
            <option value="symbol">Symbol</option>
            <option value="price">Harga</option>
            <option value="change">Perubahan</option>
            <option value="volume">Volume</option>
            <option value="marketCap">Market Cap</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Arah</label>
          <select v-model="filters.order" class="filter-select" @change="applyFilters">
            <option value="asc">Naik</option>
            <option value="desc">Turun</option>
          </select>
        </div>
      </div>

      <div class="filter-row filter-row-advanced" v-show="showAdvanced">
        <div class="filter-group">
          <label>Min Harga</label>
          <input v-model.number="filters.minPrice" type="number" class="filter-input" placeholder="0" @keyup.enter="applyFilters" />
        </div>
        <div class="filter-group">
          <label>Max Harga</label>
          <input v-model.number="filters.maxPrice" type="number" class="filter-input" placeholder="999999" @keyup.enter="applyFilters" />
        </div>
        <div class="filter-group">
          <label>Min Volume</label>
          <input v-model.number="filters.minVolume" type="number" class="filter-input" placeholder="0" @keyup.enter="applyFilters" />
        </div>
        <div class="filter-group">
          <label>Min Market Cap (M)</label>
          <input v-model.number="filters.minMarketCap" type="number" class="filter-input" placeholder="0" @keyup.enter="applyFilters" />
        </div>
      </div>

      <div class="filter-actions">
        <button class="btn-advanced" @click="showAdvanced = !showAdvanced">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          {{ showAdvanced ? 'Sembunyikan' : 'Filter Lanjutan' }}
        </button>
        <button class="btn-apply" @click="applyFilters">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          Terapkan
        </button>
        <button class="btn-reset" @click="resetFilters">
          Reset
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <span>Menjalankan screener...</span>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="error-msg">{{ error }}</div>

    <!-- Results Table -->
    <div v-else-if="stocks.length > 0" class="results-table bento-card">
      <table>
        <thead>
          <tr>
            <th>Symbol</th>
            <th>Nama</th>
            <th>Sektor</th>
            <th class="right">Harga</th>
            <th class="right">Perubahan</th>
            <th class="right">Volume</th>
            <th class="right">Market Cap</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="stock in stocks"
            :key="stock.symbol"
            @click="$emit('selectEmiten', stock.symbol)"
            class="clickable-row"
          >
            <td class="symbol-cell">{{ stock.symbol }}</td>
            <td class="name-cell">{{ stock.name }}</td>
            <td class="sector-cell">{{ stock.sector }}</td>
            <td class="right price-cell">
              {{ stock.lastPrice ? 'Rp ' + stock.lastPrice.toLocaleString('id-ID') : '-' }}
            </td>
            <td class="right" :class="stock.change >= 0 ? 'positive' : 'negative'">
              <span v-if="stock.change">
                {{ stock.change >= 0 ? '+' : '' }}{{ stock.change.toLocaleString('id-ID') }}
                ({{ stock.changePercent }}%)
              </span>
              <span v-else>-</span>
            </td>
            <td class="right">{{ stock.volume ? stock.volume.toLocaleString('id-ID') : '-' }}</td>
            <td class="right">{{ stock.marketCap ? formatMarketCap(stock.marketCap) : '-' }}</td>
          </tr>
        </tbody>
      </table>

      <!-- Pagination -->
      <div class="pagination" v-if="totalPages > 1">
        <button :disabled="page <= 1" @click="goPage(page - 1)">← Prev</button>
        <span class="page-info">Halaman {{ page }} / {{ totalPages }}</span>
        <button :disabled="page >= totalPages" @click="goPage(page + 1)">Next →</button>
      </div>
    </div>

    <!-- Empty -->
    <div v-else class="empty-state">
      <div class="empty-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      </div>
      <p class="empty-title">Tidak ada hasil</p>
      <p class="empty-desc">Coba ubah filter pencarian</p>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import axios from 'axios'

const emit = defineEmits(['selectEmiten'])

const API_BASE = ''

const stocks = ref([])
const loading = ref(false)
const error = ref(null)
const sectors = ref([])
const showAdvanced = ref(false)

const page = ref(1)
const total = ref(0)
const totalPages = ref(0)

const filters = reactive({
  search: '',
  sector: '',
  sort: 'symbol',
  order: 'asc',
  minPrice: null,
  maxPrice: null,
  minVolume: null,
  minMarketCap: null,
})

function formatMarketCap(cap) {
  if (!cap) return '-'
  if (cap >= 1e12) return 'Rp ' + (cap / 1e12).toFixed(1) + ' T'
  if (cap >= 1e9) return 'Rp ' + (cap / 1e9).toFixed(1) + ' M'
  if (cap >= 1e6) return 'Rp ' + (cap / 1e6).toFixed(1) + ' Jt'
  return 'Rp ' + cap.toLocaleString('id-ID')
}

async function applyFilters() {
  loading.value = true
  error.value = null
  page.value = 1

  try {
    const params = {
      page: 1,
      limit: 30,
      sort: filters.sort,
      order: filters.order,
    }
    if (filters.search) params.search = filters.search
    if (filters.sector) params.sector = filters.sector
    if (filters.minPrice) params.minPrice = filters.minPrice
    if (filters.maxPrice) params.maxPrice = filters.maxPrice
    if (filters.minVolume) params.minVolume = filters.minVolume
    if (filters.minMarketCap) params.minMarketCap = filters.minMarketCap

    const res = await axios.get(`${API_BASE}/api/screener`, { params })
    stocks.value = res.data?.data || []
    total.value = res.data?.pagination?.total || 0
    totalPages.value = res.data?.pagination?.totalPages || 0
    if (res.data?.filters?.sectors) {
      sectors.value = res.data.filters.sectors
    }
  } catch (err) {
    error.value = err.response?.data?.error || 'Gagal menjalankan screener'
  } finally {
    loading.value = false
  }
}

async function goPage(p) {
  if (p < 1 || p > totalPages.value) return
  page.value = p
  loading.value = true

  try {
    const params = {
      page: p,
      limit: 30,
      sort: filters.sort,
      order: filters.order,
    }
    if (filters.search) params.search = filters.search
    if (filters.sector) params.sector = filters.sector
    if (filters.minPrice) params.minPrice = filters.minPrice
    if (filters.maxPrice) params.maxPrice = filters.maxPrice
    if (filters.minVolume) params.minVolume = filters.minVolume
    if (filters.minMarketCap) params.minMarketCap = filters.minMarketCap

    const res = await axios.get(`${API_BASE}/api/screener`, { params })
    stocks.value = res.data?.data || []
  } catch (err) {
    error.value = err.response?.data?.error || 'Gagal navigasi halaman'
  } finally {
    loading.value = false
  }
}

function resetFilters() {
  filters.search = ''
  filters.sector = ''
  filters.sort = 'symbol'
  filters.order = 'asc'
  filters.minPrice = null
  filters.maxPrice = null
  filters.minVolume = null
  filters.minMarketCap = null
  showAdvanced.value = false
  applyFilters()
}

onMounted(() => {
  applyFilters()
})
</script>

<style scoped>
.screener-page {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  color: #0F172A;
  --blue: #205BFC; --green: #21BF73; --red: #EF3A3A;
  --bg: #F8FAFC; --surface: #FFFFFF; --text: #0F172A; --text2: #475569; --text3: #94A3B8;
  --border: rgba(0,0,0,0.05); --radius: 20px; --radius-sm: 14px;
  --shadow: 0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.04);
}

.page-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 16px; gap: 16px; }
.page-title { font-family: 'DM Sans', 'Inter', sans-serif; font-size: 28px; font-weight: 800; margin: 0; letter-spacing: -1px; }
.page-subtitle { font-size: 14px; color: var(--text2); margin: 2px 0 0; }
.result-count { font-size: 13px; color: var(--text3); font-weight: 500; }

/* Filters */
.filters-panel {
  padding: 20px; margin-bottom: 20px;
}
.filter-row { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; }
.filter-row-advanced { padding-top: 12px; border-top: 1px solid var(--border); }
.filter-group { display: flex; flex-direction: column; gap: 4px; min-width: 140px; flex: 1; }
.filter-group label { font-size: 11px; font-weight: 700; color: var(--text3); text-transform: uppercase; letter-spacing: 0.5px; }
.filter-input, .filter-select {
  height: 36px; padding: 0 12px; border: 1px solid var(--border); border-radius: 8px;
  font-family: 'Inter', sans-serif; font-size: 13px; color: var(--text);
  background: var(--surface); transition: border-color 0.2s ease;
}
.filter-input:focus, .filter-select:focus { outline: none; border-color: var(--blue); }

.filter-actions { display: flex; gap: 8px; align-items: center; }
.btn-advanced, .btn-reset {
  padding: 7px 14px; background: var(--bg); border: 1px solid var(--border); border-radius: 8px;
  font-size: 12px; font-weight: 600; color: var(--text2); cursor: pointer; transition: all 0.2s;
  font-family: 'Inter', sans-serif;
}
.btn-advanced:hover, .btn-reset:hover { background: var(--border); }
.btn-advanced { display: inline-flex; align-items: center; gap: 6px; }
.btn-apply {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 16px; background: var(--blue); border: none; border-radius: 8px;
  font-size: 12px; font-weight: 700; color: white; cursor: pointer; transition: all 0.2s;
  font-family: 'Inter', sans-serif;
}
.btn-apply:hover { background: #1a4fd4; }

/* Loading */
.loading-state {
  display: flex; align-items: center; justify-content: center; gap: 12px;
  padding: 60px 20px; color: var(--text2); font-size: 14px;
}
.spinner {
  width: 20px; height: 20px; border: 2px solid var(--border); border-top-color: var(--blue);
  border-radius: 50%; animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.error-msg {
  padding: 12px 16px; background: rgba(239,58,58,0.06); border: 1px solid rgba(239,58,58,0.15);
  border-radius: var(--radius-sm); color: var(--red); font-size: 13px; font-weight: 500;
}

.empty-state {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 80px 20px; text-align: center;
}
.empty-icon { color: var(--text3); margin-bottom: 16px; opacity: 0.5; }
.empty-title { font-size: 16px; font-weight: 600; margin: 0 0 8px; }
.empty-desc { font-size: 14px; color: var(--text3); margin: 0; }

/* Table */
.results-table {
  padding: 0; overflow: hidden;
}
table { width: 100%; border-collapse: collapse; }
thead th {
  padding: 12px 16px; background: var(--bg);
  font-size: 11px; font-weight: 700; color: var(--text3); text-transform: uppercase;
  text-align: left; letter-spacing: 0.5px; border-bottom: 1px solid var(--border);
}
thead th.right { text-align: right; }
tbody td {
  padding: 12px 16px; font-size: 13px; color: var(--text); border-bottom: 1px solid var(--border);
}
tbody td.right { text-align: right; font-variant-numeric: tabular-nums; }
.clickable-row { cursor: pointer; transition: background 0.15s; }
.clickable-row:hover { background: var(--bg); }
.symbol-cell { font-weight: 700; color: var(--blue); }
.name-cell { max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sector-cell { color: var(--text2); font-size: 12px; }
.positive { color: var(--green); font-weight: 600; }
.negative { color: var(--red); font-weight: 600; }

/* Pagination */
.pagination {
  display: flex; align-items: center; justify-content: center; gap: 16px;
  padding: 16px; border-top: 1px solid var(--border);
}
.pagination button {
  padding: 6px 14px; background: var(--surface); border: 1px solid var(--border); border-radius: 8px;
  font-size: 12px; font-weight: 600; color: var(--text); cursor: pointer; transition: all 0.2s;
  font-family: 'Inter', sans-serif;
}
.pagination button:hover:not(:disabled) { background: var(--bg); border-color: rgba(0,0,0,0.1); }
.pagination button:disabled { opacity: 0.4; cursor: not-allowed; }
.page-info { font-size: 13px; color: var(--text3); font-weight: 500; }

.bento-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); box-shadow: var(--shadow); }

@media (max-width: 768px) {
  .filter-row { flex-direction: column; }
  .filter-group { min-width: 100%; }
  .results-table { overflow-x: auto; }
  table { min-width: 650px; }
}
</style>
