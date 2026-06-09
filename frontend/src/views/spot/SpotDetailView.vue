<template>
  <DefaultLayout>
    <div class="detail-page" v-loading="loading">
      <div v-if="!loading && !spot" class="error-state">
        <h2>404</h2>
        <p>Spot not found</p>
        <el-button type="primary" @click="$router.push('/spots')">← Back to Spots</el-button>
      </div>

      <template v-if="spot">
        <!-- Hero -->
        <div class="detail-hero" :style="{ background: heroBg }">
          <div class="hero-overlay"></div>
          <div class="hero-content">
            <el-button class="back-btn" text @click="$router.push('/spots')">← BACK</el-button>
            <h1>{{ spot.name }}</h1>
            <div class="hero-tags">
              <el-tag size="small" type="warning">{{ spot.category }}</el-tag>
              <el-tag v-if="spot.address" size="small" type="primary">📍 {{ spot.address }}</el-tag>
            </div>
          </div>
        </div>

        <!-- Stats row -->
        <div class="stats-row">
          <div class="stat-item"><span class="stat-num">⭐ {{ spot.avgRating?.toFixed(1) || '—' }}</span><span>Rating</span></div>
          <div class="stat-item"><span class="stat-num">👁 {{ spot.popularity || 0 }}</span><span>Popularity</span></div>
          <div class="stat-item"><span class="stat-num">📝 {{ spot.ratingCount || 0 }}</span><span>Reviews</span></div>
          <div class="stat-item" v-if="spot.ticketPrice"><span class="stat-num">¥{{ spot.ticketPrice }}</span><span>Ticket</span></div>
        </div>

        <!-- Congestion display + report -->
        <div class="content-section">
          <div class="congestion-row">
            <div class="congestion-badge" :class="['cong-' + congestionLevel.toLowerCase(), { 'cong-pulse': congJustReported }]">
              <span class="cong-icon">{{ congestionIcon }}</span>
              <span class="cong-label">{{ congestionLabel }}</span>
            </div>
            <div class="congestion-report-group">
              <span class="cong-report-hint">Report current crowd:</span>
              <button v-for="opt in congestionOptions" :key="opt.value"
                class="cong-btn" :class="{ active: selectedCongestion === opt.value }"
                @click="selectedCongestion = opt.value">
                {{ opt.label }}
              </button>
              <el-button size="small" type="primary" :loading="congLoading"
                :disabled="!selectedCongestion" @click="submitCongestion">Submit</el-button>
            </div>
          </div>
        </div>

        <!-- Description -->
        <div class="content-section">
          <div class="content-card">
            <h3>📖 About</h3>
            <p>{{ spot.description || 'No description available.' }}</p>
            <div v-if="spot.openingHours" class="info-line"><strong>🕐 Hours:</strong> {{ spot.openingHours }}</div>
          </div>
        </div>

        <!-- AMap location -->
        <div class="content-section">
          <h3 class="section-title">📍 Location</h3>
          <div id="spot-map-container" class="spot-map"></div>
        </div>

        <!-- User rating widget -->
        <div class="content-section">
          <div class="rating-card">
            <h3>⭐ Rate this spot</h3>
            <div class="rate-row">
              <el-rate v-model="userRating" :max="5" :disabled="rated"
                @change="onRateChange" size="large" show-score
                score-template="{value} / 5" />
              <span v-if="rated" class="rated-badge">✓ You rated {{ userRating }}/5</span>
            </div>
          </div>
        </div>

        <!-- Facilities -->
        <div class="content-section" v-if="facilities.length">
          <h3 class="section-title">🏗️ Facilities</h3>
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
        </div>

        <!-- Nearby food by walking distance -->
        <div class="content-section" v-if="walkingFoods.length">
          <h3 class="section-title">🍜 Nearby Food (walking distance)</h3>
          <div class="walking-food-list">
            <div v-for="f in walkingFoods" :key="f.id" class="walking-food-card" @click="$router.push('/foods/' + f.id)">
              <div class="wfc-top">
                <strong class="wfc-name">{{ f.name }}</strong>
                <span class="wfc-rating">⭐ {{ f.avgRating?.toFixed(1) || '—' }}</span>
              </div>
              <div class="wfc-meta">
                <span v-if="f.cuisine" class="wfc-cuisine">{{ f.cuisine }}</span>
                <span v-if="f.restaurantName" class="wfc-restaurant">🏪 {{ f.restaurantName }}</span>
                <span class="wfc-distance">🚶 ~{{ walkingDistance(f) }}m</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Reviews -->
        <div class="content-section">
          <h3 class="section-title">💬 Reviews</h3>
          <div v-if="!reviews.length" class="empty-hint">No reviews yet. Be the first!</div>
          <div v-for="r in reviews" :key="r.id" class="review-card">
            <div class="review-header">
              <strong>User #{{ r.userId }}</strong>
              <span>⭐ {{ r.rating }}/5</span>
            </div>
            <p v-if="r.content">{{ r.content }}</p>
          </div>
        </div>
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
const loading = ref(true)
const congestionLevel = ref('EMPTY')
const congJustReported = ref(false)
const userRating = ref(Number(localStorage.getItem('spotRating_' + route.params.id)) || 0)
const rated = ref(userRating.value > 0)
const rateLoading = ref(false)
const selectedCongestion = ref('')
const congLoading = ref(false)

let mapInstance: any = null

const colors = ['#ffdd00', '#ff69b4', '#00bfff', '#00e676', '#ff9100']
const heroColor = computed(() => colors[(spot.value?.id || 0) % colors.length])
const heroBg = computed(() => {
  const img = (spot.value as any)?.imageUrl
  if (img) return `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url(${img}) center/cover no-repeat`
  return heroColor.value
})

const congestionOptions = [
  { value: 'OVERFLOWING', label: '爆满' },
  { value: 'CROWDED', label: '拥挤' },
  { value: 'MODERATE', label: '挺多' },
  { value: 'SPARSE', label: '挺少' },
  { value: 'EMPTY', label: '基本没人' }
]

const congestionLabel = computed(() => {
  const m: Record<string, string> = {
    OVERFLOWING: '爆满', CROWDED: '拥挤', MODERATE: '挺多', SPARSE: '挺少', EMPTY: '基本没人'
  }
  return m[congestionLevel.value] || congestionLevel.value
})

const congestionIcon = computed(() => {
  const m: Record<string, string> = {
    OVERFLOWING: '🔴', CROWDED: '🟠', MODERATE: '🟡', SPARSE: '🟢', EMPTY: '🔵'
  }
  return m[congestionLevel.value] || '⚪'
})

function facilityIcon(category: string): string {
  const icons: Record<string, string> = {
    TOILET: '🚻', PARKING: '🅿️', SERVICE: '🔧', SHOP: '🏪',
    CAFE: '☕', HOSPITAL: '🏥', AED: '❤️', ATM: '🏧', INFO: 'ℹ️', RESTAURANT: '🍽️'
  }
  return icons[category] || '📍'
}

const categoryLabels: Record<string, string> = {
  TOILET: '🚻 Toilets', PARKING: '🅿️ Parking', SERVICE: '🔧 Service', SHOP: '🏪 Shops',
  CAFE: '☕ Cafes', HOSPITAL: '🏥 Medical', AED: '❤️ AED', ATM: '🏧 ATMs', INFO: 'ℹ️ Info',
  RESTAURANT: '🍽️ Restaurants'
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

  // Wait for AMap SDK
  const tryInit = () => {
    if (!(window as any).AMap) { setTimeout(tryInit, 500); return }
    const AMap = (window as any).AMap
    mapInstance = new AMap.Map(container, {
      zoom: 15, center: [lng, lat], resizeEnable: true
    })
    new AMap.Marker({ position: [lng, lat], map: mapInstance })
  }
  tryInit()
}

async function onRateChange(rating: number) {
  if (rating < 1 || !spot.value) { userRating.value = 0; return }
  if (!authStore.isAuthenticated) {
    ElMessage.warning('Please log in to rate spots')
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
      ElMessage.success('Rating submitted!')
    }
  } catch (e: any) {
    console.error('Rate error:', e)
    if (e?.response?.status === 401) {
      ElMessage.error('Session expired — please log in again')
      authStore.logout()
      router.push('/login?redirect=' + route.path)
    } else {
      ElMessage.error('Failed to submit rating: ' + (e?.response?.data?.message || e?.message || 'unknown error'))
    }
  } finally { rateLoading.value = false }
}

async function submitCongestion() {
  if (!selectedCongestion.value || !spot.value) return
  if (!authStore.isAuthenticated) {
    ElMessage.warning('Please log in to report congestion')
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
      ElMessage.success('Congestion reported!')
    }
  } catch (e: any) {
    console.error('Congestion error:', e)
    if (e?.response?.status === 401) {
      ElMessage.error('Session expired — please log in again')
      authStore.logout()
      router.push('/login?redirect=' + route.path)
    } else {
      ElMessage.error('Failed to report congestion: ' + (e?.response?.data?.message || e?.message || 'server error'))
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
    // Wait a tick for DOM to render before init map
    nextTick(() => initMap(spot.value!.latitude, spot.value!.longitude))

    // Fetch nearby foods by walking distance
    try {
      const nearby = await apiClient.get('/spots/' + id + '/foods/nearby', { params: { maxDistance: 2000 } })
      if (nearby.data.data) walkingFoods.value = nearby.data.data
    } catch { /* okay */ }
  }
})

onBeforeUnmount(() => {
  if (mapInstance) { mapInstance.destroy(); mapInstance = null }
})
</script>

<style scoped>
.detail-page { max-width: 800px; margin: 0 auto; }
.error-state { text-align: center; padding: 80px 20px; color: var(--text-primary); }
.error-state h2 { font-size: 4rem; margin: 0; }

/* Hero — frosted glass */
.detail-hero {
  position: relative; padding: 40px 24px; margin-bottom: 16px;
  border: 1px solid var(--frosted-border); border-radius: var(--radius-card);
  box-shadow: var(--neu-shadow); min-height: 180px;
  display: flex; align-items: flex-end; overflow: hidden;
}
.hero-overlay {
  position: absolute; inset: 0;
  background: linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 50%);
  pointer-events: none; border-radius: var(--radius-card);
}
.hero-content { position: relative; z-index: 1; color: #fff; width: 100%; }
.back-btn { margin-bottom: 12px; }
.detail-hero h1 {
  font-size: 2rem; margin: 8px 0; letter-spacing: 1px;
  text-shadow: 0 2px 8px rgba(0,0,0,0.5); color: #fff;
  overflow-wrap: break-word;
}
.hero-tags :deep(.el-tag) { border: 1px solid rgba(255,255,255,0.3) !important; }

/* Stats — frosted glass */
.stats-row { display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; }
.stat-item {
  flex: 1; min-width: 100px; text-align: center; padding: 16px 8px;
  background: var(--frosted-bg); backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid var(--frosted-border); border-radius: 12px;
  box-shadow: var(--neu-shadow-sm);
}
.stat-num { display: block; font-size: 1.5rem; color: var(--text-primary); }
.stat-item span:last-child { font-size: 12px; text-transform: uppercase; color: var(--text-secondary); }

/* Congestion — frosted glass */
.congestion-row {
  display: flex; align-items: center; gap: 16px; flex-wrap: wrap; padding: 16px;
  background: var(--frosted-bg); backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid var(--frosted-border); border-radius: 12px;
  box-shadow: var(--neu-shadow-sm);
}
.congestion-badge {
  display: flex; align-items: center; gap: 6px; padding: 8px 16px;
  border-radius: var(--radius-pill); border: 1px solid var(--frosted-border);
  font-weight: 700; font-size: 16px;
}
.cong-icon { font-size: 20px; }
.cong-overflowing { background: rgba(220,53,69,0.4); color: #fff; }
.cong-crowded { background: rgba(255,152,0,0.4); color: #fff; }
.cong-moderate { background: rgba(255,193,7,0.35); color: #fff; }
.cong-sparse { background: rgba(58,210,159,0.4); color: #fff; }
.cong-empty { background: rgba(124,215,238,0.35); color: #fff; }
.cong-pulse { animation: congPulse 0.6s ease-in-out 3; }
@keyframes congPulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.1); box-shadow: 0 0 20px rgba(124,215,238,0.4); }
  100% { transform: scale(1); }
}
.congestion-report-group { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; font-size: 13px; }
.cong-report-hint { color: var(--text-secondary); font-size: 12px; }
.cong-btn {
  padding: 4px 12px; border: 1px solid var(--frosted-border); border-radius: var(--radius-pill);
  background: var(--frosted-bg); backdrop-filter: blur(6px);
  font-size: 12px; font-weight: 600; cursor: pointer; color: var(--text-regular);
  box-shadow: var(--neu-shadow-sm); transition: all 0.2s ease;
}
.cong-btn:hover { transform: translateY(-1px); box-shadow: var(--neu-shadow); }
.cong-btn.active { background: rgba(167,111,215,0.3); border-color: rgba(167,111,215,0.4); color: #fff; }

/* Content */
.content-section { margin-bottom: 20px; }
.section-title { font-size: 1.3rem; margin: 0 0 12px; letter-spacing: 1px; color: var(--text-primary); }
.content-card {
  padding: 20px; background: var(--frosted-bg); backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid var(--frosted-border); border-radius: 12px;
  box-shadow: var(--neu-shadow-sm);
}
.content-card h3 { font-size: 1.2rem; margin: 0 0 8px; color: var(--text-primary); }
.content-card p { margin: 0; line-height: 1.6; color: var(--text-regular); }
.info-line { margin-top: 10px; font-size: 14px; color: var(--text-regular); }

/* Map */
.spot-map {
  height: 300px; border: 1px solid var(--frosted-border);
  border-radius: var(--radius-card); box-shadow: var(--neu-shadow-sm);
  overflow: hidden;
}

/* Rating card — frosted glass */
.rating-card {
  padding: 20px; background: var(--frosted-bg); backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid var(--frosted-border); border-radius: 12px;
  box-shadow: var(--neu-shadow-sm);
}
.rating-card h3 { font-size: 1.2rem; margin: 0 0 12px; color: var(--text-primary); }
.rate-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.rate-row :deep(.el-rate) { line-height: 1; }
.rate-row :deep(.el-rate__icon) { font-size: 24px !important; margin-right: 4px; }
.rate-row :deep(.el-rate__item) { transition: transform 0.15s; }
.rate-row :deep(.el-rate__item:hover) { transform: scale(1.2); }
.rated-badge {
  font-size: 13px; color: var(--pop-green); font-weight: 600;
  padding: 4px 12px; background: rgba(58,210,159,0.12);
  border: 1px solid rgba(58,210,159,0.3); border-radius: var(--radius-pill);
}

/* Facilities — pill tags */
.facility-grid { display: flex; flex-wrap: wrap; gap: 8px; }
.facility-tag {
  display: flex; align-items: center; gap: 4px; padding: 6px 14px;
  border: 1px solid var(--frosted-border); border-radius: var(--radius-pill);
  background: var(--frosted-bg); backdrop-filter: blur(6px);
  font-size: 12px; font-weight: 600; color: var(--text-regular);
  box-shadow: var(--neu-shadow-sm); transition: all 0.2s ease;
}
.fac-icon { font-size: 16px; }
.fac-name { color: var(--text-primary); }
.fac-toilet { background: rgba(91,141,239,0.3); border-color: rgba(91,141,239,0.4); }
.fac-parking { background: rgba(58,210,159,0.25); border-color: rgba(58,210,159,0.35); }
.fac-aed { background: rgba(220,53,69,0.25); border-color: rgba(220,53,69,0.35); }
.fac-shop { background: rgba(167,111,215,0.25); border-color: rgba(167,111,215,0.35); }
.fac-info { background: rgba(255,152,0,0.25); border-color: rgba(255,152,0,0.35); }
.fac-cafe { background: rgba(212,165,116,0.25); border-color: rgba(212,165,116,0.35); }
.fac-hospital { background: rgba(220,53,69,0.25); border-color: rgba(220,53,69,0.35); }
.fac-atm { background: rgba(156,39,176,0.25); border-color: rgba(156,39,176,0.35); }
.fac-service { background: rgba(96,125,139,0.25); border-color: rgba(96,125,139,0.35); }

/* Walking food list */
.walking-food-list { display: flex; flex-direction: column; gap: 8px; }
.walking-food-card {
  padding: 12px 14px; background: var(--frosted-bg); backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid var(--frosted-border); border-radius: 12px;
  box-shadow: var(--neu-shadow-sm); cursor: pointer;
  transition: all 0.2s cubic-bezier(0.23, 1, 0.32, 1);
}
.walking-food-card:hover { transform: translateY(-2px); box-shadow: var(--neu-shadow); }
.wfc-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
.wfc-name { font-size: 14px; color: var(--text-primary); }
.wfc-rating { font-size: 12px; color: var(--text-regular); }
.wfc-meta { display: flex; gap: 10px; flex-wrap: wrap; font-size: 12px; color: var(--text-muted); }
.wfc-cuisine {
  padding: 2px 8px; background: rgba(167,111,215,0.2);
  border: 1px solid rgba(167,111,215,0.3); border-radius: var(--radius-pill);
  color: #c9a0e8; font-weight: 600;
}
.wfc-restaurant { color: var(--text-secondary); }
.wfc-distance { color: #7cd7ee; font-weight: 600; }

/* Facility group */
.facility-group { margin-bottom: 10px; }
.fac-group-title { font-size: 13px; font-weight: 700; margin: 0 0 6px; letter-spacing: 0.5px; color: var(--text-primary); }
.facility-tag.clickable { cursor: pointer; }
.facility-tag.clickable:hover { transform: translateY(-2px); box-shadow: var(--neu-shadow); }

/* Reviews — frosted glass */
.review-card {
  padding: 14px; margin-bottom: 10px;
  background: var(--frosted-bg); backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid var(--frosted-border); border-radius: 12px;
  box-shadow: var(--neu-shadow-sm);
}
.review-header { display: flex; justify-content: space-between; margin-bottom: 6px; color: var(--text-primary); }
.review-card p { margin: 0; font-size: 14px; color: var(--text-regular); }
.empty-hint { color: var(--text-muted); font-size: 14px; padding: 20px; text-align: center; }
</style>
