<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'

const API_BASE = ''

const brokers = ref([])
const loading = ref(false)
const error = ref('')
const filterGroup = ref('')
const sortBy = ref('total_value')

const groups = [
  { value: 'BROKER_GROUP_FOREIGN', label: 'Asing' },
  { value: 'BROKER_GROUP_LOCAL', label: 'Lokal' },
  { value: 'BROKER_GROUP_GOVERNMENT', label: 'Pemerintah' }
]

const sortOptions = [
  { value: 'total_value', label: 'Total Value' },
  { value: 'net_value', label: 'Net Value' },
  { value: 'buy_value', label: 'Buy Value' },
  { value: 'sell_value', label: 'Sell Value' },
  { value: 'total_frequency', label: 'Frequency' },
]

const filteredBrokers = computed(() => {
  let result = [...brokers.value]
  if (filterGroup.value) {
    result = result.filter(b => b.group === filterGroup.value)
  }
  result.sort((a, b) => {
    const valA = parseFloat(a[sortBy.value] || 0)
    const valB = parseFloat(b[sortBy.value] || 0)
    return valB - valA
  })
  return result
})

const topBrokers = computed(() => filteredBrokers.value.slice(0, 20))

const foreignCount = computed(() => brokers.value.filter(b => b.group === 'BROKER_GROUP_FOREIGN').length)
const localCount = computed(() => brokers.value.filter(b => b.group === 'BROKER_GROUP_LOCAL').length)
const govCount = computed(() => brokers.value.filter(b => b.group === 'BROKER_GROUP_GOVERNMENT').length)

async function fetchBrokers() {
  loading.value = true
  error.value = ''
  try {
    const res = await axios.get(`${API_BASE}/api/broker/top`, {
      params: { _t: Date.now() },
      headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
    })
    brokers.value = res.data?.data?.list || []
  } catch (err) {
    error.value = err.response?.data?.error || err.message
  } finally {
    loading.value = false
  }
}

function formatNumber(num) {
  if (!num) return '0'
  const n = parseFloat(num)
  if (n >= 1e12) return (n / 1e12).toFixed(2) + 'T'
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B'
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(2) + 'K'
  return n.toLocaleString('id-ID')
}

function formatRupiah(num) {
  if (!num) return 'Rp 0'
  return 'Rp ' + formatNumber(num)
}

function getGroupLabel(group) {
  const found = groups.find(g => g.value === group)
  return found ? found.label : group
}

onMounted(() => { fetchBrokers() })
</script>

<template>
  <div class="broker-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">Top Broker</h1>
        <p class="page-subtitle">{{ brokers.length }} brokers &middot; Asing: {{ foreignCount }} &middot; Lokal: {{ localCount }} &middot; Pemerintah: {{ govCount }}</p>
      </div>
      <div class="header-right">
        <button class="btn-refresh" @click="fetchBrokers" :disabled="loading">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>
          {{ loading ? 'Loading...' : 'Refresh' }}
        </button>
      </div>
    </div>

    <div class="controls-bar">
      <div class="pill-group">
        <button class="pill-item" :class="{ active: filterGroup === '' }" @click="filterGroup = ''">Semua</button>
        <button v-for="g in groups" :key="g.value" class="pill-item" :class="{ active: filterGroup === g.value }" @click="filterGroup = g.value">{{ g.label }}</button>
      </div>
      <div class="pill-group">
        <button v-for="s in sortOptions" :key="s.value" class="pill-item" :class="{ active: sortBy === s.value }" @click="sortBy = s.value">{{ s.label }}</button>
      </div>
    </div>

    <div v-if="error" class="error-msg">{{ error }}</div>

    <div class="bento-card">
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Kode</th>
              <th>Nama Broker</th>
              <th>Grup</th>
              <th class="r">Total Value</th>
              <th class="r">Net Value</th>
              <th class="r">Buy Value</th>
              <th class="r">Sell Value</th>
              <th class="r">Volume</th>
              <th class="r">Freq</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(broker, index) in topBrokers" :key="broker.code">
              <td class="td-rank">{{ index + 1 }}</td>
              <td class="td-code">{{ broker.code }}</td>
              <td class="td-name">{{ broker.name }}</td>
              <td>
                <span class="badge" :class="getGroupLabel(broker.group).toLowerCase()">
                  {{ getGroupLabel(broker.group) }}
                </span>
              </td>
              <td class="r">{{ formatRupiah(broker.total_value) }}</td>
              <td class="r" :class="parseFloat(broker.net_value) >= 0 ? 'up' : 'down'">
                {{ formatRupiah(broker.net_value) }}
              </td>
              <td class="r">{{ formatRupiah(broker.buy_value) }}</td>
              <td class="r">{{ formatRupiah(broker.sell_value) }}</td>
              <td class="r">{{ formatNumber(broker.total_volume) }}</td>
              <td class="r">{{ formatNumber(broker.total_frequency) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="summary-grid">
      <div class="bento-card">
        <h3 class="card-title">Top Asing (Net Buy)</h3>
        <div class="top-list">
          <div v-for="b in brokers.filter(b => b.group === 'BROKER_GROUP_FOREIGN').sort((a,b) => parseFloat(b.net_value) - parseFloat(a.net_value)).slice(0, 5)" :key="b.code" class="top-row">
            <span class="top-code">{{ b.code }}</span>
            <span class="top-name">{{ b.name }}</span>
            <span class="top-val up">+{{ formatRupiah(b.net_value) }}</span>
          </div>
        </div>
      </div>

      <div class="bento-card">
        <h3 class="card-title">Top Asing (Net Sell)</h3>
        <div class="top-list">
          <div v-for="b in brokers.filter(b => b.group === 'BROKER_GROUP_FOREIGN').sort((a,b) => parseFloat(a.net_value) - parseFloat(b.net_value)).slice(0, 5)" :key="b.code" class="top-row">
            <span class="top-code">{{ b.code }}</span>
            <span class="top-name">{{ b.name }}</span>
            <span class="top-val down">{{ formatRupiah(b.net_value) }}</span>
          </div>
        </div>
      </div>

      <div class="bento-card">
        <h3 class="card-title">Top Lokal (Net Buy)</h3>
        <div class="top-list">
          <div v-for="b in brokers.filter(b => b.group === 'BROKER_GROUP_LOCAL').sort((a,b) => parseFloat(b.net_value) - parseFloat(a.net_value)).slice(0, 5)" :key="b.code" class="top-row">
            <span class="top-code">{{ b.code }}</span>
            <span class="top-name">{{ b.name }}</span>
            <span class="top-val up">+{{ formatRupiah(b.net_value) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.broker-page {
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

.error-msg {
  padding: 12px 16px; background: rgba(239,58,58,0.06); border: 1px solid rgba(239,58,58,0.15);
  border-radius: var(--radius-sm); color: var(--red); font-size: 13px; font-weight: 500; margin-bottom: 20px;
}

.bento-card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius); padding: 24px;
  box-shadow: var(--shadow); transition: all 0.25s ease;
}

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

.td-rank { color: var(--text3) !important; font-weight: 600 !important; width: 32px; }
.td-code { font-weight: 700; color: var(--text); }
.td-name { max-width: 180px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text2); }

.badge {
  font-size: 10px; font-weight: 700; padding: 3px 10px; border-radius: 100px;
  text-transform: uppercase; letter-spacing: 0.3px;
}
.badge.asing { background: rgba(32,91,252,0.07); color: var(--blue); }
.badge.lokal { background: rgba(33,191,115,0.08); color: var(--green); }
.badge.pemerintah { background: rgba(239,58,58,0.08); color: var(--red); }

.up { color: var(--green); }
.down { color: var(--red); }

.summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px; margin-top: 20px; }
.card-title { font-family: 'DM Sans', 'Inter', sans-serif; font-size: 14px; font-weight: 700; color: var(--text); margin: 0 0 16px 0; }

.top-list { display: flex; flex-direction: column; gap: 8px; }
.top-row { display: flex; align-items: center; gap: 10px; padding: 8px 12px; background: var(--bg); border-radius: var(--radius-sm); }
.top-code { font-weight: 700; font-size: 13px; color: var(--text); min-width: 44px; }
.top-name { flex: 1; font-size: 13px; color: var(--text2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.top-val { font-size: 13px; font-weight: 600; white-space: nowrap; }

@media (max-width: 768px) {
  .page-header { flex-direction: column; align-items: flex-start; }
  .controls-bar { flex-direction: column; align-items: stretch; }
  .pill-group { overflow-x: auto; }
  .summary-grid { grid-template-columns: 1fr; }
}
</style>
