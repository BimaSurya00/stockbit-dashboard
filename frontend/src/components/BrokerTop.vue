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

async function fetchBrokers() {
  loading.value = true
  error.value = ''
  try {
    const res = await axios.get(`${API_BASE}/api/broker/top`, {
      params: { _t: Date.now() },
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
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

function getGroupClass(group) {
  switch(group) {
    case 'BROKER_GROUP_FOREIGN': return 'foreign'
    case 'BROKER_GROUP_LOCAL': return 'local'
    case 'BROKER_GROUP_GOVERNMENT': return 'government'
    default: return ''
  }
}

onMounted(() => {
  fetchBrokers()
})
</script>

<template>
  <div class="broker-container">
    <div class="controls">
      <select v-model="filterGroup">
        <option value="">Semua Grup</option>
        <option v-for="g in groups" :key="g.value" :value="g.value">
          {{ g.label }}
        </option>
      </select>
      <select v-model="sortBy">
        <option value="total_value">Total Value</option>
        <option value="net_value">Net Value</option>
        <option value="buy_value">Buy Value</option>
        <option value="sell_value">Sell Value</option>
        <option value="total_frequency">Frequency</option>
      </select>
      <button @click="fetchBrokers" :disabled="loading">
        {{ loading ? 'Loading...' : 'Refresh' }}
      </button>
    </div>

    <div v-if="error" class="error">{{ error }}</div>

    <div class="stats">
      Total: {{ filteredBrokers.length }} broker | 
      Asing: {{ brokers.filter(b => b.group === 'BROKER_GROUP_FOREIGN').length }} |
      Lokal: {{ brokers.filter(b => b.group === 'BROKER_GROUP_LOCAL').length }} |
      Pemerintah: {{ brokers.filter(b => b.group === 'BROKER_GROUP_GOVERNMENT').length }}
    </div>

    <div class="broker-table-container">
      <table class="broker-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Kode</th>
            <th>Nama Broker</th>
            <th>Grup</th>
            <th class="numeric">Total Value</th>
            <th class="numeric">Net Value</th>
            <th class="numeric">Buy Value</th>
            <th class="numeric">Sell Value</th>
            <th class="numeric">Volume</th>
            <th class="numeric">Freq</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(broker, index) in topBrokers" :key="broker.code" :class="getGroupClass(broker.group)">
            <td class="rank">{{ index + 1 }}</td>
            <td class="code"><strong>{{ broker.code }}</strong></td>
            <td class="name">{{ broker.name }}</td>
            <td class="group">
              <span :class="['group-badge', getGroupClass(broker.group)]">
                {{ getGroupLabel(broker.group) }}
              </span>
            </td>
            <td class="numeric">{{ formatRupiah(broker.total_value) }}</td>
            <td class="numeric" :class="parseFloat(broker.net_value) >= 0 ? 'positive' : 'negative'">
              {{ formatRupiah(broker.net_value) }}
            </td>
            <td class="numeric">{{ formatRupiah(broker.buy_value) }}</td>
            <td class="numeric">{{ formatRupiah(broker.sell_value) }}</td>
            <td class="numeric">{{ formatNumber(broker.total_volume) }}</td>
            <td class="numeric">{{ formatNumber(broker.total_frequency) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="summary-cards">
      <div class="summary-card">
        <h4>Top Asing (Net Buy)</h4>
        <div class="top-list">
          <div v-for="b in brokers.filter(b => b.group === 'BROKER_GROUP_FOREIGN').sort((a,b) => parseFloat(b.net_value) - parseFloat(a.net_value)).slice(0, 5)" :key="b.code" class="top-item">
            <span class="top-code">{{ b.code }}</span>
            <span class="top-name">{{ b.name }}</span>
            <span class="top-value positive">+{{ formatRupiah(b.net_value) }}</span>
          </div>
        </div>
      </div>

      <div class="summary-card">
        <h4>Top Asing (Net Sell)</h4>
        <div class="top-list">
          <div v-for="b in brokers.filter(b => b.group === 'BROKER_GROUP_FOREIGN').sort((a,b) => parseFloat(a.net_value) - parseFloat(b.net_value)).slice(0, 5)" :key="b.code" class="top-item">
            <span class="top-code">{{ b.code }}</span>
            <span class="top-name">{{ b.name }}</span>
            <span class="top-value negative">{{ formatRupiah(b.net_value) }}</span>
          </div>
        </div>
      </div>

      <div class="summary-card">
        <h4>Top Lokal (Net Buy)</h4>
        <div class="top-list">
          <div v-for="b in brokers.filter(b => b.group === 'BROKER_GROUP_LOCAL').sort((a,b) => parseFloat(b.net_value) - parseFloat(a.net_value)).slice(0, 5)" :key="b.code" class="top-item">
            <span class="top-code">{{ b.code }}</span>
            <span class="top-name">{{ b.name }}</span>
            <span class="top-value positive">+{{ formatRupiah(b.net_value) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.broker-container {
  padding: 20px;
}
.controls {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}
.controls select, .controls button {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
}
.controls button {
  background: #00b4d8;
  color: white;
  border: none;
  cursor: pointer;
}
.controls button:disabled {
  background: #ccc;
}
.stats {
  margin-bottom: 15px;
  color: #666;
  font-size: 14px;
}
.broker-table-container {
  overflow-x: auto;
  margin-bottom: 30px;
}
.broker-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.broker-table th {
  background: #2d3748;
  color: white;
  padding: 12px;
  text-align: left;
  font-weight: 600;
  white-space: nowrap;
}
.broker-table th.numeric {
  text-align: right;
}
.broker-table td {
  padding: 10px 12px;
  border-bottom: 1px solid #e2e8f0;
}
.broker-table td.numeric {
  text-align: right;
  font-family: monospace;
}
.broker-table tbody tr:hover {
  background: #f7fafc;
}
.rank {
  font-weight: bold;
  color: #4a5568;
}
.code {
  font-weight: bold;
  color: #2d3748;
}
.name {
  max-width: 200px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.group-badge {
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
}
.group-badge.foreign {
  background: #e6f7ff;
  color: #0066cc;
}
.group-badge.local {
  background: #f0fff4;
  color: #22543d;
}
.group-badge.government {
  background: #fffaf0;
  color: #c05621;
}
.positive {
  color: #11998e;
}
.negative {
  color: #eb3349;
}

.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}
.summary-card {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}
.summary-card h4 {
  margin-top: 0;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 2px solid #e2e8f0;
  color: #2d3748;
}
.top-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.top-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  background: #f7fafc;
  border-radius: 4px;
}
.top-code {
  font-weight: bold;
  min-width: 40px;
}
.top-name {
  flex: 1;
  margin: 0 10px;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.top-value {
  font-weight: 600;
  font-size: 13px;
}
.error {
  color: #e53e3e;
  padding: 10px;
  background: #fed7d7;
  border-radius: 4px;
  margin-bottom: 15px;
}
</style>
