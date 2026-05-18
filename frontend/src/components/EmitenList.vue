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
const itemsPerPage = ref(20)
const selectedEmiten = ref(null)

const emit = defineEmits(['select-emiten'])

const sectors = computed(() => {
  const unique = new Set(emitens.value.map(e => e.sector).filter(Boolean))
  return Array.from(unique).sort()
})

const visiblePages = computed(() => {
  const total = totalPages.value
  const current = currentPage.value
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }
  const pages = []
  pages.push(1)
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
    const res = await axios.get(`${API_BASE}/api/emiten`, {
      params: { page: currentPage.value, limit: itemsPerPage.value, search: searchQuery.value, sector: selectedSector.value }
    })
    emitens.value = res.data.data
    totalPages.value = res.data.pagination.pages
    totalItems.value = res.data.pagination.total
  } catch (err) {
    error.value = err.response?.data?.error || err.message
  } finally { loading.value = false }
}

function selectEmiten(emiten) {
  selectedEmiten.value = emiten
  if (emiten.symbol) emit('select-emiten', emiten.symbol)
}

function closeDetail() { selectedEmiten.value = null }

function goToPage(p) { if (p >= 1 && p <= totalPages.value) { currentPage.value = p; fetchEmitens() } }
function prevPage() { if (currentPage.value > 1) { currentPage.value--; fetchEmitens() } }
function nextPage() { if (currentPage.value < totalPages.value) { currentPage.value++; fetchEmitens() } }

watch([searchQuery, selectedSector], () => { currentPage.value = 1; fetchEmitens() })
onMounted(() => { fetchEmitens() })
</script>

<template>
  <div class="emiten-page">
    <!-- Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">Daftar Emiten</h1>
        <p class="page-subtitle">{{ totalItems.toLocaleString() }} listed companies on Indonesia Stock Exchange</p>
      </div>
      <div class="header-right">
        <span class="page-indicator" v-if="totalPages > 1">Page {{ currentPage }} of {{ totalPages }}</span>
        <button class="btn-refresh" @click="fetchEmitens" :disabled="loading">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>
          {{ loading ? 'Loading...' : 'Refresh' }}
        </button>
      </div>
    </div>

    <!-- Controls -->
    <div class="controls-bar">
      <div class="search-wrap">
        <svg class="search-icon-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input v-model="searchQuery" type="text" placeholder="Search by symbol or name..." class="search-inp" />
      </div>
      <select v-model="selectedSector" class="sector-select">
        <option value="">All Sectors</option>
        <option v-for="sector in sectors" :key="sector" :value="sector">{{ sector }}</option>
      </select>
    </div>

    <div v-if="error" class="error-msg">{{ error }}</div>

    <!-- Loading -->
    <div v-if="loading && !emitens.length" class="skeleton-grid">
      <div v-for="i in 8" :key="i" class="skel-card"><div class="shimmer"></div></div>
    </div>

    <!-- Grid -->
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
        <div class="ec-date" v-if="emiten.chartUpdatedAt">
          Updated {{ new Date(emiten.chartUpdatedAt).toLocaleDateString('id-ID') }}
        </div>
      </div>
      <div v-if="!emitens.length && !loading" class="empty-grid">No companies found</div>
    </div>

    <!-- Pagination -->
    <div class="pagination" v-if="totalPages > 1">
      <button class="pg-btn" @click="prevPage" :disabled="currentPage === 1 || loading">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <div class="pg-pages">
        <template v-for="p in visiblePages" :key="p">
          <span v-if="p === '...'" class="pg-ellipsis">...</span>
          <button v-else
            class="pg-btn" :class="{ active: p === currentPage }"
            @click="goToPage(p)" :disabled="loading">{{ p }}</button>
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
            <span class="ms-value" :class="{ up: selectedEmiten.change >= 0, down: selectedEmiten.change < 0 }">
              {{ selectedEmiten.change >= 0 ? '+' : '' }}{{ selectedEmiten.changePercent }}%
            </span>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn-primary" @click="closeDetail(); emit('select-emiten', selectedEmiten.symbol)">View Details &rarr;</button>
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
  --surface: #FFFFFF; --text: #0F172A; --text2: #475569; --text3: #94A3B8;
  --border: rgba(0,0,0,0.05); --radius: 20px; --radius-sm: 14px;
  --shadow: 0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.04);
  --shadow-hover: 0 4px 20px rgba(0,0,0,0.07);
  --transition: all 0.2s ease;
}

/* Header */
.page-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 20px; gap: 16px; flex-wrap: wrap; }
.page-title {
  font-family: 'DM Sans', 'Inter', sans-serif;
  font-size: 28px; font-weight: 800; margin: 0; letter-spacing: -1px; color: var(--text);
}
.page-subtitle { font-size: 14px; color: var(--text2); margin: 2px 0 0; font-weight: 400; }
.header-right { display: flex; align-items: center; gap: 14px; }
.page-indicator { font-size: 12px; font-weight: 600; color: var(--text3); }
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
.controls-bar { display: flex; gap: 16px; margin-bottom: 28px; flex-wrap: wrap; align-items: center; }
.search-wrap { position: relative; flex: 1; min-width: 280px; max-width: 480px; }
.search-icon-svg { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--text3); pointer-events: none; }
.search-inp {
  width: 100%; height: 44px; padding: 0 16px 0 42px;
  border: 1px solid var(--border); border-radius: 100px; background: var(--surface);
  font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 500; color: var(--text);
  outline: none; transition: var(--transition);
}
.search-inp::placeholder { color: var(--text3); }
.search-inp:focus { border-color: var(--blue); box-shadow: 0 0 0 3px rgba(32,91,252,0.08); }
.sector-select {
  height: 44px; min-width: 200px; padding: 0 42px 0 16px;
  border: 1px solid var(--border); border-radius: 100px; background: var(--surface);
  font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 500; color: var(--text);
  outline: none; cursor: pointer; transition: var(--transition);
  appearance: none; background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%2394A3B8' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 16px center;
}
.sector-select:focus { border-color: var(--blue); box-shadow: 0 0 0 3px rgba(32,91,252,0.08); }

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
.ec-sym {
  font-family: 'DM Sans', 'Inter', sans-serif;
  font-size: 18px; font-weight: 800; color: var(--text); letter-spacing: -0.3px;
}
.ec-sector {
  font-size: 10px; font-weight: 700; padding: 3px 8px; background: #F1F5F9;
  border-radius: 6px; color: var(--text2); text-transform: uppercase; letter-spacing: 0.5px;
}
.ec-name { font-size: 13px; color: var(--text2); font-weight: 500; margin-bottom: 12px; line-height: 1.4; }
.ec-price { display: flex; justify-content: space-between; align-items: center; }
.ecp-val { font-size: 15px; font-weight: 700; color: var(--text); }
.ecp-chg { font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 100px; }
.ecp-chg.up { background: rgba(33,191,115,0.08); color: var(--green); }
.ecp-chg.down { background: rgba(239,58,58,0.08); color: var(--red); }
.ec-date { font-size: 11px; color: var(--text3); font-weight: 500; margin-top: 10px; }

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
.pg-ellipsis {
  display: flex; align-items: center; justify-content: center;
  width: 38px; height: 38px; font-size: 14px; font-weight: 600; color: var(--text3);
  user-select: none;
}

/* Modal */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.4);
  display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px;
  backdrop-filter: blur(4px);
}
.modal-content {
  background: var(--surface); border-radius: var(--radius);
  padding: 28px; max-width: 440px; width: 100%;
  box-shadow: 0 20px 60px rgba(0,0,0,0.15);
}
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
.modal-title {
  font-family: 'DM Sans', 'Inter', sans-serif;
  font-size: 22px; font-weight: 800; margin: 0; letter-spacing: -0.5px; color: var(--text);
}
.modal-close {
  width: 36px; height: 36px; border: none; background: #F1F5F9; border-radius: 100px;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  color: var(--text2); transition: var(--transition);
}
.modal-close:hover { background: rgba(0,0,0,0.06); color: var(--text); }
.modal-name { font-size: 14px; color: var(--text2); margin: 4px 0 16px; }
.modal-meta { margin-bottom: 16px; }
.modal-badge {
  display: inline-block; font-size: 11px; font-weight: 700; padding: 4px 10px;
  background: #F1F5F9; border-radius: 6px; color: var(--text2);
}
.modal-stats { display: flex; gap: 20px; margin-bottom: 24px; }
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
  .sector-select { width: 100%; min-width: unset; }
  .search-wrap { max-width: unset; }
  .emiten-grid { grid-template-columns: 1fr; }
}
</style>
