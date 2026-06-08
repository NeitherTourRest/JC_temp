import apiClient from './axios'
import type { ApiResponse, PageResponse, SpotResponse } from '@/types/api'

export const spotApi = {
  search: (params: { keyword?: string; category?: string; sortBy?: string; page?: number; size?: number }) =>
    apiClient.get<ApiResponse<PageResponse<SpotResponse>>>('/spots', { params }),
  getDetail: (id: number) => apiClient.get<ApiResponse<SpotResponse>>(`/spots/${id}`),
  recommend: (topK: number = 10) => apiClient.get<ApiResponse<SpotResponse[]>>('/spots/recommend', { params: { topK } })
}
