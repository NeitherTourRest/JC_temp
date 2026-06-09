<template>
  <DefaultLayout>
    <div class="diary-page">
      <div class="toolbar glass-sm">
        <div class="tabs">
          <button :class="['tab', { active: tab === 'all' }]" @click="tab='all'; fetch()">🔥 All</button>
          <button :class="['tab', { active: tab === 'mine' }]" @click="tab='mine'; fetch()">📖 Mine</button>
        </div>
        <div class="toolbar-right">
          <el-button type="primary" size="small" @click="$router.push('/diaries/new')">+ Write</el-button>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="loading-msg">
        <span class="loading-spinner"></span>
        <span>Loading diaries...</span>
      </div>

      <!-- Error -->
      <div v-else-if="errorMsg" class="error-msg">
        <span class="error-icon">⚠️</span>
        <span>{{ errorMsg }}</span>
        <el-button size="small" @click="fetch">Retry</el-button>
      </div>

      <!-- Empty -->
      <div v-else-if="!diaries.length" class="empty">
        <span style="font-size:2rem;display:block;margin-bottom:12px">📝</span>
        No diaries yet{{ tab === 'mine' ? ' — start writing!' : '' }}
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

async function fetch() {
  loading.value = true
  errorMsg.value = ''
  try {
    const r = tab.value === 'mine'
      ? await diaryApi.mine({ size: 30 })
      : await diaryApi.list({ size: 30 })
    diaries.value = r.data.data?.content || []
  } catch (e: any) {
    errorMsg.value = e?.message || 'Failed to load diaries. Please try again.'
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
  padding: 14px 18px;
  margin-bottom: 20px;
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
  justify-content: space-between;
}
.toolbar-right { display: flex; gap: 8px; align-items: center; }

.tabs { display: flex; gap: 4px; }
.tab {
  padding: 6px 16px;
  background: var(--frosted-bg);
  backdrop-filter: blur(8px);
  border: 1px solid var(--frosted-border);
  color: var(--text-regular);
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  font-family: inherit;
  font-weight: 500;
  transition: all 0.2s ease;
  box-shadow: var(--neu-shadow-sm);
}
.tab:hover { transform: translateY(-1px); box-shadow: var(--neu-shadow); }
.tab.active { background: rgba(124,215,238,0.12); color: var(--pop-pink); border-color: rgba(124,215,238,0.3); }

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
