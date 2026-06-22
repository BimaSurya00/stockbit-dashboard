<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import axios from 'axios'

const API_BASE = ''

const emitens = ref([])
const loading = ref(false)
const error = ref('')
const searchQuery = ref('')
const selectedSector = ref('')
const currentPage = ref(1)
const totalPages = ref(1)
const totalItems = ref(0)
const itemsPerPage = ref(30)
const selectedEmiten = ref(null)
const viewMode = ref('grid') // 'grid' or 'table'
const sectors = ref([])

// Advanced filter
const showAdvanced = ref(false)
const filters = ref({
  minPrice: null,
  maxPrice: null,
  minVolume: null,
  minMarketCap: null,
  sort: 'symbol',
  order: 'asc',
})

const emit = defineEmits(['select-emiten'])

function formatMarketCap(cap) {
  if (!cap) return '-'
  if (cap >= 1e12) return 'Rp ' + (cap / 1e12).toFixed(1) + ' T'
  if (cap >= 1e9) return 'Rp ' + (cap / 1e9).toFixed(1) + ' M'
  if (cap >= 1e6) return 'Rp ' + (cap / 1e6).toFixed(1) + ' Jt'
  return 'Rp ' + cap.toLocaleString('id-ID')
}

const visiblePages = computed(() => {
  const total = totalPages.value
  const current = currentPage.value
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages = [1]
  if (current > 3) pages.push('...')
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  for (let i = start; i <= end; i++) pages.push(i)
  if (current < total - 2) pages.push('...')
  pages.push(total)
  return pages
})

async function fetchEmitens() {
  loading.value = true; error.value = ''
  try {
    const params = {
      page: currentPage.value,
      limit: itemsPerPage.value,
      sort: filters.value.sort,
      order: filters.value.order,
    }
    if (searchQuery.value) params.search = searchQuery.value
    if (selectedSector.value) params.sector = selectedSector.value
    if (filters.value.minPrice) params.minPrice = filters.value.minPrice
    if (filters.value.maxPrice) params.maxPrice = filters.value.maxPrice
    if (filters.value.minVolume) params.minVolume = filters.value.minVolume
    if (filters.value.minMarketCap) params.minMarketCap = filters.value.minMarketCap

    const res = await axios.get(`${API_BASE}/api/screener`, { params })
    emitens.value = res.data.data
    totalPages.value = res.data.pagination.totalPages
    totalItems.value = res.data.pagination.total
    if (res.data.filters?.sectors) sectors.value = res.data.filters.sectors
  } catch (err) {
    error.value = err.response?.data?.error || err.message
  } finally { loading.value = false }
}

function applyFilters() {
  currentPage.value = 1
  fetchEmitens()
}

function resetFilters() {
  searchQuery.value = ''
  selectedSector.value = ''
  filters.value = { minPrice: null, maxPrice: null, minVolume: null, minMarketCap: null, sort: 'symbol', order: 'asc' }
  showAdvanced.value = false
  currentPage.value = 1
  fetchEmitens()
}

function selectEmiten(emiten) {
  selectedEmiten.value = emiten
  if (emiten.symbol) emit('select-emiten', emiten.symbol)
}

function closeDetail() { selectedEmiten.value = null }
function goToPage(p) { if (p >= 1 && p <= totalPages.value) { currentPage.value = p; fetchEmitens() } }
function prevPage() { if (currentPage.value > 1) { currentPage.value--; fetchEmitens() } }
function nextPage() { if (currentPage.value < totalPages.value) { currentPage.value++; fetchEmitens() } }

onMounted(() => { fetchEmitens() })
</script>

<template>
  <div class="emiten-page">
    <!-- Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">Daftar Emiten</h1>
        <p class="page-subtitle">{{ totalItems.toLocaleString() }} saham tercatat di Bursa Efek Indonesia</p>
      </div>
      <div class="header-right">
        <!-- View toggle -->
        <div class="view-toggle">
          <button :class="{ active: viewMode === 'grid' }" @click="viewMode = 'grid'" title="Grid">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>
          </button>
          <button :class="{ active: viewMode === 'table' }" @click="viewMode = 'table'" title="Tabel">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
          </button>
        </div>
        <span class="page-indicator" v-if="totalPages > 1">Hal {{ currentPage }} / {{ totalPages }}</span>
        <button class="btn-refresh" @click="fetchEmitens" :disabled="loading">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>
          {{ loading ? 'Loading...' : 'Refresh' }}
        </button>
      </div>
    </div>

    <!-- Controls -->
    <div class="controls-bar">
      <div class="search-wrap">
        <svg class="search-icon-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input v-model="searchQuery" type="text" placeholder="Cari symbol atau nama..." class="search-inp" @keyup.enter="applyFilters" />
      </div>
      <select v-model="selectedSector" class="sector-select" @change="applyFilters">
        <option value="">Semua Sektor</option>
        <option v-for="s in sectors" :key="s" :value="s">{{ s }}</option>
      </select>
      <select v-model="filters.sort" class="sector-select sort-select" @change="applyFilters">
        <option value="symbol">Urut: Symbol</option>
        <option value="price">Urut: Harga</option>
        <option value="change">Urut: Perubahan</option>
        <option value="volume">Urut: Volume</option>
        <option value="marketCap">Urut: Market Cap</option>
      </select>
      <button class="btn-advanced" @click="showAdvanced = !showAdvanced" :class="{ active: showAdvanced }">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        Filter
      </button>
      <button v-if="hasActiveFilters" class="btn-reset" @click="resetFilters">Reset</button>
    </div>

    <!-- Advanced Filters -->
    <div v-if="showAdvanced" class="advanced-filters">
      <div class="af-row">
        <div class="af-group">
          <label>Min Harga</label>
          <input v-model.number="filters.minPrice" type="number" class="af-input" placeholder="0" @keyup.enter="applyFilters" />
        </div>
        <div class="af-group">
          <label>Max Harga</label>
          <input v-model.number="filters.maxPrice" type="number" class="af-input" placeholder="999999" @keyup.enter="applyFilters" />
        </div>
        <div class="af-group">
          <label>Min Volume</label>
          <input v-model.number="filters.minVolume" type="number" class="af-input" placeholder="0" @keyup.enter="applyFilters" />
        </div>
        <div class="af-group">
          <label>Min Market Cap (M)</label>
          <input v-model.number="filters.minMarketCap" type="number" class="af-input" placeholder="0" @keyup.enter="applyFilters" />
        </div>
        <div class="af-group af-actions">
          <label>&nbsp;</label>
          <button class="btn-apply" @click="applyFilters">Terapkan</button>
        </div>
      </div>
    </div>

    <div v-if="error" class="error-msg">{{ error }}</div>

    <!-- Loading Skeleton -->
    <div v-if="loading && !emitens.length" class="skeleton-grid">
      <div v-for="i in 8" :key="i" class="skel-card"><div class="shimmer"></div></div>
    </div>

    <!-- Table View -->
    <div v-else-if="viewMode === 'table' && emitens.length" class="results-table bento-card">
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
          <tr v-for="stock in emitens" :key="stock.symbol" @click="selectEmiten(stock)" class="clickable-row">
            <td class="symbol-cell">{{ stock.symbol }}</td>
            <td class="name-cell">{{ stock.name }}</td>
            <td class="sector-cell">{{ stock.sector }}</td>
            <td class="right">{{ stock.lastPrice ? 'Rp ' + stock.lastPrice.toLocaleString('id-ID') : '-' }}</td>
            <td class="right" :class="(stock.change || 0) >= 0 ? 'positive' : 'negative'">
              <span v-if="stock.change">{{ (stock.change >= 0 ? '+' : '') }}{{ stock.change.toLocaleString('id-ID') }} ({{ stock.changePercent }}%)</span>
              <span v-else>-</span>
            </td>
            <td class="right">{{ stock.volume ? stock.volume.toLocaleString('id-ID') : '-' }}</td>
            <td class="right">{{ formatMarketCap(stock.marketCap) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Grid View -->
    <div v-else class="emiten-grid">
      <div v-for="emiten in emitens" :key="emiten.symbol" class="emiten-card" @click="selectEmiten(emiten)">
        <div class="ec-header">
          <span class="ec-sym">{{ emiten.symbol }}</span>
          <span class="ec-sector">{{ emiten.sector || '—' }}</span>
        </div>
        <div class="ec-name">{{ emiten.name }}</div>
        <div class="ec-price" v-if="emiten.lastPrice">
          <span class="ecp-val">{{ 'Rp ' + emiten.lastPrice.toLocaleString('id-ID') }}</span>
          <span class="ecp-chg" :class="{ up: (emiten.change || 0) >= 0, down: (emiten.change || 0) < 0 }">
            {{ (emiten.change || 0) >= 0 ? '+' : '' }}{{ emiten.changePercent || '0' }}%
          </span>
        </div>
        <div class="ec-meta" v-if="emiten.volume || emiten.marketCap">
          <span v-if="emiten.volume" class="ec-vol">Vol: {{ emiten.volume.toLocaleString('id-ID') }}</span>
          <span v-if="emiten.marketCap" class="ec-mcap">{{ formatMarketCap(emiten.marketCap) }}</span>
        </div>
      </div>
      <div v-if="!emitens.length && !loading" class="empty-grid">Tidak ada hasil. Coba ubah filter.</div>
    </div>

    <!-- Pagination -->
    <div class="pagination" v-if="totalPages > 1">
      <button class="pg-btn" @click="prevPage" :disabled="currentPage === 1 || loading">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <div class="pg-pages">
        <template v-for="p in visiblePages" :key="p">
          <span v-if="p === '...'" class="pg-ellipsis">...</span>
          <button v-else class="pg-btn" :class="{ active: p === currentPage }" @click="goToPage(p)" :disabled="loading">{{ p }}</button>
        </template>
      </div>
      <button class="pg-btn" @click="nextPage" :disabled="currentPage === totalPages || loading">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
    </div>

    <!-- Modal -->
    <div v-if="selectedEmiten" class="modal-overlay" @click="closeDetail">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2 class="modal-title">{{ selectedEmiten.symbol }}</h2>
          <button class="modal-close" @click="closeDetail">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <p class="modal-name">{{ selectedEmiten.name }}</p>
        <div class="modal-meta">
          <span class="modal-badge">{{ selectedEmiten.sector || 'No sector' }}</span>
        </div>
        <div class="modal-stats" v-if="selectedEmiten.lastPrice">
          <div class="ms-item">
            <span class="ms-label">Last Price</span>
            <span class="ms-value">Rp {{ selectedEmiten.lastPrice.toLocaleString('id-ID') }}</span>
          </div>
          <div class="ms-item" v-if="selectedEmiten.changePercent">
            <span class="ms-label">Change</span>
            <span class="ms-value" :class="{ up: (selectedEmiten.change || 0) >= 0, down: (selectedEmiten.change || 0) < 0 }">
              {{ (selectedEmiten.change || 0) >= 0 ? '+' : '' }}{{ selectedEmiten.changePercent }}%
            </span>
          </div>
          <div class="ms-item" v-if="selectedEmiten.volume">
            <span class="ms-label">Volume</span>
            <span class="ms-value">{{ selectedEmiten.volume.toLocaleString('id-ID') }}</span>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn-primary" @click="closeDetail(); emit('select-emiten', selectedEmiten.symbol)">Lihat Detail →</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.emiten-page {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  color: #0F172A;
  --blue: #205BFC; --green: #21BF73; --red: #EF3A3A;
  --bg: #F8FAFC; --surface: #FFFFFF; --text: #0F172A; --text2: #475569; --text3: #94A3B8;
  --border: rgba(0,0,0,0.05); --radius: 20px; --radius-sm: 14px;
  --shadow: 0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.04);
  --shadow-hover: 0 4px 20px rgba(0,0,0,0.07);
  --transition: all 0.2s ease;
}

.page-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 16px; gap: 16px; flex-wrap: wrap; }
.page-title { font-family: 'DM Sans', 'Inter', sans-serif; font-size: 28px; font-weight: 800; margin: 0; letter-spacing: -1px; color: var(--text); }
.page-subtitle { font-size: 14px; color: var(--text2); margin: 2px 0 0; font-weight: 400; }
.header-right { display: flex; align-items: center; gap: 12px; }
.page-indicator { font-size: 12px; font-weight: 600; color: var(--text3); }

/* View Toggle */
.view-toggle { display: flex; background: var(--bg); border-radius: 8px; padding: 3px; }
.view-toggle button {
  display: flex; align-items: center; justify-content: center;
  width: 32px; height: 30px; border: none; background: transparent;
  border-radius: 6px; color: var(--text3); cursor: pointer; transition: var(--transition);
}
.view-toggle button.active { background: var(--surface); color: var(--text); box-shadow: 0 1px 3px rgba(0,0,0,0.06); }

.btn-refresh {
  display: inline-flex; align-items: center; gap: 8px;
  height: 38px; padding: 0 16px;
  background: var(--surface); border: 1px solid var(--border); border-radius: 100px;
  font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 600;
  color: var(--text); cursor: pointer; transition: var(--transition);
}
.btn-refresh:hover:not(:disabled) { box-shadow: var(--shadow-hover); border-color: rgba(0,0,0,0.1); }
.btn-refresh:disabled { opacity: 0.5; cursor: not-allowed; }

/* Controls */
.controls-bar { display: flex; gap: 10px; margin-bottom: 12px; flex-wrap: wrap; align-items: center; }
.search-wrap { position: relative; flex: 1 1 auto; min-width: 180px; }
.search-icon-svg { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--text3); pointer-events: none; z-index: 1; }
.search-inp {
  width: 100%; height: 38px; padding: 0 16px 0 40px;
  border: 1px solid var(--border); border-radius: 100px; background: var(--surface);
  font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 500; color: var(--text);
  outline: none; transition: var(--transition); box-sizing: border-box;
}
.search-inp::placeholder { color: var(--text3); }
.search-inp:focus { border-color: var(--blue); box-shadow: 0 0 0 3px rgba(32,91,252,0.08); }
.sector-select {
  height: 38px; padding: 0 32px 0 14px; border: 1px solid var(--border); border-radius: 100px;
  background: var(--surface); font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 600;
  color: var(--text); outline: none; cursor: pointer; transition: var(--transition);
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%2394A3B8' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 12px center;
}
.sort-select { width: 170px; }

.btn-advanced, .btn-reset {
  display: inline-flex; align-items: center; gap: 6px;
  height: 38px; padding: 0 14px; border: 1px solid var(--border); border-radius: 100px;
  background: var(--surface); font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 600;
  color: var(--text2); cursor: pointer; transition: var(--transition);
}
.btn-advanced:hover, .btn-reset:hover { border-color: rgba(0,0,0,0.12); background: var(--bg); }
.btn-advanced.active { background: var(--blue); color: white; border-color: var(--blue); }

/* Advanced Filters */
.advanced-filters {
  background: var(--bg); border-radius: 14px; padding: 16px; margin-bottom: 16px;
  border: 1px solid var(--border);
}
.af-row { display: flex; gap: 10px; flex-wrap: wrap; align-items: flex-end; }
.af-group { display: flex; flex-direction: column; gap: 4px; min-width: 120px; flex: 1; }
.af-group label { font-size: 10px; font-weight: 700; color: var(--text3); text-transform: uppercase; letter-spacing: 0.5px; }
.af-input {
  height: 34px; padding: 0 10px; border: 1px solid var(--border); border-radius: 8px;
  font-family: 'Inter', sans-serif; font-size: 13px; color: var(--text); background: var(--surface);
  outline: none; transition: var(--transition);
}
.af-input:focus { border-color: var(--blue); }
.af-actions { justify-content: flex-end; }
.btn-apply {
  height: 34px; padding: 0 16px; background: var(--blue); color: white; border: none;
  border-radius: 8px; font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 700;
  cursor: pointer; transition: var(--transition);
}
.btn-apply:hover { background: #1a4fd4; }

/* Error */
.error-msg {
  padding: 12px 16px; background: rgba(239,58,58,0.06); border: 1px solid rgba(239,58,58,0.15);
  border-radius: var(--radius-sm); color: var(--red); font-size: 13px; font-weight: 500; margin-bottom: 20px;
}

/* Skeleton */
.skeleton-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
.skel-card { height: 140px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; position: relative; }
.shimmer {
  position: absolute; inset: 0;
  background: linear-gradient(90deg, transparent 0%, rgba(148,163,184,0.08) 50%, transparent 100%);
  animation: shimmer 1.6s infinite;
}
@keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }

/* Grid */
.emiten-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
.empty-grid { grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: var(--text3); font-size: 15px; font-weight: 500; }

/* Card */
.emiten-card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius); padding: 20px; cursor: pointer;
  transition: var(--transition); box-shadow: var(--shadow);
}
.emiten-card:hover { box-shadow: var(--shadow-hover); transform: translateY(-2px); border-color: rgba(0,0,0,0.08); }
.ec-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.ec-sym { font-family: 'DM Sans', 'Inter', sans-serif; font-size: 18px; font-weight: 800; color: var(--text); letter-spacing: -0.3px; }
.ec-sector { font-size: 10px; font-weight: 700; padding: 3px 8px; background: #F1F5F9; border-radius: 6px; color: var(--text2); text-transform: uppercase; letter-spacing: 0.5px; }
.ec-name { font-size: 13px; color: var(--text2); font-weight: 500; margin-bottom: 12px; line-height: 1.4; }
.ec-price { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.ecp-val { font-size: 15px; font-weight: 700; color: var(--text); }
.ecp-chg { font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 100px; }
.ecp-chg.up { background: rgba(33,191,115,0.08); color: var(--green); }
.ecp-chg.down { background: rgba(239,58,58,0.08); color: var(--red); }
.ec-meta { display: flex; gap: 12px; font-size: 11px; }
.ec-vol { color: var(--text3); }
.ec-mcap { color: var(--text3); font-weight: 600; }

/* Table */
.results-table { padding: 0; overflow: hidden; }
.bento-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); box-shadow: var(--shadow); }
table { width: 100%; border-collapse: collapse; }
thead th {
  padding: 10px 14px; background: var(--bg);
  font-size: 10px; font-weight: 700; color: var(--text3); text-transform: uppercase;
  text-align: left; letter-spacing: 0.5px; border-bottom: 1px solid var(--border);
}
thead th.right { text-align: right; }
tbody td {
  padding: 10px 14px; font-size: 13px; color: var(--text); border-bottom: 1px solid var(--border);
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
.pagination { display: flex; justify-content: center; align-items: center; gap: 8px; margin-top: 28px; }
.pg-pages { display: flex; gap: 4px; }
.pg-btn {
  width: 38px; height: 38px; display: flex; align-items: center; justify-content: center;
  border: 1px solid var(--border); background: var(--surface); border-radius: var(--radius-sm);
  cursor: pointer; font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 600;
  color: var(--text2); transition: var(--transition);
}
.pg-btn:hover:not(:disabled) { border-color: rgba(0,0,0,0.12); background: #F8FAFC; }
.pg-btn.active { background: #0F172A; color: white; border-color: #0F172A; }
.pg-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.pg-ellipsis { display: flex; align-items: center; justify-content: center; width: 38px; height: 38px; font-size: 14px; font-weight: 600; color: var(--text3); user-select: none; }

/* Modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; backdrop-filter: blur(4px); }
.modal-content { background: var(--surface); border-radius: var(--radius); padding: 28px; max-width: 440px; width: 100%; box-shadow: 0 20px 60px rgba(0,0,0,0.15); }
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
.modal-title { font-family: 'DM Sans', 'Inter', sans-serif; font-size: 22px; font-weight: 800; margin: 0; letter-spacing: -0.5px; color: var(--text); }
.modal-close { width: 36px; height: 36px; border: none; background: #F1F5F9; border-radius: 100px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--text2); transition: var(--transition); }
.modal-close:hover { background: rgba(0,0,0,0.06); color: var(--text); }
.modal-name { font-size: 14px; color: var(--text2); margin: 4px 0 16px; }
.modal-meta { margin-bottom: 16px; }
.modal-badge { display: inline-block; font-size: 11px; font-weight: 700; padding: 4px 10px; background: #F1F5F9; border-radius: 6px; color: var(--text2); }
.modal-stats { display: flex; gap: 20px; margin-bottom: 24px; flex-wrap: wrap; }
.ms-item { display: flex; flex-direction: column; gap: 4px; }
.ms-label { font-size: 10px; font-weight: 700; color: var(--text3); text-transform: uppercase; letter-spacing: 0.8px; }
.ms-value { font-size: 18px; font-weight: 700; color: var(--text); }
.ms-value.up { color: var(--green); }
.ms-value.down { color: var(--red); }
.modal-actions { display: flex; gap: 10px; }
.btn-primary {
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  height: 42px; padding: 0 20px; width: 100%;
  background: var(--text); color: white; border: none; border-radius: 100px;
  font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 600;
  cursor: pointer; transition: var(--transition);
}
.btn-primary:hover { background: #1E293B; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }

@media (max-width: 768px) {
  .page-header { flex-direction: column; align-items: flex-start; }
  .controls-bar { flex-direction: column; align-items: stretch; }
  .search-wrap { min-width: 100%; }
  .sort-select { width: 100%; }
  .emiten-grid { grid-template-columns: 1fr; }
  .af-row { flex-direction: column; }
  .results-table { overflow-x: auto; }
  table { min-width: 600px; }
}
</style>
