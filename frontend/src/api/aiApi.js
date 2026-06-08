import apiClient from './axios';
export const aiApi = {
    chat: (sessionId, message, userId = 0) => apiClient.post(`/ai/chat?sessionId=${sessionId}&userId=${userId}`, { message }),
    sessions: (userId = 0) => apiClient.get(`/ai/sessions?userId=${userId}`),
    getSession: (sessionId) => apiClient.get(`/ai/sessions/${sessionId}`),
    deleteSession: (sessionId, userId = 0) => apiClient.delete(`/ai/sessions/${sessionId}?userId=${userId}`),
    plan: (data) => apiClient.post('/ai/plan', data),
    budget: (data) => apiClient.post('/ai/budget', data),
    summary: (diaryId) => apiClient.get(`/ai/summary/diary/${diaryId}`),
};
