<template>
  <DefaultLayout>
    <div v-loading="loading" class="shop-detail" element-loading-text="加载中...">
      <!-- Full-page background image -->
      <div v-if="shop?.imageUrl" class="detail-bg" :style="{ backgroundImage: `url(${shop.imageUrl})` }" />
      <div class="detail-bg-overlay" />

      <el-result v-if="!loading && !shop" icon="error" title="餐馆未找到" sub-title="无法加载该餐馆信息">
        <template #extra><el-button type="primary" @click="$router.push('/shops')">返回餐馆列表</el-button></template>
      </el-result>

      <template v-if="shop">
        <div class="detail-content">
          <!-- Hero -->
          <section class="hero" :style="heroStyle">
            <div class="hero-overlay" />
            <div class="hero-content">
              <div class="hero-badges">
                <el-tag v-if="shop.cuisine" effect="dark" size="large" class="cuisine-tag">{{ shop.cuisine }}</el-tag>
                <span class="hero-rating">
                  <el-icon v-for="i in 5" :key="i" :size="18" class="star-icon">
                    <StarFilled v-if="i <= Math.round(shop.avgRating)" /><Star v-else />
                  </el-icon>
                  <span class="rating-text">{{ shop.avgRating?.toFixed(1) }}</span>
                </span>
                <span v-if="congestionLevel" class="hero-congestion" :class="'hc-' + congestionLevel.toLowerCase()">
                  {{ congestionLabel }}
                </span>
              </div>
              <h1 class="hero-title">{{ shop.name }}</h1>
              <p v-if="shop.description" class="hero-description">{{ shop.description }}</p>
              <div class="hero-meta">
                <div class="meta-item"><el-icon><View /></el-icon><span>{{ formatNumber(shop.popularity) }} 浏览</span></div>
                <div class="meta-item"><el-icon><LocationFilled /></el-icon><span>{{ shop.address || '昌平区' }}</span></div>
              </div>
            </div>
          </section>

          <!-- Rating widget -->
          <section class="detail-section">
            <div class="rating-card glass-sm">
              <h3>⭐ 给这个餐馆评分</h3>
              <div class="rate-row">
                <el-rate v-model="userRating" :max="5" @change="onRateChange" size="large" show-score score-template="{value} / 5" />
                <span v-if="rated" class="rated-badge">✓ 你的评分 {{ userRating }}/5</span>
              </div>
            </div>
          </section>

          <!-- Congestion report -->
          <section class="detail-section">
            <div class="rating-card glass-sm">
              <h3>上报拥挤度</h3>
              <div class="congestion-row">
                <div class="congestion-badge" :class="['cong-' + congestionLevel.toLowerCase(), { 'cong-pulse': congJustReported }]">
                  <span class="cong-label">{{ congestionLabel }}</span>
                </div>
                <div class="congestion-report-group">
                  <button v-for="opt in congestionOptions" :key="opt.value"
                    class="cong-btn" :class="{ active: selectedCongestion === opt.value }"
                    @click="selectedCongestion = opt.value">
                    {{ opt.label }}
                  </button>
                  <el-button size="small" type="primary" :loading="congLoading"
                    :disabled="!selectedCongestion" @click="submitCongestion">提交</el-button>
                </div>
              </div>
            </div>
          </section>

          <!-- AMap location -->
          <section class="detail-section">
            <h3 class="section-title">📍 位置</h3>
            <div id="shop-map-container" class="shop-map"></div>
          </section>

          <!-- Detail table -->
          <section class="detail-section">
            <el-descriptions :column="2" border size="large" title="餐馆详情">
              <el-descriptions-item label="名称">{{ shop.name }}</el-descriptions-item>
              <el-descriptions-item label="菜系"><el-tag v-if="shop.cuisine" size="small">{{ shop.cuisine }}</el-tag><span v-else>--</span></el-descriptions-item>
              <el-descriptions-item label="评分">{{ shop.avgRating?.toFixed(1) }} / 5.0</el-descriptions-item>
              <el-descriptions-item label="热度">{{ formatNumber(shop.popularity) }} 次浏览</el-descriptions-item>
              <el-descriptions-item v-if="shop.address" label="地址" :span="2">{{ shop.address }}</el-descriptions-item>
              <el-descriptions-item v-if="shop.description" label="描述" :span="2">{{ shop.description }}</el-descriptions-item>
            </el-descriptions>
          </section>

          <!-- Nearby spots -->
          <section class="detail-section" v-if="nearbySpots.length">
            <h3 class="section-title">📍 附近景点</h3>
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
            <h3 class="section-title">💬 评价</h3>
            <div class="empty-hint">评价功能即将上线</div>
          </section>
        </div> <!-- /detail-content -->
      </template>
    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Star, StarFilled, View, LocationFilled } from '@element-plus/icons-vue'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import { shopApi } from '@/api/shopApi'
import { spotApi } from '@/api/spotApi'
import { useAuthStore } from '@/stores/authStore'
import type { ShopResponse } from '@/types/api'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const loading = ref(true)
const shopId = computed(() => Number(route.params.id))
const shop = ref<ShopResponse | null>(null)
const userRating = ref(Number(localStorage.getItem('shopRating_' + route.params.id)) || 0)
const rated = ref(userRating.value > 0)
const nearbySpots = ref<any[]>([])
const congestionLevel = ref('EMPTY')
const congJustReported = ref(false)
const selectedCongestion = ref('')
const congLoading = ref(false)
let mapInstance: any = null

const congestionOptions = [
  { value: 'OVERFLOWING', label: '爆满' },
  { value: 'CROWDED', label: '拥挤' },
  { value: 'MODERATE', label: '适中' },
  { value: 'SPARSE', label: '较少' },
  { value: 'EMPTY', label: '空闲' },
]

const heroStyle = computed(() => {
  const img = (shop as any).value?.imageUrl
  if (img) return { backgroundImage: `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.45)), url(${img})`, backgroundSize: 'cover', backgroundPosition: 'center' }
  return { background: 'linear-gradient(135deg, var(--pop-orange), var(--pop-red))' }
})

const congestionLabel = computed(() => {
  const m: Record<string, string> = {
    OVERFLOWING: '爆满', CROWDED: '拥挤', MODERATE: '适中',
    SPARSE: '较少', EMPTY: '空闲',
  }
  return m[congestionLevel.value] || congestionLevel.value
})

function formatNumber(num: number): string {
  if (num >= 10000) return (num / 10000).toFixed(1) + '万'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k'
  return num.toString()
}

function initMap(lat: number, lng: number) {
  const container = document.getElementById('shop-map-container')
  if (!container) return
  const tryInit = () => {
    if (!(window as any).AMap) { setTimeout(tryInit, 500); return }
    const AMap = (window as any).AMap
    if (mapInstance) { mapInstance.destroy() }
    mapInstance = new AMap.Map(container, { zoom: 15, center: [lng, lat], resizeEnable: true })
    new AMap.Marker({ position: [lng, lat], map: mapInstance })
  }
  tryInit()
}

async function onRateChange(rating: number) {
  if (rating < 1 || !shop.value) { userRating.value = 0; return }
  try {
    const res = await shopApi.rate(shopId.value, rating)
    if (res.data.data) {
      shop.value!.avgRating = res.data.data.avgRating
      shop.value!.ratingCount = res.data.data.ratingCount
      userRating.value = rating
      rated.value = true
      localStorage.setItem('shopRating_' + shop.value.id, String(rating))
      ElMessage.success('评分已提交！')
    }
  } catch { ElMessage.error('评分失败') }
}

async function submitCongestion() {
  if (!selectedCongestion.value || !shop.value) return
  if (!authStore.isAuthenticated) {
    ElMessage.warning('请先登录再上报拥挤度')
    router.push('/login?redirect=' + route.path)
    return
  }
  congLoading.value = true
  try {
    const r = await shopApi.congest(shop.value.id, selectedCongestion.value)
    if (r.data.data) {
      congestionLevel.value = r.data.data.congestionLevel || selectedCongestion.value
      congJustReported.value = true
      setTimeout(() => { congJustReported.value = false }, 2000)
      ElMessage.success('拥挤度已上报！')
    }
  } catch (e: any) {
    if (e?.response?.status === 401) {
      ElMessage.error('登录已过期 — 请重新登录')
      authStore.logout()
      router.push('/login?redirect=' + route.path)
    } else {
      ElMessage.error('拥挤度上报失败：' + (e?.response?.data?.message || e?.message || '服务器错误'))
    }
  } finally { congLoading.value = false }
}

async function loadShop() {
  loading.value = true
  try {
    const res = await shopApi.getById(shopId.value)
    shop.value = res.data.data
    congestionLevel.value = res.data.data?.congestionLevel || 'EMPTY'
    if (res.data.data?.spotId) {
      const spotRes = await spotApi.getDetail(res.data.data.spotId)
      if (spotRes.data.data) {
        nearbySpots.value = [spotRes.data.data]
      }
    }
    const spotSearchRes = await spotApi.search({ size: 5 })
    const allSpots = spotSearchRes.data.data?.content || []
    const rest = allSpots.filter((s: any) => s.id !== res.data.data?.spotId)
    nearbySpots.value = [...nearbySpots.value, ...rest].slice(0, 5)
  } catch { shop.value = null }
  finally { loading.value = false }
}

onMounted(async () => {
  await loadShop()
  if (shop.value) {
    nextTick(() => {
      const lng = shop.value!.gcjLongitude || shop.value!.longitude
      const lat = shop.value!.gcjLatitude || shop.value!.latitude
      initMap(lat, lng)
    })
  }
})

onBeforeUnmount(() => {
  if (mapInstance) { mapInstance.destroy(); mapInstance = null }
})
</script>

<style scoped>
.shop-detail { max-width: 1100px; margin: 0 auto; padding-bottom: 48px; position: relative; }

.detail-bg {
  position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
  background-size: cover; background-position: center;
  filter: blur(20px) brightness(0.5);
  transform: scale(1.1);
  z-index: 0;
  pointer-events: none;
}
.detail-bg-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.35);
  z-index: 0;
  pointer-events: none;
}
.detail-content { position: relative; z-index: 1; }

.hero {
  position: relative; border-radius: 16px; overflow: hidden; margin-bottom: 24px; min-height: 280px; display: flex; align-items: flex-end;
  background: rgba(42,40,40,0.35);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--frosted-border);
}
.hero-overlay { position: absolute; inset: 0; background: radial-gradient(ellipse at 70% 30%, rgba(255,255,255,0.08) 0%, transparent 60%), linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.15) 50%, rgba(0,0,0,0.05) 100%); pointer-events: none; }
.hero-content { position: relative; z-index: 1; padding: 36px 32px 28px; width: 100%; color: #fff; }
.hero-badges { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; margin-bottom: 12px; }
.cuisine-tag { font-weight: 600; letter-spacing: 0.5px; border: none; }
.hero-rating { display: inline-flex; align-items: center; gap: 4px; }
.hero-rating .star-icon { color: #fbbf24; }
.rating-text { margin-left: 6px; font-size: 15px; font-weight: 700; color: #fbbf24; }
.hero-congestion { font-size: 13px; font-weight: 700; padding: 3px 12px; border-radius: 20px; border: 2px solid rgba(255,255,255,0.6); }
.hc-overflowing { background: #ff3b3b; color: #fff; }
.hc-crowded { background: #ff9100; color: #fff; }
.hc-moderate { background: #ffdd00; color: #000; }
.hc-sparse { background: #00e676; color: #000; }
.hc-empty { background: #00bfff; color: #fff; }
.hero-title { font-size: 32px; font-weight: 800; margin: 0 0 8px 0; line-height: 1.2; text-shadow: 0 2px 8px rgba(0,0,0,0.3); overflow-wrap: break-word; }
.hero-description { font-size: 15px; line-height: 1.6; opacity: 0.9; max-width: 600px; margin: 0 0 16px 0; }
.hero-meta { display: flex; gap: 24px; flex-wrap: wrap; }
.meta-item { display: inline-flex; align-items: center; gap: 6px; font-size: 14px; opacity: 0.85; }

.detail-section { margin-top: 24px; }
.section-title { font-size: 1.5rem; margin: 0 0 12px; letter-spacing: 1px; }
.detail-section :deep(.el-descriptions) { border-radius: 12px; overflow: hidden; }
.detail-section :deep(.el-descriptions__title) { font-size: 18px; font-weight: 700; color: var(--text-primary); }

.shop-map { height: 280px; border: 1px solid var(--frosted-border); border-radius: var(--radius-card); box-shadow: var(--neu-shadow-sm); overflow: hidden; }

.rating-card { padding: 20px; }
.rating-card h3 { font-size: 1.2rem; margin: 0 0 12px; color: var(--text-primary); }
.rate-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.rate-row :deep(.el-rate__icon) { font-size: 24px !important; }
.rated-badge { font-size: 13px; color: var(--pop-green); font-weight: 600; padding: 4px 12px; background: rgba(58,210,159,0.12); border: 1px solid rgba(58,210,159,0.3); border-radius: var(--radius-pill); }

.congestion-row { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.congestion-badge { display: flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: var(--radius-pill); border: 1px solid var(--frosted-border); font-weight: 700; font-size: 16px; }
.cong-overflowing { background: rgba(255,59,59,0.35); color: #ff6b6b; }
.cong-crowded { background: rgba(255,145,0,0.35); color: #ffb347; }
.cong-moderate { background: rgba(255,193,7,0.35); color: #ffd700; }
.cong-sparse { background: rgba(58,210,159,0.4); color: #6fcf97; }
.cong-empty { background: rgba(124,215,238,0.35); color: #7cd7ee; }
.cong-pulse { animation: congPulse 0.6s ease-in-out 3; }
@keyframes congPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.1);box-shadow:0 0 20px rgba(124,215,238,0.4)} }
.congestion-report-group { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; font-size: 13px; }
.cong-btn { padding: 4px 12px; border: 1px solid var(--frosted-border); border-radius: var(--radius-pill); background: var(--frosted-bg); color: var(--text-regular); cursor: pointer; font-family: inherit; font-size: 12px; transition: all 0.2s ease; }
.cong-btn:hover { color: var(--text-primary); border-color: rgba(124,215,238,0.3); }
.cong-btn.active { background: rgba(124,215,238,0.15); color: #7cd7ee; border-color: rgba(124,215,238,0.4); }

.nearby-spots-grid { display: flex; flex-direction: column; gap: 8px; }
.nearby-spot-card { display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--frosted-bg); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); border: 1px solid var(--frosted-border); border-radius: 12px; box-shadow: var(--neu-shadow-sm); cursor: pointer; transition: all 0.2s cubic-bezier(0.23, 1, 0.32, 1); }
.nearby-spot-card:hover { transform: translateY(-2px); box-shadow: var(--neu-shadow); }
.ns-icon { font-size: 24px; }
.ns-info { display: flex; flex-direction: column; }
.ns-info strong { font-size: 14px; color: var(--text-primary); }
.ns-info span { font-size: 12px; color: var(--text-secondary); }

.empty-hint { color: var(--text-muted); font-size: 14px; padding: 20px; text-align: center; border: 1px dashed var(--frosted-border); border-radius: 12px; background: var(--frosted-bg); }

@media (max-width: 768px) {
  .hero-title { font-size: 24px; }
  .hero-meta { gap: 12px; }
  .hero-content { padding: 24px 20px 20px; }
}
</style>
