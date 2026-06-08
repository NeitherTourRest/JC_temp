<template>
  <DefaultLayout>
    <div v-loading="loading" class="food-detail" element-loading-text="加载中...">
      <!-- Error / Not Found -->
      <el-result
        v-if="!loading && !food"
        icon="error"
        title="美食未找到"
        sub-title="无法加载该美食信息，请检查链接是否正确"
      >
        <template #extra>
          <el-button type="primary" @click="$router.push('/foods')">返回美食列表</el-button>
        </template>
      </el-result>

      <!-- Main Content -->
      <template v-if="food">
        <!-- ── Hero Section ── -->
        <section class="hero" :style="heroStyle">
          <div class="hero-overlay" />
          <div class="hero-content">
            <div class="hero-badges">
              <el-tag v-if="food.cuisine" effect="dark" size="large" class="cuisine-tag">
                {{ food.cuisine }}
              </el-tag>
              <span class="hero-rating">
                <el-icon v-for="i in 5" :key="i" :size="18" class="star-icon">
                  <StarFilled v-if="i <= Math.round(food.avgRating)" />
                  <Star v-else />
                </el-icon>
                <span class="rating-text">{{ food.avgRating?.toFixed(1) }}</span>
              </span>
              <span v-if="(food as any).priceRange" class="hero-price">
                {{ (food as any).priceRange }}
              </span>
            </div>

            <h1 class="hero-title">{{ food.name }}</h1>

            <div v-if="food.restaurantName" class="hero-restaurant">
              <el-icon><Shop /></el-icon>
              <span>{{ food.restaurantName }}</span>
            </div>

            <p v-if="(food as any).description" class="hero-description">{{ (food as any).description }}</p>

            <div class="hero-meta">
              <div class="meta-item">
                <el-icon><View /></el-icon>
                <span>{{ formatNumber(food.popularity) }} 人浏览</span>
              </div>
              <div v-if="(food as any).latitude !== undefined" class="meta-item">
                <el-icon><LocationFilled /></el-icon>
                <span>
                  纬度: {{ (food as any).latitude?.toFixed(4) }} | 经度: {{ (food as any).longitude?.toFixed(4) }}
                </span>
              </div>
            </div>
          </div>
        </section>

        <!-- ── Detail Section ── -->
        <section class="detail-section">
          <el-descriptions :column="2" border size="large" title="美食详情">
            <el-descriptions-item label="名称">{{ food.name }}</el-descriptions-item>
            <el-descriptions-item label="菜系">
              <el-tag v-if="food.cuisine" effect="dark" size="small">{{ food.cuisine }}</el-tag>
              <span v-else>--</span>
            </el-descriptions-item>
            <el-descriptions-item label="餐厅">{{ food.restaurantName || '--' }}</el-descriptions-item>
            <el-descriptions-item label="价格区间">
              <span class="price-text">{{ (food as any).priceRange || '--' }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="评分">
              <span class="desc-rating">
                <el-icon v-for="i in 5" :key="i" :size="14">
                  <StarFilled v-if="i <= Math.round(food.avgRating)" style="color:#f59e0b" />
                  <Star v-else style="color:#c0c4cc" />
                </el-icon>
                {{ food.avgRating?.toFixed(1) }} / 5.0
              </span>
            </el-descriptions-item>
            <el-descriptions-item label="热度">{{ formatNumber(food.popularity) }} 次浏览</el-descriptions-item>
            <el-descriptions-item v-if="(food as any).description" label="描述" :span="2">
              {{ (food as any).description }}
            </el-descriptions-item>
            <el-descriptions-item v-if="(food as any).latitude !== undefined" label="位置坐标" :span="2">
              纬度: {{ (food as any).latitude?.toFixed(6) }} | 经度: {{ (food as any).longitude?.toFixed(6) }}
            </el-descriptions-item>
          </el-descriptions>
        </section>
      </template>
    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { Star, StarFilled, View, LocationFilled, Shop } from '@element-plus/icons-vue'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import { foodApi } from '@/api/foodApi'
import type { FoodResponse } from '@/types/api'

const route = useRoute()

// ── State ──
const loading = ref(true)
const foodId = computed(() => Number(route.params.id))
const food = ref<FoodResponse | null>(null)

// ── Hero style ──
const heroStyle = computed(() => ({
  background: `linear-gradient(135deg, var(--pop-orange), var(--pop-red))`
}))

// ── Format helpers ──
function formatNumber(num: number): string {
  if (num >= 10000) return (num / 10000).toFixed(1) + '万'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k'
  return num.toString()
}

// ── Load food detail ──
async function loadFood() {
  loading.value = true
  try {
    const res = await foodApi.getById(foodId.value)
    food.value = res.data.data
  } catch {
    food.value = null
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadFood()
})
</script>

<style scoped>
/* ── Root ── */
.food-detail {
  max-width: 1100px;
  margin: 0 auto;
  padding-bottom: 48px;
}

/* ── Hero Section ── */
.hero {
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  margin-bottom: 24px;
  min-height: 280px;
  display: flex;
  align-items: flex-end;
}

.hero-overlay {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse at 70% 30%, rgba(255, 255, 255, 0.08) 0%, transparent 60%),
    linear-gradient(to top, rgba(0, 0, 0, 0.55) 0%, rgba(0, 0, 0, 0.15) 50%, rgba(0, 0, 0, 0.05) 100%);
  pointer-events: none;
}

.hero-content {
  position: relative;
  z-index: 1;
  padding: 36px 32px 28px;
  width: 100%;
  color: #fff;
}

.hero-badges {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.cuisine-tag {
  font-weight: 600;
  letter-spacing: 0.5px;
  border: none;
}

.hero-rating {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.hero-rating .star-icon {
  color: #fbbf24;
}

.rating-text {
  margin-left: 6px;
  font-size: 15px;
  font-weight: 700;
  color: #fbbf24;
}

.hero-price {
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  background: rgba(255, 255, 255, 0.15);
  padding: 2px 10px;
  border-radius: 20px;
}

.hero-title {
  font-size: 32px;
  font-weight: 800;
  margin: 0 0 8px 0;
  line-height: 1.2;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.hero-restaurant {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  opacity: 0.85;
  margin-bottom: 8px;
}

.hero-description {
  font-size: 15px;
  line-height: 1.6;
  opacity: 0.9;
  max-width: 600px;
  margin: 0 0 16px 0;
}

.hero-meta {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
}

.meta-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  opacity: 0.85;
}

/* ── Detail Section ── */
.detail-section {
  margin-top: 24px;
}

.detail-section :deep(.el-descriptions) {
  border-radius: 12px;
  overflow: hidden;
}

.detail-section :deep(.el-descriptions__title) {
  font-size: 18px;
  font-weight: 700;
  color: #1f2937;
}

.desc-rating {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.price-text {
  color: #ef4444;
  font-weight: 600;
}

/* ── Responsive ── */
@media (max-width: 768px) {
  .hero-title {
    font-size: 24px;
  }

  .hero-meta {
    gap: 12px;
  }

  .hero-content {
    padding: 24px 20px 20px;
  }
}
</style>
