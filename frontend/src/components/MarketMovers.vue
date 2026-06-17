<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'

const API_BASE = ''
const emit = defineEmits(['select-emiten'])

const moverTabs = [
  { key: 'MOVER_TYPE_TOP_GAINER', label: 'Gainer', icon: '▲' },
  { key: 'MOVER_TYPE_TOP_LOSER', label: 'Loser', icon: '▼' },
  { key: 'MOVER_TYPE_TOP_VALUE', label: 'Value', icon: 'Rp' },
  { key: 'MOVER_TYPE_TOP_VOLUME', label: 'Volume', icon: '◉' },
]

const activeTab = ref('MOVER_TYPE_TOP_GAINER')
const rawData = ref(null)
const loading = ref(false)
const error = ref('')
const searchQuery = ref('')
const currentPage = ref(1)
const itemsPerPage = 20

const stocks = computed(() => {
  if (!rawData.value?.data?.mover_list) return []
  return rawData.value.data.mover_list.map(item => ({
    symbol: item.stock_detail?.code || '',
    name: item.stock_detail?.name || '',
    iconUrl: item.stock_detail?.icon_url || '',
    price: item.price || 0,
    change: item.change?.value || 0,
    changePercent: item.change?.percentage || 0,
    valueRaw: item.value?.raw || 0,
    valueFormatted: item.value?.formatted || '-',
    volumeRaw: item.volume?.raw || 0,
    volumeFormatted: item.volume?.formatted || '-',
    frequencyRaw: item.frequency?.raw || 0,
    frequencyFormatted: item.frequency?.formatted || '-',
    netForeignBuy: item.net_foreign_buy?.formatted || '-',
    netForeignSell: item.net_foreign_sell?.formatted || '-',
    hasUma: item.stock_detail?.has_uma || false,
    notations: item.stock_detail?.notations || [],
    hasCorpAction: item.stock_detail?.corpaction?.active || false,
    corpActionText: item.stock_detail?.corpaction?.text || '',
    iep: item.iepiev_detail?.iep?.raw || 0,
    iev: item.iepiev_detail?.iev?.raw || 0,
    ieval: item.iepiev_detail?.ieval?.formatted || '-',
  }))
})

const filteredStocks = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return stocks.value
  return stocks.value.filter(
    s => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
  )
})

const totalPages = computed(() => Math.ceil(filteredStocks.value.length / itemsPerPage))
const paginatedStocks = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  return filteredStocks.value.slice(start, start + itemsPerPage)
})

const moverMeta = computed(() => rawData.value?.data || null)

async function fetchData() {
  loading.value = true; error.value = ''; rawData.value = null
  try {
    const res = await axios.get(`${API_BASE}/api/market-movers`, {
      params: { type: activeTab.value, _t: Date.now() },
      headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
    })
    rawData.value = res.data
  } catch (err) {
    error.value = err.response?.data?.error || err.message
  } finally {
    loading.value = false
  }
}

function switchTab(tab) {
  if (tab === activeTab.value) return
  activeTab.value = tab
  currentPage.value = 1
  searchQuery.value = ''
  fetchData()
}

function selectStock(symbol) {
  if (symbol) emit('select-emiten', symbol)
}

function goToPage(p) { if (p >= 1 && p <= totalPages.value) currentPage.value = p }
function prevPage() { if (currentPage.value > 1) currentPage.value-- }
function nextPage() { if (currentPage.value < totalPages.value) currentPage.value++ }

function fmtPrice(p) {
  if (!p && p !== 0) return '-'
  return 'Rp ' + p.toLocaleString('id-ID')
}

function isUp(v) { return (v || 0) >= 0 }

function formatVol(vol) {
  if (!vol && vol !== 0) return '-'
  if (vol >= 1e12) return (vol / 1e12).toFixed(2) + 'T'
  if (vol >= 1e9) return (vol / 1e9).toFixed(2) + 'B'
  if (vol >= 1e6) return (vol / 1e6).toFixed(2) + 'M'
  if (vol >= 1e3) return (vol / 1e3).toFixed(2) + 'K'
  return vol.toString()
}

const tabLabel = computed(() => moverTabs.find(t => t.key === activeTab.value)?.label || '')

onMounted(fetchData)
</script>

<template>
  <div class="market-movers">
    <!-- Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">Market Movers</h1>
        <p class="page-subtitle">Top stocks by {{ tabLabel }} — real-time from IDX</p>
      </div>
      <div class="header-actions">
        <span v-if="moverMeta" class="meta-info">
          {{ stocks.length }} stocks
        </span>
        <button class="btn-refresh" @click="fetchData" :disabled="loading">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>
          {{ loading ? 'Loading...' : 'Refresh' }}
        </button>
      </div>
    </div>

    <!-- Filter Tabs -->
    <div class="filter-bar">
      <div class="mover-pills">
        <button v-for="tab in moverTabs" :key="tab.key"
          class="mover-pill" :class="{ active: activeTab === tab.key }"
          @click="switchTab(tab)">
          <span class="pill-icon" :class="tab.key.includes('LOSER') ? 'down' : tab.key.includes('GAINER') ? 'up' : ''">{{ tab.icon }}</span>
          {{ tab.label }}
        </button>
      </div>
      <div class="search-box">
        <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input v-model="searchQuery" type="text" placeholder="Cari saham..." />
      </div>
    </div>

    <!-- Error -->
    <div v-if="error" class="error-msg">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      {{ error }}
    </div>

    <!-- Loading -->
    <div v-if="loading && !stocks.length" class="loading-state">
      <div class="loading-spinner"></div>
      <span>Memuat data market movers...</span>
    </div>

    <!-- Empty -->
    <div v-else-if="!stocks.length" class="empty-state">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.3"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>
      <p v-if="searchQuery">Tidak ada saham cocok dengan "{{ searchQuery }}"</p>
      <p v-else>Tidak ada data {{ tabLabel }} tersedia</p>
      <button class="btn-retry" @click="fetchData">Coba Lagi</button>
    </div>

    <!-- Card Grid -->
    <div v-else class="stock-grid">
      <div v-for="stock in paginatedStocks" :key="stock.symbol"
        class="stock-card" @click="selectStock(stock.symbol)">

        <!-- Top Row: Icon + Symbol + Name -->
        <div class="card-top">
          <div class="stock-info">
            <img v-if="stock.iconUrl" :src="stock.iconUrl" class="stock-icon" alt="" @error="e => e.target.style.display='none'" />
            <div class="stock-text">
              <span class="stock-symbol">{{ stock.symbol }}</span>
              <span class="stock-name">{{ stock.name }}</span>
            </div>
          </div>
          <div class="stock-badges">
            <span v-if="stock.hasCorpAction" class="badge ca" title="Corporate Action">CA</span>
            <span v-for="n in stock.notations" :key="n.code" class="badge notation" :title="n.description">{{ n.code }}</span>
          </div>
        </div>

        <!-- Price + Change -->
        <div class="card-price-row">
          <span class="price-value">{{ fmtPrice(stock.price) }}</span>
          <span class="price-change" :class="{ up: isUp(stock.change), down: !isUp(stock.change) }">
            {{ stock.change >= 0 ? '+' : '' }}{{ stock.change.toLocaleString('id-ID') }}
            ({{ stock.changePercent >= 0 ? '+' : '' }}{{ stock.changePercent.toFixed(2) }}%)
          </span>
        </div>

        <!-- Stats Grid -->
        <div class="card-stats">
          <div class="stat-item">
            <span class="stat-label">Volume</span>
            <span class="stat-value">{{ stock.volumeFormatted }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Nilai</span>
            <span class="stat-value">{{ stock.valueFormatted }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Freq</span>
            <span class="stat-value">{{ stock.frequencyFormatted }}</span>
          </div>
        </div>

        <!-- Net Foreign -->
        <div v-if="stock.netForeignBuy !== '-' || stock.netForeignSell !== '-'" class="card-nf">
          <span class="nf-label">Net Foreign</span>
          <div class="nf-rows">
            <span v-if="stock.netForeignBuy !== '-'" class="nf-buy">▲ {{ stock.netForeignBuy }}</span>
            <span v-if="stock.netForeignSell !== '-'" class="nf-sell">▼ {{ stock.netForeignSell }}</span>
          </div>
        </div>

        <!-- IEP/IEV subtle row -->
        <div v-if="stock.iep > 0 || stock.iev > 0" class="card-iep">
          <span class="nf-label">IEP {{ stock.iep }} · IEV {{ stock.iev }}</span>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="pagination">
      <button class="page-btn" :disabled="currentPage <= 1" @click="prevPage">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <button v-for="p in totalPages" :key="p" class="page-btn" :class="{ active: p === currentPage }"
        @click="goToPage(p)">{{ p }}</button>
      <button class="page-btn" :disabled="currentPage >= totalPages" @click="nextPage">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.market-movers {
  --blue: #205BFC; --green: #21BF73; --red: #EF3A3A;
  --bg: #F8FAFC; --surface: #FFFFFF; --text: #0F172A;
  --text2: #475569; --text3: #94A3B8; --border: rgba(0,0,0,0.05);
  --radius: 20px; --radius-sm: 14px; --radius-xs: 10px;
  --shadow: 0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.04);
  --shadow-hover: 0 4px 20px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.04);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  color: var(--text);
}

/* ─── HEADER ─── */
.page-header {
  display: flex; justify-content: space-between; align-items: flex-end;
  margin-bottom: 20px; gap: 16px; flex-wrap: wrap;
}
.page-title {
  font-family: 'DM Sans', 'Inter', sans-serif;
  font-size: 28px; font-weight: 800; margin: 0; letter-spacing: -1px;
}
.page-subtitle {
  font-size: 14px; color: var(--text2); margin: 2px 0 0; font-weight: 400;
}
.header-actions { display: flex; align-items: center; gap: 16px; }
.meta-info {
  font-size: 13px; font-weight: 600; color: var(--text3);
  background: var(--bg); padding: 6px 14px; border-radius: 100px;
}
.btn-refresh {
  display: inline-flex; align-items: center; gap: 8px;
  height: 42px; padding: 0 18px;
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 100px; font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 600;
  color: var(--text); cursor: pointer; transition: all 0.2s ease; white-space: nowrap;
}
.btn-refresh:hover:not(:disabled) { box-shadow: var(--shadow-hover); transform: translateY(-1px); border-color: rgba(0,0,0,0.1); }
.btn-refresh:disabled { opacity: 0.5; cursor: not-allowed; }

/* ─── FILTER BAR ─── */
.filter-bar {
  display: flex; justify-content: space-between; align-items: center;
  gap: 16px; margin-bottom: 20px; flex-wrap: wrap;
}
.mover-pills {
  display: flex; gap: 4px; background: var(--bg); border-radius: 100px; padding: 4px;
}
.mover-pill {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 18px; border: none; background: transparent; border-radius: 100px;
  font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 600; color: var(--text2);
  cursor: pointer; transition: all 0.2s ease; white-space: nowrap;
}
.mover-pill:hover { color: var(--text); }
.mover-pill.active { background: white; color: var(--text); box-shadow: var(--shadow); }
.pill-icon { font-size: 11px; font-weight: 700; }
.pill-icon.up { color: var(--green); }
.pill-icon.down { color: var(--red); }
.search-box {
  position: relative; min-width: 240px;
}
.search-box input {
  width: 100%; height: 42px; padding: 0 16px 0 40px;
  border: 1px solid var(--border); border-radius: 100px;
  background: var(--surface); font-family: inherit; font-size: 13px; font-weight: 500;
  color: var(--text); transition: all 0.2s ease; outline: none; box-sizing: border-box;
}
.search-box input::placeholder { color: var(--text3); }
.search-box input:focus { border-color: var(--blue); box-shadow: 0 0 0 3px rgba(32,91,252,0.1); }
.search-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--text3); pointer-events: none; }

/* ─── ERROR ─── */
.error-msg {
  display: flex; align-items: center; gap: 10px;
  padding: 14px 18px; background: rgba(239,58,58,0.06); border: 1px solid rgba(239,58,58,0.15);
  border-radius: var(--radius-sm); color: var(--red); font-size: 13px; font-weight: 500;
  margin-bottom: 20px;
}

/* ─── LOADING ─── */
.loading-state {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 80px 20px; gap: 16px; color: var(--text3); font-size: 14px;
}
.loading-spinner { width: 36px; height: 36px; border: 3px solid rgba(0,0,0,0.06); border-top-color: var(--blue); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ─── EMPTY ─── */
.empty-state {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 80px 20px; gap: 16px; color: var(--text3);
}
.empty-state p { font-size: 14px; margin: 0; }
.btn-retry {
  padding: 10px 24px; border: 1px solid var(--border); border-radius: 100px;
  background: var(--surface); font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 600;
  color: var(--text); cursor: pointer; transition: all 0.2s ease;
}
.btn-retry:hover { box-shadow: var(--shadow-hover); }

/* ─── STOCK GRID ─── */
.stock-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

.stock-card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius); padding: 20px;
  box-shadow: var(--shadow); cursor: pointer;
  transition: all 0.25s ease;
  display: flex; flex-direction: column; gap: 12px;
}
.stock-card:hover {
  box-shadow: var(--shadow-hover); transform: translateY(-2px);
  border-color: rgba(0,0,0,0.08);
}

/* Card Top */
.card-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
.stock-info { display: flex; align-items: center; gap: 12px; min-width: 0; flex: 1; }
.stock-icon { width: 36px; height: 36px; border-radius: 10px; object-fit: contain; background: var(--bg); flex-shrink: 0; }
.stock-text { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.stock-symbol { font-family: 'DM Sans', 'Inter', sans-serif; font-size: 15px; font-weight: 700; color: var(--text); letter-spacing: -0.3px; }
.stock-name { font-size: 11px; color: var(--text2); font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.stock-badges { display: flex; gap: 4px; flex-shrink: 0; flex-wrap: wrap; }
.badge {
  font-size: 9px; font-weight: 700; padding: 2px 7px; border-radius: 5px;
  text-transform: uppercase; letter-spacing: 0.5px;
}
.badge.ca { background: rgba(32,91,252,0.08); color: var(--blue); }
.badge.notation { background: rgba(239,58,58,0.08); color: var(--red); }

/* Price Row */
.card-price-row { display: flex; align-items: baseline; gap: 12px; }
.price-value { font-family: 'DM Sans', 'Inter', sans-serif; font-size: 22px; font-weight: 700; color: var(--text); letter-spacing: -0.5px; }
.price-change { font-size: 13px; font-weight: 600; }
.price-change.up { color: var(--green); }
.price-change.down { color: var(--red); }

/* Stats Grid */
.card-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; background: var(--bg); border-radius: var(--radius-xs); padding: 12px; }
.stat-item { display: flex; flex-direction: column; gap: 2px; }
.stat-label { font-size: 10px; font-weight: 600; color: var(--text3); text-transform: uppercase; letter-spacing: 0.5px; }
.stat-value { font-size: 13px; font-weight: 700; color: var(--text); }

/* Net Foreign */
.card-nf { display: flex; align-items: center; gap: 10px; padding: 8px 0 0; border-top: 1px solid var(--border); }
.nf-label { font-size: 10px; font-weight: 600; color: var(--text3); text-transform: uppercase; letter-spacing: 0.5px; flex-shrink: 0; }
.nf-rows { display: flex; gap: 12px; }
.nf-buy { font-size: 11px; font-weight: 600; color: var(--green); }
.nf-sell { font-size: 11px; font-weight: 600; color: var(--red); }

/* IEP subtle */
.card-iep { padding-top: 0; }
.card-iep .nf-label { font-size: 10px; color: var(--text3); font-weight: 500; }

/* ─── PAGINATION ─── */
.pagination {
  display: flex; align-items: center; justify-content: center;
  gap: 6px; margin-top: 28px;
}
.page-btn {
  width: 38px; height: 38px; display: flex; align-items: center; justify-content: center;
  border: 1px solid var(--border); border-radius: var(--radius-xs);
  background: var(--surface); font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 600;
  color: var(--text2); cursor: pointer; transition: all 0.2s ease;
}
.page-btn:hover:not(:disabled):not(.active) { border-color: rgba(0,0,0,0.12); color: var(--text); }
.page-btn.active { background: var(--text); color: white; border-color: var(--text); }
.page-btn:disabled { opacity: 0.3; cursor: not-allowed; }
</style>
