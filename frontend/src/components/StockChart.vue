<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { createChart, LineSeries, HistogramSeries } from 'lightweight-charts'

const props = defineProps({
  data: Object,
  overlays: { type: Array, default: () => [] }
})

const chartContainer = ref(null)
const tooltipRef = ref(null)
let chart = null
let priceSeries = null
let volumeSeries = null
let overlaySeries = []
let crosshairHandler = null
let resizeObserver = null

// Color palette for overlay indicators
const overlayColors = [
  '#3B82F6', // Blue
  '#EF4444', // Red
  '#10B981', // Green
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#14B8A6', // Teal
  '#F97316', // Orange
]

// Parse chart data from API response
function parseChartData(raw) {
  if (!raw) return null

  let items = null
  if (raw.data && Array.isArray(raw.data.prices)) {
    items = raw.data.prices
  } else if (raw.prices && Array.isArray(raw.prices)) {
    items = raw.prices
  } else {
    for (const key of Object.keys(raw)) {
      if (Array.isArray(raw[key]) && raw[key].length > 0) {
        items = raw[key]
        break
      }
    }
  }

  if (!items || items.length === 0) return null

  const validItems = items.filter(item => {
    const val = item.value !== undefined && item.value !== '' && item.value !== null
      ? parseFloat(item.value) : NaN
    const hasDate = (item.formatted_date && item.formatted_date !== '') ||
      (item.date && item.date !== '0' && item.date !== '')
    return !isNaN(val) && val > 0 && hasDate
  })

  if (validItems.length === 0) return null

  // Don't sample when overlays are present (alignment)
  const hasOverlays = props.overlays && props.overlays.length > 0
  let displayItems = validItems
  if (validItems.length > 200 && !hasOverlays) {
    const step = Math.ceil(validItems.length / 200)
    displayItems = validItems.filter((_, i) => i % step === 0)
  }

  const previous = raw.data?.previous || null
  return { items: displayItems, previous }
}

// Parse datetime string to Unix timestamp (seconds, UTC)
// Handles: "2026-06-03 10:49:00", "2026-06-03", or millisecond timestamps
function parseTime(dateStr) {
  if (!dateStr) return null
  if (typeof dateStr === 'number') {
    return dateStr > 1000000000000 ? Math.floor(dateStr / 1000) : dateStr
  }
  if (typeof dateStr === 'string') {
    // Millisecond timestamp as string
    const ts = parseInt(dateStr)
    if (!isNaN(ts) && ts > 1000000000000) return Math.floor(ts / 1000)
    // Date/datetime string → parse to Unix seconds
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
      const d = new Date(dateStr.replace(' ', 'T') + 'Z')
      const unix = Math.floor(d.getTime() / 1000)
      if (!isNaN(unix) && unix > 0) return unix
    }
  }
  return null
}

// Parse a price item to { time, value } using Unix timestamp
function parseItem(item) {
  const value = parseFloat(item.value)
  if (isNaN(value) || value <= 0) return null

  const time = parseTime(item.formatted_date || item.date)
  if (!time) return null

  return { time, value }
}

// Deduplicate by time (keep last value per timestamp) and sort ascending
function dedupAndSort(data) {
  const map = new Map()
  for (const item of data) {
    map.set(item.time, item) // last wins on duplicate
  }
  return Array.from(map.values()).sort((a, b) => a.time - b.time)
}

// Stats computation
const stats = computed(() => {
  const parsed = parseChartData(props.data)
  if (!parsed) return null

  const values = parsed.items.map(i => parseFloat(i.value)).filter(v => !isNaN(v) && v > 0)
  if (values.length === 0) return null

  const latest = values[values.length - 1]
  const first = values[0]
  const previousClose = parsed.previous || first
  const change = latest - previousClose
  const changePercent = previousClose !== 0 ? ((change / previousClose) * 100).toFixed(2) : '0.00'
  const high = Math.max(...values)
  const low = Math.min(...values)

  return { latest, first, previousClose, change, changePercent, high, low, isPositive: change >= 0 }
})

// Create and render the chart
function renderChart() {
  console.log('[StockChart] renderChart called, container:', !!chartContainer.value, 'data:', !!props.data)

  if (!chartContainer.value) {
    console.warn('[StockChart] No container ref')
    return
  }

  // Destroy previous chart
  if (chart) {
    chart.remove()
    chart = null
    priceSeries = null
    volumeSeries = null
    overlaySeries = []
  }

  const parsed = parseChartData(props.data)
  if (!parsed) {
    console.warn('[StockChart] parseChartData returned null')
    return
  }

  const { items } = parsed
  console.log('[StockChart] Parsed items:', items.length)

  const container = chartContainer.value

  // Get explicit dimensions
  const rect = container.getBoundingClientRect()
  const width = rect.width || 800
  const height = rect.height || 450
  console.log('[StockChart] Container rect:', rect.width, 'x', rect.height, '-> using:', width, 'x', height)

  // Create chart
  chart = createChart(container, {
    width,
    height,
    layout: {
      background: { type: 'solid', color: '#ffffff' },
      textColor: '#94A3B8',
      fontSize: 11,
      fontFamily: 'Inter, sans-serif',
    },
    grid: {
      vertLines: { color: 'rgba(0,0,0,0.04)' },
      horzLines: { color: 'rgba(0,0,0,0.04)' },
    },
    crosshair: {
      mode: 0,
      vertLine: {
        width: 1,
        color: 'rgba(0,0,0,0.1)',
        style: 2,
        labelBackgroundColor: '#205BFC',
      },
      horzLine: {
        width: 1,
        color: 'rgba(0,0,0,0.1)',
        style: 2,
        labelBackgroundColor: '#205BFC',
      },
    },
    rightPriceScale: {
      borderColor: 'rgba(0,0,0,0.05)',
      scaleMargins: { top: 0.1, bottom: 0.2 },
    },
    timeScale: {
      borderColor: 'rgba(0,0,0,0.05)',
      timeVisible: true,
      secondsVisible: false,
    },
    handleScale: { axisPressedMouseMove: true },
    handleScroll: { vertTouchDrag: true },
  })

  // --- Price line series ---
  priceSeries = chart.addSeries(LineSeries,{
    color: '#00b4d8',
    lineWidth: 2,
    crosshairMarkerVisible: true,
    crosshairMarkerRadius: 4,
    crosshairMarkerBackgroundColor: '#00b4d8',
    crosshairMarkerBorderColor: '#fff',
    crosshairMarkerBorderWidth: 2,
    lastValueVisible: true,
    priceLineVisible: true,
  })

  const priceData = dedupAndSort(
    items.map(parseItem).filter(Boolean)
  )

  priceSeries.setData(priceData)
  console.log('[StockChart] Price data set:', priceData.length, 'points')

  // --- Volume histogram series ---
  const hasVolume = items.some(i => i.volume !== undefined && parseFloat(i.volume) > 0)
  if (hasVolume) {
    volumeSeries = chart.addSeries(HistogramSeries,{
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    })

    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    })

    const volumeData = dedupAndSort(
      items
        .map((item, idx) => {
          const time = parseTime(item.formatted_date || item.date)
          if (!time) return null
          const vol = parseFloat(item.volume) || 0
          const val = parseFloat(item.value) || 0
          const prevClose = idx > 0 ? parseFloat(items[idx - 1].value) : val
          return {
            time,
            value: vol,
            color: val >= prevClose
              ? 'rgba(16, 185, 129, 0.3)'
              : 'rgba(239, 68, 68, 0.3)',
          }
        })
        .filter(Boolean)
    )

    volumeSeries.setData(volumeData)
  }

  // --- Overlay indicators ---
  overlaySeries = []
  if (props.overlays && props.overlays.length > 0) {
    let colorIdx = 0

    for (const overlay of props.overlays) {
      if (!overlay.config || overlay.error) continue

      const outputs = [...(overlay.config.outputs || [])]
      const color = overlayColors[colorIdx % overlayColors.length]

      if (overlay.config.fillBetween && outputs.length === 3) {
        // Bollinger Bands / Keltner Channels: upper, middle, lower with fill
        const upperData = buildOverlayData(items, overlay.data[outputs[0]])
        const middleData = buildOverlayData(items, overlay.data[outputs[1]])
        const lowerData = buildOverlayData(items, overlay.data[outputs[2]])

        // Upper band (dashed)
        const upperSeries = chart.addSeries(LineSeries,{
          color,
          lineWidth: 1,
          lineStyle: 2, // Dashed
          lastValueVisible: false,
          priceLineVisible: false,
          crosshairMarkerVisible: false,
        })
        upperSeries.setData(upperData)
        overlaySeries.push({ series: upperSeries, label: `${overlay.indicator} Upper` })

        // Middle band (solid)
        const middleSeries = chart.addSeries(LineSeries,{
          color,
          lineWidth: 1.5,
          lastValueVisible: false,
          priceLineVisible: false,
          crosshairMarkerVisible: false,
        })
        middleSeries.setData(middleData)
        overlaySeries.push({ series: middleSeries, label: `${overlay.indicator} Middle` })

        // Lower band (dashed, with fill to upper)
        const lowerSeries = chart.addSeries(LineSeries,{
          color,
          lineWidth: 1,
          lineStyle: 2,
          lastValueVisible: false,
          priceLineVisible: false,
          crosshairMarkerVisible: false,
          topColor: `${color}20`,
          bottomColor: 'transparent',
        })
        lowerSeries.setData(lowerData)
        overlaySeries.push({ series: lowerSeries, label: `${overlay.indicator} Lower` })

        colorIdx++
      } else if (overlay.config.hasHistogram && outputs.includes('histogram')) {
        // MACD-style overlay with histogram
        for (const outputKey of outputs) {
          const data = buildOverlayData(items, overlay.data[outputKey])
          if (data.length === 0) continue

          if (outputKey === 'histogram') {
            const histSeries = chart.addSeries(HistogramSeries,{
              lastValueVisible: false,
              priceLineVisible: false,
            })
            const histData = data.map(d => ({
              ...d,
              color: d.value >= 0 ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)',
            }))
            histSeries.setData(histData)
            overlaySeries.push({ series: histSeries, label: `${overlay.indicator} Histogram` })
          } else {
            const lineSeries = chart.addSeries(LineSeries,{
              color: outputKey === 'macd' ? color : '#EF4444',
              lineWidth: 1.5,
              lastValueVisible: false,
              priceLineVisible: false,
              crosshairMarkerVisible: false,
            })
            lineSeries.setData(data)
            overlaySeries.push({ series: lineSeries, label: `${overlay.indicator} ${outputKey}` })
          }
        }
        colorIdx++
      } else {
        // Regular line overlay
        for (const outputKey of outputs) {
          const data = buildOverlayData(items, overlay.data[outputKey])
          if (data.length === 0) continue

          const lineSeries = chart.addSeries(LineSeries,{
            color,
            lineWidth: 1.5,
            lastValueVisible: false,
            priceLineVisible: false,
            crosshairMarkerVisible: false,
          })
          lineSeries.setData(data)
          overlaySeries.push({ series: lineSeries, label: `${overlay.indicator} ${outputKey}` })
          colorIdx++
        }
      }
    }
  }

  // --- Crosshair tooltip ---
  crosshairHandler = (param) => {
    if (!tooltipRef.value) return

    if (!param.time || !param.point || param.point.x < 0 || param.point.y < 0) {
      tooltipRef.value.style.display = 'none'
      return
    }

    const dateStr = typeof param.time === 'number'
      ? new Date(param.time * 1000).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
      : param.time

    let html = `<div class="tt-date">${dateStr}</div>`

    // Price
    const priceVal = param.seriesData.get(priceSeries)
    if (priceVal) {
      html += `<div class="tt-row"><span class="tt-dot" style="background:#00b4d8"></span>Harga: <b>Rp ${priceVal.value.toLocaleString('id-ID')}</b></div>`
    }

    // Overlays
    for (const { series, label } of overlaySeries) {
      const val = param.seriesData.get(series)
      if (val && val.value !== undefined && val.value !== null) {
        html += `<div class="tt-row"><span class="tt-dot" style="background:${series.options().color}"></span>${label}: <b>${val.value.toFixed(2)}</b></div>`
      }
    }

    tooltipRef.value.innerHTML = html
    tooltipRef.value.style.display = 'block'

    // Position tooltip
    const containerRect = chartContainer.value.getBoundingClientRect()
    const x = param.point.x
    const tooltipWidth = tooltipRef.value.offsetWidth
    const left = x + 16 + tooltipWidth > containerRect.width
      ? x - tooltipWidth - 16
      : x + 16

    tooltipRef.value.style.left = `${left}px`
    tooltipRef.value.style.top = `${Math.max(0, param.point.y - 20)}px`
  }

  chart.subscribeCrosshairMove(crosshairHandler)

  // Fit content
  chart.timeScale().fitContent()
  console.log('[StockChart] Chart rendered successfully')
}

// Build overlay data aligned with price items, deduped and sorted
function buildOverlayData(items, values) {
  if (!values || !Array.isArray(values)) return []

  return dedupAndSort(
    items
      .map((item, i) => {
        const time = parseTime(item.formatted_date || item.date)
        if (!time) return null
        const v = values[i]
        if (v === null || v === undefined || isNaN(v)) return null
        return { time, value: v }
      })
      .filter(Boolean)
  )
}

// Lifecycle
onMounted(() => {
  console.log('[StockChart] Mounted, data:', !!props.data, 'stats:', !!stats.value)
  nextTick(() => {
    setTimeout(() => {
      console.log('[StockChart] onMounted -> renderChart')
      renderChart()
    }, 100)
  })

  // Handle container resize
  if (chartContainer.value) {
    resizeObserver = new ResizeObserver(() => {
      if (chart && chartContainer.value) {
        const rect = chartContainer.value.getBoundingClientRect()
        if (rect.width > 0 && rect.height > 0) {
          chart.resize(rect.width, rect.height)
        }
      }
    })
    resizeObserver.observe(chartContainer.value)
  }
})

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  if (chart) {
    chart.remove()
    chart = null
  }
})

watch(() => [props.data, props.overlays], () => {
  console.log('[StockChart] Data/overlays changed, stats:', !!stats.value)
  nextTick(() => {
    setTimeout(() => {
      console.log('[StockChart] Watcher -> renderChart')
      renderChart()
    }, 100)
  })
}, { deep: true })
</script>

<template>
  <div class="stock-chart-container" v-show="stats">
    <!-- Stats Grid -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Harga Terakhir</div>
        <div class="stat-value">Rp {{ stats.latest.toLocaleString('id-ID') }}</div>
      </div>
      <div class="stat-card" :class="stats.isPositive ? 'positive' : 'negative'">
        <div class="stat-label">Perubahan</div>
        <div class="stat-value">
          {{ stats.change >= 0 ? '+' : '' }}{{ stats.change.toLocaleString('id-ID') }}
          ({{ stats.changePercent }}%)
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Tertinggi</div>
        <div class="stat-value">Rp {{ stats.high.toLocaleString('id-ID') }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Terendah</div>
        <div class="stat-value">Rp {{ stats.low.toLocaleString('id-ID') }}</div>
      </div>
    </div>

    <!-- Overlay Legend -->
    <div v-if="overlays && overlays.length > 0" class="overlay-legend">
      <span v-for="(overlay, i) in overlays" :key="i" class="legend-item">
        <span class="legend-dot" :style="{ background: overlayColors[i % overlayColors.length] }"></span>
        {{ overlay.indicator }}
      </span>
    </div>

    <!-- Chart -->
    <div class="chart-wrapper">
      <div ref="chartContainer" class="chart-container"></div>
      <div ref="tooltipRef" class="chart-tooltip"></div>
    </div>
  </div>

  <div v-if="!stats" class="no-data">
    <p>Tidak ada data chart yang bisa divisualisasikan</p>
    <p class="hint">Coba klik tab "Raw JSON" untuk lihat format data asli</p>
    <p class="hint" v-if="data">Data keys: {{ Object.keys(data) }}</p>
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
  margin-bottom: 16px;
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

/* Overlay Legend */
.overlay-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 8px;
  padding: 0 4px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 600;
  color: #475569;
}

.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

/* Chart */
.chart-wrapper {
  position: relative;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.chart-container {
  width: 100%;
  height: 450px;
}

/* Tooltip */
.chart-tooltip {
  display: none;
  position: absolute;
  z-index: 10;
  pointer-events: none;
  background: rgba(15, 23, 42, 0.92);
  color: #fff;
  border-radius: 8px;
  padding: 10px 14px;
  font-family: 'Inter', sans-serif;
  font-size: 11px;
  line-height: 1.6;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  min-width: 160px;
  max-width: 280px;
}

.chart-tooltip .tt-date {
  font-weight: 700;
  margin-bottom: 4px;
  color: #94A3B8;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.chart-tooltip .tt-row {
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

.chart-tooltip .tt-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.chart-tooltip b {
  color: #fff;
  font-weight: 700;
}

/* No Data */
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
