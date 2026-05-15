<script setup>
import { ref, watch } from 'vue'
import axios from 'axios'
import StockChart from './StockChart.vue'
import RunningTrade from './RunningTrade.vue'

const props = defineProps({ symbol: { type: String, default: 'GOTO' } })
const emit = defineEmits(['back'])

const API_BASE = ''
const timeframe = ref('1d')
const chartData = ref(null)
const chartLoading = ref(false)
const chartError = ref('')

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

async function fetchChart() {
  if (!props.symbol) return
  chartLoading.value = true; chartError.value = ''; chartData.value = null
  try {
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

    // Fallback to Stockbit API
    const res = await axios.get(`${API_BASE}/api/chart/${props.symbol}`, {
      params: { timeframe: timeframe.value, _t: Date.now() },
      headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
    })
    chartData.value = res.data
  } catch (err) {
    chartError.value = err.response?.data?.error || err.message
  } finally { chartLoading.value = false }
}

watch(() => props.symbol, (s) => { if (s) fetchChart() })
watch(timeframe, () => { fetchChart() })
fetchChart()
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
          <span class="page-subtitle">Chart & Live Trade</span>
        </div>
      </div>
      <div class="timeframe-pills">
        <button v-for="tf in timeframes" :key="tf.value"
          class="tf-pill" :class="{ active: timeframe === tf.value }"
          @click="timeframe = tf.value">{{ tf.label }}</button>
      </div>
    </div>

    <div v-if="chartError" class="error-msg">{{ chartError }}</div>

    <!-- Content Grid -->
    <div class="detail-grid">
      <div class="dt-card chart-card">
        <div v-if="chartLoading" class="loading-state">
          <div class="loading-spinner"></div>
          <span>Loading chart data...</span>
        </div>
        <StockChart v-else :data="chartData" />
      </div>
      <div class="dt-card trade-card">
        <RunningTrade :symbol="symbol" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.detail-page {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  color: #0F172A;
  --blue: #205BFC; --green: #21BF73; --red: #EF3A3A;
  --surface: #FFFFFF; --text: #0F172A; --text2: #475569; --text3: #94A3B8;
  --border: rgba(0,0,0,0.05); --radius: 20px; --radius-sm: 14px;
  --shadow: 0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.04);
  --shadow-hover: 0 4px 20px rgba(0,0,0,0.07);
}

/* Header */
.page-header {
  display: flex; justify-content: space-between; align-items: flex-start;
  margin-bottom: 24px; gap: 16px; flex-wrap: wrap;
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

/* Timeframe Pills */
.timeframe-pills { display: flex; gap: 4px; background: #F1F5F9; border-radius: 100px; padding: 4px; }
.tf-pill {
  padding: 7px 14px; border: none; background: transparent; border-radius: 100px;
  font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 600; color: var(--text2);
  cursor: pointer; transition: all 0.2s ease; white-space: nowrap;
}
.tf-pill:hover { color: var(--text); }
.tf-pill.active { background: var(--surface); color: var(--text); box-shadow: 0 1px 3px rgba(0,0,0,0.1); }

/* Grid */
.detail-grid { display: grid; grid-template-columns: 1fr 380px; gap: 20px; min-height: 500px; }
.dt-card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius); padding: 24px; box-shadow: var(--shadow);
}
.trade-card { max-height: 700px; overflow: hidden; }

/* Error */
.error-msg {
  padding: 12px 16px; background: rgba(239,58,58,0.06); border: 1px solid rgba(239,58,58,0.15);
  border-radius: var(--radius-sm); color: var(--red); font-size: 13px; font-weight: 500;
  margin-bottom: 20px;
}

/* Loading */
.loading-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80px 20px; gap: 16px; color: var(--text3); font-size: 14px; }
.loading-spinner { width: 36px; height: 36px; border: 3px solid rgba(0,0,0,0.06); border-top-color: var(--blue); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 1024px) {
  .detail-grid { grid-template-columns: 1fr; }
  .trade-card { max-height: 400px; }
}
@media (max-width: 768px) {
  .page-header { flex-direction: column; align-items: flex-start; }
}
</style>
