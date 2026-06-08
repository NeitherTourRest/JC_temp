<template>
  <DefaultLayout>
    <div class="home-page">
      <!-- Hero -->
      <section class="hero glass">
        <div class="hero-content">
          <h1>探索昌平，发现精彩</h1>
          <p>发现昌平的美食、景点、游记与出行路线</p>
          <div class="hero-search">
            <el-input v-model="searchKeyword" size="large" placeholder="搜索景点、美食、游记..." clearable @keyup.enter="handleSearch">
              <template #append><el-button type="primary" @click="handleSearch">搜索</el-button></template>
            </el-input>
          </div>
        </div>
      </section>

      <!-- Stats -->
      <section class="stats-bar">
        <div class="stat-item glass-sm" v-for="st in statItems" :key="st.label">
          <span class="stat-num">{{ st.value }}</span>
          <span class="stat-label">{{ st.label }}</span>
        </div>
      </section>

      <!-- Loading / Error states -->
      <div v-if="pageLoading" class="loading-msg">
        <span class="loading-spinner"></span>
        <span>Loading dashboard...</span>
      </div>
      <div v-else-if="pageError" class="error-msg">
        <span class="error-icon">⚠️</span>
        <span>{{ pageError }}</span>
        <el-button size="small" @click="loadAll">Retry</el-button>
      </div>
      <template v-else>
        <!-- Categories -->
        <section class="section">
          <h2>分类浏览</h2>
          <div class="cat-grid">
            <div v-for="item in categories" :key="item.name" class="cat-card glass-sm" @click="$router.push(item.path)">
              <div class="cat-icon" :style="{ background: item.color }">{{ item.icon }}</div>
              <span>{{ item.name }}</span>
            </div>
          </div>
        </section>

        <!-- Featured Spots -->
        <section class="section">
          <div class="section-header">
            <h2>热门景点</h2>
            <el-button text type="primary" @click="$router.push('/spots')">查看全部</el-button>
          </div>
          <div v-if="!featuredSpots.length" class="empty-inline">
            <span>No spots available yet.</span>
          </div>
          <div v-else class="h-scroll">
            <div v-for="s in featuredSpots" :key="s.id" class="h-card glass-sm" @click="$router.push('/spots/' + s.id)">
              <div class="h-card-img" :style="{ background: colors[s.id % colors.length] }">
                <span class="h-badge">{{ s.category }}</span>
              </div>
              <div class="h-card-body">
                <h4>{{ s.name }}</h4>
                <span class="h-rating">⭐ {{ s.avgRating?.toFixed(1) || '—' }}</span>
              </div>
            </div>
          </div>
        </section>

        <!-- Recent Diaries -->
        <section class="section">
          <div class="section-header">
            <h2>最新游记</h2>
            <el-button text type="primary" @click="$router.push('/diaries')">查看全部</el-button>
          </div>
          <div v-if="!recentDiaries.length" class="empty-inline">
            <span>No diaries yet — be the first to write one!</span>
          </div>
          <div v-else class="diary-list">
            <div v-for="d in recentDiaries" :key="d.id" class="diary-card glass-sm" @click="$router.push('/diaries/' + d.id)">
              <div class="diary-img" v-if="d.images?.length"><img :src="d.images[0]" alt="" /></div>
              <div class="diary-img-placeholder" v-else>📝</div>
              <div class="diary-body">
                <h4>{{ d.title }}</h4>
                <p>{{ (d.content || '').substring(0, 120) }}{{ (d.content || '').length > 120 ? '...' : '' }}</p>
                <div class="diary-footer">
                  <span>⭐ {{ d.avgRating?.toFixed(1) || '—' }}</span>
                  <span>{{ d.createdAt ? d.createdAt.substring(0, 10) : '' }}</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </template>
    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import { diaryApi } from '@/api/diaryApi'
import { spotApi } from '@/api/spotApi'
import type { SpotResponse, DiaryResponse } from '@/types/api'

const searchKeyword = ref('')
const featuredSpots = ref<SpotResponse[]>([])
const recentDiaries = ref<DiaryResponse[]>([])
const pageLoading = ref(true)
const pageError = ref('')
const stats = ref({ spots: 0, diaries: 0 })

const statItems = computed(() => [
  { value: stats.value.spots || '—', label: '景点' },
  { value: stats.value.diaries || '—', label: '游记' },
  { value: '10+', label: '用户' },
])

const colors = ['#4fc3f7', '#81c784', '#ffb74d', '#e57373', '#ba68c8', '#4db6ac']
const categories = [
  { name: '景点', path: '/spots', icon: '🏞️', color: '#e3f2fd' },
  { name: '美食', path: '/foods', icon: '🍜', color: '#fff3e0' },
  { name: '游记', path: '/diaries', icon: '📓', color: '#e8f5e9' },
  { name: '导航', path: '/navigation', icon: '🗺️', color: '#fce4ec' },
  { name: 'AI', path: '/ai/chat', icon: '🤖', color: '#f3e5f5' },
]

function handleSearch() {
  if (searchKeyword.value.trim()) {
    window.location.href = '/spots?keyword=' + encodeURIComponent(searchKeyword.value)
  }
}

async function loadAll() {
  pageLoading.value = true
  pageError.value = ''
  try {
    const [s, d] = await Promise.all([
      spotApi.search({ size: 8 }).catch(() => null),
      diaryApi.list({ size: 5 }).catch(() => null),
    ])
    if (s?.data?.data?.content) featuredSpots.value = s.data.data.content
    if (d?.data?.data?.content) recentDiaries.value = d.data.data.content

    const sc = await spotApi.search({ size: 1 }).catch(() => null)
    if (sc?.data?.data?.totalElements != null) stats.value.spots = sc.data.data.totalElements
    if (d?.data?.data?.totalElements != null) stats.value.diaries = d.data.data.totalElements
  } catch (e: any) {
    pageError.value = e?.message || 'Failed to load dashboard data.'
  } finally {
    pageLoading.value = false
  }
}

onMounted(loadAll)
</script>

<style scoped>
.home-page { max-width: 1200px; margin: 0 auto; }

/* ── Hero ── */
.hero {
  min-height: 320px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--pop-yellow), var(--pop-pink), var(--pop-blue));
  margin-bottom: 20px;
  cursor: default;
}
.hero:hover { transform: none; box-shadow: 6px 6px 0 #000; }
.hero-content { text-align: center; padding: 40px 20px; }
.hero-content h1 {
  font-size: 2.2rem;
  font-weight: 800;
  margin: 0 0 6px;
  color: #000;
  text-shadow: 2px 2px 0 rgba(255,255,255,0.3);
  letter-spacing: 1px;
}
.hero-content p { color: #000; opacity: 0.7; margin-bottom: 20px; font-size: 15px; }
.hero-search { max-width: 480px; margin: 0 auto; }

/* ── Stats ── */
.stats-bar { display: flex; gap: 14px; justify-content: center; margin-bottom: 28px; flex-wrap: wrap; }
.stat-item {
  text-align: center;
  padding: 18px 28px;
  min-width: 110px;
}
.stat-num { display: block; font-size: 1.6rem; font-weight: 700; color: var(--text-heading); }
.stat-label { font-size: 13px; color: var(--text-muted); display: block; margin-top: 2px; }

/* ── Sections ── */
.section { margin-bottom: 32px; }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
.section-header h2 { font-size: 1.3rem; font-weight: 700; margin: 0; }
.empty-inline { text-align: center; padding: 30px 20px; color: var(--text-muted); font-size: 13px; }

/* ── Categories ── */
.cat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 12px; }
.cat-card {
  text-align: center;
  padding: 16px 8px;
  cursor: pointer;
}
.cat-icon {
  font-size: 1.6rem;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  margin: 0 auto 8px;
  border: 2px solid #000;
}
.cat-card span { font-size: 13px; font-weight: 600; color: var(--text-heading); }

/* ── Horizontal scroll cards ── */
.h-scroll { display: flex; gap: 12px; overflow-x: auto; padding-bottom: 6px; }
.h-card { min-width: 180px; overflow: hidden; flex-shrink: 0; }
.h-card-img { height: 90px; padding: 6px; display: flex; justify-content: flex-end; align-items: flex-start; }
.h-badge {
  background: rgba(0,0,0,0.5);
  color: #fff;
  padding: 2px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.5px;
}
.h-card-body { padding: 10px 14px; }
.h-card-body h4 { margin: 0 0 4px; font-size: 14px; font-weight: 600; color: var(--text-heading); }
.h-rating { font-size: 12px; color: var(--text-muted); }

/* ── Diary list ── */
.diary-list { display: flex; flex-direction: column; gap: 12px; }
.diary-card { display: flex; overflow: hidden; }
.diary-img { width: 150px; min-height: 110px; flex-shrink: 0; }
.diary-img img { width: 100%; height: 100%; object-fit: cover; display: block; }
.diary-img-placeholder {
  width: 150px;
  min-height: 110px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  background: #f0f0f0;
  flex-shrink: 0;
  border-right: 2px solid #000;
}
.diary-body { padding: 14px 16px; flex: 1; min-width: 0; }
.diary-body h4 { margin: 0 0 6px; font-size: 1rem; font-weight: 600; color: var(--text-heading); }
.diary-body p { font-size: 13px; color: var(--text-muted); margin: 0; line-height: 1.5; }
.diary-footer { display: flex; gap: 12px; font-size: 12px; color: var(--text-muted); margin-top: 8px; }

/* ── Loading / Error ── */
.loading-msg { text-align: center; padding: 60px 20px; color: var(--text-muted); display: flex; align-items: center; justify-content: center; gap: 8px; }

/* ── Responsive ── */
@media (max-width: 768px) {
  .hero { min-height: 240px; }
  .hero-content h1 { font-size: 1.4rem; }
  .hero-content p { font-size: 13px; }
  .diary-card { flex-direction: column; }
  .diary-img, .diary-img-placeholder { width: 100%; height: 140px; border-right: none; border-bottom: 2px solid #000; }
  .stats-bar { gap: 8px; }
  .stat-item { padding: 14px 20px; min-width: 90px; }
  .h-card { min-width: 150px; }
}
</style>
