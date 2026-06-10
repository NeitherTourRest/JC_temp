<template>
  <div class="auth-page">
    <div class="auth-card glass">
      <h1>Welcome Back</h1>
      <el-form @submit.prevent="login">
        <el-form-item><el-input v-model="u" placeholder="用户名" size="large" /></el-form-item>
        <el-form-item><el-input v-model="p" type="password" placeholder="密码" size="large" show-password /></el-form-item>
        <el-form-item><el-button type="primary" size="large" class="full-btn" @click="login" :loading="l">登录</el-button></el-form-item>
      </el-form>
      <p class="switch">还没有账号？ <router-link to="/register">立即注册</router-link></p>
      <p v-if="e" class="err">{{ e }}</p>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue'; import { useRouter } from 'vue-router'; import { useAuthStore } from '@/stores/authStore'
const r = useRouter(); const a = useAuthStore(); const u = ref(''); const p = ref(''); const l = ref(false); const e = ref('')
async function login() { if (!u.value || !p.value) { e.value = '请输入用户名和密码'; return }; l.value = true; e.value = ''; try { await a.login(u.value, p.value); r.push('/') } catch (x: any) { e.value = x?.response?.data?.message || '登录失败' } finally { l.value = false } }
</script>
<style scoped>
.auth-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
.auth-card { width: 380px; padding: 40px 32px; border-radius: var(--radius-card); text-align: center; }
.auth-card h1 { font-family: inherit; font-size: 1.6rem; font-weight: 700; margin-bottom: 24px; color: var(--text-primary); }
.full-btn { width: 100%; }
.switch { font-size: 13px; color: var(--text-muted); margin-top: 16px; }
.switch a { color: var(--pop-pink); text-decoration: none; }
.err { color: var(--pop-red); font-size: 13px; }
</style>
