<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import axios from 'axios'

const emit = defineEmits(['change'])

const API_BASE = ''

// State
const allIndicators = ref([])
const loading = ref(false)
const error = ref('')
const search = ref('')
const expanded = ref({ overlay: true, oscillator: true })
const activeIndicators = ref(new Map()) // key -> { params: {} }

// Category labels
const categoryLabels = {
  overlay: '📊 Overlay (di chart)',
  oscillator: '📈 Oscillator (panel bawah)'
}

// Fetch available indicators
async function fetchIndicators() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await axios.get(`${API_BASE}/api/indicators`)
    allIndicators.value = data
  } catch (err) {
    error.value = err.response?.data?.error || err.message
  } finally {
    loading.value = false
  }
}

// Group indicators by category
const groupedIndicators = computed(() => {
  const groups = {}
  for (const ind of allIndicators.value) {
    if (!groups[ind.category]) groups[ind.category] = []
    groups[ind.category].push(ind)
  }
  return groups
})

// Filter indicators by search
function filterByCategory(category) {
  const items = groupedIndicators.value[category] || []
  if (!search.value) return items
  const q = search.value.toLowerCase()
  return items.filter(ind =>
    ind.name.toLowerCase().includes(q) ||
    ind.key.toLowerCase().includes(q) ||
    (ind.description || '').toLowerCase().includes(q)
  )
}

// Toggle category expand/collapse
function toggleCategory(cat) {
  expanded.value[cat] = !expanded.value[cat]
}

// Check if indicator is active
function isActive(key) {
  return activeIndicators.value.has(key)
}

// Toggle indicator on/off
function toggleIndicator(ind) {
  const newMap = new Map(activeIndicators.value)
  if (newMap.has(ind.key)) {
    newMap.delete(ind.key)
  } else {
    const params = {}
    for (const p of ind.params) {
      params[p.key] = p.default
    }
    newMap.set(ind.key, { params, originalKey: ind.key })
  }
  activeIndicators.value = newMap
  emitChange()
}

// Get current param value
function getParam(indKey, paramKey, defaultVal) {
  const entry = activeIndicators.value.get(indKey)
  return entry?.params[paramKey] ?? defaultVal
}

// Update param value
function setParam(indKey, paramKey, value) {
  const newMap = new Map(activeIndicators.value)
  const entry = newMap.get(indKey)
  if (entry) {
    entry.params[paramKey] = Number(value)
    activeIndicators.value = newMap
    emitChange()
  }
}

// Emit change event with active indicators
function emitChange() {
  const indicators = Array.from(activeIndicators.value.entries()).map(([key, { params, originalKey }]) => ({
    key: originalKey || key, // Use originalKey if available (for presets with duplicate indicators)
    params
  }))
  emit('change', indicators)
}

// Clear all indicators
function clearAll() {
  activeIndicators.value = new Map()
  emitChange()
}

// Quick presets
const presets = [
  {
    name: 'Moving Averages',
    indicators: [
      { key: 'SMA', params: { period: 20 } },
      { key: 'SMA', params: { period: 50 } },
      { key: 'EMA', params: { period: 12 } }
    ]
  },
  {
    name: 'Bollinger + RSI',
    indicators: [
      { key: 'BBANDS', params: { period: 20, stdDev: 2 } },
      { key: 'RSI', params: { period: 14 } }
    ]
  },
  {
    name: 'MACD + RSI',
    indicators: [
      { key: 'MACD', params: {} },
      { key: 'RSI', params: { period: 14 } }
    ]
  },
  {
    name: 'Trend Following',
    indicators: [
      { key: 'SMA', params: { period: 50 } },
      { key: 'SMA', params: { period: 200 } },
      { key: 'ADX', params: { period: 14 } }
    ]
  }
]

function applyPreset(preset) {
  const newMap = new Map()
  for (const ind of preset.indicators) {
    // For duplicate keys (like multiple SMAs), use unique key
    const uniqueKey = ind.key + '_' + JSON.stringify(ind.params)
    newMap.set(uniqueKey, { ...ind, originalKey: ind.key })
  }
  activeIndicators.value = newMap
  emitChange()
}

// Count active indicators
const activeCount = computed(() => activeIndicators.value.size)

onMounted(fetchIndicators)
</script>

<template>
  <div class="indicator-selector">
    <!-- Header -->
    <div class="selector-header">
      <div class="header-title">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
        </svg>
        <span>Indikator Teknikal</span>
        <span v-if="activeCount > 0" class="active-badge">{{ activeCount }}</span>
      </div>
      <button v-if="activeCount > 0" class="clear-btn" @click="clearAll">Clear All</button>
    </div>

    <!-- Search -->
    <div class="search-box">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      <input v-model="search" placeholder="Cari indikator..." />
    </div>

    <!-- Quick Presets -->
    <div class="presets-section">
      <div class="presets-label">Quick Preset:</div>
      <div class="presets-grid">
        <button
          v-for="preset in presets"
          :key="preset.name"
          class="preset-btn"
          @click="applyPreset(preset)"
        >
          {{ preset.name }}
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <span>Memuat indikator...</span>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="error-state">{{ error }}</div>

    <!-- Indicator List -->
    <div v-else class="indicators-list">
      <div
        v-for="category in ['overlay', 'oscillator']"
        :key="category"
        class="category-group"
      >
        <!-- Category Header -->
        <div class="category-header" @click="toggleCategory(category)">
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            :class="{ rotated: expanded[category] }"
          >
            <polyline points="9 18 15 12 9 6"/>
          </svg>
          <span class="category-label">{{ categoryLabels[category] }}</span>
          <span class="category-count">{{ filterByCategory(category).length }}</span>
        </div>

        <!-- Indicators in category -->
        <div v-show="expanded[category]" class="category-items">
          <div
            v-for="ind in filterByCategory(category)"
            :key="ind.key"
            class="indicator-item"
            :class="{ active: isActive(ind.key) }"
          >
            <!-- Toggle + Name -->
            <label class="indicator-toggle">
              <input
                type="checkbox"
                :checked="isActive(ind.key)"
                @change="toggleIndicator(ind)"
              />
              <span class="indicator-name">{{ ind.name }}</span>
              <span class="indicator-key">{{ ind.key }}</span>
            </label>

            <!-- Description -->
            <div v-if="isActive(ind.key) && ind.description" class="indicator-desc">
              {{ ind.description }}
            </div>

            <!-- Parameters -->
            <div v-if="isActive(ind.key) && ind.params.length > 0" class="indicator-params">
              <div v-for="p in ind.params" :key="p.key" class="param-row">
                <label class="param-label">{{ p.label }}</label>
                <input
                  type="number"
                  class="param-input"
                  :value="getParam(ind.key, p.key, p.default)"
                  :min="p.min"
                  :max="p.max"
                  :step="p.step || 1"
                  @change="setParam(ind.key, p.key, $event.target.value)"
                />
              </div>
            </div>

            <!-- Note -->
            <div v-if="isActive(ind.key) && ind.note" class="indicator-note">
              ⚠️ {{ ind.note }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.indicator-selector {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

/* Header */
.selector-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 16px 12px;
  border-bottom: 1px solid rgba(0,0,0,0.06);
  flex-shrink: 0;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 700;
  color: #0F172A;
}

.active-badge {
  background: #205BFC;
  color: white;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 100px;
  min-width: 20px;
  text-align: center;
}

.clear-btn {
  background: none;
  border: 1px solid rgba(239,58,58,0.2);
  color: #EF3A3A;
  font-size: 11px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.clear-btn:hover {
  background: rgba(239,58,58,0.06);
  border-color: rgba(239,58,58,0.3);
}

/* Search */
.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-bottom: 1px solid rgba(0,0,0,0.06);
  flex-shrink: 0;
}

.search-box svg {
  color: #94A3B8;
  flex-shrink: 0;
}

.search-box input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 13px;
  font-family: 'Inter', sans-serif;
  color: #0F172A;
  background: transparent;
}

.search-box input::placeholder {
  color: #94A3B8;
}

/* Presets */
.presets-section {
  padding: 12px 16px;
  border-bottom: 1px solid rgba(0,0,0,0.06);
  flex-shrink: 0;
}

.presets-label {
  font-size: 11px;
  font-weight: 600;
  color: #94A3B8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}

.presets-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.preset-btn {
  padding: 5px 10px;
  border: 1px solid rgba(0,0,0,0.08);
  background: #F8FAFC;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  font-family: 'Inter', sans-serif;
  color: #475569;
  cursor: pointer;
  transition: all 0.2s;
}

.preset-btn:hover {
  background: #EFF6FF;
  border-color: #205BFC;
  color: #205BFC;
}

/* Loading */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 16px;
  gap: 12px;
  color: #94A3B8;
  font-size: 13px;
}

.loading-spinner {
  width: 28px;
  height: 28px;
  border: 3px solid rgba(0,0,0,0.06);
  border-top-color: #205BFC;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Error */
.error-state {
  padding: 16px;
  color: #EF3A3A;
  font-size: 13px;
  text-align: center;
}

/* Indicators List */
.indicators-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

/* Category Group */
.category-group {
  margin-bottom: 4px;
}

.category-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  cursor: pointer;
  user-select: none;
  transition: background 0.2s;
}

.category-header:hover {
  background: rgba(0,0,0,0.02);
}

.category-header svg {
  color: #94A3B8;
  transition: transform 0.2s;
}

.category-header svg.rotated {
  transform: rotate(90deg);
}

.category-label {
  font-size: 12px;
  font-weight: 700;
  color: #475569;
  flex: 1;
}

.category-count {
  font-size: 11px;
  font-weight: 600;
  color: #94A3B8;
  background: #F1F5F9;
  padding: 2px 8px;
  border-radius: 100px;
}

/* Category Items */
.category-items {
  padding: 0 8px;
}

/* Indicator Item */
.indicator-item {
  padding: 8px 12px;
  margin: 2px 0;
  border-radius: 8px;
  transition: all 0.2s;
}

.indicator-item:hover {
  background: rgba(0,0,0,0.02);
}

.indicator-item.active {
  background: #EFF6FF;
  border: 1px solid rgba(32,91,252,0.1);
}

/* Toggle */
.indicator-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.indicator-toggle input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: #205BFC;
  cursor: pointer;
}

.indicator-name {
  font-size: 13px;
  font-weight: 600;
  color: #0F172A;
  flex: 1;
}

.indicator-key {
  font-size: 10px;
  font-weight: 700;
  color: #94A3B8;
  background: #F1F5F9;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'SF Mono', 'Fira Code', monospace;
}

/* Description */
.indicator-desc {
  font-size: 11px;
  color: #64748B;
  margin-top: 6px;
  padding-left: 24px;
  line-height: 1.4;
}

/* Parameters */
.indicator-params {
  margin-top: 8px;
  padding-left: 24px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.param-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.param-label {
  font-size: 11px;
  font-weight: 600;
  color: #64748B;
  white-space: nowrap;
}

.param-input {
  width: 60px;
  padding: 4px 8px;
  border: 1px solid rgba(0,0,0,0.1);
  border-radius: 6px;
  font-size: 12px;
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-weight: 600;
  color: #0F172A;
  background: white;
  text-align: center;
}

.param-input:focus {
  outline: none;
  border-color: #205BFC;
  box-shadow: 0 0 0 2px rgba(32,91,252,0.1);
}

/* Note */
.indicator-note {
  font-size: 10px;
  color: #F59E0B;
  margin-top: 6px;
  padding-left: 24px;
  font-weight: 500;
}

/* Scrollbar */
.indicators-list::-webkit-scrollbar {
  width: 6px;
}

.indicators-list::-webkit-scrollbar-track {
  background: transparent;
}

.indicators-list::-webkit-scrollbar-thumb {
  background: rgba(0,0,0,0.1);
  border-radius: 3px;
}

.indicators-list::-webkit-scrollbar-thumb:hover {
  background: rgba(0,0,0,0.2);
}
</style>
