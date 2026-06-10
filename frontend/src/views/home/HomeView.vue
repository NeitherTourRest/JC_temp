<template>
  <DefaultLayout>
    <div class="home-page">
      <!-- Hero -->
      <section class="hero glass">
        <div class="hero-content">
          <h1>探索昌平，发现精彩</h1>
          <p>发现昌平的美食、景点、游记与出行路线</p>
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
        <span>正在加载首页...</span>
      </div>
      <div v-else-if="pageError" class="error-msg">
        <span class="error-icon">⚠️</span>
        <span>{{ pageError }}</span>
        <el-button size="small" @click="loadAll">重试</el-button>
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
            <span>暂无景点数据</span>
          </div>
          <div v-else class="home-container">
            <div v-for="s in featuredSpots" :key="s.id" class="hao-card" @click="$router.push('/spots/' + s.id)">
              <div class="card-img">
                <span class="card-cat-tag">{{ s.category }}</span>
              </div>
              <div class="card-overlay">
                <h4>{{ s.name }}</h4>
                <p>{{ s.description?.substring(0, 60) || '' }}</p>
              </div>
              <div class="card-bottom-bar">
                <div>⭐ {{ s.avgRating?.toFixed(1) || '—' }}</div>
                <div>{{ s.category }}</div>
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
            <span>暂无游记</span>
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

const categories = [
  { name: '景点', path: '/spots', icon: '🏞️', color: '#e3f2fd' },
  { name: '美食', path: '/foods', icon: '🍜', color: '#fff3e0' },
  { name: '游记', path: '/diaries', icon: '📓', color: '#e8f5e9' },
  { name: '导航', path: '/navigation', icon: '🗺️', color: '#fce4ec' },
  { name: 'AI', path: '/ai/chat', icon: '🤖', color: '#f3e5f5' },
]

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
    pageError.value = e?.message || '加载首页数据失败'
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
  min-height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--frosted-bg);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--frosted-border);
  border-radius: var(--radius-card);
  box-shadow: var(--neu-shadow);
  margin-bottom: 20px;
  cursor: default;
}
.hero-content { text-align: center; padding: 28px 20px; }
.hero-content h1 {
  font-size: 1.8rem;
  font-weight: 800;
  margin: 0 0 6px;
  color: var(--text-primary);
  letter-spacing: 1px;
}
.hero-content p { color: var(--text-secondary); margin-bottom: 0; font-size: 14px; }

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
  border: 1px solid var(--frosted-border);
  box-shadow: var(--neu-shadow-sm);
}
.cat-card span { font-size: 13px; font-weight: 600; color: var(--text-heading); }

/* ── hao-card scoped overrides ── */
.card-cat-tag {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(0,0,0,0.55);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  color: #e8e8e8;
  padding: 2px 12px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.5px;
  z-index: 2;
  border: 1px solid rgba(255,255,255,0.08);
}
.hao-card .card-overlay h4 {
  color: #e8e8e8;
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 6px;
  text-shadow: 2px 2px 8px rgba(0,0,0,0.6);
}
.hao-card .card-overlay p {
  font-size: 12px;
  color: rgba(255,255,255,0.7);
  text-shadow: 1px 1px 4px rgba(0,0,0,0.5);
  text-align: center;
  line-height: 1.4;
}
.hao-card .card-bottom-bar > div {
  font-size: 85%;
}
.hao-card .card-img {
  background: rgba(255,255,255,0.03);
  border-bottom: 1px solid var(--frosted-border);
}

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
  background: rgba(255,255,255,0.04);
  flex-shrink: 0;
  border-right: 1px solid var(--frosted-border);
}
.diary-body { padding: 14px 16px; flex: 1; min-width: 0; }
.diary-body h4 { margin: 0 0 6px; font-size: 1rem; font-weight: 600; color: var(--text-heading); }
.diary-body p { font-size: 13px; color: var(--text-muted); margin: 0; line-height: 1.5; }
.diary-footer { display: flex; gap: 12px; font-size: 12px; color: var(--text-muted); margin-top: 8px; }

/* ── Loading / Error ── */
.loading-msg { text-align: center; padding: 60px 20px; color: var(--text-muted); display: flex; align-items: center; justify-content: center; gap: 8px; }

/* ── Responsive ── */
@media (max-width: 768px) {
  .hero { min-height: 140px; }
  .hero-content h1 { font-size: 1.4rem; }
  .hero-content p { font-size: 13px; }
  .diary-card { flex-direction: column; }
  .diary-img, .diary-img-placeholder { width: 100%; height: 140px; border-right: none; border-bottom: 1px solid var(--frosted-border); }
  .stats-bar { gap: 8px; }
  .stat-item { padding: 14px 20px; min-width: 90px; }
}
</style>
