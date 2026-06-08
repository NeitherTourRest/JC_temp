import apiClient from './axios';
export const foodApi = {
    getBySpot: (spotId, params) => apiClient.get(`/spots/${spotId}/foods`, { params }),
    search: (params) => apiClient.get('/foods/search', { params }),
    getById: (id) => apiClient.get(`/foods/${id}`)
};
