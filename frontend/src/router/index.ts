import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/login', name: 'Login', meta: { requiresAuth: false }, component: () => import('@/views/auth/LoginView.vue') },
  { path: '/register', name: 'Register', meta: { requiresAuth: false }, component: () => import('@/views/auth/RegisterView.vue') },
  { path: '/', name: 'Home', meta: { requiresAuth: false }, component: () => import('@/views/home/HomeView.vue') },
  { path: '/spots', name: 'Spots', meta: { requiresAuth: false }, component: () => import('@/views/spot/SpotListView.vue') },
  { path: '/spots/:id', name: 'SpotDetail', meta: { requiresAuth: false }, component: () => import('@/views/spot/SpotDetailView.vue') },
  { path: '/diaries', name: 'Diaries', meta: { requiresAuth: false }, component: () => import('@/views/diary/DiaryListView.vue') },
  { path: '/diaries/new', name: 'DiaryNew', meta: { requiresAuth: true }, component: () => import('@/views/diary/DiaryEditorView.vue') },
  { path: '/navigation', name: 'Navigation', meta: { requiresAuth: false }, component: () => import('@/views/navigation/NavigationView.vue') },
  { path: '/shops', name: 'Shops', meta: { requiresAuth: false }, component: () => import('@/views/shop/ShopSearchView.vue') },
  { path: '/shops/:id', name: 'ShopDetail', meta: { requiresAuth: false }, component: () => import('@/views/shop/ShopDetailView.vue') },
  { path: '/foods', redirect: '/shops' },
  { path: '/foods/:id', redirect: '/shops' },
  { path: '/profile', name: 'Profile', meta: { requiresAuth: true }, component: () => import('@/views/profile/ProfileView.vue') },
  { path: '/diaries/:id', name: 'DiaryDetail', meta: { requiresAuth: false }, component: () => import('@/views/diary/DiaryDetailView.vue') },
  { path: '/diaries/:id/edit', name: 'DiaryEdit', meta: { requiresAuth: true }, component: () => import('@/views/diary/DiaryEditorView.vue') },
  { path: '/favorites', name: 'Favorites', meta: { requiresAuth: true }, component: () => import('@/views/profile/FavoritesView.vue') },
  { path: '/history', name: 'History', meta: { requiresAuth: true }, component: () => import('@/views/profile/HistoryView.vue') },
  { path: '/itineraries', name: 'Itineraries', meta: { requiresAuth: true }, component: () => import('@/views/itinerary/ItineraryListView.vue') },
  { path: '/ai/chat', name: 'AIChat', meta: { requiresAuth: false }, component: () => import('@/views/ai/AIChatView.vue') },
  { path: '/ai/plan', name: 'AIPlan', meta: { requiresAuth: false }, component: () => import('@/views/ai/AIPlanView.vue') },
  { path: '/ai/budget', name: 'AIBudget', meta: { requiresAuth: false }, component: () => import('@/views/ai/AIBudgetView.vue') },
  // Indoor navigation is now integrated into /navigation view via AMap marker popup
  // { path: '/indoor', name: 'Indoor', meta: { requiresAuth: false }, component: () => import('@/views/indoor/IndoorNavigationView.vue') },
]

const router = createRouter({ history: createWebHistory(), routes })

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('accessToken')
  if (to.meta.requiresAuth && !token) {
    next({ path: '/login', query: { redirect: to.fullPath } })
  } else {
    next()
  }
})

export default router