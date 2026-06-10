<template>
  <DefaultLayout>
    <div class="spots-page">
      <div class="toolbar glass-sm">
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
          <div class="spot-body">
            <div class="spot-header">
              <span class="spot-cat-tag">{{ s.category }}</span>
              <span class="spot-rating">⭐ {{ s.avgRating?.toFixed(1) || '—' }}</span>
            </div>
            <h3>{{ s.name }}</h3>
            <p class="spot-desc">{{ (s.description || '').substring(0, 80) }}{{ (s.description || '').length > 80 ? '...' : '' }}</p>
            <div class="spot-foot">
              <span>👁 {{ s.popularity || '—' }}</span>
              <span v-if="s.address" class="spot-addr">📍 {{ s.address?.substring(0, 18) }}</span>
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
    errorMsg.value = e?.message || '加载景点失败，请重试。'
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
  padding: 12px 16px;
  margin-bottom: 16px;
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

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

.loading-msg, .empty-msg {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-muted);
  font-size: 14px;
}
.loading-msg { display: flex; align-items: center; justify-content: center; gap: 8px; }

.spots-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; }
.spot-card { overflow: hidden; }
.spot-body { padding: 16px; }
.spot-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.spot-cat-tag {
  background: rgba(124,215,238,0.12);
  color: #7cd7ee;
  padding: 2px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  border: 1px solid rgba(124,215,238,0.2);
}
.spot-rating { font-size: 13px; font-weight: 600; color: #ffc107; }
.spot-body h3 { font-size: 1rem; font-weight: 600; margin: 0 0 4px; color: var(--text-heading); }
.spot-desc { font-size: 12px; color: var(--text-muted); margin-bottom: 8px; line-height: 1.4; }
.spot-foot { display: flex; gap: 10px; font-size: 12px; color: var(--text-muted); flex-wrap: wrap; }
.spot-addr { font-size: 11px; }

@media (max-width: 768px) {
  .spots-grid { grid-template-columns: 1fr; }
}
</style>
