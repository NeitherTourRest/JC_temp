<template>
  <div class="app-shell">

    <!-- ═══ Top Navigation Bar (haowallpaper-style) ═══ -->
    <header class="main-top">
      <!-- Logo -->
      <div class="main-top-logo" @click="$router.push('/')">
        <div class="logo-icon">🧳</div>
        <span class="logo-text">JC</span>
      </div>

      <!-- Navigation tabs -->
      <nav class="main-top-nav" ref="navRef">
        <div class="tab-slider" :style="sliderStyle"></div>
        <button v-for="(item, i) in navItems" :key="item.path"
          ref="btnRefs"
          class="top-nav-btn" :class="{ active: isActive(item.path) }"
          @click="$router.push(item.path)">
          <span class="tnav-icon">{{ item.icon }}</span>
          <span class="tnav-label">{{ item.label }}</span>
        </button>
      </nav>

      <!-- Right: Search + Profile -->
      <div class="main-top-right">
        <div class="top-search-box">
          <span class="search-icon">🔍</span>
          <input v-model="q" placeholder="Search spots..." @keyup.enter="doSearch" />
        </div>

        <!-- Profile -->
        <div v-if="isLoggedIn" class="top-profile" @click="$router.push('/profile')">
          <div class="top-avatar" :style="avatarStyle">{{ avatarLetter }}</div>
          <span class="top-username">{{ nickname }}</span>
        </div>
        <button v-else class="top-login-btn" @click="$router.push('/login')">Login</button>
      </div>
    </header>

    <!-- ═══ Page Header ═══ -->
    <div class="page-header-area">
      <div class="ph-left">
        <h2 class="ph-title">{{ pageTitle }}</h2>
        <p class="ph-desc">{{ pageDesc }}</p>
      </div>
    </div>

    <!-- ═══ Main Content ═══ -->
    <main class="main-content-area">
      <slot />
    </main>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'

const route = useRoute(); const router = useRouter()
const authStore = useAuthStore()
const q = ref('')
const navRef = ref<HTMLElement | null>(null)
const btnRefs = ref<HTMLElement[]>([])

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

const navItems = [
  { path: '/spots', icon: '🏞️', label: 'Spots' },
  { path: '/foods', icon: '🍜', label: 'Food' },
  { path: '/diaries', icon: '📓', label: 'Diaries' },
  { path: '/navigation', icon: '🗺️', label: 'Map' },
  { path: '/itineraries', icon: '📋', label: 'Trips' },
  { path: '/ai/chat', icon: '🤖', label: 'AI' },
]

function isActive(path: string) { return route.path.startsWith(path) }

function doSearch() {
  if (q.value.trim()) router.push('/spots?keyword=' + encodeURIComponent(q.value))
}

const pageTitle = computed(() => ({
  '/': 'Dashboard', '/spots': 'Spots', '/foods': 'Food',
  '/diaries': 'Diaries', '/navigation': 'Map', '/ai/chat': 'AI Chat',
  '/itineraries': 'Trips', '/profile': 'Profile'
}[route.path] || 'JourneyCraft'))

const pageDesc = computed(() => ({
  '/': 'Explore Changping', '/spots': 'Discover amazing places',
  '/foods': 'Find delicious food', '/diaries': 'Travel stories',
  '/navigation': 'Plan your route', '/ai/chat': 'Ask me anything',
  '/itineraries': 'Plan your journey', '/profile': 'Your account'
}[route.path] || ''))

/* ── Tab slider — measures actual button positions for precision ── */
const activeIndex = computed(() => {
  const idx = navItems.findIndex(item => route.path.startsWith(item.path))
  return idx >= 0 ? idx : 0
})

const sliderStyle = ref<{ left: string; width: string }>({
  left: '0',
  width: '0',
})

function updateSlider() {
  const nav = navRef.value
  const btns = btnRefs.value
  if (!nav || !btns.length) return
  const idx = Math.min(activeIndex.value, btns.length - 1)
  const btn = btns[idx]
  if (!btn) return
  const navRect = nav.getBoundingClientRect()
  const btnRect = btn.getBoundingClientRect()
  sliderStyle.value = {
    left: `${btnRect.left - navRect.left}px`,
    width: `${btnRect.width}px`,
  }
}

watch(activeIndex, () => nextTick(updateSlider), { immediate: true })
watch(() => route.path, () => nextTick(updateSlider))
</script>

<style scoped>
/* ── Shell ── */
.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* ═══ TOP NAV (haowallpaper main-top style) ═══ */
.main-top {
  position: sticky;
  top: 12px;
  z-index: 100;
  margin: 12px 20px 0;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 8px 6px 14px;
  background: var(--frosted-bg);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border: 1px solid var(--frosted-border);
  border-radius: 50px;
  box-shadow: var(--neu-shadow);
  min-height: 50px;
}

/* Logo — simple inline, no separate card */
.main-top-logo {
  display: flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  flex-shrink: 0;
  padding: 4px 6px;
  border-radius: 30px;
  transition: background 0.2s ease;
}
.main-top-logo:hover {
  background: rgba(255,255,255,0.06);
}
.logo-icon { font-size: 20px; }
.logo-text {
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 2px;
  background: linear-gradient(135deg, #a76fd7, #7cd7ee);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* Nav tabs — button group with flex-equal items for precise slider alignment */
.main-top-nav {
  display: flex;
  align-items: center;
  flex: 1;
  padding: 3px;
  background: rgba(30, 28, 28, 0.4) !important;
  border-radius: 40px !important;
  position: relative;
  overflow: hidden;
  min-width: 0;
}

/* Sliding pill indicator — measured via JS for pixel-perfect alignment */
.tab-slider {
  position: absolute;
  top: 3px;
  height: calc(100% - 6px);
  background: rgba(255,255,255,0.1);
  border-radius: 35px;
  transition: left 0.4s cubic-bezier(0.23, 1, 0.32, 1),
              width 0.4s cubic-bezier(0.23, 1, 0.32, 1);
  pointer-events: none;
  z-index: 0;
}

.top-nav-btn {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 7px 10px;
  border: none;
  border-radius: 30px;
  background: transparent;
  color: rgba(200,200,200,0.7);
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: color 0.25s cubic-bezier(0.23, 1, 0.32, 1),
              background 0.25s ease;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}
.top-nav-btn:hover {
  color: #e8e8e8;
  background: rgba(255,255,255,0.06);
}
.top-nav-btn.active {
  color: #e8e8e8;
}

.tnav-icon { font-size: 15px; }
.tnav-label { font-weight: 600; }

/* Right section */
.main-top-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

/* Search */
.top-search-box {
  display: flex;
  align-items: center;
  gap: 5px;
  background: var(--search-bg);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: var(--radius-search);
  padding: 4px 14px;
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  box-shadow: var(--search-shadow);
  transition: all 0.2s ease;
  min-height: 2rem;
}
.top-search-box:focus-within {
  border-color: rgba(124,215,238,0.4);
  box-shadow: 0 0 0 3px rgba(124,215,238,0.1), var(--search-shadow);
}
.search-icon { font-size: 13px; opacity: 0.6; }
.top-search-box input {
  background: transparent;
  border: none;
  color: #e8e8e8;
  font-size: 12px;
  font-family: inherit;
  outline: none;
  width: 120px;
}
.top-search-box input::placeholder { color: rgba(200,200,200,0.4); }

/* Profile */
.top-profile {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  padding: 3px 10px 3px 3px;
  border-radius: 30px;
  transition: background 0.2s ease;
}
.top-profile:hover { background: rgba(255,255,255,0.06); }
.top-avatar {
  width: 30px; height: 30px;
  border-radius: 50%;
  background: linear-gradient(135deg, #a76fd7, #7cd7ee);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  flex-shrink: 0;
}
.top-username {
  font-size: 12px;
  font-weight: 500;
  color: #c8c8c8;
  max-width: 10ch;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.top-login-btn {
  background: linear-gradient(135deg, #a76fd7, #7cd7ee);
  color: #fff;
  border: none;
  border-radius: 30px;
  padding: 7px 16px;
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 0 16px rgba(124,215,238,0.2);
}
.top-login-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 0 24px rgba(124,215,238,0.35);
}

/* ═══ Page Header ═══ */
.page-header-area {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px 12px;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}
.ph-title {
  font-size: 22px;
  font-weight: 700;
  color: #e8e8e8;
  margin: 0;
}
.ph-desc {
  font-size: 13px;
  color: rgba(200,200,200,0.5);
  margin: 2px 0 0;
}

/* ═══ Main Content ═══ */
.main-content-area {
  flex: 1;
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
  padding: 0 24px 40px;
}

/* ═══ Responsive ═══ */
@media (max-width: 900px) {
  .main-top {
    flex-wrap: wrap;
    border-radius: 20px;
    padding: 6px 10px;
    gap: 6px;
  }
  .main-top-nav {
    order: 3;
    width: 100%;
    overflow-x: auto;
    justify-content: flex-start;
  }
  .top-nav-btn {
    padding: 6px 10px;
    font-size: 12px;
  }
  .tnav-label { display: none; }
  .top-search-box input { width: 80px; }
  .top-username { display: none; }
  .page-header-area { padding: 14px 16px 10px; }
  .main-content-area { padding: 0 12px 24px; }
}
</style>
