<template>
  <div class="volume-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">Volume Analysis</h1>
        <p class="page-subtitle">Analisis volume untuk deteksi akumulasi dan distribusi</p>
      </div>
      <div class="header-right">
        <button class="btn-refresh" @click="fetchAnalysis" :disabled="loading || !selectedSymbol">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>
          {{ loading ? 'Loading...' : 'Refresh' }}
        </button>
      </div>
    </div>

    <!-- Quick Picks -->
    <div class="quick-picks">
      <span class="quick-label">Quick:</span>
      <button v-for="s in popularStocks" :key="s.symbol"
        class="quick-btn" :class="{ active: selectedSymbol === s.symbol }"
        @click="selectStock(s.symbol)">
        {{ s.symbol }}
      </button>
    </div>

    <!-- Search Input -->
    <div class="search-section">
      <div class="search-wrap" ref="searchWrapRef">
        <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input
          v-model="searchQuery"
          @input="onSearch"
          @focus="showDropdown = true"
          @keydown.down.prevent="navigateDropdown(1)"
          @keydown.up.prevent="navigateDropdown(-1)"
          @keydown.enter.prevent="selectHighlighted"
          @keydown.escape="showDropdown = false"
          type="text"
          placeholder="Ketik symbol atau nama saham..."
          class="search-input"
          autocomplete="off"
        />
        <div v-if="selectedSymbol" class="selected-badge" @click="clearSelection">
          {{ selectedSymbol }} <span class="clear-x">&times;</span>
        </div>
      </div>

      <div v-if="showDropdown && filteredEmitens.length > 0" class="dropdown">
        <div class="dropdown-scroll">
          <div v-for="(emiten, index) in filteredEmitens" :key="emiten.symbol"
            class="dropdown-item" :class="{ highlighted: index === highlightIndex }"
            @click="selectStock(emiten.symbol)"
            @mouseenter="highlightIndex = index">
            <span class="dd-symbol">{{ emiten.symbol }}</span>
            <span class="dd-name">{{ emiten.name }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Controls -->
    <div class="controls-bar">
      <div class="pill-group">
        <span class="pill-label">Timeframe:</span>
        <button v-for="tf in timeframes" :key="tf.value"
          class="pill-item" :class="{ active: selectedTimeframe === tf.value }"
          @click="selectedTimeframe = tf.value; if(selectedSymbol) fetchAnalysis()">{{ tf.label }}</button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <span>Menganalisis volume...</span>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="error-msg">{{ error }}</div>

    <!-- Results -->
    <div v-else-if="analysis && analysis.spikes" class="content-area">
      <!-- Summary Cards -->
      <div class="summary-grid">
        <div class="bento-card summary-card">
          <div class="card-header">
            <h3 class="card-title">Rata-rata Volume</h3>
            <span class="badge blue">{{ analysis.lookbackPeriod }} Hari</span>
          </div>
          <div class="summary-value">{{ formatVolume(analysis.averageVolume) }}</div>
          <div class="summary-desc">Volume rata-rata {{ analysis.lookbackPeriod }} hari terakhir</div>
        </div>

        <div class="bento-card summary-card">
          <div class="card-header">
            <h3 class="card-title">Volume Hari Ini</h3>
            <span class="badge" :class="todayVolumeClass">{{ todayVolumeLabel }}</span>
          </div>
          <div class="summary-value">{{ formatVolume(todayVolume) }}</div>
          <div class="summary-desc">{{ todayVolumeDesc }}</div>
        </div>

        <div class="bento-card summary-card">
          <div class="card-header">
            <h3 class="card-title">Volume Spike</h3>
            <span class="badge red">{{ spikeCount }}</span>
          </div>
          <div class="summary-value">{{ spikeCount }} spike</div>
          <div class="summary-desc">Deteksi volume > {{ analysis.spikeThreshold }}x rata-rata</div>
        </div>

        <div class="bento-card summary-card">
          <div class="card-header">
            <h3 class="card-title">OBV Trend</h3>
            <span class="badge" :class="obvTrendClass">{{ obvTrendLabel }}</span>
          </div>
          <div class="summary-value">{{ obvTrendLabel }}</div>
          <div class="summary-desc">On Balance Volume trend</div>
        </div>
      </div>

      <!-- Volume Spikes Table -->
      <div class="bento-card" v-if="spikes.length > 0">
        <h3 class="card-title">Volume Spikes Terdeteksi</h3>
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Tanggal</th>
                <th class="r">Volume</th>
                <th class="r">Rata-rata</th>
                <th class="r">Spike Ratio</th>
                <th class="r">Harga</th>
                <th class="r">Perubahan</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="spike in spikes.slice(0, 10)" :key="spike.date">
                <td>{{ spike.formatted_date || spike.date }}</td>
                <td class="r">{{ formatVolume(spike.volume) }}</td>
                <td class="r">{{ formatVolume(spike.averageVolume) }}</td>
                <td class="r"><span class="spike-ratio">{{ spike.spikeRatio }}x</span></td>
                <td class="r">Rp {{ formatNumber(spike.price) }}</td>
                <td class="r" :class="spike.priceChange >= 0 ? 'up' : 'down'">
                  {{ spike.priceChange >= 0 ? '+' : '' }}{{ spike.priceChange }}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- No Spikes -->
      <div v-else class="bento-card">
        <div class="empty-state">
          <p>Tidak terdeteksi volume spike dalam periode ini</p>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="empty-state">
      <div class="empty-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="12" width="4" height="9" rx="1"/><rect x="10" y="7" width="4" height="14" rx="1"/><rect x="17" y="3" width="4" height="18" rx="1"/></svg>
      </div>
      <p class="empty-title">Pilih saham untuk analisis volume</p>
      <p class="empty-desc">Ketik symbol di search atau klik quick picks di atas</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import axios from 'axios'

const API_BASE = ''

const emitens = ref([])
const selectedSymbol = ref('')
const selectedTimeframe = ref('1y')
const loading = ref(false)
const error = ref(null)
const analysis = ref(null)

const searchQuery = ref('')
const showDropdown = ref(false)
const highlightIndex = ref(-1)
const searchWrapRef = ref(null)

const popularStocks = [
  { symbol: 'BBCA' },
  { symbol: 'BBRI' },
  { symbol: 'TLKM' },
  { symbol: 'BMRI' },
  { symbol: 'ASII' },
  { symbol: 'UNVR' },
  { symbol: 'GOTO' },
  { symbol: 'BUKA' },
  { symbol: 'EMTK' },
  { symbol: 'MAPI' }
]

const timeframes = [
  { value: '1m', label: '1M' },
  { value: '3m', label: '3M' },
  { value: 'ytd', label: 'YTD' },
  { value: '1y', label: '1Y' }
]

// Computed
const filteredEmitens = computed(() => {
  if (!searchQuery.value) return emitens.value.slice(0, 20)
  const q = searchQuery.value.toUpperCase()
  return emitens.value.filter(e =>
    e.symbol.toUpperCase().includes(q) ||
    (e.name && e.name.toUpperCase().includes(q))
  ).slice(0, 20)
})

const avgVolume = computed(() => {
  return analysis.value?.averageVolume || 0
})

const todayVolume = computed(() => {
  const spikes = analysis.value?.spikes || []
  if (spikes.length === 0) return 0
  return spikes[0]?.volume || 0
})

const todayVolumeClass = computed(() => {
  if (!avgVolume.value || !todayVolume.value) return 'blue'
  const ratio = todayVolume.value / avgVolume.value
  if (ratio > 2) return 'red'
  if (ratio > 1.5) return 'amber'
  return 'green'
})

const todayVolumeLabel = computed(() => {
  if (!avgVolume.value || !todayVolume.value) return '-'
  const ratio = todayVolume.value / avgVolume.value
  if (ratio > 2) return 'Tinggi'
  if (ratio > 1.5) return 'Sedang'
  return 'Normal'
})

const todayVolumeDesc = computed(() => {
  if (!avgVolume.value || !todayVolume.value) return '-'
  const ratio = todayVolume.value / avgVolume.value
  return `${ratio.toFixed(1)}x dari rata-rata`
})

const spikeCount = computed(() => {
  return analysis.value?.spikeCount || 0
})

const spikes = computed(() => {
  return analysis.value?.spikes || []
})

const obvTrendLabel = computed(() => {
  const spikes = analysis.value?.spikes || []
  if (spikes.length < 2) return 'Netral'
  const recent = spikes.slice(0, 5)
  const upCount = recent.filter(s => s.priceChange > 0).length
  if (upCount >= 3) return 'Akumulasi'
  if (upCount <= 1) return 'Distribusi'
  return 'Netral'
})

const obvTrendClass = computed(() => {
  const label = obvTrendLabel.value
  if (label === 'Akumulasi') return 'green'
  if (label === 'Distribusi') return 'red'
  return 'blue'
})

// Functions
function formatVolume(vol) {
  if (!vol) return '-'
  const abs = Math.abs(vol)
  if (abs >= 1e9) return (vol / 1e9).toFixed(2) + 'B'
  if (abs >= 1e6) return (vol / 1e6).toFixed(2) + 'M'
  if (abs >= 1e3) return (vol / 1e3).toFixed(2) + 'K'
  return vol.toLocaleString('id-ID')
}

function formatNumber(num) {
  if (!num) return '-'
  return num.toLocaleString('id-ID')
}

function onSearch() {
  showDropdown.value = true
  highlightIndex.value = -1
}

function navigateDropdown(dir) {
  const len = filteredEmitens.value.length
  if (len === 0) return
  highlightIndex.value = (highlightIndex.value + dir + len) % len
}

function selectHighlighted() {
  if (highlightIndex.value >= 0 && highlightIndex.value < filteredEmitens.value.length) {
    selectStock(filteredEmitens.value[highlightIndex.value].symbol)
  }
}

function selectStock(symbol) {
  selectedSymbol.value = symbol
  searchQuery.value = ''
  showDropdown.value = false
  highlightIndex.value = -1
  fetchAnalysis()
}

function clearSelection() {
  selectedSymbol.value = ''
  searchQuery.value = ''
  analysis.value = null
}

function handleClickOutside(e) {
  if (searchWrapRef.value && !searchWrapRef.value.contains(e.target)) {
    showDropdown.value = false
  }
}

async function fetchEmitens() {
  try {
    const res = await axios.get(`${API_BASE}/api/emiten`, { params: { limit: 1000 } })
    emitens.value = res.data.data || []
  } catch (err) {
    console.error('Error fetching emitens:', err)
  }
}

async function fetchAnalysis() {
  if (!selectedSymbol.value) { analysis.value = null; return }
  loading.value = true
  error.value = null
  try {
    const res = await axios.get(`${API_BASE}/api/emiten/${selectedSymbol.value}/volume-analysis`, {
      params: { timeframe: selectedTimeframe.value }
    })
    // Restructure data for easier access in computed properties
    const apiData = res.data
    analysis.value = {
      symbol: apiData.symbol,
      timeframe: apiData.timeframe,
      averageVolume: apiData.analysis?.averageVolume || 0,
      spikeCount: apiData.analysis?.spikeCount || 0,
      spikes: apiData.analysis?.spikes || [],
      lookbackPeriod: apiData.analysis?.lookbackPeriod || 20,
      spikeThreshold: apiData.analysis?.spikeThreshold || 2,
      totalDataPoints: apiData.analysis?.totalDataPoints || 0
    }
  } catch (err) {
    error.value = err.response?.data?.error || 'Gagal mengambil data volume'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchEmitens()
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.volume-page {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  color: #0F172A;
  --blue: #205BFC; --green: #21BF73; --red: #EF3A3A;
  --bg: #F8FAFC; --surface: #FFFFFF; --text: #0F172A; --text2: #475569; --text3: #94A3B8;
  --border: rgba(0,0,0,0.05); --radius: 20px; --radius-sm: 14px;
  --shadow: 0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.04);
  --shadow-hover: 0 4px 20px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.04);
}

.page-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 16px; gap: 16px; flex-wrap: wrap; }
.page-title { font-family: 'DM Sans', 'Inter', sans-serif; font-size: 28px; font-weight: 800; margin: 0; letter-spacing: -1px; color: var(--text); }
.page-subtitle { font-size: 14px; color: var(--text2); margin: 2px 0 0; font-weight: 400; }
.header-right { display: flex; align-items: center; gap: 14px; }

.btn-refresh {
  display: inline-flex; align-items: center; gap: 8px;
  height: 38px; padding: 0 16px;
  background: var(--surface); border: 1px solid var(--border); border-radius: 100px;
  font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 600;
  color: var(--text); cursor: pointer; transition: all 0.2s ease;
}
.btn-refresh:hover:not(:disabled) { box-shadow: var(--shadow-hover); border-color: rgba(0,0,0,0.1); }
.btn-refresh:disabled { opacity: 0.5; cursor: not-allowed; }

/* Quick Picks */
.quick-picks {
  display: flex; align-items: center; gap: 8px; margin-bottom: 16px; flex-wrap: wrap;
}
.quick-label { font-size: 12px; font-weight: 600; color: var(--text3); }
.quick-btn {
  height: 32px; padding: 0 12px; border: 1px solid var(--border); border-radius: 100px;
  background: var(--surface); font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 600;
  color: var(--text2); cursor: pointer; transition: all 0.2s ease;
}
.quick-btn:hover { border-color: var(--blue); color: var(--blue); }
.quick-btn.active { background: var(--blue); color: white; border-color: var(--blue); }

/* Search */
.search-section { position: relative; margin-bottom: 16px; }
.search-wrap {
  display: flex; align-items: center; gap: 10px;
  background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm);
  padding: 0 16px; transition: all 0.2s ease;
}
.search-wrap:focus-within { border-color: var(--blue); box-shadow: 0 0 0 3px rgba(32,91,252,0.1); }
.search-icon { color: var(--text3); flex-shrink: 0; }
.search-input {
  flex: 1; height: 44px; border: none; background: transparent;
  font-family: 'Inter', sans-serif; font-size: 14px; color: var(--text);
  outline: none;
}
.search-input::placeholder { color: var(--text3); }
.selected-badge {
  display: flex; align-items: center; gap: 6px;
  padding: 4px 12px; background: rgba(32,91,252,0.07); border-radius: 100px;
  font-size: 12px; font-weight: 700; color: var(--blue); cursor: pointer;
}
.clear-x { font-size: 16px; line-height: 1; }

/* Dropdown */
.dropdown {
  position: absolute; top: 100%; left: 0; right: 0; z-index: 100;
  background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm);
  box-shadow: 0 10px 40px rgba(0,0,0,0.1); margin-top: 4px; overflow: hidden;
}
.dropdown-scroll { max-height: 320px; overflow-y: auto; }
.dropdown-item {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 16px; cursor: pointer; transition: background 0.15s ease;
}
.dropdown-item:hover, .dropdown-item.highlighted { background: var(--bg); }
.dd-symbol { font-weight: 700; font-size: 13px; color: var(--text); min-width: 56px; }
.dd-name { flex: 1; font-size: 13px; color: var(--text2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* Controls */
.controls-bar { display: flex; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; align-items: center; }
.pill-group { display: flex; gap: 4px; background: var(--bg); border-radius: 100px; padding: 4px; align-items: center; }
.pill-label { font-size: 11px; font-weight: 600; color: var(--text3); padding: 0 8px; }
.pill-item {
  padding: 7px 14px; border: none; background: transparent; border-radius: 100px;
  font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 600; color: var(--text2);
  cursor: pointer; transition: all 0.2s ease; white-space: nowrap;
}
.pill-item:hover { color: var(--text); }
.pill-item.active { background: var(--surface); color: var(--text); box-shadow: 0 1px 3px rgba(0,0,0,0.1); }

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
.empty-title { font-size: 16px; font-weight: 600; color: var(--text); margin: 0 0 8px; }
.empty-desc { font-size: 14px; color: var(--text3); margin: 0; }

.content-area { display: flex; flex-direction: column; gap: 20px; }

.summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; }

.bento-card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius); padding: 24px;
  box-shadow: var(--shadow); transition: all 0.25s ease;
}
.bento-card:hover { box-shadow: var(--shadow-hover); }

.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.card-title { font-family: 'DM Sans', 'Inter', sans-serif; font-size: 14px; font-weight: 700; color: var(--text); margin: 0; }

.badge {
  font-size: 10px; font-weight: 700; padding: 3px 10px; border-radius: 100px;
  text-transform: uppercase; letter-spacing: 0.3px;
}
.badge.blue { background: rgba(32,91,252,0.07); color: var(--blue); }
.badge.green { background: rgba(33,191,115,0.08); color: var(--green); }
.badge.red { background: rgba(239,58,58,0.08); color: var(--red); }
.badge.amber { background: rgba(245,158,11,0.08); color: #D97706; }

.summary-value {
  font-family: 'DM Sans', 'Inter', sans-serif; font-size: 28px; font-weight: 800;
  color: var(--text); margin-bottom: 8px;
}
.summary-desc { font-size: 13px; color: var(--text2); }

/* Table */
.table-wrap { overflow-x: auto; }
.data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.data-table thead th {
  text-align: left; padding: 8px 8px 12px;
  font-size: 10px; font-weight: 700; color: var(--text3);
  text-transform: uppercase; letter-spacing: 0.7px; border-bottom: 1px solid var(--border);
}
.data-table thead th.r { text-align: right; }
.data-table tbody td {
  padding: 9px 8px; border-bottom: 1px solid rgba(0,0,0,0.02); font-weight: 500; color: var(--text);
}
.data-table tbody td.r { text-align: right; }
.data-table tbody tr:hover td { background: var(--bg); }

.up { color: var(--green); }
.down { color: var(--red); }

.spike-ratio {
  font-weight: 700; padding: 2px 8px; border-radius: 100px;
  background: rgba(239,58,58,0.08); color: var(--red);
}

@media (max-width: 768px) {
  .page-header { flex-direction: column; align-items: flex-start; }
  .controls-bar { flex-direction: column; align-items: stretch; }
  .pill-group { overflow-x: auto; }
  .summary-grid { grid-template-columns: 1fr; }
}
</style>
