<script setup>
import { computed, ref, watch, onMounted } from 'vue'
import axios from 'axios'
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale
} from 'chart.js'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale)

const API_BASE = ''
const emit = defineEmits(['select-emiten'])

const rawData = ref(null)
const loading = ref(false)
const searchQuery = ref('')
const currentPage = ref(1)
const itemsPerPage = 20

function selectStock(symbol) { if (symbol) emit('select-emiten', symbol) }
watch(searchQuery, () => { currentPage.value = 1 })

function goToPage(p) { if (p >= 1 && p <= totalPages.value) currentPage.value = p }
function prevPage() { if (currentPage.value > 1) currentPage.value-- }
function nextPage() { if (currentPage.value < totalPages.value) currentPage.value++ }

async function fetchData() {
  loading.value = true
  try {
    const res = await axios.get(`${API_BASE}/api/emiten/trending`, {
      params: { _t: Date.now() },
      headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
    })
    rawData.value = res.data
  } catch (e) { console.error('Trending fetch error:', e) }
  finally { loading.value = false }
}

const stocks = computed(() => {
  const raw = rawData.value
  if (!raw) return []
  let items = []
  if (Array.isArray(raw)) items = raw
  else if (raw.data && Array.isArray(raw.data)) items = raw.data
  else if (raw.results && Array.isArray(raw.results)) items = raw.results
  else if (raw.stocks && Array.isArray(raw.stocks)) items = raw.stocks
  return items.map(item => ({
    symbol: item.symbol || item.code || item.ticker || item.stock || item.sym || '?',
    name: item.name || item.company || item.nama || item.symbol || '',
    price: parseFloat(item.price || item.close || item.last || 0) || 0,
    change: parseFloat(item.change || item.chg || item.price_change || 0) || 0,
    changePercent: parseFloat(item.change_percent || item.changePercent || item.percent || 0) || 0,
    volume: item.volume || item.vol || item.v || 0
  }))
})

const filteredStocks = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return stocks.value
  return stocks.value.filter(s => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q))
})

const totalPages = computed(() => Math.ceil(filteredStocks.value.length / itemsPerPage))

const paginatedStocks = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  return filteredStocks.value.slice(start, start + itemsPerPage)
})

const sortedByChange = computed(() => [...filteredStocks.value].sort((a, b) => b.changePercent - a.changePercent))

const topGainers = computed(() => sortedByChange.value.filter(s => s.changePercent > 0).slice(0, 5))
const topLosers = computed(() => sortedByChange.value.filter(s => s.changePercent < 0).slice(-5).reverse())

const barChartConfig = computed(() => {
  const top10 = [...sortedByChange.value]
    .sort((a, b) => b.changePercent - a.changePercent)
    .slice(0, 10)
  if (!top10.length) return null
  return {
    type: 'bar',
    data: {
      labels: top10.map(s => s.symbol),
      datasets: [{
        data: top10.map(s => s.changePercent),
        backgroundColor: top10.map(s => s.changePercent >= 0 ? '#21BF73' : '#EF3A3A'),
        borderRadius: 8,
        barThickness: 20
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (ctx) => `${ctx.parsed.x >= 0 ? '+' : ''}${ctx.parsed.x.toFixed(2)}%` } }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { font: { family: 'Inter', size: 11 }, color: '#94A3B8', callback: (v) => v + '%' }
        },
        y: {
          grid: { display: false },
          ticks: { font: { family: 'Inter', size: 12, weight: '700' }, color: '#1E1E1E' }
        }
      }
    }
  }
})

function isUp(v) { return (v || 0) >= 0 }
function fmtPrice(p) { return 'Rp ' + (p || 0).toLocaleString('id-ID') }
function fmtDelta(n) { return (n >= 0 ? '+' : '') + (n || 0).toLocaleString('id-ID') }

onMounted(() => { fetchData() })
</script>

<template>
  <div v-if="loading && !rawData" class="empty-page">Loading trending data...</div>

  <div class="trending-page" v-else-if="stocks.length > 0">
    <!-- PAGE HEADER -->
    <div class="page-header">
      <div>
        <h1 class="page-title">Trending Stocks</h1>
        <p class="page-subtitle">Real-time trending stocks from Indonesian market</p>
      </div>
      <div class="header-actions">
        <div class="header-stats">
          <span class="hs-item up">▲ {{ stocks.filter(s => s.changePercent > 0).length }} up</span>
          <span class="hs-item down">▼ {{ stocks.filter(s => s.changePercent < 0).length }} down</span>
          <span class="hs-item total">{{ stocks.length }} stocks</span>
        </div>
        <button class="btn-refresh" @click="fetchData" :disabled="loading">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>
          Refresh
        </button>
      </div>
    </div>

    <!-- BENTO GRID -->
    <div class="trending-grid">
      <!-- TOP GAINERS CARD -->
      <div class="bento-card gainers-card">
        <h3 class="card-title">Top Gainers</h3>
        <div class="mover-list">
          <div v-for="s in topGainers" :key="s.symbol" class="mover-row clickable" @click="selectStock(s.symbol)">
            <div class="ml-info">
              <span class="ml-sym">{{ s.symbol }}</span>
              <span class="ml-name">{{ s.name }}</span>
            </div>
            <div class="ml-meta">
              <span class="ml-price">{{ fmtPrice(s.price) }}</span>
              <span class="ml-pct up">+{{ s.changePercent.toFixed(2) }}%</span>
            </div>
          </div>
          <div v-if="!topGainers.length" class="empty-row">No gainers today</div>
        </div>
      </div>

      <!-- TOP LOSERS CARD -->
      <div class="bento-card losers-card">
        <h3 class="card-title">Top Losers</h3>
        <div class="mover-list">
          <div v-for="s in topLosers" :key="s.symbol" class="mover-row clickable" @click="selectStock(s.symbol)">
            <div class="ml-info">
              <span class="ml-sym">{{ s.symbol }}</span>
              <span class="ml-name">{{ s.name }}</span>
            </div>
            <div class="ml-meta">
              <span class="ml-price">{{ fmtPrice(s.price) }}</span>
              <span class="ml-pct down">{{ s.changePercent.toFixed(2) }}%</span>
            </div>
          </div>
          <div v-if="!topLosers.length" class="empty-row">No losers today</div>
        </div>
      </div>

      <!-- CHART -->
      <div class="bento-card chart-card">
        <h3 class="card-title">Top 10 Price Changes</h3>
        <div class="chart-area">
          <Bar v-if="barChartConfig" :data="barChartConfig.data" :options="barChartConfig.options" />
          <div v-else class="empty-data">No chart data</div>
        </div>
      </div>

      <!-- SEARCH + TABLE -->
      <div class="bento-card table-card">
        <div class="card-header">
          <h3 class="card-title">All Stocks</h3>
          <div class="search-wrap">
            <svg class="search-icon-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input v-model="searchQuery" type="text" placeholder="Search symbol or name..." class="search-inp" />
            <span v-if="searchQuery" class="search-result">{{ filteredStocks.length }} results</span>
          </div>
        </div>

        <div v-if="filteredStocks.length === 0 && searchQuery" class="empty-search">
          No stocks match "{{ searchQuery }}"
        </div>

        <table v-else class="data-table">
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Name</th>
              <th class="r">Price</th>
              <th class="r">Change</th>
              <th class="r">%</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in paginatedStocks" :key="s.symbol" class="clickable" @click="selectStock(s.symbol)">
              <td><span class="dt-sym">{{ s.symbol }}</span></td>
              <td class="dt-name">{{ s.name }}</td>
              <td class="r dt-price">{{ fmtPrice(s.price) }}</td>
              <td class="r" :class="isUp(s.change) ? 'up' : 'down'">{{ fmtDelta(s.change) }}</td>
              <td class="r" :class="isUp(s.changePercent) ? 'up' : 'down'">
                {{ isUp(s.changePercent) ? '+' : '' }}{{ s.changePercent.toFixed(2) }}%
              </td>
            </tr>
          </tbody>
        </table>

        <!-- PAGINATION -->
        <div class="pagination" v-if="totalPages > 1">
          <button class="pg-btn" @click="prevPage" :disabled="currentPage === 1">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <div class="pg-pages">
            <button v-for="p in totalPages" :key="p" class="pg-btn" :class="{ active: p === currentPage }" @click="goToPage(p)">{{ p }}</button>
          </div>
          <button class="pg-btn" @click="nextPage" :disabled="currentPage === totalPages">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
      </div>
    </div>
  </div>
  <div v-else class="empty-page">No trending data available</div>
</template>

<style scoped>
/* ─── DESIGN TOKENS ─── */
.trending-page {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  color: #0F172A;
  --blue: #205BFC; --green: #21BF73; --red: #EF3A3A;
  --bg: #F8FAFC; --surface: #FFFFFF; --text: #0F172A;
  --text2: #475569; --text3: #94A3B8; --border: rgba(0,0,0,0.05);
  --radius: 20px; --radius-sm: 14px;
  --shadow: 0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.04);
  --shadow-hover: 0 4px 20px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.04);
}

/* ─── HEADER ─── */
.page-header {
  display: flex; justify-content: space-between; align-items: flex-end;
  margin-bottom: 24px; gap: 16px; flex-wrap: wrap;
}
.page-title {
  font-family: 'DM Sans', 'Inter', sans-serif;
  font-size: 28px; font-weight: 800; margin: 0; letter-spacing: -1px; color: var(--text);
}
.page-subtitle {
  font-size: 14px; color: var(--text2); margin: 2px 0 0; font-weight: 400;
}
.header-stats { display: flex; gap: 16px; }
.hs-item {
  font-size: 12px; font-weight: 700; padding: 5px 12px; border-radius: 100px;
}
.hs-item.up { background: rgba(33,191,115,0.08); color: var(--green); }
.hs-item.down { background: rgba(239,58,58,0.08); color: var(--red); }
.hs-item.total { background: rgba(0,0,0,0.04); color: var(--text2); }

.header-actions { display: flex; align-items: center; gap: 16px; }
.btn-refresh {
  display: inline-flex; align-items: center; gap: 8px;
  height: 36px; padding: 0 16px;
  background: var(--surface); border: 1px solid var(--border); border-radius: 100px;
  font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 600;
  color: var(--text); cursor: pointer; transition: all 0.2s ease; white-space: nowrap;
}
.btn-refresh:hover:not(:disabled) { box-shadow: var(--shadow-hover); border-color: rgba(0,0,0,0.1); }
.btn-refresh:disabled { opacity: 0.5; cursor: not-allowed; }

/* ─── BENTO GRID ─── */
.trending-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 20px;
}
.gainers-card { grid-column: span 1; }
.losers-card { grid-column: span 1; }
.chart-card { grid-column: span 1; }
.table-card { grid-column: span 3; }

/* ─── BENTO CARD ─── */
.bento-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 24px;
  box-shadow: var(--shadow);
  transition: all 0.25s ease;
}
.bento-card:hover { box-shadow: var(--shadow-hover); }

.card-title {
  font-family: 'DM Sans', 'Inter', sans-serif;
  font-size: 14px; font-weight: 700; color: var(--text);
  margin: 0 0 16px 0;
}
.card-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 16px; gap: 16px; flex-wrap: wrap;
}
.card-header .card-title { margin: 0; }

/* ─── MOVERS LIST ─── */
.mover-list { display: flex; flex-direction: column; gap: 6px; }
.mover-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 12px; border-radius: var(--radius-sm);
  transition: all 0.15s ease;
}
.mover-row:hover { background: var(--bg); }
.ml-info { display: flex; flex-direction: column; gap: 2px; }
.ml-sym { font-size: 14px; font-weight: 700; color: var(--text); }
.ml-name { font-size: 11px; color: var(--text3); font-weight: 500; max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ml-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
.ml-price { font-size: 13px; font-weight: 600; color: var(--text); }
.ml-pct { font-size: 13px; font-weight: 700; }
.ml-pct.up { color: var(--green); }
.ml-pct.down { color: var(--red); }
.empty-row { text-align: center; padding: 16px; font-size: 13px; color: var(--text3); font-weight: 500; }

/* ─── CHART ─── */
.chart-area { height: 380px; }

/* ─── SEARCH ─── */
.search-wrap {
  display: flex; align-items: center; gap: 10px;
  position: relative;
}
.search-icon-svg {
  position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
  color: var(--text3); pointer-events: none; z-index: 1;
}
.search-inp {
  width: 280px; height: 40px; padding: 0 16px 0 40px;
  border: 1px solid var(--border); border-radius: 100px;
  background: var(--bg); font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 500;
  color: var(--text); outline: none; transition: all 0.2s ease;
}
.search-inp::placeholder { color: var(--text3); }
.search-inp:focus { border-color: var(--blue); background: var(--surface); box-shadow: 0 0 0 3px rgba(32,91,252,0.08); }
.search-result { font-size: 12px; font-weight: 600; color: var(--text3); white-space: nowrap; }

/* ─── TABLE ─── */
.empty-search { text-align: center; padding: 48px 20px; font-size: 14px; color: var(--text3); font-weight: 500; }
.data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.data-table thead th {
  text-align: left; padding: 10px 12px 14px;
  font-size: 10px; font-weight: 700; color: var(--text3); text-transform: uppercase;
  letter-spacing: 0.7px; border-bottom: 1px solid var(--border);
}
.data-table thead th.r { text-align: right; }
.data-table tbody td {
  padding: 12px; border-bottom: 1px solid rgba(0,0,0,0.02); font-weight: 500;
}
.data-table tbody tr:hover td { background: var(--bg); }
.dt-sym { font-size: 14px; font-weight: 700; color: var(--text); }
.dt-name { font-size: 13px; color: var(--text2); max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dt-price { font-weight: 600; color: var(--text); }
td.r { text-align: right; }
td.up { color: var(--green); font-weight: 600; }
td.down { color: var(--red); font-weight: 600; }

/* ─── PAGINATION ─── */
.pagination {
  display: flex; justify-content: center; align-items: center; gap: 8px;
  margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--border);
}
.pg-pages { display: flex; gap: 4px; }
.pg-btn {
  width: 38px; height: 38px; display: flex; align-items: center; justify-content: center;
  border: 1px solid var(--border); background: var(--surface); border-radius: var(--radius-sm);
  cursor: pointer; font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 600;
  color: var(--text2); transition: all 0.2s ease;
}
.pg-btn:hover:not(:disabled) { border-color: rgba(0,0,0,0.12); background: var(--bg); }
.pg-btn.active { background: #0F172A; color: white; border-color: #0F172A; }
.pg-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.clickable { cursor: pointer; }

/* ─── EMPTY ─── */
.empty-data { height: 380px; display: flex; align-items: center; justify-content: center; color: var(--text3); font-size: 13px; }
.empty-page { text-align: center; padding: 80px 20px; color: var(--text3); font-size: 15px; font-weight: 500; }

/* ─── RESPONSIVE ─── */
@media (max-width: 1024px) {
  .trending-grid { grid-template-columns: 1fr 1fr; }
  .gainers-card, .losers-card, .chart-card, .table-card { grid-column: span 2; }
}
@media (max-width: 768px) {
  .page-header { flex-direction: column; align-items: flex-start; }
  .trending-grid { grid-template-columns: 1fr; gap: 14px; }
  .gainers-card, .losers-card, .chart-card, .table-card { grid-column: span 1; }
  .chart-area { height: 300px; }
  .search-inp { width: 100%; }
  .card-header { flex-direction: column; align-items: stretch; }
}
</style>
