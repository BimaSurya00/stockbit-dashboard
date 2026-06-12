<template>
  <div class="monitor-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">System Monitor</h1>
        <p class="page-subtitle">Token, worker, dan status backfill</p>
      </div>
    </div>

    <div class="sub-tabs">
      <button class="sub-tab" :class="{ active: currentTab === 'token' }" @click="currentTab = 'token'">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
        Token Status
      </button>
      <button class="sub-tab" :class="{ active: currentTab === 'workers' }" @click="currentTab = 'workers'">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        Worker Monitor
      </button>
      <button class="sub-tab" :class="{ active: currentTab === 'backfill' }" @click="currentTab = 'backfill'">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
        Backfill Status
      </button>
    </div>

    <!-- Token Status (inline) -->
    <div v-if="currentTab === 'token'">
      <div class="page-card">
        <div class="page-card-header">
          <div>
            <h2 class="section-title">Update Bearer Token</h2>
            <p class="section-desc">Token JWT dari Stockbit (Network tab browser setelah login)</p>
          </div>
        </div>
        <div class="token-form">
          <input v-model="tokenInput" type="text" placeholder="Paste Bearer token..." class="token-input" :disabled="tokenUpdating" />
          <button @click="updateToken" :disabled="tokenUpdating || !tokenInput.trim()" class="btn-primary">
            {{ tokenUpdating ? 'Updating...' : 'Update Token' }}
          </button>
        </div>
        <div v-if="tokenMessage" class="token-msg" :class="{ success: tokenMessage.startsWith('Token updated'), error: tokenMessage.includes('Error') }">{{ tokenMessage }}</div>
      </div>

      <div class="page-card">
        <div class="page-card-header">
          <div>
            <h2 class="section-title">Status Token</h2>
            <p class="section-desc">Cek expire date dan validitas token</p>
          </div>
          <button @click="checkToken" :disabled="loading" class="btn-secondary">{{ loading ? 'Loading...' : 'Cek Token' }}</button>
        </div>
        <div v-if="tokenResult" class="token-status-card">
          <div class="ts-row"><span class="ts-label">Status</span><span class="ts-badge" :class="tokenResult.valid ? 'valid' : 'expired'">{{ tokenResult.valid ? 'VALID' : 'EXPIRED' }}</span></div>
          <div class="ts-row" v-if="tokenResult.username"><span class="ts-label">User</span><span class="ts-value">{{ tokenResult.username }}</span></div>
          <div class="ts-row" v-if="tokenResult.expiryDate"><span class="ts-label">Expiry</span><span class="ts-value">{{ new Date(tokenResult.expiryDate).toLocaleString() }}</span></div>
          <div class="ts-row" v-if="tokenResult.message"><span class="ts-label">Info</span><span class="ts-value">{{ tokenResult.message }}</span></div>
        </div>
      </div>
    </div>

    <div v-if="currentTab === 'workers'">
      <WorkerMonitor />
    </div>
    <div v-if="currentTab === 'backfill'">
      <BackfillStatus />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import axios from 'axios'
import WorkerMonitor from './WorkerMonitor.vue'
import BackfillStatus from './BackfillStatus.vue'

const currentTab = ref('token')
const API_BASE = ''

const tokenInput = ref('')
const tokenUpdating = ref(false)
const tokenMessage = ref('')
const tokenResult = ref(null)
const loading = ref(false)

async function checkToken() {
  loading.value = true
  try {
    const res = await axios.get(`${API_BASE}/api/token-status`)
    tokenResult.value = res.data
  } catch (err) {
    tokenMessage.value = 'Error: ' + (err.response?.data?.error || err.message)
  } finally { loading.value = false }
}

async function updateToken() {
  tokenUpdating.value = true; tokenMessage.value = ''
  try {
    const res = await axios.put(`${API_BASE}/api/admin/token`, { token: tokenInput.value.trim() })
    tokenMessage.value = `Token updated! Expires: ${new Date(res.data.tokenInfo.expiryDate).toLocaleString()}`
    tokenInput.value = ''
    checkToken()
  } catch (err) {
    tokenMessage.value = 'Error: ' + (err.response?.data?.error || err.message)
  } finally { tokenUpdating.value = false }
}
</script>

<style scoped>
.monitor-page {
  font-family: 'Inter', sans-serif; color: #0F172A;
  --blue: #205BFC; --green: #21BF73; --red: #EF3A3A;
  --bg: #F8FAFC; --surface: #FFFFFF; --text: #0F172A; --text2: #475569; --text3: #94A3B8;
  --border: rgba(0,0,0,0.05); --radius: 20px;
}
.page-header { margin-bottom: 16px; }
.page-title { font-family: 'DM Sans', sans-serif; font-size: 28px; font-weight: 800; margin: 0; letter-spacing: -1px; color: var(--text); }
.page-subtitle { font-size: 14px; color: var(--text2); margin: 2px 0 0; }

.sub-tabs { display: flex; gap: 4px; background: var(--bg); border-radius: 12px; padding: 4px; margin-bottom: 20px; }
.sub-tab {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 8px 16px; background: transparent; border: none; border-radius: 10px;
  font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 600;
  color: var(--text2); cursor: pointer; transition: all 0.2s;
}
.sub-tab:hover { color: var(--text); }
.sub-tab.active { background: var(--surface); color: var(--text); box-shadow: 0 1px 3px rgba(0,0,0,0.06); }

.page-card {
  background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius);
  padding: 24px; margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}
.page-card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
.section-title { font-family: 'DM Sans', sans-serif; font-size: 18px; font-weight: 700; margin: 0; color: var(--text); }
.section-desc { font-size: 13px; color: var(--text3); margin: 2px 0 0; }

.token-form { display: flex; gap: 10px; }
.token-input {
  flex: 1; height: 40px; padding: 0 14px; border: 1px solid var(--border); border-radius: 10px;
  font-family: 'Inter', sans-serif; font-size: 13px; color: var(--text); outline: none;
}
.token-input:focus { border-color: var(--blue); }
.btn-primary {
  height: 40px; padding: 0 18px; background: var(--blue); color: white; border: none;
  border-radius: 10px; font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 700; cursor: pointer;
}
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-secondary {
  height: 36px; padding: 0 14px; background: var(--surface); border: 1px solid var(--border);
  border-radius: 10px; font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 600;
  color: var(--text); cursor: pointer;
}
.token-msg { margin-top: 10px; padding: 8px 12px; border-radius: 8px; font-size: 12px; font-weight: 600; }
.token-msg.success { background: rgba(33,191,115,0.08); color: var(--green); }
.token-msg.error { background: rgba(239,58,58,0.08); color: var(--red); }

.token-status-card { margin-top: 16px; }
.ts-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--border); }
.ts-label { font-size: 12px; font-weight: 600; color: var(--text2); }
.ts-value { font-size: 13px; color: var(--text); font-weight: 500; }
.ts-badge { padding: 3px 10px; border-radius: 100px; font-size: 11px; font-weight: 700; }
.ts-badge.valid { background: rgba(33,191,115,0.1); color: var(--green); }
.ts-badge.expired { background: rgba(239,58,58,0.1); color: var(--red); }
</style>
