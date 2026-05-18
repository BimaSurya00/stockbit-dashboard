<script setup>
import { ref, onMounted, reactive, computed } from 'vue'
import axios from 'axios'
import { isAdmin } from '../stores/auth.js'
import { useRouter } from 'vue-router'

const router = useRouter()
const users = ref([])
const loading = ref(false)
const message = ref('')
const messageType = ref('')
const regForm = reactive({ username: '', password: '', role: 'user' })
const regLoading = ref(false)

const adminCount = computed(() => users.value.filter(u => u.role === 'admin').length)
const activeCount = computed(() => users.value.filter(u => u.isActive).length)

onMounted(() => {
  if (!isAdmin()) return router.push('/dashboard')
  fetchUsers()
})

function flash(msg, type = 'success') {
  message.value = msg
  messageType.value = type
  setTimeout(() => { message.value = '' }, 4000)
}

async function fetchUsers() {
  loading.value = true
  try {
    const res = await axios.get('/api/admin/users')
    users.value = res.data.users
  } catch (err) {
    flash(err.response?.data?.error || err.message, 'error')
  } finally { loading.value = false }
}

async function toggleRole(user) {
  try {
    const newRole = user.role === 'admin' ? 'user' : 'admin'
    await axios.put(`/api/admin/users/${user._id}`, { role: newRole })
    user.role = newRole
    flash(`Role ${user.username} changed to ${newRole}`)
  } catch (err) {
    flash(err.response?.data?.error || err.message, 'error')
  }
}

async function toggleActive(user) {
  try {
    await axios.put(`/api/admin/users/${user._id}`, { isActive: !user.isActive })
    user.isActive = !user.isActive
    flash(`${user.username} ${user.isActive ? 'activated' : 'deactivated'}`)
  } catch (err) {
    flash(err.response?.data?.error || err.message, 'error')
  }
}

async function deleteUser(user) {
  if (!confirm(`Delete user "${user.username}"?`)) return
  try {
    await axios.delete(`/api/admin/users/${user._id}`)
    users.value = users.value.filter(u => u._id !== user._id)
    flash(`User ${user.username} deleted`)
  } catch (err) {
    flash(err.response?.data?.error || err.message, 'error')
  }
}

async function registerUser() {
  regLoading.value = true
  try {
    await axios.post('/api/auth/register', regForm)
    flash(`User "${regForm.username}" created`)
    regForm.username = ''
    regForm.password = ''
    regForm.role = 'user'
    fetchUsers()
  } catch (err) {
    flash(err.response?.data?.error || err.message, 'error')
  } finally { regLoading.value = false }
}
</script>

<template>
  <div class="users-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">Manage Users</h1>
        <p class="page-subtitle">{{ users.length }} users &middot; {{ activeCount }} active &middot; {{ adminCount }} admins</p>
      </div>
    </div>

    <div class="bento-card add-card">
      <h3 class="card-title">Add New User</h3>
      <div class="add-row">
        <div class="add-field">
          <label>Username</label>
          <input v-model="regForm.username" type="text" placeholder="username" />
        </div>
        <div class="add-field">
          <label>Password</label>
          <input v-model="regForm.password" type="password" placeholder="password" />
        </div>
        <div class="add-field add-field-sm">
          <label>Role</label>
          <select v-model="regForm.role">
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <button @click="registerUser" :disabled="regLoading || !regForm.username || !regForm.password" class="btn-add">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          {{ regLoading ? 'Adding...' : 'Add User' }}
        </button>
      </div>
    </div>

    <div class="bento-card">
      <div class="table-wrap">
        <table v-if="users.length" class="user-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Status</th>
              <th>Created</th>
              <th class="r"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in users" :key="user._id">
              <td>
                <div class="user-cell">
                  <div class="avatar" :class="user.role">{{ user.username[0].toUpperCase() }}</div>
                  <div class="user-meta">
                    <span class="uname">{{ user.username }}</span>
                    <span class="uid">{{ user._id.slice(-8) }}</span>
                  </div>
                </div>
              </td>
              <td>
                <button class="pill-badge" :class="user.role" @click="toggleRole(user)">{{ user.role }}</button>
              </td>
              <td>
                <button class="pill-badge" :class="user.isActive ? 'active' : 'inactive'" @click="toggleActive(user)">
                  {{ user.isActive ? 'Active' : 'Inactive' }}
                </button>
              </td>
              <td class="td-muted">{{ new Date(user.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) }}</td>
              <td class="r">
                <button class="btn-icon" @click="deleteUser(user)" title="Delete">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  </svg>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-else-if="!loading" class="empty-state">No users yet. Add one above.</div>
      </div>
    </div>

    <Transition name="toast">
      <div v-if="message" class="toast" :class="messageType">{{ message }}</div>
    </Transition>
  </div>
</template>

<style scoped>
.users-page {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --blue: #205BFC; --green: #21BF73; --red: #EF3A3A;
  --bg: #F8FAFC; --surface: #FFFFFF; --text: #0F172A; --text2: #475569; --text3: #94A3B8;
  --border: rgba(0,0,0,0.05); --radius: 20px; --radius-sm: 14px;
  --shadow: 0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.04);
}

.page-header { margin-bottom: 20px; }
.page-title { font-family: 'DM Sans', 'Inter', sans-serif; font-size: 28px; font-weight: 800; margin: 0; letter-spacing: -0.5px; color: var(--text); }
.page-subtitle { font-size: 14px; color: var(--text2); margin: 4px 0 0; font-weight: 400; }

.bento-card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius); padding: 24px;
  box-shadow: var(--shadow); margin-bottom: 16px;
}

.card-title { font-family: 'DM Sans', 'Inter', sans-serif; font-size: 15px; font-weight: 700; color: var(--text); margin: 0 0 16px 0; }

/* Add User */
.add-row { display: flex; gap: 12px; align-items: flex-end; flex-wrap: wrap; }
.add-field { display: flex; flex-direction: column; gap: 5px; flex: 1; min-width: 140px; }
.add-field-sm { flex: 0 0 110px; min-width: unset; }
.add-field label { font-size: 11px; font-weight: 700; color: var(--text3); text-transform: uppercase; letter-spacing: 0.5px; }
.add-field input, .add-field select {
  height: 42px; padding: 0 14px;
  border: 1px solid var(--border); border-radius: 12px;
  font-family: inherit; font-size: 14px; color: var(--text);
  background: var(--bg); outline: none; transition: all 0.2s;
}
.add-field input:focus, .add-field select:focus { border-color: var(--blue); box-shadow: 0 0 0 3px rgba(32,91,252,0.08); background: var(--surface); }
.add-field select { cursor: pointer; padding-right: 36px; appearance: none; background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%2394A3B8' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 14px center; }
.btn-add {
  display: inline-flex; align-items: center; gap: 6px; height: 42px; padding: 0 18px;
  background: var(--blue); color: white; border: none; border-radius: 12px;
  font-family: inherit; font-size: 13px; font-weight: 600; cursor: pointer;
  transition: all 0.2s; white-space: nowrap;
}
.btn-add:hover:not(:disabled) { background: #1a4fd4; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(32,91,252,0.3); }
.btn-add:disabled { opacity: 0.5; cursor: not-allowed; }

/* Table */
.table-wrap { overflow-x: auto; }
.user-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.user-table thead th {
  text-align: left; padding: 10px 12px 14px;
  font-size: 10px; font-weight: 700; color: var(--text3);
  text-transform: uppercase; letter-spacing: 0.7px; border-bottom: 1px solid var(--border);
}
.user-table thead th.r { text-align: right; }
.user-table tbody td { padding: 12px; border-bottom: 1px solid rgba(0,0,0,0.02); font-weight: 500; color: var(--text); }
.user-table tbody td.r { text-align: right; width: 44px; }
.user-table tbody tr:hover td { background: var(--bg); }

.user-cell { display: flex; align-items: center; gap: 12px; }
.avatar {
  width: 36px; height: 36px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 700; color: white; flex-shrink: 0;
}
.avatar.admin { background: var(--blue); }
.avatar.user { background: var(--text2); }
.user-meta { display: flex; flex-direction: column; gap: 1px; }
.uname { font-weight: 600; color: var(--text); font-size: 14px; }
.uid { font-size: 11px; color: var(--text3); font-family: 'SF Mono', 'Fira Code', monospace; }

.pill-badge {
  padding: 5px 14px; border: none; border-radius: 100px;
  font-family: inherit; font-size: 12px; font-weight: 600;
  cursor: pointer; transition: all 0.2s; text-transform: capitalize;
}
.pill-badge.admin { background: rgba(32,91,252,0.08); color: var(--blue); }
.pill-badge.user { background: rgba(148,163,184,0.1); color: var(--text2); }
.pill-badge.active { background: rgba(33,191,115,0.08); color: var(--green); }
.pill-badge.inactive { background: rgba(239,58,58,0.06); color: var(--red); }
.pill-badge:hover { opacity: 0.8; transform: translateY(-1px); }

.td-muted { color: var(--text3) !important; font-size: 12px !important; }

.btn-icon {
  width: 34px; height: 34px; border: none; background: transparent;
  color: var(--text3); cursor: pointer; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s;
}
.btn-icon:hover { color: var(--red); background: rgba(239,58,58,0.06); }

.empty-state { text-align: center; padding: 48px 20px; color: var(--text3); font-size: 14px; }

/* Toast */
.toast {
  position: fixed; bottom: 24px; right: 24px; z-index: 2000;
  padding: 12px 20px; border-radius: 14px; font-size: 13px; font-weight: 600;
  box-shadow: 0 8px 24px rgba(0,0,0,0.12); max-width: 360px;
}
.toast.success { background: var(--text); color: white; }
.toast.error { background: var(--red); color: white; }
.toast-enter-active { transition: all 0.3s ease-out; }
.toast-leave-active { transition: all 0.2s ease-in; }
.toast-enter-from { opacity: 0; transform: translateY(12px); }
.toast-leave-to { opacity: 0; transform: translateY(6px); }

@media (max-width: 768px) {
  .add-row { flex-direction: column; }
  .add-field-sm { flex: 1; min-width: unset; }
  .btn-add { width: 100%; justify-content: center; }
}
</style>
