<template>
  <DefaultLayout>
    <div class="profile-page">
      <!-- 个人信息卡片 -->
      <el-card class="profile-card glass" shadow="hover">
        <div class="profile-header">
          <el-avatar :size="80" :src="profile.avatar" class="profile-avatar">
            {{ profile.nickname?.[0] || profile.username?.[0] || 'U' }}
          </el-avatar>
          <div class="profile-meta">
            <h2 class="profile-nickname">{{ profile.nickname || profile.username }}</h2>
            <p class="profile-username">@{{ profile.username }}</p>
            <el-tag v-if="profile.email" size="small" type="info" class="profile-email-tag">
              {{ profile.email }}
            </el-tag>
          </div>
          <el-button type="primary" :icon="Edit" @click="showEditDialog = true" class="edit-btn">
            编辑资料
          </el-button>
        </div>
        <el-divider />
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="UID">
            <span class="uid-text">#{{ profile.id }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="昵称">{{ profile.nickname || '未设置' }}</el-descriptions-item>
          <el-descriptions-item label="用户名">@{{ profile.username }}</el-descriptions-item>
          <el-descriptions-item label="邮箱">{{ profile.email || '未设置' }}</el-descriptions-item>
          <el-descriptions-item label="注册时间">{{ formatDate(profile.createdAt) }}</el-descriptions-item>
        </el-descriptions>
      </el-card>

      <!-- 偏好设置 -->
      <el-card class="preferences-card glass" shadow="hover">
        <template #header>
          <div class="card-header">
            <span class="card-title">偏好设置</span>
          </div>
        </template>

        <el-form label-position="top" class="preferences-form">
          <!-- 兴趣类别 -->
          <el-form-item label="兴趣类别">
            <el-checkbox-group v-model="preferences.interestCategories">
              <el-checkbox label="自然风光">自然风光</el-checkbox>
              <el-checkbox label="历史古迹">历史古迹</el-checkbox>
              <el-checkbox label="主题乐园">主题乐园</el-checkbox>
              <el-checkbox label="博物馆">博物馆</el-checkbox>
              <el-checkbox label="校园">校园</el-checkbox>
              <el-checkbox label="美食">美食</el-checkbox>
            </el-checkbox-group>
          </el-form-item>

          <el-divider />

          <!-- 美食偏好 -->
          <el-form-item label="美食偏好">
            <el-checkbox-group v-model="preferences.cuisinePreferences">
              <el-checkbox label="川菜">川菜</el-checkbox>
              <el-checkbox label="粤菜">粤菜</el-checkbox>
              <el-checkbox label="日料">日料</el-checkbox>
              <el-checkbox label="西餐">西餐</el-checkbox>
              <el-checkbox label="烧烤">烧烤</el-checkbox>
              <el-checkbox label="火锅">火锅</el-checkbox>
              <el-checkbox label="清真">清真</el-checkbox>
              <el-checkbox label="农家菜">农家菜</el-checkbox>
            </el-checkbox-group>
          </el-form-item>

          <el-divider />

          <!-- 出行方式 -->
          <el-form-item label="出行方式">
            <el-radio-group v-model="preferences.travelMode">
              <el-radio-button value="WALK">步行</el-radio-button>
              <el-radio-button value="BIKE">骑行</el-radio-button>
              <el-radio-button value="MIXED">混合</el-radio-button>
            </el-radio-group>
          </el-form-item>

          <el-form-item>
            <el-button type="primary" :loading="savingPreferences" @click="handleSavePreferences">
              保存偏好设置
            </el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 快捷导航 -->
      <el-card class="nav-card glass" shadow="hover">
        <template #header>
          <span class="card-title">快捷导航</span>
        </template>
        <div class="nav-links">
          <el-button class="nav-link-btn" @click="$router.push('/favorites')">
            <span class="nav-icon">★</span>
            <span>我的收藏</span>
          </el-button>
          <el-button class="nav-link-btn" @click="$router.push('/itineraries')">
            <span class="nav-icon">🗺</span>
            <span>我的行程</span>
          </el-button>
          <el-button class="nav-link-btn" @click="$router.push('/history')">
            <span class="nav-icon">🕐</span>
            <span>浏览历史</span>
          </el-button>
        </div>
      </el-card>

      <!-- 退出登录 -->
      <div class="logout-section">
        <el-button type="danger" :icon="SwitchButton" size="large" @click="handleLogout">
          退出登录
        </el-button>
      </div>

      <!-- 编辑资料弹窗 -->
          <el-dialog
            v-model="showEditDialog"
            title="编辑个人资料"
            width="480px"
            :close-on-click-modal="false"
          >
            <el-form
              ref="editFormRef"
              :model="editForm"
              :rules="editRules"
              label-position="top"
            >
              <el-form-item label="头像">
                <div class="avatar-upload" @click="avatarInput?.click()">
                  <img v-if="editForm.avatar" :src="editForm.avatar" class="avatar-preview" />
                  <div v-else class="avatar-placeholder">
                    <span class="upload-icon">📷</span>
                    <span>点击上传头像</span>
                  </div>
                  <input ref="avatarInput" type="file" accept="image/*" hidden @change="onAvatarChange" />
                  <div v-if="avatarUploading" class="avatar-uploading-overlay">
                    <span>上传中...</span>
                  </div>
                </div>
              </el-form-item>
              <el-form-item label="昵称" prop="nickname">
                <el-input v-model="editForm.nickname" placeholder="请输入昵称" maxlength="30" show-word-limit />
              </el-form-item>
              <el-form-item label="用户名" prop="username">
                <el-input v-model="editForm.username" placeholder="请输入用户名" minlength="2" maxlength="50" />
              </el-form-item>
              <el-form-item label="邮箱" prop="email">
                <el-input v-model="editForm.email" placeholder="请输入邮箱" type="email" />
              </el-form-item>
            </el-form>
        <template #footer>
          <el-button @click="showEditDialog = false">取消</el-button>
          <el-button type="primary" :loading="savingProfile" @click="handleSaveProfile">
            保存
          </el-button>
        </template>
      </el-dialog>
    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Edit, SwitchButton } from '@element-plus/icons-vue'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import { useAuthStore } from '@/stores/authStore'
import { userApi } from '@/api/userApi'
import apiClient from '@/api/axios'
import type { UserResponse } from '@/types/api'
import type { FormInstance, FormRules } from 'element-plus'

const router = useRouter()
const auth = useAuthStore()

// --- 个人资料 ---
const profile = reactive<Partial<UserResponse>>({
  id: undefined,
  username: '',
  nickname: '',
  email: '',
  avatar: '',
  createdAt: ''
})

// --- 偏好设置 ---
const preferences = reactive({
  interestCategories: [] as string[],
  cuisinePreferences: [] as string[],
  travelMode: '' as string
})
const savingPreferences = ref(false)

// --- 编辑弹窗 ---
const showEditDialog = ref(false)
const savingProfile = ref(false)
const editFormRef = ref<FormInstance>()
const editForm = reactive({ nickname: '', username: '', email: '', avatar: '' })
const editRules: FormRules = {
  nickname: [
    { min: 1, max: 30, message: '昵称长度在 1 到 30 个字符之间', trigger: 'blur' }
  ],
  username: [
    { min: 2, max: 50, message: '用户名长度在 2 到 50 个字符之间', trigger: 'blur' },
    { pattern: /^[a-zA-Z0-9_]+$/, message: '用户名只能包含字母、数字和下划线', trigger: 'blur' }
  ],
  email: [
    { pattern: /^$|^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: '请输入有效的邮箱地址', trigger: 'blur' }
  ]
}
const avatarInput = ref<HTMLInputElement>()
const avatarUploading = ref(false)

// --- 工具函数 ---
function formatDate(dateStr?: string): string {
  if (!dateStr) return '未知'
  const d = new Date(dateStr)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseCsv(csv?: string): string[] {
  if (!csv) return []
  return csv.split(',').map(s => s.trim()).filter(Boolean)
}

function toCsv(arr: string[]): string {
  return arr.join(',')
}

// --- 加载数据 ---
async function loadProfile() {
  try {
    const res = await userApi.getProfile()
    const data = res.data.data
    Object.assign(profile, data)
    // 同步更新 auth store 中的用户信息（触发 sidebar 响应式更新）
    if (auth.user) {
      auth.user.id = data.id || auth.user.id
      auth.user.username = data.username || ''
      auth.user.nickname = data.nickname || ''
      auth.user.avatar = data.avatar || ''
    }
    if (data.id) localStorage.setItem('userId', String(data.id))
    if (data.username) localStorage.setItem('username', data.username)
    // 持久化到 localStorage（页面刷新后 sidebar 也能恢复）
    if (data.nickname) localStorage.setItem('nickname', data.nickname)
    if (data.avatar) localStorage.setItem('avatar', data.avatar)
  } catch {
    ElMessage.error('加载用户信息失败')
  }
}

async function loadPreferences() {
  try {
    const res = await userApi.getPreferences()
    const data = res.data.data
    preferences.interestCategories = parseCsv(data.interestCategories)
    preferences.cuisinePreferences = parseCsv(data.cuisinePreferences)
    preferences.travelMode = data.travelMode || 'MIXED'
  } catch {
    // 偏好设置可能尚未创建，静默处理
  }
}

// --- 头像上传 ---
async function onAvatarChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  if (!file.type.startsWith('image/')) {
    ElMessage.warning('请选择图片文件')
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    ElMessage.warning('图片大小不能超过 5MB')
    return
  }
  avatarUploading.value = true
  try {
    const formData = new FormData()
    formData.append('file', file)
    const res = await apiClient.post('/files/upload', formData)
    const url = res.data.data?.url
    if (url) {
      editForm.avatar = url
    }
  } catch {
    ElMessage.error('头像上传失败')
  } finally {
    avatarUploading.value = false
    // Clear input so re-selecting same file triggers change
    input.value = ''
  }
}

// --- 保存操作 ---
async function handleSaveProfile() {
  if (!editFormRef.value) return
  await editFormRef.value.validate(async (valid) => {
    if (!valid) return
    savingProfile.value = true
    try {
      const res = await userApi.updateProfile({
        nickname: editForm.nickname || undefined,
        username: editForm.username || undefined,
        email: editForm.email || undefined,
        avatar: editForm.avatar || undefined
      })
      const data = res.data.data
      Object.assign(profile, data)
      if (auth.user) {
        auth.user.id = data.id || auth.user.id
        auth.user.nickname = data.nickname || ''
        auth.user.username = data.username || ''
        auth.user.avatar = data.avatar || ''
      }
      if (data.id) localStorage.setItem('userId', String(data.id))
      if (data.username) localStorage.setItem('username', data.username)
      // Sync to localStorage
      if (data.nickname) localStorage.setItem('nickname', data.nickname)
      if (data.avatar) localStorage.setItem('avatar', data.avatar)
      // If backend returned a new token (username changed), update it
      if ((data as any).token) {
        localStorage.setItem('accessToken', (data as any).token)
        ElMessage.success('用户名已修改')
      } else {
        ElMessage.success('资料更新成功')
      }
      showEditDialog.value = false
    } catch (e: any) {
      console.error('Profile update error:', e)
      const msg = e?.response?.data?.message || e?.message || '更新资料失败'
      ElMessage.error(msg)
    } finally {
      savingProfile.value = false
    }
  })
}

async function handleSavePreferences() {
  savingPreferences.value = true
  try {
    await userApi.updatePreferences({
      interestCategories: toCsv(preferences.interestCategories),
      cuisinePreferences: toCsv(preferences.cuisinePreferences),
      travelMode: preferences.travelMode || undefined
    })
    ElMessage.success('偏好设置已保存')
  } catch {
    ElMessage.error('保存偏好设置失败')
  } finally {
    savingPreferences.value = false
  }
}

// --- 退出登录 ---
function handleLogout() {
  auth.logout()
  router.push('/login')
}

// --- 打开编辑弹窗时初始化表单 ---
watch(showEditDialog, (val) => {
  if (val) {
    editForm.nickname = profile.nickname || ''
    editForm.username = profile.username || ''
    editForm.email = profile.email || ''
    editForm.avatar = profile.avatar || ''
  }
})

// --- 生命周期 ---
onMounted(() => {
  loadProfile()
  loadPreferences()
})
</script>

<style scoped>
.profile-page {
  max-width: 800px;
  margin: 0 auto;
  padding: 24px 16px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ── Frosted glass cards ── */
.profile-card :deep(.el-card__body),
.preferences-card :deep(.el-card__body),
.nav-card :deep(.el-card__body) {
  background: transparent;
}

/* 个人资料卡片 */
.profile-card .profile-header {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
}

.profile-avatar {
  flex-shrink: 0;
  background: var(--grad-primary);
  color: #fff;
  font-size: 32px;
  font-weight: 600;
}

.profile-meta {
  flex: 1;
  min-width: 180px;
}

.profile-nickname {
  margin: 0 0 4px 0;
  font-size: 22px;
  font-weight: 600;
  color: var(--text-primary);
}

.profile-username {
  margin: 0;
  font-size: 14px;
  color: var(--text-secondary);
}

.profile-email-tag {
  margin-top: 6px;
}

.edit-btn {
  flex-shrink: 0;
  margin-left: auto;
}

/* ── Avatar upload ── */
.avatar-upload {
  position: relative;
  width: 120px;
  height: 120px;
  border: 1px solid var(--frosted-border);
  border-radius: 50%;
  overflow: hidden;
  cursor: pointer;
  box-shadow: var(--neu-shadow);
  background: var(--frosted-bg);
}
.avatar-upload:hover { transform: translateY(-2px); box-shadow: var(--neu-shadow); }
.avatar-preview { width: 100%; height: 100%; object-fit: cover; }
.avatar-placeholder {
  width: 100%; height: 100%;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 4px; color: var(--text-secondary); font-size: 12px;
}
.upload-icon { font-size: 28px; }
.avatar-uploading-overlay {
  position: absolute; inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: 14px; font-weight: 600;
}

/* ── Preference / nav card headers ── */
.preferences-card .card-header,
.nav-card .card-header {
  display: flex;
  align-items: center;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.preferences-form {
  padding: 4px 0;
}

.preferences-form .el-checkbox-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
}

/* ── Quick nav ── */
.nav-links {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.nav-link-btn {
  flex: 1;
  min-width: 140px;
  height: 56px;
  font-size: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid var(--frosted-border);
  border-radius: var(--radius-card);
  background: var(--frosted-bg);
  color: var(--text-regular);
  transition: all 0.25s cubic-bezier(0.23, 1, 0.32, 1);
}

.nav-link-btn:hover {
  border-color: rgba(255,255,255,0.12);
  background: rgba(255,255,255,0.08);
  color: var(--text-primary);
  transform: translateY(-2px);
  box-shadow: var(--neu-shadow-sm);
}

.nav-icon { font-size: 20px; }

.uid-text {
  font-family: 'Courier New', monospace;
  font-weight: 700;
  color: var(--text-secondary);
  letter-spacing: 1px;
}

/* ── Logout ── */
.logout-section {
  display: flex;
  justify-content: center;
  padding-top: 8px;
}
</style>
