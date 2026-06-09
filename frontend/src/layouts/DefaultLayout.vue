<template>
  <div class="app-layout" style="background:var(--pop-bg)">

    <div class="layout-grid">
      <!-- Sidebar -->
      <aside class="sidebar" style="background:var(--pop-yellow);border-right:4px solid #000;border-radius:0 16px 16px 0;box-shadow:6px 0 0 #000">

        <div class="sidebar-brand">
          <h1 class="brand-title" @click="$router.push('/')" style="color:#000;text-shadow:2px 2px 0 var(--pop-pink)">JC</h1>
          <p class="brand-sub">Travel Explorer</p>
        </div>

        <nav class="sidebar-nav">
          <div class="nav-group">
            <p class="nav-group-title">Discover</p>
            <button v-for="item in navMain" :key="item.path" class="nav-btn" :class="{ active: isActive(item.path) }" @click="$router.push(item.path)">
              <span class="nav-icon">{{ item.icon }}</span><span>{{ item.label }}</span>
            </button>
          </div>
          <div class="nav-group">
            <p class="nav-group-title">Tools</p>
            <button v-for="item in navTools" :key="item.path" class="nav-btn" :class="{ active: isActive(item.path) }" @click="$router.push(item.path)">
              <span class="nav-icon">{{ item.icon }}</span><span>{{ item.label }}</span>
            </button>
          </div>
        </nav>

        <div class="sidebar-footer">
          <div class="premium-card glass-sm">
            <div class="premium-icon">⚡</div>
            <p class="premium-title">AI Travel Guide</p>
            <p class="premium-desc">Plan smarter with AI</p>
            <button class="premium-btn" @click="$router.push('/ai/chat')">Try Now</button>
          </div>
          <!-- Profile section -->
          <div class="profile-section" v-if="isLoggedIn" @click="$router.push('/profile')">
            <div class="profile-avatar" :style="avatarStyle">{{ avatarLetter }}</div>
            <div class="profile-info">
              <span class="profile-name">{{ nickname }}</span>
              <span class="profile-action">View Profile →</span>
            </div>
          </div>
          <div v-else class="profile-section guest" @click="$router.push('/login')">
            <div class="profile-avatar guest-avatar">?</div>
            <div class="profile-info">
              <span class="profile-name">Not logged in</span>
              <span class="profile-action">Login / Register →</span>
            </div>
          </div>
        </div>
      </aside>

      <!-- Main -->
      <main class="main-content">
        <div class="page-header glass-sm">
          <div><h2>{{ pageTitle }}</h2><p class="header-desc">{{ pageDesc }}</p></div>
          <div class="header-right">
            <div class="search-box">
              <span>🔍</span>
              <input v-model="q" placeholder="Search..." @keyup.enter="doSearch" />
            </div>
          </div>
        </div>
        <div class="content-area"><slot /></div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'

const route = useRoute(); const router = useRouter()
const authStore = useAuthStore()
const q = ref('')

const isLoggedIn = computed(() => authStore.isAuthenticated)
const nickname = computed(() => {
  if (authStore.user?.nickname) return authStore.user.nickname
  if (authStore.user?.username) return authStore.user.username
  return localStorage.getItem('nickname') || 'User'
})
const avatarUrl = computed(() => {
  if (authStore.user?.avatar) return authStore.user.avatar
  return localStorage.getItem('avatar') || ''
})
const avatarLetter = computed(() => nickname.value ? nickname.value.charAt(0).toUpperCase() : '?')
const avatarStyle = computed(() => avatarUrl.value ? {
  backgroundImage: 'url(' + avatarUrl.value + ')',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  color: 'transparent'
} : {})
const navMain = [
  { path: '/spots', icon: '🏞️', label: 'Spots' },
  { path: '/foods', icon: '🍜', label: 'Food' },
  { path: '/diaries', icon: '📓', label: 'Diaries' },
  { path: '/navigation', icon: '🗺️', label: 'Map' },
]
const navTools = [
  { path: '/ai/chat', icon: '🤖', label: 'AI Chat' },
  { path: '/itineraries', icon: '📋', label: 'Trips' },
]
function isActive(path: string) { return route.path.startsWith(path) }
const pageTitle = computed(() => ({ '/': 'Dashboard', '/spots': 'Spots', '/foods': 'Food', '/diaries': 'Diaries', '/navigation': 'Map', '/ai/chat': 'AI Chat' }[route.path] || 'JourneyCraft'))
const pageDesc = computed(() => ({ '/': 'Explore Changping', '/spots': 'Discover amazing places', '/foods': 'Find delicious food', '/diaries': 'Travel stories', '/navigation': 'Plan your route', '/ai/chat': 'Ask me anything' }[route.path] || ''))
function doSearch() { if (q.value.trim()) router.push('/spots?keyword=' + encodeURIComponent(q.value)) }
</script>

<style scoped>
.layout-grid { display: grid; grid-template-columns: 240px 1fr; min-height: 100vh; }
.sidebar { padding: 20px; display: flex; flex-direction: column; gap: 16px; height: 100vh; position: sticky; top: 0; overflow-y: auto; background: var(--pop-yellow); border-right: 4px solid #000; box-shadow: 6px 0 0 #000; }
.sidebar-brand { text-align: center; padding-bottom: 10px; border-bottom: 2px solid rgba(0,0,0,0.15); }
.brand-title { font-size: 1.1rem; font-weight: 700; color: #000; cursor: pointer; letter-spacing: 1px;  overflow: hidden; white-space: nowrap; }
.brand-sub { font-size: 11px; color: rgba(0,0,0,0.5); }
.sidebar-nav { flex: 1; display: flex; flex-direction: column; gap: 14px; }
.nav-group-title { font-size: 10px; font-weight: 700; color: rgba(0,0,0,0.45); letter-spacing: 2px; text-transform: uppercase; }
.nav-btn { display: flex; align-items: center; gap: 8px; width: 100%; padding: 8px 12px; background: transparent; border: 2px solid transparent; color: rgba(0,0,0,0.7); font-size: 13px; font-weight: 500; border-radius: 8px; cursor: pointer; }
.nav-btn:hover { background: rgba(0,0,0,0.05); color: #000; }
.nav-btn.active { background: #fff; color: #000; border-color: #000; box-shadow: 3px 3px 0 #000; }
.sidebar-footer { display: flex; flex-direction: column; gap: 8px; padding-top: 10px; border-top: 2px solid rgba(0,0,0,0.15); }
.premium-card { padding: 14px; text-align: center; background: rgba(255,255,255,0.5); border: 2px solid #000; border-radius: 10px; box-shadow: 3px 3px 0 #000; }
.premium-icon { font-size: 1.5rem; margin-bottom: 4px; }
.premium-title { font-size: 13px; font-weight: 600; }
.premium-desc { font-size: 11px; color: rgba(0,0,0,0.5); margin: 2px 0 8px; }
.premium-btn { width: 100%; padding: 6px; background: #000; border: none; color: #fff; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600; }

/* Profile section */
.profile-section { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border: 3px solid #000; border-radius: 10px; background: #fff; box-shadow: 3px 3px 0 #000; cursor: pointer; transition: transform 0.1s; }
.profile-section:hover { transform: translate(-1px, -1px); box-shadow: 4px 4px 0 #000; }
.profile-section.guest { background: rgba(255,255,255,0.6); }
.profile-avatar { width: 36px; height: 36px; border-radius: 50%; border: 2px solid #000; background: var(--pop-pink); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 700; flex-shrink: 0; }
.guest-avatar { background: #999; }
.profile-info { display: flex; flex-direction: column; min-width: 0; }
.profile-name { font-size: 13px; font-weight: 600; color: #000; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.profile-action { font-size: 10px; color: #999; letter-spacing: 0.3px; }

.main-content { padding: 20px; overflow-y: auto; height: 100vh; }
.page-header { display: flex; justify-content: space-between; align-items: center; padding: 14px 20px; margin-bottom: 20px; border-radius: 10px; background: #fff; border: 3px solid #000; box-shadow: 4px 4px 0 #000; }
.page-header h2 { font-size: 1.3rem; font-weight: 700; color: #000; }
.search-box { display: flex; align-items: center; background: #fff; border: 2px solid #000; border-radius: 8px; padding: 5px 10px; width: 220px; }
.search-box input { background: transparent; border: none; color: #000; font-size: 13px; width: 100%; outline: none; }
.search-box input::placeholder { color: #999; }
@media (max-width: 900px) { .layout-grid { grid-template-columns: 1fr; } .sidebar { display: none; } }
</style>