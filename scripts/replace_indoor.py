#!/usr/bin/env python3
import re

with open(r'D:\JC\frontend\src\views\navigation\NavigationView.vue', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the old indoor section and replace it
old = '''const indoorDialogVisible = ref(false)
const indoorFloors = ['B1', 'F1', 'F2', 'F3', 'F4', 'F5']
const indoorFloor = ref('F1')
const indoorNodes = ref<IndoorNode[]>([])
const indoorFloorPlans = ref<Record<string, string>>({})

function getIndoorImgUrl(floor: string): string {
  return indoorFloorPlans.value[floor] || `/images/indoor/BUPT_ZHONGHE_ZONGHE/${floor}.jpg`
}

const indoorNodesOnFloor = computed(() =>
  indoorNodes.value.filter(n => n.floor === indoorFloor.value && n.type !== 'CORRIDOR')
)

function getIndoorNodesByFloor(floor: string): IndoorNode[] {
  return indoorNodes.value.filter(n => n.floor === floor && n.type !== 'CORRIDOR')
}

function indoorNodeType(type: string): string {
  const map: Record<string, string> = {
    ENTRANCE: 'entrance', CLASSROOM: 'room', LAB: 'lab', TOILET: 'toilet',
    STAIRS: 'stairs', ELEVATOR: 'elevator', LOBBY: 'lobby', OFFICE: 'office'
  }
  return map[type] || ''
}

function indoorIcon(type: string): string {
  const map: Record<string, string> = {
    ENTRANCE: '\U0001f6aa', CLASSROOM: '\U0001f4da', LAB: '\U0001f52c', TOILET: '\U0001f6bb',
    STAIRS: '\U0001faa9', ELEVATOR: '\U0001f6d7', LOBBY: '\U0001f3db', OFFICE: '\U0001f4cb', CORRIDOR: '\u27a1\ufe0f'
  }
  return map[type] || '\U0001f4cd'
}

async function loadIndoorNodes() {
  try {
    const r = await indoorApi.getBuilding('BUPT_ZHONGHE_ZONGHE')
    if (r.data.data?.nodes) {
      indoorNodes.value = r.data.data.nodes
      if (r.data.data.floorPlans) indoorFloorPlans.value = r.data.data.floorPlans
    }
  } catch { /* ignore */ }
}

function onIndoorPlanClick(e: MouseEvent) {
  const img = e.currentTarget as HTMLImageElement
  const rect = img.getBoundingClientRect()
  const x = (e.clientX - rect.left) * (img.naturalWidth / rect.width)
  const y = (e.clientY - rect.top) * (img.naturalHeight / rect.height)
  const candidates = indoorNodesOnFloor.value
  if (!candidates.length) return
  const nearest = candidates.reduce((best, n) => {
    const d = Math.hypot(n.x - x, n.y - y)
    return d < best.dist ? { node: n, dist: d } : best
  }, { node: null as IndoorNode | null, dist: 200 })
  if (nearest.node && nearest.dist < 200) selectIndoorNode(nearest.node)
}'''

new = '''const indoorDialogVisible = ref(false)
const indoorFloors = ['B1', 'F1', 'F2', 'F3', 'F4', 'F5']
const indoorFloor = ref('F1')
const indoorNodes = ref<IndoorNode[]>([])
const indoorEdges = ref<{ from: string; to: string; dist: number; floor: string }[]>([])
const indoorFloorPlans = ref<Record<string, string>>({})

const indoorNodesOnFloor = computed(() =>
  indoorNodes.value.filter(n => n.floor === indoorFloor.value && n.type !== 'CORRIDOR')
)

const indoorFloorEdges = computed(() =>
  indoorEdges.value.filter(e => e.floor === indoorFloor.value)
)

const indoorSvgViewBox = computed(() => {
  let mx = 100, my = 100
  const nodes = indoorNodes.value.filter(n => n.floor === indoorFloor.value)
  for (const n of nodes) {
    if (n.x > mx) mx = n.x
    if (n.y > my) my = n.y
  }
  return '0 0 ' + (mx + 80) + ' ' + (my + 80)
})

function indoorNodeCoord(nodeId: string): { x: number; y: number } {
  const n = indoorNodes.value.find(n => n.id === nodeId)
  return n ? { x: n.x, y: n.y } : { x: 0, y: 0 }
}

function indoorNodeType(type: string): string {
  const map: Record<string, string> = {
    ENTRANCE: 'entrance', CLASSROOM: 'room', LAB: 'lab', TOILET: 'toilet',
    STAIRS: 'stairs', ELEVATOR: 'elevator', LOBBY: 'lobby', OFFICE: 'office'
  }
  return map[type] || ''
}

function indoorIcon(type: string): string {
  const map: Record<string, string> = {
    ENTRANCE: '\\u{1f6aa}', CLASSROOM: '\\u{1f4da}', LAB: '\\u{1f52c}', TOILET: '\\u{1f6bb}',
    STAIRS: '\\u{1faa9}', ELEVATOR: '\\u{1f6d7}', LOBBY: '\\u{1f3db}', OFFICE: '\\u{1f4cb}', CORRIDOR: '\\u{27a1}\\u{fe0f}'
  }
  return map[type] || '\\u{1f4cd}'
}

async function loadIndoorNodes() {
  try {
    const r = await indoorApi.getBuilding('BUPT_ZHONGHE_ZONGHE')
    if (r.data.data?.nodes) {
      indoorNodes.value = r.data.data.nodes
      if (r.data.data.edges) indoorEdges.value = r.data.data.edges
      if (r.data.data.floorPlans) indoorFloorPlans.value = r.data.data.floorPlans
    }
  } catch { /* ignore */ }
}

function onIndoorSvgClick(e: MouseEvent) {
  const svg = e.currentTarget as SVGElement
  const rect = svg.getBoundingClientRect()
  const vb = svg.getAttribute('viewBox')?.split(' ').map(Number) || [0, 0, 2000, 1500]
  const x = ((e.clientX - rect.left) / rect.width) * vb[2] + vb[0]
  const y = ((e.clientY - rect.top) / rect.height) * vb[3] + vb[1]
  const candidates = indoorNodesOnFloor.value
  if (!candidates.length) return
  const nearest = candidates.reduce((best, n) => {
    const d = Math.hypot(n.x - x, n.y - y)
    return d < best.dist ? { node: n, dist: d } : best
  }, { node: null as IndoorNode | null, dist: 60 })
  if (nearest.node) selectIndoorNode(nearest.node)
}

function getIndoorNodesByFloor(floor: string): IndoorNode[] {
  return indoorNodes.value.filter(n => n.floor === floor && n.type !== 'CORRIDOR')
}'''

if old in content:
    content = content.replace(old, new)
    with open(r'D:\JC\frontend\src\views\navigation\NavigationView.vue', 'w', encoding='utf-8') as f:
        f.write(content)
    print('Replaced successfully')
else:
    print('Old text NOT FOUND - checking...')
    # Find partial matches
    for keyword in ['indoorDialogVisible', 'getIndoorImgUrl', 'onIndoorPlanClick']:
        if keyword in content:
            print(f'  Found: {keyword}')
        else:
            print(f'  Missing: {keyword}')
