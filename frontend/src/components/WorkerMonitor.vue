<template>
  <div class="worker-monitor">
    <div class="page-header">
      <h1 class="page-title">Worker Monitor</h1>
      <p class="page-subtitle">Real-time status of background data fetchers</p>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Loading worker status...</p>
    </div>

    <div v-else-if="error" class="error-state">
      <p>{{ error }}</p>
      <button @click="fetchStatus" class="btn-retry">Retry</button>
    </div>

    <div v-else class="workers-grid">
      <div
        v-for="worker in workers"
        :key="worker.worker"
        class="worker-card"
        :class="`status-${worker.status}`"
      >
        <div class="worker-header">
          <div class="worker-icon">
            <svg v-if="worker.worker === 'snapshot'" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            <svg v-else width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21.21 15.89A10 10 0 1 1 8 2.83"/>
              <path d="M22 12A10 10 0 0 0 12 2v10z"/>
            </svg>
          </div>
          <div class="worker-info">
            <h3 class="worker-name">{{ worker.worker === 'snapshot' ? 'Snapshot Worker' : 'Price Worker' }}</h3>
            <span class="worker-status" :class="`badge-${worker.status}`">
              {{ worker.status.toUpperCase() }}
            </span>
          </div>
        </div>

        <div class="worker-body">
          <p class="worker-message">{{ worker.message || 'No activity' }}</p>

          <!-- Progress bar for price worker -->
          <div v-if="worker.worker === 'price' && worker.progress && worker.progress.total > 0" class="progress-section">
            <div class="progress-bar-bg">
              <div
                class="progress-bar-fill"
                :style="{ width: `${(worker.progress.current / worker.progress.total) * 100}%` }"
              ></div>
            </div>
            <p class="progress-text">
              {{ worker.progress.current }} / {{ worker.progress.total }}
              ({{ ((worker.progress.current / worker.progress.total) * 100).toFixed(1) }}%)
            </p>
          </div>

          <div v-if="worker.errorMessage" class="error-message">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {{ worker.errorMessage }}
          </div>
        </div>

        <div class="worker-footer">
          <div class="time-info">
            <p v-if="worker.lastRun">
              <strong>Last Run:</strong> {{ formatDate(worker.lastRun) }}
            </p>
            <p v-if="worker.nextRun">
              <strong>Next Run:</strong> {{ formatDate(worker.nextRun) }}
            </p>
          </div>
          <p class="updated-at">Updated: {{ formatDate(worker.updatedAt) }}</p>
        </div>
      </div>
    </div>

    <div class="auto-refresh-indicator">
      <span class="pulse-dot"></span>
      Auto-refresh every 5s
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import axios from 'axios'

const workers = ref([])
const loading = ref(true)
const error = ref(null)
let intervalId = null

async function fetchStatus() {
  try {
    loading.value = true
    error.value = null
    const res = await axios.get('/api/worker-status')
    workers.value = res.data.workers || []
  } catch (err) {
    error.value = err.response?.data?.error || 'Failed to fetch worker status'
  } finally {
    loading.value = false
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

onMounted(() => {
  fetchStatus()
  intervalId = setInterval(fetchStatus, 5000)
})

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId)
})
</script>

<style scoped>
.worker-monitor {
  padding: 24px;
  max-width: 900px;
}

.page-header {
  margin-bottom: 24px;
}

.page-title {
  font-size: 24px;
  font-weight: 700;
  color: #111827;
  margin: 0 0 4px 0;
}

.page-subtitle {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
}

.workers-grid {
  display: grid;
  gap: 20px;
  grid-template-columns: 1fr;
}

.worker-card {
  background: white;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  padding: 20px;
  transition: all 0.2s;
}

.worker-card.status-running {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.worker-card.status-error {
  border-color: #ef4444;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
}

.worker-card.status-idle {
  border-color: #10b981;
}

.worker-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.worker-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #374151;
}

.worker-info {
  flex: 1;
}

.worker-name {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 4px 0;
}

.worker-status {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.badge-idle {
  background: #d1fae5;
  color: #065f46;
}

.badge-running {
  background: #dbeafe;
  color: #1e40af;
}

.badge-error {
  background: #fee2e2;
  color: #991b1b;
}

.worker-body {
  margin-bottom: 16px;
}

.worker-message {
  font-size: 14px;
  color: #4b5563;
  margin: 0 0 12px 0;
}

.progress-section {
  margin-top: 12px;
}

.progress-bar-bg {
  width: 100%;
  height: 8px;
  background: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: #3b82f6;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 12px;
  color: #6b7280;
  margin: 6px 0 0 0;
}

.error-message {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px;
  background: #fef2f2;
  border-radius: 6px;
  color: #dc2626;
  font-size: 13px;
  margin-top: 10px;
}

.worker-footer {
  border-top: 1px solid #f3f4f6;
  padding-top: 12px;
}

.time-info {
  display: flex;
  gap: 16px;
  margin-bottom: 8px;
}

.time-info p {
  font-size: 12px;
  color: #6b7280;
  margin: 0;
}

.time-info strong {
  color: #374151;
}

.updated-at {
  font-size: 11px;
  color: #9ca3af;
  margin: 0;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #6b7280;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 12px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-state {
  text-align: center;
  padding: 40px 20px;
  color: #dc2626;
}

.btn-retry {
  margin-top: 12px;
  padding: 8px 16px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

.btn-retry:hover {
  background: #2563eb;
}

.auto-refresh-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 20px;
  padding: 10px 16px;
  background: #f9fafb;
  border-radius: 8px;
  font-size: 13px;
  color: #6b7280;
  width: fit-content;
}

.pulse-dot {
  width: 8px;
  height: 8px;
  background: #10b981;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
</style>
