import apiClient from './axios';
export const itineraryApi = {
    create: (data) => apiClient.post('/itineraries', data),
    list: (page = 0, size = 10) => apiClient.get('/itineraries', {
        params: { page, size }
    }),
    get: (id) => apiClient.get(`/itineraries/${id}`),
    update: (id, data) => apiClient.put('/itineraries/' + id, data),
    del: (id) => apiClient.delete(`/itineraries/${id}`)
};
