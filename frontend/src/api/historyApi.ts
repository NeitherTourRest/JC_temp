import apiClient from './axios'
import type { ApiResponse, PageResponse } from '@/types/api'

export const historyApi = {
  getSearchHistory: (page: number = 0, size: number = 10) =>
    apiClient.get<ApiResponse<PageResponse<any>>>('/history/search', { params: { page, size } }),
  getBrowseHistory: (type?: string, page: number = 0, size: number = 10) =>
    apiClient.get<ApiResponse<PageResponse<any>>>('/history/browse', { params: { type, page, size } }),
  getRouteHistory: (page: number = 0, size: number = 10) =>
    apiClient.get<ApiResponse<PageResponse<any>>>('/history/routes', { params: { page, size } }),
  getFacilityHistory: (page: number = 0, size: number = 10) =>
    apiClient.get<ApiResponse<PageResponse<any>>>('/history/facilities', { params: { page, size } })
}
