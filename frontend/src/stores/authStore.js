import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { authApi } from '@/api/authApi';
export const useAuthStore = defineStore('auth', () => {
    const user = ref(null);
    const accessToken = ref(localStorage.getItem('accessToken'));
    const isAuthenticated = computed(() => !!accessToken.value);
    async function login(username, password) {
        const res = await authApi.login({ username, password });
        accessToken.value = res.data.data.accessToken;
        localStorage.setItem('accessToken', res.data.data.accessToken);
        user.value = { id: res.data.data.userId, username: res.data.data.username, nickname: res.data.data.nickname || '' };
    }
    async function register(data) {
        const res = await authApi.register(data);
        accessToken.value = res.data.data.accessToken;
        localStorage.setItem('accessToken', res.data.data.accessToken);
    }
    function logout() {
        accessToken.value = null;
        user.value = null;
        localStorage.removeItem('accessToken');
    }
    return { user, accessToken, isAuthenticated, login, register, logout };
});
