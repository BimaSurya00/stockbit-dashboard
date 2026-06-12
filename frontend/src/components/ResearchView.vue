<template>
  <div class="research-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">Research</h1>
        <p class="page-subtitle">Analisis dan Snips dari Stockbit Research</p>
      </div>
      <div class="header-right">
        <div class="search-box">
          <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            v-model="keyword"
            type="text"
            placeholder="Cari research..."
            class="search-input"
            @keyup.enter="fetchResearch"
          />
        </div>
        <button class="btn-refresh" @click="fetchResearch" :disabled="loading">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>
          {{ loading ? 'Loading...' : 'Refresh' }}
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading && researchList.length === 0" class="loading-state">
      <div class="spinner"></div>
      <span>Memuat research...</span>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="error-msg">{{ error }}</div>

    <!-- Research Cards -->
    <div v-else-if="researchList.length > 0" class="research-grid">
      <div
        v-for="item in researchList"
        :key="item.id"
        class="research-card bento-card"
        @click="openResearch(item)"
      >
        <div class="card-image" v-if="item.compressed_image_url || item.image_url">
          <img
            :src="item.compressed_image_url || item.image_url"
            :alt="item.title"
            loading="lazy"
          />
          <div class="card-badge" v-if="item.category_label">
            {{ item.category_label }}
          </div>
        </div>
        <div class="card-body">
          <div class="card-meta">
            <img
              v-if="item.icon_url"
              :src="item.icon_url"
              alt="source"
              class="card-icon"
            />
            <span class="card-date">{{ formatDate(item.description || item.created) }}</span>
          </div>
          <h3 class="card-title">{{ item.title }}</h3>
          <div class="card-footer">
            <a
              v-if="item.url"
              :href="item.url"
              target="_blank"
              rel="noopener"
              class="btn-read"
              @click.stop
            >
              Baca Selengkapnya
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            </a>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="empty-state">
      <div class="empty-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
      </div>
      <p class="empty-title">Tidak ada research</p>
      <p class="empty-desc">Coba refresh atau gunakan kata kunci pencarian</p>
    </div>

    <!-- Research Detail Modal -->
    <div v-if="selectedResearch" class="modal-overlay" @click.self="closeResearch">
      <div class="modal-content bento-card">
        <div class="modal-header">
          <div class="modal-header-left">
            <img
              v-if="selectedResearch.icon_url"
              :src="selectedResearch.icon_url"
              alt="source"
              class="modal-icon"
            />
            <span class="modal-category">{{ selectedResearch.category_label }}</span>
          </div>
          <button class="modal-close" @click="closeResearch">&times;</button>
        </div>
        <h2 class="modal-title">{{ selectedResearch.title }}</h2>
        <div class="modal-meta">
          <span class="modal-date">{{ formatDate(selectedResearch.description || selectedResearch.created) }}</span>
        </div>
        <div class="modal-image" v-if="selectedResearch.compressed_image_url || selectedResearch.image_url">
          <img
            :src="selectedResearch.compressed_image_url || selectedResearch.image_url"
            :alt="selectedResearch.title"
          />
        </div>
        <div class="modal-footer">
          <a
            v-if="selectedResearch.url"
            :href="selectedResearch.url"
            target="_blank"
            rel="noopener"
            class="btn-source"
          >
            Baca di Snips
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const API_BASE = ''

const researchList = ref([])
const loading = ref(false)
const error = ref(null)
const selectedResearch = ref(null)
const keyword = ref('')

function formatDate(dateStr) {
  if (!dateStr) return ''
  // Try parsing "11 June 2026" format
  const d = new Date(dateStr)
  if (!isNaN(d.getTime())) {
    // Check if input was already a date string
    if (/^\d{1,2}\s+\w+\s+\d{4}$/.test(dateStr)) {
      return dateStr
    }
    // ISO date
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  }
  return dateStr
}

async function fetchResearch() {
  loading.value = true
  error.value = null

  try {
    const params = {}
    if (keyword.value.trim()) params.keyword = keyword.value.trim()
    const res = await axios.get(`${API_BASE}/api/research`, { params })
    researchList.value = res.data?.data || []
  } catch (err) {
    error.value = err.response?.data?.error || 'Gagal memuat research'
  } finally {
    loading.value = false
  }
}

function openResearch(item) {
  selectedResearch.value = item
}

function closeResearch() {
  selectedResearch.value = null
}

onMounted(() => {
  fetchResearch()
})
</script>

<style scoped>
.research-page {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  color: #0F172A;
  --blue: #205BFC; --green: #21BF73; --red: #EF3A3A;
  --bg: #F8FAFC; --surface: #FFFFFF; --text: #0F172A; --text2: #475569; --text3: #94A3B8;
  --border: rgba(0,0,0,0.05); --radius: 20px; --radius-sm: 14px;
  --shadow: 0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.04);
  --shadow-hover: 0 4px 20px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.04);
}

.page-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 20px; gap: 16px; flex-wrap: wrap; }
.page-title { font-family: 'DM Sans', 'Inter', sans-serif; font-size: 28px; font-weight: 800; margin: 0; letter-spacing: -1px; color: var(--text); }
.page-subtitle { font-size: 14px; color: var(--text2); margin: 2px 0 0; font-weight: 400; }
.header-right { display: flex; align-items: center; gap: 12px; }

.search-box {
  display: flex; align-items: center; gap: 8px;
  height: 38px; padding: 0 14px;
  background: var(--surface); border: 1px solid var(--border); border-radius: 100px;
  transition: all 0.2s ease;
}
.search-box:focus-within { border-color: rgba(32,91,252,0.3); box-shadow: 0 0 0 3px rgba(32,91,252,0.08); }
.search-icon { color: var(--text3); flex-shrink: 0; }
.search-input {
  border: none; outline: none; background: transparent;
  font-family: 'Inter', sans-serif; font-size: 13px; color: var(--text);
  width: 180px;
}
.search-input::placeholder { color: var(--text3); }

.btn-refresh {
  display: inline-flex; align-items: center; gap: 8px;
  height: 38px; padding: 0 16px;
  background: var(--surface); border: 1px solid var(--border); border-radius: 100px;
  font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 600;
  color: var(--text); cursor: pointer; transition: all 0.2s ease;
}
.btn-refresh:hover:not(:disabled) { box-shadow: var(--shadow-hover); border-color: rgba(0,0,0,0.1); }
.btn-refresh:disabled { opacity: 0.5; cursor: not-allowed; }

/* Loading & Error */
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

/* Research Grid */
.research-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.bento-card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius); box-shadow: var(--shadow);
  transition: all 0.25s ease; overflow: hidden;
}
.bento-card:hover { box-shadow: var(--shadow-hover); }

.research-card { cursor: pointer; display: flex; flex-direction: column; }
.research-card:hover { transform: translateY(-2px); }

.card-image {
  position: relative; width: 100%; height: 180px; overflow: hidden;
  background: var(--bg);
}
.card-image img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s ease; }
.research-card:hover .card-image img { transform: scale(1.03); }

.card-badge {
  position: absolute; top: 12px; left: 12px;
  padding: 4px 10px;
  background: rgba(32,91,252,0.9); color: white;
  border-radius: 100px;
  font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;
}

.card-body { padding: 16px 20px 20px; flex: 1; display: flex; flex-direction: column; }

.card-meta { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.card-icon { width: 18px; height: 18px; border-radius: 4px; object-fit: cover; }
.card-date { font-size: 12px; color: var(--text3); }

.card-title {
  font-family: 'DM Sans', 'Inter', sans-serif;
  font-size: 15px; font-weight: 700; color: var(--text);
  margin: 0 0 16px; line-height: 1.4;
  display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;
  flex: 1;
}

.card-footer { margin-top: auto; }

.btn-read {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 14px; background: var(--bg); border: 1px solid var(--border);
  border-radius: 100px; font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 600;
  color: var(--blue); text-decoration: none; transition: all 0.2s ease;
}
.btn-read:hover { background: rgba(32,91,252,0.08); border-color: rgba(32,91,252,0.2); }

/* Modal */
.modal-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;
  z-index: 1000; padding: 20px;
}
.modal-content {
  max-width: 650px; width: 100%; max-height: 85vh; overflow-y: auto;
  padding: 32px;
}
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.modal-header-left { display: flex; align-items: center; gap: 10px; }
.modal-icon { width: 24px; height: 24px; border-radius: 6px; object-fit: cover; }
.modal-category {
  padding: 3px 10px; background: rgba(32,91,252,0.07); color: var(--blue);
  border-radius: 100px; font-size: 11px; font-weight: 700; text-transform: uppercase;
}
.modal-close {
  width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
  background: var(--bg); border: none; border-radius: 8px; font-size: 20px;
  color: var(--text3); cursor: pointer; transition: all 0.2s ease;
}
.modal-close:hover { background: var(--border); color: var(--text); }

.modal-title {
  font-family: 'DM Sans', 'Inter', sans-serif;
  font-size: 22px; font-weight: 800; color: var(--text); margin: 0 0 12px; line-height: 1.3;
}
.modal-meta { margin-bottom: 20px; }
.modal-date { font-size: 13px; color: var(--text3); }

.modal-image { margin-bottom: 24px; border-radius: 12px; overflow: hidden; }
.modal-image img { width: 100%; max-height: 350px; object-fit: cover; }

.modal-footer { display: flex; justify-content: flex-end; padding-top: 16px; border-top: 1px solid var(--border); }
.btn-source {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 10px 20px; background: var(--blue); color: white; border: none;
  border-radius: 100px; font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 600;
  text-decoration: none; cursor: pointer; transition: all 0.2s ease;
}
.btn-source:hover { background: #1a4fd4; }

@media (max-width: 768px) {
  .page-header { flex-direction: column; align-items: flex-start; }
  .header-right { width: 100%; flex-wrap: wrap; }
  .search-box { flex: 1; min-width: 0; }
  .search-input { width: 100%; }
  .research-grid { grid-template-columns: 1fr; }
  .modal-content { padding: 20px; }
}
</style>
