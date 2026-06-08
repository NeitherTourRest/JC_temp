import apiClient from './axios'
import type { ApiResponse, PageResponse } from '@/types/api'

export interface ItineraryResponse {
  id: number
  userId: number
  name: string
  routeData?: string
  spotIds?: string
  totalDistance?: number
  totalTime?: number
  createdAt: string
}

export const itineraryApi = {
  create: (data: {
    name: string
    routeData?: string
    spotIds?: string
    totalDistance?: number
    totalTime?: number
  }) => apiClient.post<ApiResponse<ItineraryResponse>>('/itineraries', data),

  list: (page: number = 0, size: number = 10) =>
    apiClient.get<ApiResponse<PageResponse<ItineraryResponse>>>('/itineraries', {
      params: { page, size }
    }),

  get: (id: number) =>
    apiClient.get<ApiResponse<ItineraryResponse>>(`/itineraries/${id}`),

  update: (id: number, data: {
    name?: string
    routeData?: string
    spotIds?: string
    totalDistance?: number
    totalTime?: number
  }) => apiClient.put<ApiResponse<ItineraryResponse>>('/itineraries/' + id, data),

  del: (id: number) =>
    apiClient.delete<ApiResponse<void>>(`/itineraries/${id}`)
}
