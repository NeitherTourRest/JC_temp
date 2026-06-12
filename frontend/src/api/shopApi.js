import apiClient from './axios';
export const shopApi = {
    search: (params) => apiClient.get('/shops/search', { params }),
    getBySpot: (spotId) => apiClient.get(`/shops/by-spot/${spotId}`),
    getTop: () => apiClient.get('/shops/top'),
    getById: (id) => apiClient.get(`/shops/${id}`),
    rate: (id, rating) => apiClient.post(`/shops/${id}/rate`, null, { params: { rating } }),
    congest: (id, level) => apiClient.post(`/shops/${id}/congestion`, null, { params: { level } }),
};
