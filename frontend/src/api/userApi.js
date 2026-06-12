import apiClient from './axios';
export const userApi = {
    getProfile: () => apiClient.get('/users/me'),
    updateProfile: (data) => apiClient.put('/users/me', data),
    getPreferences: () => apiClient.get('/users/me/preferences'),
    updatePreferences: (data) => apiClient.put('/users/me/preferences', data),
    search: (keyword) => apiClient.get('/users/search', { params: { keyword } })
};
