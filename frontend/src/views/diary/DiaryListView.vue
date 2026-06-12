<template>
  <DefaultLayout>
    <div class="diary-page">
      <div class="toolbar glass-sm">
        <el-input v-model="keyword" placeholder="搜索游记标题、内容、目的地…" prefix-icon="Search" clearable class="search-bar" @keyup.enter="search" @clear="fetch" />
        <el-button size="small" type="primary" @click="search">搜索</el-button>
        <div class="cat-filters">
          <button :class="['cat-btn', { active: tab === 'all' }]" @click="tab='all'; currentPage=1; fetch()">🔥 全部</button>
          <button :class="['cat-btn', { active: tab === 'mine' }]" @click="tab='mine'; currentPage=1; fetch()">📖 我的</button>
        </div>
        <div class="toolbar-right">
          <el-button type="primary" size="small" @click="$router.push('/diaries/new')">+ 写游记</el-button>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="loading-msg">
        <span class="loading-spinner"></span>
        <span>正在加载游记...</span>
      </div>

      <!-- Error -->
      <div v-else-if="errorMsg" class="error-msg">
        <span class="error-icon">⚠️</span>
        <span>{{ errorMsg }}</span>
        <el-button size="small" @click="fetch">重试</el-button>
      </div>

      <!-- Empty -->
      <div v-else-if="!diaries.length" class="empty">
        <span style="font-size:2rem;display:block;margin-bottom:12px">📝</span>
        还没有游记{{ tab === 'mine' ? ' — 快来写第一篇！' : '' }}
      </div>

      <!-- Results -->
      <div v-else class="grid">
        <div v-for="d in diaries" :key="d.id" class="card glass" @click="$router.push('/diaries/' + d.id)">
          <div v-if="d.images?.length" class="card-img"><img :src="d.images[0]" alt="" /></div>
          <div v-else class="card-img-placeholder">📝</div>
          <div class="card-body">
            <div class="card-badges">
              <span v-if="d.images?.length" class="badge badge-cyan">📷 {{ d.images.length }}</span>
              <span v-if="d.videoMeta" class="badge badge-yellow">🎬</span>
              <span v-if="d.musicUrl" class="badge badge-green">🎵</span>
            </div>
            <h3>{{ d.title }}</h3>
            <p class="card-desc">{{ (d.content || '').substring(0, 100) }}{{ (d.content || '').length > 100 ? '...' : '' }}</p>
            <div class="card-foot">
              <span>⭐ {{ d.avgRating?.toFixed(1) || '—' }}</span>
              <span>👁 {{ d.popularity }}</span>
              <span>{{ d.createdAt?.substring(0,10) || '' }}</span>
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
import { diaryApi } from '@/api/diaryApi'
import type { DiaryResponse } from '@/types/api'

const diaries = ref<DiaryResponse[]>([])
const loading = ref(false)
const errorMsg = ref('')
const tab = ref('all')
const keyword = ref('')
const currentPage = ref(1)
const pageSize = ref(12)
const total = ref(0)

function search() {
  if (keyword.value.trim()) {
    tab.value = 'all'
  }
  currentPage.value = 1
  errorMsg.value = ''
  fetch()
}

async function fetch() {
  loading.value = true
  errorMsg.value = ''
  try {
    const kw = keyword.value.trim()
    if (kw) {
      const r = await diaryApi.search(kw, currentPage.value - 1, pageSize.value)
      diaries.value = r.data.data?.content || []
      total.value = r.data.data?.totalElements || 0
    } else if (tab.value === 'mine') {
      const r = await diaryApi.mine({ page: currentPage.value - 1, size: pageSize.value })
      diaries.value = r.data.data?.content || []
      total.value = r.data.data?.totalElements || 0
    } else {
      const r = await diaryApi.list({ page: currentPage.value - 1, size: pageSize.value })
      diaries.value = r.data.data?.content || []
      total.value = r.data.data?.totalElements || 0
    }
  } catch (e: any) {
    errorMsg.value = e?.message || '加载游记失败，请稍后重试。'
    diaries.value = []
  } finally {
    loading.value = false
  }
}

onMounted(fetch)
</script>

<style scoped>
.diary-page { padding: 0; }

.toolbar {
  padding: 12px 16px;
  margin-bottom: 16px;
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}
.toolbar-right { display: flex; gap: 8px; align-items: center; }

.tabs { display: flex; gap: 4px; }
.search-bar { width: 260px; flex-shrink: 0; }
.cat-filters { display: flex; gap: 4px; flex-wrap: wrap; }
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

.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 14px; }
.card { overflow: hidden; cursor: pointer; }
.card:hover { transform: translateY(-3px); }
.card-img { height: 160px; overflow: hidden; border-bottom: 1px solid var(--frosted-border); }
.card-img img { width: 100%; height: 100%; object-fit: cover; display: block; }
.card-img-placeholder {
  height: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
  background: var(--frosted-bg);
  border-bottom: 1px solid var(--frosted-border);
}
.card-body { padding: 14px; }
.card-badges { display: flex; gap: 6px; margin-bottom: 8px; }
.badge { padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; border: 1px solid var(--frosted-border); }
.badge-cyan { background: rgba(91,141,239,0.18); color: var(--pop-blue); }
.badge-yellow { background: rgba(167,111,215,0.18); color: var(--pop-yellow); }
.badge-green { background: rgba(58,210,159,0.18); color: var(--pop-green); }
.card-body h3 { font-size: 1rem; font-weight: 600; margin: 0 0 4px; color: var(--text-heading); }
.card-desc { font-size: 12px; color: var(--text-secondary); line-height: 1.4; margin: 4px 0; }
.card-foot { display: flex; gap: 10px; font-size: 12px; color: var(--text-secondary); margin-top: 8px; }

.loading-msg, .empty {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-muted);
  font-size: 14px;
}
.loading-msg { display: flex; align-items: center; justify-content: center; gap: 8px; }

@media (max-width: 768px) {
  .grid { grid-template-columns: 1fr; }
  .toolbar { flex-direction: column; align-items: stretch; }
  .toolbar-right { flex-direction: column; }
}
</style>
