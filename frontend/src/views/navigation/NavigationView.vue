<template>
  <DefaultLayout>
    <div class="nav-container">
      <!-- 地图区域 -->
      <div class="map-area">
        <div id="amap-container" ref="mapContainer"></div>
        <div class="map-hint" v-if="!mapReady">正在加载地图...</div>
        <div class="mode-hint" v-if="mapReady && pickingStart">
          请点击地图设置起点
          <el-button size="small" @click="pickingStart = false">取消</el-button>
        </div>
        <div class="mode-hint" v-if="mapReady && pickingWaypointIdx !== null">
          请点击地图设置途径点 #{{ pickingWaypointIdx + 1 }}
          <el-button size="small" @click="pickingWaypointIdx = null">取消</el-button>
        </div>
      </div>

      <!-- 控制面板 -->
      <div class="control-panel">
        <h3 class="panel-title">路径规划</h3>

        <!-- 起点 -->
        <div class="point-row">
          <el-tag type="success" size="small">起</el-tag>
          <span class="point-name" v-if="startPoint">{{ startPoint.name || '起点' }}</span>
          <span class="point-coord" v-if="startPoint">{{ startPoint.lng.toFixed(5) }}, {{ startPoint.lat.toFixed(5) }}</span>
          <el-button size="small" :type="pickingStart ? 'danger' : 'primary'" @click="pickingStart = !pickingStart; pickingWaypointIdx = null">
            {{ pickingStart ? '点击地图选起点' : '选起点' }}
          </el-button>
        </div>

        <!-- 途径点列表 -->
        <div class="waypoints-section">
          <div class="waypoints-header">
            <span class="section-label">途径点</span>
            <el-button size="small" type="success" plain @click="addWaypoint" :disabled="pickingStart">
              <el-icon><Plus /></el-icon> 添加途径点
            </el-button>
          </div>

          <div class="waypoint-row" v-for="(wp, idx) in waypoints" :key="idx">
            <el-tag :type="idx === pickingWaypointIdx ? 'warning' : 'success'" size="small" class="wp-num">{{ idx + 1 }}</el-tag>
            <el-tag v-if="idx === finalDestinationIdx" type="danger" size="small" class="wp-final-tag">终</el-tag>
            <span class="point-name" v-if="wp.name">{{ wp.name }}</span>
            <span class="point-name placeholder" v-else>途径点 #{{ idx + 1 }}</span>
            <span class="point-coord" v-if="wp.lat !== null && wp.lng !== null">{{ wp.lng.toFixed(5) }}, {{ wp.lat.toFixed(5) }}</span>
            <el-button
              size="small"
              :type="pickingWaypointIdx === idx ? 'danger' : 'primary'"
              plain
              @click="toggleWaypointPick(idx)"
              :disabled="pickingStart"
            >
              {{ pickingWaypointIdx === idx ? '选点中...' : '选点' }}
            </el-button>
            <el-button size="small" :type="idx === finalDestinationIdx ? 'danger' : 'warning'" plain
              @click="finalDestinationIdx = finalDestinationIdx === idx ? -1 : idx"
              :disabled="pickingWaypointIdx !== null || pickingStart || wp.lat === null"
            >
              {{ idx === finalDestinationIdx ? '终点' : '设终点' }}
            </el-button>
            <el-button size="small" type="danger" plain @click="removeWaypoint(idx)" :disabled="pickingWaypointIdx !== null || pickingStart">
              <el-icon><Delete /></el-icon>
            </el-button>
          </div>

          <div class="waypoints-empty" v-if="waypoints.length === 0">
            尚未添加途径点，请点击上方按钮添加
          </div>
        </div>

        <!-- 出行方式 -->
        <div class="transport-section">
          <span class="section-label">出行方式</span>
          <el-checkbox-group v-model="transports" class="transport-group">
            <el-checkbox label="WALK">步行</el-checkbox>
            <el-checkbox label="BIKE">骑行</el-checkbox>
            <el-checkbox label="SHUTTLE">穿梭巴士</el-checkbox>
          </el-checkbox-group>
        </div>

        <!-- 路线策略 -->
        <el-radio-group v-model="strategy" class="strategy-group">
          <el-radio label="DISTANCE">最短距离</el-radio>
          <el-radio label="TIME">最短时间</el-radio>
        </el-radio-group>

        <!-- POI搜索 -->
        <div class="poi-search-section">
          <span class="section-label">搜索地点</span>
          <div class="poi-search-row">
            <el-input v-model="poiKeyword" placeholder="输入景点/地名..." size="small" clearable @keyup.enter="searchPOI" />
            <el-button size="small" type="primary" @click="searchPOI">搜索</el-button>
          </div>
          <div v-if="poiResults.length" class="poi-results">
            <div v-for="(poi, idx) in poiResults" :key="idx" class="poi-result-item" @click="selectPOI(poi)">
              <span class="poi-name">{{ poi.name }}</span>
              <span class="poi-coord">{{ poi.lat.toFixed(4) }}, {{ poi.lon.toFixed(4) }}</span>
              <el-button size="small" type="success" plain @click.stop="setStartFromPOI(poi)">起点</el-button>
              <el-button size="small" type="danger" plain @click.stop="setTargetFromPOI(poi)">终点</el-button>
            </div>
          </div>
        </div>

        <!-- 规划按钮 -->
        <el-button type="primary" class="plan-btn" @click="planRoute" :loading="planning" :disabled="!startPoint || waypoints.length === 0">
          开始规划
        </el-button>

        <!-- 路线结果 -->
        <div class="route-result" v-if="routeResult">
          <el-divider />

          <!-- 总览 -->
          <div class="result-stats">
            <div class="stat-item">
              <span class="stat-label">总距离</span>
              <span class="stat-value">{{ (routeResult.totalDistance / 1000).toFixed(2) }} km</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">预计时间</span>
              <span class="stat-value">{{ formatTime(routeResult.totalTime) }}</span>
            </div>
          </div>


          <!-- 路径分段展示（带交通方式） -->
          <div class="segments" v-if="routeResult?.segments && routeResult.segments.length > 0">
            <span class="section-label">路线详情</span>
            <div class="segment-list">
              <div v-for="(seg, i) in routeResult.segments" :key="i"
                   :class="['segment-item', 'seg-' + (seg.transport || 'WALK').toLowerCase()]">
                <div class="seg-header">
                  <span class="seg-transport-icon">{{ transportIcon(seg.transport) }}</span>
                  <span class="seg-road-name">{{ seg.roadName || seg.roadType || '道路' }}</span>
                  <span class="seg-distance">{{ (seg.distance >= 1000 ? (seg.distance/1000).toFixed(1)+'km' : seg.distance.toFixed(0)+'m') }}</span>
                </div>
                <div class="seg-meta">
                  <span class="seg-transport-label">{{ formatTransport(seg.transport) }}</span>
                  <span class="seg-road-type" v-if="seg.roadType">{{ seg.roadType }}</span>
                </div>
              </div>
            </div>
          </div>
          <!-- 兼容旧版无分段的后端响应 -->
          <div class="route-summary" v-else-if="routeResult">
            <span>{{ startPoint?.name || '起点' }}</span>
            <span v-for="(wp,i) in waypoints" :key="i"> → {{ wp.name || '点'+(i+1) }}</span>
          </div>

          <el-button class="save-btn" @click="saveItinerary" :loading="saving">保存行程</el-button>
          <el-button @click="clearRoute">清除路线</el-button>
        </div>
      </div>
    </div>

    <!-- 室内导航弹窗 -->
    <el-dialog v-model="indoorDialogVisible" title="🏛 综合实验教学楼 · 室内导航" width="75%" top="4vh" destroy-on-close
      @close="clearIndoor">
      <div class="indoor-dialog-body">
        <div class="indoor-left">
          <div class="indoor-toolbar">
            <button v-for="f in indoorFloors" :key="f" :class="['floor-tab', { active: indoorFloor === f }]" @click="indoorFloor = f">{{ f }}</button>
            <div class="indoor-toolbar-spacer"></div>
            <button :class="['sel-btn', { active: indoorSelectMode === 'start' }]" @click="indoorSelectMode = indoorSelectMode === 'start' ? null : 'start'">
              {{ indoorStart ? 'S:' + indoorStart.name : '选起点' }}
            </button>
            <button :class="['sel-btn', { active: indoorSelectMode === 'end' }]" @click="indoorSelectMode = indoorSelectMode === 'end' ? null : 'end'">
              {{ indoorEnd ? 'E:' + indoorEnd.name : '选终点' }}
            </button>
          </div>
          <div class="indoor-plan-wrap" @click="indoorSvgClicked">
            <svg :viewBox="indoorSvgViewBox" class="indoor-svg">
              <line v-for="e in indoorFloorEdges" :key="e.from + e.to"
                :x1="indoorNodePos(e.from).x" :y1="indoorNodePos(e.from).y"
                :x2="indoorNodePos(e.to).x" :y2="indoorNodePos(e.to).y"
                :class="['indoor-edge', { 'on-path': indoorPathEdgeSet.has(e.from + '-' + e.to) }]" />
              <line v-for="e in indoorPathEdges" :key="e.from + e.to"
                :x1="indoorNodePos(e.from).x" :y1="indoorNodePos(e.from).y"
                :x2="indoorNodePos(e.to).x" :y2="indoorNodePos(e.to).y"
                class="indoor-route-line" />
              <g v-for="n in indoorFloorNodes" :key="n.id" class="indoor-svg-node"
                :transform="'translate(' + n.x + ',' + n.y + ')'">
                <title>{{ n.name }}</title>
                <rect v-if="n.type === 'STAIRS' || n.type === 'ELEVATOR'" x="-8" y="-8" width="16" height="16" rx="3" :class="'ns-' + indoorNodeType(n.type)" />
                <polygon v-else-if="n.type === 'ENTRANCE'" points="-10,8 0,-10 10,8" :class="'ns-' + indoorNodeType(n.type)" />
                <rect v-else x="-6" y="-6" width="12" height="12" :class="'ns-' + indoorNodeType(n.type)" />
                <text x="14" y="4" class="indoor-node-label">{{ n.name }}</text>
                <text v-if="indoorStart && n.id === indoorStart.id" x="0" y="-14" class="indoor-marker-start">起</text>
                <text v-if="indoorEnd && n.id === indoorEnd.id" x="0" y="-14" class="indoor-marker-end">终</text>
              </g>
            </svg>
          </div>
          <div class="indoor-action-bar">
            <el-button size="small" @click="clearIndoor">清除</el-button>
            <el-button size="small" type="primary" @click="doIndoorNav" :loading="indoorLoading">导航</el-button>
          </div>
        </div>
        <div class="indoor-right">
          <div v-if="indoorRoute">
            <h4>导航步骤</h4>
            <p>距离: {{ indoorRoute.totalDistance.toFixed(0) }}m</p>
            <div class="indoor-step-list">
              <div v-for="(s, i) in indoorRoute.steps" :key="i" :class="['step-item', { 'cf': s.crossFloor }]">
                <div class="step-num">{{ i + 1 }}</div>
                <div>
                  <div>{{ s.instruction }}</div>
                  <div class="step-meta">{{ s.fromFloor }} {{ s.crossFloor ? dirText(s.fromFloor, s.toFloor) : s.distance.toFixed(0) + 'm' }}</div>
                </div>
                <el-tag v-if="s.crossFloor" type="warning" size="small">跨层</el-tag>
              </div>
            </div>
            <el-button size="small" class="indoor-back-btn" @click="indoorRoute = null">返回</el-button>
          </div>
          <div v-else>
            <h4>{{ indoorFloor }}层 节点</h4>
            <div class="indoor-node-list">
              <div v-for="n in indoorFloorNodes" :key="n.id" :class="['indoor-node-item', { 'is-start': n.id === indoorStart?.id, 'is-end': n.id === indoorEnd?.id }]" @click="pickNode(n)">
                <span>{{ iconOf(n.type) }}</span>
                <span class="node-name">{{ n.name }}</span>
                <span class="node-type">{{ n.type }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>
  </DefaultLayout>
</template>


<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import { navigationApi } from '@/api/navigationApi'
import { itineraryApi } from '@/api/itineraryApi'
import { indoorApi } from '@/api/indoorApi'
import type { IndoorNode } from '@/api/indoorApi'
import { ElMessage } from 'element-plus'
import { Plus, Delete } from '@element-plus/icons-vue'
import { poiApi } from '@/api/poiApi'
import type { POIResponse } from '@/api/poiApi'
import type { RouteResponse, RouteSegment } from '@/types/api'

declare global { interface Window { AMap: any } }

// ── 途径点类型 ──────────────────────────────────────────
interface Waypoint {
  lat: number | null
  lng: number | null
  name: string
}

// ── 扩展 RouteResponse（保留兼容旧版可能无分段的后端）───
interface RouteResponseExt extends RouteResponse {}

// AMap 实例
let map: any = null
let AMapInstance: any = null
let startMarker: any = null
let waypointMarkers: any[] = []
let routePolylines: any[] = []
let geocoder: any = null

const mapContainer = ref<HTMLElement>()
const mapReady = ref(false)
const pickingStart = ref(false)
const pickingWaypointIdx = ref<number | null>(null)
const finalDestinationIdx = ref(-1)
const planning = ref(false)
const saving = ref(false)
const strategy = ref('DISTANCE')
const transports = ref<string[]>(['WALK']) // 默认步行
const startPoint = ref<{ lng: number; lat: number; name?: string } | null>(null)
const waypoints = ref<Waypoint[]>([])
const routeResult = ref<RouteResponseExt | null>(null)

// --- POI search ---
const poiKeyword = ref('')
const poiResults = ref<any[]>([])
const searchPOILoading = ref(false)

// ── Indoor navigation ──
const indoorDialogVisible = ref(false)
const indoorFloor = ref('F1')
const indoorFloors = ['B1', 'F1', 'F2', 'F3', 'F4', 'F5']
const indoorNodes = ref<IndoorNode[]>([])
const indoorEdges = ref<{ from: string; to: string; floor: string }[]>([])
const indoorStart = ref<IndoorNode | null>(null)
const indoorEnd = ref<IndoorNode | null>(null)
const indoorSelectMode = ref<'start' | 'end' | null>(null)
const indoorRoute = ref<any>(null)
const indoorLoading = ref(false)

const indoorFloorNodes = computed(() =>
  indoorNodes.value.filter(n => n.floor === indoorFloor.value && n.type !== 'CORRIDOR')
)

const indoorFloorEdges = computed(() =>
  indoorEdges.value.filter(e => e.floor === indoorFloor.value)
)

const indoorSvgViewBox = computed(() => {
  let mx = 300, my = 300
  for (const n of indoorFloorNodes.value) {
    if (n.x > mx) mx = n.x
    if (n.y > my) my = n.y
  }
  return `0 0 ${mx + 100} ${my + 100}`
})

const indoorPathEdgeSet = computed(() => {
  if (!indoorRoute.value) return new Set<string>()
  const s = new Set<string>()
  for (const step of indoorRoute.value.steps) {
    if (!step.crossFloor) {
      s.add(step.fromNodeId + '-' + step.toNodeId)
      s.add(step.toNodeId + '-' + step.fromNodeId)
    }
  }
  return s
})

const indoorPathEdges = computed(() => {
  if (!indoorRoute.value) return []
  const edges: { from: string; to: string }[] = []
  for (const step of indoorRoute.value.steps) {
    if (!step.crossFloor) edges.push({ from: step.fromNodeId, to: step.toNodeId })
  }
  return edges
})

function indoorNodePos(nodeId: string) {
  const n = indoorNodes.value.find(n => n.id === nodeId)
  return n ? { x: n.x, y: n.y } : { x: 0, y: 0 }
}

function pickNode(node: IndoorNode) {
  if (indoorSelectMode.value === 'start') {
    indoorStart.value = node
    indoorSelectMode.value = null
    indoorFloor.value = node.floor
  } else if (indoorSelectMode.value === 'end') {
    indoorEnd.value = node
    indoorSelectMode.value = null
    indoorFloor.value = node.floor
  }
}

function indoorSvgClicked(e: MouseEvent) {
  if (!indoorSelectMode.value) return
  const svg = e.currentTarget as SVGElement
  const rect = svg.getBoundingClientRect()
  const vb = svg.getAttribute('viewBox')?.split(' ').map(Number) || [0, 0, 2000, 1500]
  const cx = ((e.clientX - rect.left) / rect.width) * vb[2]
  const cy = ((e.clientY - rect.top) / rect.height) * vb[3]
  let best: IndoorNode | null = null
  let bestDist = 80
  for (const n of indoorFloorNodes.value) {
    const d = Math.hypot(n.x - cx, n.y - cy)
    if (d < bestDist) { best = n; bestDist = d }
  }
  if (best) pickNode(best)
}

function clearIndoor() {
  indoorStart.value = null
  indoorEnd.value = null
  indoorSelectMode.value = null
  indoorRoute.value = null
}

async function doIndoorNav() {
  if (!indoorStart.value || !indoorEnd.value) return
  if (indoorStart.value.id === indoorEnd.value.id) return
  indoorLoading.value = true
  try {
    const r = await indoorApi.navigate('BUPT_ZHONGHE_ZONGHE', indoorStart.value.id, indoorEnd.value.id)
    if (r.data.data.success && r.data.data.steps.length > 0) {
      indoorRoute.value = r.data.data
      indoorFloor.value = indoorStart.value.floor
    }
  } catch (e) { console.error('Indoor navigation error:', e) }
  indoorLoading.value = false
}

function dirText(from: string, to: string) {
  const f = parseInt(from.replace('F', '').replace('B', '-'))
  const t = parseInt(to.replace('F', '').replace('B', '-'))
  return t > f ? `⬆上到${to}层` : `⬇下到${to}层`
}

function iconOf(type: string) {
  const m: Record<string, string> = { ENTRANCE: '🚪', CLASSROOM: '📚', LAB: '🔬', TOILET: '🚻', STAIRS: '🪜', ELEVATOR: '🛗', LOBBY: '🏛', OFFICE: '📋' }
  return m[type] || '📍'
}

function indoorNodeType(type: string) {
  const m: Record<string, string> = { ENTRANCE: 'entrance', CLASSROOM: 'room', LAB: 'lab', TOILET: 'toilet', STAIRS: 'stairs', ELEVATOR: 'elevator', LOBBY: 'lobby', OFFICE: 'office' }
  return m[type] || ''
}

async function loadIndoorNodes() {
  try {
    const r = await indoorApi.getBuilding('BUPT_ZHONGHE_ZONGHE')
    if (r.data.data?.nodes) {
      indoorNodes.value = r.data.data.nodes
      if (r.data.data.edges) indoorEdges.value = r.data.data.edges
    }
  } catch (e) { console.error('Load indoor nodes error:', e) }
}


// ── Map initialization ──
function initMap() {
  if (!mapContainer.value) return
  try {
    AMapInstance = window.AMap
    if (!AMapInstance) { setTimeout(initMap, 500); return }
    map = new AMapInstance.Map(mapContainer.value, { zoom: 15, center: [116.275, 40.155], resizeEnable: true })
    geocoder = new AMapInstance.Geocoder({})
    const buptMarker = new AMapInstance.Marker({
      position: [116.29221, 40.15827], title: '综合实验教学楼',
      label: { content: '🏛 综合实验教学楼', offset: new AMapInstance.Pixel(0, -36) },
      extData: { isIndoor: true }
    })
    buptMarker.on('click', () => { indoorDialogVisible.value = true; if (!indoorNodes.value.length) loadIndoorNodes() })
    map.add(buptMarker)
    mapContainer.value.addEventListener('click', (e: MouseEvent) => {
      if (!pickingStart.value && pickingWaypointIdx.value === null) return
      const pixel = new AMapInstance.Pixel(e.offsetX, e.offsetY)
      const lnglat = map.containerToLngLat(pixel)
      if (!lnglat) return
      if (pickingStart.value) {
        setStartPoint(lnglat.lng, lnglat.lat)
        reverseGeocode(lnglat.lng, lnglat.lat, (n) => { if (startPoint.value) startPoint.value.name = n })
        pickingStart.value = false
      } else if (pickingWaypointIdx.value !== null) {
        const idx = pickingWaypointIdx.value
        setWaypoint(idx, lnglat.lng, lnglat.lat)
        reverseGeocode(lnglat.lng, lnglat.lat, (n) => { if (waypoints.value[idx]) waypoints.value[idx].name = n })
        pickingWaypointIdx.value = null
      }
    })
    mapReady.value = true
  } catch (e) { console.error('AMap init failed:', e); setTimeout(initMap, 1000) }
}

function reverseGeocode(lng: number, lat: number, cb: (name: string) => void) {
  if (!geocoder) { cb('坐标点'); return }
  geocoder.getAddress([lng, lat], (status: string, result: any) => {
    cb(status === 'complete' && result.regeocode ? result.regeocode.formattedAddress || '坐标点' : '坐标点')
  })
}

function setStartPoint(lng: number, lat: number) {
  startPoint.value = { lng, lat }
  if (startMarker) map.remove(startMarker)
  startMarker = new AMapInstance.Marker({
    position: [lng, lat], title: '起点',
    icon: new AMapInstance.Icon({ image: 'https://webapi.amap.com/theme/v1.3/markers/n/start.png', size: [32, 32], imageSize: [32, 32] })
  })
  map.add(startMarker)
  map.setCenter([lng, lat])
}

function setWaypoint(idx: number, lng: number, lat: number) {
  waypoints.value[idx] = { ...waypoints.value[idx], lng, lat }
  if (waypointMarkers[idx]) map.remove(waypointMarkers[idx])
  const mc = '<div style="width:26px;height:26px;border-radius:50%;background:#FF6B6B;color:#fff;font-size:13px;font-weight:700;text-align:center;line-height:26px;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);">' + (idx + 1) + '</div>'
  waypointMarkers[idx] = new AMapInstance.Marker({ position: [lng, lat], title: '途径点 #' + (idx + 1), content: mc, offset: new AMapInstance.Pixel(-13, -13) })
  map.add(waypointMarkers[idx])
}

function clearAllWaypointMarkers() { waypointMarkers.forEach(m => map.remove(m)); waypointMarkers = [] }

function addWaypoint() { waypoints.value.push({ lat: null, lng: null, name: '' }); pickingWaypointIdx.value = waypoints.value.length - 1 }

function toggleWaypointPick(idx: number) { if (pickingStart.value) return; if (pickingWaypointIdx.value === idx) { pickingWaypointIdx.value = null; return }; pickingWaypointIdx.value = idx }

function removeWaypoint(idx: number) { if (waypointMarkers[idx]) { map.remove(waypointMarkers[idx]); waypointMarkers.splice(idx, 1) }; waypoints.value.splice(idx, 1); if (finalDestinationIdx.value === idx) finalDestinationIdx.value = -1; else if (finalDestinationIdx.value > idx) finalDestinationIdx.value-- }

async function planRoute() {
  if (!startPoint.value || waypoints.value.length === 0 || !AMapInstance) return
  const valid = waypoints.value.filter((wp: any) => wp.lat !== null && wp.lng !== null)
  if (!valid.length) { ElMessage.warning('请为至少一个途径点设置坐标'); return }
  planning.value = true; clearPolyline()
  try {
    const res = await navigationApi.planRoute({
      startLat: startPoint.value.lat, startLng: startPoint.value.lng,
      targets: valid.map((wp: any) => ({ lat: wp.lat, lng: wp.lng, name: wp.name || '途径点' })),
      strategy: strategy.value, transports: transports.value.length ? transports.value : ['WALK'],
      finalDestinationIdx: finalDestinationIdx.value >= 0 ? finalDestinationIdx.value : undefined
    })
    routeResult.value = res.data.data; drawRoute()
  } catch (e: any) { ElMessage.error('路径规划失败：' + (e.message || '未知错误')) }
  finally { planning.value = false }
}

function drawRoute() {
  if (!routeResult.value?.path || routeResult.value.path.length < 2) return; clearPolyline()
  const pts = routeResult.value.path.map((p: any) => ({ lng: p.longitude, lat: p.latitude }))
  const bldLng = 116.29221, bldLat = 40.15827, tol = 0.0001
  const indoorSet = new Set<string>()
  for (const wp of waypoints.value) { if (wp.lng && wp.lat && Math.abs(wp.lng - bldLng) < tol && Math.abs(wp.lat - bldLat) < tol) indoorSet.add(wp.lng.toFixed(5) + ',' + wp.lat.toFixed(5)) }

  // Helper: find nearest path point index to given coordinates
  function nearestPathIdx(lng: number, lat: number): number {
    let bestIdx = 0, bestDist = Infinity
    for (let i = 0; i < pts.length; i++) {
      const d = Math.hypot(lng - pts[i].lng, lat - pts[i].lat)
      if (d < bestDist) { bestDist = d; bestIdx = i }
    }
    return bestIdx
  }

  // ── Draw dashed "walk to road" lines from each marker to nearest path point ──
  const allMarkers: { lng: number; lat: number; indoor: boolean }[] = []
  if (startPoint.value) allMarkers.push({ lng: startPoint.value.lng, lat: startPoint.value.lat, indoor: false })
  for (const wp of waypoints.value) {
    if (wp.lng && wp.lat) allMarkers.push({ lng: wp.lng, lat: wp.lat, indoor: Math.abs(wp.lng - bldLng) < tol && Math.abs(wp.lat - bldLat) < tol })
  }
  for (const m of allMarkers) {
    const idx = nearestPathIdx(m.lng, m.lat)
    const d = Math.hypot(m.lng - pts[idx].lng, m.lat - pts[idx].lat)
    if (d > 0.00005) {
      const walkLine = new AMapInstance.Polyline({
        path: [[m.lng, m.lat], [pts[idx].lng, pts[idx].lat]],
        strokeColor: m.indoor ? '#E6A23C' : '#999',
        strokeWeight: m.indoor ? 4 : 3, strokeOpacity: 0.7, strokeStyle: 'dashed'
      })
      map.add(walkLine); routePolylines.push(walkLine)
    }
  }

  // ── Draw main OSM route (segmented by indoor/outdoor) ──
  let segStart = 0, isIndoor = false
  for (let i = 1; i < pts.length; i++) {
    const key = pts[i].lng.toFixed(5) + ',' + pts[i].lat.toFixed(5); const indoor = indoorSet.has(key)
    if (i > segStart && indoor !== isIndoor) {
      const path = pts.slice(segStart, i + 1).map((p: any) => [p.lng, p.lat])
      const pl = new AMapInstance.Polyline({ path, strokeColor: isIndoor ? '#E6A23C' : '#409EFF', strokeWeight: isIndoor ? 4 : 6, strokeOpacity: 0.8, strokeStyle: isIndoor ? 'dashed' : 'solid', showDir: !isIndoor })
      map.add(pl); routePolylines.push(pl); segStart = i; isIndoor = indoor
    } else if (i === 1) { isIndoor = indoor }
  }
  if (segStart < pts.length - 1) {
    const path = pts.slice(segStart).map((p: any) => [p.lng, p.lat])
    const pl = new AMapInstance.Polyline({ path, strokeColor: isIndoor ? '#E6A23C' : '#409EFF', strokeWeight: isIndoor ? 4 : 6, strokeOpacity: 0.8, strokeStyle: isIndoor ? 'dashed' : 'solid', showDir: !isIndoor })
    map.add(pl); routePolylines.push(pl)
  }
  map.setFitView(routePolylines)
}

function clearPolyline() { routePolylines.forEach(p => { if (map) map.remove(p) }); routePolylines = [] }

function resolveNodeName(nodeId: string): string {
  if (nodeId === 'start') return startPoint.value?.name || '起点'
  if (routeResult.value?.path) { const n = routeResult.value.path.find((p: any) => p.nodeId === nodeId); if (n) return n.name || '节点 ' + nodeId }
  return '节点 ' + nodeId
}

function formatTime(seconds: number) { if (seconds < 60) return seconds + '秒'; const m = Math.floor(seconds / 60); const s = Math.round(seconds % 60); return m + '分' + s + '秒' }

function formatTransport(t?: string): string { const m: Record<string, string> = { WALK: '步行', BIKE: '骑行', SHUTTLE: '穿梭巴士' }; return m[t || 'WALK'] || t || '步行' }
function transportIcon(t?: string): string { const m: Record<string, string> = { WALK: '🚶', BIKE: '🚲', SHUTTLE: '🚌' }; return m[t || 'WALK'] || '🚶' }

async function searchPOI() { if (!poiKeyword.value.trim()) { poiResults.value = []; return }; try { const r = await poiApi.search(poiKeyword.value.trim(), 15); poiResults.value = r.data.data } catch (e) { console.error('POI search error:', e); poiResults.value = [] } }

function selectPOI(poi: any) { poiKeyword.value = poi.name; map.setCenter([poi.lon, poi.lat]); map.setZoom(16) }

function setStartFromPOI(poi: any) { setStartPoint(poi.lon, poi.lat); if (startPoint.value) startPoint.value.name = poi.name }

function setTargetFromPOI(poi: any) { addWaypoint(); const idx = waypoints.value.length - 1; setWaypoint(idx, poi.lon, poi.lat); waypoints.value[idx].name = poi.name }

function clearRoute() { clearPolyline(); clearAllWaypointMarkers(); routeResult.value = null; if (startMarker) { map.remove(startMarker); startMarker = null }; startPoint.value = null; waypoints.value = []; pickingWaypointIdx.value = null; finalDestinationIdx.value = -1 }

async function saveItinerary() { if (!routeResult.value) return; saving.value = true; try { await itineraryApi.create({ name: '路线 ' + new Date().toLocaleString('zh-CN'), routeData: JSON.stringify(routeResult.value), totalDistance: routeResult.value.totalDistance, totalTime: Math.round(routeResult.value.totalTime) }); ElMessage.success('行程已保存') } catch (e) { console.error('Save itinerary error:', e); ElMessage.error('保存失败') } finally { saving.value = false } }

onMounted(() => { nextTick(initMap) })
onBeforeUnmount(() => { if (map) map.destroy() })
</script>

<style scoped>
/* ── Frosted Glass Dark Theme ── */
.nav-container {
  display: flex;
  height: calc(100vh - 56px);
  gap: 0;
  max-width: 1200px;
  margin: 0 auto;
}
.map-area {
  flex: 1;
  position: relative;
  min-width: 0;
}
#amap-container {
  width: 100%;
  height: 100%;
}

/* ── 地图提示浮层 ── */
.map-hint, .mode-hint {
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(42, 40, 40, 0.55);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  padding: 8px 16px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 40px;
  box-shadow: 2px 2px 6px #191919, -2px -2px 6px #514b51;
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #e8e8e8;
}

/* ── 控制面板 ── */
.control-panel {
  width: 280px;
  padding: 16px;
  background: rgba(42, 40, 40, 0.55);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-left: 1px solid rgba(255, 255, 255, 0.06);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.panel-title {
  margin: 0;
  font-size: 18px;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: #e8e8e8;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  padding-bottom: 8px;
}

/* ── 起点 ── */
.point-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
.point-name {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  color: #e8e8e8;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.point-name.placeholder {
  color: #999;
  font-style: normal;
}
.point-coord {
  font-size: 11px;
  color: #3ad29f;
}

/* ── 途径点列表 ── */
.waypoints-section {
  background: rgba(42, 40, 40, 0.3);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  padding: 10px;
}
.waypoints-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.section-label {
  font-size: 14px;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #e8e8e8;
}
.waypoint-row {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 4px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
.waypoint-row:last-child { border-bottom: none; }
.wp-num { min-width: 22px; text-align: center; }
.wp-final-tag { margin-left: -4px; }
.waypoints-empty {
  text-align: center;
  padding: 16px;
  color: #999;
  font-size: 13px;
}

/* ── 出行方式 + 策略 ── */
.transport-section { padding: 4px 0; }
.transport-group { display: flex; gap: 12px; margin-top: 6px; }
.strategy-group { display: flex; gap: 8px; }

/* ── POI搜索 ── */
.poi-search-section { margin-top: 4px; }
.poi-search-row { display: flex; gap: 6px; margin-top: 6px; }
.poi-results { margin-top: 8px; max-height: 200px; overflow-y: auto; }
.poi-result-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  margin-bottom: 4px;
  cursor: pointer;
  background: rgba(42, 40, 40, 0.25);
  transition: background 0.2s, border-color 0.2s;
}
.poi-result-item:hover {
  background: rgba(58, 210, 159, 0.12);
  border-color: rgba(58, 210, 159, 0.3);
}
.poi-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  font-weight: bold;
  color: #e8e8e8;
}
.poi-coord { font-size: 11px; color: #3ad29f; }

/* ── 规划按钮 ── */
.plan-btn { margin-top: 4px; width: 100%; }

/* ── 路线结果 ── */
.route-result { margin-top: 4px; }
.result-stats {
  display: flex;
  gap: 16px;
  padding: 10px;
  background: rgba(42, 40, 40, 0.3);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  margin-bottom: 8px;
}
.stat-item { display: flex; flex-direction: column; }
.stat-label { font-size: 11px; text-transform: uppercase; color: #999; letter-spacing: 1px; }
.stat-value { font-size: 16px; font-weight: bold; color: #3ad29f; }

.visit-order { margin: 8px 0; }
.order-list { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
.order-item { display: flex; align-items: center; gap: 4px; }

.segments { margin: 8px 0; }
.segment-list { max-height: 240px; overflow-y: auto; }
.segment-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 10px;
  border-left: 3px solid #3ad29f;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  margin-bottom: 4px;
  border-radius: 0 8px 8px 0;
  transition: background 0.2s;
}
.segment-item:hover { background: rgba(255, 255, 255, 0.03); }
.segment-item.seg-walk { border-left-color: #3ad29f; }
.segment-item.seg-bike { border-left-color: #409eff; }
.segment-item.seg-shuttle { border-left-color: #e6a23c; }
.seg-header {
  display: flex;
  align-items: center;
  gap: 6px;
}
.seg-transport-icon { font-size: 16px; }
.seg-road-name {
  flex: 1;
  font-size: 13px;
  color: #e8e8e8;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.seg-distance { font-size: 12px; color: #3ad29f; font-weight: bold; white-space: nowrap; }
.seg-meta {
  display: flex;
  gap: 8px;
  font-size: 11px;
  color: #999;
}
.seg-transport-label { text-transform: uppercase; letter-spacing: 0.5px; }
.quick-links { display: flex; gap: 6px; margin-bottom: 12px; }
.route-summary { font-size: 13px; color: #c8c8c8; padding: 8px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* ── 操作按钮 ── */
.save-btn { margin-top: 8px; }

/* ── 室内导航弹窗 ── */
.indoor-dialog-body {
  display: flex;
  gap: 16px;
  height: 65vh;
}
.indoor-left {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}
.indoor-floor-bar, .indoor-toolbar {
  display: flex;
  gap: 2px;
  align-items: center;
}
.indoor-toolbar-spacer { flex: 1; }

/* ── 室内选择按钮（起点/终点） ── */
.sel-btn {
  padding: 4px 10px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(42, 40, 40, 0.55);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  cursor: pointer;
  font-weight: bold;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-radius: 40px;
  box-shadow: 2px 2px 6px #191919, -2px -2px 6px #514b51;
  color: #e8e8e8;
  transition: all 0.2s;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sel-btn:hover {
  background: rgba(42, 40, 40, 0.7);
  border-color: rgba(58, 210, 159, 0.3);
}
.sel-btn.active {
  background: rgba(58, 210, 159, 0.15);
  color: #3ad29f;
  border-color: rgba(58, 210, 159, 0.4);
  box-shadow: none;
}

/* ── 楼层标签 ── */
.floor-tab {
  padding: 6px 16px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(42, 40, 40, 0.55);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  cursor: pointer;
  font-weight: bold;
  font-size: 14px;
  text-transform: uppercase;
  border-radius: 8px;
  box-shadow: 2px 2px 6px #191919, -2px -2px 6px #514b51;
  color: #e8e8e8;
  transition: all 0.2s;
}
.floor-tab:hover {
  background: rgba(42, 40, 40, 0.7);
}
.floor-tab.active {
  background: rgba(58, 210, 159, 0.15);
  color: #3ad29f;
  border-color: rgba(58, 210, 159, 0.4);
  box-shadow: none;
}

/* ── 室内平面图区域 ── */
.indoor-plan-wrap {
  flex: 1;
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  background: rgba(26, 26, 26, 0.5);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}
.indoor-svg {
  display: block;
  width: 100%;
  height: 100%;
  cursor: pointer;
}

/* ── 室内路径（SVG） ── */
.indoor-edge {
  stroke: #3ad29f;
  stroke-width: 2;
  stroke-opacity: 0.4;
}
.indoor-edge.on-path { stroke-opacity: 0.1; }
.indoor-route-line {
  stroke: #dc3545;
  stroke-width: 4;
  stroke-opacity: 0.85;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.indoor-svg-node { cursor: pointer; }
.indoor-svg-node:hover .ns-room { fill: #6fcf97; }
.indoor-svg-node:hover .ns-stairs { fill: #6fcf97; }
.ns-room       { fill: #7cd7ee;       stroke: #e8e8e8; stroke-width: 1.5; }
.ns-lab        { fill: #6fcf97;       stroke: #e8e8e8; stroke-width: 1.5; }
.ns-toilet     { fill: #909090;       stroke: #e8e8e8; stroke-width: 1.5; }
.ns-stairs     { fill: #dc3545;       stroke: #e8e8e8; stroke-width: 1.5; }
.ns-elevator   { fill: #a76fd7;       stroke: #e8e8e8; stroke-width: 1.5; }
.ns-entrance   { fill: #3ad29f;       stroke: #e8e8e8; stroke-width: 1.5; }
.ns-lobby      { fill: #e8e8e8;       stroke: #e8e8e8; stroke-width: 1.5; }
.ns-office     { fill: #1ABC9C;       stroke: #e8e8e8; stroke-width: 1.5; }

.indoor-node-label {
  fill: #e8e8e8;
  font-size: 11px;
  font-weight: bold;
  pointer-events: none;
}
.indoor-node-highlight {
  fill: none;
  stroke: #dc3545;
  stroke-width: 3;
  stroke-dasharray: 4 3;
  animation: pulse 1s infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

/* ── 室内路径信息栏 ── */
.indoor-path-info {
  padding: 6px 10px;
  background: rgba(42, 40, 40, 0.5);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  color: #3ad29f;
  font-size: 12px;
  text-align: center;
  border-top: 1px solid rgba(58, 210, 159, 0.3);
}
.indoor-action-bar {
  display: flex;
  gap: 8px;
  padding: 6px 0;
  justify-content: flex-end;
}

/* ── 室内标记点 ── */
.indoor-marker-start, .indoor-marker-end {
  font-size: 11px;
  font-weight: bold;
  text-anchor: middle;
  pointer-events: none;
}
.indoor-marker-start { fill: #3ad29f; }
.indoor-marker-end   { fill: #dc3545; }

/* ── 室内步骤列表 ── */
.indoor-step-list {
  flex: 1;
  overflow-y: auto;
  margin-bottom: 8px;
}
.indoor-back-btn { width: 100%; }

/* ── 室内节点列表项 ── */
.indoor-node-item.selected {
  background: rgba(58, 210, 159, 0.12) !important;
  color: #3ad29f !important;
  border-color: rgba(58, 210, 159, 0.3) !important;
}
.indoor-node-item.selected .node-name { color: #3ad29f; }
.indoor-node-item.selected .node-type-tag {
  background: rgba(58, 210, 159, 0.15);
  color: #3ad29f;
  border-color: rgba(58, 210, 159, 0.4);
}
.indoor-node-item.is-start {
  background: rgba(58, 210, 159, 0.18) !important;
  color: #3ad29f !important;
  border-color: rgba(58, 210, 159, 0.5) !important;
}
.indoor-node-item.is-end {
  background: rgba(220, 53, 69, 0.18) !important;
  color: #dc3545 !important;
  border-color: rgba(220, 53, 69, 0.5) !important;
}

/* ── 导航步骤 ── */
.step-item {
  display: flex;
  gap: 10px;
  padding: 10px 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  align-items: flex-start;
}
.step-item.cf { background: rgba(255, 248, 225, 0.05); }
.step-num {
  width: 24px;
  height: 24px;
  background: rgba(58, 210, 159, 0.15);
  color: #3ad29f;
  text-align: center;
  line-height: 24px;
  font-size: 12px;
  font-weight: bold;
  flex-shrink: 0;
  border-radius: 6px;
}
.step-meta { font-size: 12px; color: #999; margin-top: 2px; }
.cf .step-num { background: rgba(220, 53, 69, 0.15); color: #dc3545; }

/* ── 室内右侧面板 ── */
.indoor-right {
  width: 300px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.indoor-right h4 {
  margin: 0 0 4px;
  font-size: 15px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #e8e8e8;
}
.indoor-hint { font-size: 12px; color: #999; margin: 0 0 8px; }
.indoor-node-list { flex: 1; overflow-y: auto; }
.indoor-floor-group { margin-bottom: 12px; }
.floor-group-title {
  font-weight: bold;
  font-size: 14px;
  text-transform: uppercase;
  color: #e8e8e8;
  padding: 4px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  margin-bottom: 4px;
}
.indoor-node-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  cursor: pointer;
  border: 1px solid transparent;
  border-radius: 8px;
  transition: all 0.2s;
}
.indoor-node-item:hover {
  background: rgba(58, 210, 159, 0.08);
  border-color: rgba(58, 210, 159, 0.25);
}
.node-icon { font-size: 14px; }
.node-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  font-weight: bold;
  color: #e8e8e8;
}
.node-type-tag {
  font-size: 10px;
  color: #3ad29f;
  background: rgba(42, 40, 40, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 4px;
  padding: 0 6px;
}
</style>