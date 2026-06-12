<template>
  <DefaultLayout>
    <div class="spots-page">
      <div class="toolbar glass-sm">
        <el-input v-model="keyword" placeholder="搜索景点名称、地址、描述…" prefix-icon="Search" clearable class="search-bar" @keyup.enter="search" @clear="fetch" />
        <el-button size="small" type="primary" @click="search">搜索</el-button>
        <div class="cat-filters">
          <button v-for="c in cats" :key="c" :class="['cat-btn', { active: activeCat === c }]" @click="filterCat(c)">{{ c }}</button>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="loading-msg">
        <span class="loading-spinner"></span>
        <span>正在加载景点...</span>
      </div>

      <!-- Error -->
      <div v-else-if="errorMsg" class="error-msg">
        <span class="error-icon">⚠️</span>
        <span>{{ errorMsg }}</span>
        <el-button size="small" @click="fetch">重试</el-button>
      </div>

      <!-- Empty -->
      <div v-else-if="!spots.length" class="empty-msg">
        <span style="font-size:2rem;display:block;margin-bottom:12px">📍</span>
        没有找到景点{{ keyword ? ' for "' + keyword + '"' : '' }}{{ activeCat !== 'All' ? ' in ' + activeCat : '' }}
      </div>

      <!-- Results -->
      <div v-else class="spots-grid">
        <div v-for="s in spots" :key="s.id" class="spot-card glass" @click="$router.push('/spots/' + s.id)">
          <div class="spot-cover" :style="{ backgroundImage: s.imageUrl ? `url(${s.imageUrl})` : 'none' }">
            <div class="spot-cover-overlay" />
            <div class="spot-cover-content">
              <span class="spot-cat-tag">{{ s.category }}</span>
              <h3>{{ s.name }}</h3>
            </div>
          </div>
          <div class="spot-body">
            <p class="spot-desc">{{ (s.description || '').substring(0, 80) }}{{ (s.description || '').length > 80 ? '...' : '' }}</p>
            <div class="spot-foot">
              <span class="spot-rating">⭐ {{ s.avgRating?.toFixed(1) || '—' }}</span>
              <span>👁 {{ s.popularity || '—' }}</span>
              <span v-if="s.address" class="spot-addr">📍 {{ s.address?.substring(0, 18) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="total > pageSize" class="pagination-wrap">
        <el-pagination
          v-model:current-page="currentPage"
          :page-size="pageSize"
          :total="total"
          layout="prev, pager, next"
          @current-change="fetch"
        />
      </div>
    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import { spotApi } from '@/api/spotApi'
import type { SpotResponse } from '@/types/api'

const spots = ref<SpotResponse[]>([])
const loading = ref(false)
const errorMsg = ref('')
const keyword = ref('')
const activeCat = ref('All')
const cats = ['All', '景点', '校园', '餐厅', '商场', '公园', '博物馆', '酒店', '体育场馆']
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)

async function fetch() {
  loading.value = true
  errorMsg.value = ''
  try {
    const p: Record<string, any> = { page: currentPage.value - 1, size: pageSize.value }
    if (keyword.value.trim()) p.keyword = keyword.value.trim()
    if (activeCat.value !== 'All') p.category = activeCat.value
    const r = await spotApi.search(p)
    spots.value = r.data.data?.content || []
    total.value = r.data.data?.totalElements || 0
  } catch (e: any) {
    errorMsg.value = e?.message || '加载景点失败，请重试。'
    spots.value = []
  } finally {
    loading.value = false
  }
}
function search() { currentPage.value = 1; errorMsg.value = ''; fetch() }
function filterCat(c: string) { activeCat.value = c; currentPage.value = 1; errorMsg.value = ''; fetch() }
onMounted(fetch)
</script>

<style scoped>
.spots-page { padding: 0; }

.toolbar {
  padding: 12px 16px;
  margin-bottom: 16px;
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.cat-filters { display: flex; gap: 4px; flex-wrap: wrap; }
.search-bar { width: 260px; flex-shrink: 0; }
.cat-btn {
  padding: 3px 12px;
  background: var(--frosted-bg);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  border: 1px solid var(--frosted-border);
  color: var(--text-regular);
  border-radius: var(--radius-pill);
  font-size: 11px;
  cursor: pointer;
  font-family: inherit;
  font-weight: 500;
  transition: all 0.2s ease;
  box-shadow: var(--neu-shadow-sm);
}
.cat-btn:hover { transform: translateY(-1px); color: var(--text-primary); }
.cat-btn.active { background: rgba(167,111,215,0.2); color: #fff; border-color: rgba(167,111,215,0.35); }

.loading-msg, .empty-msg {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-muted);
  font-size: 14px;
}
.loading-msg { display: flex; align-items: center; justify-content: center; gap: 8px; }

.spots-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 14px; }
.spot-card { overflow: hidden; display: flex; flex-direction: column; }
.spot-cover {
  position: relative; min-height: 160px;
  background-size: cover !important; background-position: center !important;
  display: flex; align-items: flex-end;
}
.spot-cover-overlay {
  position: absolute; inset: 0;
  background: linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 50%);
  pointer-events: none;
}
.spot-cover-content {
  position: relative; z-index: 1;
  padding: 14px; width: 100%;
}
.spot-cover-content h3 {
  font-size: 1.1rem; font-weight: 700; color: #fff; margin: 4px 0 0;
  text-shadow: 0 2px 6px rgba(0,0,0,0.5);
}
.spot-body { padding: 12px 14px; flex: 1; }
.spot-cat-tag {
  display: inline-block;
  background: rgba(124,215,238,0.2);
  color: #7cd7ee;
  padding: 2px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  border: 1px solid rgba(124,215,238,0.3);
  backdrop-filter: blur(4px);
}
.spot-desc { font-size: 12px; color: var(--text-muted); margin: 0 0 8px; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.spot-foot { display: flex; gap: 10px; font-size: 12px; color: var(--text-muted); flex-wrap: wrap; }
.spot-rating { font-size: 13px; font-weight: 600; color: #ffc107; }
.spot-addr { font-size: 11px; }

.pagination-wrap {
  display: flex;
  justify-content: center;
  padding: 24px 0 12px;
}

@media (max-width: 768px) {
  .spots-grid { grid-template-columns: 1fr; }
}
</style>
