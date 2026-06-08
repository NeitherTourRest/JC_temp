import apiClient from './axios';
export const linkApi = {
    getBySpot: (spotId) => apiClient.get(`/spots/${spotId}/links`)
};
