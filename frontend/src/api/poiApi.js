import apiClient from './axios';
export const poiApi = {
    search: (keyword, maxResults = 20) => apiClient.get('/navigation/poi/search', { params: { keyword, maxResults } }),
    nearby: (lat, lon, maxResults = 20) => apiClient.get('/navigation/poi/nearby', { params: { lat, lon, maxResults } })
};
