import apiClient from './axios'
import type { ApiResponse, PageResponse, DiaryResponse } from '@/types/api'

export const diaryApi = {
  list: (params: any) => apiClient.get<ApiResponse<PageResponse<DiaryResponse>>>('/diaries', { params }),
  get: (id: string) => apiClient.get<ApiResponse<DiaryResponse>>(`/diaries/${id}`),
  create: (data: any) => apiClient.post<ApiResponse<DiaryResponse>>('/diaries', data),
  update: (id: string, data: any) => apiClient.put<ApiResponse<DiaryResponse>>(`/diaries/${id}`, data),
  del: (id: string) => apiClient.delete<ApiResponse<void>>(`/diaries/${id}`),
  rate: (id: string, rating: number) => apiClient.post<ApiResponse<DiaryResponse>>(`/diaries/${id}/rate`, null, { params: { rating } }),
  search: (keyword: string, page?: number, size?: number) =>
    apiClient.get<ApiResponse<PageResponse<DiaryResponse>>>('/diaries/search', { params: { keyword, page, size } }),
  mine: (params?: any) => apiClient.get<ApiResponse<PageResponse<DiaryResponse>>>('/diaries/mine', { params })
}
