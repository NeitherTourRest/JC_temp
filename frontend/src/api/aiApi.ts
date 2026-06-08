import apiClient from './axios'
import type { ApiResponse } from '@/types/api'

export const aiApi = {
  chat: (sessionId: string, message: string, userId: number = 0) =>
    apiClient.post<ApiResponse<{ reply: string; turnCount: number; sessionId: string; title: string }>>(`/ai/chat?sessionId=${sessionId}&userId=${userId}`, { message }),
  sessions: (userId: number = 0) =>
    apiClient.get<ApiResponse<any[]>>(`/ai/sessions?userId=${userId}`),
  getSession: (sessionId: string) =>
    apiClient.get<ApiResponse<any>>(`/ai/sessions/${sessionId}`),
  deleteSession: (sessionId: string, userId: number = 0) =>
    apiClient.delete<ApiResponse<void>>(`/ai/sessions/${sessionId}?userId=${userId}`),
  plan: (data: any) =>
    apiClient.post<ApiResponse<any>>('/ai/plan', data),
  budget: (data: any) =>
    apiClient.post<ApiResponse<any>>('/ai/budget', data),
  summary: (diaryId: string) =>
    apiClient.get<ApiResponse<{ summary: string; error?: string }>>(`/ai/summary/diary/${diaryId}`),
}
