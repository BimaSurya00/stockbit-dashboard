<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { useRouter } from 'vue-router'
import { state, clearSession, isAuthenticated, isAdmin } from '../stores/auth.js'
import StockChart from './StockChart.vue'
import TrendingView from './TrendingView.vue'
import EmitenList from './EmitenList.vue'
import BrokerTop from './BrokerTop.vue'
import StockDetail from './StockDetail.vue'
import StockbitDashboard from './StockbitDashboard.vue'

const router = useRouter()

onMounted(() => {
  if (!isAuthenticated()) {
    router.push('/login')
  }
})

function logout() {
  clearSession()
  router.push('/login')
}

const API_BASE = ''

const symbol = ref('GOTO')
const timeframe = ref('1w')
const loading = ref(false)
const error = ref('')
const result = ref(null)
const activeTab = ref(router.currentRoute.value.query.tab || 'dashboard')

onMounted(async () => {
  if (!isAuthenticated()) {
    return router.push('/login')
  }
  const tab = router.currentRoute.value.query.tab
  if (tab) {
    activeTab.value = tab
    if (tab === 'trending') fetchTrending()
    else if (tab === 'profile') fetchProfile()
    else if (tab === 'token') checkToken()
  }
})

async function fetchChart() {
  loading.value = true
  error.value = ''
  result.value = null
  showRaw.value = false
  try {
    const res = await axios.get(`${API_BASE}/api/chart/${symbol.value}`, {
      params: { timeframe: timeframe.value, _t: Date.now() },
      headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
    })
    result.value = res.data
  } catch (err) {
    error.value = err.response?.data?.error || err.message
  } finally {
    loading.value = false
  }
}

async function fetchTrending() {
  loading.value = true
  error.value = ''
  result.value = null
  showRaw.value = false
  try {
    const res = await axios.get(`${API_BASE}/api/emiten/trending`, {
      params: { _t: Date.now() },
      headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
    })
    result.value = res.data
  } catch (err) {
    error.value = err.response?.data?.error || err.message
  } finally {
    loading.value = false
  }
}

async function fetchProfile() {
  loading.value = true
  error.value = ''
  result.value = null
  showRaw.value = false
  try {
    const res = await axios.get(`${API_BASE}/api/profile/itgawebecik`)
    result.value = res.data
  } catch (err) {
    error.value = err.response?.data?.error || err.message
  } finally {
    loading.value = false
  }
}

async function checkToken() {
  loading.value = true
  error.value = ''
  result.value = null
  showRaw.value = false
  try {
    const res = await axios.get(`${API_BASE}/api/token-status`)
    result.value = res.data
  } catch (err) {
    error.value = err.response?.data?.error || err.message
  } finally {
    loading.value = false
  }
}

async function updateToken() {
  tokenUpdating.value = true
  tokenMessage.value = ''
  try {
    const res = await axios.put(`${API_BASE}/api/admin/token`, { token: tokenInput.value.trim() })
    tokenMessage.value = `Token updated! Expires: ${new Date(res.data.tokenInfo.expiryDate).toLocaleString()}`
    tokenInput.value = ''
    checkToken()
  } catch (err) {
    tokenMessage.value = 'Error: ' + (err.response?.data?.error || err.message)
  } finally {
    tokenUpdating.value = false
  }
}

async function registerUser() {
  regLoading.value = true
  regMessage.value = ''
  try {
    await axios.post(`${API_BASE}/api/auth/register`, regForm.value)
    regMessage.value = `User "${regForm.value.username}" created successfully`
    regForm.value = { username: '', password: '', role: 'user' }
  } catch (err) {
    regMessage.value = 'Error: ' + (err.response?.data?.error || err.message)
  } finally {
    regLoading.value = false
  }
}

function goToDetail(sym) {
  selectedSymbol.value = sym
  activeTab.value = 'detail'
  router.push({ query: { tab: 'detail' } })
}

function goBack() {
  selectedSymbol.value = ''
  activeTab.value = 'dashboard'
  router.push({ query: { tab: 'dashboard' } })
}

function navigateTo(tab) {
  activeTab.value = tab
  sidebarOpen.value = false
  router.push({ query: { tab } })
  if (tab === 'trending') {
    fetchTrending()
  } else if (tab === 'profile') {
    fetchProfile()
  } else if (tab === 'token') {
    checkToken()
  }
}

function toggleSidebar() {
  sidebarOpen.value = !sidebarOpen.value
}
</script>

<template>
  <div class="app-root">
    <!-- SIDEBAR -->
    <aside class="sidebar" :class="{ open: sidebarOpen }">
      <div class="sidebar-header">
        <div class="brand">
          <div class="brand-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
          </div>
          <div class="brand-text">
            <span class="brand-name">Stockbit</span>
            <span class="brand-version">Dashboard</span>
          </div>
        </div>
      </div>

      <nav class="sidebar-nav">
        <div v-for="(section, idx) in menuSections" :key="idx" class="nav-section">
          <span class="nav-label">{{ section.label }}</span>
          <div class="nav-items">
            <button
              v-for="item in section.items"
              :key="item.key"
              class="nav-item"
              :class="{ active: activeTab === item.key }"
              @click="navigateTo(item.key)"
            >
              <div class="nav-indicator" v-if="activeTab === item.key"></div>
              <svg class="nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="icons[item.icon]"></svg>
              <span class="nav-text">{{ item.label }}</span>
            </button>
          </div>
        </div>
      </nav>

      <div class="sidebar-footer">
        <div class="user-card">
          <div class="user-avatar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <div class="user-info">
            <span class="user-name">{{ state.user?.username || 'Admin' }}</span>
            <span class="user-role">{{ state.user?.role || 'User' }}</span>
          </div>
          <button class="user-action" title="Logout" @click="logout">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </div>
    </aside>

    <!-- Overlay for mobile -->
    <div class="sidebar-overlay" :class="{ show: sidebarOpen }" @click="toggleSidebar"></div>

    <!-- MAIN CONTENT -->
    <main class="main">
      <!-- TOPBAR -->
      <header class="topbar">
        <div class="topbar-left">
          <button class="menu-toggle" @click="toggleSidebar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <div class="breadcrumb">
            <span class="bc-main">{{ tabLabels[activeTab] }}</span>
          </div>
        </div>
        <div class="topbar-right">
          <div class="search-box">
            <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" v-html="icons.search"></svg>
            <input type="text" placeholder="Search stocks, brokers..." />
          </div>
          <button class="icon-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" v-html="icons.bell"></svg>
            <span class="notification-dot"></span>
          </button>
          <div class="profile-btn">
            <div class="profile-avatar">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
          </div>
        </div>
      </header>

      <!-- CONTENT AREA -->
      <div class="content">
        <!-- Dashboard -->
        <div v-if="activeTab === 'dashboard'">
          <StockbitDashboard @select-emiten="goToDetail" />
        </div>

        <!-- Trending -->
        <div v-if="activeTab === 'trending'">
          <TrendingView @select-emiten="goToDetail" />
        </div>

        <!-- Detail Saham -->
        <div v-if="activeTab === 'detail'">
          <StockDetail :symbol="selectedSymbol || 'GOTO'" @back="goBack" />
        </div>

        <!-- Daftar Emiten -->
        <div v-if="activeTab === 'emiten'">
          <EmitenList @select-emiten="goToDetail" />
        </div>

        <!-- Top Broker -->
        <div v-if="activeTab === 'broker'">
          <BrokerTop />
        </div>

        <!-- Profile Test -->
        <div v-if="activeTab === 'profile'">
          <div class="page-card">
            <div class="page-card-header">
              <div>
                <h2 class="page-title">Test Autentikasi</h2>
                <p class="page-subtitle">Cek apakah token Stockbit masih valid</p>
              </div>
              <button @click="fetchProfile" :disabled="loading" class="btn-primary">
                {{ loading ? 'Loading...' : 'Test Profile API' }}
              </button>
            </div>
          </div>
          <div v-if="result" class="page-card">
            <div class="raw-data">
              <pre>{{ JSON.stringify(result, null, 2) }}</pre>
            </div>
          </div>
        </div>

        <!-- Token Status -->
        <div v-if="activeTab === 'token' && isAdmin()">
          <div class="page-card">
            <div class="page-card-header">
              <div>
                <h2 class="page-title">Update Bearer Token</h2>
                <p class="page-subtitle">Masukkan token JWT baru dari Stockbit (dapat dari browser Network tab setelah login)</p>
              </div>
            </div>
            <div class="token-form">
              <input
                v-model="tokenInput"
                type="text"
                placeholder="Paste Bearer token here..."
                class="token-input"
                :disabled="tokenUpdating"
              />
              <button @click="updateToken" :disabled="tokenUpdating || !tokenInput.trim()" class="btn-primary">
                {{ tokenUpdating ? 'Updating...' : 'Update Token' }}
              </button>
            </div>
            <div v-if="tokenMessage" class="token-msg" :class="{ success: tokenMessage.startsWith('Token updated'), error: tokenMessage.startsWith('Error') }">
              {{ tokenMessage }}
            </div>
          </div>

          <div class="page-card">
            <div class="page-card-header">
              <div>
                <h2 class="page-title">Status Token</h2>
                <p class="page-subtitle">Cek expire date dan validitas token JWT</p>
              </div>
              <button @click="checkToken" :disabled="loading" class="btn-primary">
                {{ loading ? 'Loading...' : 'Cek Token' }}
              </button>
            </div>
            <div v-if="result" class="token-status-card">
              <div class="token-status-row">
                <span class="ts-label">Status</span>
                <span class="ts-badge" :class="result.valid ? 'valid' : 'expired'">{{ result.valid ? 'VALID' : 'EXPIRED' }}</span>
              </div>
              <div class="token-status-row" v-if="result.username">
                <span class="ts-label">Username</span>
                <span class="ts-value">{{ result.username }}</span>
              </div>
              <div class="token-status-row" v-if="result.expiryDate">
                <span class="ts-label">Expiry</span>
                <span class="ts-value">{{ new Date(result.expiryDate).toLocaleString() }}</span>
              </div>
              <div class="token-status-row" v-if="result.message">
                <span class="ts-label">Info</span>
                <span class="ts-value">{{ result.message }}</span>
              </div>
            </div>
          </div>

          <div class="page-card">
            <div class="page-card-header">
              <div>
                <h2 class="page-title">Register User</h2>
                <p class="page-subtitle">Buat user baru untuk akses dashboard</p>
              </div>
            </div>
            <div class="reg-form">
              <div class="field-row">
                <div class="field-col">
                  <label>Username</label>
                  <input v-model="regForm.username" type="text" placeholder="username" class="reg-input" />
                </div>
                <div class="field-col">
                  <label>Password</label>
                  <input v-model="regForm.password" type="password" placeholder="password" class="reg-input" />
                </div>
                <div class="field-col field-col-sm">
                  <label>Role</label>
                  <select v-model="regForm.role" class="reg-input">
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              <button @click="registerUser" :disabled="regLoading" class="btn-primary">
                {{ regLoading ? 'Creating...' : 'Create User' }}
              </button>
            </div>
            <div v-if="regMessage" class="token-msg" :class="{ success: regMessage.includes('successfully'), error: regMessage.startsWith('Error') }">
              {{ regMessage }}
            </div>
          </div>
        </div>

        <div v-if="activeTab === 'token' && !isAdmin()" class="page-card">
          <div class="page-card-header">
            <div>
              <h2 class="page-title">Akses Terbatas</h2>
              <p class="page-subtitle">Hanya admin yang dapat mengelola token Stockbit</p>
            </div>
          </div>
        </div>

        <!-- Error -->
        <div v-if="error && activeTab !== 'detail' && activeTab !== 'emiten' && activeTab !== 'broker'" class="page-card error-card">
          <h3 class="error-title">Error</h3>
          <p>{{ error }}</p>
        </div>
      </div>
    </main>
  </div>
</template>

<style>
/* ─── DESIGN TOKENS ─── */
.app-root {
  --sidebar-width: 270px;
  --topbar-height: 72px;
  --primary: #205BFC;
  --success: #21BF73;
  --danger: #EF3A3A;
  --bg: #F5F5F5;
  --surface: #FFFFFF;
  --text: #1E1E1E;
  --text-soft: #6B7280;
  --text-muted: #9CA3AF;
  --border: rgba(0, 0, 0, 0.06);
  --accent-soft: #B5E1ED;
  --radius-sm: 10px;
  --radius-md: 14px;
  --radius-lg: 18px;
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.04);
  --shadow-md: 0 4px 20px rgba(0,0,0,0.06);
  --shadow-lg: 0 8px 30px rgba(0,0,0,0.08);
  --transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  display: flex;
  min-height: 100vh;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  background: var(--bg);
  color: var(--text);
}

/* ─── SIDEBAR ─── */
.sidebar {
  width: var(--sidebar-width);
  background: var(--surface);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 100;
  transition: transform 0.3s ease;
}

.sidebar-header {
  padding: 28px 24px 20px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 14px;
}

.brand-icon {
  width: 40px;
  height: 40px;
  background: var(--primary);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(32, 91, 252, 0.25);
}

.brand-text {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.brand-name {
  font-size: 18px;
  font-weight: 700;
  color: var(--text);
  letter-spacing: -0.3px;
  line-height: 1.2;
}

.brand-version {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-muted);
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.sidebar-nav {
  flex: 1;
  padding: 0 16px;
  overflow-y: auto;
}

.nav-section {
  margin-bottom: 28px;
}

.nav-label {
  display: block;
  font-size: 10px;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 1.2px;
  padding: 0 12px;
  margin-bottom: 10px;
}

.nav-items {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nav-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
  height: 46px;
  padding: 0 14px;
  border: none;
  background: transparent;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-family: inherit;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-soft);
  transition: var(--transition);
  text-align: left;
  width: 100%;
}

.nav-item:hover {
  background: rgba(32, 91, 252, 0.04);
  color: var(--text);
}

.nav-item.active {
  background: rgba(32, 91, 252, 0.08);
  color: var(--primary);
  font-weight: 600;
}

.nav-indicator {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 20px;
  background: var(--primary);
  border-radius: 0 3px 3px 0;
}

.nav-icon {
  flex-shrink: 0;
  opacity: 0.7;
  transition: var(--transition);
}

.nav-item:hover .nav-icon,
.nav-item.active .nav-icon {
  opacity: 1;
}

.sidebar-footer {
  padding: 16px;
  border-top: 1px solid var(--border);
}

.user-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--bg);
  border-radius: var(--radius-md);
}

.user-avatar {
  width: 36px;
  height: 36px;
  background: var(--surface);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-soft);
  border: 1px solid var(--border);
}

.user-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.user-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}

.user-role {
  font-size: 11px;
  color: var(--text-muted);
  font-weight: 500;
}

.user-action {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: var(--transition);
}

.user-action:hover {
  background: rgba(0,0,0,0.04);
  color: var(--text);
}

.sidebar-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.3);
  z-index: 90;
  opacity: 0;
  visibility: hidden;
  transition: var(--transition);
}

.sidebar-overlay.show {
  opacity: 1;
  visibility: visible;
}

/* ─── MAIN CONTENT ─── */
.main {
  flex: 1;
  margin-left: var(--sidebar-width);
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

/* ─── TOPBAR ─── */
.topbar {
  height: var(--topbar-height);
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32px;
  position: sticky;
  top: 0;
  z-index: 50;
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 20px;
}

.menu-toggle {
  display: none;
  width: 40px;
  height: 40px;
  border: none;
  background: var(--bg);
  border-radius: var(--radius-sm);
  cursor: pointer;
  color: var(--text-soft);
  align-items: center;
  justify-content: center;
  transition: var(--transition);
}

.menu-toggle:hover {
  background: rgba(0,0,0,0.06);
  color: var(--text);
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
}

.bc-main {
  font-weight: 600;
  color: var(--text);
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.search-box {
  position: relative;
  width: 280px;
}

.search-box input {
  width: 100%;
  height: 42px;
  padding: 0 16px 0 42px;
  border: 1px solid var(--border);
  border-radius: 100px;
  background: var(--bg);
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  color: var(--text);
  transition: var(--transition);
  outline: none;
}

.search-box input::placeholder {
  color: var(--text-muted);
}

.search-box input:focus {
  border-color: var(--primary);
  background: var(--surface);
  box-shadow: 0 0 0 3px rgba(32, 91, 252, 0.1);
}

.search-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
  pointer-events: none;
}

.icon-btn {
  position: relative;
  width: 42px;
  height: 42px;
  border: 1px solid var(--border);
  background: var(--surface);
  border-radius: var(--radius-sm);
  cursor: pointer;
  color: var(--text-soft);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: var(--transition);
}

.icon-btn:hover {
  border-color: rgba(0,0,0,0.1);
  color: var(--text);
  box-shadow: var(--shadow-sm);
}

.notification-dot {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 8px;
  height: 8px;
  background: var(--danger);
  border-radius: 50%;
  border: 2px solid var(--surface);
}

.profile-btn {
  width: 42px;
  height: 42px;
  border-radius: var(--radius-sm);
  background: var(--bg);
  border: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--text-soft);
  transition: var(--transition);
}

.profile-btn:hover {
  border-color: rgba(0,0,0,0.1);
  color: var(--text);
}

/* ─── CONTENT AREA ─── */
.content {
  flex: 1;
  padding: 28px 32px 40px;
  max-width: 1440px;
}

/* Page Cards */
.page-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 24px;
  margin-bottom: 20px;
  box-shadow: var(--shadow-sm);
}

.page-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  flex-wrap: wrap;
}

.page-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--text);
  margin: 0 0 4px 0;
}

.page-subtitle {
  font-size: 14px;
  color: var(--text-soft);
  margin: 0;
  font-weight: 400;
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 42px;
  padding: 0 20px;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: var(--radius-sm);
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: var(--transition);
  white-space: nowrap;
}

.btn-primary:hover:not(:disabled) {
  background: #1a4fd4;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(32, 91, 252, 0.3);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* View Toggle */
.view-toggle {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.view-toggle button {
  padding: 8px 20px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  cursor: pointer;
  font-family: inherit;
  font-weight: 600;
  font-size: 13px;
  color: var(--text-soft);
  transition: var(--transition);
}

.view-toggle button:hover {
  border-color: rgba(0,0,0,0.12);
  color: var(--text);
}

.view-toggle button.active {
  background: var(--text);
  color: white;
  border-color: var(--text);
}

.raw-data pre {
  background: #1E1E1E;
  color: #e2e8f0;
  padding: 20px;
  border-radius: var(--radius-md);
  overflow-x: auto;
  font-size: 13px;
  line-height: 1.5;
  margin: 0;
}

/* Token Form */
.token-form {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.token-input {
  flex: 1;
  height: 44px;
  padding: 0 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 13px;
  color: var(--text);
  background: var(--bg);
  outline: none;
  transition: var(--transition);
}

.token-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(32, 91, 252, 0.1);
  background: var(--surface);
}

.token-input:disabled {
  opacity: 0.5;
}

.token-msg {
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 500;
}

.token-msg.success {
  background: rgba(33, 191, 115, 0.08);
  color: #16804a;
  border: 1px solid rgba(33, 191, 115, 0.2);
}

.token-msg.error {
  background: rgba(239, 58, 58, 0.08);
  color: var(--danger);
  border: 1px solid rgba(239, 58, 58, 0.2);
}

.token-status-card {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.token-status-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid var(--border);
}

.token-status-row:last-child {
  border-bottom: none;
}

.ts-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-soft);
}

.ts-value {
  font-size: 13px;
  color: var(--text);
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-weight: 500;
}

.ts-badge {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.5px;
  padding: 4px 10px;
  border-radius: 100px;
}

.ts-badge.valid {
  background: rgba(33, 191, 115, 0.1);
  color: #16804a;
}

.ts-badge.expired {
  background: rgba(239, 58, 58, 0.1);
  color: var(--danger);
}

/* Register Form */
.reg-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.field-row {
  display: flex;
  gap: 12px;
}

.field-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field-col-sm {
  flex: 0 0 120px;
}

.field-col label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-soft);
}

.reg-input {
  height: 40px;
  padding: 0 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-family: inherit;
  font-size: 13px;
  color: var(--text);
  background: var(--bg);
  outline: none;
  transition: var(--transition);
}

.reg-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(32, 91, 252, 0.1);
  background: var(--surface);
}

/* Error Card */
.error-card {
  background: rgba(239, 58, 58, 0.04);
  border-left: 3px solid var(--danger);
}

.error-title {
  color: var(--danger);
  margin: 0 0 8px 0;
  font-size: 16px;
}

/* Animations */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.page-card {
  animation: fadeIn 0.3s ease-out;
}

/* ─── RESPONSIVE ─── */
@media (max-width: 768px) {
  .sidebar {
    transform: translateX(-100%);
  }
  .sidebar.open {
    transform: translateX(0);
  }
  .main {
    margin-left: 0;
  }
  .menu-toggle {
    display: flex;
  }
  .content {
    padding: 20px 16px 32px;
  }
  .topbar {
    padding: 0 16px;
  }
  .search-box {
    display: none;
  }
  .page-card-header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
