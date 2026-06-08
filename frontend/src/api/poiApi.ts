import apiClient from './axios'
import type { ApiResponse } from '@/types/api'

export interface POIResponse { name: string; lat: number; lon: number }

export const poiApi = {
  search: (keyword: string, maxResults: number = 20) =>
    apiClient.get<ApiResponse<POIResponse[]>>('/navigation/poi/search', { params: { keyword, maxResults } }),
  nearby: (lat: number, lon: number, maxResults: number = 20) =>
    apiClient.get<ApiResponse<POIResponse[]>>('/navigation/poi/nearby', { params: { lat, lon, maxResults } })
}
