<script setup>
import { ref, reactive } from 'vue'
import axios from 'axios'
import { setSession } from '../stores/auth.js'
import { useRouter } from 'vue-router'

const router = useRouter()

const form = reactive({ username: '', password: '' })
const loading = ref(false)
const error = ref('')
const showPassword = ref(false)

async function login() {
  loading.value = true
  error.value = ''
  try {
    const res = await axios.post('/api/auth/login', form)
    setSession(res.data.token, res.data.user)
    router.push('/dashboard')
  } catch (err) {
    error.value = err.response?.data?.error || 'Login failed'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-root">
    <div class="login-card">
      <div class="login-header">
        <div class="login-brand">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
        </div>
        <h1>Stockbit Dashboard</h1>
        <p>Sign in to access market data</p>
      </div>

      <form @submit.prevent="login" class="login-form">
        <div class="field">
          <label>Username</label>
          <input v-model="form.username" type="text" placeholder="Enter username" autocomplete="username" required />
        </div>
        <div class="field">
          <label>Password</label>
          <div class="password-wrap">
            <input v-model="form.password" :type="showPassword ? 'text' : 'password'" placeholder="Enter password" autocomplete="current-password" required />
            <button type="button" class="eye-btn" @click="showPassword = !showPassword" tabindex="-1">
              <svg v-if="!showPassword" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
              </svg>
              <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            </button>
          </div>
        </div>

        <div v-if="error" class="login-error">{{ error }}</div>

        <button type="submit" :disabled="loading" class="login-btn">
          {{ loading ? 'Signing in...' : 'Sign In' }}
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.login-root {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #F5F5F5;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}

.login-card {
  width: 100%;
  max-width: 400px;
  background: #fff;
  border-radius: 18px;
  padding: 40px;
  box-shadow: 0 8px 30px rgba(0,0,0,0.06);
  border: 1px solid rgba(0,0,0,0.06);
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.login-brand {
  width: 56px;
  height: 56px;
  background: #205BFC;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
  box-shadow: 0 4px 12px rgba(32,91,252,0.25);
}

.login-header h1 {
  font-size: 22px;
  font-weight: 700;
  color: #1E1E1E;
  margin: 0 0 4px;
}

.login-header p {
  font-size: 14px;
  color: #6B7280;
  margin: 0;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field label {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
}

.field input {
  height: 44px;
  padding: 0 14px;
  border: 1px solid rgba(0,0,0,0.1);
  border-radius: 10px;
  font-family: inherit;
  font-size: 14px;
  color: #1E1E1E;
  background: #F9FAFB;
  outline: none;
  transition: all 0.2s;
}

.field input:focus {
  border-color: #205BFC;
  background: #fff;
  box-shadow: 0 0 0 3px rgba(32,91,252,0.1);
}

.password-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.password-wrap input {
  flex: 1;
  height: 44px;
  padding: 0 44px 0 14px;
  border: 1px solid rgba(0,0,0,0.1);
  border-radius: 10px;
  font-family: inherit;
  font-size: 14px;
  color: #1E1E1E;
  background: #F9FAFB;
  outline: none;
  transition: all 0.2s;
}

.password-wrap input:focus {
  border-color: #205BFC;
  background: #fff;
  box-shadow: 0 0 0 3px rgba(32,91,252,0.1);
}

.eye-btn {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  width: 34px;
  height: 34px;
  border: none;
  background: transparent;
  color: #9CA3AF;
  cursor: pointer;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.eye-btn:hover {
  color: #374151;
  background: rgba(0,0,0,0.04);
}

.login-error {
  padding: 10px 14px;
  background: rgba(239,58,58,0.06);
  border: 1px solid rgba(239,58,58,0.2);
  border-radius: 10px;
  font-size: 13px;
  color: #EF3A3A;
  font-weight: 500;
}

.login-btn {
  height: 46px;
  background: #205BFC;
  color: white;
  border: none;
  border-radius: 10px;
  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 4px;
}

.login-btn:hover:not(:disabled) {
  background: #1a4fd4;
  box-shadow: 0 4px 12px rgba(32,91,252,0.3);
}

.login-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
