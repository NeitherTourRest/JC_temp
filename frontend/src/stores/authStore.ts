import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '@/api/authApi'
import axios from 'axios'
import type { UserResponse } from '@/types/api'

export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref<string | null>(localStorage.getItem('accessToken'))
  const refreshToken = ref<string | null>(localStorage.getItem('refreshToken'))
  const isAuthenticated = computed(() => !!accessToken.value)
  const storedUserId = Number(localStorage.getItem('userId') || '0')
  const user = ref<UserResponse | null>(
    isAuthenticated.value ? {
      id: storedUserId > 0 ? storedUserId : 0,
      username: localStorage.getItem('username') || '',
      nickname: localStorage.getItem('nickname') || '',
      avatar: localStorage.getItem('avatar') || ''
    } as UserResponse : null
  )

  /** Decode base64url (JWT format) to string */
  function base64UrlDecode(str: string): string {
    // Replace URL-safe chars and pad to multiple of 4
    str = str.replace(/-/g, '+').replace(/_/g, '/')
    while (str.length % 4) str += '='
    return atob(str)
  }

  /** Decode JWT payload (base64url) to check expiry without backend call */
  function getTokenExpiry(token: string): number | null {
    try {
      const payload = JSON.parse(base64UrlDecode(token.split('.')[1]))
      return payload.exp ? payload.exp * 1000 : null
    } catch { return null }
  }

  /**
   * Proactive token refresh:
   * - If access token is expired → try refresh
   * - If refresh succeeds → update tokens
   * - If refresh fails → do NOT clear tokens (they may still be valid)
   * Returns true if still authenticated after check.
   */
  async function checkAuth(): Promise<boolean> {
    const token = accessToken.value
    const rToken = refreshToken.value

    // No token at all → not logged in
    if (!token) {
      if (user.value) user.value = null
      return false
    }

    // Token still valid → nothing to do
    const expiry = getTokenExpiry(token)
    if (expiry && expiry > Date.now()) return true

    // Token expired or expiry unknown → try refresh
    if (!rToken) return false

    try {
      const res = await axios.post('/api/v1/auth/refresh', { refreshToken: rToken })
      const data = res.data.data
      if (!data || !data.accessToken) return false
      accessToken.value = data.accessToken
      refreshToken.value = data.refreshToken
      localStorage.setItem('accessToken', data.accessToken)
      localStorage.setItem('refreshToken', data.refreshToken)
      if (data.userId) localStorage.setItem('userId', String(data.userId))
      if (data.username) localStorage.setItem('username', data.username)
      if (data.nickname) {
        localStorage.setItem('nickname', data.nickname)
        user.value = { id: data.userId, username: data.username, nickname: data.nickname, avatar: data.avatar || '' } as UserResponse
      }
      return true
    } catch {
      // Don't logout — the token might just be temporarily unreachable
      // If it's truly expired, the next API call will get 401 and the interceptor handles it
      return !!accessToken.value
    }
  }

  async function login(username: string, password: string) {
    const res = await authApi.login({ username, password })
    applyAuthResponse(res.data.data)
  }

  async function register(data: { username: string; password: string; email?: string; nickname?: string }) {
    const res = await authApi.register(data)
    applyAuthResponse(res.data.data)
  }

  function applyAuthResponse(data: any) {
    accessToken.value = data.accessToken
    refreshToken.value = data.refreshToken
    localStorage.setItem('accessToken', data.accessToken)
    localStorage.setItem('refreshToken', data.refreshToken)
    if (data.userId) localStorage.setItem('userId', String(data.userId))
    localStorage.setItem('username', data.username || '')
    const nick = data.nickname || data.username
    localStorage.setItem('nickname', nick)
    localStorage.setItem('avatar', data.avatar || '')
    user.value = { id: data.userId, username: data.username, nickname: nick, avatar: data.avatar || '' } as UserResponse
  }

  function logout() {
    accessToken.value = null
    refreshToken.value = null
    user.value = null
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('userId')
    localStorage.removeItem('username')
    localStorage.removeItem('nickname')
    localStorage.removeItem('avatar')
  }

  return { user, accessToken, refreshToken, isAuthenticated, login, register, logout, checkAuth }
})
