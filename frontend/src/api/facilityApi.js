import apiClient from './axios';
export const facilityApi = {
    getBySpot: (spotId, params) => apiClient.get(`/spots/${spotId}/facilities`, { params })
};
