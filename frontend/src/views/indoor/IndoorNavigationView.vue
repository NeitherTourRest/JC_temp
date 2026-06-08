<template>
  <DefaultLayout>
    <div class="indoor-page">
      <div class="page-header">
        <h2>📐 综合实验教学楼 · 室内导航</h2>
        <p>北京邮电大学沙河校区</p>
      </div>

      <div class="main-layout">
        <!-- 左侧控制面板 -->
        <div class="control-panel">
          <div class="panel-section">
            <h4>📍 起点</h4>
            <div class="node-select-row">
              <el-select v-model="fromNode" filterable placeholder="选择或点击地图选起点" size="large" style="width:100%">
                <el-option-group v-for="floor in floors" :key="floor" :label="`${floor}层`">
                  <el-option v-for="node in getNodesByFloor(floor)" :key="node.id" :label="node.name" :value="node.id" />
                </el-option-group>
              </el-select>
              <el-button :type="selectMode === 'start' ? 'warning' : 'default'" size="small" @click="toggleSelect('start')">
                {{ selectMode === 'start' ? '点图中↑' : '选点' }}
              </el-button>
            </div>
          </div>

          <div class="panel-section">
            <h4>🏁 终点</h4>
            <div class="node-select-row">
              <el-select v-model="toNode" filterable placeholder="选择或点击地图选终点" size="large" style="width:100%">
                <el-option-group v-for="floor in floors" :key="floor" :label="`${floor}层`">
                  <el-option v-for="node in getNodesByFloor(floor)" :key="node.id" :label="node.name" :value="node.id" />
                </el-option-group>
              </el-select>
              <el-button :type="selectMode === 'end' ? 'warning' : 'default'" size="small" @click="toggleSelect('end')">
                {{ selectMode === 'end' ? '点图中↑' : '选点' }}
              </el-button>
            </div>
          </div>

          <el-button type="primary" size="large" style="width:100%;margin-top:8px" @click="navigate" :loading="loading" :disabled="!fromNode || !toNode">
            🚶 开始导航
          </el-button>

          <div v-if="result" class="result-section">
            <div class="result-summary">
              <span>总距离: {{ result.totalDistance.toFixed(0) }}m</span>
              <span>步骤: {{ result.steps.length }}</span>
            </div>
            <div class="step-list">
              <div v-for="(step, i) in result.steps" :key="i" :class="['step-item', { 'cross-floor': step.crossFloor }]">
                <div class="step-num">{{ i + 1 }}</div>
                <div class="step-content">
                  <div class="step-text">{{ step.instruction }}</div>
                  <div class="step-meta" v-if="!step.crossFloor">
                    {{ step.fromFloor }} {{ step.distance.toFixed(0) }}m
                  </div>
                  <div class="step-meta" v-else>
                    🚪 {{ step.fromFloor }} → {{ step.toFloor }}
                  </div>
                </div>
                <el-tag v-if="step.crossFloor" type="warning" size="small">跨层</el-tag>
              </div>
            </div>
          </div>

          <div v-if="error" class="error-msg">{{ error }}</div>
        </div>

        <!-- 右侧平面图 -->
        <div class="map-area">
          <div class="floor-switcher">
            <button v-for="f in floors" :key="f" :class="['floor-btn', { active: currentFloor === f }]" @click="currentFloor = f">
              {{ f }}
            </button>
          </div>

          <div class="floor-plan-wrapper" ref="planWrapper">
            <img :src="getFloorPlanUrl(currentFloor)" class="floor-plan" :class="{ 'clickable': !!selectMode }" @click="onPlanClick" draggable="false" />

            <!-- 已选节点标记 -->
            <div v-for="node in selectedNodes" :key="node.id" class="node-marker" :class="node.role" :style="{ left: node.x + 'px', top: node.y + 'px' }">
              {{ node.role === 'start' ? '起' : '终' }}
            </div>

            <!-- 路径绘制 -->
            <svg v-if="pathSegments.length" class="path-overlay" :viewBox="svgViewBox">
              <line v-for="(seg, i) in pathSegments" :key="i" :x1="seg.x1" :y1="seg.y1" :x2="seg.x2" :y2="seg.y2"
                :class="['path-line', { 'cross-floor-line': seg.crossFloor }]" :stroke-width="seg.crossFloor ? 2 : 4" />
              <circle v-for="(seg, i) in pathSegments" :key="'dot'+i" :cx="seg.x1" :cy="seg.y1" r="3" fill="#409EFF" />
              <circle :cx="lastPoint.x" :cy="lastPoint.y" r="4" fill="#F56C6C" />
            </svg>

            <div v-if="selectMode" class="select-hint">点击平面图选择{{ selectMode === 'start' ? '起点' : '终点' }}</div>
          </div>
        </div>
      </div>
    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import { indoorApi } from '@/api/indoorApi'
import type { IndoorNode, NavigationResult } from '@/api/indoorApi'

const floors = ['B1', 'F1', 'F2', 'F3', 'F4', 'F5']
const currentFloor = ref('F1')
const fromNode = ref('')
const toNode = ref('')
const loading = ref(false)
const result = ref<NavigationResult | null>(null)
const error = ref('')
const selectMode = ref<'start' | 'end' | null>(null)
const floorPlanUrls = ref<Record<string, string>>({})
const allNodes = ref<IndoorNode[]>([])

onMounted(async () => { await loadNodes() })

function getNodesByFloor(floor: string): IndoorNode[] {
  // For selection, show CLASSROOM, LAB, ENTRANCE, LOBBY, TOILET, OFFICE, STAIRS, ELEVATOR
  // Hide CORRIDOR intermediate nodes
  return allNodes.value.filter(n => n.floor === floor && n.type !== 'CORRIDOR')
}

async function loadNodes() {
  try {
    const r = await indoorApi.getBuilding('BUPT_ZHONGHE_ZONGHE')
    if (r.data.data?.nodes?.length) {
      allNodes.value = r.data.data.nodes
      if (r.data.data.floorPlans) floorPlanUrls.value = r.data.data.floorPlans
      return
    }
  } catch {
    // silently fail — empty state
  }
}

function getFloorPlanUrl(floor: string): string {
  if (floorPlanUrls.value[floor]) return floorPlanUrls.value[floor]
  return `/images/indoor/BUPT_ZHONGHE_ZONGHE/${floor}.jpg`
}

function toggleSelect(mode: 'start' | 'end') {
  selectMode.value = selectMode.value === mode ? null : mode
}

function onPlanClick(e: MouseEvent) {
  if (!selectMode.value) return
  const img = e.currentTarget as HTMLImageElement
  const rect = img.getBoundingClientRect()
  const natW = img.naturalWidth || 2000
  const natH = img.naturalHeight || 1500
  const scaleX = natW / rect.width
  const scaleY = natH / rect.height
  const x = (e.clientX - rect.left) * scaleX
  const y = (e.clientY - rect.top) * scaleY

  // Find nearest node on this floor
  const nodes = allNodes.value.length > 0 ? allNodes.value : []
  const candidates = nodes.filter(n => n.floor === currentFloor.value && n.type !== 'CORRIDOR')
  if (!candidates.length) return

  const nearest = candidates.reduce((best, n) => {
    const d = Math.sqrt((n.x - x) ** 2 + (n.y - y) ** 2)
    return d < best.dist ? { node: n, dist: d } : best
  }, { node: null as IndoorNode | null, dist: 200 })

  if (nearest.node && nearest.dist < 150) {
    if (selectMode.value === 'start') {
      fromNode.value = nearest.node.id
      selectMode.value = null
    } else {
      toNode.value = nearest.node.id
      selectMode.value = null
    }
  }
}

const selectedNodes = computed(() => {
  const result: ({ id: string; x: number; y: number; role: string })[] = []
  const src = allNodes.value
  const start = src.find(n => n.id === fromNode.value)
  const end = src.find(n => n.id === toNode.value)
  if (start && start.floor === currentFloor.value) result.push({ ...start, role: 'start' })
  if (end && end.floor === currentFloor.value) result.push({ ...end, role: 'end' })
  return result
})

const pathSegments = computed(() => {
  if (!result.value) return []
  const segs: { x1: number; y1: number; x2: number; y2: number; crossFloor: boolean }[] = []
  for (const s of result.value.steps) {
    if (s.crossFloor) {
      if (s.fromFloor === currentFloor.value || s.toFloor === currentFloor.value) {
        segs.push({ x1: s.fromX, y1: s.fromY, x2: s.toX, y2: s.toY, crossFloor: true })
      }
    } else if (s.fromFloor === currentFloor.value) {
      segs.push({ x1: s.fromX, y1: s.fromY, x2: s.toX, y2: s.toY, crossFloor: false })
    }
  }
  return segs
})

const lastPoint = computed(() => {
  if (!result.value || !result.value.steps.length) return { x: 0, y: 0 }
  const steps = result.value.steps
  for (let i = steps.length - 1; i >= 0; i--) {
    if (steps[i].toFloor === currentFloor.value) return { x: steps[i].toX, y: steps[i].toY }
  }
  return { x: steps[steps.length - 1].toX, y: steps[steps.length - 1].toY }
})

const svgViewBox = computed(() => {
  let mx = 2000, my = 1500
  for (const n of allNodes.value) {
    if (n.x > mx) mx = n.x
    if (n.y > my) my = n.y
  }
  return `0 0 ${mx + 100} ${my + 100}`
})

async function navigate() {
  if (!fromNode.value || !toNode.value) return
  loading.value = true
  error.value = ''
  result.value = null
  try {
    const res = await indoorApi.navigate('BUPT_ZHONGHE_ZONGHE', fromNode.value, toNode.value)
    if (res.data.data.success) {
      result.value = res.data.data
      if (res.data.data.floorPlans) floorPlanUrls.value = res.data.data.floorPlans
      const start = allNodes.value.find(n => n.id === fromNode.value)
      if (start) currentFloor.value = start.floor
    } else {
      error.value = res.data.data.error || '未找到路径'
    }
  } catch {
    error.value = '请求失败，请检查后端是否运行'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.indoor-page { max-width: 1200px; margin: 0 auto; padding: 20px 16px; }
.page-title h2 { font-size: 22px; font-weight: 600; color: #2c2c2c; margin: 0; }
.page-header p { font-size: 14px; color: #999; margin: 4px 0 20px; }
.main-layout { display: flex; gap: 20px; height: calc(100vh - 160px); }

.control-panel { width: 340px; flex-shrink: 0; overflow-y: auto; }
.panel-section { margin-bottom: 16px; }
.panel-section h4 { font-size: 15px; margin-bottom: 8px; color: #333; }
.node-select-row { display: flex; gap: 6px; align-items: center; }
.node-select-row .el-button { white-space: nowrap; }

.result-section { margin-top: 16px; padding: 12px; background: #f8f9fa; border-radius: 8px; border: 1px solid #e0e0e0; }
.result-summary { display: flex; gap: 16px; font-size: 14px; color: #409EFF; font-weight: 600; margin-bottom: 12px; }
.step-list { max-height: 350px; overflow-y: auto; }
.step-item { display: flex; gap: 10px; padding: 10px 8px; border-bottom: 1px solid #eee; align-items: flex-start; }
.step-item.cross-floor { background: #fff8e1; }
.step-num { width: 24px; height: 24px; background: #409EFF; color: white; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; flex-shrink: 0; }
.step-text { font-size: 14px; color: #333; }
.step-meta { font-size: 12px; color: #999; margin-top: 2px; }

.map-area { flex: 1; position: relative; background: white; border-radius: 12px; border: 2px solid #ddd; overflow: hidden; }
.floor-switcher { position: absolute; top: 12px; left: 12px; z-index: 10; display: flex; gap: 4px; }
.floor-btn { padding: 6px 14px; border: 2px solid #2c2c2c; background: white; cursor: pointer; font-size: 13px; font-weight: 600; transition: all 0.2s; border-radius: 0; }
.floor-btn:hover { background: #f0f0f0; }
.floor-btn.active { background: #2c2c2c; color: white; }
.floor-plan-wrapper { width: 100%; height: 100%; position: relative; overflow: hidden; }
.floor-plan { width: 100%; height: 100%; object-fit: contain; }
.floor-plan.clickable { cursor: crosshair; }

.node-marker { position: absolute; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; color: white; transform: translate(-50%, -50%); z-index: 20; box-shadow: 0 2px 6px rgba(0,0,0,0.3); pointer-events: none; }
.node-marker.start { background: #67C23A; }
.node-marker.end { background: #F56C6C; }

.path-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 15; }
.path-line { stroke: #409EFF; stroke-linecap: round; stroke-linejoin: round; opacity: 0.8; }
.path-line.cross-floor-line { stroke: #E6A23C; stroke-dasharray: 8 4; }

.select-hint { position: absolute; top: 12px; left: 50%; transform: translateX(-50%); background: rgba(64,158,255,0.9); color: white; padding: 8px 20px; border-radius: 20px; font-size: 14px; z-index: 30; }

.error-msg { color: #F56C6C; margin-top: 12px; font-size: 14px; }
</style>