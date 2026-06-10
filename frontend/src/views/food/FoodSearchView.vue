<template>
  <DefaultLayout>
    <div class="food-page">
      <div class="toolbar glass-sm">
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
          <div class="card-body">
            <div class="card-header">
              <span class="card-cuisine-tag">{{ f.cuisine || 'Food' }}</span>
              <span class="card-rating">⭐ {{ f.avgRating?.toFixed(1) || '—' }}</span>
            </div>
            <h3>{{ f.name }}</h3>
            <p v-if="f.restaurantName" class="rest">@ {{ f.restaurantName }}</p>
            <div class="foot">
              <span>👁 {{ f.popularity }}</span>
              <span v-if="f.priceRange">{{ f.priceRange }}</span>
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
import { foodApi } from '@/api/foodApi'
import type { FoodResponse } from '@/types/api'

const foods = ref<FoodResponse[]>([])
const loading = ref(false)
const errorMsg = ref('')
const keyword = ref('')
const activeCat = ref('All')
const cats = ['All', 'Chinese', 'Western', 'Japanese', 'Korean', 'Fast Food']

function search() { errorMsg.value = ''; fetch() }
function filterCat(c: string) { activeCat.value = c; errorMsg.value = ''; fetch() }

async function fetch() {
  loading.value = true
  errorMsg.value = ''
  try {
    const params: Record<string, any> = { size: 20 }
    if (keyword.value.trim()) params.keyword = keyword.value.trim()
    if (activeCat.value !== 'All') params.cuisine = activeCat.value
    const r = await foodApi.search(params)
    foods.value = r.data.data?.content || []
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
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
.card { overflow: hidden; }
.card-body { padding: 16px; }
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.card-cuisine-tag {
  background: rgba(58,210,159,0.12);
  color: #3ad29f;
  padding: 2px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  border: 1px solid rgba(58,210,159,0.2);
}
.card-rating { font-size: 13px; font-weight: 600; color: #ffc107; }
.card-body h3 { font-size: 0.95rem; font-weight: 600; margin: 0 0 4px; color: var(--text-heading); }
.rest { font-size: 12px; color: var(--text-muted); margin: 0 0 4px; }
.foot { display: flex; gap: 10px; font-size: 12px; color: var(--text-muted); margin-top: 8px; }
.empty { text-align: center; padding: 60px 20px; color: var(--text-muted); font-size: 14px; }
@media (max-width: 768px) { .grid { grid-template-columns: 1fr; } }
</style>
