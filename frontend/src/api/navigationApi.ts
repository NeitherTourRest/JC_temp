import apiClient from './axios'
import type { ApiResponse, RouteRequest, RouteResponse } from '@/types/api'

export const navigationApi = {
  planRoute: (data: RouteRequest) => apiClient.post<ApiResponse<RouteResponse>>('/navigation/route', data)
}
