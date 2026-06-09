<template>
  <DefaultLayout>
    <div class="ai-chat-container">
      <!-- Mobile sidebar toggle -->
      <button class="sidebar-toggle" @click="showSidebar = !showSidebar">
        <span>💬 {{ showSidebar ? 'Hide' : 'Chats' }}</span>
      </button>

      <!-- ── Left Sidebar: Session List ── -->
      <aside class="ai-sidebar" :class="{ open: showSidebar }">
        <div class="sidebar-header">
          <h3 class="sidebar-title">💬 Chats</h3>
          <el-button type="primary" size="small" @click="handleNewChat">
            + New Chat
          </el-button>
        </div>

        <div class="session-list" v-loading="ai.loading">
          <div v-if="!ai.loading && ai.sortedSessions.length === 0" class="empty-sessions">
            <p>No chats yet</p>
            <p class="text-sm">Start a new conversation!</p>
          </div>
          <div
            v-for="session in ai.sortedSessions"
            :key="session.id"
            class="session-item"
            :class="{ active: session.id === ai.activeSessionId }"
            @click="handleSwitchSession(session.id)"
          >
            <span class="session-title" :title="session.title">{{ session.title }}</span>
            <button
              class="session-delete"
              title="Delete chat"
              @click.stop="handleDeleteSession(session.id)"
            >&times;</button>
          </div>
        </div>
      </aside>

      <!-- ── Right: Chat Area ── -->
      <div class="ai-chat-main">
        <div class="chat-area" ref="chatRef">
          <!-- Welcome / empty state -->
          <div v-if="ai.messages.length === 0 && !ai.sending" class="chat-welcome">
            <div class="welcome-icon">🤖</div>
            <h2>AI Travel Assistant</h2>
            <p>Ask me about spots, food, routes, or plan your trip in Changping!</p>
          </div>

          <!-- Messages -->
          <div v-for="(msg, i) in ai.messages" :key="i" :class="['msg-row', msg.role]">
            <div class="msg-bubble" :class="msg.role">
              <div class="msg-avatar">{{ msg.role === 'user' ? '😎' : '🤖' }}</div>
              <div class="msg-content">
                <div class="msg-text">{{ msg.content }}</div>
                <div class="msg-time">{{ formatTime(msg.timestamp) }}</div>
              </div>
            </div>
          </div>

          <!-- Typing indicator -->
          <div v-if="ai.sending" class="msg-row assistant">
            <div class="msg-bubble assistant">
              <div class="msg-avatar">🤖</div>
              <div class="msg-content">
                <span class="typing-dots">Thinking</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Input bar -->
        <div class="input-bar">
          <el-input
            v-model="input"
            placeholder="Ask me about travel..."
            size="large"
            @keyup.enter="handleSend"
            :disabled="ai.sending"
          />
          <el-button
            type="primary"
            size="large"
            @click="handleSend"
            :loading="ai.sending"
            class="send-btn"
          >
            SEND!
          </el-button>
        </div>
      </div>
    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, watch } from 'vue'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import { useAiStore } from '@/stores/aiStore'

const ai = useAiStore()
const input = ref('')
const chatRef = ref<HTMLElement>()
const showSidebar = ref(false)

onMounted(() => {
  ai.loadSessions()
  ai.newSession()
})

/** Auto-scroll chat to bottom when messages change */
watch(
  () => ai.messages.length,
  () => nextTick(scrollDown),
)
watch(
  () => ai.sending,
  (val) => { if (val) nextTick(scrollDown) },
)

function scrollDown() {
  const el = chatRef.value
  if (el) el.scrollTop = el.scrollHeight
}

async function handleSend() {
  const text = input.value.trim()
  if (!text) return
  input.value = ''
  await ai.sendMessage(text)
  // On mobile, close sidebar after sending to show the response
  if (window.innerWidth < 768) showSidebar.value = false
  nextTick(scrollDown)
}

function handleNewChat() {
  ai.newSession()
  if (window.innerWidth < 768) showSidebar.value = false
}

function handleSwitchSession(sessionId: string) {
  ai.switchSession(sessionId)
  if (window.innerWidth < 768) showSidebar.value = false
}

async function handleDeleteSession(sessionId: string) {
  await ai.deleteSession(sessionId)
}

function formatTime(ts?: string): string {
  if (!ts) return ''
  try {
    const d = new Date(ts)
    if (isNaN(d.getTime())) return ''
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}
</script>

<style scoped>
/* ════════════════════════════════════════════════════
   Layout: Two-column (sidebar + chat)
   ════════════════════════════════════════════════════ */
.ai-chat-container {
  display: flex;
  gap: 16px;
  height: calc(100vh - 180px);
  position: relative;
}

/* ── Mobile toggle ── */
.sidebar-toggle {
  display: none;
  position: absolute;
  top: -38px;
  left: 0;
  z-index: 10;
  background: var(--frosted-bg);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid var(--frosted-border);
  border-radius: var(--radius-pill);
  padding: 6px 16px;
  color: var(--text-primary);
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: var(--neu-shadow-sm);
  transition: background 0.2s ease, transform 0.2s ease;
}
.sidebar-toggle:hover {
  background: rgba(255,255,255,0.1);
  transform: translateY(-1px);
}

/* ════════════════════════════════════════════════════
   Sidebar
   ════════════════════════════════════════════════════ */
.ai-sidebar {
  width: 280px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: var(--frosted-bg);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--frosted-border);
  border-radius: var(--radius-card);
  box-shadow: var(--neu-shadow);
  overflow: hidden;
}

/* Sidebar header */
.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--frosted-border);
  flex-shrink: 0;
}
.sidebar-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
  letter-spacing: 0.5px;
}

/* Session list */
.session-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.empty-sessions {
  text-align: center;
  padding: 40px 16px;
  color: var(--text-secondary);
}
.empty-sessions p {
  margin: 0 0 4px;
  font-size: 14px;
}

/* Session item — pill style */
.session-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  margin-bottom: 4px;
  border-radius: var(--radius-pill);
  cursor: pointer;
  transition: background 0.2s ease, box-shadow 0.2s ease;
  position: relative;
}
.session-item:hover {
  background: rgba(255,255,255,0.06);
}
.session-item.active {
  background: rgba(124,215,238,0.12);
  box-shadow: inset 0 0 0 1px rgba(124,215,238,0.25);
}

.session-title {
  flex: 1;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-regular);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}
.session-item.active .session-title {
  color: #7cd7ee;
  font-weight: 600;
}

/* Delete button — hidden, shown on hover */
.session-delete {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--text-muted);
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  opacity: 0;
  flex-shrink: 0;
  margin-left: 6px;
  transition: opacity 0.15s ease, background 0.15s ease, color 0.15s ease;
}
.session-item:hover .session-delete {
  opacity: 1;
}
.session-delete:hover {
  background: rgba(220,53,69,0.2);
  color: #ef9a9a;
}

/* ════════════════════════════════════════════════════
   Chat Main Area
   ════════════════════════════════════════════════════ */
.ai-chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

/* Chat message area — frosted glass */
.chat-area {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  border: 1px solid var(--frosted-border);
  border-radius: var(--radius-card);
  background: var(--frosted-bg);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  box-shadow: var(--neu-shadow);
  margin-bottom: 12px;
}

/* ── Welcome / empty state ── */
.chat-welcome {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  padding: 40px 20px;
}
.welcome-icon {
  font-size: 4rem;
  margin-bottom: 16px;
  animation: float 3s ease-in-out infinite;
}
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}
.chat-welcome h2 {
  font-family: inherit;
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 8px;
}
.chat-welcome p {
  font-size: 13px;
  color: var(--text-secondary);
  max-width: 380px;
  line-height: 1.6;
}

/* ── Message rows ── */
.msg-row {
  margin-bottom: 16px;
}
.msg-row.user {
  display: flex;
  justify-content: flex-end;
}
.msg-bubble {
  display: flex;
  gap: 10px;
  max-width: 80%;
}
.msg-bubble.user {
  flex-direction: row-reverse;
}
.msg-avatar {
  font-size: 2rem;
  flex-shrink: 0;
}
.msg-content {
  padding: 10px 14px;
  border: 1px solid var(--frosted-border);
  border-radius: 12px;
  box-shadow: var(--neu-shadow-sm);
}
.msg-bubble.assistant .msg-content {
  background: rgba(167,111,215,0.15);
}
.msg-bubble.user .msg-content {
  background: rgba(124,215,238,0.15);
}
.msg-text {
  font-size: 14px;
  line-height: 1.55;
  white-space: pre-wrap;
  color: var(--text-regular);
}
.msg-time {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 4px;
}

/* ── Typing dots ── */
.typing-dots::after {
  content: '...';
  animation: dots 1.5s steps(4) infinite;
}
@keyframes dots {
  0% { content: '.'; }
  25% { content: '..'; }
  50% { content: '...'; }
  75% { content: ''; }
}

/* ── Input bar ── */
.input-bar {
  display: flex;
  gap: 8px;
}
.send-btn {
  flex-shrink: 0;
}

/* ════════════════════════════════════════════════════
   Responsive — mobile (<768px)
   ════════════════════════════════════════════════════ */
@media (max-width: 767px) {
  .ai-chat-container {
    flex-direction: column;
    height: calc(100vh - 170px);
    position: relative;
  }

  .sidebar-toggle {
    display: inline-flex;
    position: static;
    margin-bottom: 8px;
    align-self: flex-start;
  }

  .ai-sidebar {
    position: absolute;
    top: 44px;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100%;
    z-index: 20;
    border-radius: var(--radius-card);
    transform: translateX(-105%);
    opacity: 0;
    pointer-events: none;
    transition: transform 0.3s cubic-bezier(0.23, 1, 0.32, 1),
                opacity 0.2s ease;
  }
  .ai-sidebar.open {
    transform: translateX(0);
    opacity: 1;
    pointer-events: auto;
  }

  .ai-chat-main {
    flex: 1;
  }

  .chat-area {
    border-radius: 14px;
  }

  .msg-bubble {
    max-width: 90%;
  }
}
</style>
