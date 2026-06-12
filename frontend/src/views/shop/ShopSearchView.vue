<template>
  <DefaultLayout>
    <div class="ssv-container">
      <div class="toolbar glass-sm">
        <el-input v-model="keyword" placeholder="搜索餐馆名称、地址、类型…" prefix-icon="Search" clearable class="search-bar" @keyup.enter="doSearch" @clear="doSearch" />
        <el-button size="small" type="primary" @click="doSearch">搜索</el-button>
        <div class="cat-filters">
          <button v-for="c in cuisineList" :key="c" :class="['cat-btn', { active: selectedCuisine === c }]" @click="toggleCuisine(c)">{{ c }}</button>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="loading-msg">
        <span class="loading-spinner"></span>
        <span>正在加载餐馆...</span>
      </div>

      <!-- Error -->
      <div v-else-if="errorMsg" class="error-msg">
        <span class="error-icon">⚠️</span>
        <span>{{ errorMsg }}</span>
        <el-button size="small" @click="doSearch">重试</el-button>
      </div>

      <!-- Empty -->
      <div v-else-if="!shops.length" class="empty-msg">
        <span style="font-size:2rem;display:block;margin-bottom:12px">🏪</span>
        没有找到餐馆{{ keyword ? ' for "' + keyword + '"' : '' }}{{ selectedCuisine ? ' in ' + selectedCuisine : '' }}
      </div>

      <!-- Results -->
      <div v-else class="ssv-grid">
        <div v-for="s in shops" :key="s.id" class="shop-card glass" @click="$router.push('/shops/'+s.id)">
          <div class="sc-img" :style="{ backgroundImage: s.imageUrl ? `url(${s.imageUrl})` : 'none' }">
            <span v-if="!s.imageUrl" class="sc-img-placeholder">{{ s.name.charAt(0) }}</span>
          </div>
          <div class="sc-body">
            <div class="sc-name">{{ s.name }}</div>
            <div class="sc-meta">
              <span class="sc-cuisine">{{ s.cuisine || '餐馆' }}</span>
              <span class="sc-rating">⭐ {{ s.avgRating?.toFixed(1) || '—' }}</span>
            </div>
            <div v-if="s.address" class="sc-addr">{{ s.address }}</div>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="total > size" class="pagination-wrap">
        <el-pagination
          v-model:current-page="currentPage"
          :page-size="size"
          :total="total"
          layout="prev, pager, next"
          @current-change="doSearch"
        />
      </div>
    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import { shopApi } from '@/api/shopApi'
import type { ShopResponse } from '@/types/api'

const keyword = ref('')
const selectedCuisine = ref('')
const shops = ref<ShopResponse[]>([])
const loading = ref(false)
const errorMsg = ref('')
const currentPage = ref(1)
const size = ref(20)
const total = ref(0)

const cuisineList = ['中餐', '火锅', '烧烤', '快餐', '小吃', '西餐', '日料', '咖啡厅', '川菜', '湘菜', '粤菜', '面馆', '饺子', '韩餐', '奶茶', '面包甜点']

function toggleCuisine(c: string) {
  selectedCuisine.value = selectedCuisine.value === c ? '' : c
  currentPage.value = 1
  errorMsg.value = ''
  doSearch()
}

async function doSearch() {
  loading.value = true
  errorMsg.value = ''
  try {
    const params: Record<string, any> = { page: currentPage.value - 1, size: size.value }
    if (keyword.value.trim()) params.keyword = keyword.value.trim()
    if (selectedCuisine.value) params.cuisine = selectedCuisine.value
    const r = await shopApi.search(params)
    shops.value = r.data.data?.content || []
    total.value = r.data.data?.totalElements || 0
  } catch (e: any) {
    errorMsg.value = e?.message || '加载餐馆失败，请重试。'
    shops.value = []
  } finally {
    loading.value = false
  }
}

onMounted(doSearch)
</script>

<style scoped>
.ssv-container { padding: 0; }

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

.loading-spinner { display: inline-block; width: 18px; height: 18px; border: 2px solid var(--text-muted); border-top-color: transparent; border-radius: 50%; animation: spin 0.6s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.ssv-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }
.shop-card { display: flex; flex-direction: column; overflow: hidden; cursor: pointer; transition: transform 0.15s; }
.shop-card:hover { transform: translateY(-3px); }
.sc-img { height: 140px; background-size: cover; background-position: center; display: flex; align-items: center; justify-content: center; background-color: var(--frosted-bg); }
.sc-img-placeholder { font-size: 36px; color: var(--text-muted); font-family: 'Lucida Console', monospace; }
.sc-body { padding: 12px 14px; flex: 1; display: flex; flex-direction: column; gap: 6px; }
.sc-name { font-size: 15px; font-weight: 600; color: var(--text-heading); line-height: 1.3; }
.sc-meta { display: flex; gap: 10px; font-size: 12px; color: var(--text-secondary); }
.sc-cuisine { padding: 1px 8px; background: rgba(167, 111, 215, 0.2); border-radius: 12px; color: #c9a0e8; }
.sc-rating { color: #ffc107; }
.sc-addr { font-size: 11px; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.pagination-wrap {
  display: flex;
  justify-content: center;
  padding: 24px 0 12px;
}

@media (max-width: 768px) {
  .ssv-grid { grid-template-columns: 1fr; }
}
</style>
