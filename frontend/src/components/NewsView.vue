<template>
  <div class="news-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">Berita & Research</h1>
        <p class="page-subtitle">Berita terkini dan analisis dari Stockbit</p>
      </div>
    </div>

    <!-- Sub Tabs -->
    <div class="sub-tabs">
      <button
        class="sub-tab"
        :class="{ active: currentTab === 'berita' }"
        @click="currentTab = 'berita'"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1m2 13a2 2 0 0 1-2-2V7m2 13a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"/></svg>
        Berita
      </button>
      <button
        class="sub-tab"
        :class="{ active: currentTab === 'research' }"
        @click="currentTab = 'research'"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        Research
      </button>
    </div>

    <!-- Berita Tab -->
    <div v-if="currentTab === 'berita'">
      <div class="tab-header">
        <div></div>
        <button class="btn-refresh" @click="fetchNews" :disabled="loading">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>
          {{ loading ? 'Loading...' : 'Refresh' }}
        </button>
      </div>

    <!-- Loading -->
    <div v-if="loading && newsList.length === 0" class="loading-state">
      <div class="spinner"></div>
      <span>Memuat berita...</span>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="error-msg">{{ error }}</div>

    <!-- News List -->
    <div v-else-if="newsList.length > 0" class="news-list">
      <div v-for="news in newsList" :key="news.stream_id" class="news-card bento-card" @click="openNews(news)">
        <div class="news-content">
          <div class="news-meta">
            <span class="news-source">
              <img v-if="news.news_feed?.img" :src="news.news_feed.img" :alt="news.news_feed.label" class="source-img" />
              {{ news.news_feed?.label || news.news_feed?.source || 'Unknown' }}
            </span>
            <span class="news-time">{{ news.created_display }}</span>
            <span
              v-if="news.sentiment?.label"
              class="sentiment-badge"
              :class="'sentiment-' + news.sentiment.label"
            >
              <span class="sentiment-dot"></span>
              {{ news.sentiment.label }}
            </span>
          </div>
          <h3 class="news-title">{{ news.title }}</h3>
          <p class="news-excerpt">{{ getExcerpt(news.content) }}</p>
          <div class="news-footer">
            <div class="news-topics">
              <span v-for="topic in (news.topics || []).slice(0, 3)" :key="topic" class="topic-badge">{{ topic }}</span>
            </div>
            <div class="news-stats">
              <span class="stat">{{ news.total_likes || 0 }} ❤️</span>
              <span class="stat">{{ news.total_replies || 0 }} 💬</span>
            </div>
          </div>
        </div>
        <div v-if="news.images && news.images.length > 0" class="news-image">
          <img :src="news.images[0]" :alt="news.title" loading="lazy" />
        </div>
      </div>

      <!-- Load More -->
      <div v-if="hasMore" class="load-more">
        <button class="btn-load-more" @click="loadMore" :disabled="loadingMore">
          {{ loadingMore ? 'Loading...' : 'Load More' }}
        </button>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="empty-state">
      <div class="empty-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M19 20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1m2 13a2 2 0 0 1-2-2V7m2 13a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"/></svg>
      </div>
      <p class="empty-title">Tidak ada berita</p>
      <p class="empty-desc">Coba refresh atau ubah filter</p>
    </div>

    <!-- News Detail Modal -->
    <div v-if="selectedNews" class="modal-overlay" @click.self="closeNews">
      <div class="modal-content bento-card">
        <div class="modal-header">
          <h2 class="modal-title">{{ selectedNews.title }}</h2>
          <button class="modal-close" @click="closeNews">&times;</button>
        </div>
        <div class="modal-meta">
          <span class="news-source">
            <img v-if="selectedNews.news_feed?.img" :src="selectedNews.news_feed.img" :alt="selectedNews.news_feed.label" class="source-img" />
            {{ selectedNews.news_feed?.label || selectedNews.news_feed?.source }}
          </span>
          <span class="news-time">{{ selectedNews.created_display }}</span>
          <span
            v-if="selectedNews.sentiment?.label"
            class="sentiment-badge"
            :class="'sentiment-' + selectedNews.sentiment.label"
          >
            <span class="sentiment-dot"></span>
            {{ selectedNews.sentiment.label }}
          </span>
        </div>
        <div v-if="selectedNews.sentiment?.explanation" class="sentiment-explanation">
          {{ selectedNews.sentiment.explanation }}
        </div>
        <div v-if="selectedNews.images && selectedNews.images.length > 0" class="modal-image">
          <img :src="selectedNews.images[0]" :alt="selectedNews.title" />
        </div>
        <div class="modal-body">
          <p>{{ selectedNews.content || selectedNews.content_original }}</p>
        </div>
        <div class="modal-footer">
          <div class="news-topics">
            <span v-for="topic in (selectedNews.topics || [])" :key="topic" class="topic-badge">{{ topic }}</span>
          </div>
          <a v-if="selectedNews.title_url" :href="selectedNews.title_url" target="_blank" rel="noopener" class="btn-source">
            Baca Sumber Asli
          </a>
        </div>
      </div>
    </div>
    </div>

    <!-- Research Tab -->
    <div v-if="currentTab === 'research'">
      <ResearchView />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import ResearchView from './ResearchView.vue'

const API_BASE = ''

const currentTab = ref('berita')
const newsList = ref([])
const loading = ref(false)
const loadingMore = ref(false)
const error = ref(null)
const selectedNews = ref(null)
const cursor = ref(0)
const hasMore = ref(true)

function getExcerpt(content) {
  if (!content) return ''
  return content.substring(0, 150).trim() + '...'
}

async function fetchNews() {
  loading.value = true
  error.value = null
  cursor.value = 0
  hasMore.value = true

  try {
    const res = await axios.get(`${API_BASE}/api/news`, { params: { limit: 20 } })
    newsList.value = res.data?.data?.stream || []
    cursor.value = res.data?.data?.pagination?.next_cursor || 0
    hasMore.value = !res.data?.data?.pagination?.is_last_page
  } catch (err) {
    error.value = err.response?.data?.error || 'Gagal memuat berita'
  } finally {
    loading.value = false
  }
}

async function loadMore() {
  if (!cursor.value || loadingMore.value) return

  loadingMore.value = true

  try {
    const res = await axios.get(`${API_BASE}/api/news`, { params: { limit: 20, cursor: cursor.value } })
    const newItems = res.data?.data?.stream || []
    newsList.value.push(...newItems)
    cursor.value = res.data?.data?.pagination?.next_cursor || 0
    hasMore.value = !res.data?.data?.pagination?.is_last_page
  } catch (err) {
    console.error('Error loading more:', err)
  } finally {
    loadingMore.value = false
  }
}

function openNews(news) {
  selectedNews.value = news
}

function closeNews() {
  selectedNews.value = null
}

onMounted(() => {
  fetchNews()
})
</script>

<style scoped>
.news-page {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  color: #0F172A;
  --blue: #205BFC; --green: #21BF73; --red: #EF3A3A;
  --bg: #F8FAFC; --surface: #FFFFFF; --text: #0F172A; --text2: #475569; --text3: #94A3B8;
  --border: rgba(0,0,0,0.05); --radius: 20px; --radius-sm: 14px;
  --shadow: 0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.04);
  --shadow-hover: 0 4px 20px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.04);
}

.page-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 16px; gap: 16px; flex-wrap: wrap; }
.page-title { font-family: 'DM Sans', 'Inter', sans-serif; font-size: 28px; font-weight: 800; margin: 0; letter-spacing: -1px; color: var(--text); }
.page-subtitle { font-size: 14px; color: var(--text2); margin: 2px 0 0; font-weight: 400; }
.header-right { display: flex; align-items: center; gap: 14px; }

/* Sub Tabs */
.sub-tabs {
  display: flex; gap: 4px;
  background: var(--bg); border-radius: 12px; padding: 4px;
  margin-bottom: 20px;
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
  box-shadow: var(--shadow);
}

.tab-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }

.btn-refresh {
  display: inline-flex; align-items: center; gap: 8px;
  height: 38px; padding: 0 16px;
  background: var(--surface); border: 1px solid var(--border); border-radius: 100px;
  font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 600;
  color: var(--text); cursor: pointer; transition: all 0.2s ease;
}
.btn-refresh:hover:not(:disabled) { box-shadow: var(--shadow-hover); border-color: rgba(0,0,0,0.1); }
.btn-refresh:disabled { opacity: 0.5; cursor: not-allowed; }

/* Filters */
.filters-bar { display: none; }

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

/* News List */
.news-list { display: flex; flex-direction: column; gap: 16px; }

.bento-card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius); padding: 24px;
  box-shadow: var(--shadow); transition: all 0.25s ease;
}
.bento-card:hover { box-shadow: var(--shadow-hover); }

.news-card {
  display: flex; gap: 20px; cursor: pointer;
}
.news-card:hover { transform: translateY(-2px); }

.news-content { flex: 1; min-width: 0; }
.news-meta { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
.news-source {
  display: flex; align-items: center; gap: 6px;
  font-size: 12px; font-weight: 600; color: var(--text2);
}
.source-img { width: 16px; height: 16px; border-radius: 4px; object-fit: cover; }
.news-time { font-size: 12px; color: var(--text3); }

/* Sentiment Badge */
.sentiment-badge {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 2px 8px; border-radius: 100px;
  font-size: 10px; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.3px; margin-left: auto;
}
.sentiment-dot {
  width: 5px; height: 5px; border-radius: 50%;
}
.sentiment-positif {
  background: rgba(33,191,115,0.1); color: #16804a;
}
.sentiment-positif .sentiment-dot { background: #21BF73; }
.sentiment-netral {
  background: var(--bg); color: var(--text3);
}
.sentiment-netral .sentiment-dot { background: #94a3b8; }
.sentiment-negatif {
  background: rgba(239,58,58,0.1); color: #dc2626;
}
.sentiment-negatif .sentiment-dot { background: #EF3A3A; }
.sentiment-explanation {
  font-size: 12px; color: var(--text2); font-style: italic;
  padding: 8px 12px; background: var(--bg); border-radius: 8px;
  margin: -8px 0 16px;
}

.news-title {
  font-family: 'DM Sans', 'Inter', sans-serif;
  font-size: 16px; font-weight: 700; color: var(--text);
  margin: 0 0 8px; line-height: 1.4;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}

.news-excerpt {
  font-size: 13px; color: var(--text2); line-height: 1.5; margin: 0 0 12px;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}

.news-footer { display: flex; justify-content: space-between; align-items: center; }
.news-topics { display: flex; gap: 6px; flex-wrap: wrap; }
.topic-badge {
  padding: 2px 8px; background: rgba(32,91,252,0.07); border-radius: 100px;
  font-size: 10px; font-weight: 700; color: var(--blue); text-transform: uppercase;
}
.news-stats { display: flex; gap: 12px; }
.stat { font-size: 12px; color: var(--text3); }

.news-image {
  width: 120px; height: 80px; flex-shrink: 0; border-radius: 8px; overflow: hidden;
}
.news-image img {
  width: 100%; height: 100%; object-fit: cover;
}

/* Load More */
.load-more { display: flex; justify-content: center; padding: 20px; }
.btn-load-more {
  padding: 10px 24px; background: var(--surface); border: 1px solid var(--border);
  border-radius: 100px; font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 600;
  color: var(--text); cursor: pointer; transition: all 0.2s ease;
}
.btn-load-more:hover:not(:disabled) { box-shadow: var(--shadow-hover); border-color: rgba(0,0,0,0.1); }
.btn-load-more:disabled { opacity: 0.5; cursor: not-allowed; }

/* Modal */
.modal-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;
  z-index: 1000; padding: 20px;
}
.modal-content {
  max-width: 700px; width: 100%; max-height: 80vh; overflow-y: auto;
  padding: 32px;
}
.modal-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
.modal-title {
  font-family: 'DM Sans', 'Inter', sans-serif;
  font-size: 20px; font-weight: 800; color: var(--text); margin: 0; line-height: 1.3;
}
.modal-close {
  width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
  background: var(--bg); border: none; border-radius: 8px; font-size: 20px;
  color: var(--text3); cursor: pointer; transition: all 0.2s ease;
}
.modal-close:hover { background: var(--border); color: var(--text); }

.modal-meta { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
.modal-image { margin-bottom: 20px; border-radius: 8px; overflow: hidden; }
.modal-image img { width: 100%; max-height: 300px; object-fit: cover; }
.modal-body { margin-bottom: 20px; }
.modal-body p { font-size: 14px; color: var(--text2); line-height: 1.7; margin: 0; }
.modal-footer { display: flex; justify-content: space-between; align-items: center; padding-top: 16px; border-top: 1px solid var(--border); }
.btn-source {
  padding: 8px 16px; background: var(--blue); color: white; border: none;
  border-radius: 100px; font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 600;
  text-decoration: none; cursor: pointer; transition: all 0.2s ease;
}
.btn-source:hover { background: #1a4fd4; }

@media (max-width: 768px) {
  .page-header { flex-direction: column; align-items: flex-start; }
  .filters-bar { flex-direction: column; align-items: stretch; }
  .pill-group { overflow-x: auto; }
  .news-card { flex-direction: column-reverse; }
  .news-image { width: 100%; height: 160px; }
  .modal-content { padding: 20px; }
}
</style>
