<template>
  <div class="analysis-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">Quick Analysis</h1>
        <p class="page-subtitle">Signal summary untuk analisis cepat</p>
      </div>
      <div class="header-right">
        <button class="btn-refresh" @click="fetchAnalysis" :disabled="loading || !selectedSymbol">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>
          {{ loading ? 'Loading...' : 'Refresh' }}
        </button>
      </div>
    </div>

    <!-- Quick Picks -->
    <div class="quick-picks">
      <span class="quick-label">Quick:</span>
      <button v-for="s in popularStocks" :key="s.symbol"
        class="quick-btn" :class="{ active: selectedSymbol === s.symbol }"
        @click="selectStock(s.symbol)">
        {{ s.symbol }}
      </button>
    </div>

    <!-- Search Input -->
    <div class="search-section">
      <div class="search-wrap" ref="searchWrapRef">
        <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input
          v-model="searchQuery"
          @input="onSearch"
          @focus="showDropdown = true"
          @keydown.down.prevent="navigateDropdown(1)"
          @keydown.up.prevent="navigateDropdown(-1)"
          @keydown.enter.prevent="selectHighlighted"
          @keydown.escape="showDropdown = false"
          type="text"
          placeholder="Ketik symbol atau nama saham (contoh: BBCA, Bank Central Asia)..."
          class="search-input"
          autocomplete="off"
        />
        <div v-if="selectedSymbol" class="selected-badge" @click="clearSelection">
          {{ selectedSymbol }} <span class="clear-x">&times;</span>
        </div>
      </div>

      <!-- Dropdown -->
      <div v-if="showDropdown && filteredEmitens.length > 0" class="dropdown">
        <div class="dropdown-scroll">
          <div v-for="(emiten, index) in filteredEmitens" :key="emiten.symbol"
            class="dropdown-item" :class="{ highlighted: index === highlightIndex }"
            @click="selectStock(emiten.symbol)"
            @mouseenter="highlightIndex = index">
            <span class="dd-symbol">{{ emiten.symbol }}</span>
            <span class="dd-name">{{ emiten.name }}</span>
            <span class="dd-sector">{{ emiten.sector }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Controls -->
    <div class="controls-bar">
      <div class="pill-group">
        <span class="pill-label">Timeframe:</span>
        <button v-for="tf in timeframes" :key="tf.value"
          class="pill-item" :class="{ active: selectedTimeframe === tf.value }"
          @click="selectedTimeframe = tf.value; if(selectedSymbol) fetchAnalysis()">{{ tf.label }}</button>
      </div>
      <div class="pill-group">
        <span class="pill-label">Preset:</span>
        <button v-for="p in presetOptions" :key="p.value"
          class="pill-item" :class="{ active: selectedPreset === p.value }"
          @click="selectedPreset = p.value; if(selectedSymbol) fetchAnalysis()">{{ p.label }}</button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <span>Menghitung indikator...</span>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="error-msg">{{ error }}</div>

    <!-- Signals -->
    <div v-else-if="signals" class="signals-grid">
      <div class="bento-card signal-card" :class="rsiClass">
        <div class="signal-header">
          <span class="signal-badge">RSI</span>
          <span class="signal-value">{{ rsiValue }}</span>
        </div>
        <div class="signal-status">{{ rsiStatus }}</div>
        <div class="signal-desc">{{ rsiDescription }}</div>
      </div>

      <div class="bento-card signal-card" :class="macdClass">
        <div class="signal-header">
          <span class="signal-badge">MACD</span>
        </div>
        <div class="signal-status">{{ macdStatus }}</div>
        <div class="signal-desc">{{ macdDescription }}</div>
      </div>

      <div class="bento-card signal-card" :class="bbClass">
        <div class="signal-header">
          <span class="signal-badge">BB</span>
        </div>
        <div class="signal-status">{{ bbStatus }}</div>
        <div class="signal-desc">{{ bbDescription }}</div>
      </div>

      <div class="bento-card signal-card" :class="trendClass">
        <div class="signal-header">
          <span class="signal-badge">Trend</span>
        </div>
        <div class="signal-status">{{ trendStatus }}</div>
        <div class="signal-desc">{{ trendDescription }}</div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="empty-state">
      <div class="empty-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      </div>
      <p class="empty-title">Pilih saham untuk analisis</p>
      <p class="empty-desc">Ketik symbol di search atau klik quick picks di atas</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import axios from 'axios'

const API_BASE = ''

const emitens = ref([])
const selectedSymbol = ref('')
const selectedTimeframe = ref('1y')
const selectedPreset = ref('')
const loading = ref(false)
const error = ref(null)
const signals = ref(null)

const searchQuery = ref('')
const showDropdown = ref(false)
const highlightIndex = ref(-1)
const searchWrapRef = ref(null)

const popularStocks = [
  { symbol: 'BBCA' },
  { symbol: 'BBRI' },
  { symbol: 'TLKM' },
  { symbol: 'BMRI' },
  { symbol: 'ASII' },
  { symbol: 'UNVR' },
  { symbol: 'GOTO' },
  { symbol: 'BUKA' },
  { symbol: 'EMTK' },
  { symbol: 'MAPI' }
]

const timeframes = [
  { value: '1d', label: '1D' },
  { value: '1w', label: '1W' },
  { value: '1m', label: '1M' },
  { value: '3m', label: '3M' },
  { value: 'ytd', label: 'YTD' },
  { value: '1y', label: '1Y' }
]

const presetOptions = [
  { value: '', label: 'Default' },
  { value: 'moving_averages', label: 'MA' },
  { value: 'bollinger_rsi', label: 'BB+RSI' },
  { value: 'macd_rsi', label: 'MACD+RSI' },
  { value: 'trend_following', label: 'Trend' }
]

const presets = {
  moving_averages: 'SMA:period=50,SMA:period=200,EMA:period=20',
  bollinger_rsi: 'BBANDS:period=20,RSI:period=14',
  macd_rsi: 'MACD,RSI:period=14',
  trend_following: 'SMA:period=50,SMA:period=200,MACD'
}

const rsiValue = ref(0)
const rsiStatus = ref('')
const rsiDescription = ref('')
const rsiClass = ref('')
const macdStatus = ref('')
const macdDescription = ref('')
const macdClass = ref('')
const bbStatus = ref('')
const bbDescription = ref('')
const bbClass = ref('')
const trendStatus = ref('')
const trendDescription = ref('')
const trendClass = ref('')

const filteredEmitens = computed(() => {
  if (!searchQuery.value) return emitens.value.slice(0, 20)
  const q = searchQuery.value.toUpperCase()
  return emitens.value.filter(e =>
    e.symbol.toUpperCase().includes(q) ||
    (e.name && e.name.toUpperCase().includes(q))
  ).slice(0, 20)
})

function onSearch() {
  showDropdown.value = true
  highlightIndex.value = -1
}

function navigateDropdown(dir) {
  const len = filteredEmitens.value.length
  if (len === 0) return
  highlightIndex.value = (highlightIndex.value + dir + len) % len
}

function selectHighlighted() {
  if (highlightIndex.value >= 0 && highlightIndex.value < filteredEmitens.value.length) {
    selectStock(filteredEmitens.value[highlightIndex.value].symbol)
  }
}

function selectStock(symbol) {
  selectedSymbol.value = symbol
  searchQuery.value = ''
  showDropdown.value = false
  highlightIndex.value = -1
  fetchAnalysis()
}

function clearSelection() {
  selectedSymbol.value = ''
  searchQuery.value = ''
  signals.value = null
}

function handleClickOutside(e) {
  if (searchWrapRef.value && !searchWrapRef.value.contains(e.target)) {
    showDropdown.value = false
  }
}

async function fetchEmitens() {
  try {
    const res = await axios.get(`${API_BASE}/api/emiten`, { params: { limit: 1000 } })
    emitens.value = res.data.data || []
  } catch (err) {
    console.error('Error fetching emitens:', err)
  }
}

async function fetchAnalysis() {
  if (!selectedSymbol.value) { signals.value = null; return }
  loading.value = true
  error.value = null
  try {
    const indicators = selectedPreset.value && presets[selectedPreset.value]
      ? presets[selectedPreset.value]
      : 'RSI:period=14,MACD,BBANDS:period=20,SMA:period=50,SMA:period=200'
    const res = await axios.get(`${API_BASE}/api/emiten/${selectedSymbol.value}/indicators`, {
      params: { timeframe: selectedTimeframe.value, indicators }
    })
    const data = res.data
    if (data.indicators && data.indicators.length >= 2) {
      processSignals(data.indicators)
      signals.value = true
    } else {
      error.value = 'Data indikator tidak lengkap'
    }
  } catch (err) {
    error.value = err.response?.data?.error || 'Gagal mengambil data'
  } finally {
    loading.value = false
  }
}

function processSignals(indicators) {
  const rsi = indicators.find(i => i.indicator === 'RSI')
  const macd = indicators.find(i => i.indicator === 'MACD')
  const bb = indicators.find(i => i.indicator === 'BBANDS')
  const sma50 = indicators.find(i => i.indicator === 'SMA' && i.params.period === 50)
  const sma200 = indicators.find(i => i.indicator === 'SMA' && i.params.period === 200)
  const ema20 = indicators.find(i => i.indicator === 'EMA' && i.params.period === 20)

  if (rsi && rsi.data.rsi) {
    const lastRsi = rsi.data.rsi[rsi.data.rsi.length - 1]
    rsiValue.value = lastRsi ? lastRsi.toFixed(1) : 0
    if (lastRsi > 70) {
      rsiStatus.value = 'Overbought'; rsiDescription.value = 'RSI > 70, kemungkinan akan turun'; rsiClass.value = 'bearish'
    } else if (lastRsi < 30) {
      rsiStatus.value = 'Oversold'; rsiDescription.value = 'RSI < 30, kemungkinan akan naik'; rsiClass.value = 'bullish'
    } else {
      rsiStatus.value = 'Neutral'; rsiDescription.value = 'RSI 30-70, tidak ada signal kuat'; rsiClass.value = 'neutral'
    }
  } else {
    rsiStatus.value = '-'; rsiDescription.value = 'RSI tidak tersedia'; rsiClass.value = 'neutral'; rsiValue.value = '-'
  }

  if (macd && macd.data.macd && macd.data.signal) {
    const lastMacd = macd.data.macd[macd.data.macd.length - 1]
    const lastSignal = macd.data.signal[macd.data.signal.length - 1]
    const prevMacd = macd.data.macd[macd.data.macd.length - 2]
    const prevSignal = macd.data.signal[macd.data.signal.length - 2]
    if (lastMacd > lastSignal && prevMacd <= prevSignal) {
      macdStatus.value = 'Bullish Crossover'; macdDescription.value = 'MACD cross ke atas signal'; macdClass.value = 'bullish'
    } else if (lastMacd < lastSignal && prevMacd >= prevSignal) {
      macdStatus.value = 'Bearish Crossover'; macdDescription.value = 'MACD cross ke bawah signal'; macdClass.value = 'bearish'
    } else if (lastMacd > lastSignal) {
      macdStatus.value = 'Bullish'; macdDescription.value = 'MACD di atas signal'; macdClass.value = 'bullish'
    } else {
      macdStatus.value = 'Bearish'; macdDescription.value = 'MACD di bawah signal'; macdClass.value = 'bearish'
    }
  } else {
    macdStatus.value = '-'; macdDescription.value = 'MACD tidak tersedia'; macdClass.value = 'neutral'
  }

  if (bb && bb.data.upper && bb.data.lower) {
    const lastUpper = bb.data.upper[bb.data.upper.length - 1]
    const lastLower = bb.data.lower[bb.data.lower.length - 1]
    const lastMiddle = bb.data.middle[bb.data.middle.length - 1]
    if (lastMiddle > lastUpper) {
      bbStatus.value = 'Above Upper'; bbDescription.value = 'Harga di atas upper band'; bbClass.value = 'bearish'
    } else if (lastMiddle < lastLower) {
      bbStatus.value = 'Below Lower'; bbDescription.value = 'Harga di bawah lower band'; bbClass.value = 'bullish'
    } else {
      bbStatus.value = 'Middle Band'; bbDescription.value = 'Harga di antara bands'; bbClass.value = 'neutral'
    }
  } else {
    bbStatus.value = '-'; bbDescription.value = 'BB tidak tersedia'; bbClass.value = 'neutral'
  }

  if (sma50 && sma200 && sma50.data.sma && sma200.data.sma) {
    const lastSma50 = sma50.data.sma[sma50.data.sma.length - 1]
    const lastSma200 = sma200.data.sma[sma200.data.sma.length - 1]
    if (lastSma50 > lastSma200) {
      trendStatus.value = 'Uptrend'; trendDescription.value = 'SMA 50 di atas SMA 200'; trendClass.value = 'bullish'
    } else {
      trendStatus.value = 'Downtrend'; trendDescription.value = 'SMA 50 di bawah SMA 200'; trendClass.value = 'bearish'
    }
  } else if (sma50 && sma50.data.sma) {
    const lastSma50 = sma50.data.sma[sma50.data.sma.length - 1]
    trendStatus.value = 'SMA 50'; trendDescription.value = `SMA 50: ${lastSma50 ? lastSma50.toFixed(0) : '-'}`; trendClass.value = 'neutral'
  } else if (ema20 && ema20.data.ema) {
    const lastEma20 = ema20.data.ema[ema20.data.ema.length - 1]
    trendStatus.value = 'EMA 20'; trendDescription.value = `EMA 20: ${lastEma20 ? lastEma20.toFixed(0) : '-'}`; trendClass.value = 'neutral'
  } else {
    trendStatus.value = '-'; trendDescription.value = 'Trend tidak tersedia'; trendClass.value = 'neutral'
  }
}

onMounted(() => {
  fetchEmitens()
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.analysis-page {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  color: #0F172A;
  --blue: #205BFC; --green: #21BF73; --red: #EF3A3A;
   --border: rgba(0,0,0,0.05); --radius: 20px; --radius-sm: 14px;
  --shadow: 0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.04);
  --shadow-hover: 0 4px 20px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.04);
}

.page-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 16px; gap: 16px; flex-wrap: wrap; }
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

/* Quick Picks */
.quick-picks {
  display: flex; align-items: center; gap: 8px; margin-bottom: 16px; flex-wrap: wrap;
}
.quick-label { font-size: 12px; font-weight: 600; color: var(--text3); }
.quick-btn {
  height: 32px; padding: 0 12px; border: 1px solid var(--border); border-radius: 100px;
  background: var(--surface); font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 600;
  color: var(--text2); cursor: pointer; transition: all 0.2s ease;
}
.quick-btn:hover { border-color: var(--blue); color: var(--blue); }
.quick-btn.active { background: var(--blue); color: white; border-color: var(--blue); }

/* Search */
.search-section { position: relative; margin-bottom: 16px; }
.search-wrap {
  display: flex; align-items: center; gap: 10px;
  background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm);
  padding: 0 16px; transition: all 0.2s ease;
}
.search-wrap:focus-within { border-color: var(--blue); box-shadow: 0 0 0 3px rgba(32,91,252,0.1); }
.search-icon { color: var(--text3); flex-shrink: 0; }
.search-input {
  flex: 1; height: 44px; border: none; background: transparent;
  font-family: 'Inter', sans-serif; font-size: 14px; color: var(--text);
  outline: none;
}
.search-input::placeholder { color: var(--text3); }
.selected-badge {
  display: flex; align-items: center; gap: 6px;
  padding: 4px 12px; background: rgba(32,91,252,0.07); border-radius: 100px;
  font-size: 12px; font-weight: 700; color: var(--blue); cursor: pointer;
}
.clear-x { font-size: 16px; line-height: 1; }

/* Dropdown */
.dropdown {
  position: absolute; top: 100%; left: 0; right: 0; z-index: 100;
  background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm);
  box-shadow: 0 10px 40px rgba(0,0,0,0.1); margin-top: 4px; overflow: hidden;
}
.dropdown-scroll { max-height: 320px; overflow-y: auto; }
.dropdown-item {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 16px; cursor: pointer; transition: background 0.15s ease;
}
.dropdown-item:hover, .dropdown-item.highlighted { background: var(--bg); }
.dd-symbol { font-weight: 700; font-size: 13px; color: var(--text); min-width: 56px; }
.dd-name { flex: 1; font-size: 13px; color: var(--text2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dd-sector { font-size: 11px; color: var(--text3); padding: 2px 8px; background: var(--bg); border-radius: 100px; white-space: nowrap; }

/* Controls */
.controls-bar { display: flex; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; align-items: center; }
.pill-group { display: flex; gap: 4px; background: var(--bg); border-radius: 100px; padding: 4px; align-items: center; }
.pill-label { font-size: 11px; font-weight: 600; color: var(--text3); padding: 0 8px; }
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
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 80px 20px; text-align: center;
}
.empty-icon { color: var(--text3); margin-bottom: 16px; opacity: 0.5; }
.empty-title { font-size: 16px; font-weight: 600; color: var(--text); margin: 0 0 8px; }
.empty-desc { font-size: 14px; color: var(--text3); margin: 0; }

.signals-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; }

.bento-card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius); padding: 24px;
  box-shadow: var(--shadow); transition: all 0.25s ease;
}
.bento-card:hover { box-shadow: var(--shadow-hover); }

.signal-card { border-left: 4px solid var(--border); }
.signal-card.bullish { border-left-color: var(--green); }
.signal-card.bearish { border-left-color: var(--red); }
.signal-card.neutral { border-left-color: var(--text3); }

.signal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.signal-badge {
  font-size: 10px; font-weight: 700; padding: 3px 10px; border-radius: 100px;
  background: rgba(32,91,252,0.07); color: var(--blue); text-transform: uppercase; letter-spacing: 0.5px;
}
.signal-value {
  font-family: 'DM Mono', 'Inter', monospace; font-size: 20px; font-weight: 700; color: var(--text);
}

.signal-status {
  font-family: 'DM Sans', 'Inter', sans-serif; font-size: 18px; font-weight: 700; margin-bottom: 6px;
}
.signal-card.bullish .signal-status { color: var(--green); }
.signal-card.bearish .signal-status { color: var(--red); }
.signal-card.neutral .signal-status { color: var(--text3); }

.signal-desc { font-size: 13px; color: var(--text2); line-height: 1.5; }

@media (max-width: 768px) {
  .page-header { flex-direction: column; align-items: flex-start; }
  .controls-bar { flex-direction: column; align-items: stretch; }
  .pill-group { overflow-x: auto; }
  .signals-grid { grid-template-columns: 1fr; }
}
</style>
