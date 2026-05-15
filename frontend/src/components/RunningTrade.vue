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
  totalLot: buyTrades.value.reduce((s, t) => s + (parseInt(String(t.lot || 0)) || 0), 0)
}))

const sellSummary = computed(() => ({
  count: sellTrades.value.length,
  totalLot: sellTrades.value.reduce((s, t) => s + (parseInt(String(t.lot || 0)) || 0), 0)
}))

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

    <!-- CONTENT -->
    <template v-else>
      <!-- BUY/SELL SUMMARY -->
      <div class="rt-summary">
        <div class="rt-sum-box buy">
          <span class="rts-label">Buy</span>
          <span class="rts-count">{{ buySummary.count }}</span>
          <span class="rts-lot">{{ buySummary.totalLot.toLocaleString('id-ID') }} lot</span>
        </div>
        <div class="rt-sum-box sell">
          <span class="rts-label">Sell</span>
          <span class="rts-count">{{ sellSummary.count }}</span>
          <span class="rts-lot">{{ sellSummary.totalLot.toLocaleString('id-ID') }} lot</span>
        </div>
      </div>

      <!-- TRADE LIST -->
      <div class="rt-list">
        <div v-for="trade in trades.slice(0, 50)" :key="trade.trade_number" class="rt-row" :class="trade.action">
          <span class="rt-time">{{ trade.time?.substring(0, 8) || trade.time }}</span>
          <span class="rt-type-tag" :class="trade.action">{{ trade.action === 'buy' ? 'B' : 'S' }}</span>
          <span class="rt-price">{{ trade.price }}</span>
          <span class="rt-lot">{{ trade.lot }}</span>
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

/* SUMMARY */
.rt-summary { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px; }
.rt-sum-box { display: flex; flex-direction: column; align-items: center; padding: 12px 8px; border-radius: var(--radius); }
.rt-sum-box.buy { background: rgba(33,191,115,0.06); }
.rt-sum-box.sell { background: rgba(239,58,58,0.06); }
.rts-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; }
.rt-sum-box.buy .rts-label { color: var(--green); }
.rt-sum-box.sell .rts-label { color: var(--red); }
.rts-count { font-family: 'DM Sans', sans-serif; font-size: 22px; font-weight: 800; color: var(--text); line-height: 1; margin: 2px 0; }
.rts-lot { font-size: 11px; color: var(--text2); font-weight: 500; }

/* TRADE LIST */
.rt-list { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 3px; }
.rt-row { display: grid; grid-template-columns: 52px 28px 1fr 48px; align-items: center; gap: 6px; padding: 7px 10px; border-radius: 8px; font-size: 13px; cursor: default; transition: background 0.15s ease; }
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

/* Scrollbar */
.rt-list::-webkit-scrollbar { width: 4px; }
.rt-list::-webkit-scrollbar-track { background: transparent; }
.rt-list::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.08); border-radius: 4px; }
</style>
