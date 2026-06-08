import apiClient from './axios';
export const spotApi = {
    search: (params) => apiClient.get('/spots', { params }),
    getDetail: (id) => apiClient.get(`/spots/${id}`),
    recommend: (topK = 10) => apiClient.get('/spots/recommend', { params: { topK } })
};
