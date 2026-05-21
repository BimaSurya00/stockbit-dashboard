<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import axios from 'axios'

const props = defineProps({ symbol: { type: String, default: 'BRPT' } })
const API_BASE = ''

const trades = ref([])
const isOpenMarket = ref(false)
const loading = ref(false)
const error = ref('')
const autoRefresh = ref(true)
const refreshInterval = ref(null)

const buyTrades = computed(() => trades.value.filter(t => t.action === 'buy'))
const sellTrades = computed(() => trades.value.filter(t => t.action === 'sell'))

const buySummary = computed(() => ({
  count: buyTrades.value.length,
  totalLot: buyTrades.value.reduce((s, t) => s + (parseInt(String(t.lot || 0)) || 0), 0),
  totalValue: buyTrades.value.reduce((s, t) => s + ((parseInt(String(t.lot || 0)) || 0) * (parseInt(String(t.price || 0)) || 0) * 100), 0)
}))

const sellSummary = computed(() => ({
  count: sellTrades.value.length,
  totalLot: sellTrades.value.reduce((s, t) => s + (parseInt(String(t.lot || 0)) || 0), 0),
  totalValue: sellTrades.value.reduce((s, t) => s + ((parseInt(String(t.lot || 0)) || 0) * (parseInt(String(t.price || 0)) || 0) * 100), 0)
}))

const buyPressure = computed(() => {
  const total = buySummary.value.totalValue + sellSummary.value.totalValue
  return total > 0 ? ((buySummary.value.totalValue / total) * 100).toFixed(1) : 0
})

function formatRupiah(value) {
  if (value >= 1000000000) return (value / 1000000000).toFixed(2) + ' M'
  if (value >= 1000000) return (value / 1000000).toFixed(2) + ' Jt'
  if (value >= 1000) return (value / 1000).toFixed(2) + ' Rb'
  return value.toString()
}

function getTradeValue(trade) {
  const lot = parseInt(String(trade.lot || 0)) || 0
  const price = parseInt(String(trade.price || 0)) || 0
  return lot * price * 100
}

async function fetchRunningTrade() {
  if (!props.symbol) return
  loading.value = true; error.value = ''
  try {
    const res = await axios.get(`${API_BASE}/api/running-trade/${props.symbol}`, {
      params: { _t: Date.now() },
      headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
    })
    const data = res.data?.data
    if (data) {
      trades.value = data.running_trade || []
      isOpenMarket.value = data.is_open_market || false
    }
  } catch (err) {
    error.value = err.response?.data?.error || err.message
  } finally { loading.value = false }
}

function toggleAutoRefresh() {
  autoRefresh.value = !autoRefresh.value
  autoRefresh.value ? startAutoRefresh() : stopAutoRefresh()
}

function startAutoRefresh() {
  stopAutoRefresh()
  refreshInterval.value = setInterval(() => {
    if (autoRefresh.value && isOpenMarket.value) fetchRunningTrade()
  }, 5000)
}

function stopAutoRefresh() {
  if (refreshInterval.value) { clearInterval(refreshInterval.value); refreshInterval.value = null }
}

watch(() => props.symbol, (s) => { if (s) { trades.value = []; fetchRunningTrade() } })
onMounted(() => { fetchRunningTrade(); startAutoRefresh() })
onUnmounted(() => { stopAutoRefresh() })
</script>

<template>
  <div class="rt-container">
    <!-- HEADER -->
    <div class="rt-header">
      <div class="rt-header-left">
        <h3 class="rt-title">Running Trade</h3>
        <span class="rt-symbol-badge">{{ symbol }}</span>
      </div>
      <div class="rt-header-right">
        <div class="rt-market-status" :class="{ open: isOpenMarket, closed: !isOpenMarket }">
          <span class="status-dot"></span>
          {{ isOpenMarket ? 'Live' : 'Closed' }}
        </div>
        <button class="rt-refresh" @click="toggleAutoRefresh" :title="autoRefresh ? 'Auto-refresh on' : 'Auto-refresh off'">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            :class="{ spinning: autoRefresh && isOpenMarket }">
            <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- ERROR -->
    <div v-if="error" class="rt-error">{{ error }}</div>

    <!-- LOADING -->
    <div v-if="loading && !trades.length" class="rt-loading">Loading trades...</div>

    <!-- NO DATA -->
    <div v-else-if="!loading && !error && !trades.length" class="rt-empty">No trades available for {{ symbol }}</div>

    <!-- INFO PANEL -->
    <div v-if="!error" class="rt-info-panel">
      <div class="rt-info-icon">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="16" x2="12" y2="12"/>
          <line x1="12" y1="8" x2="12.01" y2="8"/>
        </svg>
      </div>
      <div class="rt-info-text">
        <p class="rt-info-title">Apa itu Running Trade?</p>
        <p class="rt-info-desc">Daftar transaksi saham real-time yang sedang berlangsung. Menampilkan waktu, jenis (Beli/Jual), harga, lot, dan nilai transaksi. <strong>1 Lot = 100 lembar saham.</strong></p>
      </div>
    </div>

    <!-- CONTENT -->
    <template v-else>
      <!-- BUY/SELL SUMMARY -->
      <div class="rt-summary">
        <div class="rt-sum-box buy">
          <span class="rts-label">Beli (Buy)</span>
          <span class="rts-count">{{ buySummary.count }}</span>
          <span class="rts-lot">{{ buySummary.totalLot.toLocaleString('id-ID') }} lot</span>
          <span class="rts-value">Rp {{ formatRupiah(buySummary.totalValue) }}</span>
        </div>
        <div class="rt-sum-box sell">
          <span class="rts-label">Jual (Sell)</span>
          <span class="rts-count">{{ sellSummary.count }}</span>
          <span class="rts-lot">{{ sellSummary.totalLot.toLocaleString('id-ID') }} lot</span>
          <span class="rts-value">Rp {{ formatRupiah(sellSummary.totalValue) }}</span>
        </div>
      </div>

      <!-- PRESSURE BAR -->
      <div class="rt-pressure">
        <div class="rt-pressure-label">
          <span>Tekanan Pasar</span>
          <span class="rt-pressure-value">
            <span class="pressure-buy">{{ buyPressure }}% Beli</span>
            <span class="pressure-separator">vs</span>
            <span class="pressure-sell">{{ (100 - buyPressure).toFixed(1) }}% Jual</span>
          </span>
        </div>
        <div class="rt-pressure-bar">
          <div class="rt-pressure-fill buy" :style="{ width: buyPressure + '%' }"></div>
          <div class="rt-pressure-fill sell" :style="{ width: (100 - buyPressure) + '%' }"></div>
        </div>
      </div>

      <!-- LEGEND -->
      <div class="rt-legend">
        <div class="rt-legend-item">
          <span class="rt-legend-tag buy">B</span>
          <span>Beli (Buyer/Ask)</span>
        </div>
        <div class="rt-legend-item">
          <span class="rt-legend-tag sell">S</span>
          <span>Jual (Seller/Bid)</span>
        </div>
        <div class="rt-legend-item">
          <span class="rt-legend-dot">•</span>
          <span>1 Lot = 100 Saham</span>
        </div>
      </div>

      <!-- COLUMN HEADERS -->
      <div class="rt-column-headers">
        <span class="rt-col-header" title="Waktu transaksi">Waktu</span>
        <span class="rt-col-header" title="Jenis transaksi: B=Beli, S=Jual">Tipe</span>
        <span class="rt-col-header" title="Harga per saham">Harga</span>
        <span class="rt-col-header" title="Jumlah lot (1 lot = 100 saham)">Lot</span>
        <span class="rt-col-header" title="Nilai total transaksi">Nilai</span>
      </div>

      <!-- TRADE LIST -->
      <div class="rt-list">
        <div v-for="trade in trades.slice(0, 50)" :key="trade.trade_number" class="rt-row" :class="trade.action">
          <span class="rt-time">{{ trade.time?.substring(0, 8) || trade.time }}</span>
          <span class="rt-type-tag" :class="trade.action">{{ trade.action === 'buy' ? 'B' : 'S' }}</span>
          <span class="rt-price">{{ trade.price }}</span>
          <span class="rt-lot">{{ trade.lot }}</span>
          <span class="rt-value">Rp {{ formatRupiah(getTradeValue(trade)) }}</span>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.rt-container {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  color: #0F172A; height: 100%; display: flex; flex-direction: column;
  --green: #21BF73; --red: #EF3A3A; --blue: #205BFC;
  --text: #0F172A; --text2: #475569; --text3: #94A3B8;
  --border: rgba(0,0,0,0.05); --radius: 10px;
  --transition: all 0.2s ease;
}

/* HEADER */
.rt-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; gap: 12px; }
.rt-header-left { display: flex; align-items: center; gap: 10px; }
.rt-title { font-family: 'DM Sans', 'Inter', sans-serif; font-size: 15px; font-weight: 700; color: var(--text); margin: 0; }
.rt-symbol-badge { font-size: 10px; font-weight: 700; padding: 3px 8px; background: rgba(32,91,252,0.07); color: var(--blue); border-radius: 100px; letter-spacing: 0.5px; text-transform: uppercase; }
.rt-header-right { display: flex; align-items: center; gap: 10px; }
.rt-market-status { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 100px; }
.rt-market-status.open { background: rgba(33,191,115,0.08); color: var(--green); }
.rt-market-status.closed { background: rgba(239,58,58,0.08); color: var(--red); }
.status-dot { width: 6px; height: 6px; border-radius: 50%; }
.rt-market-status.open .status-dot { background: var(--green); }
.rt-market-status.closed .status-dot { background: var(--red); }
.rt-refresh { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border: 1px solid var(--border); background: white; border-radius: var(--radius); cursor: pointer; color: var(--text2); transition: var(--transition); }
.rt-refresh:hover { border-color: rgba(0,0,0,0.12); color: var(--text); }
.spinning { animation: spin 1.5s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ERROR / LOADING / EMPTY */
.rt-error { padding: 10px 14px; background: rgba(239,58,58,0.06); border: 1px solid rgba(239,58,58,0.15); border-radius: var(--radius); color: var(--red); font-size: 12px; font-weight: 500; margin-bottom: 12px; }
.rt-loading { text-align: center; padding: 40px 0; color: var(--text3); font-size: 13px; }
.rt-empty { text-align: center; padding: 40px 0; color: var(--text3); font-size: 13px; font-weight: 500; }

/* INFO PANEL */
.rt-info-panel { display: flex; gap: 10px; padding: 12px; background: rgba(32,91,252,0.04); border: 1px solid rgba(32,91,252,0.1); border-radius: var(--radius); margin-bottom: 16px; }
.rt-info-icon { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; background: rgba(32,91,252,0.1); border-radius: 8px; color: var(--blue); flex-shrink: 0; }
.rt-info-text { flex: 1; }
.rt-info-title { font-size: 12px; font-weight: 700; color: var(--text); margin: 0 0 4px 0; }
.rt-info-desc { font-size: 11px; color: var(--text2); margin: 0; line-height: 1.5; }
.rt-info-desc strong { color: var(--blue); }

/* SUMMARY */
.rt-summary { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px; }
.rt-sum-box { display: flex; flex-direction: column; align-items: center; padding: 12px 8px; border-radius: var(--radius); }
.rt-sum-box.buy { background: rgba(33,191,115,0.06); }
.rt-sum-box.sell { background: rgba(239,58,58,0.06); }
.rts-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; }
.rt-sum-box.buy .rts-label { color: var(--green); }
.rt-sum-box.sell .rts-label { color: var(--red); }
.rts-count { font-family: 'DM Sans', sans-serif; font-size: 22px; font-weight: 800; color: var(--text); line-height: 1; margin: 2px 0; }
.rts-lot { font-size: 11px; color: var(--text2); font-weight: 500; }
.rts-value { font-size: 10px; color: var(--text3); font-weight: 600; margin-top: 2px; }

/* PRESSURE BAR */
.rt-pressure { margin-bottom: 12px; padding: 10px; background: #F8FAFC; border-radius: var(--radius); }
.rt-pressure-label { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 11px; color: var(--text2); }
.rt-pressure-value { display: flex; gap: 6px; align-items: center; }
.pressure-buy { color: var(--green); font-weight: 700; }
.pressure-sell { color: var(--red); font-weight: 700; }
.pressure-separator { color: var(--text3); font-size: 10px; }
.rt-pressure-bar { display: flex; height: 6px; border-radius: 3px; overflow: hidden; }
.rt-pressure-fill.buy { background: var(--green); transition: width 0.5s ease; }
.rt-pressure-fill.sell { background: var(--red); transition: width 0.5s ease; }

/* LEGEND */
.rt-legend { display: flex; gap: 12px; margin-bottom: 12px; padding: 8px 10px; background: #F8FAFC; border-radius: 8px; }
.rt-legend-item { display: flex; align-items: center; gap: 5px; font-size: 11px; color: var(--text2); }
.rt-legend-tag { display: flex; align-items: center; justify-content: center; width: 18px; height: 18px; border-radius: 4px; font-size: 9px; font-weight: 800; }
.rt-legend-tag.buy { background: rgba(33,191,115,0.15); color: var(--green); }
.rt-legend-tag.sell { background: rgba(239,58,58,0.15); color: var(--red); }
.rt-legend-dot { color: var(--text3); font-size: 14px; line-height: 1; }

/* COLUMN HEADERS */
.rt-column-headers { display: grid; grid-template-columns: 52px 28px 1fr 48px 60px; align-items: center; gap: 6px; padding: 6px 10px; font-size: 10px; font-weight: 700; color: var(--text3); text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid var(--border); margin-bottom: 4px; }
.rt-col-header { cursor: help; }

/* TRADE LIST */
.rt-list { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 3px; }
.rt-row { display: grid; grid-template-columns: 52px 28px 1fr 48px 60px; align-items: center; gap: 6px; padding: 7px 10px; border-radius: 8px; font-size: 13px; cursor: default; transition: background 0.15s ease; }
.rt-row:hover { background: #F8FAFC; }
.rt-row.buy { background: rgba(33,191,115,0.03); }
.rt-row.sell { background: rgba(239,58,58,0.03); }
.rt-row.buy:hover { background: rgba(33,191,115,0.08); }
.rt-row.sell:hover { background: rgba(239,58,58,0.08); }
.rt-time { font-size: 11px; color: var(--text3); font-family: 'DM Mono', monospace; font-weight: 500; }
.rt-type-tag { display: flex; align-items: center; justify-content: center; width: 24px; height: 20px; border-radius: 6px; font-size: 10px; font-weight: 800; }
.rt-type-tag.buy { background: rgba(33,191,115,0.15); color: var(--green); }
.rt-type-tag.sell { background: rgba(239,58,58,0.15); color: var(--red); }
.rt-price { font-weight: 600; color: var(--text); text-align: right; }
.rt-lot { font-weight: 600; color: var(--text2); text-align: right; }
.rt-value { font-size: 11px; color: var(--text3); text-align: right; font-weight: 500; }

/* Scrollbar */
.rt-list::-webkit-scrollbar { width: 4px; }
.rt-list::-webkit-scrollbar-track { background: transparent; }
.rt-list::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.08); border-radius: 4px; }
</style>
