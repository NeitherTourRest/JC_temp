import apiClient from './axios'
import type { ApiResponse, PageResponse } from '@/types/api'

export interface FavoriteResponse {
  id: number
  type: string
  targetId: string
  createdAt: string
}

export const favoriteApi = {
  add: (data: { type: string; targetId: string }) =>
    apiClient.post<ApiResponse<FavoriteResponse>>('/favorites', data),

  list: (params?: { type?: string; page?: number; size?: number }) =>
    apiClient.get<ApiResponse<PageResponse<FavoriteResponse>>>('/favorites', { params }),

  remove: (type: string, targetId: string) =>
    apiClient.delete<ApiResponse<void>>('/favorites', { params: { type, targetId } })
}
