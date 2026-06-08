import apiClient from './axios'
import type { ApiResponse } from '@/types/api'

export const recommendApi = {
  get: (userId: number = 0, topK: number = 6) =>
    apiClient.get<ApiResponse<{ spots: any[]; foods: any[]; diaries: any[] }>>('/recommend', { params: { userId, topK } })
}
