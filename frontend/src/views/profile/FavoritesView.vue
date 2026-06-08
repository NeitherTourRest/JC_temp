<template>
  <DefaultLayout>
    <div class="favorites-page">
      <!-- Header -->
      <div class="favorites-header">
        <h2 class="favorites-title">我的收藏</h2>
        <p class="favorites-subtitle">珍藏每一份旅途记忆</p>
      </div>

      <!-- Type Filter Tabs -->
      <div class="favorites-tabs-wrapper">
        <el-tabs
          v-model="activeType"
          class="favorites-tabs"
          @tab-change="handleTabChange"
        >
          <el-tab-pane label="全部" name="" />
          <el-tab-pane label="地点" name="SPOT" />
          <el-tab-pane label="美食" name="FOOD" />
          <el-tab-pane label="日记" name="DIARY" />
          <el-tab-pane label="行程" name="ITINERARY" />
        </el-tabs>
      </div>

      <!-- Loading Skeleton -->
      <div v-if="loading" class="favorites-grid">
        <div v-for="n in 6" :key="n" class="favorites-skeleton">
          <el-skeleton animated>
            <template #template>
              <div class="favorites-skeleton-inner">
                <el-skeleton-item variant="text" style="width:30%;height:22px;margin-bottom:14px" />
                <el-skeleton-item variant="text" style="width:50%;height:16px;margin-bottom:10px" />
                <el-skeleton-item variant="text" style="width:40%;height:16px;margin-bottom:16px" />
                <el-skeleton-item variant="text" style="width:28%;height:18px" />
              </div>
            </template>
          </el-skeleton>
        </div>
      </div>

      <!-- Empty State -->
      <el-empty
        v-else-if="!loading && favorites.length === 0"
        description="还没有收藏，去探索吧！"
        :image-size="160"
        class="favorites-empty"
      />

      <!-- Favorite Card Grid -->
      <div v-else class="favorites-grid">
        <div
          v-for="item in favorites"
          :key="item.id"
          class="fav-card"
        >
          <div class="fav-card__inner">
            <!-- Card top: type badge + remove button -->
            <div class="fav-card__top">
              <el-tag
                :type="getTypeTagType(item.type)"
                size="small"
                effect="plain"
                class="fav-card__badge"
              >
                {{ getTypeLabel(item.type) }}
              </el-tag>
              <el-popconfirm
                title="确定要取消收藏吗？"
                confirm-button-text="确定"
                cancel-button-text="取消"
                @confirm="handleRemove(item)"
              >
                <template #reference>
                  <el-button
                    type="danger"
                    :icon="Delete"
                    size="small"
                    circle
                    plain
                    class="fav-card__remove-btn"
                    :loading="removingId === item.id"
                  />
                </template>
              </el-popconfirm>
            </div>

            <!-- Target info -->
            <div class="fav-card__body">
              <div class="fav-card__target-label">收藏目标</div>
              <div class="fav-card__target-id">
                <span class="fav-card__target-icon">{{ getTypeIcon(item.type) }}</span>
                <span class="fav-card__target-text">{{ item.targetId }}</span>
              </div>
            </div>

            <!-- Added date -->
            <div class="fav-card__date">
              <span class="fav-card__date-icon">📅</span>
              <span>{{ formatDate(item.createdAt) }}</span>
            </div>

            <!-- Decorative accent bar -->
            <div class="fav-card__accent"></div>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div class="favorites-pagination" v-if="total > 0">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="size"
          :page-sizes="[6, 12, 18, 24]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @size-change="handlePageChange"
          @current-change="handlePageChange"
        />
      </div>
    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Delete } from '@element-plus/icons-vue'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import { favoriteApi } from '@/api/favoriteApi'
import type { FavoriteResponse } from '@/api/favoriteApi'

// ---- filter & pagination ----
const activeType = ref('')
const page = ref(1)
const size = ref(6)

// ---- data ----
const favorites = ref<FavoriteResponse[]>([])
const total = ref(0)
const loading = ref(false)
const removingId = ref<number | null>(null)

// ---- type display helpers ----
const typeConfig: Record<string, { label: string; icon: string; tagType: '' | 'danger' | 'warning' | 'success' | 'info' }> = {
  SPOT:      { label: '地点', icon: '📍', tagType: '' },
  FOOD:      { label: '美食', icon: '🍴', tagType: 'warning' },
  DIARY:     { label: '日记', icon: '📖', tagType: 'success' },
  ITINERARY: { label: '行程', icon: '🗺️', tagType: 'info' }
}

function getTypeLabel(type: string): string {
  return typeConfig[type]?.label || type
}

function getTypeIcon(type: string): string {
  return typeConfig[type]?.icon || '📌'
}

function getTypeTagType(type: string): '' | 'danger' | 'warning' | 'success' | 'info' {
  return typeConfig[type]?.tagType || 'info'
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// ---- data fetching ----
async function fetchFavorites() {
  loading.value = true
  try {
    const params: Record<string, string | number> = {
      page: page.value - 1,
      size: size.value
    }
    if (activeType.value) {
      params.type = activeType.value
    }
    const res = await favoriteApi.list(params)
    const data = res.data.data
    favorites.value = data.content
    total.value = data.totalElements
  } catch {
    ElMessage.error('加载收藏列表失败')
    favorites.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

// ---- event handlers ----
function handleTabChange() {
  page.value = 1
  fetchFavorites()
}

function handlePageChange() {
  fetchFavorites()
}

async function handleRemove(item: FavoriteResponse) {
  removingId.value = item.id
  try {
    await favoriteApi.remove(item.type, item.targetId)
    ElMessage.success('已取消收藏')
    // if current page becomes empty after removal, go back one page
    if (favorites.value.length === 1 && page.value > 1) {
      page.value--
    }
    fetchFavorites()
  } catch {
    ElMessage.error('取消收藏失败')
  } finally {
    removingId.value = null
  }
}

// ---- lifecycle ----
onMounted(() => {
  fetchFavorites()
})
</script>

<style scoped>
.favorites-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 8px 0;
}

/* ---- Header ---- */
.favorites-header {
  text-align: center;
  margin-bottom: 28px;
}

.favorites-title {
  font-size: 28px;
  font-weight: 700;
  color: #303133;
  margin-bottom: 6px;
}

.favorites-subtitle {
  font-size: 14px;
  color: #909399;
}

/* ---- Tabs ---- */
.favorites-tabs-wrapper {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  padding: 4px 20px;
  margin-bottom: 20px;
}

.favorites-tabs :deep(.el-tabs__header) {
  margin-bottom: 0;
}

.favorites-tabs :deep(.el-tabs__nav-wrap::after) {
  height: 1px;
}

.favorites-tabs :deep(.el-tabs__item) {
  font-size: 15px;
  font-weight: 500;
  height: 48px;
  line-height: 48px;
  padding: 0 20px;
}

/* ---- Grid ---- */
.favorites-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-bottom: 28px;
}

@media (max-width: 900px) {
  .favorites-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 600px) {
  .favorites-grid {
    grid-template-columns: 1fr;
  }
}

/* ---- Favorite Card ---- */
.fav-card {
  position: relative;
}

.fav-card__inner {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  position: relative;
  border: 1px solid transparent;
}

.fav-card__inner:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 28px rgba(64, 158, 255, 0.12);
  border-color: #409eff;
}

/* Card top: badge + remove */
.fav-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
}

.fav-card__badge {
  border-radius: 6px;
  font-weight: 500;
  font-size: 13px;
  padding: 2px 10px;
}

.fav-card__remove-btn {
  transition: all 0.2s;
  border-color: transparent;
  opacity: 0.6;
}

.fav-card__inner:hover .fav-card__remove-btn {
  opacity: 1;
  border-color: #f56c6c;
}

/* Card body */
.fav-card__body {
  margin-bottom: 16px;
}

.fav-card__target-label {
  font-size: 12px;
  color: #909399;
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.fav-card__target-id {
  display: flex;
  align-items: center;
  gap: 8px;
}

.fav-card__target-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.fav-card__target-text {
  font-size: 17px;
  font-weight: 600;
  color: #303133;
  word-break: break-all;
}

/* Date */
.fav-card__date {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #909399;
}

.fav-card__date-icon {
  font-size: 14px;
}

/* Accent bar */
.fav-card__accent {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #409eff, #67c23a, #e6a23c, #f56c6c);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.fav-card__inner:hover .fav-card__accent {
  transform: scaleX(1);
}

/* ---- Skeleton ---- */
.favorites-skeleton {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.favorites-skeleton-inner {
  padding: 0;
}

/* ---- Empty ---- */
.favorites-empty {
  margin: 48px 0;
}

/* ---- Pagination ---- */
.favorites-pagination {
  display: flex;
  justify-content: center;
  padding: 8px 0 24px;
}
</style>
