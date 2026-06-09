<template>
  <DefaultLayout>
    <div class="food-page">
      <div class="toolbar glass-sm">
        <el-input v-model="keyword" placeholder="Search food..." clearable class="search-inp" @keyup.enter="search">
          <template #prefix><span class="search-icon">🔍</span></template>
        </el-input>
        <div class="cats">
          <button v-for="c in cats" :key="c" :class="['cat-btn', { active: activeCat === c }]" @click="filterCat(c)">{{ c }}</button>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="loading-msg">
        <span class="loading-spinner"></span>
        <span>Searching foods...</span>
      </div>

      <!-- Error -->
      <div v-else-if="errorMsg" class="error-msg">
        <span class="error-icon">⚠️</span>
        <span>{{ errorMsg }}</span>
        <el-button size="small" @click="fetch">Retry</el-button>
      </div>

      <!-- Empty -->
      <div v-else-if="!foods.length" class="empty">
        <span style="font-size:2rem;display:block;margin-bottom:12px">🍽️</span>
        No foods found{{ keyword ? ' for "' + keyword + '"' : '' }}{{ activeCat !== 'All' ? ' in ' + activeCat : '' }}
      </div>

      <!-- Results -->
      <div v-else class="grid">
        <div v-for="f in foods" :key="f.id" class="card glass" @click="$router.push('/foods/' + f.id)">
          <div class="card-top" :style="{ background: colors[f.id % colors.length] }">
            <span class="card-cuisine">{{ f.cuisine || 'Food' }}</span>
          </div>
          <div class="card-body">
            <h3>{{ f.name }}</h3>
            <p v-if="f.restaurantName" class="rest">@ {{ f.restaurantName }}</p>
            <div class="foot">
              <span>⭐ {{ f.avgRating?.toFixed(1) || '—' }}</span>
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
const colors = ['#22d3ee', '#34d399', '#fbbf24', '#e879f9', '#fb923c', '#f472b6']
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
    errorMsg.value = e?.message || 'Failed to load foods. Please try again.'
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
  padding: 14px 18px;
  margin-bottom: 20px;
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}
.search-inp { width: 260px; }
.search-icon { color: var(--text-muted); }
.cats { display: flex; gap: 6px; flex-wrap: wrap; }
.cat-btn {
  padding: 4px 14px;
  background: var(--frosted-bg);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  border: 1px solid var(--frosted-border);
  color: var(--text-regular);
  border-radius: var(--radius-pill);
  font-size: 12px;
  cursor: pointer;
  font-family: inherit;
  font-weight: 500;
  transition: all 0.2s ease;
  box-shadow: var(--neu-shadow-sm);
}
.cat-btn:hover { transform: translateY(-2px); box-shadow: var(--neu-shadow); color: var(--text-primary); }
.cat-btn.active { background: rgba(124,215,238,0.25); color: #fff; border-color: rgba(124,215,238,0.4); }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 14px; }
.card { overflow: hidden; }
.card-top { height: 60px; padding: 6px; display: flex; justify-content: flex-end; align-items: flex-start; }
.card-cuisine { background: rgba(0,0,0,0.55); color: #fff; padding: 2px 8px; border-radius: 6px; font-size: 10px; font-weight: 600; letter-spacing: 0.5px; }
.card-body { padding: 14px; }
.card-body h3 { font-size: 0.95rem; font-weight: 600; margin: 0 0 4px; color: var(--text-heading); }
.rest { font-size: 12px; color: var(--text-muted); margin: 0 0 4px; }
.foot { display: flex; gap: 10px; font-size: 12px; color: var(--text-muted); margin-top: 8px; }
.empty { text-align: center; padding: 60px 20px; color: var(--text-muted); font-size: 14px; }
@media (max-width: 768px) { .grid { grid-template-columns: 1fr; } .search-inp { width: 100%; } }
</style>
