import { reactive } from 'vue'
import axios from 'axios'

const state = reactive({
  user: null,
  token: localStorage.getItem('session_token') || null,
  ready: false
})

function setSession(token, user) {
  state.token = token
  state.user = user
  state.ready = true
  localStorage.setItem('session_token', token)
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
}

function clearSession() {
  state.token = null
  state.user = null
  state.ready = true
  localStorage.removeItem('session_token')
  delete axios.defaults.headers.common['Authorization']
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
