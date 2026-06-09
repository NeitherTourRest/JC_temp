import apiClient from './axios'
import type { ApiResponse, UserResponse } from '@/types/api'

export interface UserPreferenceResponse {
  id: number
  interestCategories?: string
  cuisinePreferences?: string
  travelMode?: string
}

export const userApi = {
  getProfile: () => apiClient.get<ApiResponse<UserResponse>>('/users/me'),
  updateProfile: (data: { nickname?: string; username?: string; email?: string; avatar?: string }) =>
    apiClient.put<ApiResponse<UserResponse>>('/users/me', data),
  getPreferences: () =>
    apiClient.get<ApiResponse<UserPreferenceResponse>>('/users/me/preferences'),
  updatePreferences: (data: {
    interestCategories?: string
    cuisinePreferences?: string
    travelMode?: string
  }) =>
    apiClient.put<ApiResponse<UserPreferenceResponse>>(
      '/users/me/preferences',
      data
    )
}
