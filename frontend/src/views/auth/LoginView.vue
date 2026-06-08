<template>
  <div class="auth-page">
    <div class="auth-card glass">
      <h1>Welcome Back</h1>
      <el-form @submit.prevent="login">
        <el-form-item><el-input v-model="u" placeholder="Username" size="large" /></el-form-item>
        <el-form-item><el-input v-model="p" type="password" placeholder="Password" size="large" show-password /></el-form-item>
        <el-form-item><el-button type="primary" size="large" class="full-btn" @click="login" :loading="l">Sign In</el-button></el-form-item>
      </el-form>
      <p class="switch">No account? <router-link to="/register">Register</router-link></p>
      <p v-if="e" class="err">{{ e }}</p>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue'; import { useRouter } from 'vue-router'; import { useAuthStore } from '@/stores/authStore'
const r = useRouter(); const a = useAuthStore(); const u = ref(''); const p = ref(''); const l = ref(false); const e = ref('')
async function login() { if (!u.value || !p.value) { e.value = 'Fill all fields'; return }; l.value = true; e.value = ''; try { await a.login(u.value, p.value); r.push('/') } catch (x: any) { e.value = x?.response?.data?.message || 'Login failed' } finally { l.value = false } }
</script>
<style scoped>
.auth-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
.auth-card { width: 380px; padding: 40px 32px; border-radius: 20px; text-align: center; }
.auth-card h1 { font-size: 1.6rem; font-weight: 700; margin-bottom: 24px; }
.full-btn { width: 100%; }
.switch { font-size: 13px; color: rgba(255,255,255,0.5); margin-top: 16px; }
.switch a { color: #22d3ee; text-decoration: none; }
.err { color: #f87171; font-size: 13px; }
</style>
