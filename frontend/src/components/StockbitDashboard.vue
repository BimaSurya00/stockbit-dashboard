<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import axios from 'axios'
import { Line, Bar, Doughnut } from 'vue-chartjs'
import {
  Chart as ChartJS,
  Title, Tooltip, Legend, LineElement, BarElement,
  ArcElement, PointElement, CategoryScale, LinearScale, Filler
} from 'chart.js'

ChartJS.register(
  Title, Tooltip, Legend, LineElement, BarElement,
  ArcElement, PointElement, CategoryScale, LinearScale, Filler
)

const API_BASE = ''

const trendingData = ref([])
const runningTrades = ref([])
const emitenList = ref([])
const ihsgData = ref(null)
const marketMovers = ref([])
const activeMoverType = ref('MOVER_TYPE_TOP_GAINER')
const loading = ref(true)
const error = ref('')
const lastUpdated = ref(new Date())
const highlightSymbols = ['BBCA', 'BBRI', 'TLKM']
const highlightData = ref({})

const emit = defineEmits(['select-emiten'])

const moverTabs = [
  { key: 'MOVER_TYPE_TOP_GAINER', label: 'Gainer' },
  { key: 'MOVER_TYPE_TOP_LOSER', label: 'Loser' },
  { key: 'MOVER_TYPE_TOP_VALUE', label: 'Value' }
]

const marketSentiment = computed(() => {
  if (!trendingData.value.length) return { positive: 50, negative: 50 }
  const positive = trendingData.value.filter(s => s.changePercent > 0).length
  const total = trendingData.value.length
  return {
    positive: Math.round((positive / total) * 100),
    negative: Math.round(((total - positive) / total) * 100)
  }
})

const sectorData = computed(() => {
  const sectors = {}
  emitenList.value.forEach(e => {
    if (e.sector) sectors[e.sector] = (sectors[e.sector] || 0) + 1
  })
  const sorted = Object.entries(sectors).sort((a, b) => b[1] - a[1]).slice(0, 6)
  return { labels: sorted.map(s => s[0]), data: sorted.map(s => s[1]) }
})

const gaugeConfig = computed(() => ({
  data: {
    datasets: [{
      data: [marketSentiment.value.positive, marketSentiment.value.negative],
      backgroundColor: ['#21BF73', 'rgba(239,58,58,0.3)'],
      borderWidth: 0,
      cutout: '80%',
      circumference: 270,
      rotation: 225,
      borderRadius: 4
    }]
  },
  options: {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { enabled: false } }
  }
}))

const sectorBarConfig = computed(() => {
  const sd = sectorData.value
  if (!sd.labels.length) return null
  return {
    type: 'bar',
    data: {
      labels: sd.labels,
      datasets: [{
        data: sd.data,
        backgroundColor: sd.data.map((_, i) =>
          ['#205BFC', '#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE', '#DBEAFE'][i] || '#60A5FA'
        ),
        borderRadius: 8,
        barThickness: 24
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          grid: { display: false }, display: false, beginAtZero: true
        },
        y: {
          grid: { display: false },
          ticks: { font: { family: 'Inter', size: 12 }, color: '#64748B', padding: 8 }
        }
      }
    }
  }
})

function getSparkline(prices, color) {
  return {
    data: {
      labels: prices.map((_, i) => i),
      datasets: [{
        data: prices,
        borderColor: color,
        backgroundColor: color + '18',
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 3,
        pointHoverBackgroundColor: color,
        fill: true,
        tension: 0.35
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      scales: { x: { display: false }, y: { display: false } },
      interaction: { intersect: false }
    }
  }
}

async function fetchTrending() {
  try {
    const res = await axios.get(`${API_BASE}/api/emiten/trending`, { params: { _t: Date.now() } })
    const raw = res.data; let items = []
    if (Array.isArray(raw)) items = raw
    else if (raw.data && Array.isArray(raw.data)) items = raw.data
    else if (raw.results && Array.isArray(raw.results)) items = raw.results
    trendingData.value = items.map(item => ({
      symbol: item.symbol || item.code || '?',
      name: item.name || item.company || '',
      price: item.price || item.close || 0,
      change: item.change || item.chg || 0,
      changePercent: item.change_percent || item.changePercent || item.percent || 0,
      volume: item.volume || 0
    }))
  } catch (e) { console.error('Trending error:', e) }
}

async function fetchRunningTrades() {
  try {
    const res = await axios.get(`${API_BASE}/api/running-trade/BBRI`, { params: { _t: Date.now() } })
    let trades = []
    const raw = res.data
    if (raw.data?.running_trade && Array.isArray(raw.data.running_trade)) trades = raw.data.running_trade
    else if (Array.isArray(raw)) trades = raw
    else if (raw.data && Array.isArray(raw.data)) trades = raw.data
    runningTrades.value = trades.slice(0, 6)
  } catch (e) { console.error('Trades error:', e) }
}

async function fetchHighlights() {
  for (const sym of highlightSymbols) {
    try {
      let prices = []

      // Try MongoDB cache first
      try {
        const mongoRes = await axios.get(`${API_BASE}/api/prices/${sym}`, {
          params: { timeframe: '1w' }
        })
        prices = mongoRes.data?.data?.prices || []
      } catch (_) {
        // Fallback to Stockbit
        const res = await axios.get(`${API_BASE}/api/chart/${sym}`, {
          params: { timeframe: '1w', _t: Date.now() }
        })
        prices = res.data?.data?.prices || []
      }

      const vals = prices.map(p => parseFloat(p.value) || 0).filter(v => v > 0)
      const latest = vals[vals.length - 1] || 0
      const prev = vals[vals.length - 2] || latest
      const change = latest - prev
      const pct = prev > 0 ? ((change / prev) * 100).toFixed(2) : 0
      highlightData.value[sym] = { prices: vals.slice(-12), latest, change, changePercent: parseFloat(pct) }
    } catch (e) { console.error(`Chart ${sym}:`, e) }
  }
}

async function fetchEmitens() {
  try {
    const res = await axios.get(`${API_BASE}/api/emiten`, { params: { page: 1, limit: 1000 } })
    emitenList.value = res.data.data || []
  } catch (e) { console.error('Emiten error:', e) }
}

async function fetchIHSG() {
  try {
    const res = await axios.get(`${API_BASE}/api/ihsg`, { params: { _t: Date.now() } })
    ihsgData.value = res.data?.data || null
  } catch (e) { console.error('IHSG error:', e) }
}

async function fetchMarketMovers() {
  try {
    const res = await axios.get(`${API_BASE}/api/market-movers`, {
      params: { type: activeMoverType.value, _t: Date.now() }
    })
    const data = res.data?.data?.mover_list || []
    marketMovers.value = data.map(item => ({
      symbol: item.stock_detail?.code || '',
      name: item.stock_detail?.name || '',
      price: item.price || 0,
      change: item.change?.value || 0,
      changePercent: (item.change?.percentage || 0).toFixed(2),
      value: item.value?.formatted || '',
      volume: item.volume?.formatted || ''
    }))
  } catch (e) { console.error('Movers error:', e) }
}

async function switchMoverType(type) {
  activeMoverType.value = type
  await fetchMarketMovers()
}

async function fetchAll() {
  loading.value = true; error.value = ''
  try {
    await Promise.all([fetchTrending(), fetchRunningTrades(), fetchHighlights(), fetchEmitens(), fetchIHSG(), fetchMarketMovers()])
    lastUpdated.value = new Date()
  } catch (e) { error.value = e.message }
  finally { loading.value = false }
}

function selectStock(s) { if (s) emit('select-emiten', s) }
function fmtPrice(p) { return 'Rp ' + (p || 0).toLocaleString('id-ID') }
function fmtNum(n) { return (n || 0).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
function isUp(v) { return (v || 0) >= 0 }

let intervalId
onMounted(() => { fetchAll(); intervalId = setInterval(fetchAll, 30010) })
onUnmounted(() => { if (intervalId) clearInterval(intervalId) })
</script>

<template>
  <div class="dashboard-page">
    <!-- PAGE HEADER -->
    <div class="page-header">
      <div>
        <h1 class="page-title">Overview</h1>
        <p class="page-subtitle">Real-time market monitoring for Indonesian stocks</p>
      </div>
      <div class="header-actions">
        <span class="last-update">{{ lastUpdated.toLocaleTimeString('id-ID') }}</span>
        <button class="btn-refresh" @click="fetchAll" :disabled="loading">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>
          {{ loading ? 'Updating...' : 'Refresh' }}
        </button>
      </div>
    </div>

    <!-- LOADING -->
    <div v-if="loading && !trendingData.length" class="loading-zone">
      <div class="bento-grid">
        <div class="skel hero"><div class="shimmer"></div></div>
        <div class="skel card"><div class="shimmer"></div></div>
        <div class="skel card"><div class="shimmer"></div></div>
        <div class="skel card"><div class="shimmer"></div></div>
        <div class="skel tall"><div class="shimmer"></div></div>
        <div class="skel wide"><div class="shimmer"></div></div>
      </div>
    </div>

    <!-- BENTO GRID -->
    <div v-else class="bento-grid">
      <!-- IHSG HERO CARD (span 2 cols, 1 row) -->
      <div class="bento-card hero-card">
        <div class="hero-inner">
          <div class="hero-left">
            <div class="hero-badge-wrap">
              <span class="hero-pill">IHSG</span>
              <span class="hero-subtitle">Indeks Harga Saham Gabungan</span>
            </div>
            <div class="hero-value-row">
              <span class="hero-value">{{ ihsgData ? fmtNum(ihsgData.close) : '—' }}</span>
              <span class="hero-change" :class="{ up: isUp(ihsgData?.change), down: !isUp(ihsgData?.change) }">
                {{ ihsgData ? (ihsgData.change >= 0 ? '+' : '') + ihsgData.change.toFixed(2) : '—' }}
                <span class="hero-pct">({{ ihsgData ? (ihsgData.percentage_change >= 0 ? '+' : '') + ihsgData.percentage_change.toFixed(2) : '0' }}%)</span>
              </span>
            </div>
          </div>
          <div class="hero-right">
            <div class="hero-stat">
              <span class="hs-label">Open</span><span class="hs-val">{{ ihsgData ? fmtNum(ihsgData.open) : '—' }}</span>
            </div>
            <div class="hero-stat">
              <span class="hs-label">High</span><span class="hs-val">{{ ihsgData ? fmtNum(ihsgData.high) : '—' }}</span>
            </div>
            <div class="hero-stat">
              <span class="hs-label">Low</span><span class="hs-val">{{ ihsgData ? fmtNum(ihsgData.low) : '—' }}</span>
            </div>
            <div class="hero-divider"></div>
            <div class="hero-stat">
              <span class="hs-label">Volume</span><span class="hs-val accent">{{ ihsgData?.market_data?.[0]?.volume?.formatted || '—' }}</span>
            </div>
            <div class="hero-stat">
              <span class="hs-label">Value</span><span class="hs-val accent">{{ ihsgData?.market_data?.[0]?.value?.formatted || '—' }}</span>
            </div>
            <div class="hero-stat">
              <span class="hs-label">Freq</span><span class="hs-val accent">{{ ihsgData?.market_data?.[0]?.frequency?.formatted || '—' }}</span>
            </div>
          </div>
        </div>
        <div class="hero-footer">
          <span class="hf-item up">▲ {{ ihsgData?.up || 0 }} naik</span>
          <span class="hf-item down">▼ {{ ihsgData?.down || 0 }} turun</span>
          <span class="hf-item neutral">— {{ ihsgData?.unchanged || 0 }} tetap</span>
        </div>
      </div>

      <!-- STOCK TICKER CARDS (3 cards, 1 col each) -->
      <div v-for="sym in highlightSymbols" :key="sym" class="bento-card ticker-card" @click="selectStock(sym)">
        <div class="ticker-top">
          <div class="ticker-info">
            <span class="ticker-symbol">{{ sym }}</span>
            <span class="ticker-exchange">IDX</span>
          </div>
          <span class="ticker-pct" :class="{ up: isUp(highlightData[sym]?.changePercent), down: !isUp(highlightData[sym]?.changePercent) }">
            {{ highlightData[sym] ? (isUp(highlightData[sym]?.changePercent) ? '+' : '') + highlightData[sym].changePercent.toFixed(2) + '%' : '—' }}
          </span>
        </div>
        <div class="ticker-mid">
          <div class="ticker-price">{{ highlightData[sym] ? fmtPrice(highlightData[sym].latest) : '—' }}</div>
          <div class="ticker-spark">
            <Line v-if="highlightData[sym]?.prices?.length"
              :data="getSparkline(highlightData[sym].prices, isUp(highlightData[sym].changePercent) ? '#21BF73' : '#EF3A3A').data"
              :options="getSparkline(highlightData[sym].prices, isUp(highlightData[sym].changePercent) ? '#21BF73' : '#EF3A3A').options" />
            <span v-else class="ticker-no-data">—</span>
          </div>
        </div>
        <div class="ticker-bot">
          <span class="ticker-change" :class="{ up: isUp(highlightData[sym]?.change), down: !isUp(highlightData[sym]?.change) }">
            {{ highlightData[sym] ? (isUp(highlightData[sym].change) ? '+' : '') + fmtPrice(highlightData[sym].change) : '—' }}
          </span>
          <span class="ticker-label">24h change</span>
        </div>
      </div>

      <!-- SENTIMENT GAUGE (1 col, row 2) -->
      <div class="bento-card sentiment-card">
        <h3 class="card-title">Market Sentiment</h3>
        <div class="gauge-area">
          <div class="gauge-chart">
            <Doughnut v-if="trendingData.length" :data="gaugeConfig.data" :options="gaugeConfig.options" />
            <div class="gauge-kpi">
              <span class="gk-value">{{ marketSentiment.positive }}%</span>
              <span class="gk-label">bullish</span>
            </div>
          </div>
          <div class="gauge-meta">
            <div class="gm-row">
              <span class="gm-dot green"></span>
              <span class="gm-text">Naik</span>
              <span class="gm-pct">{{ marketSentiment.positive }}%</span>
            </div>
            <div class="gm-row">
              <span class="gm-dot red"></span>
              <span class="gm-text">Turun</span>
              <span class="gm-pct">{{ marketSentiment.negative }}%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- SECTOR OVERVIEW (span 2 cols, row 2) -->
      <div class="bento-card sector-card">
        <div class="card-header">
          <h3 class="card-title">Sector Overview</h3>
          <span class="card-badge">{{ emitenList.length }} emiten</span>
        </div>
        <div class="sector-chart">
          <Bar v-if="sectorBarConfig" :data="sectorBarConfig.data" :options="sectorBarConfig.options" />
          <div v-else class="empty-data">Loading data...</div>
        </div>
      </div>

      <!-- MARKET STATS (1 col, row 3) -->
      <div class="bento-card stats-card">
        <h3 class="card-title">Market Stats</h3>
        <div class="stats-list">
          <div class="stat-row">
            <div class="stat-left"><span class="sdot blue"></span>Total Emiten</div>
            <span class="stat-num">{{ emitenList.length }}</span>
          </div>
          <div class="stat-row">
            <div class="stat-left"><span class="sdot green"></span>Saham Naik</div>
            <span class="stat-num green">{{ trendingData.filter(s => s.changePercent > 0).length }}</span>
          </div>
          <div class="stat-row">
            <div class="stat-left"><span class="sdot red"></span>Saham Turun</div>
            <span class="stat-num red">{{ trendingData.filter(s => s.changePercent < 0).length }}</span>
          </div>
          <div class="stat-row">
            <div class="stat-left"><span class="sdot accent"></span>Total Volume</div>
            <span class="stat-num">{{ (trendingData.reduce((a, s) => a + (s.volume || 0), 0) / 1e9).toFixed(2) }}B</span>
          </div>
        </div>
      </div>

      <!-- RUNNING TRADES (1 col, row 3) -->
      <div class="bento-card trades-card">
        <div class="card-header">
          <h3 class="card-title">Running Trades</h3>
          <span class="card-badge blue">BBRI</span>
        </div>
        <table class="trade-table" v-if="runningTrades.length">
          <thead><tr><th>Time</th><th>Price</th><th>Vol</th><th>Type</th></tr></thead>
          <tbody>
            <tr v-for="(t, i) in runningTrades" :key="i">
              <td class="tt-time">{{ t.time?.substring(0, 8) || t.time || '—' }}</td>
              <td class="tt-price">Rp {{ (t.price || '—').toString() }}</td>
              <td class="tt-vol">{{ t.lot || t.volume || '—' }}</td>
              <td><span class="type-tag" :class="t.action === 'buy' ? 'buy' : 'sell'">{{ t.action?.toUpperCase() || 'BUY' }}</span></td>
            </tr>
          </tbody>
        </table>
        <div v-else class="empty-data-sm">No trades available</div>
      </div>

      <!-- MARKET MOVERS (span 2 cols, row 3) -->
      <div class="bento-card movers-card">
        <div class="card-header">
          <h3 class="card-title">Market Movers</h3>
          <div class="mover-pills">
            <button v-for="tab in moverTabs" :key="tab.key"
              class="mover-pill" :class="{ active: activeMoverType === tab.key }"
              @click="switchMoverType(tab.key)">{{ tab.label }}</button>
          </div>
        </div>
        <table class="mover-table" v-if="marketMovers.length">
          <thead><tr><th>Stock</th><th class="r">Price</th><th class="r">Change</th><th class="r">Value</th></tr></thead>
          <tbody>
            <tr v-for="(item, idx) in marketMovers.slice(0, 8)" :key="idx" @click="selectStock(item.symbol)">
              <td><div class="mover-name"><span class="mn-sym">{{ item.symbol }}</span><span class="mn-full">{{ item.name }}</span></div></td>
              <td class="r mover-price">{{ fmtPrice(item.price) }}</td>
              <td class="r"><span class="mover-chg" :class="{ up: item.change >= 0, down: item.change < 0 }">{{ item.change >= 0 ? '+' : '' }}{{ item.change.toFixed(2) }} <small>({{ item.changePercent }}%)</small></span></td>
              <td class="r mover-val">{{ item.value }}</td>
            </tr>
          </tbody>
        </table>
        <div v-else class="empty-data-sm">No data available</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ─── DESIGN TOKENS ─── */
:root {
  --blue: #205BFC; --green: #21BF73; --red: #EF3A3A;
  --bg: #F8FAFC; --surface: #FFFFFF; --text: #0F172A;
  --text2: #475569; --text3: #94A3B8; --border: rgba(0,0,0,0.05);
  --radius: 20px; --radius-sm: 14px; --radius-xs: 10px;
  --shadow: 0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.04);
  --shadow-hover: 0 4px 20px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.04);
}

/* ─── PAGE ─── */
.dashboard-page {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  color: var(--text);
}

/* ─── HEADER ─── */
.page-header {
  display: flex; justify-content: space-between; align-items: flex-end;
  margin-bottom: 28px; gap: 16px; flex-wrap: wrap;
}
.page-title {
  font-family: 'DM Sans', 'Inter', sans-serif;
  font-size: 32px; font-weight: 800; margin: 0; letter-spacing: -1px; color: var(--text);
}
.page-subtitle {
  font-size: 14px; color: var(--text2); margin: 2px 0 0; font-weight: 400;
}
.header-actions { display: flex; align-items: center; gap: 16px; }
.last-update {
  font-size: 12px; font-weight: 500; color: var(--text3); white-space: nowrap;
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

/* ─── BENTO GRID ─── */
.bento-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}
.hero-card { grid-column: span 4; }
.ticker-card { grid-column: span 1; }
.sentiment-card { grid-column: span 1; }
.sector-card { grid-column: span 3; }
.stats-card { grid-column: span 1; }
.trades-card { grid-column: span 1; }
.movers-card { grid-column: span 2; }

/* ─── BENTO CARD BASE ─── */
.bento-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 24px;
  transition: all 0.25s ease;
  box-shadow: var(--shadow);
}
.bento-card:hover { box-shadow: var(--shadow-hover); }

.card-title {
  font-family: 'DM Sans', 'Inter', sans-serif;
  font-size: 14px; font-weight: 700; color: var(--text);
  margin: 0 0 16px 0;
}
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.card-header .card-title { margin: 0; }
.card-badge {
  font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 100px;
  background: rgba(32,91,252,0.07); color: var(--blue); text-transform: uppercase; letter-spacing: 0.5px;
}
.card-badge.blue { background: rgba(32,91,252,0.07); color: var(--blue); }

/* ─── HERO CARD ─── */
.bento-card.hero-card {
  padding: 0; overflow: hidden;
  background: linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%);
}
.hero-inner { display: flex; justify-content: space-between; gap: 32px; padding: 28px 28px 20px; }
.hero-left { display: flex; flex-direction: column; gap: 12px; }
.hero-badge-wrap { display: flex; align-items: center; gap: 12px; }
.hero-pill {
  font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 800;
  background: var(--text); color: white; padding: 5px 14px; border-radius: 8px; letter-spacing: 0.5px;
}
.hero-subtitle { font-size: 14px; color: var(--text2); font-weight: 500; }
.hero-value-row { display: flex; align-items: baseline; gap: 14px; }
.hero-value {
  font-family: 'DM Sans', sans-serif; font-size: 44px; font-weight: 800;
  letter-spacing: -1.5px; color: var(--text); line-height: 1;
}
.hero-change { font-size: 16px; font-weight: 700; display: flex; flex-direction: column; gap: 2px; }
.hero-change.up { color: var(--green); }
.hero-change.down { color: var(--red); }
.hero-pct { font-size: 13px; font-weight: 500; opacity: 0.85; }
.hero-right { display: flex; gap: 24px; flex-wrap: wrap; align-items: flex-end; }
.hero-stat { display: flex; flex-direction: column; gap: 3px; }
.hero-divider { width: 1px; background: var(--border); align-self: stretch; }
.hs-label { font-size: 10px; font-weight: 700; color: var(--text3); text-transform: uppercase; letter-spacing: 0.8px; }
.hs-val { font-size: 15px; font-weight: 700; color: var(--text); }
.hs-val.accent { color: var(--blue); }
.hero-footer {
  display: flex; gap: 24px; padding: 14px 28px;
  border-top: 1px solid var(--border); background: rgba(0,0,0,0.01);
}
.hf-item { font-size: 12px; font-weight: 600; display: flex; align-items: center; gap: 4px; }
.hf-item.up { color: var(--green); }
.hf-item.down { color: var(--red); }
.hf-item.neutral { color: var(--text3); }

/* ─── TICKER CARD ─── */
.ticker-card { cursor: pointer; }
.ticker-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.ticker-info { display: flex; align-items: center; gap: 8px; }
.ticker-symbol {
  font-family: 'DM Sans', sans-serif; font-size: 16px; font-weight: 700; color: var(--text); letter-spacing: -0.3px;
}
.ticker-exchange {
  font-size: 9px; font-weight: 700; color: var(--text3); background: var(--bg);
  padding: 2px 7px; border-radius: 5px; text-transform: uppercase; letter-spacing: 0.5px;
}
.ticker-pct {
  font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 100px;
}
.ticker-pct.up { background: rgba(33,191,115,0.1); color: var(--green); }
.ticker-pct.down { background: rgba(239,58,58,0.1); color: var(--red); }
.ticker-mid { display: flex; justify-content: space-between; align-items: flex-end; gap: 12px; margin-bottom: 10px; }
.ticker-price {
  font-family: 'DM Sans', sans-serif; font-size: 22px; font-weight: 700; color: var(--text); letter-spacing: -0.5px; white-space: nowrap;
}
.ticker-spark { width: 100px; height: 42px; flex-shrink: 0; }
.ticker-no-data { font-size: 11px; color: var(--text3); display: flex; align-items: center; justify-content: center; height: 42px; }
.ticker-bot { display: flex; align-items: center; gap: 8px; }
.ticker-change { font-size: 13px; font-weight: 600; }
.ticker-change.up { color: var(--green); }
.ticker-change.down { color: var(--red); }
.ticker-label { font-size: 11px; color: var(--text3); font-weight: 500; }

/* ─── SENTIMENT ─── */
.sentiment-card { display: flex; flex-direction: column; }
.sentiment-card .card-title { margin-bottom: 0; }
.gauge-area { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; }
.gauge-chart { position: relative; width: 160px; height: 100px; }
.gauge-kpi { position: absolute; bottom: -8px; left: 50%; transform: translateX(-50%); text-align: center; }
.gk-value { display: block; font-family: 'DM Sans', sans-serif; font-size: 26px; font-weight: 800; color: var(--text); line-height: 1; }
.gk-label { display: block; font-size: 11px; font-weight: 600; color: var(--text3); text-transform: uppercase; letter-spacing: 1px; }
.gauge-meta { display: flex; gap: 20px; }
.gm-row { display: flex; align-items: center; gap: 6px; }
.gm-dot { width: 7px; height: 7px; border-radius: 50%; }
.gm-dot.green { background: var(--green); }
.gm-dot.red { background: var(--red); }
.gm-text { font-size: 12px; color: var(--text2); font-weight: 500; }
.gm-pct { font-size: 12px; font-weight: 700; color: var(--text); }

/* ─── SECTOR ─── */
.sector-chart { height: 220px; }

/* ─── STATS ─── */
.stats-list { display: flex; flex-direction: column; gap: 4px; }
.stat-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 13px 12px; border-radius: var(--radius-xs); transition: background 0.2s ease;
}
.stat-row:hover { background: var(--bg); }
.stat-left { display: flex; align-items: center; gap: 10px; font-size: 13px; font-weight: 500; color: var(--text2); }
.sdot { width: 8px; height: 8px; border-radius: 3px; }
.sdot.blue { background: var(--blue); } .sdot.green { background: var(--green); }
.sdot.red { background: var(--red); } .sdot.accent { background: #B5E1ED; }
.stat-num { font-size: 15px; font-weight: 700; color: var(--text); }
.stat-num.green { color: var(--green); } .stat-num.red { color: var(--red); }

/* ─── TRADES TABLE ─── */
.trade-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.trade-table thead th {
  text-align: left; padding: 8px 8px 12px; font-size: 10px; font-weight: 700;
  color: var(--text3); text-transform: uppercase; letter-spacing: 0.7px; border-bottom: 1px solid var(--border);
}
.trade-table tbody td { padding: 10px 8px; border-bottom: 1px solid rgba(0,0,0,0.02); font-weight: 500; }
.trade-table tbody tr:hover td { background: var(--bg); }
.tt-time { color: var(--text3); font-size: 12px; }
.tt-price { color: var(--text); font-weight: 600; }
.tt-vol { color: var(--text2); }
.type-tag {
  display: inline-block; padding: 3px 10px; border-radius: 100px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;
}
.type-tag.buy { background: rgba(33,191,115,0.1); color: var(--green); }
.type-tag.sell { background: rgba(239,58,58,0.1); color: var(--red); }

/* ─── MOVERS ─── */
.mover-pills { display: flex; gap: 4px; background: var(--bg); border-radius: 100px; padding: 4px; }
.mover-pill {
  padding: 7px 16px; border: none; background: transparent; border-radius: 100px;
  font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 600; color: var(--text2);
  cursor: pointer; transition: all 0.2s ease; white-space: nowrap;
}
.mover-pill:hover { color: var(--text); }
.mover-pill.active { background: white; color: var(--text); box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.mover-table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 16px; }
.mover-table thead th {
  text-align: left; padding: 8px 8px 12px; font-size: 10px; font-weight: 700;
  color: var(--text3); text-transform: uppercase; letter-spacing: 0.7px; border-bottom: 1px solid var(--border);
}
.mover-table thead th.r { text-align: right; }
.mover-table tbody td { padding: 9px 8px; border-bottom: 1px solid rgba(0,0,0,0.02); font-weight: 500; }
.mover-table tbody tr { cursor: pointer; transition: background 0.15s ease; }
.mover-table tbody tr:hover td { background: var(--bg); }
.mover-table tbody td.r { text-align: right; }
.mover-name { display: flex; flex-direction: column; gap: 1px; }
.mn-sym { font-size: 13px; font-weight: 700; color: var(--text); }
.mn-full { font-size: 11px; color: var(--text3); font-weight: 500; max-width: 130px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mover-price { font-weight: 600; color: var(--text); }
.mover-chg { font-size: 12px; font-weight: 600; }
.mover-chg small { font-size: 10px; opacity: 0.8; }
.mover-chg.up { color: var(--green); }
.mover-chg.down { color: var(--red); }
.mover-val { font-weight: 600; color: var(--text); }

/* ─── LOADING ─── */
.loading-zone { min-height: 400px; }
.skel {
  background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius);
  overflow: hidden; position: relative;
}
.skel.hero { grid-column: span 4; height: 200px; }
.skel.card { grid-column: span 1; height: 170px; }
.skel.tall { grid-column: span 1; height: 280px; }
.skel.wide { grid-column: span 3; height: 280px; }
.shimmer {
  position: absolute; inset: 0;
  background: linear-gradient(90deg, transparent 0%, rgba(148,163,184,0.08) 50%, transparent 100%);
  animation: shimmer 1.6s infinite;
}
@keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }

/* ─── EMPTY ─── */
.empty-data { display: flex; align-items: center; justify-content: center; height: 100%; color: var(--text3); font-size: 13px; }
.empty-data-sm { text-align: center; color: var(--text3); font-size: 13px; padding: 32px 0; font-weight: 500; }

/* ─── RESPONSIVE ─── */
@media (max-width: 1200px) {
  .bento-grid { grid-template-columns: repeat(3, 1fr); }
  .hero-card, .sector-card, .movers-card { grid-column: span 3; }
  .sentiment-card { grid-column: span 1; }
  .stats-card { grid-column: span 1; }
  .trades-card { grid-column: span 2; }
  .ticker-card:nth-child(4) { grid-column: span 3; }
}
@media (max-width: 768px) {
  .page-header { flex-direction: column; align-items: flex-start; }
  .bento-grid { grid-template-columns: 1fr; gap: 14px; }
  .hero-card, .ticker-card, .sector-card, .sentiment-card, .stats-card, .trades-card, .movers-card { grid-column: span 1; }
  .hero-inner { flex-direction: column; gap: 20px; }
  .hero-right { gap: 12px; }
  .hero-divider { width: 100%; height: 1px; }
  .hero-value { font-size: 36px; }
  .card-header { flex-wrap: wrap; gap: 8px; }
}
</style>
