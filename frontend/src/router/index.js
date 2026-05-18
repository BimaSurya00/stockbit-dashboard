import { createRouter, createWebHistory } from 'vue-router'
import { initAuth, isAuthenticated } from '../stores/auth.js'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../components/LoginPage.vue'),
    meta: { guest: true }
  },
  {
    path: '/',
    redirect: '/dashboard'
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('../components/DashboardPage.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/dashboard'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

let authReady = false

router.beforeEach(async (to, from, next) => {
  if (!authReady) {
    await initAuth()
    authReady = true
  }

  if (to.meta.requiresAuth && !isAuthenticated()) {
    next('/login')
  } else if (to.meta.guest && isAuthenticated()) {
    next('/dashboard')
  } else {
    next()
  }
})

export default router
