<template>
  <div class="auth-page">
    <div class="auth-card glass">
      <h1>Join JourneyCraft</h1>
      <el-form @submit.prevent="reg">
        <el-form-item><el-input v-model="f.username" placeholder="Username" size="large" /></el-form-item>
        <el-form-item><el-input v-model="f.password" type="password" placeholder="Password" size="large" show-password /></el-form-item>
        <el-form-item><el-input v-model="f.email" placeholder="Email" size="large" /></el-form-item>
        <el-form-item><el-input v-model="f.nickname" placeholder="Nickname" size="large" /></el-form-item>
        <el-form-item><el-button type="primary" size="large" class="full-btn" @click="reg" :loading="l">Sign Up</el-button></el-form-item>
      </el-form>
      <p class="switch">Have account? <router-link to="/login">Login</router-link></p>
      <p v-if="e" class="err">{{ e }}</p>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue'; import { useRouter } from 'vue-router'; import { authApi } from '@/api/authApi'
const r = useRouter(); const f = ref({ username: '', password: '', email: '', nickname: '' }); const l = ref(false); const e = ref('')
async function reg() { if (!f.value.username || !f.value.password) { e.value = 'Username and password required'; return }; l.value = true; e.value = ''; try { await authApi.register(f.value); r.push('/login') } catch (x: any) { e.value = x?.response?.data?.message || 'Failed' } finally { l.value = false } }
</script>
<style scoped>
.auth-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
.auth-card { width: 400px; padding: 36px 28px; border-radius: 16px; text-align: center; }
.auth-card h1 { font-family: 'Fredoka One', cursive; font-size: 1.6rem; text-transform: uppercase; margin-bottom: 20px; }
.full-btn { width: 100%; }
.switch { font-size: 13px; color: rgba(0,0,0,0.5); margin-top: 16px; }
.switch a { color: #ff69b4; text-decoration: none; font-family: 'Fredoka One', cursive; }
.err { color: #ff3b3b; font-size: 13px; margin-top: 8px; }
</style>
