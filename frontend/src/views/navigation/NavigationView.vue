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
    <el-dialog v-model="indoorDialogVisible" title="🏛 综合实验教学楼 · 室内导航" width="80%" top="4vh" destroy-on-close @close="clearIndoor">
      <div class="indoor-dialog-body">
        <div class="indoor-left">
          <div class="indoor-toolbar">
            <button v-for="f in indoorFloors" :key="f" :class="['floor-tab', { active: indoorFloor === f }]" @click="indoorFloor = f">{{ f }}</button>
            <div class="indoor-toolbar-spacer"></div>
            <button :class="['sel-btn', { active: indoorMode === 'start' }]" @click="indoorMode = indoorMode === 'start' ? null : 'start'">
              {{ modeStart && indoorMode !== 'start' ? '✓ ' + modeStart.name : '选起点' }}
            </button>
            <button :class="['sel-btn', { active: indoorMode === 'end' }]" @click="indoorMode = indoorMode === 'end' ? null : 'end'">
              {{ modeEnd && indoorMode !== 'end' ? '✓ ' + modeEnd.name : '选终点' }}
            </button>
            <span class="indoor-mode-hint" v-if="indoorMode">点击图上节点</span>
          </div>
          <canvas ref="indoorCanvasRef" class="indoor-canvas-main" @click="onIndoorCanvasClick" />
        </div>
        <div class="indoor-right">
          <template v-if="indoorRoute">
            <h4>🚶 导航路线</h4>
            <span class="indoor-dist">全程约 {{ indoorRoute.totalDistance.toFixed(0) }} 米</span>
            <div class="indoor-route-text">{{ indoorRouteText }}</div>
            <div class="indoor-actions">
              <el-button @click="clearIndoor">清除重选</el-button>
            </div>
          </template>
          <template v-else>
            <div class="indoor-actions">
              <el-button size="small" @click="clearIndoor">清除</el-button>
              <el-button size="small" type="primary" @click="doIndoorNav" :loading="indoorLoading" :disabled="!modeStart || !modeEnd">开始导航</el-button>
            </div>
            <h4 class="indoor-section-title">{{ indoorFloor }} 层节点</h4>
            <div class="indoor-node-list">
              <div v-for="n in indoorFloorNodes" :key="n.id"
                :class="['indoor-node-item', { 'is-start': n.id === modeStart?.id, 'is-end': n.id === modeEnd?.id }]"
                @click="onIndoorNodeClick(n)">
                <span class="node-icon">{{ iconOf(n.type) }}</span>
                <span class="node-name">{{ n.name }}</span>
              </div>
            </div>
          </template>
        </div>
      </div>
    </el-dialog>
  </DefaultLayout>
</template>


<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useRoute } from 'vue-router'
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

const route = useRoute()

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
const bootstrappedQueryKey = ref('')

// --- POI search ---
const poiKeyword = ref('')
const poiResults = ref<any[]>([])
const searchPOILoading = ref(false)

// ── Indoor navigation (clean rewrite) ──
const indoorDialogVisible = ref(false)
const indoorFloor = ref('F1')
const indoorFloors: string[] = []
const indoorNodes = ref<IndoorNode[]>([])
const indoorEdges = ref<{ from: string; to: string; floor: string }[]>([])
const indoorMode = ref<'start' | 'end' | null>(null)
const modeStart = ref<IndoorNode | null>(null)
const modeEnd = ref<IndoorNode | null>(null)
const indoorRoute = ref<any>(null)
const indoorLoading = ref(false)
const indoorCanvasRef = ref<HTMLCanvasElement>()

const indoorFloorNodes = computed(() => indoorNodes.value.filter(n => n.floor === indoorFloor.value && n.type !== 'CORRIDOR'))

function clearIndoor() { modeStart.value = null; modeEnd.value = null; indoorMode.value = null; indoorRoute.value = null }
function onIndoorNodeClick(n: IndoorNode) { handleNodePick(n) }
function onIndoorCanvasClick(e: MouseEvent) {
  const canvas = indoorCanvasRef.value; if (!canvas || !indoorMode.value) return
  const rect = canvas.getBoundingClientRect()
  const mx = (e.clientX - rect.left) * (canvas.width / rect.width)
  const my = (e.clientY - rect.top) * (canvas.height / rect.height)
  // Build same bbox as draw to transform coordinates
  const floorNodes = indoorNodes.value.filter(n => n.floor === indoorFloor.value)
  if (!floorNodes.length) return
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const n of floorNodes) { if (n.x < minX) minX = n.x; if (n.y < minY) minY = n.y; if (n.x > maxX) maxX = n.x; if (n.y > maxY) maxY = n.y }
  const pad = 60, bboxW = maxX - minX + pad * 2, bboxH = maxY - minY + pad * 2
  const scale = Math.min(canvas.width / bboxW, canvas.height / bboxH) * 0.85
  const ox = (canvas.width - (maxX - minX) * scale) / 2, oy = (canvas.height - (maxY - minY) * scale) / 2
  const tx = (x: number) => (x - minX) * scale + ox
  const ty = (y: number) => (y - minY) * scale + oy
  let best: IndoorNode | null = null, bestDist = 50
  for (const n of floorNodes) { const d = Math.hypot(mx - tx(n.x), my - ty(n.y)); if (d < bestDist) { best = n; bestDist = d } }
  if (best) handleNodePick(best)
}

function handleNodePick(n: IndoorNode) {
  if (indoorMode.value === 'start') { modeStart.value = n; indoorMode.value = null }
  else if (indoorMode.value === 'end') { modeEnd.value = n; indoorMode.value = null }
  drawIndoorCanvas()
}

function drawIndoorCanvas() {
  const canvas = indoorCanvasRef.value; if (!canvas) return
  const ctx = canvas.getContext('2d'); if (!ctx) return
  const parent = canvas.parentElement
  if (parent) { canvas.width = parent.clientWidth; canvas.height = parent.clientHeight }
  const w = canvas.width, h = canvas.height
  const sid = modeStart.value?.id ?? null, eid = modeEnd.value?.id ?? null
  ctx.clearRect(0, 0, w, h)
  const floorNodes = indoorNodes.value.filter(n => n.floor === indoorFloor.value)
  if (!floorNodes.length) return
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const n of floorNodes) { if (n.x < minX) minX = n.x; if (n.y < minY) minY = n.y; if (n.x > maxX) maxX = n.x; if (n.y > maxY) maxY = n.y }
  const pad = 60, bboxW = maxX - minX + pad * 2, bboxH = maxY - minY + pad * 2
  const scale = Math.min(w / bboxW, h / bboxH) * 0.85
  const ox = (w - (maxX - minX) * scale) / 2, oy = (h - (maxY - minY) * scale) / 2
  const tx = (x: number) => (x - minX) * scale + ox, ty = (y: number) => (y - minY) * scale + oy
  // Edges
  ctx.strokeStyle = 'rgba(58,210,159,0.1)'; ctx.lineWidth = 1
  for (const e of indoorEdges.value.filter(e => e.floor === indoorFloor.value)) {
    const a = indoorNodes.value.find(n => n.id === e.from), b = indoorNodes.value.find(n => n.id === e.to)
    if (!a || !b) continue
    ctx.beginPath(); ctx.moveTo(tx(a.x), ty(a.y)); ctx.lineTo(tx(b.x), ty(b.y)); ctx.stroke()
  }
  // Nodes
  for (const n of floorNodes) {
    const cx = tx(n.x), cy = ty(n.y), sel = n.id === sid || n.id === eid
    const sz = Math.max(3, 6 * scale / 2)
    ctx.globalAlpha = sel ? 1 : 0.3
    if (n.type === 'CORRIDOR') ctx.fillStyle = '#3ad29f'
    else if (n.type === 'STAIRS') ctx.fillStyle = '#dc3545'
    else if (n.type === 'ELEVATOR') ctx.fillStyle = '#a76fd7'
    else ctx.fillStyle = '#7cd7ee'
    ctx.beginPath()
    if (n.type === 'ENTRANCE') { ctx.moveTo(cx, cy - sz); ctx.lineTo(cx - sz, cy + sz); ctx.lineTo(cx + sz, cy + sz) }
    else ctx.rect(cx - sz/2, cy - sz/2, sz, sz)
    ctx.fill()
    if (sel) { ctx.strokeStyle = '#3ad29f'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, sz + 4, 0, Math.PI*2); ctx.stroke() }
    ctx.globalAlpha = 1
    if (n.type !== 'CORRIDOR' || sel) {
      ctx.fillStyle = '#e8e8e8'; ctx.font = `${Math.max(9, 10*scale/1.5)}px sans-serif`; ctx.textBaseline = 'middle'
      ctx.fillText(n.name || n.id, cx + sz + 3, cy)
    }
  }
}

const indoorRouteText = computed(() => {
  if (!indoorRoute.value?.steps?.length) return ''
  return indoorRoute.value.steps.map((s: any) =>
    s.crossFloor ? `${s.toNodeId?.includes('ELEVATOR')?'乘电梯':'走楼梯'}从${s.fromFloor}到${s.toFloor}` : `前往${s.toName}（${s.distance.toFixed(0)}m）`
  ).join(' → ')
})

async function doIndoorNav() {
  if (!modeStart.value || !modeEnd.value || modeStart.value.id === modeEnd.value.id) return
  indoorLoading.value = true
  try {
    const r = await indoorApi.navigate('BUPT_ZHONGHE_ZONGHE', modeStart.value.id, modeEnd.value.id)
    if (r.data.data?.success) indoorRoute.value = r.data.data
  } catch (e) { console.error(e) }
  finally { indoorLoading.value = false }
}

function iconOf(type: string) { const m: Record<string, string> = { ENTRANCE: '🚪', CLASSROOM: '📚', LAB: '🔬', TOILET: '🚻', STAIRS: '🪜', ELEVATOR: '🛗', LOBBY: '🏛', OFFICE: '📋' }; return m[type] || '📍' }

async function loadIndoorNodes() {
  try {
    const r = await indoorApi.getBuilding('BUPT_ZHONGHE_ZONGHE')
    if (r.data.data?.nodes) {
      indoorNodes.value = r.data.data.nodes
      indoorEdges.value = r.data.data.edges || []
      indoorFloors.length = 0
      const seen = new Set<string>()
      for (const n of r.data.data.nodes) { if (!seen.has(n.floor)) { seen.add(n.floor); indoorFloors.push(n.floor) } }
      indoorFloors.sort()
      nextTick(drawIndoorCanvas)
    }
  } catch (e) { console.error(e) }
}

// Redraw on floor switch
const _indoorFloorWatcher = watch(indoorFloor, () => nextTick(drawIndoorCanvas))



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
    void bootstrapFromRouteQuery()
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

function parseQueryNumber(value: unknown): number | null {
  const raw = Array.isArray(value) ? value[0] : value
  if (raw == null || raw === '') return null
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : null
}

function parseQueryString(value: unknown): string {
  const raw = Array.isArray(value) ? value[0] : value
  return typeof raw === 'string' ? raw.trim() : ''
}

function getRouteTarget() {
  const lat = parseQueryNumber(route.query.targetLat)
  const lng = parseQueryNumber(route.query.targetLng)
  if (lat == null || lng == null) return null
  return {
    lat,
    lng,
    name: parseQueryString(route.query.targetName) || '目的地',
  }
}

async function locateBrowserStartPoint(): Promise<boolean> {
  if (!navigator.geolocation) {
    ElMessage.warning('当前浏览器不支持定位，请手动选择起点')
    return false
  }

  return await new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const applyLocation = (lng: number, lat: number) => {
          setStartPoint(lng, lat)
          reverseGeocode(lng, lat, (name) => {
            if (startPoint.value) startPoint.value.name = name || '当前位置'
          })
          resolve(true)
        }

        const rawLng = position.coords.longitude
        const rawLat = position.coords.latitude

        if (AMapInstance?.convertFrom) {
          AMapInstance.convertFrom([rawLng, rawLat], 'gps', (status: string, result: any) => {
            const loc = result?.locations?.[0]
            if (status === 'complete' && loc) {
              applyLocation(loc.lng, loc.lat)
              return
            }
            applyLocation(rawLng, rawLat)
          })
          return
        }

        applyLocation(rawLng, rawLat)
      },
      (error) => {
        console.error('Browser geolocation failed:', error)
        ElMessage.warning('无法获取当前位置，请手动选择起点')
        resolve(false)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    )
  })
}

async function bootstrapFromRouteQuery() {
  if (!mapReady.value || !AMapInstance) return

  const target = getRouteTarget()
  const targetKey = target ? `${target.lat},${target.lng},${target.name}` : ''
  if (!target || bootstrappedQueryKey.value === targetKey) return

  clearPolyline()
  clearAllWaypointMarkers()
  routeResult.value = null
  waypoints.value = [{ lat: target.lat, lng: target.lng, name: target.name }]
  finalDestinationIdx.value = 0
  setWaypoint(0, target.lng, target.lat)

  if (!startPoint.value) {
    await locateBrowserStartPoint()
  }

  bootstrappedQueryKey.value = targetKey

  if (startPoint.value) {
    await planRoute()
  }
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
watch(() => route.fullPath, () => { void bootstrapFromRouteQuery() })
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
.indoor-dialog-body { display: flex; gap: 16px; height: 65vh; }
.indoor-left { flex: 1; display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.indoor-right { width: 260px; flex-shrink: 0; display: flex; flex-direction: column; overflow: hidden; }
.indoor-right h4 { margin: 0 0 4px; font-size: 14px; color: #e8e8e8; }
.indoor-section-title { margin-top: 12px !important; }

.indoor-toolbar { display: flex; gap: 2px; align-items: center; }
.indoor-toolbar-spacer { flex: 1; }
.indoor-mode-hint { font-size: 11px; color: #3ad29f; padding: 0 4px; }

.indoor-canvas-main {
  flex: 1; width: 100%;
  background: rgba(26,26,26,0.5); border: 1px solid rgba(255,255,255,0.06); border-radius: 16px;
  cursor: crosshair;
}

.indoor-node-list { flex: 1; overflow-y: auto; margin-top: 8px; }
.indoor-node-item { display: flex; align-items: center; gap: 6px; padding: 6px 8px; cursor: pointer; border: 1px solid transparent; border-radius: 8px; transition: all 0.2s; }
.indoor-node-item:hover { background: rgba(58,210,159,0.08); border-color: rgba(58,210,159,0.25); }
.indoor-node-item.is-start { background: rgba(58,210,159,0.18); color: #3ad29f; border-color: rgba(58,210,159,0.5); }
.indoor-node-item.is-end { background: rgba(220,53,69,0.18); color: #dc3545; border-color: rgba(220,53,69,0.5); }
.node-icon { font-size: 14px; flex-shrink: 0; }
.node-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; font-weight: bold; color: #e8e8e8; }

.indoor-route-text { padding: 12px; font-size: 13px; line-height: 1.8; color: var(--text-regular); background: rgba(0,0,0,0.2); border: 1px solid var(--frosted-border); border-radius: 10px; flex: 1; overflow-y: auto; }
.indoor-dist { font-size: 12px; color: #3ad29f; font-weight: 600; margin: 4px 0 8px; }
.indoor-actions { display: flex; gap: 8px; padding: 8px 0; }

/* Common to both sections */
.floor-tab { padding: 6px 14px; border: 1px solid rgba(255,255,255,0.06); background: rgba(42,40,40,0.55); cursor: pointer; font-weight: bold; font-size: 13px; border-radius: 8px; color: #e8e8e8; transition: all 0.2s; }
.floor-tab:hover { background: rgba(42,40,40,0.7); }
.floor-tab.active { background: rgba(58,210,159,0.15); color: #3ad29f; border-color: rgba(58,210,159,0.4); }
.sel-btn { padding: 4px 10px; border: 1px solid rgba(255,255,255,0.06); background: rgba(42,40,40,0.55); cursor: pointer; font-weight: bold; font-size: 11px; border-radius: 40px; color: #e8e8e8; transition: all 0.2s; max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sel-btn:hover { background: rgba(42,40,40,0.7); }
.sel-btn.active { background: rgba(58,210,159,0.15); color: #3ad29f; border-color: rgba(58,210,159,0.4); }
</style>
