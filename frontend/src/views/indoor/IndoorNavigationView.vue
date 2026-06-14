<template>
  <DefaultLayout>
    <div class="indoor-page">
      <div class="page-header">
        <h2>📐 综合实验教学楼 · 室内导航</h2>
        <p>北京邮电大学沙河校区</p>
      </div>

      <div class="main-layout">
        <div class="control-panel">
          <div class="panel-section">
            <h4>📍 起点</h4>
            <div class="node-select-row">
              <el-select v-model="fromNode" filterable placeholder="选择起点" size="large" style="width:100%">
                <el-option-group v-for="floor in floors" :key="floor" :label="`${floor} 层`">
                  <el-option
                    v-for="node in getNodesByFloor(floor)"
                    :key="node.id"
                    :label="node.name"
                    :value="node.id"
                  />
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
              <el-select v-model="toNode" filterable placeholder="选择终点" size="large" style="width:100%">
                <el-option-group v-for="floor in floors" :key="floor" :label="`${floor} 层`">
                  <el-option
                    v-for="node in getNodesByFloor(floor)"
                    :key="node.id"
                    :label="node.name"
                    :value="node.id"
                  />
                </el-option-group>
              </el-select>
              <el-button :type="selectMode === 'end' ? 'warning' : 'default'" size="small" @click="toggleSelect('end')">
                {{ selectMode === 'end' ? '点图中↑' : '选点' }}
              </el-button>
            </div>
          </div>

          <el-button
            type="primary"
            size="large"
            style="width:100%;margin-top:8px"
            @click="navigate"
            :loading="loading"
            :disabled="!fromNode || !toNode"
          >
            🚶 开始导航
          </el-button>

          <div class="legend">
            <span>当前渲染方式：按数据库图结构绘制</span>
            <span v-if="currentFloorPlan">已加载楼层背景图</span>
          </div>

          <div v-if="result" class="result-section">
            <div class="result-summary">
              <span>总距离: {{ result.totalDistance.toFixed(0) }}m</span>
              <span>节点: {{ result.nodePath?.length || result.steps.length + 1 }}</span>
            </div>
            <div v-if="result.textInstructions?.length" class="route-text-list">
              <div v-for="(instruction, index) in result.textInstructions" :key="`text-${index}`" class="route-text-item">
                {{ index + 1 }}. {{ instruction }}
              </div>
            </div>
            <div class="step-list">
              <div v-for="(step, index) in result.steps" :key="index" :class="['step-item', { 'cross-floor': step.crossFloor }]">
                <div class="step-num">{{ index + 1 }}</div>
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

        <div class="map-area">
          <div class="floor-switcher">
            <button
              v-for="floor in floors"
              :key="floor"
              :class="['floor-btn', { active: currentFloor === floor }]"
              @click="currentFloor = floor"
            >
              {{ floor }}
            </button>
          </div>

          <div class="structure-hint" v-if="selectMode">
            点击图中节点选择{{ selectMode === 'start' ? '起点' : '终点' }}
          </div>

          <div class="svg-wrapper" @click="onSvgClick">
            <svg :viewBox="svgViewBox" class="indoor-svg" preserveAspectRatio="xMidYMid meet">
              <image
                v-if="currentFloorPlan"
                :href="currentFloorPlan"
                x="0"
                y="0"
                :width="svgWidth"
                :height="svgHeight"
                preserveAspectRatio="xMidYMid meet"
                class="floor-image"
              />
              <line
                v-for="edge in floorEdges"
                :key="`${edge.from}-${edge.to}`"
                :x1="nodePosition(edge.from).x"
                :y1="nodePosition(edge.from).y"
                :x2="nodePosition(edge.to).x"
                :y2="nodePosition(edge.to).y"
                :class="['indoor-edge', { 'on-path': pathEdgeSet.has(`${edge.from}-${edge.to}`) }]"
              />
              <line
                v-for="edge in pathEdges"
                :key="`path-${edge.from}-${edge.to}`"
                :x1="nodePosition(edge.from).x"
                :y1="nodePosition(edge.from).y"
                :x2="nodePosition(edge.to).x"
                :y2="nodePosition(edge.to).y"
                class="indoor-route-line"
              />
              <g
                v-for="node in floorNodes"
                :key="node.id"
                class="indoor-svg-node"
                :transform="`translate(${node.x},${node.y})`"
              >
                <title>{{ node.name }}</title>
                <rect
                  v-if="node.type === 'STAIRS' || node.type === 'ELEVATOR'"
                  x="-8"
                  y="-8"
                  width="16"
                  height="16"
                  rx="3"
                  :class="`ns-${nodeTypeClass(node.type)}`"
                />
                <polygon
                  v-else-if="node.type === 'ENTRANCE'"
                  points="-10,8 0,-10 10,8"
                  :class="`ns-${nodeTypeClass(node.type)}`"
                />
                <rect
                  v-else
                  x="-6"
                  y="-6"
                  width="12"
                  height="12"
                  :class="`ns-${nodeTypeClass(node.type)}`"
                />
                <text x="14" y="4" class="indoor-node-label">{{ node.name }}</text>
                <text v-if="fromNode === node.id" x="0" y="-14" class="indoor-marker-start">起</text>
                <text v-if="toNode === node.id" x="0" y="-14" class="indoor-marker-end">终</text>
              </g>
            </svg>
          </div>
        </div>
      </div>
    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import { indoorApi } from '@/api/indoorApi'
import type { IndoorBuildingMetadata, IndoorNode, NavigationResult } from '@/api/indoorApi'

const buildingId = 'BUPT_ZHONGHE_ZONGHE'
const currentFloor = ref('F1')
const fromNode = ref('')
const toNode = ref('')
const loading = ref(false)
const result = ref<NavigationResult | null>(null)
const error = ref('')
const selectMode = ref<'start' | 'end' | null>(null)
const floorPlanUrls = ref<Record<string, string>>({})
const allNodes = ref<IndoorNode[]>([])
const allEdges = ref<{ from: string; to: string; dist: number; floor: string }[]>([])
const floors = ref<string[]>([])

function parseFloorOrder(floor: string): number {
  if (floor.startsWith('B')) return -Number.parseInt(floor.slice(1), 10)
  if (floor.startsWith('F')) return Number.parseInt(floor.slice(1), 10)
  return Number.MAX_SAFE_INTEGER
}

function deriveFloors(meta: IndoorBuildingMetadata): string[] {
  const floorSet = new Set<string>()
  for (const node of meta.nodes ?? []) floorSet.add(node.floor)
  for (const floor of Object.keys(meta.floorPlans ?? {})) floorSet.add(floor)
  for (const floor of meta.floors ?? []) floorSet.add(floor)
  return Array.from(floorSet).sort((left, right) => parseFloorOrder(left) - parseFloorOrder(right))
}

function getNodesByFloor(floor: string): IndoorNode[] {
  return allNodes.value.filter((node) => node.floor === floor && !['CORRIDOR', 'DOOR'].includes(node.type))
}

const floorNodes = computed(() => getNodesByFloor(currentFloor.value))

const floorEdges = computed(() =>
  allEdges.value.filter((edge) => edge.floor === currentFloor.value)
)

const pathEdgeSet = computed(() => {
  if (!result.value) return new Set<string>()
  const edges = new Set<string>()
  for (const step of result.value.steps) {
    if (!step.crossFloor) {
      edges.add(`${step.fromNodeId}-${step.toNodeId}`)
      edges.add(`${step.toNodeId}-${step.fromNodeId}`)
    }
  }
  return edges
})

const pathEdges = computed(() => {
  if (!result.value) return [] as { from: string; to: string }[]
  return result.value.steps
    .filter((step) => !step.crossFloor && step.fromFloor === currentFloor.value)
    .map((step) => ({ from: step.fromNodeId, to: step.toNodeId }))
})

const svgBounds = computed(() => {
  const nodes = floorNodes.value.length > 0 ? floorNodes.value : allNodes.value
  let maxX = 960
  let maxY = 640
  for (const node of nodes) {
    if (node.x > maxX) maxX = node.x
    if (node.y > maxY) maxY = node.y
  }
  return { width: maxX + 120, height: maxY + 120 }
})

const svgWidth = computed(() => svgBounds.value.width)
const svgHeight = computed(() => svgBounds.value.height)
const svgViewBox = computed(() => `0 0 ${svgWidth.value} ${svgHeight.value}`)
const currentFloorPlan = computed(() => floorPlanUrls.value[currentFloor.value] || '')

function nodePosition(nodeId: string): { x: number; y: number } {
  const node = allNodes.value.find((entry) => entry.id === nodeId)
  return node ? { x: node.x, y: node.y } : { x: 0, y: 0 }
}

function nodeTypeClass(type: string): string {
  const mapping: Record<string, string> = {
    ENTRANCE: 'entrance',
    CLASSROOM: 'room',
    LAB: 'lab',
    TOILET: 'toilet',
    STAIRS: 'stairs',
    ELEVATOR: 'elevator',
    EXIT: 'entrance',
    DOOR: 'door',
    LOBBY: 'lobby',
    OFFICE: 'office',
  }
  return mapping[type] || 'room'
}

function toggleSelect(mode: 'start' | 'end') {
  selectMode.value = selectMode.value === mode ? null : mode
}

function pickNode(node: IndoorNode) {
  if (selectMode.value === 'start') {
    fromNode.value = node.id
    currentFloor.value = node.floor
    selectMode.value = null
    return
  }
  if (selectMode.value === 'end') {
    toNode.value = node.id
    currentFloor.value = node.floor
    selectMode.value = null
  }
}

function onSvgClick(event: MouseEvent) {
  if (!selectMode.value) return
  const svg = event.currentTarget as HTMLDivElement
  const innerSvg = svg.querySelector('svg')
  if (!innerSvg) return
  const rect = innerSvg.getBoundingClientRect()
  const x = ((event.clientX - rect.left) / rect.width) * svgWidth.value
  const y = ((event.clientY - rect.top) / rect.height) * svgHeight.value

  let nearestNode: IndoorNode | null = null
  let nearestDistance = 80
  for (const node of floorNodes.value) {
    const distance = Math.hypot(node.x - x, node.y - y)
    if (distance < nearestDistance) {
      nearestNode = node
      nearestDistance = distance
    }
  }

  if (nearestNode) pickNode(nearestNode)
}

async function loadNodes() {
  try {
    const response = await indoorApi.getBuilding(buildingId)
    if (!response.data.data?.nodes?.length) return

    const meta = response.data.data
    allNodes.value = meta.nodes
    allEdges.value = meta.edges ?? []
    floorPlanUrls.value = meta.floorPlans ?? {}
    floors.value = deriveFloors(meta)
  } catch {
    error.value = '加载室内建模失败'
  }
}

async function navigate() {
  if (!fromNode.value || !toNode.value) return
  loading.value = true
  error.value = ''
  result.value = null

  try {
    const response = await indoorApi.navigate(buildingId, fromNode.value, toNode.value)
    if (response.data.data.success) {
      result.value = response.data.data
      if (response.data.data.floorPlans) floorPlanUrls.value = response.data.data.floorPlans
      const startNode = allNodes.value.find((node) => node.id === fromNode.value)
      if (startNode) currentFloor.value = startNode.floor
    } else {
      error.value = response.data.data.error || '未找到路径'
    }
  } catch {
    error.value = '请求失败，请检查后端是否运行'
  } finally {
    loading.value = false
  }
}

watch(floors, (availableFloors) => {
  if (availableFloors.length > 0 && !availableFloors.includes(currentFloor.value)) {
    currentFloor.value = availableFloors[0]
  }
}, { immediate: true })

onMounted(async () => {
  await loadNodes()
})
</script>

<style scoped>
.indoor-page { max-width: 1200px; margin: 0 auto; padding: 20px 16px; }
.page-header p { font-size: 14px; color: #999; margin: 4px 0 20px; }
.main-layout { display: flex; gap: 20px; height: calc(100vh - 160px); }

.control-panel { width: 340px; flex-shrink: 0; overflow-y: auto; }
.panel-section { margin-bottom: 16px; }
.panel-section h4 { font-size: 15px; margin-bottom: 8px; color: #333; }
.node-select-row { display: flex; gap: 6px; align-items: center; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
.node-select-row .el-button { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }

.legend { display: flex; flex-direction: column; gap: 4px; margin-top: 12px; font-size: 12px; color: #666; }
.result-section { margin-top: 16px; padding: 12px; background: #f8f9fa; border-radius: 8px; border: 1px solid #e0e0e0; }
.result-summary { display: flex; gap: 16px; font-size: 14px; color: #409EFF; font-weight: 600; margin-bottom: 12px; }
.route-text-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }
.route-text-item { padding: 8px 10px; background: #fff; border-left: 3px solid #409EFF; font-size: 13px; line-height: 1.45; color: #333; }
.step-list { max-height: 350px; overflow-y: auto; }
.step-item { display: flex; gap: 10px; padding: 10px 8px; border-bottom: 1px solid #eee; align-items: flex-start; }
.step-item.cross-floor { background: #fff8e1; }
.step-num { width: 24px; height: 24px; background: #409EFF; color: white; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; flex-shrink: 0; }
.step-text { font-size: 14px; color: #333; }
.step-meta { font-size: 12px; color: #999; margin-top: 2px; }

.map-area { flex: 1; position: relative; background: white; border-radius: 12px; border: 2px solid #ddd; overflow: hidden; }
.floor-switcher { position: absolute; top: 12px; left: 12px; z-index: 10; display: flex; gap: 4px; flex-wrap: wrap; }
.floor-btn { padding: 6px 14px; border: 2px solid #2c2c2c; background: white; cursor: pointer; font-size: 13px; font-weight: 600; transition: all 0.2s; border-radius: 0; }
.floor-btn:hover { background: #f0f0f0; }
.floor-btn.active { background: #2c2c2c; color: white; }

.structure-hint { position: absolute; top: 12px; left: 50%; transform: translateX(-50%); background: rgba(64, 158, 255, 0.92); color: white; padding: 8px 18px; border-radius: 18px; font-size: 13px; z-index: 10; }
.svg-wrapper { width: 100%; height: 100%; background: linear-gradient(180deg, #fbfbfb 0%, #f2f5f8 100%); }
.indoor-svg { width: 100%; height: 100%; display: block; cursor: crosshair; }
.floor-image { opacity: 0.16; }

.indoor-edge { stroke: #cfd8dc; stroke-width: 5; stroke-linecap: round; stroke-linejoin: round; }
.indoor-edge.on-path { stroke-opacity: 0.18; }
.indoor-route-line { stroke: #409EFF; stroke-width: 7; stroke-linecap: round; stroke-linejoin: round; }
.indoor-svg-node { cursor: pointer; }
.indoor-node-label { font-size: 9px; fill: #2c2c2c; dominant-baseline: middle; paint-order: stroke; stroke: rgba(255,255,255,0.9); stroke-width: 3px; stroke-linecap: round; stroke-linejoin: round; }
.indoor-marker-start, .indoor-marker-end { font-size: 16px; font-weight: 700; text-anchor: middle; }
.indoor-marker-start { fill: #3ad29f; }
.indoor-marker-end { fill: #dc3545; }

.ns-room { fill: #76b6ff; }
.ns-lab { fill: #b388ff; }
.ns-toilet { fill: #4dd0e1; }
.ns-stairs { fill: #ffb74d; }
.ns-elevator { fill: #90a4ae; }
.ns-entrance { fill: #66bb6a; }
.ns-door { fill: #ffd54f; }
.ns-lobby { fill: #f06292; }
.ns-office { fill: #a1887f; }

.error-msg { color: #F56C6C; margin-top: 12px; font-size: 14px; }
</style>
