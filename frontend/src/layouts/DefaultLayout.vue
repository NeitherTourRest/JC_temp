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
        <div class="top-search-box" @click.stop>
          <span class="search-icon">🔍</span>
          <input v-model="q" placeholder="搜索景点、美食、游记..." @input="onSearchInput" @keydown.escape="showSearchResults=false" @focus="onSearchFocus" />
          <!-- Search Results Popup -->
          <div v-if="showSearchResults" class="search-popup glass" @click.stop>
            <div v-if="searchLoading" class="sp-center"><span class="loading-spinner"></span><span>搜索中...</span></div>
            <template v-else-if="hasResults">
              <div v-if="spots.length" class="sr-group">
                <div class="sr-group-title">🏞️ 景点</div>
                <div v-for="s in spots" :key="'s'+s.id" class="sr-item" @click="goTo('/spots/'+s.id)">
                  <div class="sr-item-img" :style="{ backgroundImage: s.imageUrl ? `url(${s.imageUrl})` : 'none' }"></div>
                  <div class="sr-item-body">
                    <div class="sr-item-name">{{ s.name }}</div>
                    <div class="sr-item-meta">{{ s.category }} · ⭐ {{ s.avgRating?.toFixed(1) || '—' }}</div>
                  </div>
                </div>
                <div class="sr-more" @click="goTo('/spots?keyword='+encodeURIComponent(q))">查看全部景点 ›</div>
              </div>
              <div v-if="shops.length" class="sr-group">
                <div class="sr-group-title">🏪 餐馆</div>
                <div v-for="s in shops" :key="'sh'+s.id" class="sr-item" @click="goTo('/shops/'+s.id)">
                  <div class="sr-item-img" :style="{ backgroundImage: s.imageUrl ? `url(${s.imageUrl})` : 'none' }"></div>
                  <div class="sr-item-body">
                    <div class="sr-item-name">{{ s.name }}</div>
                    <div class="sr-item-meta">{{ s.cuisine || '餐馆' }} · ⭐ {{ s.avgRating?.toFixed(1) || '—' }}</div>
                  </div>
                </div>
                <div class="sr-more" @click="goTo('/shops?keyword='+encodeURIComponent(q))">查看全部餐馆 ›</div>
              </div>
              <div v-if="diaries.length" class="sr-group">
                <div class="sr-group-title">📓 游记</div>
                <div v-for="d in diaries" :key="'d'+d.id" class="sr-item" @click="goTo('/diaries/'+d.id)">
                  <div class="sr-item-img" :style="{ backgroundImage: d.images?.[0] ? `url(${d.images[0]})` : 'none' }"></div>
                  <div class="sr-item-body">
                    <div class="sr-item-name">{{ d.title }}</div>
                    <div class="sr-item-meta">⭐ {{ d.avgRating?.toFixed(1) || '—' }} · 👁 {{ d.popularity }}</div>
                  </div>
                </div>
                <div class="sr-more" @click="goTo('/diaries?keyword='+encodeURIComponent(q))">查看全部游记 ›</div>
              </div>
            </template>
            <div v-else-if="q.trim() && !searchLoading" class="sp-center" style="color:var(--text-muted)">未找到相关结果</div>
          </div>
        </div>

        <!-- Profile -->
        <div v-if="isLoggedIn" class="top-profile" @click="$router.push('/profile')">
          <div class="top-avatar" :style="avatarStyle">{{ avatarLetter }}</div>
          <span class="top-username">{{ nickname }}</span>
        </div>
        <button v-else class="top-login-btn" @click="$router.push('/login')">登录</button>
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
import { searchApi } from '@/api/aiGenApi'
import type { SpotResponse, ShopResponse, DiaryResponse } from '@/types/api'

const route = useRoute(); const router = useRouter()
const authStore = useAuthStore()
const q = ref('')
const showSearchResults = ref(false)
const searchLoading = ref(false)
const spots = ref<SpotResponse[]>([])
const shops = ref<ShopResponse[]>([])
const diaries = ref<DiaryResponse[]>([])
let searchTimer: ReturnType<typeof setTimeout> | null = null
const navRef = ref<HTMLElement | null>(null)
const btnRefs = ref<HTMLElement[]>([])

const isLoggedIn = computed(() => authStore.isAuthenticated)
const nickname = computed(() => {
  if (authStore.user?.nickname) return authStore.user.nickname
  if (authStore.user?.username) return authStore.user.username
  return localStorage.getItem('nickname') || '用户'
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
  { path: '/spots', icon: '🏞️', label: '景点' },
  { path: '/shops', icon: '🏪', label: '餐馆' },
  { path: '/diaries', icon: '📓', label: '游记' },
  { path: '/navigation', icon: '🗺️', label: '地图' },
  { path: '/itineraries', icon: '📋', label: '行程' },
  { path: '/ai/chat', icon: '🤖', label: 'AI' },
]

function isActive(path: string) { return route.path.startsWith(path) }

const hasResults = computed(() => spots.value.length > 0 || shops.value.length > 0 || diaries.value.length > 0)

function onSearchInput() {
  const kw = q.value.trim()
  if (!kw) { showSearchResults.value = false; return }
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => fetchSearch(kw), 300)
}

function onSearchFocus() {
  if (q.value.trim()) fetchSearch(q.value.trim())
}

async function fetchSearch(kw: string) {
  searchLoading.value = true
  showSearchResults.value = true
  try {
    const r = await searchApi.all(kw, 5)
    const d = r.data.data
    spots.value = d?.spots || []
    shops.value = d?.shops || []
    diaries.value = d?.diaries || []
  } catch { /* ignore */ }
  finally { searchLoading.value = false }
}

function goTo(path: string) {
  showSearchResults.value = false
  q.value = ''
  router.push(path)
}

// Close popup when clicking outside
function onDocumentClick(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (!target.closest('.top-search-box')) {
    showSearchResults.value = false
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('click', onDocumentClick)
}

const pageTitle = computed(() => ({
  '/': '首页', '/spots': '景点', '/shops': '餐馆',
  '/diaries': '游记', '/navigation': '地图', '/ai/chat': 'AI 助手',
  '/itineraries': '行程规划', '/profile': '个人中心'
}[route.path] || 'JourneyCraft'))

const pageDesc = computed(() => ({
  '/': '探索昌平，发现精彩', '/spots': '发现周边的精彩景点',
  '/foods': '寻找美味的食物', '/diaries': '旅行故事',
  '/navigation': '规划你的路线', '/ai/chat': '问我任何旅行问题',
  '/itineraries': '规划你的旅程', '/profile': '你的账号信息'
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
.top-search-box { position: relative; }
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

/* ── Search Results Popup ── */
.search-popup {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  max-height: 70vh;
  overflow-y: auto;
  padding: 10px 0;
  z-index: 200;
  min-width: 360px;
}
.sp-center { padding: 20px; text-align: center; font-size: 13px; color: var(--text-regular); display: flex; align-items: center; justify-content: center; gap: 8px; }
.sr-group { padding: 4px 0; }
.sr-group + .sr-group { border-top: 1px solid var(--frosted-border); }
.sr-group-title { padding: 6px 14px 4px; font-size: 12px; font-weight: 700; color: var(--text-secondary); letter-spacing: 0.5px; }
.sr-item {
  display: flex; align-items: center; gap: 10px;
  padding: 6px 14px; cursor: pointer;
  transition: background 0.15s;
}
.sr-item:hover { background: rgba(255,255,255,0.06); }
.sr-item-img {
  width: 36px; height: 36px; border-radius: 6px; flex-shrink: 0;
  background-size: cover; background-position: center;
  background-color: rgba(255,255,255,0.04);
}
.sr-item-body { min-width: 0; flex: 1; }
.sr-item-name { font-size: 13px; font-weight: 600; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sr-item-meta { font-size: 11px; color: var(--text-muted); margin-top: 1px; }
.sr-more {
  padding: 4px 14px; font-size: 12px; color: #7cd7ee; cursor: pointer;
  transition: opacity 0.15s;
}
.sr-more:hover { opacity: 0.7; }

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
