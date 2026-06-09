import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { aiApi } from '@/api/aiApi'
import type { ChatSession, ChatMessage } from '@/types/api'

export const useAiStore = defineStore('ai', () => {
  const sessions = ref<ChatSession[]>([])
  const activeSessionId = ref<string | null>(null)
  const messages = ref<ChatMessage[]>([])
  const loading = ref(false)
  const sending = ref(false)

  const activeSession = computed(() =>
    sessions.value.find(s => s.id === activeSessionId.value) || null
  )

  const sortedSessions = computed(() =>
    [...sessions.value].sort((a, b) => {
      const da = a.updatedAt || a.createdAt || ''
      const db = b.updatedAt || b.createdAt || ''
      return db.localeCompare(da)
    })
  )

  /** Load all sessions for the user */
  async function loadSessions() {
    loading.value = true
    try {
      const r = await aiApi.sessions()
      sessions.value = (r.data.data || []).map((s: any) => ({
        id: s.id,
        userId: s.userId,
        title: s.title || 'New Chat',
        messages: s.messages || [],
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      }))
    } catch {
      sessions.value = []
    } finally {
      loading.value = false
    }
  }

  /** Switch to an existing session by ID */
  async function switchSession(sessionId: string) {
    activeSessionId.value = sessionId
    try {
      const r = await aiApi.getSession(sessionId)
      const data = r.data.data
      if (data) {
        messages.value = (data.messages || []).map((m: any) => ({
          role: m.role,
          content: m.content,
          timestamp: m.timestamp,
        }))
      }
    } catch {
      messages.value = []
    }
  }

  /** Create a new session */
  function newSession() {
    activeSessionId.value = null
    messages.value = []
  }

  /** Send a message in the current session */
  async function sendMessage(text: string) {
    if (!text.trim() || sending.value) return
    const userMsg: ChatMessage = { role: 'user', content: text.trim(), timestamp: new Date().toISOString() }
    messages.value.push(userMsg)
    sending.value = true

    try {
      const sessionId = activeSessionId.value || crypto.randomUUID()
      const r = await aiApi.chat(sessionId, text)
      const result = r.data.data
      if (result) {
        const assistantMsg: ChatMessage = { role: 'assistant', content: result.reply, timestamp: new Date().toISOString() }
        messages.value.push(assistantMsg)
        activeSessionId.value = result.sessionId
        // Update or add session in list
        const idx = sessions.value.findIndex(s => s.id === result.sessionId)
        if (idx >= 0) {
          sessions.value[idx].messages = messages.value
          sessions.value[idx].title = result.title || sessions.value[idx].title
          sessions.value[idx].updatedAt = new Date().toISOString()
        } else {
          sessions.value.unshift({
            id: result.sessionId,
            title: result.title || text.substring(0, 30),
            messages: [...messages.value],
            updatedAt: new Date().toISOString(),
          })
        }
      }
    } catch {
      messages.value.push({ role: 'assistant', content: '⚠️ Failed to get response. Check backend.', timestamp: new Date().toISOString() })
    } finally {
      sending.value = false
    }
  }

  /** Delete a session */
  async function deleteSession(sessionId: string) {
    try {
      await aiApi.deleteSession(sessionId)
      sessions.value = sessions.value.filter(s => s.id !== sessionId)
      if (activeSessionId.value === sessionId) {
        activeSessionId.value = null
        messages.value = []
      }
    } catch {
      // silently fail
    }
  }

  return {
    sessions, activeSessionId, messages, loading, sending,
    activeSession, sortedSessions,
    loadSessions, switchSession, newSession, sendMessage, deleteSession,
  }
})
