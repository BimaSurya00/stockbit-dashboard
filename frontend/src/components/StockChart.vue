<script setup>
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Filler
} from 'chart.js'

ChartJS.register(Title, Tooltip, Legend, LineElement, CategoryScale, LinearScale, PointElement, Filler)

const props = defineProps({
  data: Object
})

const chartData = computed(() => {
  const raw = props.data
  if (!raw) return null

  console.log('[StockChart] Raw data keys:', Object.keys(raw))
  console.log('[StockChart] Raw data sample:', JSON.stringify(raw).slice(0, 500))

  // Stockbit format: { data: { prices: [...], previous: 53 } }
  let items = null
  
  if (raw.data && Array.isArray(raw.data.prices)) {
    items = raw.data.prices
    console.log('[StockChart] Found prices in raw.data.prices, length:', items.length)
  } else if (raw.prices && Array.isArray(raw.prices)) {
    items = raw.prices
    console.log('[StockChart] Found prices in raw.prices, length:', items.length)
  } else {
    // Fallback: cari array di dalam objek
    for (const key of Object.keys(raw)) {
      if (Array.isArray(raw[key]) && raw[key].length > 0) {
        items = raw[key]
        console.log('[StockChart] Found array in key:', key, 'length:', items.length)
        break
      }
    }
  }

  if (!items || items.length === 0) {
    console.warn('[StockChart] No prices array found')
    return null
  }

  console.log('[StockChart] First item:', JSON.stringify(items[0]))
  console.log('[StockChart] Last item:', JSON.stringify(items[items.length - 1]))

  // Filter out items with empty/invalid values
  const validItems = items.filter(item => {
    const hasValue = item.value !== undefined && item.value !== '' && item.value !== null
    const hasDate = item.date !== undefined && item.date !== '' && item.date !== '0'
    return hasValue && hasDate
  })
  
  console.log('[StockChart] Valid items:', validItems.length, 'of', items.length)

  if (validItems.length === 0) {
    console.warn('[StockChart] No valid price items after filtering')
    // Coba lagi tanpa filter value, hanya filter date
    const dateOnlyItems = items.filter(item => item.date && item.date !== '0' && item.date !== '')
    if (dateOnlyItems.length > 0) {
      console.log('[StockChart] Trying with date-only filter, found:', dateOnlyItems.length)
    }
    return null
  }

  // Sampling untuk data yang terlalu banyak (max 200 points)
  let displayItems = validItems
  if (validItems.length > 200) {
    const step = Math.ceil(validItems.length / 200)
    displayItems = validItems.filter((_, index) => index % step === 0)
    console.log('[StockChart] Sampled from', validItems.length, 'to', displayItems.length, 'points')
  }

  // Ekstrak label dan nilai
  const labels = displayItems.map(item => {
    if (item.formatted_date) {
      // Format bisa: "2026-04-29 09:00:00" atau "2026-04-29"
      const parts = item.formatted_date.split(' ')
      const dateParts = parts[0].split('-')
      if (parts.length > 1) {
        // Ada waktu
        const timeParts = parts[1].split(':')
        return `${dateParts[2]} ${getMonthName(dateParts[1])} ${timeParts[0]}:${timeParts[1]}`
      } else {
        // Hanya tanggal
        return `${dateParts[2]} ${getMonthName(dateParts[1])} ${dateParts[0]}`
      }
    }
    if (item.date) {
      // Timestamp dalam milliseconds
      const timestamp = parseInt(item.date)
      if (!isNaN(timestamp) && timestamp > 1000000000000) {
        const d = new Date(timestamp)
        return `${d.getDate()} ${getMonthName(d.getMonth() + 1)} ${d.getFullYear()}`
      }
    }
    return ''
  })

  const prices = displayItems.map(item => {
    const val = item.value !== undefined ? parseFloat(item.value) : 0
    return isNaN(val) ? 0 : val
  })

  const volumes = displayItems.map(item => {
    const vol = item.volume !== undefined ? parseFloat(item.volume) : 0
    return isNaN(vol) ? 0 : vol
  })

  console.log('[StockChart] Labels sample:', labels.slice(0, 3))
  console.log('[StockChart] Prices sample:', prices.slice(0, 3))

  return {
    labels,
    prices,
    volumes,
    items: displayItems
  }
})

function getMonthName(monthNum) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const idx = parseInt(monthNum) - 1
  return months[idx] || ''
}

const lineChartConfig = computed(() => {
  if (!chartData.value) return null
  const { labels, prices } = chartData.value

  if (prices.length === 0) return null

  const validPrices = prices.filter(p => p > 0)
  if (validPrices.length === 0) return null

  const minPrice = Math.min(...validPrices)
  const maxPrice = Math.max(...validPrices)
  const padding = (maxPrice - minPrice) * 0.1 || maxPrice * 0.1

  return {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Harga',
          data: prices,
          borderColor: '#00b4d8',
          backgroundColor: 'rgba(0, 180, 216, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: prices.length > 50 ? 0 : 4, // Hide points kalau data banyak
          pointBackgroundColor: '#00b4d8',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointHoverRadius: 6,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: 'index'
      },
      plugins: {
        legend: {
          display: true,
          position: 'top'
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const val = context.parsed.y
              return `Rp ${val ? val.toLocaleString('id-ID') : '0'}`
            }
          }
        }
      },
      scales: {
        y: {
          min: Math.max(0, minPrice - padding),
          max: maxPrice + padding,
          ticks: {
            callback: (value) => `Rp ${value ? value.toLocaleString('id-ID') : '0'}`
          }
        },
        x: {
          ticks: {
            maxTicksLimit: 8,
            maxRotation: 45
          }
        }
      }
    }
  }
})

const stats = computed(() => {
  if (!chartData.value) return null
  const { prices } = chartData.value
  if (prices.length === 0) return null

  const validPrices = prices.filter(p => p > 0)
  if (validPrices.length === 0) return null

  const latest = validPrices[validPrices.length - 1]
  const first = validPrices[0]
  const change = latest - first
  const changePercent = first !== 0 ? ((change / first) * 100).toFixed(2) : '0.00'
  const high = Math.max(...validPrices)
  const low = Math.min(...validPrices)

  // Dapatkan previous close dari data Stockbit
  const previousClose = props.data?.data?.previous || first

  return {
    latest,
    first,
    previousClose,
    change,
    changePercent,
    high,
    low,
    isPositive: change >= 0
  }
})
</script>

<template>
  <div class="stock-chart-container" v-if="chartData && lineChartConfig">
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Harga Terakhir</div>
        <div class="stat-value">Rp {{ stats?.latest?.toLocaleString('id-ID') || '-' }}</div>
      </div>
      <div class="stat-card" :class="stats?.isPositive ? 'positive' : 'negative'">
        <div class="stat-label">Perubahan</div>
        <div class="stat-value">
          {{ stats?.change >= 0 ? '+' : '' }}{{ stats?.change?.toLocaleString('id-ID') || '-' }}
          ({{ stats?.changePercent }}%)
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Tertinggi</div>
        <div class="stat-value">Rp {{ stats?.high?.toLocaleString('id-ID') || '-' }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Terendah</div>
        <div class="stat-value">Rp {{ stats?.low?.toLocaleString('id-ID') || '-' }}</div>
      </div>
    </div>

    <div class="chart-wrapper">
      <Line :data="lineChartConfig.data" :options="lineChartConfig.options" />
    </div>
  </div>
  <div v-else class="no-data">
    <p>Tidak ada data chart yang bisa divisualisasikan</p>
    <p class="hint">Coba klik tab "Raw JSON" untuk lihat format data asli</p>
    <p class="hint" v-if="props.data">Data keys: {{ Object.keys(props.data) }}</p>
  </div>
</template>

<style scoped>
.stock-chart-container {
  margin-top: 20px;
}
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 15px;
  margin-bottom: 20px;
}
.stat-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 15px;
  border-radius: 8px;
  text-align: center;
}
.stat-card.positive {
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
}
.stat-card.negative {
  background: linear-gradient(135deg, #eb3349 0%, #f45c43 100%);
}
.stat-label {
  font-size: 12px;
  opacity: 0.9;
  margin-bottom: 5px;
}
.stat-value {
  font-size: 18px;
  font-weight: bold;
}
.chart-wrapper {
  height: 400px;
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}
.no-data {
  text-align: center;
  color: #666;
  padding: 40px;
}
.hint {
  font-size: 14px;
  color: #999;
  margin-top: 10px;
}
</style>
