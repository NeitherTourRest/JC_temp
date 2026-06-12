import apiClient from './axios'
import type { ApiResponse, PageResponse, ShopResponse } from '@/types/api'

export const shopApi = {
  search: (params: any) => apiClient.get<ApiResponse<PageResponse<ShopResponse>>>('/shops/search', { params }),
  getBySpot: (spotId: number) => apiClient.get<ApiResponse<ShopResponse[]>>(`/shops/by-spot/${spotId}`),
  getTop: () => apiClient.get<ApiResponse<ShopResponse[]>>('/shops/top'),
  getById: (id: number) => apiClient.get<ApiResponse<ShopResponse>>(`/shops/${id}`),
  rate: (id: number, rating: number) => apiClient.post<ApiResponse<ShopResponse>>(`/shops/${id}/rate`, null, { params: { rating } }),
  congest: (id: number, level: string) => apiClient.post<ApiResponse<ShopResponse>>(`/shops/${id}/congestion`, null, { params: { level } }),
}
