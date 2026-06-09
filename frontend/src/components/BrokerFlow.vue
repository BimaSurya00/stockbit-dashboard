<template>
  <div class="broker-flow-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">Broker Flow</h1>
        <p class="page-subtitle">Foreign vs Local flow analysis</p>
      </div>
      <div class="header-right">
        <button class="btn-refresh" @click="fetchBrokerData" :disabled="loading">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>
          {{ loading ? 'Loading...' : 'Refresh' }}
        </button>
      </div>
    </div>

    <div class="controls-bar">
      <div class="pill-group">
        <button v-for="p in periods" :key="p.value"
          class="pill-item" :class="{ active: selectedPeriod === p.value }"
          @click="selectedPeriod = p.value; fetchBrokerData()">{{ p.label }}</button>
      </div>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <span>Memuat data broker...</span>
    </div>

    <div v-else-if="error" class="error-msg">{{ error }}</div>

    <div v-else-if="brokerData" class="content-area">
      <div class="summary-grid">
        <div class="bento-card summary-card">
          <div class="card-header">
            <h3 class="card-title">Foreign Flow</h3>
            <span class="badge asing">Asing</span>
          </div>
          <div class="summary-value" :class="foreignNet >= 0 ? 'up' : 'down'">{{ formatRupiah(foreignNet) }}</div>
          <div class="summary-details">
            <span class="detail-buy">Buy: {{ formatValue(foreignBuy) }}</span>
            <span class="detail-sell">Sell: {{ formatValue(foreignSell) }}</span>
          </div>
        </div>

        <div class="bento-card summary-card">
          <div class="card-header">
            <h3 class="card-title">Local Flow</h3>
            <span class="badge lokal">Lokal</span>
          </div>
          <div class="summary-value" :class="localNet >= 0 ? 'up' : 'down'">{{ formatRupiah(localNet) }}</div>
          <div class="summary-details">
            <span class="detail-buy">Buy: {{ formatValue(localBuy) }}</span>
            <span class="detail-sell">Sell: {{ formatValue(localSell) }}</span>
          </div>
        </div>

        <div class="bento-card summary-card">
          <div class="card-header">
            <h3 class="card-title">Government Flow</h3>
            <span class="badge pemerintah">Pemerintah</span>
          </div>
          <div class="summary-value" :class="govNet >= 0 ? 'up' : 'down'">{{ formatRupiah(govNet) }}</div>
          <div class="summary-details">
            <span class="detail-buy">Buy: {{ formatValue(govBuy) }}</span>
            <span class="detail-sell">Sell: {{ formatValue(govSell) }}</span>
          </div>
        </div>
      </div>

      <div class="bento-card chart-card">
        <h3 class="card-title">Net Flow Comparison</h3>
        <div class="flow-bars">
          <div class="flow-row" v-for="(item, index) in netFlowData" :key="index">
            <div class="flow-label">{{ item.label }}</div>
            <div class="flow-track">
              <div class="flow-bar-wrap">
                <div class="flow-bar" :class="item.class" :style="{ width: item.width + '%' }">
                  <span class="flow-bar-val">{{ formatRupiah(item.value) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="brokers-grid">
        <div class="bento-card">
          <h3 class="card-title">Top Foreign Net Buy</h3>
          <div class="top-list">
            <div class="top-row" v-for="(broker, index) in topForeignBuy" :key="index">
              <span class="top-rank">{{ index + 1 }}</span>
              <span class="top-code">{{ broker.code }}</span>
              <span class="top-name">{{ broker.name }}</span>
              <span class="top-val up">{{ formatRupiah(broker.net_value) }}</span>
            </div>
            <div v-if="topForeignBuy.length === 0" class="empty-data-sm">No data</div>
          </div>
        </div>

        <div class="bento-card">
          <h3 class="card-title">Top Foreign Net Sell</h3>
          <div class="top-list">
            <div class="top-row" v-for="(broker, index) in topForeignSell" :key="index">
              <span class="top-rank">{{ index + 1 }}</span>
              <span class="top-code">{{ broker.code }}</span>
              <span class="top-name">{{ broker.name }}</span>
              <span class="top-val down">{{ formatRupiah(broker.net_value) }}</span>
            </div>
            <div v-if="topForeignSell.length === 0" class="empty-data-sm">No data</div>
          </div>
        </div>

        <div class="bento-card">
          <h3 class="card-title">Top Local Net Buy</h3>
          <div class="top-list">
            <div class="top-row" v-for="(broker, index) in topLocalBuy" :key="index">
              <span class="top-rank">{{ index + 1 }}</span>
              <span class="top-code">{{ broker.code }}</span>
              <span class="top-name">{{ broker.name }}</span>
              <span class="top-val up">{{ formatRupiah(broker.net_value) }}</span>
            </div>
            <div v-if="topLocalBuy.length === 0" class="empty-data-sm">No data</div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="empty-state">
      <p>Tidak ada data broker</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'

const API_BASE = ''

const brokerData = ref(null)
const loading = ref(false)
const error = ref(null)
const selectedPeriod = ref('1d')

const periods = [
  { value: '1d', label: 'Hari Ini' },
  { value: '1w', label: '1 Minggu' },
  { value: '1m', label: '1 Bulan' }
]

const foreignBuy = ref(0)
const foreignSell = ref(0)
const foreignNet = ref(0)
const localBuy = ref(0)
const localSell = ref(0)
const localNet = ref(0)
const govBuy = ref(0)
const govSell = ref(0)
const govNet = ref(0)

const topForeignBuy = ref([])
const topForeignSell = ref([])
const topLocalBuy = ref([])

const netFlowData = computed(() => {
  const maxAbs = Math.max(Math.abs(foreignNet.value), Math.abs(localNet.value), Math.abs(govNet.value))
  const scale = maxAbs > 0 ? 100 / maxAbs : 0
  return [
    { label: 'Foreign', value: foreignNet.value, width: Math.abs(foreignNet.value) * scale, class: foreignNet.value >= 0 ? 'up' : 'down' },
    { label: 'Local', value: localNet.value, width: Math.abs(localNet.value) * scale, class: localNet.value >= 0 ? 'up' : 'down' },
    { label: 'Government', value: govNet.value, width: Math.abs(govNet.value) * scale, class: govNet.value >= 0 ? 'up' : 'down' }
  ]
})

function formatValue(value) {
  if (value === undefined || value === null || isNaN(value)) return '-'
  const abs = Math.abs(value)
  let suffix = '', divisor = 1
  if (abs >= 1e12) { suffix = 'T'; divisor = 1e12 }
  else if (abs >= 1e9) { suffix = 'B'; divisor = 1e9 }
  else if (abs >= 1e6) { suffix = 'M'; divisor = 1e6 }
  else if (abs >= 1e3) { suffix = 'K'; divisor = 1e3 }
  const formatted = (value / divisor).toFixed(2)
  return `${formatted}${suffix}`
}

function formatRupiah(value) {
  if (value === undefined || value === null || isNaN(value)) return '-'
  const abs = Math.abs(value)
  let suffix = '', divisor = 1
  if (abs >= 1e12) { suffix = 'T'; divisor = 1e12 }
  else if (abs >= 1e9) { suffix = 'B'; divisor = 1e9 }
  else if (abs >= 1e6) { suffix = 'M'; divisor = 1e6 }
  else if (abs >= 1e3) { suffix = 'K'; divisor = 1e3 }
  const formatted = (value / divisor).toFixed(2)
  const prefix = value >= 0 ? '+' : ''
  return `${prefix}${formatted}${suffix}`
}

async function fetchBrokerData() {
  loading.value = true; error.value = null
  try {
    const res = await axios.get(`${API_BASE}/api/broker/top`, {
      params: { period: selectedPeriod.value, _t: Date.now() },
      headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
    })
    if (res.data?.data?.list) {
      brokerData.value = res.data.data.list
      processBrokerData(brokerData.value)
    } else {
      error.value = 'Format data tidak valid'
    }
  } catch (err) {
    error.value = err.response?.data?.error || 'Gagal memuat data broker'
  } finally {
    loading.value = false
  }
}

function processBrokerData(brokers) {
  const foreign = brokers.filter(b => b.group === 'BROKER_GROUP_FOREIGN')
  const local = brokers.filter(b => b.group === 'BROKER_GROUP_LOCAL')
  const gov = brokers.filter(b => b.group === 'BROKER_GROUP_GOVERNMENT')

  const safeNum = (v) => {
    const n = parseFloat(v)
    return isNaN(n) ? 0 : n
  }

  foreignBuy.value = foreign.reduce((sum, b) => sum + safeNum(b.buy_value), 0)
  foreignSell.value = foreign.reduce((sum, b) => sum + safeNum(b.sell_value), 0)
  foreignNet.value = foreign.reduce((sum, b) => sum + safeNum(b.net_value), 0)

  localBuy.value = local.reduce((sum, b) => sum + safeNum(b.buy_value), 0)
  localSell.value = local.reduce((sum, b) => sum + safeNum(b.sell_value), 0)
  localNet.value = local.reduce((sum, b) => sum + safeNum(b.net_value), 0)

  govBuy.value = gov.reduce((sum, b) => sum + safeNum(b.buy_value), 0)
  govSell.value = gov.reduce((sum, b) => sum + safeNum(b.sell_value), 0)
  govNet.value = gov.reduce((sum, b) => sum + safeNum(b.net_value), 0)

  topForeignBuy.value = [...foreign].filter(b => safeNum(b.net_value) > 0).sort((a, b) => safeNum(b.net_value) - safeNum(a.net_value)).slice(0, 5)
  topForeignSell.value = [...foreign].filter(b => safeNum(b.net_value) < 0).sort((a, b) => safeNum(a.net_value) - safeNum(b.net_value)).slice(0, 5)
  topLocalBuy.value = [...local].filter(b => safeNum(b.net_value) > 0).sort((a, b) => safeNum(b.net_value) - safeNum(a.net_value)).slice(0, 5)
}

onMounted(() => { fetchBrokerData() })
</script>

<style scoped>
.broker-flow-page {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  color: #0F172A;
  --blue: #205BFC; --green: #21BF73; --red: #EF3A3A;
  --bg: #F8FAFC; --surface: #FFFFFF; --text: #0F172A; --text2: #475569; --text3: #94A3B8;
  --border: rgba(0,0,0,0.05); --radius: 20px; --radius-sm: 14px;
  --shadow: 0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.04);
  --shadow-hover: 0 4px 20px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.04);
}

.page-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 20px; gap: 16px; flex-wrap: wrap; }
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

.controls-bar { display: flex; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; align-items: center; }
.pill-group { display: flex; gap: 4px; background: var(--bg); border-radius: 100px; padding: 4px; }
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
  display: flex; align-items: center; justify-content: center;
  padding: 80px 20px; color: var(--text3); font-size: 14px;
}

.content-area { display: flex; flex-direction: column; gap: 20px; }

.summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; }

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
.badge.asing { background: rgba(32,91,252,0.07); color: var(--blue); }
.badge.lokal { background: rgba(33,191,115,0.08); color: var(--green); }
.badge.pemerintah { background: rgba(239,58,58,0.08); color: var(--red); }

.summary-value {
  font-family: 'DM Sans', 'Inter', sans-serif; font-size: 28px; font-weight: 800;
  margin-bottom: 12px; letter-spacing: -0.5px;
}
.summary-value.up { color: var(--green); }
.summary-value.down { color: var(--red); }

.summary-details {
  display: flex; justify-content: space-between; font-size: 12px; color: var(--text2); font-weight: 500;
  padding-top: 12px; border-top: 1px solid var(--border);
}
.detail-buy { color: var(--green); }
.detail-sell { color: var(--red); }

.chart-card { padding: 24px; }
.flow-bars { display: flex; flex-direction: column; gap: 20px; }
.flow-row { display: flex; align-items: center; gap: 16px; }
.flow-label { width: 80px; font-size: 13px; font-weight: 600; color: var(--text); text-align: right; flex-shrink: 0; }
.flow-track { flex: 1; display: flex; align-items: center; min-height: 36px; }
.flow-bar-wrap { width: 100%; display: flex; align-items: center; }
.flow-bar {
  height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: flex-end;
  padding: 0 12px; transition: width 0.6s ease; min-width: 80px; position: relative;
}
.flow-bar.up { background: linear-gradient(90deg, rgba(33,191,115,0.15), rgba(33,191,115,0.25)); border: 1px solid rgba(33,191,115,0.3); }
.flow-bar.down { background: linear-gradient(90deg, rgba(239,58,58,0.15), rgba(239,58,58,0.25)); border: 1px solid rgba(239,58,58,0.3); }
.flow-bar-val { font-size: 12px; font-weight: 700; white-space: nowrap; }
.flow-bar.up .flow-bar-val { color: var(--green); }
.flow-bar.down .flow-bar-val { color: var(--red); }

.brokers-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px; }

.top-list { display: flex; flex-direction: column; gap: 8px; }
.top-row { display: flex; align-items: center; gap: 10px; padding: 8px 12px; background: var(--bg); border-radius: var(--radius-sm); }
.top-rank {
  width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;
  background: var(--blue); color: white; border-radius: 50%; font-size: 11px; font-weight: 700;
}
.top-code { font-weight: 700; font-size: 13px; color: var(--text); min-width: 44px; }
.top-name { flex: 1; font-size: 13px; color: var(--text2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.top-val { font-size: 13px; font-weight: 600; white-space: nowrap; }
.top-val.up { color: var(--green); }
.top-val.down { color: var(--red); }

.empty-data-sm { font-size: 13px; color: var(--text3); text-align: center; padding: 12px; }

@media (max-width: 768px) {
  .page-header { flex-direction: column; align-items: flex-start; }
  .controls-bar { flex-direction: column; align-items: stretch; }
  .pill-group { overflow-x: auto; }
  .summary-grid { grid-template-columns: 1fr; }
  .brokers-grid { grid-template-columns: 1fr; }
  .bar-item { flex-direction: column; align-items: stretch; }
  .bar-label { width: auto; text-align: left; }
  .bar-value { width: auto; text-align: left; }
}
</style>
