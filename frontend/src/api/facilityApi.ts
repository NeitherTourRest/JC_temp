import apiClient from './axios'
import type { ApiResponse } from '@/types/api'

export interface FacilityResponse {
  id: number
  name: string
  category: string
  latitude: number
  longitude: number
  distance?: number
}

export const facilityApi = {
  getBySpot: (
    spotId: number,
    params?: { category?: string; range?: number; lat?: number; lng?: number }
  ) =>
    apiClient.get<ApiResponse<FacilityResponse[]>>(`/spots/${spotId}/facilities`, { params })
}
