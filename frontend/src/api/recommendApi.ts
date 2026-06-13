import apiClient from './axios'
import type { ApiResponse, RecommendResult } from '@/types/api'

export const recommendApi = {
  get: (userId?: number, topK: number = 6) =>
    apiClient.get<ApiResponse<RecommendResult>>('/recommend', { params: { userId, topK } })
}
