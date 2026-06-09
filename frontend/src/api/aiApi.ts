import apiClient from './axios'
import type { ApiResponse, ChatSession, ChatResult, PlanRequest, PlanResult, BudgetRequest, BudgetResult } from '@/types/api'

export const aiApi = {
  chat: (sessionId: string, message: string, userId: number = 0) =>
    apiClient.post<ApiResponse<ChatResult>>(`/ai/chat?sessionId=${sessionId}&userId=${userId}`, { message }),
  sessions: (userId: number = 0) =>
    apiClient.get<ApiResponse<ChatSession[]>>(`/ai/sessions?userId=${userId}`),
  getSession: (sessionId: string) =>
    apiClient.get<ApiResponse<ChatSession>>(`/ai/sessions/${sessionId}`),
  deleteSession: (sessionId: string, userId: number = 0) =>
    apiClient.delete<ApiResponse<void>>(`/ai/sessions/${sessionId}?userId=${userId}`),
  plan: (data: PlanRequest) =>
    apiClient.post<ApiResponse<PlanResult>>('/ai/plan', data),
  budget: (data: BudgetRequest) =>
    apiClient.post<ApiResponse<BudgetResult>>('/ai/budget', data),
  summary: (diaryId: string) =>
    apiClient.get<ApiResponse<{ summary: string; error?: string }>>(`/ai/summary/diary/${diaryId}`),
}
