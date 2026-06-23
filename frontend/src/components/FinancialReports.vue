<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import axios from 'axios'

const API_BASE = ''

const loading = ref(false)
const error = ref('')
const reports = ref([])
const totalCount = ref(0)

const filters = reactive({
  reportType: 'rdf',
  emitenType: 's',
  year: '2026',
  periode: 'tw1',
  kodeEmiten: '',
  pageSize: 12,
  indexFrom: 1,
  sortColumn: 'KodeEmiten',
  sortOrder: 'asc'
})

const showFilters = ref(true)

async function fetchReports() {
  loading.value = true
  error.value = ''
  try {
    const params = {
      year: filters.year,
      reportType: filters.reportType,
      periode: filters.periode,
      emitenType: filters.emitenType,
      pageSize: filters.pageSize,
      indexFrom: filters.indexFrom,
      sortColumn: filters.sortColumn,
      sortOrder: filters.sortOrder
    }
    if (filters.kodeEmiten) {
      params.kodeEmiten = filters.kodeEmiten
    }

    const res = await axios.get(`${API_BASE}/api/financial-reports`, { params })
    reports.value = res.data.Results || []
    totalCount.value = res.data.ResultCount || 0
  } catch (err) {
    error.value = err.response?.data?.error || err.message
  } finally {
    loading.value = false
  }
}

function downloadFile(filePath) {
  if (!filePath) return
  const url = `https://www.idx.co.id${filePath}`
  window.open(url, '_blank')
}

function resetFilters() {
  filters.reportType = 'rdf'
  filters.emitenType = 's'
  filters.year = '2026'
  filters.periode = 'tw1'
  filters.kodeEmiten = ''
  filters.indexFrom = 1
  fetchReports()
}

function applyFilters() {
  filters.indexFrom = 1
  fetchReports()
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatFileSize(bytes) {
  if (!bytes) return ''
  if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  if (bytes >= 1024) return (bytes / 1024).toFixed(2) + ' KB'
  return bytes + ' B'
}

function getFileIcon(fileType) {
  if (fileType === '.pdf') return '📄'
  if (fileType === '.xlsx') return '📊'
  if (fileType === '.zip') return '📦'
  return '📎'
}

onMounted(() => {
  fetchReports()
})

watch(() => filters.kodeEmiten, () => {
  filters.indexFrom = 1
})

// Auto-fetch when radio filters change
watch(() => [filters.year, filters.periode, filters.reportType, filters.emitenType], () => {
  filters.indexFrom = 1
  fetchReports()
}, { deep: true })
</script>

<template>
  <div class="fr-container">
    <!-- HEADER -->
    <div class="fr-header">
      <h1 class="fr-title">Laporan Keuangan dan Tahunan</h1>
      <p class="fr-subtitle">Download laporan keuangan & laporan tahunan dari BEI/IDX</p>
    </div>

    <!-- FILTER TOGGLE -->
    <button class="fr-filter-toggle" @click="showFilters = !showFilters">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
      </svg>
      {{ showFilters ? 'Sembunyikan Filter' : 'Tampilkan Filter' }}
    </button>

    <!-- FILTER PANEL -->
    <div v-if="showFilters" class="fr-filter-panel">
      <div class="fr-filter-grid">
        <!-- Jenis Laporan -->
        <div class="fr-filter-group">
          <label class="fr-filter-label">Jenis Laporan</label>
          <div class="fr-radio-group">
            <label class="fr-radio">
              <input type="radio" v-model="filters.reportType" value="rdf" />
              <span class="fr-radio-check"></span>
              <span class="fr-radio-text">Laporan Keuangan</span>
            </label>
            <label class="fr-radio">
              <input type="radio" v-model="filters.reportType" value="annual" />
              <span class="fr-radio-check"></span>
              <span class="fr-radio-text">Laporan Tahunan</span>
            </label>
          </div>
        </div>

        <!-- Jenis Efek -->
        <div class="fr-filter-group">
          <label class="fr-filter-label">Jenis Efek</label>
          <div class="fr-radio-group">
            <label class="fr-radio">
              <input type="radio" v-model="filters.emitenType" value="s" />
              <span class="fr-radio-check"></span>
              <span class="fr-radio-text">Saham</span>
            </label>
            <label class="fr-radio">
              <input type="radio" v-model="filters.emitenType" value="o" />
              <span class="fr-radio-check"></span>
              <span class="fr-radio-text">Obligasi</span>
            </label>
          </div>
        </div>

        <!-- Tahun -->
        <div class="fr-filter-group">
          <label class="fr-filter-label">Tahun</label>
          <div class="fr-radio-group vertical">
            <label class="fr-radio" v-for="year in ['2026', '2025', '2024', '2023', '2022']" :key="year">
              <input type="radio" v-model="filters.year" :value="year" />
              <span class="fr-radio-check"></span>
              <span class="fr-radio-text">{{ year }}</span>
            </label>
          </div>
        </div>

        <!-- Periode -->
        <div class="fr-filter-group">
          <label class="fr-filter-label">Periode</label>
          <div class="fr-radio-group vertical">
            <label class="fr-radio" v-for="p in [{val:'tw1', label:'Triwulan 1'}, {val:'tw2', label:'Triwulan 2'}, {val:'tw3', label:'Triwulan 3'}, {val:'tahunan', label:'Tahunan'}]" :key="p.val">
              <input type="radio" v-model="filters.periode" :value="p.val" />
              <span class="fr-radio-check"></span>
              <span class="fr-radio-text">{{ p.label }}</span>
            </label>
          </div>
        </div>
      </div>

      <div class="fr-filter-actions">
        <button class="fr-btn-reset" @click="resetFilters">Reset</button>
        <button class="fr-btn-apply" @click="applyFilters">Terapkan</button>
      </div>
    </div>

    <!-- SEARCH & CONTROLS -->
    <div class="fr-controls">
      <div class="fr-search">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          v-model="filters.kodeEmiten"
          type="text"
          placeholder="Cari kode emiten..."
          @keyup.enter="applyFilters"
        />
      </div>
      <div class="fr-page-size">
        <select v-model="filters.pageSize" @change="applyFilters">
          <option value="12">12</option>
          <option value="24">24</option>
          <option value="48">48</option>
        </select>
      </div>
    </div>

    <!-- ERROR -->
    <div v-if="error" class="fr-error">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      {{ error }}
    </div>

    <!-- LOADING -->
    <div v-if="loading && !reports.length" class="fr-loading">
      <div class="fr-spinner"></div>
      <p>Memuat laporan...</p>
    </div>

    <!-- EMPTY -->
    <div v-else-if="!loading && !reports.length" class="fr-empty">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
      </svg>
      <p>Tidak ada laporan untuk filter yang dipilih.</p>
      <p style="font-size: 13px; color: var(--text3); margin-top: 4px;">
        Coba ubah filter (tahun / periode) atau reset filter.
      </p>
      <a
        href="https://www.idx.co.id/id/perusahaan-tercatat/laporan-keuangan-dan-tahunan/"
        target="_blank"
        class="fr-btn-apply"
        style="margin-top: 16px; text-decoration: none; display: inline-block;"
      >
        Akses Laporan di BEI/IDX
      </a>
    </div>

    <!-- RESULTS GRID -->
    <div v-else class="fr-grid">
      <div v-for="report in reports" :key="report.KodeEmiten + report.Report_Year + report.Report_Period" class="fr-card">
        <!-- Card Header -->
        <div class="fr-card-header">
          <h3 class="fr-card-code">{{ report.KodeEmiten }}</h3>
          <span class="fr-card-date">{{ formatDate(report.File_Modified) }}</span>
        </div>

        <!-- Info Table -->
        <div class="fr-card-info">
          <div class="fr-info-row">
            <span class="fr-info-label">Nama</span>
            <span class="fr-info-separator">:</span>
            <span class="fr-info-value">{{ report.NamaEmiten }}</span>
          </div>
          <div class="fr-info-row">
            <span class="fr-info-label">Tahun</span>
            <span class="fr-info-separator">:</span>
            <span class="fr-info-value">{{ report.Report_Year }}</span>
          </div>
          <div class="fr-info-row">
            <span class="fr-info-label">Periode</span>
            <span class="fr-info-separator">:</span>
            <span class="fr-info-value">{{ report.Report_Period }}</span>
          </div>
        </div>

        <!-- File List -->
        <div class="fr-card-files">
          <div
            v-for="att in report.Attachments"
            :key="att.File_ID"
            class="fr-file-row"
            @click="downloadFile(att.File_Path)"
            title="Download: {{ att.File_Name }}"
          >
            <span class="fr-file-name">{{ att.File_Name }}</span>
            <span class="fr-file-download-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#B91C1C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- PAGINATION -->
    <div v-if="totalCount > filters.pageSize" class="fr-pagination">
      <button
        class="fr-page-btn"
        :disabled="filters.indexFrom <= 1"
        @click="filters.indexFrom = Math.max(1, filters.indexFrom - filters.pageSize); fetchReports()"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </button>
      <span class="fr-page-info">
        {{ filters.indexFrom }} - {{ Math.min(filters.indexFrom + parseInt(filters.pageSize) - 1, totalCount) }} dari {{ totalCount }}
      </span>
      <button
        class="fr-page-btn"
        :disabled="filters.indexFrom + parseInt(filters.pageSize) > totalCount"
        @click="filters.indexFrom = parseInt(filters.indexFrom) + parseInt(filters.pageSize); fetchReports()"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </button>
    </div>

    <!-- SUMMARY -->
    <div v-if="reports.length" class="fr-summary">
      Menampilkan {{ reports.length }} dari {{ totalCount }} laporan
    </div>
  </div>
</template>

<style scoped>
.fr-container {
  padding: 24px;
  max-width: 1400px;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --blue: #205BFC; --green: #21BF73; --red: #EF3A3A;
   --border: rgba(0,0,0,0.05); --radius: 20px; --radius-sm: 14px;
  --shadow: 0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.04);
  --shadow-hover: 0 4px 16px rgba(0,0,0,0.06);
}

.fr-header { margin-bottom: 24px; }
.fr-title {
  font-family: 'DM Sans', 'Inter', sans-serif; font-size: 28px; font-weight: 800;
  color: var(--text); margin: 0 0 4px 0; letter-spacing: -0.5px;
}
.fr-subtitle { font-size: 14px; color: var(--text2); margin: 0; font-weight: 400; }

.fr-filter-toggle {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 10px 18px; background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius-sm); font-family: inherit; font-size: 13px; font-weight: 600;
  color: var(--text2); cursor: pointer; margin-bottom: 16px; transition: all 0.2s;
}
.fr-filter-toggle:hover { background: var(--bg); border-color: rgba(0,0,0,0.08); color: var(--text); }

.fr-filter-panel {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius); padding: 24px; margin-bottom: 20px; box-shadow: var(--shadow);
}
.fr-filter-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 24px; margin-bottom: 20px; }
.fr-filter-group { display: flex; flex-direction: column; gap: 10px; }

.fr-filter-label {
  font-size: 11px; font-weight: 700; color: var(--text3);
  text-transform: uppercase; letter-spacing: 0.7px;
}
.fr-radio-group { display: flex; flex-direction: column; gap: 8px; }
.fr-radio-group.vertical { max-height: 160px; overflow-y: auto; }
.fr-radio { display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 14px; color: var(--text2); font-weight: 500; }
.fr-radio input { display: none; }
.fr-radio-check {
  width: 18px; height: 18px; border: 2px solid rgba(0,0,0,0.12); border-radius: 50%;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all 0.2s;
}
.fr-radio-check::after {
  content: ''; width: 10px; height: 10px; background: var(--blue); border-radius: 50%; opacity: 0; transition: all 0.2s;
}
.fr-radio input:checked + .fr-radio-check { border-color: var(--blue); }
.fr-radio input:checked + .fr-radio-check::after { opacity: 1; }
.fr-radio-text { transition: color 0.2s; }
.fr-radio input:checked ~ .fr-radio-text { color: var(--blue); font-weight: 600; }

.fr-filter-actions { display: flex; justify-content: flex-end; gap: 10px; border-top: 1px solid var(--border); padding-top: 16px; }
.fr-btn-reset {
  height: 42px; padding: 0 20px; background: var(--bg); border: 1px solid var(--border);
  border-radius: 12px; font-family: inherit; font-size: 13px; font-weight: 600;
  color: var(--text2); cursor: pointer; transition: all 0.2s;
}
.fr-btn-reset:hover { background: var(--border); color: var(--text); }
.fr-btn-apply {
  height: 42px; padding: 0 20px; background: var(--blue); border: none;
  border-radius: 12px; font-family: inherit; font-size: 13px; font-weight: 600;
  color: white; cursor: pointer; transition: all 0.2s;
}
.fr-btn-apply:hover { background: #1a4fd4; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(32,91,252,0.3); }

.fr-controls { display: flex; gap: 12px; margin-bottom: 20px; }
.fr-search {
  flex: 1; display: flex; align-items: center; gap: 10px;
  padding: 10px 16px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm);
}
.fr-search svg { color: var(--text3); flex-shrink: 0; }
.fr-search input {
  flex: 1; border: none; outline: none; font-family: inherit; font-size: 14px;
  color: var(--text); background: transparent;
}
.fr-search input::placeholder { color: var(--text3); }
.fr-page-size select {
  height: 42px; padding: 0 36px 0 14px; background: var(--surface); border: 1px solid var(--border);
  border-radius: 12px; font-family: inherit; font-size: 14px; color: var(--text2); cursor: pointer; outline: none;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%2394A3B8' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 14px center;
}

.fr-error {
  display: flex; align-items: center; gap: 10px;
  padding: 14px 18px; background: rgba(239,58,58,0.06);
  border: 1px solid rgba(239,58,58,0.12); border-radius: var(--radius-sm);
  color: var(--red); font-size: 13px; font-weight: 500; margin-bottom: 20px;
}
.fr-loading { display: flex; flex-direction: column; align-items: center; padding: 60px 20px; color: var(--text2); }
.fr-spinner {
  width: 36px; height: 36px; border: 3px solid var(--border); border-top-color: var(--blue);
  border-radius: 50%; animation: frSpin 0.8s linear infinite; margin-bottom: 12px;
}
@keyframes frSpin { to { transform: rotate(360deg); } }

.fr-empty {
  display: flex; flex-direction: column; align-items: center; padding: 60px 20px;
  color: var(--text3); text-align: center;
}
.fr-empty svg { margin-bottom: 12px; opacity: 0.4; }

.fr-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
@media (max-width: 1200px) { .fr-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 768px) { .fr-grid { grid-template-columns: 1fr; } }

.fr-card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius); padding: 0; transition: all 0.2s; overflow: hidden; box-shadow: var(--shadow);
}
.fr-card:hover { border-color: rgba(0,0,0,0.08); box-shadow: var(--shadow-hover); transform: translateY(-1px); }

.fr-card-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 18px 24px 12px; border-bottom: 1px solid var(--border);
}
.fr-card-code {
  font-family: 'DM Sans', 'Inter', sans-serif; font-size: 24px; font-weight: 800;
  color: var(--text); margin: 0; letter-spacing: -0.5px;
}
.fr-card-date { font-size: 12px; color: var(--text3); font-weight: 500; }

.fr-card-info { padding: 14px 24px; border-bottom: 1px solid var(--border); }
.fr-info-row { display: flex; gap: 8px; margin-bottom: 5px; font-size: 13px; line-height: 1.5; }
.fr-info-row:last-child { margin-bottom: 0; }
.fr-info-label { color: var(--text3); min-width: 52px; font-weight: 600; font-size: 11px; text-transform: uppercase; }
.fr-info-separator { color: var(--text3); }
.fr-info-value { color: var(--text2); font-weight: 500; }

.fr-card-files { padding: 0; }
.fr-file-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 12px 24px; cursor: pointer; border-bottom: 1px solid var(--border); transition: background 0.15s;
}
.fr-file-row:last-child { border-bottom: none; }
.fr-file-row:hover { background: var(--bg); }
.fr-file-name {
  font-size: 13px; color: var(--text2); font-weight: 500; flex: 1; min-width: 0;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding-right: 12px;
}
.fr-file-download-icon {
  flex-shrink: 0; display: flex; align-items: center; justify-content: center;
  width: 32px; height: 32px; color: var(--blue); border-radius: 8px; transition: all 0.15s;
}
.fr-file-row:hover .fr-file-download-icon { background: rgba(32,91,252,0.06); transform: scale(1.05); }

.fr-pagination {
  display: flex; justify-content: center; align-items: center; gap: 16px;
  margin-top: 24px; padding-top: 24px; border-top: 1px solid var(--border);
}
.fr-page-btn {
  width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;
  background: var(--surface); border: 1px solid var(--border); border-radius: 12px;
  color: var(--text2); cursor: pointer; transition: all 0.2s;
}
.fr-page-btn:hover:not(:disabled) { background: var(--bg); border-color: rgba(0,0,0,0.08); color: var(--text); }
.fr-page-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.fr-page-info { font-size: 14px; color: var(--text2); font-weight: 500; }
.fr-summary { text-align: center; margin-top: 16px; font-size: 13px; color: var(--text3); font-weight: 500; }

.fr-radio-group.vertical::-webkit-scrollbar { width: 4px; }
.fr-radio-group.vertical::-webkit-scrollbar-track { background: transparent; }
.fr-radio-group.vertical::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.08); border-radius: 4px; }
</style>
