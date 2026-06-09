<template>
  <DefaultLayout>
    <div v-loading="loading" class="food-detail" element-loading-text="加载中...">
      <el-result v-if="!loading && !food" icon="error" title="美食未找到" sub-title="无法加载该美食信息">
        <template #extra><el-button type="primary" @click="$router.push('/foods')">返回美食列表</el-button></template>
      </el-result>

      <template v-if="food">
        <!-- Hero -->
        <section class="hero" :style="heroStyle">
          <div class="hero-overlay" />
          <div class="hero-content">
            <div class="hero-badges">
              <el-tag v-if="food.cuisine" effect="dark" size="large" class="cuisine-tag">{{ food.cuisine }}</el-tag>
              <span class="hero-rating">
                <el-icon v-for="i in 5" :key="i" :size="18" class="star-icon">
                  <StarFilled v-if="i <= Math.round(food.avgRating)" /><Star v-else />
                </el-icon>
                <span class="rating-text">{{ food.avgRating?.toFixed(1) }}</span>
              </span>
              <span v-if="food.priceRange" class="hero-price">{{ food.priceRange }}</span>
              <!-- Congestion badge -->
              <span v-if="food.congestionLevel" class="hero-congestion" :class="'hc-' + food.congestionLevel.toLowerCase()">
                {{ congestionLabel }}
              </span>
            </div>
            <h1 class="hero-title">{{ food.name }}</h1>
            <div v-if="food.restaurantName" class="hero-restaurant"><el-icon><Shop /></el-icon><span>{{ food.restaurantName }}</span></div>
            <p v-if="food.description" class="hero-description">{{ food.description }}</p>
            <div class="hero-meta">
              <div class="meta-item"><el-icon><View /></el-icon><span>{{ formatNumber(food.popularity) }} 浏览</span></div>
              <div v-if="food.latitude !== undefined && food.longitude !== undefined" class="meta-item">
                <el-icon><LocationFilled /></el-icon><span>{{ food.latitude.toFixed(4) }}, {{ food.longitude.toFixed(4) }}</span>
              </div>
            </div>
          </div>
        </section>

        <!-- Rating widget -->
        <section class="detail-section">
          <div class="rating-card glass-sm">
            <h3>⭐ Rate this food</h3>
            <div class="rate-row">
              <el-rate v-model="userRating" :max="5" :disabled="rated" @change="onRateChange" size="large" show-score score-template="{value} / 5" />
              <span v-if="rated" class="rated-badge">✓ You rated {{ userRating }}/5</span>
            </div>
          </div>
        </section>

        <!-- AMap location -->
        <section class="detail-section">
          <h3 class="section-title">📍 Location</h3>
          <div id="food-map-container" class="food-map"></div>
        </section>

        <!-- Detail table -->
        <section class="detail-section">
          <el-descriptions :column="2" border size="large" title="美食详情">
            <el-descriptions-item label="名称">{{ food.name }}</el-descriptions-item>
            <el-descriptions-item label="菜系"><el-tag v-if="food.cuisine" size="small">{{ food.cuisine }}</el-tag><span v-else>--</span></el-descriptions-item>
            <el-descriptions-item label="餐厅">{{ food.restaurantName || '--' }}</el-descriptions-item>
            <el-descriptions-item label="价格区间"><span class="price-text">{{ food.priceRange || '--' }}</span></el-descriptions-item>
            <el-descriptions-item label="评分">{{ food.avgRating?.toFixed(1) }} / 5.0</el-descriptions-item>
            <el-descriptions-item label="热度">{{ formatNumber(food.popularity) }} 次浏览</el-descriptions-item>
            <el-descriptions-item v-if="food.description" label="描述" :span="2">{{ food.description }}</el-descriptions-item>
          </el-descriptions>
        </section>

        <!-- Nearby spots -->
        <section class="detail-section" v-if="nearbySpots.length">
          <h3 class="section-title">📍 Nearby Spots</h3>
          <div class="nearby-spots-grid">
            <div v-for="s in nearbySpots" :key="s.id" class="nearby-spot-card" @click="$router.push('/spots/' + s.id)">
              <span class="ns-icon">🏞️</span>
              <div class="ns-info">
                <strong>{{ s.name }}</strong>
                <span>{{ s.category }} · ⭐ {{ s.avgRating?.toFixed(1) }}</span>
              </div>
            </div>
          </div>
        </section>

        <!-- Reviews placeholder -->
        <section class="detail-section">
          <h3 class="section-title">💬 Reviews</h3>
          <div class="empty-hint">Reviews coming soon</div>
        </section>
      </template>
    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Star, StarFilled, View, LocationFilled, Shop } from '@element-plus/icons-vue'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import { foodApi } from '@/api/foodApi'
import { spotApi } from '@/api/spotApi'
import type { FoodResponse } from '@/types/api'

const route = useRoute()
const loading = ref(true)
const foodId = computed(() => Number(route.params.id))
const food = ref<FoodResponse | null>(null)
const userRating = ref(0)
const rated = ref(false)
const nearbySpots = ref<any[]>([])
let mapInstance: any = null

const heroStyle = computed(() => {
  const img = (food as any).value?.imageUrl
  if (img) return { backgroundImage: `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.45)), url(${img})`, backgroundSize: 'cover', backgroundPosition: 'center' }
  return { background: 'linear-gradient(135deg, var(--pop-orange), var(--pop-red))' }
})

const congestionLabel = computed(() => {
  const m: Record<string, string> = { OVERFLOWING: '爆满', CROWDED: '拥挤', MODERATE: '挺多', SPARSE: '挺少', EMPTY: '基本没人' }
  return m[food.value?.congestionLevel || ''] || ''
})

function formatNumber(num: number): string {
  if (num >= 10000) return (num / 10000).toFixed(1) + '万'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k'
  return num.toString()
}

function initMap(lat: number, lng: number) {
  const container = document.getElementById('food-map-container')
  if (!container) return
  const tryInit = () => {
    if (!(window as any).AMap) { setTimeout(tryInit, 500); return }
    const AMap = (window as any).AMap
    mapInstance = new AMap.Map(container, { zoom: 15, center: [lng, lat], resizeEnable: true })
    new AMap.Marker({ position: [lng, lat], map: mapInstance })
  }
  tryInit()
}

async function onRateChange(rating: number) {
  if (rating < 1 || !food.value) { userRating.value = 0; return }
  try {
    const res = await foodApi.rate(foodId.value, rating)
    if (res.data.data) {
      food.value!.avgRating = res.data.data.avgRating
      food.value!.ratingCount = res.data.data.ratingCount
      userRating.value = rating
      rated.value = true
      ElMessage.success('Rating submitted!')
    }
  } catch { ElMessage.error('Rating failed') }
}

async function loadFood() {
  loading.value = true
  try {
    const res = await foodApi.getById(foodId.value)
    food.value = res.data.data
    // Try to load nearby spots
    const spotRes = await spotApi.search({ size: 5 })
    nearbySpots.value = spotRes.data.data?.content?.slice(0, 5) || []
  } catch { food.value = null }
  finally { loading.value = false }
}

onMounted(async () => {
  await loadFood()
  if (food.value) {
    nextTick(() => initMap(food.value!.latitude!, food.value!.longitude!))
  }
})

onBeforeUnmount(() => {
  if (mapInstance) { mapInstance.destroy(); mapInstance = null }
})
</script>

<style scoped>
.food-detail { max-width: 1100px; margin: 0 auto; padding-bottom: 48px; }
.hero { position: relative; border-radius: 16px; overflow: hidden; margin-bottom: 24px; min-height: 280px; display: flex; align-items: flex-end; }
.hero-overlay { position: absolute; inset: 0; background: radial-gradient(ellipse at 70% 30%, rgba(255,255,255,0.08) 0%, transparent 60%), linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.15) 50%, rgba(0,0,0,0.05) 100%); pointer-events: none; }
.hero-content { position: relative; z-index: 1; padding: 36px 32px 28px; width: 100%; color: #fff; }
.hero-badges { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; margin-bottom: 12px; }
.cuisine-tag { font-weight: 600; letter-spacing: 0.5px; border: none; }
.hero-rating { display: inline-flex; align-items: center; gap: 4px; }
.hero-rating .star-icon { color: #fbbf24; }
.rating-text { margin-left: 6px; font-size: 15px; font-weight: 700; color: #fbbf24; }
.hero-price { font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.9); background: rgba(255,255,255,0.15); padding: 2px 10px; border-radius: 20px; }
.hero-congestion { font-size: 13px; font-weight: 700; padding: 3px 12px; border-radius: 20px; border: 2px solid rgba(255,255,255,0.6); }
.hc-overflowing { background: #ff3b3b; color: #fff; }
.hc-crowded { background: #ff9100; color: #fff; }
.hc-moderate { background: #ffdd00; color: #000; }
.hc-sparse { background: #00e676; color: #000; }
.hc-empty { background: #00bfff; color: #fff; }
.hero-title { font-size: 32px; font-weight: 800; margin: 0 0 8px 0; line-height: 1.2; text-shadow: 0 2px 8px rgba(0,0,0,0.3); overflow-wrap: break-word; }
.hero-restaurant { display: flex; align-items: center; gap: 6px; font-size: 14px; opacity: 0.85; margin-bottom: 8px; }
.hero-description { font-size: 15px; line-height: 1.6; opacity: 0.9; max-width: 600px; margin: 0 0 16px 0; }
.hero-meta { display: flex; gap: 24px; flex-wrap: wrap; }
.meta-item { display: inline-flex; align-items: center; gap: 6px; font-size: 14px; opacity: 0.85; }

/* Section */
.detail-section { margin-top: 24px; }
.section-title { font-size: 1.5rem; margin: 0 0 12px; letter-spacing: 1px; }
.detail-section :deep(.el-descriptions) { border-radius: 12px; overflow: hidden; }
.detail-section :deep(.el-descriptions__title) { font-size: 18px; font-weight: 700; color: var(--text-primary); }
.price-text { color: var(--pop-red); font-weight: 600; }

/* Map */
.food-map {
  height: 280px; border: 1px solid var(--frosted-border);
  border-radius: var(--radius-card); box-shadow: var(--neu-shadow-sm);
  overflow: hidden;
}

/* Rating — uses glass-sm from handdrawn.css; scoped overrides removed */
.rating-card { padding: 20px; }
.rating-card h3 { font-size: 1.2rem; margin: 0 0 12px; color: var(--text-primary); }
.rate-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.rate-row :deep(.el-rate__icon) { font-size: 24px !important; }
.rated-badge {
  font-size: 13px; color: var(--pop-green); font-weight: 600;
  padding: 4px 12px; background: rgba(58,210,159,0.12);
  border: 1px solid rgba(58,210,159,0.3); border-radius: var(--radius-pill);
}

/* Nearby spots */
.nearby-spots-grid { display: flex; flex-direction: column; gap: 8px; }
.nearby-spot-card {
  display: flex; align-items: center; gap: 12px; padding: 12px;
  background: var(--frosted-bg); backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid var(--frosted-border); border-radius: 12px;
  box-shadow: var(--neu-shadow-sm); cursor: pointer;
  transition: all 0.2s cubic-bezier(0.23, 1, 0.32, 1);
}
.nearby-spot-card:hover { transform: translateY(-2px); box-shadow: var(--neu-shadow); }
.ns-icon { font-size: 24px; }
.ns-info { display: flex; flex-direction: column; }
.ns-info strong { font-size: 14px; color: var(--text-primary); }
.ns-info span { font-size: 12px; color: var(--text-secondary); }

/* Empty */
.empty-hint {
  color: var(--text-muted); font-size: 14px; padding: 20px; text-align: center;
  border: 1px dashed var(--frosted-border); border-radius: 12px;
  background: var(--frosted-bg);
}

@media (max-width: 768px) {
  .hero-title { font-size: 24px; }
  .hero-meta { gap: 12px; }
  .hero-content { padding: 24px 20px 20px; }
}
</style>
