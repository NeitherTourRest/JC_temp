import apiClient from './axios';
export const historyApi = {
    getSearchHistory: (page = 0, size = 10) => apiClient.get('/history/search', { params: { page, size } }),
    getBrowseHistory: (type, page = 0, size = 10) => apiClient.get('/history/browse', { params: { type, page, size } }),
    getRouteHistory: (page = 0, size = 10) => apiClient.get('/history/routes', { params: { page, size } }),
    getFacilityHistory: (page = 0, size = 10) => apiClient.get('/history/facilities', { params: { page, size } })
};
