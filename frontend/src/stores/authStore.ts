import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '@/api/authApi'
import type { UserResponse } from '@/types/api'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<UserResponse | null>(null)
  const accessToken = ref<string | null>(localStorage.getItem('accessToken'))
  const isAuthenticated = computed(() => !!accessToken.value)

  async function login(username: string, password: string) {
    const res = await authApi.login({ username, password })
    accessToken.value = res.data.data.accessToken
    localStorage.setItem('accessToken', res.data.data.accessToken)
    user.value = { id: res.data.data.userId, username: res.data.data.username, nickname: res.data.data.nickname || '' } as UserResponse
  }

  async function register(data: { username: string; password: string; email?: string; nickname?: string }) {
    const res = await authApi.register(data)
    accessToken.value = res.data.data.accessToken
    localStorage.setItem('accessToken', res.data.data.accessToken)
  }

  function logout() {
    accessToken.value = null; user.value = null; localStorage.removeItem('accessToken')
  }

  return { user, accessToken, isAuthenticated, login, register, logout }
})
