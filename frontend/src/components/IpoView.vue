<template>
  <div class="ipo-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">IPO Saham</h1>
        <p class="page-subtitle">Daftar Penawaran Umum Perdana di Bursa Efek Indonesia</p>
      </div>
    </div>

    <!-- Filter Tabs -->
    <div class="sub-tabs">
      <button v-for="f in filters" :key="f.value"
        class="sub-tab" :class="{ active: activeFilter === f.value }"
        @click="activeFilter = f.value">
        {{ f.label }}
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <span>Memuat data IPO...</span>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="error-state">
      <div class="error-msg">{{ error }}</div>
      <button class="btn-retry" @click="fetchIpo">Coba Lagi</button>
    </div>

    <!-- Empty -->
    <div v-else-if="ipoList.length === 0" class="empty-state">
      <div class="empty-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
      </div>
      <p class="empty-title">Tidak ada IPO</p>
      <p class="empty-desc">Belum ada data IPO untuk filter ini</p>
    </div>

    <!-- IPO Cards -->
    <div v-else class="ipo-list">
      <div v-for="item in ipoList" :key="item.emiten_code" class="ipo-card bento-card">
        <div class="ipo-left">
          <img v-if="item.company_logo" :src="item.company_logo" :alt="item.company_name" class="ipo-logo" />
          <div v-else class="ipo-logo-placeholder">{{ item.emiten_code?.[0] || '?' }}</div>
        </div>
        <div class="ipo-body">
          <div class="ipo-top">
            <div class="ipo-meta">
              <span class="ipo-code">{{ item.emiten_code }}</span>
              <span v-if="item.is_sharia" class="ipo-badge sharia">Syariah</span>
              <span v-if="item.is_warrant" class="ipo-badge warrant">Waran</span>
            </div>
            <div class="ipo-stage" :class="'stage-' + item.stage">{{ item.stage_display || item.stage }}</div>
          </div>
          <h3 class="ipo-name">{{ item.company_name }}</h3>
          <div class="ipo-details">
            <div class="ipo-detail">
              <span class="detail-label">Harga</span>
              <span class="detail-value price-range">{{ item.price }}</span>
            </div>
            <div class="ipo-detail">
              <span class="detail-label">Jadwal {{ item.stage_display }}</span>
              <span class="detail-value">{{ item.stage_date_display || (item.stage_start_date?.substring(0, 10) + ' s.d ' + item.stage_end_date?.substring(0, 10)) }}</span>
            </div>
            <div v-if="item.ipo_start_date" class="ipo-detail">
              <span class="detail-label">IPO Listing</span>
              <span class="detail-value">{{ new Date(item.ipo_start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import axios from 'axios'

const API_BASE = ''

const filters = [
  { value: 'ongoing', label: 'Berlangsung' },
  { value: 'upcoming', label: 'Akan Datang' },
  { value: 'history', label: 'Riwayat' },
]

const activeFilter = ref('ongoing')
const ipoList = ref([])
const loading = ref(false)
const error = ref(null)

async function fetchIpo() {
  loading.value = true
  error.value = null
  ipoList.value = []
  try {
    const res = await axios.get(`${API_BASE}/api/ipo/list`, {
      params: { filter: activeFilter.value }
    })
    ipoList.value = res.data?.data || []
  } catch (err) {
    error.value = err.response?.data?.error || err.message
  } finally {
    loading.value = false
  }
}

watch(activeFilter, () => { fetchIpo() })

onMounted(() => { fetchIpo() })
</script>

<style scoped>
.ipo-page {
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

/* Filter Tabs */
.sub-tabs {
  display: flex; gap: 4px;
  background: var(--bg); border-radius: 12px; padding: 4px;
  margin-bottom: 20px; width: fit-content;
}
.sub-tab {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 8px 20px; background: transparent; border: none;
  border-radius: 10px;
  font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 600;
  color: var(--text2); cursor: pointer; transition: all 0.2s ease;
}
.sub-tab:hover { color: var(--text); }
.sub-tab.active {
  background: var(--surface); color: var(--text);
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}

/* Loading */
.loading-state {
  display: flex; align-items: center; justify-content: center; gap: 12px;
  padding: 60px 20px; color: var(--text2); font-size: 14px;
}
.spinner {
  width: 20px; height: 20px; border: 2px solid var(--border); border-top-color: var(--blue);
  border-radius: 50%; animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* Error */
.error-state { text-align: center; padding: 40px 20px; }
.error-msg {
  display: inline-block; padding: 12px 16px; background: rgba(239,58,58,0.06);
  border: 1px solid rgba(239,58,58,0.15); border-radius: var(--radius-sm);
  color: var(--red); font-size: 13px; font-weight: 500; margin-bottom: 16px;
}
.btn-retry {
  display: block; margin: 0 auto; padding: 10px 24px;
  background: var(--surface); border: 1px solid var(--border); border-radius: 100px;
  font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 600;
  color: var(--text); cursor: pointer; transition: all 0.2s ease;
}
.btn-retry:hover { box-shadow: var(--shadow-hover); }

/* Empty */
.empty-state {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 80px 20px; text-align: center;
}
.empty-icon { color: var(--text3); margin-bottom: 16px; opacity: 0.5; }
.empty-title { font-size: 16px; font-weight: 600; color: var(--text); margin: 0 0 8px; }
.empty-desc { font-size: 14px; color: var(--text3); margin: 0; }

/* IPO Cards */
.ipo-list { display: flex; flex-direction: column; gap: 16px; }

.bento-card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius); padding: 24px;
  box-shadow: var(--shadow); transition: all 0.25s ease;
}
.bento-card:hover { box-shadow: var(--shadow-hover); }

.ipo-card {
  display: flex; gap: 20px;
}
.ipo-card:hover { transform: translateY(-2px); }

.ipo-left { flex-shrink: 0; }
.ipo-logo {
  width: 56px; height: 56px; border-radius: 14px; object-fit: contain;
  background: var(--bg); border: 1px solid var(--border);
}
.ipo-logo-placeholder {
  width: 56px; height: 56px; border-radius: 14px;
  background: var(--blue); color: white;
  display: flex; align-items: center; justify-content: center;
  font-family: 'DM Sans', sans-serif; font-size: 24px; font-weight: 800;
}

.ipo-body { flex: 1; min-width: 0; }
.ipo-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px; gap: 12px; flex-wrap: wrap; }
.ipo-meta { display: flex; align-items: center; gap: 8px; }

.ipo-code {
  font-family: 'DM Sans', 'Inter', sans-serif;
  font-size: 18px; font-weight: 800; color: var(--text); letter-spacing: -0.3px;
}
.ipo-badge {
  padding: 2px 8px; border-radius: 100px; font-size: 10px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.3px;
}
.ipo-badge.sharia { background: rgba(33,191,115,0.08); color: var(--green); }
.ipo-badge.warrant { background: rgba(245,158,11,0.08); color: #D97706; }

.ipo-stage {
  padding: 4px 12px; border-radius: 100px; font-size: 11px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.3px; white-space: nowrap;
}
.ipo-stage.stage-bookbuilding { background: rgba(32,91,252,0.08); color: var(--blue); }
.ipo-stage.stage-offering { background: rgba(245,158,11,0.08); color: #D97706; }
.ipo-stage.stage-listing { background: rgba(33,191,115,0.08); color: var(--green); }

.ipo-name {
  font-family: 'DM Sans', 'Inter', sans-serif;
  font-size: 14px; font-weight: 600; color: var(--text2);
  margin: 0 0 12px;
}

.ipo-details { display: flex; flex-direction: column; gap: 6px; }
.ipo-detail { display: flex; align-items: center; gap: 12px; }
.detail-label { font-size: 11px; font-weight: 600; color: var(--text3); text-transform: uppercase; letter-spacing: 0.3px; min-width: 110px; }
.detail-value { font-size: 13px; color: var(--text); font-weight: 500; }
.detail-value.price-range { font-family: 'DM Sans', 'Inter', sans-serif; font-weight: 700; color: var(--text); }

@media (max-width: 768px) {
  .page-header { flex-direction: column; align-items: flex-start; }
  .sub-tabs { width: 100%; overflow-x: auto; }
  .sub-tabs::-webkit-scrollbar { display: none; }
  .ipo-card { flex-direction: column; }
  .ipo-left { display: flex; justify-content: center; }
  .ipo-top { flex-direction: column; }
}
</style>
