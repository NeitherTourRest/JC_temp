import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { authApi } from '@/api/authApi';
import axios from 'axios';
export const useAuthStore = defineStore('auth', () => {
    const accessToken = ref(localStorage.getItem('accessToken'));
    const refreshToken = ref(localStorage.getItem('refreshToken'));
    const isAuthenticated = computed(() => !!accessToken.value);
    const user = ref(isAuthenticated.value ? {
        id: 0,
        username: localStorage.getItem('nickname') || '',
        nickname: localStorage.getItem('nickname') || '',
        avatar: localStorage.getItem('avatar') || ''
    } : null);
    /** Decode base64url (JWT format) to string */
    function base64UrlDecode(str) {
        // Replace URL-safe chars and pad to multiple of 4
        str = str.replace(/-/g, '+').replace(/_/g, '/');
        while (str.length % 4)
            str += '=';
        return atob(str);
    }
    /** Decode JWT payload (base64url) to check expiry without backend call */
    function getTokenExpiry(token) {
        try {
            const payload = JSON.parse(base64UrlDecode(token.split('.')[1]));
            return payload.exp ? payload.exp * 1000 : null;
        }
        catch {
            return null;
        }
    }
    /**
     * Proactive token refresh:
     * - If access token is expired → try refresh
     * - If refresh succeeds → update tokens
     * - If refresh fails → do NOT clear tokens (they may still be valid)
     * Returns true if still authenticated after check.
     */
    async function checkAuth() {
        const token = accessToken.value;
        const rToken = refreshToken.value;
        // No token at all → not logged in
        if (!token) {
            if (user.value)
                user.value = null;
            return false;
        }
        // Token still valid → nothing to do
        const expiry = getTokenExpiry(token);
        if (expiry && expiry > Date.now())
            return true;
        // Token expired or expiry unknown → try refresh
        if (!rToken)
            return false;
        try {
            const res = await axios.post('/api/v1/auth/refresh', { refreshToken: rToken });
            const data = res.data.data;
            if (!data || !data.accessToken)
                return false;
            accessToken.value = data.accessToken;
            refreshToken.value = data.refreshToken;
            localStorage.setItem('accessToken', data.accessToken);
            localStorage.setItem('refreshToken', data.refreshToken);
            if (data.nickname) {
                localStorage.setItem('nickname', data.nickname);
                user.value = { id: data.userId, username: data.username, nickname: data.nickname, avatar: data.avatar || '' };
            }
            return true;
        }
        catch {
            // Don't logout — the token might just be temporarily unreachable
            // If it's truly expired, the next API call will get 401 and the interceptor handles it
            return !!accessToken.value;
        }
    }
    async function login(username, password) {
        const res = await authApi.login({ username, password });
        applyAuthResponse(res.data.data);
    }
    async function register(data) {
        const res = await authApi.register(data);
        applyAuthResponse(res.data.data);
    }
    function applyAuthResponse(data) {
        accessToken.value = data.accessToken;
        refreshToken.value = data.refreshToken;
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        const nick = data.nickname || data.username;
        localStorage.setItem('nickname', nick);
        localStorage.setItem('avatar', data.avatar || '');
        user.value = { id: data.userId, username: data.username, nickname: nick, avatar: data.avatar || '' };
    }
    function logout() {
        accessToken.value = null;
        refreshToken.value = null;
        user.value = null;
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('nickname');
        localStorage.removeItem('avatar');
    }
    return { user, accessToken, refreshToken, isAuthenticated, login, register, logout, checkAuth };
});
