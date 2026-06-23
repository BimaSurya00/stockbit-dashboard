<template>
  <div class="broker-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">Broker</h1>
        <p class="page-subtitle">Aktivitas broker asing, lokal, dan pemerintah</p>
      </div>
    </div>

    <div class="sub-tabs">
      <button class="sub-tab" :class="{ active: currentTab === 'top' }" @click="currentTab = 'top'">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18"/><path d="M5 21V7l8-4 8 4v14"/><path d="M9 21v-6h6v6"/></svg>
        Top Broker
      </button>
      <button class="sub-tab" :class="{ active: currentTab === 'flow' }" @click="currentTab = 'flow'">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
        Broker Flow
      </button>
    </div>

    <div v-if="currentTab === 'top'">
      <BrokerTop />
    </div>
    <div v-if="currentTab === 'flow'">
      <BrokerFlow />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import BrokerTop from './BrokerTop.vue'
import BrokerFlow from './BrokerFlow.vue'

const currentTab = ref('top')
</script>

<style scoped>
.broker-page {
  font-family: 'Inter', sans-serif;
  color: #0F172A;
   --border: rgba(0,0,0,0.05);
}
.page-header { margin-bottom: 16px; }
.page-title { font-family: 'DM Sans', 'Inter', sans-serif; font-size: 28px; font-weight: 800; margin: 0; letter-spacing: -1px; color: var(--text); }
.page-subtitle { font-size: 14px; color: var(--text2); margin: 2px 0 0; }

.sub-tabs { display: flex; gap: 4px; background: var(--bg); border-radius: 12px; padding: 4px; margin-bottom: 20px; }
.sub-tab {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 8px 20px; background: transparent; border: none; border-radius: 10px;
  font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 600;
  color: var(--text2); cursor: pointer; transition: all 0.2s;
}
.sub-tab:hover { color: var(--text); }
.sub-tab.active { background: var(--surface); color: var(--text); box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
</style>
