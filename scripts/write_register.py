template_content = """<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-header" style="background:var(--pop-pink);color:#fff">
        <h1>JOIN US!</h1>
        <p>Create your travel diary account</p>
      </div>
      <el-form class="auth-form">
        <el-form-item><el-input v-model="form.username" placeholder="Username" size="large" /></el-form-item>
        <el-form-item><el-input v-model="form.password" type="password" placeholder="Password" size="large" show-password /></el-form-item>
        <el-form-item><el-input v-model="form.email" placeholder="Email" size="large" /></el-form-item>
        <el-form-item><el-input v-model="form.nickname" placeholder="Nickname" size="large" /></el-form-item>
        <el-form-item><el-button type="primary" size="large" class="full-btn" @click="handleRegister" :loading="loading">SIGN UP</el-button></el-form-item>
      </el-form>
      <p class="auth-switch">Already have an account? <router-link to="/login">LOGIN &rarr;</router-link></p>
      <p v-if="error" class="auth-error">{{ error }}</p>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { authApi } from '@/api/authApi'
const router = useRouter()
const form = ref({ username: '', password: '', email: '', nickname: '' })
const loading = ref(false)
const error = ref('')
async function handleRegister() {
  if (!form.value.username || !form.value.password) { error.value = 'Username and password required'; return }
  loading.value = true; error.value = ''
  try { await authApi.register(form.value); router.push('/login') }
  catch (e: any) { error.value = e?.response?.data?.message || 'Registration failed' }
  finally { loading.value = false }
}
</script>
<style scoped>
.auth-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--pop-bg); padding: 20px; }
.auth-card { width: 400px; max-width: 100%; border: 4px solid #000; border-radius: 12px; box-shadow: 8px 8px 0 #000; background: #fff; overflow: hidden; }
.auth-header { padding: 30px 24px; border-bottom: 4px solid #000; text-align: center; }
.auth-header h1 { font-family: 'Bangers', cursive; font-size: 2rem; margin: 0; letter-spacing: 2px; }
.auth-header p { margin: 4px 0 0; font-size: 14px; opacity: 0.85; }
.auth-form { padding: 24px; }
.full-btn { width: 100%; }
.auth-switch { text-align: center; padding: 0 24px 24px; font-size: 14px; }
.auth-switch a { font-family: 'Bangers', cursive; color: var(--pop-pink); text-decoration: none; font-size: 16px; }
.auth-error { text-align: center; color: var(--pop-red); font-size: 13px; padding: 0 24px 16px; }
</style>"""

with open(r'D:\JC\frontend\src\views\auth\RegisterView.vue', 'w', encoding='utf-8') as f:
    f.write(template_content)
print('Written')
