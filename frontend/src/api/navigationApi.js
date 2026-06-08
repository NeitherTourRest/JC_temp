import apiClient from './axios';
export const navigationApi = {
    planRoute: (data) => apiClient.post('/navigation/route', data)
};
