import { createApp } from 'vue'
import router from './router/index.js'
import AppShell from './App.vue'

const app = createApp(AppShell)
app.use(router)
app.mount('#app')
