<script setup>
import { ref, watch, computed } from 'vue'
import axios from 'axios'
import StockChart from './StockChart.vue'
import RunningTrade from './RunningTrade.vue'
import IndicatorSelector from './IndicatorSelector.vue'
import OscillatorPanel from './OscillatorPanel.vue'

const props = defineProps({ symbol: { type: String, default: 'GOTO' } })
const emit = defineEmits(['back'])

const API_BASE = ''
const timeframe = ref('1d')
const chartData = ref(null)
const chartLoading = ref(false)
const watchlist = ref(JSON.parse(localStorage.getItem('edart_watchlist') || '[]'))
const isWatched = computed(() => watchlist.value.includes(props.symbol))
function toggleWatchlist() {
  const idx = watchlist.value.indexOf(props.symbol)
  if (idx >= 0) watchlist.value.splice(idx, 1)
  else watchlist.value.push(props.symbol)
  localStorage.setItem('edart_watchlist', JSON.stringify(watchlist.value))
}
const chartError = ref('')

// Indicator state - sidebar always visible
const activeIndicators = ref([]) // Array of { key, params }
const indicatorData = ref([]) // Array of indicator results from API
const indicatorLoading = ref(false)
const indicatorError = ref('')

const timeframes = [
  { value: '1d', label: '1D' },
  { value: '1w', label: '1W' },
  { value: '1m', label: '1M' },
  { value: '3m', label: '3M' },
  { value: 'ytd', label: 'YTD' },
  { value: '1y', label: '1Y' },
  { value: '3y', label: '3Y' },
  { value: '5y', label: '5Y' }
]

// Stockbit info (real-time volume + company data)
const stockInfo = ref(null)
const infoLoading = ref(false)
const infoError = ref('')

async function fetchInfo() {
  if (!props.symbol) return
  infoLoading.value = true; infoError.value = ''; stockInfo.value = null
  try {
    const { data } = await axios.get(`${API_BASE}/api/emiten/${props.symbol}/info`)
    stockInfo.value = data
  } catch (err) {
    if (err.response?.status === 404) return // Not critical
    infoError.value = err.response?.data?.error || err.message
  } finally { infoLoading.value = false }
}

function formatVolume(vol) {
  if (!vol) return '-'
  if (vol >= 1e9) return (vol / 1e9).toFixed(2) + 'B'
  if (vol >= 1e6) return (vol / 1e6).toFixed(2) + 'M'
  if (vol >= 1e3) return (vol / 1e3).toFixed(2) + 'K'
  return vol.toLocaleString('id-ID')
}

// Separate overlay and oscillator indicators
const overlayIndicators = computed(() => {
  return indicatorData.value.filter(d => d.config && d.config.overlay && !d.error)
})

const oscillatorIndicators = computed(() => {
  return indicatorData.value.filter(d => d.config && !d.config.overlay && !d.error)
})

const volumeRatioClass = computed(() => {
  if (!stockInfo.value?.volume || !stockInfo.value?.averageVolume) return ''
  const ratio = stockInfo.value.volume / stockInfo.value.averageVolume
  return ratio > 1.5 ? 'above' : 'normal'
})

async function fetchChart() {
  if (!props.symbol) return
  chartLoading.value = true; chartError.value = ''; chartData.value = null
  try {
    // Skip MongoDB cache for short timeframes — always get live data from Stockbit
    const skipCache = ['1d', '1w'].includes(timeframe.value)
    if (!skipCache) {
      // Try MongoDB cache first
      try {
        const mongoRes = await axios.get(`${API_BASE}/api/prices/${props.symbol}`, {
          params: { timeframe: timeframe.value }
        })
        if (mongoRes.data?.data) {
          chartData.value = mongoRes.data
          return
        }
      } catch (mongoErr) {
        // MongoDB miss — fallback to Stockbit proxy
      }
    }

    // Live from Stockbit API
    const res = await axios.get(`${API_BASE}/api/chart/${props.symbol}`, {
      params: { timeframe: timeframe.value, _t: Date.now() },
      headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
    })
    chartData.value = res.data
  } catch (err) {
    chartError.value = err.response?.data?.error || err.message
  } finally { chartLoading.value = false }
}

// Fetch indicator data from API
async function fetchIndicators() {
  if (!props.symbol || activeIndicators.value.length === 0) {
    indicatorData.value = []
    return
  }

  indicatorLoading.value = true
  indicatorError.value = ''

  try {
    // Build indicators param string
    const indicatorsParam = activeIndicators.value.map(ind => {
      const params = Object.entries(ind.params || {})
        .map(([k, v]) => `${k}=${v}`)
        .join(';')
      return params ? `${ind.key}:${params}` : ind.key
    }).join(',')

    const { data } = await axios.get(`${API_BASE}/api/emiten/${props.symbol}/indicators`, {
      params: {
        timeframe: timeframe.value,
        indicators: indicatorsParam
      }
    })

    indicatorData.value = data.indicators || []
  } catch (err) {
    indicatorError.value = err.response?.data?.error || err.message
    indicatorData.value = []
  } finally {
    indicatorLoading.value = false
  }
}

// Handle indicator selection change
function onIndicatorsChange(indicators) {
  activeIndicators.value = indicators
  fetchIndicators()
}

watch(() => props.symbol, (s) => { if (s) { fetchChart(); fetchInfo(); fetchIndicators() } })
watch(timeframe, () => { fetchChart(); fetchIndicators() })
fetchChart()
fetchInfo()
</script>

<template>
  <div class="detail-page">
    <!-- Page Header -->
    <div class="page-header">
      <div class="header-row">
        <button class="back-btn" @click="emit('back')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
          Back
        </button>
        <div>
          <h1 class="page-title">{{ symbol }}</h1>
          <span class="page-subtitle">Chart & Analisis Teknikal</span>
        </div>
        <button class="watchlist-star" :class="{ active: isWatched }" @click="toggleWatchlist" :title="isWatched ? 'Remove from watchlist' : 'Add to watchlist'">
          <svg width="20" height="20" viewBox="0 0 24 24" :fill="isWatched ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        </button>
      </div>
      <div class="timeframe-pills">
        <button v-for="tf in timeframes" :key="tf.value"
          class="tf-pill" :class="{ active: timeframe === tf.value }"
          @click="timeframe = tf.value">{{ tf.label }}</button>
      </div>
    </div>

    <div v-if="chartError" class="error-msg">{{ chartError }}</div>
    <div v-if="infoError" class="error-msg">{{ infoError }}</div>

    <!-- Info Card: Company + Volume (from Stockbit) -->
    <div v-if="stockInfo" class="info-grid">
      <div class="info-card company-card">
        <div class="info-header">
          <img v-if="stockInfo.iconUrl" :src="stockInfo.iconUrl" class="company-icon" alt="" />
          <div>
            <div class="company-name">{{ stockInfo.name || symbol }}</div>
            <div class="company-sector">{{ stockInfo.sector }}{{ stockInfo.subSector ? ' \u00B7 ' + stockInfo.subSector : '' }}</div>
          </div>
        </div>
      </div>

      <div class="info-card price-card" :class="(stockInfo.change || 0) >= 0 ? 'up' : 'down'">
        <div class="info-label">Harga</div>
        <div class="info-value">Rp {{ (stockInfo.price || 0).toLocaleString('id-ID') }}</div>
        <div class="info-change">
          {{ stockInfo.change ? (stockInfo.change >= 0 ? '+' : '') + stockInfo.change : '-' }}
          {{ stockInfo.percentage ? '(' + (stockInfo.percentage >= 0 ? '+' : '') + stockInfo.percentage + '%)' : '' }}
        </div>
      </div>

      <div class="info-card">
        <div class="info-label">Volume</div>
        <div class="info-value">{{ formatVolume(stockInfo.volume) }}</div>
        <div v-if="stockInfo.averageVolume" class="info-sub">
          Rata-rata {{ formatVolume(stockInfo.averageVolume) }}
          <span v-if="stockInfo.volume && stockInfo.averageVolume > 0" :class="volumeRatioClass">
            {{ (stockInfo.volume / stockInfo.averageVolume).toFixed(1) }}x
          </span>
        </div>
      </div>

      <div class="info-card" v-if="stockInfo.orderbook">
        <div class="info-label">Orderbook</div>
        <div class="ob-row">
          <span class="ob-label">Bid</span>
          <span class="ob-bid">Rp {{ stockInfo.orderbook.bid.price != null ? stockInfo.orderbook.bid.price.toLocaleString('id-ID') : '-' }}</span>
          <span class="ob-vol">{{ formatVolume(stockInfo.orderbook.bid.volume) }}</span>
        </div>
        <div class="ob-row">
          <span class="ob-label">Offer</span>
          <span class="ob-offer">Rp {{ stockInfo.orderbook.offer.price != null ? stockInfo.orderbook.offer.price.toLocaleString('id-ID') : '-' }}</span>
          <span class="ob-vol">{{ formatVolume(stockInfo.orderbook.offer.volume) }}</span>
        </div>
      </div>
    </div>

    <!-- Content Layout: Sidebar + Main -->
    <div class="detail-layout">
      <!-- Indicator Sidebar (Always Visible) -->
      <div class="indicator-sidebar">
        <IndicatorSelector @change="onIndicatorsChange" />
      </div>

      <!-- Main Content -->
      <div class="main-content">
        <!-- Chart Full Width -->
        <div class="dt-card chart-card">
          <div class="chart-header">
            <span class="chart-label">📊 Grafik Harga</span>
            <span v-if="activeIndicators.length > 0" class="active-count">
              {{ activeIndicators.length }} indikator aktif
            </span>
          </div>
          <div v-if="chartLoading" class="loading-state">
            <div class="loading-spinner"></div>
            <span>Loading chart data...</span>
          </div>
          <StockChart v-else :data="chartData" :overlays="overlayIndicators" :symbol="props.symbol" />

          <!-- Indicator Loading/Error -->
          <div v-if="indicatorLoading" class="indicator-status">
            <div class="loading-spinner small"></div>
            <span>Menghitung indikator...</span>
          </div>
          <div v-else-if="indicatorError" class="indicator-error">{{ indicatorError }}</div>
        </div>

        <!-- Oscillator Panels -->
        <OscillatorPanel
          v-if="oscillatorIndicators.length > 0"
          :data="oscillatorIndicators"
          :labels="indicatorData[0]?.data ? chartData?.data?.prices?.map(p => p.formatted_date || p.date) : []"
          :times="chartData?.data?.prices?.map(p => p.formatted_date || p.date) || []"
        />

        <!-- Running Trade di bawah -->
        <div class="dt-card trade-card">
          <RunningTrade :symbol="symbol" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.detail-page {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  color: #0F172A;
  --blue: #205BFC; --green: #21BF73; --red: #EF3A3A;
   --border: rgba(0,0,0,0.05); --radius: 20px; --radius-sm: 14px;
  --shadow: 0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.04);
  --shadow-hover: 0 4px 20px rgba(0,0,0,0.07);
}

/* Header */
.page-header {
  display: flex; justify-content: space-between; align-items: flex-start;
  margin-bottom: 20px; gap: 16px; flex-wrap: wrap;
}
.header-row { display: flex; align-items: center; gap: 14px; }
.back-btn {
  display: inline-flex; align-items: center; gap: 6px;
  height: 38px; padding: 0 14px;
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 100px; font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 600;
  color: var(--text2); cursor: pointer; transition: all 0.2s ease;
}
.back-btn:hover { border-color: rgba(0,0,0,0.12); color: var(--text); box-shadow: var(--shadow); }
.page-title {
  font-family: 'DM Sans', 'Inter', sans-serif;
  font-size: 28px; font-weight: 800; margin: 0; letter-spacing: -1px; color: var(--text);
}
.page-subtitle { font-size: 13px; color: var(--text2); font-weight: 500; }

/* Info Grid */
.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 14px;
  margin-bottom: 20px;
}
.info-card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius); padding: 18px 20px;
  box-shadow: var(--shadow);
}
.info-card.up { border-left: 3px solid var(--green); }
.info-card.down { border-left: 3px solid var(--red); }
.info-label { font-size: 11px; font-weight: 600; color: var(--text3); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
.info-value { font-family: 'DM Sans', 'Inter', sans-serif; font-size: 22px; font-weight: 800; color: var(--text); }
.info-change { font-size: 13px; font-weight: 600; margin-top: 4px; }
.info-card.up .info-change { color: var(--green); }
.info-card.down .info-change { color: var(--red); }
.info-sub { font-size: 12px; color: var(--text2); margin-top: 4px; display: flex; align-items: center; gap: 6px; }
.info-sub span { font-weight: 700; padding: 1px 8px; border-radius: 100px; font-size: 11px; }
.info-sub span.above { background: rgba(239,58,58,0.08); color: var(--red); }
.info-sub span.normal { background: rgba(33,191,115,0.08); color: var(--green); }

.company-card { grid-column: 1 / -1; }
@media (min-width: 900px) { .company-card { grid-column: span 2; } }
.info-header { display: flex; align-items: center; gap: 14px; }
.company-icon { width: 44px; height: 44px; border-radius: 12px; object-fit: contain; background: var(--bg); }
.company-name { font-family: 'DM Sans', 'Inter', sans-serif; font-size: 18px; font-weight: 800; color: var(--text); }
.company-sector { font-size: 12px; color: var(--text2); margin-top: 2px; }

.ob-row { display: flex; align-items: center; gap: 10px; padding: 4px 0; font-size: 12px; }
.ob-label { width: 40px; font-weight: 700; color: var(--text2); }
.ob-bid { color: var(--green); font-weight: 600; flex: 1; }
.ob-offer { color: var(--red); font-weight: 600; flex: 1; }
.ob-vol { color: var(--text2); font-weight: 500; }

/* Timeframe Pills */
.timeframe-pills { display: flex; gap: 4px; background: var(--bg); border-radius: 100px; padding: 4px; }
.tf-pill {
  padding: 7px 14px; border: none; background: transparent; border-radius: 100px;
  font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 600; color: var(--text2);
  cursor: pointer; transition: all 0.2s ease; white-space: nowrap;
}
.tf-pill:hover { color: var(--text); }
.tf-pill.active { background: var(--surface); color: var(--text); box-shadow: var(--shadow); }

/* Layout */
.detail-layout {
  display: flex;
  gap: 20px;
  min-height: 600px;
}

/* Indicator Sidebar - Always Visible */
.indicator-sidebar {
  width: 300px;
  min-width: 300px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  overflow: hidden;
  max-height: calc(100vh - 160px);
  position: sticky;
  top: 20px;
}

/* Main Content */
.main-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* Main Content */
.main-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* Chart Header */
.chart-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.chart-label {
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
}

.active-count {
  font-size: 11px;
  font-weight: 600;
  color: var(--blue);
  background: rgba(32, 91, 252, 0.08);
  padding: 4px 10px;
  border-radius: 100px;
}

/* Cards */
.dt-card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius); padding: 20px; box-shadow: var(--shadow);
}
.chart-card { min-height: 550px; }
.trade-card { max-height: 350px; overflow: hidden; }

/* Error */
.error-msg {
  padding: 12px 16px; background: rgba(239,58,58,0.06); border: 1px solid rgba(239,58,58,0.15);
  border-radius: var(--radius-sm); color: var(--red); font-size: 13px; font-weight: 500;
  margin-bottom: 20px;
}

/* Loading */
.loading-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80px 20px; gap: 16px; color: var(--text3); font-size: 14px; }
.loading-spinner { width: 36px; height: 36px; border: 3px solid rgba(0,0,0,0.06); border-top-color: var(--blue); border-radius: 50%; animation: spin 0.8s linear infinite; }
.loading-spinner.small { width: 20px; height: 20px; border-width: 2px; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Indicator Status */
.indicator-status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  color: var(--text3);
  font-size: 12px;
}

.indicator-error {
  padding: 8px 12px;
  background: rgba(239,58,58,0.06);
  border-radius: 8px;
  color: var(--red);
  font-size: 12px;
  margin-top: 8px;
}

/* Responsive */
@media (max-width: 1200px) {
  .detail-layout { flex-direction: column; }
  .indicator-sidebar {
    width: 100%;
    min-width: 100%;
    max-height: 300px;
    position: static;
  }
}

@media (max-width: 768px) {
  .page-header { flex-direction: column; align-items: flex-start; }
  .timeframe-pills { width: 100%; overflow-x: auto; }
  .chart-card { min-height: 400px; }
}
</style>
