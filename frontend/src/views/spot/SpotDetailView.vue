<template>
  <DefaultLayout>
    <div v-loading="loading" class="spot-detail">
      <!-- Full-page background image -->
      <div v-if="spot?.imageUrl" class="detail-bg" :style="{ backgroundImage: `url(${spot.imageUrl})` }" />
      <div class="detail-bg-overlay" />

      <el-result v-if="!loading && !spot" icon="error" title="景点未找到" sub-title="无法加载该景点信息">
        <template #extra><el-button type="primary" @click="$router.push('/spots')">返回景点列表</el-button></template>
      </el-result>

      <template v-if="spot">
        <div class="detail-content">
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
          <div class="section-header">
            <h3 class="section-title">📍 位置</h3>
            <el-button v-if="facilities.length" size="small" type="primary" @click="openNavDialog">🚶 景区内导航</el-button>
          </div>
          <div id="spot-map-container" class="spot-map"></div>
        </section>

        <!-- Navigation Dialog -->
        <el-dialog v-model="navDialogVisible" title="🚶 景区内导航" width="1100px" destroy-on-close @closed="clearNav">
          <div class="nav-layout">
            <div class="nav-sidebar">
              <h3 class="panel-title">路径规划</h3>

              <!-- 起点 -->
              <div class="point-row">
                <el-tag type="success" size="small">起</el-tag>
                <span class="point-name" v-if="navStart">{{ navStart.name }}</span>
                
                <span class="point-name placeholder" v-else>景区入口</span>
                <el-button size="small" :type="navPickingStart ? 'danger' : 'primary'" @click="navPickingStart = !navPickingStart; navPickingWaypointIdx = null">
                  {{ navPickingStart ? '点击地图选起点' : '选起点' }}
                </el-button>
              </div>

              <!-- 途径点 -->
              <div class="waypoints-section">
                <div class="waypoints-header">
                  <span class="section-label">途径点</span>
                  <el-button size="small" type="success" plain @click="addNavWaypoint" :disabled="navPickingStart">
                    + 添加途径点
                  </el-button>
                </div>
                <div class="waypoint-row" v-for="(wp, idx) in navWaypoints" :key="idx">
                  <el-tag :type="navPickingWaypointIdx === idx ? 'warning' : 'success'" size="small" class="wp-num">{{ idx + 1 }}</el-tag>
                  <el-tag v-if="idx === navFinalDestIdx" type="danger" size="small" class="wp-final-tag">终</el-tag>
                  <span class="point-name" v-if="wp.name">{{ wp.name }}</span>
                  <span class="point-name placeholder" v-else>途径点 #{{ idx + 1 }}</span>
                  
                  <el-button size="small" :type="navPickingWaypointIdx === idx ? 'danger' : 'primary'" plain @click="toggleNavWaypointPick(idx)" :disabled="navPickingStart">选点</el-button>
                  <el-button size="small" :type="idx === navFinalDestIdx ? 'danger' : 'warning'" plain @click="navFinalDestIdx = navFinalDestIdx === idx ? -1 : idx" :disabled="navPickingWaypointIdx !== null || navPickingStart || wp.lat == null">{{ idx === navFinalDestIdx ? '终点' : '设终点' }}</el-button>
                  <el-button size="small" type="danger" plain @click="removeNavWaypoint(idx)" :disabled="navPickingWaypointIdx !== null || navPickingStart">✕</el-button>
                </div>
                <div class="waypoints-empty" v-if="navWaypoints.length === 0">尚未添加途径点，请点击上方按钮添加</div>
              </div>

              <!-- 出行方式 -->
              <div class="transport-section">
                <span class="section-label">出行方式</span>
                <el-checkbox-group v-model="navTransports" class="transport-group">
                  <el-checkbox label="WALK">步行</el-checkbox>
                  <el-checkbox label="BIKE">骑行</el-checkbox>
                  <el-checkbox label="SHUTTLE">穿梭巴士</el-checkbox>
                </el-checkbox-group>
              </div>

              <!-- 路线策略 -->
              <el-radio-group v-model="navStrategy" class="strategy-group">
                <el-radio label="DISTANCE">最短距离</el-radio>
                <el-radio label="TIME">最短时间</el-radio>
              </el-radio-group>

              <!-- POI搜索 -->
              <div class="poi-search-section">
                <span class="section-label">搜索地点</span>
                <div class="poi-search-row">
                  <el-input v-model="navPoiKeyword" placeholder="输入景点/地名..." size="small" clearable @keyup.enter="searchNavPOI" />
                  <el-button size="small" type="primary" @click="searchNavPOI">搜索</el-button>
                </div>
                <div v-if="navPoiResults.length" class="poi-results">
                  <div v-for="(poi, idx) in navPoiResults" :key="idx" class="poi-result-item" @click="selectNavPOI(poi)">
                    <span class="poi-name">{{ poi.name }}</span>
                    <el-button size="small" type="success" plain @click.stop="setNavStart(poi)">设为起点</el-button>
                    <el-button size="small" type="primary" plain @click.stop="setNavTarget(poi)">加入路径点</el-button>
                  </div>
                </div>
              </div>

              <!-- 规划按钮 -->
              <el-button type="primary" class="plan-btn" @click="planNavRoute" :loading="navPlanning" :disabled="!navStart || navWaypoints.length === 0">
                开始规划
              </el-button>

              <!-- 路线结果 -->
              <div class="route-result" v-if="navRouteResult">
                <el-divider />
                <div class="result-stats">
                  <div class="stat-item">
                    <span class="stat-label">总距离</span>
                    <span class="stat-value">{{ (navRouteResult.totalDistance / 1000).toFixed(2) }} km</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">预计时间</span>
                    <span class="stat-value">{{ formatNavTime(navRouteResult.totalTime) }}</span>
                  </div>
                </div>
                <div class="segments">
                  <span class="section-label">路径总览</span>
                  <div class="route-summary">
                    <span>{{ navStart?.name || '起点' }}</span>
                    <span v-for="(wp,i) in navWaypoints" :key="i"> → {{ wp.name || '点'+(i+1) }}</span>
                  </div>
                </div>
                <el-button @click="clearNavRoute">清除路线</el-button>
              </div>
            </div>
            <div class="nav-map-area">
              <div id="nav-map-container" class="nav-map"></div>
              <div class="mode-hint" v-if="navPickingStart">请点击地图设置起点 <el-button size="small" @click="navPickingStart = false">取消</el-button></div>
              <div class="mode-hint" v-if="navPickingWaypointIdx !== null">请点击地图设置途径点 #{{ navPickingWaypointIdx + 1 }} <el-button size="small" @click="navPickingWaypointIdx = null">取消</el-button></div>
            </div>
          </div>
        </el-dialog>

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
          </div> <!-- /detail-content -->
      </template>
    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import { spotApi } from '@/api/spotApi'
import { navigationApi } from '@/api/navigationApi'
import apiClient from '@/api/axios'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/authStore'
import type { SpotResponse } from '@/types/api'

interface FacilityItem {
  id: number; name: string; category: string; latitude: number; longitude: number;
  gcjLatitude?: number; gcjLongitude?: number; distance?: number
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
let navMapInstance: any = null
let navGeocoder: any = null
let navRoutePolyline: any = null
let navMarkers: any[] = []
const navDialogVisible = ref(false)
const navPickingStart = ref(false)
const navPickingWaypointIdx = ref<number | null>(null)
const navFinalDestIdx = ref(-1)
const navPlanning = ref(false)
const navStrategy = ref('DISTANCE')
const navTransports = ref<string[]>(['WALK'])
const navStart = ref<{ lat: number; lng: number; name?: string } | null>(null)
const navWaypoints = ref<{ lat: number | null; lng: number | null; name?: string }[]>([])
const navRouteResult = ref<{ totalDistance: number; totalTime: number } | null>(null)
const navPoiKeyword = ref('')
const navPoiResults = ref<any[]>([])

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
    TOILET: '🚻', PARKING: '🅿️', SERVICE: 'ℹ️', TICKET: '🎫',
    CLASSROOM: '🏫', LIBRARY: '📚', DORMITORY: '🏠', CAFETERIA: '🍽️',
    GYM: '🏟️', SUPERMARKET: '🏪', CAFE: '☕', HOSPITAL: '🏥',
  }
  return icons[category] || '📍'
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

function openNavDialog() {
  navStart.value = null
  navWaypoints.value = []
  navRouteResult.value = null
  navPoiKeyword.value = ''
  navPoiResults.value = []
  navPickingStart.value = false
  navPickingWaypointIdx.value = null
  navFinalDestIdx.value = -1
  navDialogVisible.value = true
  setTimeout(initNavMap, 300)
}

function clearNav() {
  if (navRoutePolyline) navRoutePolyline.setMap(null)
  navMarkers.forEach(m => m.setMap(null))
  navMarkers = []
  if (navMapInstance) { navMapInstance.destroy(); navMapInstance = null }
}

function addNavWaypoint() {
  navWaypoints.value.push({ lat: null, lng: null, name: '' })
}

function removeNavWaypoint(idx: number) {
  navWaypoints.value.splice(idx, 1)
  if (navFinalDestIdx.value === idx) navFinalDestIdx.value = -1
  else if (navFinalDestIdx.value > idx) navFinalDestIdx.value--
}

function toggleNavWaypointPick(idx: number) {
  navPickingWaypointIdx.value = navPickingWaypointIdx.value === idx ? null : idx
  navPickingStart.value = false
}

// Map click to pick point
function onNavMapClick(lng: number, lat: number) {
  if (navPickingStart.value) {
    navStart.value = { lat, lng, name: '所选位置' }
    navPickingStart.value = false
    initNavMap()
    return
  }
  if (navPickingWaypointIdx.value !== null) {
    const idx = navPickingWaypointIdx.value
    navWaypoints.value[idx] = { ...navWaypoints.value[idx], lat, lng, name: navWaypoints.value[idx].name || '所选位置' }
    navPickingWaypointIdx.value = null
    initNavMap()
  }
}

function searchNavPOI() {
  const kw = navPoiKeyword.value.trim()
  if (!kw) { navPoiResults.value = []; return }
  const results: any[] = []
  // Search facilities
  for (const f of facilities.value) {
    if (f.name.toLowerCase().includes(kw.toLowerCase())) {
      results.push({
        name: f.name, lat: f.latitude, lon: f.longitude,
        source: 'facility',
      })
    }
  }
  if (navMapInstance && (window as any).AMap) {
    const AMap = (window as any).AMap
    if (!navGeocoder) navGeocoder = new AMap.Geocoder({ city: '北京' })
  }
  navPoiResults.value = results
}

function selectNavPOI(poi: any) {
  navPoiKeyword.value = poi.name
  navPoiResults.value = []
  if (navWaypoints.value.length === 0 || navWaypoints.value[navWaypoints.value.length - 1].lat != null) {
    addNavWaypoint()
  }
  const last = navWaypoints.value.length - 1
  navWaypoints.value[last] = { lat: poi.lat, lng: poi.lon, name: poi.name }
  initNavMap()
}

function setNavStart(poi: any) {
  navStart.value = { lat: poi.lat, lng: poi.lon, name: poi.name }
  navPoiResults.value = []
  initNavMap()
}

function setNavTarget(poi: any) {
  if (navWaypoints.value.length === 0 || navWaypoints.value[navWaypoints.value.length - 1].lat != null) {
    addNavWaypoint()
  }
  navWaypoints.value[navWaypoints.value.length - 1] = { lat: poi.lat, lng: poi.lon, name: poi.name }
  navFinalDestIdx.value = navWaypoints.value.length - 1
  navPoiResults.value = []
  initNavMap()
}

function initNavMap() {
  const container = document.getElementById('nav-map-container')
  if (!container || !spot.value) return
  const tryInit = () => {
    if (!(window as any).AMap) { setTimeout(tryInit, 500); return }
    const AMap = (window as any).AMap
    const lat = (spot.value as any).gcjLatitude || spot.value!.latitude
    const lng = (spot.value as any).gcjLongitude || spot.value!.longitude
    if (navMapInstance) { navMapInstance.destroy() }
    navMapInstance = new AMap.Map(container, { zoom: 16, center: [lng, lat], resizeEnable: true })
    navMarkers.forEach(m => m.setMap(null))
    navMarkers = []

    // Click handler
    navMapInstance.on('click', (e: any) => {
      onNavMapClick(e.lnglat.getLng(), e.lnglat.getLat())
    })

    // Helper: check if a coordinate matches any facility position
    const isFacilityPos = (lat: number, lng: number): boolean =>
      facilities.value.some((f: any) => {
        const fl = (f as any).gcjLatitude || f.latitude
        const fn = (f as any).gcjLongitude || f.longitude
        return Math.abs(fl - lat) < 0.0001 && Math.abs(fn - lng) < 0.0001
      })

    // Start marker (black dot) — skip if at a facility position (facility marker handles it)
    if (navStart.value) {
      const sLat = (navStart.value as any).gcjLatitude || navStart.value.lat
      const sLng = (navStart.value as any).gcjLongitude || navStart.value.lng
      if (!isFacilityPos(sLat, sLng)) {
        const m = new AMap.Marker({
          position: [sLng, sLat], map: navMapInstance,
          content: `<div style="width:10px;height:10px;border-radius:50%;background:#1a1a1a;border:2px solid rgba(255,255,255,0.6);box-shadow:0 1px 4px rgba(0,0,0,0.4);"></div>`,
        })
        navMarkers.push(m)
      }
    }

    // Waypoint markers (small black dots) — skip if at a facility position
    for (let i = 0; i < navWaypoints.value.length; i++) {
      const wp = navWaypoints.value[i]
      if (wp.lat == null || wp.lng == null) continue
      if (!isFacilityPos(wp.lat, wp.lng)) {
        const m = new AMap.Marker({
          position: [wp.lng, wp.lat], map: navMapInstance,
          content: `<div style="width:10px;height:10px;border-radius:50%;background:#1a1a1a;border:2px solid rgba(255,255,255,0.6);box-shadow:0 1px 4px rgba(0,0,0,0.4);"></div>`,
        })
        navMarkers.push(m)
      }
    }

    // Facility markers — selected ones show black dot instead of cyan
    for (const f of facilities.value) {
      const fLat = (f as any).gcjLatitude || f.latitude
      const fLng = (f as any).gcjLongitude || f.longitude
      if (!fLat || !fLng) continue
      const isStart = navStart.value && Math.abs(fLat - ((navStart.value as any).gcjLatitude || navStart.value.lat)) < 0.0001 && Math.abs(fLng - ((navStart.value as any).gcjLongitude || navStart.value.lng)) < 0.0001
      const isWp = navWaypoints.value.some(wp => wp.lat != null && wp.lng != null && Math.abs(wp.lat - fLat) < 0.0001 && Math.abs(wp.lng - fLng) < 0.0001)
      const selected = isStart || isWp
      const dotColor = selected ? '#1a1a1a' : '#7cd7ee'
      const dotBorder = selected ? '2px solid rgba(255,255,255,0.6)' : '2px solid rgba(255,255,255,0.7)'
      const dotShadow = selected ? '0 1px 4px rgba(0,0,0,0.4)' : '0 0 6px rgba(124,215,238,0.5)'
      const labelHtml = `<div style="
            position:absolute;left:50%;top:9px;transform:translateX(-50%);
            background:rgba(42,40,40,0.85);backdrop-filter:blur(8px);
            -webkit-backdrop-filter:blur(8px);
            border:1px solid rgba(255,255,255,0.1);border-radius:4px;
            padding:1px 6px;
            font-family:'Lucida Console',monospace;
            font-size:11px;color:#e8e8e8;white-space:nowrap;
            box-shadow:0 2px 6px rgba(0,0,0,0.3);
          ">${f.name}</div>`
      const m = new AMap.Marker({
        position: [fLng, fLat],
        map: navMapInstance,
        offset: new (window as any).AMap.Pixel(0, 0),
        content: `<div style="position:relative;width:0;height:0">
          <div style="position:absolute;left:-6px;top:-6px;width:12px;height:12px;border-radius:50%;background:${dotColor};border:${dotBorder};box-shadow:${dotShadow};"></div>
          ${labelHtml}
        </div>`,
      })
      m.on('click', () => {
        // Respect picking mode
        if (navPickingStart.value) {
          navStart.value = { lat: fLat, lng: fLng, name: f.name }
          navPickingStart.value = false
          initNavMap()
          return
        }
        if (navPickingWaypointIdx.value !== null) {
          const idx = navPickingWaypointIdx.value
          navWaypoints.value[idx] = { lat: fLat, lng: fLng, name: f.name }
          navPickingWaypointIdx.value = null
          initNavMap()
          return
        }
        // Default: add as new waypoint
        if (navWaypoints.value.length === 0 || navWaypoints.value[navWaypoints.value.length - 1].lat != null) {
          addNavWaypoint()
        }
        navWaypoints.value[navWaypoints.value.length - 1] = { lat: fLat, lng: fLng, name: f.name }
        initNavMap()
      })
      navMarkers.push(m)
    }
  }
  tryInit()
}

async function planNavRoute() {
  if (!navStart.value || navWaypoints.value.length === 0) return
  navPlanning.value = true
  try {
    const valid = navWaypoints.value.filter(wp => wp.lat != null && wp.lng != null)
    if (!valid.length) { ElMessage.warning('请至少添加一个有效的途径点'); navPlanning.value = false; return }
    const res = await navigationApi.planRoute({
      startLat: navStart.value.lat, startLng: navStart.value.lng,
      targets: valid.map(wp => ({ lat: wp.lat!, lng: wp.lng!, name: wp.name || '途径点' })),
      strategy: navStrategy.value,
      transports: navTransports.value.length ? navTransports.value : ['WALK'],
    })
    const route = res.data.data
    navRouteResult.value = { totalDistance: route.totalDistance, totalTime: route.totalTime }

    if (navRoutePolyline) navRoutePolyline.setMap(null)
    if (navMapInstance && route.path?.length) {
      const AMap = (window as any).AMap
      const path = route.path.map((p: any) => [p.longitude, p.latitude])
      navRoutePolyline = new AMap.Polyline({
        path, map: navMapInstance,
        strokeColor: '#7cd7ee', strokeWeight: 4, strokeOpacity: 0.8,
        lineJoin: 'round', lineCap: 'round',
      })
      navMapInstance.setFitView(null, false, [50, 50, 50, 50])
    }
  } catch (e: any) {
    ElMessage.error('路线规划失败: ' + (e?.response?.data?.message || e.message || '未知错误'))
  } finally { navPlanning.value = false }
}

function clearNavRoute() {
  if (navRoutePolyline) { navRoutePolyline.setMap(null); navRoutePolyline = null }
  navRouteResult.value = null
}

function formatNavDistance(m: number): string {
  if (m >= 1000) return (m / 1000).toFixed(2) + ' km'
  return m.toFixed(0) + ' m'
}

function formatNavTime(s: number): string {
  if (s >= 60) return Math.round(s / 60) + ' 分钟'
  return s + ' 秒'
}

function initMap(lat: number, lng: number, facilities?: any[]) {
  const container = document.getElementById('spot-map-container')
  if (!container) return
  const tryInit = () => {
    if (!(window as any).AMap) { setTimeout(tryInit, 500); return }
    const AMap = (window as any).AMap
    if (mapInstance) { mapInstance.destroy() }
    mapInstance = new AMap.Map(container, { zoom: 16, center: [lng, lat], resizeEnable: true })
    // Spot marker
    new AMap.Marker({ position: [lng, lat], map: mapInstance, title: spot.value?.name })
    // Facility markers (frosted glass text labels)
    if (facilities) {
      for (const f of facilities) {
        const fLat = f.gcjLatitude || f.latitude
        const fLng = f.gcjLongitude || f.longitude
        if (!fLat || !fLng) continue
        const marker = new AMap.Marker({
          position: [fLng, fLat],
          map: mapInstance,
          offset: new (window as any).AMap.Pixel(0, 0),
          content: `<div style="position:relative;width:0;height:0">
            <div style="position:absolute;left:-6px;top:-6px;width:12px;height:12px;border-radius:50%;background:#7cd7ee;border:2px solid rgba(255,255,255,0.7);box-shadow:0 0 6px rgba(124,215,238,0.5);"></div>
            <div style="
              position:absolute;left:50%;top:9px;transform:translateX(-50%);
              background:rgba(42,40,40,0.85);backdrop-filter:blur(8px);
              -webkit-backdrop-filter:blur(8px);
              border:1px solid rgba(255,255,255,0.1);border-radius:4px;
              padding:1px 6px;
              font-family:'Lucida Console',monospace;
              font-size:11px;color:#e8e8e8;white-space:nowrap;
              box-shadow:0 2px 6px rgba(0,0,0,0.3);
            ">${f.name}</div>
          </div>`,
        })
        marker.on('click', () => {
          ElMessage.info(`${f.name} (${f.category})`)
        })
      }
    }
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
    nextTick(() => initMap(
      (spot.value as any).gcjLatitude || spot.value!.latitude,
      (spot.value as any).gcjLongitude || spot.value!.longitude,
      facilities.value.map(f => ({
        ...f,
        gcjLatitude: f.gcjLatitude || f.latitude,
        gcjLongitude: f.gcjLongitude || f.longitude,
      }))
    ))
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
  clearNav()
})
</script>

<style scoped>
.spot-detail { max-width: 900px; margin: 0 auto; position: relative; }

/* ── Full-page background ── */
.detail-bg {
  position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
  background-size: cover; background-position: center;
  filter: blur(20px) brightness(0.5);
  transform: scale(1.1); /* hide blur edges */
  z-index: 0;
  pointer-events: none;
}
.detail-bg-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.35);
  z-index: 0;
  pointer-events: none;
}
.detail-content {
  position: relative; z-index: 1;
}

/* ── Hero ── */
.hero {
  position: relative; min-height: 200px;
  border-radius: var(--radius-card);
  overflow: hidden; margin-bottom: 20px;
  display: flex; align-items: flex-end;
  background: rgba(42,40,40,0.35);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--frosted-border);
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

/* ── Navigation Dialog (matches NavigationView style) ── */
.nav-layout { display: flex; gap: 20px; min-height: 520px; }
.nav-sidebar { width: 340px; flex-shrink: 0; display: flex; flex-direction: column; gap: 12px; padding: 4px 0; }
.panel-title { font-size: 15px; font-weight: 700; margin: 0; color: var(--text-primary); }
.point-row { display: flex; align-items: center; gap: 4px; font-size: 12px; flex-wrap: wrap; }
.point-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-regular); }
.point-name.placeholder { color: var(--text-muted); }
.point-coord { font-size: 10px; color: var(--text-muted); flex-shrink: 0; }
.waypoints-section { display: flex; flex-direction: column; gap: 4px; }
.waypoints-header { display: flex; justify-content: space-between; align-items: center; }
.waypoint-row { display: flex; align-items: center; gap: 3px; flex-wrap: wrap; font-size: 12px; }
.wp-num { flex-shrink: 0; }
.wp-final-tag { flex-shrink: 0; }
.waypoints-empty { font-size: 12px; color: var(--text-muted); padding: 8px; text-align: center; }
.section-label { font-size: 12px; font-weight: 700; color: var(--text-secondary); letter-spacing: 0.5px; }
.transport-section, .poi-search-section { display: flex; flex-direction: column; gap: 4px; }
.transport-group { display: flex; gap: 4px; }
.transport-group .el-checkbox { margin-right: 0; }
.strategy-group { display: flex; gap: 8px; }
.strategy-group .el-radio { margin-right: 0; }
.poi-search-row { display: flex; gap: 4px; }
.poi-results { max-height: 180px; overflow-y: auto; border: 1px solid var(--frosted-border); border-radius: 6px; }
.poi-result-item { display: flex; align-items: center; gap: 4px; padding: 4px 6px; font-size: 12px; color: var(--text-regular); cursor: pointer; }
.poi-result-item:hover { background: rgba(255,255,255,0.06); }
.poi-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.poi-coord { font-size: 10px; color: var(--text-muted); flex-shrink: 0; }
.plan-btn { width: 100%; }
.route-result { display: flex; flex-direction: column; gap: 6px; }
.result-stats { display: flex; gap: 12px; }
.stat-item { flex: 1; text-align: center; padding: 8px; background: rgba(58,210,159,0.08); border: 1px solid rgba(58,210,159,0.2); border-radius: 8px; }
.stat-label { display: block; font-size: 11px; color: var(--text-muted); }
.stat-value { display: block; font-size: 16px; font-weight: 700; color: #3ad29f; margin-top: 2px; }
.route-summary { font-size: 12px; color: var(--text-regular); word-break: break-all; line-height: 1.6; }
.nav-map-area { flex: 1; min-width: 0; position: relative; }
.nav-map { width: 100%; height: 560px; border-radius: 8px; overflow: hidden; border: 1px solid var(--frosted-border); }
.mode-hint { position: absolute; top: 10px; left: 50%; transform: translateX(-50%); background: var(--frosted-bg); backdrop-filter: blur(8px); padding: 6px 14px; border-radius: 8px; border: 1px solid var(--frosted-border); font-size: 13px; color: var(--text-regular); z-index: 10; display: flex; align-items: center; gap: 8px; white-space: nowrap; }

.section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
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
<style>
.el-overlay-dialog { display: flex; align-items: center; justify-content: center; }
</style>
