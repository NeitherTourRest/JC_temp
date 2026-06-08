import apiClient from './axios';
export const indoorApi = {
    navigate: (buildingId, from, to) => apiClient.get('/indoor/navigate', {
        params: { buildingId, from, to }
    }),
    getBuilding: (buildingId) => apiClient.get('/indoor/building', {
        params: { buildingId }
    })
};
