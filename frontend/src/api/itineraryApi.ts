import apiClient from './axios'
import type { ApiResponse, PageResponse } from '@/types/api'

export interface CollaboratorResponse {
  userId: number
  role: string
  nickname: string
}

export interface InvitationResponse {
  id: number
  itineraryId: number
  itineraryName: string
  inviterId: number
  inviterName: string
  status: string
  createdAt: string
}

export interface ItineraryResponse {
  id: number
  userId: number
  name: string
  routeData?: string
  spotIds?: string
  totalDistance?: number
  totalTime?: number
  createdAt: string
  version?: number
  myRole?: string
  collaborators?: CollaboratorResponse[]
}

export const itineraryApi = {
  create: (data: {
    name: string
    routeData?: string
    spotIds?: string
    totalDistance?: number
    totalTime?: number
  }) => apiClient.post<ApiResponse<ItineraryResponse>>('/itineraries', data),

  list: (params?: { page?: number; size?: number; keyword?: string }) =>
    apiClient.get<ApiResponse<PageResponse<ItineraryResponse>>>('/itineraries', {
      params: params || {}
    }),

  get: (id: number) =>
    apiClient.get<ApiResponse<ItineraryResponse>>(`/itineraries/${id}`),

  update: (id: number, data: {
    name?: string
    routeData?: string
    spotIds?: string
    totalDistance?: number
    totalTime?: number
    version?: number
  }) => apiClient.put<ApiResponse<ItineraryResponse>>('/itineraries/' + id, data),

  del: (id: number) =>
    apiClient.delete<ApiResponse<void>>(`/itineraries/${id}`),

  // ── Collaboration APIs ──
  invite: (itineraryId: number, inviteeId: number) =>
    apiClient.post<ApiResponse<InvitationResponse>>(`/itineraries/${itineraryId}/invite`, { inviteeId }),

  acceptInvite: (invitationId: number) =>
    apiClient.post<ApiResponse<InvitationResponse>>(`/itineraries/invitations/${invitationId}/accept`),

  rejectInvite: (invitationId: number) =>
    apiClient.post<ApiResponse<InvitationResponse>>(`/itineraries/invitations/${invitationId}/reject`),

  getPendingInvites: (userId: number) =>
    apiClient.get<ApiResponse<InvitationResponse[]>>(`/itineraries/invitations/pending`, { params: { userId } }),

  removeCollaborator: (itineraryId: number, userId: number) =>
    apiClient.delete<ApiResponse<void>>(`/itineraries/${itineraryId}/collaborators/${userId}`),
}
