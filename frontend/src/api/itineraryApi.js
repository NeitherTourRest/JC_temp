import apiClient from './axios';
export const itineraryApi = {
    create: (data) => apiClient.post('/itineraries', data),
    list: (params) => apiClient.get('/itineraries', {
        params: params || {}
    }),
    get: (id) => apiClient.get(`/itineraries/${id}`),
    update: (id, data) => apiClient.put('/itineraries/' + id, data),
    del: (id) => apiClient.delete(`/itineraries/${id}`)
};
