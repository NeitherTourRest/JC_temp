<template>
  <DefaultLayout>
    <div class="food-page">
      <div class="toolbar glass-sm">
        <el-input v-model="keyword" placeholder="搜索美食名称、餐厅、描述…" prefix-icon="Search" clearable class="search-bar" @keyup.enter="search" @clear="fetch" />
        <el-button size="small" type="primary" @click="search">搜索</el-button>
        <div class="cats">
          <button v-for="c in cats" :key="c" :class="['cat-btn', { active: activeCat === c }]" @click="filterCat(c)">{{ c }}</button>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="loading-msg">
        <span class="loading-spinner"></span>
        <span>正在搜索美食...</span>
      </div>

      <!-- Error -->
      <div v-else-if="errorMsg" class="error-msg">
        <span class="error-icon">⚠️</span>
        <span>{{ errorMsg }}</span>
        <el-button size="small" @click="fetch">重试</el-button>
      </div>

      <!-- Empty -->
      <div v-else-if="!foods.length" class="empty">
        <span style="font-size:2rem;display:block;margin-bottom:12px">🍽️</span>
        没有找到美食{{ keyword ? ' for "' + keyword + '"' : '' }}{{ activeCat !== 'All' ? ' in ' + activeCat : '' }}
      </div>

      <!-- Results -->
      <div v-else class="grid">
        <div v-for="f in foods" :key="f.id" class="card glass" @click="$router.push('/foods/' + f.id)">
          <div class="card-cover" :style="{ backgroundImage: f.imageUrl ? `url(${f.imageUrl})` : 'none' }">
            <div class="card-cover-overlay" />
            <div class="card-cover-content">
              <span class="card-cuisine-tag">{{ f.cuisine || '美食' }}</span>
              <h3>{{ f.name }}</h3>
            </div>
          </div>
          <div class="card-body">
            <p v-if="f.restaurantName" class="rest">@ {{ f.restaurantName }}</p>
            <div class="foot">
              <span class="card-rating">⭐ {{ f.avgRating?.toFixed(1) || '—' }}</span>
              <span>👁 {{ f.popularity }}</span>
              <span v-if="f.priceRange">{{ f.priceRange }}</span>
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
import { foodApi } from '@/api/foodApi'
import type { FoodResponse } from '@/types/api'

const foods = ref<FoodResponse[]>([])
const loading = ref(false)
const errorMsg = ref('')
const keyword = ref('')
const activeCat = ref('All')
const cats = ['All', 'Chinese', 'Western', 'Japanese', 'Korean', 'Fast Food']
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)

function search() { currentPage.value = 1; errorMsg.value = ''; fetch() }
function filterCat(c: string) { activeCat.value = c; currentPage.value = 1; errorMsg.value = ''; fetch() }

async function fetch() {
  loading.value = true
  errorMsg.value = ''
  try {
    const params: Record<string, any> = { page: currentPage.value - 1, size: pageSize.value }
    if (keyword.value.trim()) params.keyword = keyword.value.trim()
    if (activeCat.value !== 'All') params.cuisine = activeCat.value
    const r = await foodApi.search(params)
    foods.value = r.data.data?.content || []
    total.value = r.data.data?.totalElements || 0
  } catch (e: any) {
    errorMsg.value = e?.message || '加载美食失败，请重试。'
    foods.value = []
  } finally {
    loading.value = false
  }
}

onMounted(fetch)
</script>

<style scoped>
.food-page { padding: 0; }
.toolbar {
  padding: 12px 16px;
  margin-bottom: 16px;
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}
.cats { display: flex; gap: 4px; flex-wrap: wrap; }
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
.cat-btn.active { background: rgba(124,215,238,0.2); color: #fff; border-color: rgba(124,215,238,0.35); }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }
.card { overflow: hidden; display: flex; flex-direction: column; }
.card-cover {
  position: relative; min-height: 140px;
  background-size: cover !important; background-position: center !important;
  display: flex; align-items: flex-end;
}
.card-cover-overlay {
  position: absolute; inset: 0;
  background: linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 50%);
  pointer-events: none;
}
.card-cover-content {
  position: relative; z-index: 1;
  padding: 14px; width: 100%;
}
.card-cover-content h3 {
  font-size: 1.05rem; font-weight: 700; color: #fff; margin: 4px 0 0;
  text-shadow: 0 2px 6px rgba(0,0,0,0.5);
}
.card-body { padding: 12px 14px; flex: 1; }
.card-cuisine-tag {
  display: inline-block;
  background: rgba(58,210,159,0.2);
  color: #3ad29f;
  padding: 2px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  border: 1px solid rgba(58,210,159,0.3);
  backdrop-filter: blur(4px);
}
.card-rating { font-size: 13px; font-weight: 600; color: #ffc107; }
.rest { font-size: 12px; color: var(--text-muted); margin: 0 0 4px; }
.foot { display: flex; gap: 10px; font-size: 12px; color: var(--text-muted); margin-top: 6px; flex-wrap: wrap; }
.empty { text-align: center; padding: 60px 20px; color: var(--text-muted); font-size: 14px; }
@media (max-width: 768px) { .grid { grid-template-columns: 1fr; } }
</style>
