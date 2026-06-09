<template>
  <div class="backfill-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">Backfill Status</h1>
        <p class="page-subtitle">Status data volume dari Yahoo Finance</p>
      </div>
      <div class="header-right">
        <button class="btn-refresh" @click="fetchStatus" :disabled="loading">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>
          {{ loading ? 'Loading...' : 'Refresh' }}
        </button>
        <button class="btn-primary" @click="triggerBackfill" :disabled="backfilling">
          {{ backfilling ? 'Starting...' : 'Start Backfill' }}
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading && !status" class="loading-state">
      <div class="spinner"></div>
      <span>Memuat status...</span>
    </div>

    <!-- Status Cards -->
    <div v-else-if="status" class="content-area">
      <!-- Progress Bar -->
      <div class="bento-card progress-card">
        <div class="progress-header">
          <h3 class="card-title">Progress Backfill</h3>
          <span class="progress-percent">{{ status.percentComplete }}%</span>
        </div>
        <div class="progress-bar-container">
          <div class="progress-bar" :style="{ width: status.percentComplete + '%' }" :class="progressClass"></div>
        </div>
        <div class="progress-labels">
          <span>{{ status.withVolume }} dari {{ status.totalEmiten }} saham sudah ada volume</span>
          <span v-if="status.percentComplete < 100" class="auto-refresh-label">Auto-refresh setiap 5 detik</span>
        </div>
      </div>

      <!-- Summary Cards -->
      <div class="summary-grid">
        <div class="bento-card summary-card">
          <div class="card-header">
            <h3 class="card-title">Total Emiten</h3>
            <span class="badge blue">IDX</span>
          </div>
          <div class="summary-value">{{ status.totalEmiten }}</div>
          <div class="summary-desc">Jumlah emiten aktif di database</div>
        </div>

        <div class="bento-card summary-card">
          <div class="card-header">
            <h3 class="card-title">Sudah Ada Volume</h3>
            <span class="badge green">OK</span>
          </div>
          <div class="summary-value green">{{ status.withVolume }}</div>
          <div class="summary-desc">Saham dengan data volume lengkap</div>
        </div>

        <div class="bento-card summary-card">
          <div class="card-header">
            <h3 class="card-title">Belum Ada Volume</h3>
            <span class="badge red">Pending</span>
          </div>
          <div class="summary-value red">{{ status.withoutVolume }}</div>
          <div class="summary-desc">Saham yang belum di-backfill</div>
        </div>

        <div class="bento-card summary-card">
          <div class="card-header">
            <h3 class="card-title">Status</h3>
            <span class="badge" :class="statusBadgeClass">{{ statusBadgeLabel }}</span>
          </div>
          <div class="summary-value">{{ statusBadgeLabel }}</div>
          <div class="summary-desc">{{ statusDesc }}</div>
        </div>
      </div>

      <!-- Info -->
      <div class="bento-card info-card">
        <h3 class="card-title">Informasi</h3>
        <div class="info-content">
          <p><strong>Sumber Data:</strong> Yahoo Finance API</p>
          <p><strong>Data yang diambil:</strong> Volume, Open, High, Low, Close</p>
          <p><strong>Estimasi waktu:</strong> ~8 menit untuk 957 saham</p>
          <p><strong>Rate limit:</strong> 500ms per request</p>
        </div>
      </div>

      <!-- Backfill Message -->
      <div v-if="backfillMessage" class="bento-card" :class="backfillMessageClass">
        <p>{{ backfillMessage }}</p>
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="error-msg">{{ error }}</div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import axios from 'axios'

const API_BASE = ''

const status = ref(null)
const loading = ref(false)
const error = ref(null)
const backfilling = ref(false)
const backfillMessage = ref('')
const autoRefreshInterval = ref(null)

// Computed
const progressClass = computed(() => {
  if (!status.value) return ''
  if (status.value.percentComplete >= 100) return 'complete'
  if (status.value.percentComplete >= 50) return 'halfway'
  return 'in-progress'
})

const statusBadgeClass = computed(() => {
  if (!status.value) return 'blue'
  if (status.value.percentComplete >= 100) return 'green'
  if (status.value.percentComplete > 0) return 'amber'
  return 'red'
})

const statusBadgeLabel = computed(() => {
  if (!status.value) return '-'
  if (status.value.percentComplete >= 100) return 'Selesai'
  if (status.value.percentComplete > 0) return 'Berjalan'
  return 'Belum Mulai'
})

const statusDesc = computed(() => {
  if (!status.value) return '-'
  if (status.value.percentComplete >= 100) return 'Semua data volume sudah lengkap'
  if (status.value.percentComplete > 0) return 'Backfill sedang berjalan di background'
  return 'Belum ada data volume, klik Start Backfill'
})

const backfillMessageClass = computed(() => {
  if (backfillMessage.value.includes('berhasil') || backfillMessage.value.includes('started')) return 'success-card'
  if (backfillMessage.value.includes('error') || backfillMessage.value.includes('gagal')) return 'error-card'
  return 'info-card'
})

// Functions
async function fetchStatus() {
  loading.value = true
  error.value = null
  try {
    const token = localStorage.getItem('session_token')
    if (!token) {
      error.value = 'Silakan login terlebih dahulu'
      return
    }
    const res = await axios.get(`${API_BASE}/api/admin/backfill-status`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    status.value = res.data
  } catch (err) {
    if (err.response?.status === 401) {
      error.value = 'Token expired, silakan login ulang'
    } else {
      error.value = err.response?.data?.error || 'Gagal memuat status'
    }
  } finally {
    loading.value = false
  }
}

async function triggerBackfill() {
  backfilling.value = true
  backfillMessage.value = ''
  try {
    const token = localStorage.getItem('session_token')
    if (!token) {
      backfillMessage.value = 'Error: Silakan login terlebih dahulu'
      return
    }
    const res = await axios.post(`${API_BASE}/api/admin/backfill-yahoo`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    })
    backfillMessage.value = `Backfill started untuk ${res.data.total} emiten. Proses berjalan di background (~8 menit).`
    
    startAutoRefresh()
    setTimeout(() => fetchStatus(), 2000)
  } catch (err) {
    if (err.response?.status === 401) {
      backfillMessage.value = 'Error: Token expired, silakan login ulang'
    } else {
      backfillMessage.value = `Error: ${err.response?.data?.error || err.message}`
    }
  } finally {
    backfilling.value = false
  }
}
}

async function triggerBackfill() {
  backfilling.value = true
  backfillMessage.value = ''
  try {
    const token = localStorage.getItem('token')
    const res = await axios.post(`${API_BASE}/api/admin/backfill-yahoo`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    })
    backfillMessage.value = `Backfill started untuk ${res.data.total} emiten. Proses berjalan di background (~8 menit).`
    
    // Start auto-refresh
    startAutoRefresh()
    
    // Refresh status after 2 seconds
    setTimeout(() => fetchStatus(), 2000)
  } catch (err) {
    backfillMessage.value = `Error: ${err.response?.data?.error || err.message}`
  } finally {
    backfilling.value = false
  }
}

function startAutoRefresh() {
  if (autoRefreshInterval.value) clearInterval(autoRefreshInterval.value)
  autoRefreshInterval.value = setInterval(() => {
    fetchStatus()
    // Stop auto-refresh if complete
    if (status.value?.percentComplete >= 100) {
      clearInterval(autoRefreshInterval.value)
      autoRefreshInterval.value = null
    }
  }, 5000)
}

function stopAutoRefresh() {
  if (autoRefreshInterval.value) {
    clearInterval(autoRefreshInterval.value)
    autoRefreshInterval.value = null
  }
}

onMounted(() => {
  fetchStatus()
})

onUnmounted(() => {
  stopAutoRefresh()
})
</script>

<style scoped>
.backfill-page {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  color: #0F172A;
  --blue: #205BFC; --green: #21BF73; --red: #EF3A3A;
  --bg: #F8FAFC; --surface: #FFFFFF; --text: #0F172A; --text2: #475569; --text3: #94A3B8;
  --border: rgba(0,0,0,0.05); --radius: 20px; --radius-sm: 14px;
  --shadow: 0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.04);
  --shadow-hover: 0 4px 20px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.04);
}

.page-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px; gap: 16px; flex-wrap: wrap; }
.page-title { font-family: 'DM Sans', 'Inter', sans-serif; font-size: 28px; font-weight: 800; margin: 0; letter-spacing: -1px; color: var(--text); }
.page-subtitle { font-size: 14px; color: var(--text2); margin: 2px 0 0; font-weight: 400; }
.header-right { display: flex; align-items: center; gap: 12px; }

.btn-refresh {
  display: inline-flex; align-items: center; gap: 8px;
  height: 38px; padding: 0 16px;
  background: var(--surface); border: 1px solid var(--border); border-radius: 100px;
  font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 600;
  color: var(--text); cursor: pointer; transition: all 0.2s ease;
}
.btn-refresh:hover:not(:disabled) { box-shadow: var(--shadow-hover); border-color: rgba(0,0,0,0.1); }
.btn-refresh:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-primary {
  display: inline-flex; align-items: center; gap: 8px;
  height: 38px; padding: 0 20px;
  background: var(--blue); color: white; border: none; border-radius: 100px;
  font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 600;
  cursor: pointer; transition: all 0.2s ease;
}
.btn-primary:hover:not(:disabled) { background: #1a4fd4; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

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

.content-area { display: flex; flex-direction: column; gap: 20px; }

.bento-card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius); padding: 24px;
  box-shadow: var(--shadow); transition: all 0.25s ease;
}
.bento-card:hover { box-shadow: var(--shadow-hover); }

.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.card-title { font-family: 'DM Sans', 'Inter', sans-serif; font-size: 14px; font-weight: 700; color: var(--text); margin: 0; }

.badge {
  font-size: 10px; font-weight: 700; padding: 3px 10px; border-radius: 100px;
  text-transform: uppercase; letter-spacing: 0.3px;
}
.badge.blue { background: rgba(32,91,252,0.07); color: var(--blue); }
.badge.green { background: rgba(33,191,115,0.08); color: var(--green); }
.badge.red { background: rgba(239,58,58,0.08); color: var(--red); }
.badge.amber { background: rgba(245,158,11,0.08); color: #D97706; }

/* Progress Card */
.progress-card { padding: 28px; }
.progress-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.progress-percent {
  font-family: 'DM Sans', 'Inter', sans-serif; font-size: 32px; font-weight: 800; color: var(--blue);
}

.progress-bar-container {
  width: 100%; height: 12px; background: var(--bg); border-radius: 6px; overflow: hidden; margin-bottom: 12px;
}
.progress-bar {
  height: 100%; border-radius: 6px; transition: width 0.5s ease;
}
.progress-bar.in-progress { background: linear-gradient(90deg, var(--blue), #60A5FA); }
.progress-bar.halfway { background: linear-gradient(90deg, var(--blue), #3B82F6); }
.progress-bar.complete { background: linear-gradient(90deg, var(--green), #34D399); }

.progress-labels {
  display: flex; justify-content: space-between; font-size: 13px; color: var(--text2);
}
.auto-refresh-label {
  color: var(--blue); font-weight: 500;
}

/* Summary Grid */
.summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; }

.summary-value {
  font-family: 'DM Sans', 'Inter', sans-serif; font-size: 28px; font-weight: 800;
  color: var(--text); margin-bottom: 8px;
}
.summary-value.green { color: var(--green); }
.summary-value.red { color: var(--red); }

.summary-desc { font-size: 13px; color: var(--text2); }

/* Info Card */
.info-card { padding: 24px; }
.info-content { display: flex; flex-direction: column; gap: 8px; }
.info-content p { margin: 0; font-size: 13px; color: var(--text2); line-height: 1.6; }
.info-content strong { color: var(--text); }

/* Message Cards */
.success-card { background: rgba(33,191,115,0.04); border-color: rgba(33,191,115,0.2); }
.success-card p { color: var(--green); margin: 0; font-size: 13px; font-weight: 500; }

.error-card { background: rgba(239,58,58,0.04); border-color: rgba(239,58,58,0.2); }
.error-card p { color: var(--red); margin: 0; font-size: 13px; font-weight: 500; }

@media (max-width: 768px) {
  .page-header { flex-direction: column; align-items: flex-start; }
  .header-right { width: 100%; justify-content: space-between; }
  .summary-grid { grid-template-columns: 1fr; }
  .progress-labels { flex-direction: column; gap: 4px; }
}
</style>
