import apiClient from './axios';
export const aiGenApi = {
    generateImage: (prompt, aspectRatio) => apiClient.post('/ai/generate/image', { prompt, aspect_ratio: aspectRatio || '1:1' }),
    createVideo: (prompt) => apiClient.post('/ai/generate/video', { prompt }),
    queryVideo: (taskId) => apiClient.get('/ai/generate/video/query', { params: { taskId } }),
    generateMusic: (prompt, lyrics, instrumental) => apiClient.post('/ai/generate/music', { prompt, lyrics, instrumental })
};
export const fileApi = {
    upload: (file) => {
        const formData = new FormData();
        formData.append('file', file);
        return apiClient.post('/files/upload', formData);
    }
};
export const searchApi = {
    all: (keyword, limit = 5) => apiClient.get('/search', { params: { keyword, limit } })
};
