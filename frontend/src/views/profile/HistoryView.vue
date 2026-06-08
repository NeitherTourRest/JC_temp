<template>
  <DefaultLayout>
    <div class="history-page">
      <div class="page-header">
        <h2 class="page-title">历史记录</h2>
      </div>

      <el-card shadow="never" class="history-card">
        <el-tabs v-model="activeTab" @tab-change="handleTabChange">
          <!-- ========== 搜索历史 ========== -->
          <el-tab-pane label="搜索历史" name="search">
            <!-- Loading -->
            <div v-if="searchLoading" class="list-loading">
              <el-skeleton v-for="n in 5" :key="n" animated :throttle="0">
                <template #template>
                  <div style="display:flex;align-items:center;gap:16px;padding:12px 0">
                    <el-skeleton-item variant="text" style="width:40%;height:20px" />
                    <el-skeleton-item variant="text" style="width:25%;height:16px" />
                  </div>
                </template>
              </el-skeleton>
            </div>

            <!-- Empty -->
            <el-empty v-else-if="!searchLoading && searchItems.length === 0" description="暂无搜索历史" />

            <!-- List -->
            <template v-else>
              <div class="history-list">
                <div
                  v-for="item in searchItems"
                  :key="item.id"
                  class="history-item"
                >
                  <div class="history-item-main">
                    <span class="history-keyword">{{ item.keyword }}</span>
                  </div>
                  <div class="history-item-meta">
                    <span class="history-date">{{ formatDate(item.createdAt) }}</span>
                  </div>
                </div>
              </div>

              <div class="pagination-wrap" v-if="searchTotal > searchSize">
                <el-pagination
                  v-model:current-page="searchPage"
                  :page-size="searchSize"
                  :total="searchTotal"
                  layout="prev, pager, next"
                  background
                  small
                  @current-change="loadSearchHistory"
                />
              </div>
            </template>
          </el-tab-pane>

          <!-- ========== 浏览历史 ========== -->
          <el-tab-pane label="浏览历史" name="browse">
            <!-- Loading -->
            <div v-if="browseLoading" class="list-loading">
              <el-skeleton v-for="n in 5" :key="n" animated :throttle="0">
                <template #template>
                  <div style="display:flex;align-items:center;gap:16px;padding:12px 0">
                    <el-skeleton-item variant="text" style="width:60px;height:24px" />
                    <el-skeleton-item variant="text" style="width:30%;height:20px" />
                    <el-skeleton-item variant="text" style="width:20%;height:16px" />
                  </div>
                </template>
              </el-skeleton>
            </div>

            <!-- Empty -->
            <el-empty v-else-if="!browseLoading && browseItems.length === 0" description="暂无浏览历史" />

            <!-- List -->
            <template v-else>
              <div class="history-list">
                <div
                  v-for="item in browseItems"
                  :key="item.id"
                  class="history-item"
                >
                  <div class="history-item-main">
                    <el-tag
                      :type="getTypeTagType(item.type)"
                      size="small"
                      effect="plain"
                    >
                      {{ getTypeLabel(item.type) }}
                    </el-tag>
                    <span class="history-target">{{ item.targetId }}</span>
                  </div>
                  <div class="history-item-meta">
                    <span class="history-date">{{ formatDate(item.createdAt) }}</span>
                  </div>
                </div>
              </div>

              <div class="pagination-wrap" v-if="browseTotal > browseSize">
                <el-pagination
                  v-model:current-page="browsePage"
                  :page-size="browseSize"
                  :total="browseTotal"
                  layout="prev, pager, next"
                  background
                  small
                  @current-change="loadBrowseHistory"
                />
              </div>
            </template>
          </el-tab-pane>

          <!-- ========== 路径回顾 ========== -->
          <el-tab-pane label="路径回顾" name="routes">
            <div v-if="routesLoading" class="list-loading">
              <el-skeleton v-for="n in 3" :key="n" animated>
                <template #template>
                  <div style="display:flex;align-items:center;gap:16px;padding:12px 0">
                    <el-skeleton-item variant="text" style="width:30%;height:20px" />
                    <el-skeleton-item variant="text" style="width:20%;height:16px" />
                  </div>
                </template>
              </el-skeleton>
            </div>
            <el-empty v-else-if="!routesLoading && routeItems.length === 0" description="暂无路径历史" />
            <template v-else>
              <div class="history-list">
                <div v-for="item in routeItems" :key="item.id" class="history-item">
                  <div class="history-item-main">
                    <span class="history-keyword">路线 {{ item.id }}</span>
                    <span v-if="item.distance" class="history-detail">{{ (item.distance / 1000).toFixed(1) }} km</span>
                    <span v-if="item.duration" class="history-detail">{{ Math.round(item.duration / 60) }} 分钟</span>
                  </div>
                  <div class="history-item-meta">
                    <span class="history-date">{{ formatDate(item.createdAt) }}</span>
                  </div>
                </div>
              </div>
              <div class="pagination-wrap" v-if="routesTotal > routesSize">
                <el-pagination v-model:current-page="routesPage" :page-size="routesSize" :total="routesTotal" layout="prev, pager, next" background small @current-change="loadRouteHistory" />
              </div>
            </template>
          </el-tab-pane>

          <!-- ========== 场所查询 ========== -->
          <el-tab-pane label="场所查询" name="facilities">
            <div v-if="facilitiesLoading" class="list-loading">
              <el-skeleton v-for="n in 3" :key="n" animated>
                <template #template>
                  <div style="display:flex;align-items:center;gap:16px;padding:12px 0">
                    <el-skeleton-item variant="text" style="width:30%;height:20px" />
                    <el-skeleton-item variant="text" style="width:15%;height:16px" />
                  </div>
                </template>
              </el-skeleton>
            </div>
            <el-empty v-else-if="!facilitiesLoading && facilityItems.length === 0" description="暂无场所查询历史" />
            <template v-else>
              <div class="history-list">
                <div v-for="item in facilityItems" :key="item.id" class="history-item">
                  <div class="history-item-main">
                    <el-tag size="small" effect="plain">{{ item.spotName || '未知场所' }}</el-tag>
                    <span v-if="item.category" class="history-detail">{{ item.category }}</span>
                  </div>
                  <div class="history-item-meta">
                    <span class="history-date">{{ formatDate(item.createdAt) }}</span>
                  </div>
                </div>
              </div>
              <div class="pagination-wrap" v-if="facilitiesTotal > facilitiesSize">
                <el-pagination v-model:current-page="facilitiesPage" :page-size="facilitiesSize" :total="facilitiesTotal" layout="prev, pager, next" background small @current-change="loadFacilityHistory" />
              </div>
            </template>
          </el-tab-pane>
        </el-tabs>
      </el-card>
    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import { historyApi } from '@/api/historyApi'

// --- Tabs ---
const activeTab = ref('search')

// --- Search history ---
interface SearchHistoryItem {
  id: number
  keyword: string
  createdAt: string
}

const searchItems = ref<SearchHistoryItem[]>([])
const searchLoading = ref(false)
const searchPage = ref(1)
const searchSize = ref(10)
const searchTotal = ref(0)

async function loadSearchHistory(page: number = 1) {
  searchLoading.value = true
  try {
    const res = await historyApi.getSearchHistory(page - 1, searchSize.value)
    const data = res.data.data
    searchItems.value = data.content || []
    searchTotal.value = data.totalElements || 0
    searchPage.value = page
  } catch {
    searchItems.value = []
    searchTotal.value = 0
  } finally {
    searchLoading.value = false
  }
}

// --- Browse history ---
interface BrowseHistoryItem {
  id: number
  type: string
  targetId: string
  createdAt: string
}

const browseItems = ref<BrowseHistoryItem[]>([])
const browseLoading = ref(false)
const browsePage = ref(1)
const browseSize = ref(10)
const browseTotal = ref(0)

async function loadBrowseHistory(page: number = 1) {
  browseLoading.value = true
  try {
    const res = await historyApi.getBrowseHistory(undefined, page - 1, browseSize.value)
    const data = res.data.data
    browseItems.value = data.content || []
    browseTotal.value = data.totalElements || 0
    browsePage.value = page
  } catch {
    browseItems.value = []
    browseTotal.value = 0
  } finally {
    browseLoading.value = false
  }
}

// --- Route history ---
interface RouteHistoryItem {
  id: number
  distance?: number
  duration?: number
  createdAt: string
}

const routeItems = ref<RouteHistoryItem[]>([])
const routesLoading = ref(false)
const routesPage = ref(1)
const routesSize = ref(10)
const routesTotal = ref(0)

async function loadRouteHistory(page: number = 1) {
  routesLoading.value = true
  try {
    const res = await historyApi.getRouteHistory(page - 1, routesSize.value)
    const data = res.data.data
    routeItems.value = data.content || []
    routesTotal.value = data.totalElements || 0
    routesPage.value = page
  } catch {
    routeItems.value = []
    routesTotal.value = 0
  } finally {
    routesLoading.value = false
  }
}

// --- Facility query history ---
interface FacilityHistoryItem {
  id: number
  spotName?: string
  category?: string
  createdAt: string
}

const facilityItems = ref<FacilityHistoryItem[]>([])
const facilitiesLoading = ref(false)
const facilitiesPage = ref(1)
const facilitiesSize = ref(10)
const facilitiesTotal = ref(0)

async function loadFacilityHistory(page: number = 1) {
  facilitiesLoading.value = true
  try {
    const res = await historyApi.getFacilityHistory(page - 1, facilitiesSize.value)
    const data = res.data.data
    facilityItems.value = data.content || []
    facilitiesTotal.value = data.totalElements || 0
    facilitiesPage.value = page
  } catch {
    facilityItems.value = []
    facilitiesTotal.value = 0
  } finally {
    facilitiesLoading.value = false
  }
}

// --- Tab switch ---
function handleTabChange(tab: string) {
  if (tab === 'search' && searchItems.value.length === 0) {
    loadSearchHistory()
  } else if (tab === 'browse' && browseItems.value.length === 0) {
    loadBrowseHistory()
  } else if (tab === 'routes' && routeItems.value.length === 0) {
    loadRouteHistory()
  } else if (tab === 'facilities' && facilityItems.value.length === 0) {
    loadFacilityHistory()
  }
}

// --- Helpers ---
const typeMap: Record<string, string> = {
  SPOT: '景点',
  FOOD: '美食',
  DIARY: '游记'
}

function getTypeLabel(type: string): string {
  return typeMap[type] || type
}

function getTypeTagType(type: string): '' | 'success' | 'warning' | 'info' | 'danger' {
  const map: Record<string, '' | 'success' | 'warning' | 'info' | 'danger'> = {
    SPOT: 'success',
    FOOD: 'warning',
    DIARY: 'info'
  }
  return map[type] || ''
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '--'
  const d = new Date(dateStr)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day} ${h}:${min}`
}

// --- Init ---
onMounted(() => {
  loadSearchHistory()
})
</script>

<style scoped>
.history-page {
  max-width: 800px;
  margin: 0 auto;
  padding: 24px 16px;
}

.page-header {
  margin-bottom: 20px;
}

.page-title {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  color: #303133;
}

/* History card */
.history-card {
  border-radius: 12px;
  border: 1px solid #ebeef5;
}

.history-card :deep(.el-card__body) {
  padding: 20px 24px;
}

/* History list */
.history-list {
  display: flex;
  flex-direction: column;
}

.history-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 0;
  border-bottom: 1px solid #f2f3f5;
  gap: 16px;
}

.history-item:last-child {
  border-bottom: none;
}

.history-item-main {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.history-keyword {
  font-size: 15px;
  color: #303133;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-target {
  font-size: 14px;
  color: #606266;
  font-family: monospace;
}

.history-item-meta {
  flex-shrink: 0;
}

.history-date {
  font-size: 13px;
  color: #909399;
}

/* Pagination */
.pagination-wrap {
  display: flex;
  justify-content: center;
  padding-top: 20px;
}

/* Loading */
.list-loading {
  padding: 8px 0;
}

/* Empty state */
.history-card :deep(.el-empty) {
  padding: 40px 0;
}
</style>
