<script setup>
import { ref, onMounted, reactive } from 'vue'
import axios from 'axios'
import { isAdmin } from '../stores/auth.js'
import { useRouter } from 'vue-router'

const router = useRouter()
const users = ref([])
const loading = ref(false)
const message = ref('')
const regForm = reactive({ username: '', password: '', role: 'user' })
const regLoading = ref(false)

onMounted(() => {
  if (!isAdmin()) {
    router.push('/dashboard')
    return
  }
  fetchUsers()
})

async function fetchUsers() {
  loading.value = true
  try {
    const res = await axios.get('/api/admin/users')
    users.value = res.data.users
  } catch (err) {
    message.value = 'Error: ' + (err.response?.data?.error || err.message)
  } finally {
    loading.value = false
  }
}

async function toggleRole(user) {
  try {
    const newRole = user.role === 'admin' ? 'user' : 'admin'
    await axios.put(`/api/admin/users/${user._id}`, { role: newRole })
    user.role = newRole
    message.value = `Role ${user.username} changed to ${newRole}`
  } catch (err) {
    message.value = 'Error: ' + (err.response?.data?.error || err.message)
  }
}

async function toggleActive(user) {
  try {
    await axios.put(`/api/admin/users/${user._id}`, { isActive: !user.isActive })
    user.isActive = !user.isActive
    message.value = `${user.username} ${user.isActive ? 'activated' : 'deactivated'}`
  } catch (err) {
    message.value = 'Error: ' + (err.response?.data?.error || err.message)
  }
}

async function deleteUser(user) {
  if (!confirm(`Delete user "${user.username}"?`)) return
  try {
    await axios.delete(`/api/admin/users/${user._id}`)
    users.value = users.value.filter(u => u._id !== user._id)
    message.value = `User ${user.username} deleted`
  } catch (err) {
    message.value = 'Error: ' + (err.response?.data?.error || err.message)
  }
}

async function registerUser() {
  regLoading.value = true
  message.value = ''
  try {
    await axios.post('/api/auth/register', regForm.value)
    message.value = `User "${regForm.value.username}" created`
    regForm.username = ''
    regForm.password = ''
    regForm.role = 'user'
    fetchUsers()
  } catch (err) {
    message.value = 'Error: ' + (err.response?.data?.error || err.message)
  } finally {
    regLoading.value = false
  }
}
</script>

<template>
  <div>
    <div class="page-card">
      <div class="page-card-header">
        <div>
          <h2 class="page-title">Manage Users</h2>
          <p class="page-subtitle">Kelola user yang bisa akses dashboard ini</p>
        </div>
      </div>

      <div v-if="message" class="token-msg" :class="{ success: !message.startsWith('Error'), error: message.startsWith('Error') }">
        {{ message }}
      </div>

      <div class="reg-form">
        <div class="reg-row">
          <input v-model="regForm.username" type="text" placeholder="Username" class="reg-inp" />
          <input v-model="regForm.password" type="password" placeholder="Password" class="reg-inp" />
          <select v-model="regForm.role" class="reg-inp reg-sel">
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
          <button @click="registerUser" :disabled="regLoading || !regForm.username || !regForm.password" class="btn-reg">
            {{ regLoading ? 'Creating...' : '+ Add User' }}
          </button>
        </div>
      </div>

      <table v-if="users.length" class="user-table">
        <thead>
          <tr>
            <th>Username</th>
            <th>Role</th>
            <th>Status</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in users" :key="user._id">
            <td class="td-user">
              <div class="user-avatar-sm">{{ user.username[0].toUpperCase() }}</div>
              <span>{{ user.username }}</span>
            </td>
            <td>
              <button class="role-btn" :class="user.role" @click="toggleRole(user)">
                {{ user.role }}
              </button>
            </td>
            <td>
              <button class="status-btn" :class="{ active: user.isActive, inactive: !user.isActive }" @click="toggleActive(user)">
                {{ user.isActive ? 'Active' : 'Inactive' }}
              </button>
            </td>
            <td class="td-date">{{ new Date(user.createdAt).toLocaleDateString() }}</td>
            <td>
              <button class="delete-btn" @click="deleteUser(user)" title="Delete user">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-else-if="!loading" class="empty-state">No users found</div>
    </div>
  </div>
</template>

<style scoped>
.user-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 12px;
}

.user-table th {
  text-align: left;
  padding: 10px 12px;
  font-size: 12px;
  font-weight: 700;
  color: #9CA3AF;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid rgba(0,0,0,0.06);
}

.user-table td {
  padding: 12px;
  border-bottom: 1px solid rgba(0,0,0,0.04);
  font-size: 14px;
  color: #1E1E1E;
}

.td-user {
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-avatar-sm {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #205BFC;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
}

.role-btn {
  padding: 4px 12px;
  border: none;
  border-radius: 100px;
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  text-transform: capitalize;
}

.role-btn.admin {
  background: rgba(32,91,252,0.1);
  color: #205BFC;
}

.role-btn.user {
  background: rgba(107,114,128,0.1);
  color: #6B7280;
}

.role-btn:hover {
  opacity: 0.8;
}

.status-btn {
  padding: 4px 12px;
  border: none;
  border-radius: 100px;
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.status-btn.active {
  background: rgba(33,191,115,0.1);
  color: #16804a;
}

.status-btn.inactive {
  background: rgba(239,58,58,0.1);
  color: #EF3A3A;
}

.status-btn:hover {
  opacity: 0.8;
}

.td-date {
  color: #9CA3AF !important;
  font-size: 13px !important;
}

.delete-btn {
  width: 32px;
  height: 32px;
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

.delete-btn:hover {
  color: #EF3A3A;
  background: rgba(239,58,58,0.06);
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: #9CA3AF;
  font-size: 14px;
}

.token-msg {
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 8px;
}

.token-msg.success {
  background: rgba(33,191,115,0.08);
  color: #16804a;
  border: 1px solid rgba(33,191,115,0.2);
}

.token-msg.error {
  background: rgba(239,58,58,0.08);
  color: #EF3A3A;
  border: 1px solid rgba(239,58,58,0.2);
}

.reg-form { margin-bottom: 12px; }
.reg-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.reg-inp {
  height: 38px; padding: 0 12px;
  border: 1px solid rgba(0,0,0,0.1); border-radius: 10px;
  font-family: inherit; font-size: 13px; color: #1E1E1E;
  background: #F9FAFB; outline: none; transition: all 0.2s;
}
.reg-inp:focus { border-color: #205BFC; box-shadow: 0 0 0 3px rgba(32,91,252,0.1); background: #fff; }
.reg-sel { width: 100px; cursor: pointer; }
.btn-reg {
  height: 38px; padding: 0 16px;
  background: #205BFC; color: white; border: none; border-radius: 10px;
  font-family: inherit; font-size: 13px; font-weight: 600; cursor: pointer;
  transition: all 0.2s; white-space: nowrap;
}
.btn-reg:hover:not(:disabled) { background: #1a4fd4; }
.btn-reg:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
