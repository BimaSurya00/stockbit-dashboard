<template>
  <div class="ai-chat-widget">
    <!-- Toggle Button -->
    <button
      class="ai-toggle"
      :class="{ 'is-open': isOpen }"
      @click.stop="toggleOpen"
      title="AI Assistant"
    >
      <svg v-if="!isOpen" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 2a4 4 0 0 1 4 4c0 2-2 3-4 5-2-2-4-3-4-5a4 4 0 0 1 4-4z"/>
        <path d="M12 11v4"/>
        <path d="M8 22h8"/>
        <path d="M12 19v3"/>
        <path d="M4 8a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/>
        <path d="M20 8a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2"/>
      </svg>
      <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"/>
        <line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </button>

    <!-- Chat Panel -->
    <Transition name="panel">
      <div v-if="isOpen" class="chat-panel">
        <!-- Header -->
        <div class="chat-header">
          <div class="chat-header-left">
            <div class="chat-avatar">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2a4 4 0 0 1 4 4c0 2-2 3-4 5-2-2-4-3-4-5a4 4 0 0 1 4-4z"/>
                <path d="M12 11v4"/>
                <path d="M8 22h8"/>
              </svg>
            </div>
            <div>
              <span class="chat-title">AI Assistant</span>
              <span class="chat-status">{{ symbol ? `Menganalisis ${symbol}` : 'Siap membantu' }}</span>
            </div>
          </div>
          <button v-if="messages.length > 1" class="btn-clear" @click="clearChat" title="Hapus percakapan">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        </div>

        <!-- Messages -->
        <div class="chat-messages" ref="messagesRef">
          <div v-if="messages.length === 0" class="chat-welcome">
            <div class="welcome-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="1.5">
                <path d="M12 2a4 4 0 0 1 4 4c0 2-2 3-4 5-2-2-4-3-4-5a4 4 0 0 1 4-4z"/>
                <path d="M12 11v4"/>
                <path d="M8 22h8"/>
              </svg>
            </div>
            <h3 class="welcome-title">AI Analisis Saham</h3>
            <p class="welcome-desc">
              Tanya tentang data saham, sentimen berita, atau laporan keuangan.
            </p>
            <div class="welcome-suggestions">
              <button
                v-for="s in suggestions"
                :key="s.text"
                class="suggestion-chip"
                @click="ask(s.text)"
              >
                {{ s.icon }} {{ s.text }}
              </button>
            </div>
          </div>

          <div
            v-for="(msg, idx) in messages"
            :key="idx"
            class="message"
            :class="msg.role"
          >
            <div class="msg-bubble" v-html="renderMessage(msg.content)"></div>
            <div v-if="msg.role === 'assistant' && idx === messages.length - 1 && isStreaming" class="streaming-cursor"></div>
          </div>

          <div v-if="isStreaming && messages.length === 1" class="message assistant">
            <div class="msg-bubble thinking">
              <span class="dot-pulse"></span> Menganalisis...
            </div>
          </div>
        </div>

        <!-- Input -->
        <div class="chat-input-area">
          <div class="chat-input-wrapper">
            <input
              ref="inputRef"
              v-model="inputText"
              class="chat-input"
              placeholder="Tanya tentang saham..."
              @keydown.enter.prevent="sendMessage"
              :disabled="isStreaming"
            />
            <button
              class="btn-send"
              :class="{ 'has-text': inputText.trim() }"
              :disabled="!inputText.trim() || isStreaming"
              @click="sendMessage"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, nextTick, watch, onMounted } from 'vue'

const props = defineProps({
  symbol: { type: String, default: '' }
})

const isOpen = ref(false)
const inputText = ref('')
const messages = ref([])
const isStreaming = ref(false)
const messagesRef = ref(null)
const inputRef = ref(null)

const suggestions = [
  { icon: '📊', text: 'Apa sentimen BBCA hari ini?' },
  { icon: '📰', text: 'Ringkas berita terbaru' },
  { icon: '📈', text: 'Emiten apa yang trending positif?' },
]

function toggleOpen() {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    nextTick(() => inputRef.value?.focus())
  }
}

function clearChat() {
  messages.value = []
}

async function ask(text) {
  inputText.value = text
  await sendMessage()
}

async function sendMessage() {
  const text = inputText.value.trim()
  if (!text || isStreaming.value) return

  messages.value.push({ role: 'user', content: text })
  inputText.value = ''
  isStreaming.value = true

  scrollToBottom()

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000)

    const response = await fetch('/api/ai/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: text,
        symbol: props.symbol || undefined
      }),
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Gagal terhubung ke server' }))
      messages.value.push({
        role: 'assistant',
        content: `⚠️ ${err.error || 'Terjadi kesalahan. Coba lagi nanti.'}`
      })
      isStreaming.value = false
      scrollToBottom()
      return
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let fullText = ''

    messages.value.push({ role: 'assistant', content: '' })
    const msgIndex = messages.value.length - 1

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })
      const lines = chunk.split('\n')

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') break
          if (data.startsWith('[ERROR]')) {
            fullText += data.replace('[ERROR] ', '⚠️ ')
            continue
          }
          fullText += data.replace(/\\n/g, '\n')
        }
      }

      messages.value[msgIndex].content = fullText
      scrollToBottom()
    }

    if (!fullText) {
      messages.value[msgIndex].content = '⚠️ Maaf, saya tidak bisa memproses pertanyaan itu sekarang.'
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      messages.value.push({
        role: 'assistant',
        content: '⏱️ Waktu permintaan habis. Coba pertanyaan yang lebih sederhana.'
      })
    } else {
      messages.value.push({
        role: 'assistant',
        content: `⚠️ Gagal terhubung ke server. Pastikan backend berjalan dan LLM API key sudah diatur.`
      })
    }
  }

  isStreaming.value = false
  scrollToBottom()
}

function renderMessage(text) {
  if (!text) return ''
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  return escaped
    .replace(/\n/g, '<br>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
}

function scrollToBottom() {
  nextTick(() => {
    if (messagesRef.value) {
      messagesRef.value.scrollTop = messagesRef.value.scrollHeight
    }
  })
}

watch(() => props.symbol, () => {
  if (props.symbol && isOpen.value) {
    // Auto-update the status context but don't auto-send
  }
})

onMounted(() => {
  // Click outside to close
  document.addEventListener('click', (e) => {
    const el = document.querySelector('.ai-chat-widget')
    if (el && !el.contains(e.target) && isOpen.value) {
      isOpen.value = false
    }
  })
})
</script>

<style scoped>
.ai-chat-widget {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 999;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}

/* ─── Toggle Button ─── */
.ai-toggle {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(135deg, #205BFC, #1a4fd4);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px rgba(32, 91, 252, 0.35);
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.ai-toggle:hover {
  transform: scale(1.08);
  box-shadow: 0 6px 24px rgba(32, 91, 252, 0.45);
}

.ai-toggle.is-open {
  transform: rotate(90deg);
  background: #475569;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}

/* ─── Chat Panel ─── */
.chat-panel {
  position: absolute;
  bottom: 68px;
  right: 0;
  width: 380px;
  height: 540px;
  background: #FFFFFF;
  border-radius: 18px;
  box-shadow: 0 8px 40px rgba(0,0,0,0.12);
  border: 1px solid rgba(0,0,0,0.06);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: panelIn 0.2s ease-out;
}

@keyframes panelIn {
  from { opacity: 0; transform: translateY(12px) scale(0.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.panel-enter-active { animation: panelIn 0.2s ease-out; }
.panel-leave-active { animation: panelIn 0.15s ease-in reverse; }

/* ─── Header ─── */
.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px;
  border-bottom: 1px solid rgba(0,0,0,0.05);
  background: #F8FAFC;
}

.chat-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.chat-avatar {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #205BFC, #1a4fd4);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.chat-title {
  display: block;
  font-size: 14px;
  font-weight: 700;
  color: #1E1E1E;
  line-height: 1.2;
}

.chat-status {
  display: block;
  font-size: 11px;
  font-weight: 500;
  color: #6B7280;
}

.btn-clear {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 8px;
  color: #9CA3AF;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.btn-clear:hover {
  background: rgba(0,0,0,0.05);
  color: #EF3A3A;
}

/* ─── Messages ─── */
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  scroll-behavior: smooth;
}

.chat-welcome {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 36px 16px 16px;
}

.welcome-icon {
  width: 72px;
  height: 72px;
  background: rgba(32,91,252,0.06);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}

.welcome-title {
  font-family: 'DM Sans', 'Inter', sans-serif;
  font-size: 17px;
  font-weight: 800;
  color: #1E1E1E;
  margin: 0 0 6px;
}

.welcome-desc {
  font-size: 13px;
  color: #6B7280;
  margin: 0 0 20px;
  line-height: 1.5;
  max-width: 280px;
}

.welcome-suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}

.suggestion-chip {
  padding: 8px 14px;
  background: #F8FAFC;
  border: 1px solid rgba(0,0,0,0.06);
  border-radius: 100px;
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  color: #1E1E1E;
  cursor: pointer;
  transition: all 0.2s;
}

.suggestion-chip:hover {
  border-color: #205BFC;
  background: rgba(32,91,252,0.04);
  color: #205BFC;
}

/* Message Bubbles */
.message {
  display: flex;
  flex-direction: column;
  max-width: 85%;
}

.message.user {
  align-self: flex-end;
}

.message.assistant {
  align-self: flex-start;
}

.msg-bubble {
  padding: 12px 16px;
  border-radius: 14px;
  font-size: 13px;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
}

.message.user .msg-bubble {
  background: #205BFC;
  color: white;
  border-bottom-right-radius: 4px;
}

.message.assistant .msg-bubble {
  background: #F1F4F9;
  color: #1E1E1E;
  border-bottom-left-radius: 4px;
}

.message.assistant .msg-bubble.thinking {
  background: #F1F4F9;
  min-width: 120px;
}

.streaming-cursor {
  display: inline-block;
  width: 2px;
  height: 16px;
  background: #205BFC;
  margin-left: 4px;
  animation: blink 0.8s infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

.dot-pulse {
  display: inline-block;
  width: 6px;
  height: 6px;
  background: #205BFC;
  border-radius: 50%;
  margin-right: 6px;
  animation: pulse 1.2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.8); }
}

/* ─── Input ─── */
.chat-input-area {
  padding: 12px 16px 14px;
  border-top: 1px solid rgba(0,0,0,0.05);
  background: #FAFBFC;
}

.chat-input-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #FFFFFF;
  border: 1px solid rgba(0,0,0,0.08);
  border-radius: 12px;
  padding: 4px;
  transition: border-color 0.2s;
}

.chat-input-wrapper:focus-within {
  border-color: #205BFC;
  box-shadow: 0 0 0 3px rgba(32,91,252,0.08);
}

.chat-input {
  flex: 1;
  border: none;
  background: transparent;
  padding: 8px 10px;
  font-family: inherit;
  font-size: 13px;
  color: #1E1E1E;
  outline: none;
  min-width: 0;
}

.chat-input::placeholder {
  color: #9CA3AF;
}

.btn-send {
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  border-radius: 10px;
  color: #9CA3AF;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;
}

.btn-send.has-text {
  background: #205BFC;
  color: white;
}

.btn-send.has-text:hover {
  background: #1a4fd4;
}

.btn-send:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ─── Scrollbar ─── */
.chat-messages::-webkit-scrollbar {
  width: 4px;
}

.chat-messages::-webkit-scrollbar-track {
  background: transparent;
}

.chat-messages::-webkit-scrollbar-thumb {
  background: rgba(0,0,0,0.1);
  border-radius: 4px;
}

@media (max-width: 480px) {
  .chat-panel {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100%;
    height: 100%;
    border-radius: 0;
    bottom: 0;
  }

  .ai-chat-widget {
    bottom: 16px;
    right: 16px;
  }
}
</style>
