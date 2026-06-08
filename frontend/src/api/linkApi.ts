import apiClient from './axios'
import type { ApiResponse } from '@/types/api'

export interface LinkResponse {
  id: number
  spotId: number
  type: string
  name: string
  url: string
  icon?: string
}

export const linkApi = {
  getBySpot: (spotId: number) =>
    apiClient.get<ApiResponse<LinkResponse[]>>(`/spots/${spotId}/links`)
}
