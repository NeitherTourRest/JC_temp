import axios from 'axios';
const apiClient = axios.create({ baseURL: '/api/v1', headers: { 'Content-Type': 'application/json' } });
apiClient.interceptors.request.use(config => {
    const token = localStorage.getItem('accessToken');
    if (token)
        config.headers.Authorization = `Bearer ${token}`;
    // Let axios handle Content-Type automatically for FormData
    if (config.data instanceof FormData) {
        delete config.headers['Content-Type'];
    }
    return config;
});
let isRefreshing = false;
let pendingRequests = [];
apiClient.interceptors.response.use(response => response, async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
        if (isRefreshing) {
            return new Promise(resolve => {
                pendingRequests.push((token) => {
                    originalRequest.headers.Authorization = `Bearer ${token}`;
                    resolve(apiClient(originalRequest));
                });
            });
        }
        originalRequest._retry = true;
        isRefreshing = true;
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
            try {
                const res = await axios.post('/api/v1/auth/refresh', { refreshToken });
                const newToken = res.data.data.accessToken;
                localStorage.setItem('accessToken', newToken);
                if (res.data.data.refreshToken) {
                    localStorage.setItem('refreshToken', res.data.data.refreshToken);
                }
                pendingRequests.forEach(cb => cb(newToken));
                pendingRequests = [];
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                return apiClient(originalRequest);
            }
            catch {
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                window.location.href = '/login';
            }
            finally {
                isRefreshing = false;
            }
        }
        else {
            localStorage.removeItem('accessToken');
            window.location.href = '/login';
        }
    }
    return Promise.reject(error);
});
export default apiClient;
