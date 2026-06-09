import { reactive } from 'vue'
import axios from 'axios'

const state = reactive({
  user: null,
  token: localStorage.getItem('session_token') || null,
  ready: false
})

let refreshInterval = null

function setSession(token, user) {
  state.token = token
  state.user = user
  state.ready = true
  localStorage.setItem('session_token', token)
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
  startTokenRefresh()
}

function clearSession() {
  state.token = null
  state.user = null
  state.ready = true
  localStorage.removeItem('session_token')
  delete axios.defaults.headers.common['Authorization']
  stopTokenRefresh()
}

function startTokenRefresh() {
  stopTokenRefresh()
  // Refresh token setiap 6 hari (sebelum expire 30 hari)
  refreshInterval = setInterval(async () => {
    try {
      const res = await axios.post('/api/auth/refresh')
      if (res.data.success) {
        state.token = res.data.token
        localStorage.setItem('session_token', res.data.token)
        axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`
        console.log('[Auth] Token refreshed automatically')
      }
    } catch (err) {
      console.warn('[Auth] Auto-refresh failed:', err.message)
    }
  }, 6 * 24 * 60 * 60 * 1000) // 6 hari
}

function stopTokenRefresh() {
  if (refreshInterval) {
    clearInterval(refreshInterval)
    refreshInterval = null
  }
}

function initAuth() {
  const saved = localStorage.getItem('session_token')
  if (saved) {
    state.token = saved
    axios.defaults.headers.common['Authorization'] = `Bearer ${saved}`
    return axios.get('/api/auth/me')
      .then(res => {
        state.user = res.data.user
        state.ready = true
        startTokenRefresh()
        return true
      })
      .catch(() => {
        clearSession()
        return false
      })
  } else {
    state.ready = true
    return Promise.resolve(false)
  }
}

function isAuthenticated() {
  return state.ready && !!state.user
}

function isAdmin() {
  return state.user?.role === 'admin'
}

export { state, setSession, clearSession, initAuth, isAuthenticated, isAdmin }
