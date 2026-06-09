<template>
  <DefaultLayout>
    <div class="ai-page">
      <div class="page-header">
        <h1>🤖 AI CHAT</h1>
        <p>Your travel companion — ask me anything!</p>
      </div>

      <!-- Chat Messages -->
      <div class="chat-area" ref="chatRef">
        <div v-for="(msg, i) in messages" :key="i" :class="['msg-row', msg.role]">
          <div class="msg-bubble" :class="msg.role">
            <div class="msg-avatar">{{ msg.role === 'user' ? '😎' : '🤖' }}</div>
            <div class="msg-content">
              <div class="msg-text">{{ msg.content }}</div>
              <div class="msg-time">{{ msg.time || '' }}</div>
            </div>
          </div>
        </div>
        <div v-if="loading" class="msg-row assistant">
          <div class="msg-bubble assistant">
            <div class="msg-avatar">🤖</div>
            <div class="msg-content"><span class="typing-dots">Thinking</span></div>
          </div>
        </div>
      </div>

      <!-- Input -->
      <div class="input-bar">
        <el-input v-model="input" placeholder="Ask me about travel..." size="large" @keyup.enter="send" :disabled="loading" />
        <el-button type="primary" size="large" @click="send" :loading="loading" class="send-btn">SEND!</el-button>
      </div>
    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import { aiApi } from '@/api/aiApi'

const input = ref('')
const loading = ref(false)
const chatRef = ref<HTMLElement>()
const messages = ref<{ role: string; content: string; time: string }[]>([])

async function send() {
  if (!input.value.trim() || loading.value) return
  const text = input.value.trim()
  input.value = ''
  messages.value.push({ role: 'user', content: text, time: new Date().toLocaleTimeString() })
  loading.value = true
  scrollDown()
  try {
    const r = await aiApi.chat('default', text)
    const reply = r.data.data?.reply || 'No response'
    messages.value.push({ role: 'assistant', content: reply, time: new Date().toLocaleTimeString() })
  } catch {
    messages.value.push({ role: 'assistant', content: '⚠️ Failed to get response. Check backend.', time: '' })
  }
  finally { loading.value = false; scrollDown() }
}

function scrollDown() { nextTick(() => { if (chatRef.value) chatRef.value.scrollTop = chatRef.value.scrollHeight }) }

onMounted(() => {
  messages.value.push({ role: 'assistant', content: "Hi! I'm your AI travel assistant for Changping. Ask me about spots, food, routes, or plan your trip!", time: '' })
})
</script>

<style scoped>
.ai-page { max-width: 800px; margin: 0 auto; display: flex; flex-direction: column; height: calc(100vh - 120px); }
.page-header { text-align: center; padding: 10px 0; }
.page-header h1 { font-family: inherit; font-size: 2rem; letter-spacing: 2px; margin: 0; color: var(--text-primary); }
.page-header p { font-size: 14px; color: var(--text-secondary); }

.chat-area { flex: 1; overflow-y: auto; padding: 16px; border: 1px solid var(--frosted-border); border-radius: var(--radius-card); background: var(--frosted-bg); backdrop-filter: blur(var(--glass-blur)); box-shadow: var(--neu-shadow); margin-bottom: 12px; }
.msg-row { margin-bottom: 16px; }
.msg-row.user { display: flex; justify-content: flex-end; }
.msg-bubble { display: flex; gap: 10px; max-width: 80%; }
.msg-bubble.user { flex-direction: row-reverse; }
.msg-avatar { font-size: 2rem; flex-shrink: 0; }
.msg-content { padding: 10px 14px; border: 1px solid var(--frosted-border); border-radius: 8px; box-shadow: var(--neu-shadow-sm); }
.msg-bubble.assistant .msg-content { background: rgba(167,111,215,0.15); }
.msg-bubble.user .msg-content { background: rgba(124,215,238,0.15); }
.msg-text { font-size: 14px; line-height: 1.5; white-space: pre-wrap; color: var(--text-regular); }
.msg-time { font-size: 11px; color: var(--text-muted); margin-top: 4px; }

.typing-dots::after { content: '...'; animation: dots 1.5s steps(4) infinite; }
@keyframes dots { 0% { content: '.'; } 25% { content: '..'; } 50% { content: '...'; } 75% { content: ''; } }

.input-bar { display: flex; gap: 8px; }
.send-btn { flex-shrink: 0; }
</style>