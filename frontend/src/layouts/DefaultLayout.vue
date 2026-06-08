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
          <button v-if="!isLoggedIn" class="nav-btn" @click="$router.push('/login')">Login</button>
          <button v-else class="nav-btn" @click="$router.push('/profile')">Profile</button>
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

const route = useRoute(); const router = useRouter()
const q = ref('')
const isLoggedIn = !!localStorage.getItem('accessToken')
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
.main-content { padding: 20px; overflow-y: auto; height: 100vh; }
.page-header { display: flex; justify-content: space-between; align-items: center; padding: 14px 20px; margin-bottom: 20px; border-radius: 10px; background: #fff; border: 3px solid #000; box-shadow: 4px 4px 0 #000; }
.page-header h2 { font-size: 1.3rem; font-weight: 700; color: #000; }
.search-box { display: flex; align-items: center; background: #fff; border: 2px solid #000; border-radius: 8px; padding: 5px 10px; width: 220px; }
.search-box input { background: transparent; border: none; color: #000; font-size: 13px; width: 100%; outline: none; }
.search-box input::placeholder { color: #999; }
@media (max-width: 900px) { .layout-grid { grid-template-columns: 1fr; } .sidebar { display: none; } }
</style>