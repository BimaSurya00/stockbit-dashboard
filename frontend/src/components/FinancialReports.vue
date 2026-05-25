<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import axios from 'axios'

const API_BASE = ''

const loading = ref(false)
const error = ref('')
const idxError = ref(null)
const reports = ref([])
const totalCount = ref(0)
const idxFetchedCount = ref(0)

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

async function fetchReports(force = false) {
  loading.value = true
  error.value = ''
  idxError.value = null
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
    if (force) {
      params.force = 'true'
    }

    const res = await axios.get(`${API_BASE}/api/financial-reports`, { params })
    reports.value = res.data.Results || []
    totalCount.value = res.data.ResultCount || 0
    idxFetchedCount.value = res.data.idxFetchedCount || 0
    idxError.value = res.data.idxError || null
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

    <!-- IDX ERROR BANNER -->
    <div v-if="idxError" class="fr-idx-error">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <div class="fr-idx-error-body">
        <p class="fr-idx-error-title">Gagal mengambil data dari IDX</p>
        <p class="fr-idx-error-detail">
          Status: {{ idxError.status || 'N/A' }} — {{ idxError.message }}
        </p>
        <p class="fr-idx-error-hint">
          Server ini kemungkinan diblokir oleh IDX (IP geo-restriction). Solusi: jalankan seed dari laptop lokal atau gunakan proxy Indonesia.
        </p>
        <button class="fr-btn-apply" @click="fetchReports(true)" :disabled="loading">
          {{ loading ? 'Mencoba...' : 'Refresh dari IDX (Retry)' }}
        </button>
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
      <p>Tidak ada laporan untuk filter yang dipilih</p>
      <div v-if="idxError" style="display:flex; flex-direction:column; gap:8px; margin-top:12px;">
        <button class="fr-btn-apply" @click="fetchReports(true)">
          Coba Refresh dari IDX
        </button>
        <a
          href="https://www.idx.co.id/id/perusahaan-tercatat/laporan-keuangan-dan-tahunan/"
          target="_blank"
          class="fr-btn-apply"
          style="background:#205BFC; text-decoration:none; text-align:center; display:inline-block;"
        >
          Akses Laporan di BEI/IDX
        </a>
      </div>
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
}

.fr-header {
  margin-bottom: 24px;
}

.fr-title {
  font-size: 24px;
  font-weight: 700;
  color: #111827;
  margin: 0 0 4px 0;
}

.fr-subtitle {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
}

/* FILTER TOGGLE */
.fr-filter-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #f3f4f6;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  cursor: pointer;
  margin-bottom: 16px;
  transition: all 0.2s;
}

.fr-filter-toggle:hover {
  background: #e5e7eb;
}

/* FILTER PANEL */
.fr-filter-panel {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
}

.fr-filter-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.fr-filter-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.fr-filter-label {
  font-size: 12px;
  font-weight: 700;
  color: #374151;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.fr-radio-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.fr-radio-group.vertical {
  max-height: 160px;
  overflow-y: auto;
}

.fr-radio {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 13px;
  color: #4b5563;
}

.fr-radio input {
  display: none;
}

.fr-radio-check {
  width: 16px;
  height: 16px;
  border: 2px solid #d1d5db;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s;
}

.fr-radio-check::after {
  content: '';
  width: 8px;
  height: 8px;
  background: #205BFC;
  border-radius: 50%;
  opacity: 0;
  transition: all 0.2s;
}

.fr-radio input:checked + .fr-radio-check {
  border-color: #205BFC;
}

.fr-radio input:checked + .fr-radio-check::after {
  opacity: 1;
}

.fr-radio-text {
  transition: color 0.2s;
}

.fr-radio input:checked ~ .fr-radio-text {
  color: #205BFC;
  font-weight: 600;
}

.fr-filter-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  border-top: 1px solid #f3f4f6;
  padding-top: 16px;
}

.fr-btn-reset {
  padding: 8px 20px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #4b5563;
  cursor: pointer;
  transition: all 0.2s;
}

.fr-btn-reset:hover {
  background: #f9fafb;
  border-color: #d1d5db;
}

.fr-btn-apply {
  padding: 8px 20px;
  background: #B91C1C;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  color: white;
  cursor: pointer;
  transition: all 0.2s;
}

.fr-btn-apply:hover {
  background: #991B1B;
}

/* CONTROLS */
.fr-controls {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.fr-search {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.fr-search svg {
  color: #9ca3af;
  flex-shrink: 0;
}

.fr-search input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 14px;
  color: #111827;
  background: transparent;
}

.fr-search input::placeholder {
  color: #9ca3af;
}

.fr-page-size select {
  padding: 8px 12px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  color: #374151;
  cursor: pointer;
  outline: none;
}

/* IDX ERROR BANNER */
.fr-idx-error {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  background: rgba(245, 158, 11, 0.08);
  border: 1px solid rgba(245, 158, 11, 0.25);
  border-radius: 10px;
  color: #92400e;
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 20px;
}

.fr-idx-error svg {
  flex-shrink: 0;
  margin-top: 2px;
}

.fr-idx-error-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.fr-idx-error-title {
  font-weight: 700;
  margin: 0;
}

.fr-idx-error-detail {
  font-family: monospace;
  font-size: 12px;
  opacity: 0.85;
  margin: 0;
}

.fr-idx-error-hint {
  font-size: 12px;
  opacity: 0.75;
  margin: 0 0 8px 0;
  line-height: 1.5;
}

/* ERROR / LOADING / EMPTY */
.fr-error {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: rgba(239, 68, 68, 0.06);
  border: 1px solid rgba(239, 68, 68, 0.15);
  border-radius: 10px;
  color: #dc2626;
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 20px;
}

.fr-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #6b7280;
}

.fr-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e5e7eb;
  border-top-color: #B91C1C;
  border-radius: 50%;
  animation: frSpin 0.8s linear infinite;
  margin-bottom: 12px;
}

@keyframes frSpin {
  to { transform: rotate(360deg); }
}

.fr-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #9ca3af;
  text-align: center;
}

.fr-empty svg {
  margin-bottom: 12px;
  opacity: 0.5;
}

/* GRID - 3 column card layout like IDX screenshot */
.fr-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

@media (max-width: 1200px) {
  .fr-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .fr-grid {
    grid-template-columns: 1fr;
  }
}

/* CARD */
.fr-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  padding: 0;
  transition: all 0.2s;
  overflow: hidden;
}

.fr-card:hover {
  border-color: #d1d5db;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

/* Card Header */
.fr-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px 8px 20px;
  border-bottom: 1px solid #f3f4f6;
}

.fr-card-code {
  font-family: 'DM Sans', sans-serif;
  font-size: 28px;
  font-weight: 700;
  color: #4b5563;
  margin: 0;
  letter-spacing: -0.5px;
}

.fr-card-date {
  font-size: 12px;
  color: #9ca3af;
  font-weight: 500;
}

/* Card Info */
.fr-card-info {
  padding: 12px 20px;
  border-bottom: 1px solid #f3f4f6;
}

.fr-info-row {
  display: flex;
  gap: 8px;
  margin-bottom: 6px;
  font-size: 14px;
  line-height: 1.5;
}

.fr-info-row:last-child {
  margin-bottom: 0;
}

.fr-info-label {
  color: #6b7280;
  min-width: 55px;
  font-weight: 400;
}

.fr-info-separator {
  color: #6b7280;
}

.fr-info-value {
  color: #374151;
  font-weight: 500;
}

/* Card Files - styled like IDX screenshot */
.fr-card-files {
  padding: 0;
}

.fr-file-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 20px;
  cursor: pointer;
  border-bottom: 1px solid #f3f4f6;
  transition: background 0.15s;
}

.fr-file-row:last-child {
  border-bottom: none;
}

.fr-file-row:hover {
  background: #f9fafb;
}

.fr-file-name {
  font-size: 13px;
  color: #4b5563;
  font-weight: 400;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding-right: 12px;
}

.fr-file-download-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  color: #B91C1C;
  transition: transform 0.15s;
}

.fr-file-row:hover .fr-file-download-icon {
  transform: scale(1.1);
}

.fr-file-download-icon svg {
  display: block;
}

/* PAGINATION */
.fr-pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #f3f4f6;
}

.fr-page-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s;
}

.fr-page-btn:hover:not(:disabled) {
  background: #f9fafb;
  border-color: #d1d5db;
}

.fr-page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.fr-page-info {
  font-size: 13px;
  color: #6b7280;
  font-weight: 500;
}

.fr-summary {
  text-align: center;
  margin-top: 16px;
  font-size: 12px;
  color: #9ca3af;
}

/* Scrollbar */
.fr-radio-group.vertical::-webkit-scrollbar {
  width: 4px;
}

.fr-radio-group.vertical::-webkit-scrollbar-track {
  background: transparent;
}

.fr-radio-group.vertical::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.08);
  border-radius: 4px;
}
</style>
