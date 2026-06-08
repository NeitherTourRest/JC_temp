<template>
  <DefaultLayout>
    <div class="spots-page">
      <div class="toolbar glass-sm">
        <el-input v-model="keyword" placeholder="Search spots..." clearable class="search-inp" @keyup.enter="search">
          <template #prefix><span class="search-icon">🔍</span></template>
        </el-input>
        <div class="cat-filters">
          <button v-for="c in cats" :key="c" :class="['cat-btn', { active: activeCat === c }]" @click="filterCat(c)">{{ c }}</button>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="loading-msg">
        <span class="loading-spinner"></span>
        <span>Loading spots...</span>
      </div>

      <!-- Error -->
      <div v-else-if="errorMsg" class="error-msg">
        <span class="error-icon">⚠️</span>
        <span>{{ errorMsg }}</span>
        <el-button size="small" @click="fetch">Retry</el-button>
      </div>

      <!-- Empty -->
      <div v-else-if="!spots.length" class="empty-msg">
        <span style="font-size:2rem;display:block;margin-bottom:12px">📍</span>
        No spots found{{ keyword ? ' for "' + keyword + '"' : '' }}{{ activeCat !== 'All' ? ' in ' + activeCat : '' }}
      </div>

      <!-- Results -->
      <div v-else class="spots-grid">
        <div v-for="s in spots" :key="s.id" class="spot-card glass" @click="$router.push('/spots/' + s.id)">
          <div class="spot-top" :style="{ background: colors[s.id % colors.length] }">
            <span class="spot-cat">{{ s.category }}</span>
          </div>
          <div class="spot-body">
            <h3>{{ s.name }}</h3>
            <p class="spot-desc">{{ (s.description || '').substring(0, 80) }}{{ (s.description || '').length > 80 ? '...' : '' }}</p>
            <div class="spot-foot">
              <span>⭐ {{ s.avgRating?.toFixed(1) || '—' }}</span>
              <span>👁 {{ s.popularity }}</span>
              <span v-if="s.address" class="spot-addr">📍 {{ s.address?.substring(0, 15) }}</span>
            </div>
          </div>
        </div>
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
const colors = ['#22d3ee', '#34d399', '#fbbf24', '#e879f9', '#fb923c', '#f472b6', '#4ade80', '#f87171']
const cats = ['All', '景点', '校园', '餐厅', '商场', '公园', '博物馆', '酒店', '体育场馆']

async function fetch() {
  loading.value = true
  errorMsg.value = ''
  try {
    const p: Record<string, any> = { size: 20 }
    if (keyword.value.trim()) p.keyword = keyword.value.trim()
    if (activeCat.value !== 'All') p.category = activeCat.value
    const r = await spotApi.search(p)
    spots.value = r.data.data?.content || []
  } catch (e: any) {
    errorMsg.value = e?.message || 'Failed to load spots. Please try again.'
    spots.value = []
  } finally {
    loading.value = false
  }
}
function search() { errorMsg.value = ''; fetch() }
function filterCat(c: string) { activeCat.value = c; errorMsg.value = ''; fetch() }
onMounted(fetch)
</script>

<style scoped>
.spots-page { padding: 0; }

.toolbar {
  padding: 14px 18px;
  margin-bottom: 20px;
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}
.search-inp { width: 260px; }
.search-icon { color: var(--text-muted); }

.cat-filters { display: flex; gap: 6px; flex-wrap: wrap; }
.cat-btn {
  padding: 4px 12px;
  background: #fff;
  border: 2px solid #000;
  color: var(--text-body);
  border-radius: 8px;
  font-size: 12px;
  cursor: pointer;
  font-family: 'Lucida Console', monospace;
  font-weight: 500;
  transition: transform 0.12s, box-shadow 0.12s;
  box-shadow: 2px 2px 0 #000;
}
.cat-btn:hover { transform: translate(-1px, -1px); box-shadow: 3px 3px 0 #000; }
.cat-btn.active { background: var(--pop-blue); color: #000; border-color: #000; }

.loading-msg, .empty-msg {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-muted);
  font-size: 14px;
}
.loading-msg { display: flex; align-items: center; justify-content: center; gap: 8px; }

.spots-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 14px; }
.spot-card { overflow: hidden; }
.spot-top { height: 90px; padding: 8px; display: flex; justify-content: flex-end; align-items: flex-start; }
.spot-cat {
  background: rgba(0,0,0,0.5);
  color: #fff;
  padding: 2px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.5px;
}
.spot-body { padding: 14px; }
.spot-body h3 { font-size: 1rem; font-weight: 600; margin: 0 0 4px; color: var(--text-heading); }
.spot-desc { font-size: 12px; color: var(--text-muted); margin-bottom: 8px; line-height: 1.4; }
.spot-foot { display: flex; gap: 10px; font-size: 12px; color: var(--text-muted); flex-wrap: wrap; }
.spot-addr { font-size: 11px; }

@media (max-width: 768px) {
  .spots-grid { grid-template-columns: 1fr; }
  .search-inp { width: 100%; }
}
</style>
