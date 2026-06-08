import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore } from '@/stores/authStore';
vi.mock('@/api/authApi', () => ({
    authApi: {
        login: vi.fn().mockResolvedValue({ data: { data: { accessToken: 'test-token', userId: 1, username: 'test', nickname: 'Test' } } }),
        register: vi.fn().mockResolvedValue({ data: { data: { accessToken: 'test-token' } } })
    }
}));
describe('AuthStore', () => {
    beforeEach(() => { setActivePinia(createPinia()); localStorage.clear(); });
    it('should login successfully', async () => {
        const store = useAuthStore();
        await store.login('test', 'pass');
        expect(store.isAuthenticated).toBe(true);
        expect(store.accessToken).toBe('test-token');
    });
    it('should logout', () => {
        const store = useAuthStore();
        store.logout();
        expect(store.isAuthenticated).toBe(false);
        expect(store.accessToken).toBeNull();
    });
});
