<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { Chart, registerables } from 'chart.js'

Chart.register(...registerables)

const props = defineProps({
  data: { type: Array, default: () => [] }, // Array of indicator results
  labels: { type: Array, default: () => [] } // Date labels
})

const chartRefs = ref({})
const charts = ref({})

// Color palette for different indicators
const colors = {
  rsi: { line: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.1)' },
  macd: { line: '#3B82F6', signal: '#EF4444', histogram: '#10B981' },
  cci: { line: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)' },
  roc: { line: '#EC4899', bg: 'rgba(236, 72, 153, 0.1)' },
  willr: { line: '#14B8A6', bg: 'rgba(20, 184, 166, 0.1)' },
  adx: { line: '#6366F1', bg: 'rgba(99, 102, 241, 0.1)' },
  stoch: { line: '#8B5CF6', signal: '#F59E0B' },
  atr: { line: '#F97316', bg: 'rgba(249, 115, 22, 0.1)' },
  kst: { line: '#0EA5E9', signal: '#F43F5E' },
  trix: { line: '#84CC16', bg: 'rgba(132, 204, 22, 0.1)' },
  mfi: { line: '#A855F7', bg: 'rgba(168, 85, 247, 0.1)' },
  stochrsi: { line: '#8B5CF6', signal: '#F59E0B' }
}

// Oscillator indicators that should be displayed in panels
const oscillatorIndicators = computed(() => {
  return props.data.filter(d => d.config && !d.config.overlay && !d.error)
})

// Create or update chart for an indicator
function renderChart(indicator) {
  const key = indicator.indicator
  const canvas = chartRefs.value[key]
  if (!canvas) return

  // Destroy existing chart
  if (charts.value[key]) {
    charts.value[key].destroy()
  }

  const ctx = canvas.getContext('2d')
  const config = indicator.config
  const color = colors[key.toLowerCase()] || { line: '#3B82F6', bg: 'rgba(59, 130, 246, 0.1)' }

  const datasets = []

  if (config.hasHistogram && indicator.data.histogram) {
    // MACD-style: histogram + lines
    const histColors = indicator.data.histogram.map(v =>
      v >= 0 ? 'rgba(16, 185, 129, 0.6)' : 'rgba(239, 68, 68, 0.6)'
    )

    datasets.push({
      type: 'bar',
      label: 'Histogram',
      data: indicator.data.histogram,
      backgroundColor: histColors,
      borderWidth: 0,
      barPercentage: 0.8,
      order: 2
    })

    if (indicator.data.macd) {
      datasets.push({
        type: 'line',
        label: 'MACD',
        data: indicator.data.macd,
        borderColor: color.line,
        borderWidth: 1.5,
        pointRadius: 0,
        fill: false,
        order: 1
      })
    }

    if (indicator.data.signal) {
      datasets.push({
        type: 'line',
        label: 'Signal',
        data: indicator.data.signal,
        borderColor: color.signal || '#EF4444',
        borderWidth: 1.5,
        pointRadius: 0,
        fill: false,
        order: 1
      })
    }
  } else if (config.outputs.length === 2) {
    // Dual-line indicators (Stochastic, KST, StochRSI)
    const outputs = [...config.outputs] // Convert from Proxy to plain array
    outputs.forEach((outputKey, i) => {
      const lineColors = [color.line, color.signal || '#F59E0B']
      datasets.push({
        label: outputKey.toUpperCase(),
        data: indicator.data[outputKey],
        borderColor: lineColors[i],
        borderWidth: 1.5,
        pointRadius: 0,
        fill: false
      })
    })
  } else {
    // Single line indicators
    const outputs = [...config.outputs] // Convert from Proxy to plain array
    const outputKey = outputs[0]
    datasets.push({
      label: config.name,
      data: indicator.data[outputKey],
      borderColor: color.line,
      borderWidth: 1.5,
      pointRadius: 0,
      fill: false
    })
  }

  // Reference lines (bounds)
  const annotations = {}
  if (config.bounds) {
    const levels = config.bounds.levels || []
    levels.forEach((level, i) => {
      annotations['line' + i] = {
        type: 'line',
        yMin: level,
        yMax: level,
        borderColor: 'rgba(0,0,0,0.1)',
        borderWidth: 1,
        borderDash: [4, 4]
      }
    })
  }

  charts.value[key] = new Chart(ctx, {
    type: 'line',
    data: {
      labels: props.labels,
      datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          display: datasets.length > 1,
          position: 'top',
          labels: {
            boxWidth: 12,
            padding: 8,
            font: { size: 10, family: 'Inter' }
          }
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          titleFont: { size: 11, family: 'Inter' },
          bodyFont: { size: 11, family: 'Inter', weight: '600' },
          padding: 8,
          cornerRadius: 8,
          callbacks: {
            label: function(context) {
              const value = context.parsed.y
              if (value === null || value === undefined) return ''
              return context.dataset.label + ': ' + value.toFixed(2)
            }
          }
        }
      },
      scales: {
        x: {
          display: true,
          grid: { display: false },
          ticks: {
            maxTicksLimit: 6,
            maxRotation: 0,
            font: { size: 10, family: 'Inter' },
            color: '#94A3B8'
          }
        },
        y: {
          display: true,
          grid: {
            color: 'rgba(0,0,0,0.04)',
            drawBorder: false
          },
          ticks: {
            font: { size: 10, family: 'Inter' },
            color: '#94A3B8',
            callback: function(value) {
              return value.toFixed(1)
            }
          },
          ...(config.bounds ? {
            min: config.bounds.min,
            max: config.bounds.max
          } : {})
        }
      }
    }
  })
}

// Watch for data changes
watch(() => props.data, async () => {
  await nextTick()
  oscillatorIndicators.value.forEach(ind => renderChart(ind))
}, { deep: true })

// Render charts on mount
onMounted(async () => {
  await nextTick()
  oscillatorIndicators.value.forEach(ind => renderChart(ind))
})

// Get signal text for an indicator
function getSignalText(indicator) {
  const config = indicator.config
  if (!config.bounds) return null

  const outputKey = config.outputs[0]
  const values = indicator.data[outputKey]
  const lastVal = values[values.length - 1]

  if (lastVal === null || lastVal === undefined) return null

  const levels = config.bounds.levels
  if (!levels || levels.length < 2) return null

  if (lastVal > levels[1]) return { text: 'Overbought', class: 'signal-sell' }
  if (lastVal < levels[0]) return { text: 'Oversold', class: 'signal-buy' }
  return { text: 'Netral', class: 'signal-neutral' }
}

// Get last value of an indicator
function getLastValue(indicator) {
  const outputKey = indicator.config.outputs[0]
  const values = indicator.data[outputKey]
  const lastVal = values[values.length - 1]
  return lastVal !== null && lastVal !== undefined ? lastVal.toFixed(2) : '-'
}
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
          <canvas :ref="el => { if (el) chartRefs[ind.indicator] = el }"></canvas>
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
  background: #FFFFFF;
  border: 1px solid rgba(0,0,0,0.06);
  border-radius: 14px;
  padding: 14px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
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
  color: #475569;
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

.osc-chart canvas {
  width: 100% !important;
  height: 100% !important;
}

@media (max-width: 768px) {
  .oscillators-grid {
    grid-template-columns: 1fr;
  }
}
</style>
