import apiClient from './axios';
export const favoriteApi = {
    add: (data) => apiClient.post('/favorites', data),
    list: (params) => apiClient.get('/favorites', { params }),
    remove: (type, targetId) => apiClient.delete('/favorites', { params: { type, targetId } })
};
