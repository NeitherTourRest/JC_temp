<template>
  <DefaultLayout>
    <div v-loading="loading" class="spot-detail">
      <el-result v-if="!loading && !spot" icon="error" title="景点未找到" sub-title="无法加载该景点信息">
        <template #extra><el-button type="primary" @click="$router.push('/spots')">返回景点列表</el-button></template>
      </el-result>

      <template v-if="spot">
        <!-- Hero -->
        <section class="hero" :style="{ background: heroBg }">
          <div class="hero-overlay" />
          <div class="hero-content">
            <div class="hero-badges">
              <el-tag size="small" type="warning">{{ spot.category }}</el-tag>
              <el-tag v-if="spot.address" size="small" type="primary">{{ spot.address }}</el-tag>
              <span class="hero-rating">{{ spot.avgRating?.toFixed(1) || '--' }}</span>
              <span v-if="spot.ticketPrice" class="hero-price">¥{{ spot.ticketPrice }}</span>
              <span class="hero-congestion" :class="'hc-' + congestionLevel.toLowerCase()">
                {{ congestionLabel }}
              </span>
            </div>
            <h1 class="hero-title">{{ spot.name }}</h1>
            <p v-if="spot.description" class="hero-description">{{ spot.description }}</p>
            <div class="hero-meta">
              <div class="meta-item">{{ spot.popularity || 0 }} 浏览</div>
              <div class="meta-item">{{ spot.ratingCount || 0 }} 评论</div>
              <div v-if="spot.openingHours" class="meta-item">{{ spot.openingHours }}</div>
            </div>
          </div>
        </section>

        <!-- Rating widget -->
        <section class="detail-section">
          <div class="rating-card glass-sm">
            <h3>给这个景点评分</h3>
            <div class="rate-row">
              <el-rate v-model="userRating" :max="5" @change="onRateChange" size="large" show-score score-template="{value} / 5" />
              <span v-if="rated" class="rated-badge">你的评分 {{ userRating }}/5</span>
            </div>
          </div>
        </section>

        <!-- Congestion report -->
        <section class="detail-section">
          <div class="rating-card glass-sm">
            <h3>上报拥挤度</h3>
            <div class="congestion-row">
              <div class="congestion-badge" :class="'cong-' + congestionLevel.toLowerCase()">
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
          <h3 class="section-title">位置</h3>
          <div id="spot-map-container" class="spot-map"></div>
        </section>

        <!-- Detail table -->
        <section class="detail-section">
          <el-descriptions :column="2" border size="large" title="景点详情">
            <el-descriptions-item label="名称">{{ spot.name }}</el-descriptions-item>
            <el-descriptions-item label="类别"><el-tag size="small">{{ spot.category }}</el-tag></el-descriptions-item>
            <el-descriptions-item label="评分">{{ spot.avgRating?.toFixed(1) }} / 5.0</el-descriptions-item>
            <el-descriptions-item label="热度">{{ spot.popularity || 0 }}</el-descriptions-item>
            <el-descriptions-item v-if="spot.address" label="地址" :span="2">{{ spot.address }}</el-descriptions-item>
            <el-descriptions-item v-if="spot.openingHours" label="营业时间">{{ spot.openingHours }}</el-descriptions-item>
            <el-descriptions-item v-if="spot.ticketPrice" label="门票">¥{{ spot.ticketPrice }}</el-descriptions-item>
            <el-descriptions-item v-if="spot.description" label="描述" :span="2">{{ spot.description }}</el-descriptions-item>
          </el-descriptions>
        </section>

        <!-- Facilities -->
        <section class="detail-section" v-if="facilities.length">
          <h3 class="section-title">设施</h3>
          <div v-for="(group, cat) in groupedFacilities" :key="cat" class="facility-group">
            <h4 class="fac-group-title">{{ group.label }}</h4>
            <div class="facility-grid">
              <div v-for="f in group.items" :key="f.id" class="facility-tag clickable"
                :class="'fac-' + (f.category || '').toLowerCase()"
                @click="highlightFacility(f)">
                <span class="fac-icon">{{ facilityIcon(f.category) }}</span>
                <span class="fac-name">{{ f.name }}</span>
              </div>
            </div>
          </div>
        </section>

        <!-- Nearby food by walking distance -->
        <section class="detail-section" v-if="walkingFoods.length">
          <h3 class="section-title">附近美食（步行距离）</h3>
          <div class="walking-food-list">
            <div v-for="f in walkingFoods" :key="f.id" class="walking-food-card" @click="$router.push('/foods/' + f.id)">
              <div class="wfc-top">
                <strong class="wfc-name">{{ f.name }}</strong>
                <span class="wfc-rating">{{ f.avgRating?.toFixed(1) || '--' }}</span>
              </div>
              <div class="wfc-meta">
                <span v-if="f.cuisine" class="wfc-cuisine">{{ f.cuisine }}</span>
                <span v-if="f.restaurantName" class="wfc-restaurant">{{ f.restaurantName }}</span>
                <span class="wfc-distance">~{{ walkingDistance(f) }}m</span>
              </div>
            </div>
          </div>
        </section>

        <!-- Nearby spots -->
        <section class="detail-section" v-if="featuredSpots.length">
          <h3 class="section-title">附近景点</h3>
          <div class="nearby-spots-grid">
            <div v-for="s in featuredSpots" :key="s.id" class="nearby-spot-card" @click="$router.push('/spots/' + s.id)">
              <div class="ns-info">
                <strong>{{ s.name }}</strong>
                <span>{{ s.category }} - {{ s.avgRating?.toFixed(1) }}</span>
              </div>
            </div>
          </div>
        </section>

        <!-- Reviews -->
        <section class="detail-section">
          <h3 class="section-title">评价</h3>
          <div v-if="!reviews.length" class="empty-hint">暂无评价，快来写第一条！</div>
          <div v-for="r in reviews" :key="r.id" class="review-card">
            <div class="review-header">
              <strong>User #{{ r.userId }}</strong>
              <span>{{ r.rating }}/5</span>
            </div>
            <p v-if="r.content">{{ r.content }}</p>
          </div>
        </section>
      </template>
    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import { spotApi } from '@/api/spotApi'
import apiClient from '@/api/axios'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/authStore'
import type { SpotResponse } from '@/types/api'

interface FacilityItem {
  id: number; name: string; category: string; latitude: number; longitude: number; distance?: number
}
interface FoodItem {
  id: number; name: string; cuisine: string; restaurantName: string
  avgRating: number; popularity: number; latitude: number; longitude: number
}

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const spot = ref<SpotResponse | null>(null)
const reviews = ref<any[]>([])
const facilities = ref<FacilityItem[]>([])
const walkingFoods = ref<FoodItem[]>([])
const featuredSpots = ref<any[]>([])
const loading = ref(true)
const congestionLevel = ref('EMPTY')
const congJustReported = ref(false)
const userRating = ref(Number(localStorage.getItem('spotRating_' + route.params.id)) || 0)
const rated = ref(userRating.value > 0)
const rateLoading = ref(false)
const selectedCongestion = ref('')
const congLoading = ref(false)

let mapInstance: any = null

const heroBg = computed(() => {
  const img = (spot as any).value?.imageUrl
  if (img) return `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.45)), url(${img}) center/cover`
  return 'linear-gradient(135deg, #a76fd7, #7cd7ee)'
})

const congestionOptions = [
  { value: 'OVERFLOWING', label: '爆满' },
  { value: 'CROWDED', label: '拥挤' },
  { value: 'MODERATE', label: '适中' },
  { value: 'SPARSE', label: '较少' },
  { value: 'EMPTY', label: '空闲' },
]

const congestionLabel = computed(() => {
  const m: Record<string, string> = {
    OVERFLOWING: '爆满', CROWDED: '拥挤', MODERATE: '适中',
    SPARSE: '较少', EMPTY: '空闲',
  }
  return m[congestionLevel.value] || congestionLevel.value
})

function facilityIcon(category: string): string {
  const icons: Record<string, string> = {
    TOILET: '[W]', PARKING: '[P]', SERVICE: '[S]', SHOP: '[M]',
    CAFE: '[C]', HOSPITAL: '[H]', AED: '[+]', ATM: '[A]', INFO: '[i]', RESTAURANT: '[R]',
  }
  return icons[category] || '[?]'
}

const categoryLabels: Record<string, string> = {
  TOILET: 'Toilets', PARKING: 'Parking', SERVICE: 'Service', SHOP: 'Shops',
  CAFE: 'Cafes', HOSPITAL: 'Medical', AED: 'AED', ATM: 'ATMs', INFO: 'Info',
  RESTAURANT: 'Restaurants',
}

const groupedFacilities = computed(() => {
  const groups: Record<string, { label: string; items: FacilityItem[] }> = {}
  for (const f of facilities.value) {
    const cat = f.category || 'OTHER'
    if (!groups[cat]) groups[cat] = { label: categoryLabels[cat] || cat, items: [] }
    groups[cat].items.push(f)
  }
  return groups
})

function walkingDistance(f: FoodItem): number {
  if (!spot.value) return 0
  const R = 6371000
  const dLat = (f.latitude - spot.value.latitude) * Math.PI / 180
  const dLng = (f.longitude - spot.value.longitude) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(spot.value.latitude * Math.PI / 180) * Math.cos(f.latitude * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))
}

function highlightFacility(f: FacilityItem) {
  ElMessage.info(`${f.name} (${f.category})`)
}

function initMap(lat: number, lng: number) {
  const container = document.getElementById('spot-map-container')
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
  if (rating < 1 || !spot.value) { userRating.value = 0; return }
  if (!authStore.isAuthenticated) {
    ElMessage.warning('请先登录再评分')
    router.push('/login?redirect=' + route.path)
    userRating.value = 0
    return
  }
  rateLoading.value = true
  try {
    const r = await apiClient.post('/spots/' + spot.value.id + '/rate', null, { params: { rating } })
    if (r.data.data) {
      const d = r.data.data as any
      spot.value!.avgRating = d.avgRating
      spot.value!.ratingCount = d.ratingCount
      reviews.value = d.reviews || []
      userRating.value = rating
      rated.value = true
      localStorage.setItem('spotRating_' + spot.value.id, String(rating))
      ElMessage.success('评分已提交！')
    }
  } catch (e: any) {
    console.error('Rate error:', e)
    if (e?.response?.status === 401) {
      ElMessage.error('登录已过期 - 请重新登录')
      authStore.logout()
      router.push('/login?redirect=' + route.path)
    } else {
      ElMessage.error('评分提交失败：' + (e?.response?.data?.message || e?.message || '未知错误'))
    }
  } finally { rateLoading.value = false }
}

async function submitCongestion() {
  if (!selectedCongestion.value || !spot.value) return
  if (!authStore.isAuthenticated) {
    ElMessage.warning('请先登录再上报拥挤度')
    router.push('/login?redirect=' + route.path)
    return
  }
  congLoading.value = true
  try {
    const r = await apiClient.post('/spots/' + spot.value.id + '/congestion', null,
      { params: { level: selectedCongestion.value } })
    if (r.data.data) {
      congestionLevel.value = (r.data.data as any).congestionLevel || selectedCongestion.value
      congJustReported.value = true
      setTimeout(() => { congJustReported.value = false }, 2000)
      ElMessage.success('拥挤度已上报！')
    }
  } catch (e: any) {
    console.error('Congestion error:', e)
    if (e?.response?.status === 401) {
      ElMessage.error('登录已过期 - 请重新登录')
      authStore.logout()
      router.push('/login?redirect=' + route.path)
    } else {
      ElMessage.error('拥挤度上报失败：' + (e?.response?.data?.message || e?.message || '服务器错误'))
    }
  } finally { congLoading.value = false }
}

onMounted(async () => {
  const id = Number(route.params.id)
  try {
    const r = await spotApi.getDetail(id)
    if (r.data.data) {
      const d = r.data.data as any
      spot.value = d
      reviews.value = d.reviews || []
      facilities.value = d.facilities || []
      congestionLevel.value = d.congestionLevel || 'EMPTY'
    }
  } catch { spot.value = null }
  finally { loading.value = false }

  if (spot.value) {
    nextTick(() => initMap(spot.value!.latitude, spot.value!.longitude))
    try {
      const nearby = await apiClient.get('/spots/' + id + '/foods/nearby', { params: { maxDistance: 2000 } })
      if (nearby.data.data) walkingFoods.value = nearby.data.data
    } catch { /* okay */ }
    try {
      const s = await spotApi.search({ size: 6 })
      const all = s.data.data?.content || []
      featuredSpots.value = all.filter((x: any) => x.id !== id).slice(0, 4)
    } catch { /* okay */ }
  }
})

onBeforeUnmount(() => {
  if (mapInstance) { mapInstance.destroy(); mapInstance = null }
})
</script>

<style scoped>
.spot-detail { max-width: 900px; margin: 0 auto; }
.hero {
  position: relative; min-height: 240px;
  border-radius: var(--radius-card);
  overflow: hidden; margin-bottom: 20px;
  display: flex; align-items: flex-end;
  background-size: cover !important;
  background-position: center !important;
}
.hero-overlay {
  position: absolute; inset: 0;
  background: linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 50%);
  pointer-events: none;
}
.hero-content {
  position: relative; z-index: 1;
  padding: 24px; width: 100%;
  color: #fff;
}
.hero-badges { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; margin-bottom: 8px; }
.hero-rating { font-size: 15px; font-weight: 700; color: #fbbf24; }
.hero-price { font-size: 14px; font-weight: 600; background: rgba(255,255,255,0.15); padding: 2px 10px; border-radius: 20px; }
.hero-congestion { font-size: 13px; font-weight: 700; padding: 3px 12px; border-radius: 20px; border: 2px solid rgba(255,255,255,0.6); }
.hc-overflowing { background: #ff3b3b; color: #fff; }
.hc-crowded { background: #ff9100; color: #fff; }
.hc-moderate { background: #ffdd00; color: #000; }
.hc-sparse { background: #00e676; color: #000; }
.hc-empty { background: #00bfff; color: #fff; }
.hero-title { font-size: 2rem; font-weight: 800; margin: 0 0 6px; text-shadow: 0 2px 8px rgba(0,0,0,0.5); overflow-wrap: break-word; }
.hero-description { font-size: 14px; opacity: 0.85; margin: 0 0 8px; line-height: 1.5; }
.hero-meta { display: flex; gap: 12px; flex-wrap: wrap; font-size: 13px; opacity: 0.75; }
.meta-item { display: flex; align-items: center; gap: 4px; }
.detail-section { margin-bottom: 18px; }
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
@keyframes congPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.1);box-shadow:0 0 20px rgba(124,215,238,0.4)} }
.congestion-report-group { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; font-size: 13px; }
.cong-btn { padding: 4px 12px; border: 1px solid var(--frosted-border); border-radius: var(--radius-pill); background: var(--frosted-bg); color: var(--text-regular); cursor: pointer; font-family: inherit; font-size: 12px; transition: all 0.2s ease; }
.cong-btn:hover { color: var(--text-primary); border-color: rgba(124,215,238,0.3); }
.cong-btn.active { background: rgba(124,215,238,0.15); color: #7cd7ee; border-color: rgba(124,215,238,0.4); }
.spot-map { width: 100%; height: 300px; border-radius: var(--radius-card); overflow: hidden; border: 1px solid var(--frosted-border); }
.section-title { font-size: 1.2rem; font-weight: 600; color: var(--text-heading); margin: 0 0 12px; }
.facility-group { margin-bottom: 14px; }
.fac-group-title { font-size: 14px; font-weight: 600; color: var(--text-secondary); margin-bottom: 8px; }
.facility-grid { display: flex; flex-wrap: wrap; gap: 8px; }
.facility-tag { display: flex; align-items: center; gap: 6px; padding: 6px 14px; background: var(--frosted-bg); border: 1px solid var(--frosted-border); border-radius: var(--radius-pill); font-size: 13px; cursor: pointer; transition: all 0.15s; box-shadow: var(--neu-shadow-sm); }
.facility-tag:hover { transform: translateY(-2px); box-shadow: var(--neu-shadow); }
.fac-icon { font-size: 15px; }
.fac-name { color: var(--text-regular); }
.walking-food-list { display: flex; flex-direction: column; gap: 8px; }
.walking-food-card { padding: 12px 14px; background: var(--frosted-bg); backdrop-filter: blur(8px); border: 1px solid var(--frosted-border); border-radius: 8px; cursor: pointer; transition: all 0.15s; box-shadow: var(--neu-shadow-sm); }
.walking-food-card:hover { transform: translateY(-2px); box-shadow: var(--neu-shadow); }
.wfc-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
.wfc-name { font-size: 14px; color: var(--text-heading); }
.wfc-rating { font-size: 12px; color: var(--text-regular); }
.wfc-meta { display: flex; gap: 10px; flex-wrap: wrap; font-size: 12px; color: var(--text-muted); }
.wfc-cuisine { padding: 2px 8px; background: rgba(167,111,215,0.2); border-radius: 12px; color: #c9a0e8; font-weight: 600; }
.wfc-restaurant { color: var(--text-secondary); }
.wfc-distance { color: var(--text-muted); }
.nearby-spots-grid { display: flex; flex-direction: column; gap: 8px; }
.nearby-spot-card { display: flex; align-items: center; gap: 12px; padding: 12px 14px; background: var(--frosted-bg); border: 1px solid var(--frosted-border); border-radius: 8px; cursor: pointer; transition: all 0.15s; box-shadow: var(--neu-shadow-sm); }
.nearby-spot-card:hover { transform: translateY(-2px); box-shadow: var(--neu-shadow); }
.ns-info { flex: 1; min-width: 0; }
.ns-info strong { display: block; font-size: 14px; color: var(--text-heading); margin-bottom: 2px; }
.ns-info span { font-size: 12px; color: var(--text-muted); }
.review-card { padding: 14px; background: var(--frosted-bg); border: 1px solid var(--frosted-border); border-radius: 8px; margin-bottom: 8px; }
.review-header { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 13px; }
.review-header strong { color: var(--text-primary); }
.review-header span { color: #ffc107; }
.review-card p { font-size: 13px; color: var(--text-regular); line-height: 1.5; margin: 0; }
.empty-hint { text-align: center; padding: 30px 20px; color: var(--text-muted); font-size: 13px; }
</style>
