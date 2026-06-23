<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { createChart, LineSeries, HistogramSeries } from 'lightweight-charts'

const props = defineProps({
  data: { type: Array, default: () => [] },
  labels: { type: Array, default: () => [] },
  times: { type: Array, default: () => [] }
})

const charts = ref({})
const chartRefs = ref({})

// Oscillator indicators to render
const oscillatorIndicators = computed(() => {
  return props.data.filter(d => d.config && !d.config.overlay && !d.error)
})

// Parse time to Unix timestamp (seconds)
function parseTime(dateStr) {
  if (!dateStr) return null
  if (typeof dateStr === 'number') {
    return dateStr > 1000000000000 ? Math.floor(dateStr / 1000) : dateStr
  }
  if (typeof dateStr === 'string') {
    const ts = parseInt(dateStr)
    if (!isNaN(ts) && ts > 1000000000000) return Math.floor(ts / 1000)
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
      const d = new Date(dateStr.replace(' ', 'T') + 'Z')
      const unix = Math.floor(d.getTime() / 1000)
      if (!isNaN(unix) && unix > 0) return unix
    }
  }
  return null
}

// Deduplicate by time and sort ascending
function dedupAndSort(data) {
  const map = new Map()
  for (const item of data) {
    map.set(item.time, item)
  }
  return Array.from(map.values()).sort((a, b) => a.time - b.time)
}

// Get the last non-null value of an indicator
function getLastValue(indicator) {
  const outputKey = indicator.config.outputs[0]
  const values = indicator.data[outputKey]
  if (!values) return '-'
  for (let i = values.length - 1; i >= 0; i--) {
    if (values[i] !== null && values[i] !== undefined) return values[i].toFixed(2)
  }
  return '-'
}

// Get signal text based on bounds
function getSignalText(indicator) {
  const config = indicator.config
  if (!config.bounds) return null

  const outputKey = config.outputs[0]
  const values = indicator.data[outputKey]
  if (!values) return null

  let lastVal = null
  for (let i = values.length - 1; i >= 0; i--) {
    if (values[i] !== null && values[i] !== undefined) {
      lastVal = values[i]
      break
    }
  }
  if (lastVal === null) return null

  const levels = config.bounds.levels
  if (!levels || levels.length < 2) return null

  if (lastVal > levels[1]) return { text: 'Overbought', class: 'signal-sell' }
  if (lastVal < levels[0]) return { text: 'Oversold', class: 'signal-buy' }
  return { text: 'Netral', class: 'signal-neutral' }
}

// Render a single oscillator chart
function renderChart(indicator) {
  const key = indicator.indicator
  const container = chartRefs.value[key]
  if (!container) return

  // Destroy existing chart
  if (charts.value[key]) {
    charts.value[key].remove()
    charts.value[key] = null
  }

  const config = indicator.config

  // Build time array from props.times or props.labels
  const timeArr = props.times.length > 0
    ? props.times.map(parseTime)
    : props.labels.map(parseTime)

  if (!timeArr || timeArr.length === 0) return

  // Determine y-axis range
  let yMin, yMax
  if (config.bounds) {
    yMin = config.bounds.min
    yMax = config.bounds.max
  }

  // Create chart
  const lwChart = createChart(container, {
    autoSize: true,
    layout: {
      background: { type: 'solid', color: '#ffffff' },
      textColor: '#94A3B8',
      fontSize: 10,
      fontFamily: 'Inter, sans-serif',
    },
    grid: {
      vertLines: { color: 'rgba(0,0,0,0.03)' },
      horzLines: { color: 'rgba(0,0,0,0.03)' },
    },
    crosshair: {
      mode: 0,
      vertLine: { width: 1, color: 'rgba(0,0,0,0.08)', style: 2, labelBackgroundColor: '#205BFC' },
      horzLine: { width: 1, color: 'rgba(0,0,0,0.08)', style: 2, labelBackgroundColor: '#205BFC' },
    },
    rightPriceScale: {
      borderColor: 'rgba(0,0,0,0.05)',
      scaleMargins: { top: 0.05, bottom: 0.05 },
      ...(yMin !== undefined ? { autoScale: false } : {}),
    },
    timeScale: {
      visible: false,
    },
    handleScale: { axisPressedMouseMove: true },
    handleScroll: { vertTouchDrag: true },
  })

  // Set y-axis range if bounds defined
  if (yMin !== undefined && yMax !== undefined) {
    lwChart.priceScale('right').applyOptions({
      autoScale: false,
    })
    // We'll set range via series data
  }

  // Build series
  const outputs = [...config.outputs]
  const seriesList = []

  if (config.hasHistogram && indicator.data.histogram) {
    // MACD-style: histogram + lines
    const histColors = indicator.data.histogram.map(v =>
      v !== null && v !== undefined
        ? (v >= 0 ? 'rgba(16, 185, 129, 0.6)' : 'rgba(239, 68, 68, 0.6)')
        : 'transparent'
    )

    const histData = dedupAndSort(
      indicator.data.histogram
        .map((v, i) => {
          if (v === null || v === undefined) return null
          const t = timeArr[i]
          if (!t) return null
          return { time: t, value: v, color: v >= 0 ? 'rgba(16, 185, 129, 0.6)' : 'rgba(239, 68, 68, 0.6)' }
        })
        .filter(Boolean)
    )

    if (histData.length > 0) {
      const histSeries = lwChart.addSeries(HistogramSeries,{
        lastValueVisible: false,
        priceLineVisible: false,
      })
      histSeries.setData(histData)
      seriesList.push(histSeries)
    }

    // MACD line
    if (indicator.data.macd) {
      const macdData = dedupAndSort(
        indicator.data.macd
          .map((v, i) => {
            if (v === null || v === undefined) return null
            const t = timeArr[i]
            if (!t) return null
            return { time: t, value: v }
          })
          .filter(Boolean)
      )

      if (macdData.length > 0) {
        const macdSeries = lwChart.addSeries(LineSeries,{
          color: '#3B82F6',
          lineWidth: 1.5,
          lastValueVisible: false,
          priceLineVisible: false,
          crosshairMarkerVisible: false,
        })
        macdSeries.setData(macdData)
        seriesList.push(macdSeries)
      }
    }

    // Signal line
    if (indicator.data.signal) {
      const signalData = dedupAndSort(
        indicator.data.signal
          .map((v, i) => {
            if (v === null || v === undefined) return null
            const t = timeArr[i]
            if (!t) return null
            return { time: t, value: v }
          })
          .filter(Boolean)
      )

      if (signalData.length > 0) {
        const signalSeries = lwChart.addSeries(LineSeries,{
          color: '#EF4444',
          lineWidth: 1.5,
          lastValueVisible: false,
          priceLineVisible: false,
          crosshairMarkerVisible: false,
        })
        signalSeries.setData(signalData)
        seriesList.push(signalSeries)
      }
    }
  } else if (outputs.length === 2) {
    // Dual-line indicators (Stochastic, KST, StochRSI)
    const lineColors = ['#8B5CF6', '#F59E0B']
    outputs.forEach((outputKey, i) => {
      const values = indicator.data[outputKey]
      if (!values) return

      const seriesData = dedupAndSort(
        values
          .map((v, idx) => {
            if (v === null || v === undefined) return null
            const t = timeArr[idx]
            if (!t) return null
            return { time: t, value: v }
          })
          .filter(Boolean)
      )

      if (seriesData.length > 0) {
        const series = lwChart.addSeries(LineSeries,{
          color: lineColors[i],
          lineWidth: 1.5,
          lastValueVisible: false,
          priceLineVisible: false,
          crosshairMarkerVisible: false,
        })
        series.setData(seriesData)
        seriesList.push(series)
      }
    })
  } else {
    // Single line indicators
    const outputKey = outputs[0]
    const values = indicator.data[outputKey]
    if (values) {
      const color = {
        rsi: '#8B5CF6', cci: '#F59E0B', roc: '#EC4899', willr: '#14B8A6',
        adx: '#6366F1', atr: '#F97316', trix: '#84CC16', mfi: '#A855F7',
      }[key.toLowerCase()] || '#3B82F6'

      const seriesData = dedupAndSort(
        values
          .map((v, i) => {
            if (v === null || v === undefined) return null
            const t = timeArr[i]
            if (!t) return null
            return { time: t, value: v }
          })
          .filter(Boolean)
      )

      if (seriesData.length > 0) {
        const series = lwChart.addSeries(LineSeries,{
          color,
          lineWidth: 1.5,
          lastValueVisible: false,
          priceLineVisible: false,
          crosshairMarkerVisible: false,
        })
        series.setData(seriesData)
        seriesList.push(series)
      }
    }
  }

  // Add bounds reference lines
  if (config.bounds && seriesList.length > 0) {
    const levels = config.bounds.levels || []
    const refColors = ['rgba(239, 68, 68, 0.3)', 'rgba(239, 68, 68, 0.3)']
    levels.forEach((level, i) => {
      seriesList[0].createPriceLine({
        price: level,
        color: refColors[i] || 'rgba(0,0,0,0.1)',
        lineWidth: 1,
        lineStyle: 2, // Dashed
        axisLabelVisible: true,
      })
    })
  }

  // Set y-axis range after data is set
  if (yMin !== undefined && yMax !== undefined && seriesList.length > 0) {
    // Use setVisibleRange on first series to set the y-axis range
    // Note: Lightweight Charts auto-scales based on data, so we use priceScale options
    lwChart.priceScale('right').applyOptions({
      autoScale: true, // Let it auto-scale but the reference lines will guide the view
    })
  }

  charts.value[key] = lwChart
}

// Lifecycle
onMounted(() => {
  nextTick(() => {
    oscillatorIndicators.value.forEach(ind => renderChart(ind))
  })
})

onUnmounted(() => {
  Object.values(charts.value).forEach(c => {
    if (c) c.remove()
  })
  charts.value = {}
})

watch(() => [props.data, props.times], () => {
  nextTick(() => {
    oscillatorIndicators.value.forEach(ind => renderChart(ind))
  })
}, { deep: true })
</script>

<template>
  <div v-if="oscillatorIndicators.length > 0" class="oscillator-panel">
    <div class="panel-header">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
      <span>Oscillators</span>
    </div>

    <div class="oscillators-grid">
      <div
        v-for="ind in oscillatorIndicators"
        :key="ind.indicator"
        class="oscillator-card"
      >
        <!-- Header -->
        <div class="osc-header">
          <span class="osc-name">{{ ind.config.name }}</span>
          <span class="osc-value">{{ getLastValue(ind) }}</span>
          <span
            v-if="getSignalText(ind)"
            class="osc-signal"
            :class="getSignalText(ind).class"
          >
            {{ getSignalText(ind).text }}
          </span>
        </div>

        <!-- Chart -->
        <div class="osc-chart">
          <div :ref="el => { if (el) chartRefs[ind.indicator] = el }" class="osc-chart-inner"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.oscillator-panel {
  margin-top: 16px;
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 700;
  color: #0F172A;
  margin-bottom: 12px;
  padding: 0 4px;
}

.panel-header svg {
  color: #205BFC;
}

.oscillators-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 12px;
}

.oscillator-card {
  background: var(--surface);
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 14px;
  padding: 14px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.osc-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.osc-name {
  font-size: 12px;
  font-weight: 700;
  color: var(--text2);
  flex: 1;
}

.osc-value {
  font-size: 14px;
  font-weight: 800;
  color: #0F172A;
  font-family: 'SF Mono', 'Fira Code', monospace;
}

.osc-signal {
  font-size: 10px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 100px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.signal-buy {
  background: rgba(16, 185, 129, 0.1);
  color: #059669;
}

.signal-sell {
  background: rgba(239, 68, 68, 0.1);
  color: #DC2626;
}

.signal-neutral {
  background: rgba(148, 163, 184, 0.1);
  color: #64748B;
}

.osc-chart {
  height: 120px;
  position: relative;
}

.osc-chart-inner {
  width: 100%;
  height: 100%;
}

@media (max-width: 768px) {
  .oscillators-grid {
    grid-template-columns: 1fr;
  }
}
</style>
