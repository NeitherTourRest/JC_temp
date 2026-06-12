import apiClient from './axios';
export const diaryApi = {
    list: (params) => apiClient.get('/diaries', { params }),
    get: (id) => apiClient.get(`/diaries/${id}`),
    create: (data) => apiClient.post('/diaries', data),
    update: (id, data) => apiClient.put(`/diaries/${id}`, data),
    del: (id) => apiClient.delete(`/diaries/${id}`),
    rate: (id, rating) => apiClient.post(`/diaries/${id}/rate`, null, { params: { rating } }),
    search: (keyword, page, size) => apiClient.get('/diaries/search', { params: { keyword, page, size } }),
    mine: (params) => apiClient.get('/diaries/mine', { params })
};
