import apiClient from './axios'
import type { ApiResponse, PageResponse, FoodResponse } from '@/types/api'

export const foodApi = {
  getBySpot: (spotId: number, params: any) => apiClient.get<ApiResponse<PageResponse<FoodResponse>>>(`/spots/${spotId}/foods`, { params }),
  search: (params: any) => apiClient.get<ApiResponse<PageResponse<FoodResponse>>>('/foods/search', { params }),
  getById: (id: number) => apiClient.get<ApiResponse<FoodResponse>>(`/foods/${id}`)
}
