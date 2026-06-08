import apiClient from './axios'
import type { ApiResponse, AuthResponse, LoginRequest, RegisterRequest } from '@/types/api'

export const authApi = {
  login: (data: LoginRequest) => apiClient.post<ApiResponse<AuthResponse>>('/auth/login', data),
  register: (data: RegisterRequest) => apiClient.post<ApiResponse<AuthResponse>>('/auth/register', data)
}
