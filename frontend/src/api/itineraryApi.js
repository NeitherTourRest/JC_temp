import apiClient from './axios';
export const itineraryApi = {
    create: (data) => apiClient.post('/itineraries', data),
    list: (params) => apiClient.get('/itineraries', {
        params: params || {}
    }),
    get: (id) => apiClient.get(`/itineraries/${id}`),
    update: (id, data) => apiClient.put('/itineraries/' + id, data),
    del: (id) => apiClient.delete(`/itineraries/${id}`),
    // ── Collaboration APIs ──
    invite: (itineraryId, inviteeId) => apiClient.post(`/itineraries/${itineraryId}/invite`, { inviteeId }),
    acceptInvite: (invitationId) => apiClient.post(`/itineraries/invitations/${invitationId}/accept`),
    rejectInvite: (invitationId) => apiClient.post(`/itineraries/invitations/${invitationId}/reject`),
    getPendingInvites: (userId) => apiClient.get(`/itineraries/invitations/pending`, { params: { userId } }),
    removeCollaborator: (itineraryId, userId) => apiClient.delete(`/itineraries/${itineraryId}/collaborators/${userId}`),
};
