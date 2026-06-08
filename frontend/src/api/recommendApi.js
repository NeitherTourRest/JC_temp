import apiClient from './axios';
export const recommendApi = {
    get: (userId = 0, topK = 6) => apiClient.get('/recommend', { params: { userId, topK } })
};
