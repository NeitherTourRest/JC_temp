import apiClient from './axios'
import type { ApiResponse } from '@/types/api'

export const aiGenApi = {
  generateImage: (prompt: string, aspectRatio?: string) =>
    apiClient.post<ApiResponse<{ imageUrl: string }>>('/ai/generate/image', { prompt, aspect_ratio: aspectRatio || '1:1' }),

  createVideo: (prompt: string) =>
    apiClient.post<ApiResponse<{ taskId: string; status: string }>>('/ai/generate/video', { prompt }),

  queryVideo: (taskId: string) =>
    apiClient.get<ApiResponse<{ status: string; fileId?: string; downloadUrl?: string }>>('/ai/generate/video/query', { params: { taskId } }),

  generateMusic: (prompt: string, lyrics?: string, instrumental?: boolean) =>
    apiClient.post<ApiResponse<{ audioUrl: string }>>('/ai/generate/music', { prompt, lyrics, instrumental })
}

export const fileApi = {
  upload: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return apiClient.post<ApiResponse<{ url: string; filename: string; size: number; contentType: string }>>('/files/upload', formData)
  }
}

export const searchApi = {
  all: (keyword: string, limit: number = 5) =>
    apiClient.get<ApiResponse<{ spots: any[]; foods: any[]; diaries: any[] }>>('/search', { params: { keyword, limit } })
}
