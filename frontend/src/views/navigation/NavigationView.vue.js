/// <reference types="../../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue';
import DefaultLayout from '@/layouts/DefaultLayout.vue';
import { navigationApi } from '@/api/navigationApi';
import { itineraryApi } from '@/api/itineraryApi';
import { indoorApi } from '@/api/indoorApi';
import { ElMessage } from 'element-plus';
import { Plus, Delete } from '@element-plus/icons-vue';
import { poiApi } from '@/api/poiApi';
// AMap 实例
let map = null;
let AMapInstance = null;
let startMarker = null;
let waypointMarkers = [];
let routePolylines = [];
let geocoder = null;
const mapContainer = ref();
const mapReady = ref(false);
const pickingStart = ref(false);
const pickingWaypointIdx = ref(null);
const finalDestinationIdx = ref(-1);
const planning = ref(false);
const saving = ref(false);
const strategy = ref('DISTANCE');
const transports = ref(['WALK']); // 默认步行
const startPoint = ref(null);
const waypoints = ref([]);
const routeResult = ref(null);
// --- POI search ---
const poiKeyword = ref('');
const poiResults = ref([]);
const searchPOILoading = ref(false);
// ── Indoor navigation ──
const indoorDialogVisible = ref(false);
const indoorFloor = ref('F1');
const indoorFloors = ['B1', 'F1', 'F2', 'F3', 'F4', 'F5'];
const indoorNodes = ref([]);
const indoorEdges = ref([]);
const indoorStart = ref(null);
const indoorEnd = ref(null);
const indoorSelectMode = ref(null);
const indoorRoute = ref(null);
const indoorLoading = ref(false);
const indoorFloorNodes = computed(() => indoorNodes.value.filter(n => n.floor === indoorFloor.value && n.type !== 'CORRIDOR'));
const indoorFloorEdges = computed(() => indoorEdges.value.filter(e => e.floor === indoorFloor.value));
const indoorSvgViewBox = computed(() => {
    let mx = 300, my = 300;
    for (const n of indoorFloorNodes.value) {
        if (n.x > mx)
            mx = n.x;
        if (n.y > my)
            my = n.y;
    }
    return `0 0 ${mx + 100} ${my + 100}`;
});
const indoorPathEdgeSet = computed(() => {
    if (!indoorRoute.value)
        return new Set();
    const s = new Set();
    for (const step of indoorRoute.value.steps) {
        if (!step.crossFloor) {
            s.add(step.fromNodeId + '-' + step.toNodeId);
            s.add(step.toNodeId + '-' + step.fromNodeId);
        }
    }
    return s;
});
const indoorPathEdges = computed(() => {
    if (!indoorRoute.value)
        return [];
    const edges = [];
    for (const step of indoorRoute.value.steps) {
        if (!step.crossFloor)
            edges.push({ from: step.fromNodeId, to: step.toNodeId });
    }
    return edges;
});
function indoorNodePos(nodeId) {
    const n = indoorNodes.value.find(n => n.id === nodeId);
    return n ? { x: n.x, y: n.y } : { x: 0, y: 0 };
}
function pickNode(node) {
    if (indoorSelectMode.value === 'start') {
        indoorStart.value = node;
        indoorSelectMode.value = null;
        indoorFloor.value = node.floor;
    }
    else if (indoorSelectMode.value === 'end') {
        indoorEnd.value = node;
        indoorSelectMode.value = null;
        indoorFloor.value = node.floor;
    }
}
function indoorSvgClicked(e) {
    if (!indoorSelectMode.value)
        return;
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const vb = svg.getAttribute('viewBox')?.split(' ').map(Number) || [0, 0, 2000, 1500];
    const cx = ((e.clientX - rect.left) / rect.width) * vb[2];
    const cy = ((e.clientY - rect.top) / rect.height) * vb[3];
    let best = null;
    let bestDist = 80;
    for (const n of indoorFloorNodes.value) {
        const d = Math.hypot(n.x - cx, n.y - cy);
        if (d < bestDist) {
            best = n;
            bestDist = d;
        }
    }
    if (best)
        pickNode(best);
}
function clearIndoor() {
    indoorStart.value = null;
    indoorEnd.value = null;
    indoorSelectMode.value = null;
    indoorRoute.value = null;
}
async function doIndoorNav() {
    if (!indoorStart.value || !indoorEnd.value)
        return;
    if (indoorStart.value.id === indoorEnd.value.id)
        return;
    indoorLoading.value = true;
    try {
        const r = await indoorApi.navigate('BUPT_ZHONGHE_ZONGHE', indoorStart.value.id, indoorEnd.value.id);
        if (r.data.data.success && r.data.data.steps.length > 0) {
            indoorRoute.value = r.data.data;
            indoorFloor.value = indoorStart.value.floor;
        }
    }
    catch (e) {
        console.error('Indoor navigation error:', e);
    }
    indoorLoading.value = false;
}
function dirText(from, to) {
    const f = parseInt(from.replace('F', '').replace('B', '-'));
    const t = parseInt(to.replace('F', '').replace('B', '-'));
    return t > f ? `⬆上到${to}层` : `⬇下到${to}层`;
}
function iconOf(type) {
    const m = { ENTRANCE: '🚪', CLASSROOM: '📚', LAB: '🔬', TOILET: '🚻', STAIRS: '🪜', ELEVATOR: '🛗', LOBBY: '🏛', OFFICE: '📋' };
    return m[type] || '📍';
}
function indoorNodeType(type) {
    const m = { ENTRANCE: 'entrance', CLASSROOM: 'room', LAB: 'lab', TOILET: 'toilet', STAIRS: 'stairs', ELEVATOR: 'elevator', LOBBY: 'lobby', OFFICE: 'office' };
    return m[type] || '';
}
async function loadIndoorNodes() {
    try {
        const r = await indoorApi.getBuilding('BUPT_ZHONGHE_ZONGHE');
        if (r.data.data?.nodes) {
            indoorNodes.value = r.data.data.nodes;
            if (r.data.data.edges)
                indoorEdges.value = r.data.data.edges;
        }
    }
    catch (e) {
        console.error('Load indoor nodes error:', e);
    }
}
// ── Map initialization ──
function initMap() {
    if (!mapContainer.value)
        return;
    try {
        AMapInstance = window.AMap;
        if (!AMapInstance) {
            setTimeout(initMap, 500);
            return;
        }
        map = new AMapInstance.Map(mapContainer.value, { zoom: 15, center: [116.275, 40.155], resizeEnable: true });
        geocoder = new AMapInstance.Geocoder({});
        const buptMarker = new AMapInstance.Marker({
            position: [116.29221, 40.15827], title: '综合实验教学楼',
            label: { content: '🏛 综合实验教学楼', offset: new AMapInstance.Pixel(0, -36) },
            extData: { isIndoor: true }
        });
        buptMarker.on('click', () => { indoorDialogVisible.value = true; if (!indoorNodes.value.length)
            loadIndoorNodes(); });
        map.add(buptMarker);
        mapContainer.value.addEventListener('click', (e) => {
            if (!pickingStart.value && pickingWaypointIdx.value === null)
                return;
            const pixel = new AMapInstance.Pixel(e.offsetX, e.offsetY);
            const lnglat = map.containerToLngLat(pixel);
            if (!lnglat)
                return;
            if (pickingStart.value) {
                setStartPoint(lnglat.lng, lnglat.lat);
                reverseGeocode(lnglat.lng, lnglat.lat, (n) => { if (startPoint.value)
                    startPoint.value.name = n; });
                pickingStart.value = false;
            }
            else if (pickingWaypointIdx.value !== null) {
                const idx = pickingWaypointIdx.value;
                setWaypoint(idx, lnglat.lng, lnglat.lat);
                reverseGeocode(lnglat.lng, lnglat.lat, (n) => { if (waypoints.value[idx])
                    waypoints.value[idx].name = n; });
                pickingWaypointIdx.value = null;
            }
        });
        mapReady.value = true;
    }
    catch (e) {
        console.error('AMap init failed:', e);
        setTimeout(initMap, 1000);
    }
}
function reverseGeocode(lng, lat, cb) {
    if (!geocoder) {
        cb('坐标点');
        return;
    }
    geocoder.getAddress([lng, lat], (status, result) => {
        cb(status === 'complete' && result.regeocode ? result.regeocode.formattedAddress || '坐标点' : '坐标点');
    });
}
function setStartPoint(lng, lat) {
    startPoint.value = { lng, lat };
    if (startMarker)
        map.remove(startMarker);
    startMarker = new AMapInstance.Marker({
        position: [lng, lat], title: '起点',
        icon: new AMapInstance.Icon({ image: 'https://webapi.amap.com/theme/v1.3/markers/n/start.png', size: [32, 32], imageSize: [32, 32] })
    });
    map.add(startMarker);
    map.setCenter([lng, lat]);
}
function setWaypoint(idx, lng, lat) {
    waypoints.value[idx] = { ...waypoints.value[idx], lng, lat };
    if (waypointMarkers[idx])
        map.remove(waypointMarkers[idx]);
    const mc = '<div style="width:26px;height:26px;border-radius:50%;background:#FF6B6B;color:#fff;font-size:13px;font-weight:700;text-align:center;line-height:26px;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);">' + (idx + 1) + '</div>';
    waypointMarkers[idx] = new AMapInstance.Marker({ position: [lng, lat], title: '途径点 #' + (idx + 1), content: mc, offset: new AMapInstance.Pixel(-13, -13) });
    map.add(waypointMarkers[idx]);
}
function clearAllWaypointMarkers() { waypointMarkers.forEach(m => map.remove(m)); waypointMarkers = []; }
function addWaypoint() { waypoints.value.push({ lat: null, lng: null, name: '' }); pickingWaypointIdx.value = waypoints.value.length - 1; }
function toggleWaypointPick(idx) { if (pickingStart.value)
    return; if (pickingWaypointIdx.value === idx) {
    pickingWaypointIdx.value = null;
    return;
} ; pickingWaypointIdx.value = idx; }
function removeWaypoint(idx) { if (waypointMarkers[idx]) {
    map.remove(waypointMarkers[idx]);
    waypointMarkers.splice(idx, 1);
} ; waypoints.value.splice(idx, 1); if (finalDestinationIdx.value === idx)
    finalDestinationIdx.value = -1;
else if (finalDestinationIdx.value > idx)
    finalDestinationIdx.value--; }
async function planRoute() {
    if (!startPoint.value || waypoints.value.length === 0 || !AMapInstance)
        return;
    const valid = waypoints.value.filter((wp) => wp.lat !== null && wp.lng !== null);
    if (!valid.length) {
        ElMessage.warning('请为至少一个途径点设置坐标');
        return;
    }
    planning.value = true;
    clearPolyline();
    try {
        const res = await navigationApi.planRoute({
            startLat: startPoint.value.lat, startLng: startPoint.value.lng,
            targets: valid.map((wp) => ({ lat: wp.lat, lng: wp.lng, name: wp.name || '途径点' })),
            strategy: strategy.value, transports: transports.value.length ? transports.value : ['WALK'],
            finalDestinationIdx: finalDestinationIdx.value >= 0 ? finalDestinationIdx.value : undefined
        });
        routeResult.value = res.data.data;
        drawRoute();
    }
    catch (e) {
        ElMessage.error('路径规划失败：' + (e.message || '未知错误'));
    }
    finally {
        planning.value = false;
    }
}
function drawRoute() {
    if (!routeResult.value?.path || routeResult.value.path.length < 2)
        return;
    clearPolyline();
    const pts = routeResult.value.path.map((p) => ({ lng: p.longitude, lat: p.latitude }));
    const bldLng = 116.29221, bldLat = 40.15827, tol = 0.0001;
    const indoorSet = new Set();
    for (const wp of waypoints.value) {
        if (wp.lng && wp.lat && Math.abs(wp.lng - bldLng) < tol && Math.abs(wp.lat - bldLat) < tol)
            indoorSet.add(wp.lng.toFixed(5) + ',' + wp.lat.toFixed(5));
    }
    // Helper: find nearest path point index to given coordinates
    function nearestPathIdx(lng, lat) {
        let bestIdx = 0, bestDist = Infinity;
        for (let i = 0; i < pts.length; i++) {
            const d = Math.hypot(lng - pts[i].lng, lat - pts[i].lat);
            if (d < bestDist) {
                bestDist = d;
                bestIdx = i;
            }
        }
        return bestIdx;
    }
    // ── Draw dashed "walk to road" lines from each marker to nearest path point ──
    const allMarkers = [];
    if (startPoint.value)
        allMarkers.push({ lng: startPoint.value.lng, lat: startPoint.value.lat, indoor: false });
    for (const wp of waypoints.value) {
        if (wp.lng && wp.lat)
            allMarkers.push({ lng: wp.lng, lat: wp.lat, indoor: Math.abs(wp.lng - bldLng) < tol && Math.abs(wp.lat - bldLat) < tol });
    }
    for (const m of allMarkers) {
        const idx = nearestPathIdx(m.lng, m.lat);
        const d = Math.hypot(m.lng - pts[idx].lng, m.lat - pts[idx].lat);
        if (d > 0.00005) {
            const walkLine = new AMapInstance.Polyline({
                path: [[m.lng, m.lat], [pts[idx].lng, pts[idx].lat]],
                strokeColor: m.indoor ? '#E6A23C' : '#999',
                strokeWeight: m.indoor ? 4 : 3, strokeOpacity: 0.7, strokeStyle: 'dashed'
            });
            map.add(walkLine);
            routePolylines.push(walkLine);
        }
    }
    // ── Draw main OSM route (segmented by indoor/outdoor) ──
    let segStart = 0, isIndoor = false;
    for (let i = 1; i < pts.length; i++) {
        const key = pts[i].lng.toFixed(5) + ',' + pts[i].lat.toFixed(5);
        const indoor = indoorSet.has(key);
        if (i > segStart && indoor !== isIndoor) {
            const path = pts.slice(segStart, i + 1).map((p) => [p.lng, p.lat]);
            const pl = new AMapInstance.Polyline({ path, strokeColor: isIndoor ? '#E6A23C' : '#409EFF', strokeWeight: isIndoor ? 4 : 6, strokeOpacity: 0.8, strokeStyle: isIndoor ? 'dashed' : 'solid', showDir: !isIndoor });
            map.add(pl);
            routePolylines.push(pl);
            segStart = i;
            isIndoor = indoor;
        }
        else if (i === 1) {
            isIndoor = indoor;
        }
    }
    if (segStart < pts.length - 1) {
        const path = pts.slice(segStart).map((p) => [p.lng, p.lat]);
        const pl = new AMapInstance.Polyline({ path, strokeColor: isIndoor ? '#E6A23C' : '#409EFF', strokeWeight: isIndoor ? 4 : 6, strokeOpacity: 0.8, strokeStyle: isIndoor ? 'dashed' : 'solid', showDir: !isIndoor });
        map.add(pl);
        routePolylines.push(pl);
    }
    map.setFitView(routePolylines);
}
function clearPolyline() { routePolylines.forEach(p => { if (map)
    map.remove(p); }); routePolylines = []; }
function resolveNodeName(nodeId) {
    if (nodeId === 'start')
        return startPoint.value?.name || '起点';
    if (routeResult.value?.path) {
        const n = routeResult.value.path.find((p) => p.nodeId === nodeId);
        if (n)
            return n.name || '节点 ' + nodeId;
    }
    return '节点 ' + nodeId;
}
function formatTime(seconds) { if (seconds < 60)
    return seconds + '秒'; const m = Math.floor(seconds / 60); const s = Math.round(seconds % 60); return m + '分' + s + '秒'; }
function formatTransport(t) { const m = { WALK: '步行', BIKE: '骑行', SHUTTLE: '穿梭巴士' }; return m[t] || t; }
async function searchPOI() { if (!poiKeyword.value.trim()) {
    poiResults.value = [];
    return;
} ; try {
    const r = await poiApi.search(poiKeyword.value.trim(), 15);
    poiResults.value = r.data.data;
}
catch (e) {
    console.error('POI search error:', e);
    poiResults.value = [];
} }
function selectPOI(poi) { poiKeyword.value = poi.name; map.setCenter([poi.lon, poi.lat]); map.setZoom(16); }
function setStartFromPOI(poi) { setStartPoint(poi.lon, poi.lat); if (startPoint.value)
    startPoint.value.name = poi.name; }
function setTargetFromPOI(poi) { addWaypoint(); const idx = waypoints.value.length - 1; setWaypoint(idx, poi.lon, poi.lat); waypoints.value[idx].name = poi.name; }
function clearRoute() { clearPolyline(); clearAllWaypointMarkers(); routeResult.value = null; if (startMarker) {
    map.remove(startMarker);
    startMarker = null;
} ; startPoint.value = null; waypoints.value = []; pickingWaypointIdx.value = null; finalDestinationIdx.value = -1; }
async function saveItinerary() { if (!routeResult.value)
    return; saving.value = true; try {
    await itineraryApi.create({ name: '路线 ' + new Date().toLocaleString('zh-CN'), routeData: JSON.stringify(routeResult.value), totalDistance: routeResult.value.totalDistance, totalTime: Math.round(routeResult.value.totalTime) });
    ElMessage.success('行程已保存');
}
catch (e) {
    console.error('Save itinerary error:', e);
    ElMessage.error('保存失败');
}
finally {
    saving.value = false;
} }
onMounted(() => { nextTick(initMap); });
onBeforeUnmount(() => { if (map)
    map.destroy(); });
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['point-name']} */ ;
/** @type {__VLS_StyleScopedClasses['waypoint-row']} */ ;
/** @type {__VLS_StyleScopedClasses['poi-result-item']} */ ;
/** @type {__VLS_StyleScopedClasses['sel-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['floor-tab']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['indoor-edge']} */ ;
/** @type {__VLS_StyleScopedClasses['indoor-svg-node']} */ ;
/** @type {__VLS_StyleScopedClasses['indoor-svg-node']} */ ;
/** @type {__VLS_StyleScopedClasses['ns-room']} */ ;
/** @type {__VLS_StyleScopedClasses['ns-stairs']} */ ;
/** @type {__VLS_StyleScopedClasses['indoor-marker-start']} */ ;
/** @type {__VLS_StyleScopedClasses['indoor-marker-end']} */ ;
/** @type {__VLS_StyleScopedClasses['indoor-node-item']} */ ;
/** @type {__VLS_StyleScopedClasses['selected']} */ ;
/** @type {__VLS_StyleScopedClasses['indoor-node-item']} */ ;
/** @type {__VLS_StyleScopedClasses['selected']} */ ;
/** @type {__VLS_StyleScopedClasses['indoor-node-item']} */ ;
/** @type {__VLS_StyleScopedClasses['indoor-node-item']} */ ;
/** @type {__VLS_StyleScopedClasses['indoor-step-list']} */ ;
/** @type {__VLS_StyleScopedClasses['step-item']} */ ;
/** @type {__VLS_StyleScopedClasses['cf']} */ ;
/** @type {__VLS_StyleScopedClasses['step-num']} */ ;
/** @type {__VLS_StyleScopedClasses['indoor-right']} */ ;
/** @type {__VLS_StyleScopedClasses['indoor-node-item']} */ ;
/** @type {__VLS_StyleScopedClasses['indoor-node-item']} */ ;
/** @type {__VLS_StyleScopedClasses['node-name']} */ ;
/** @type {__VLS_StyleScopedClasses['node-type-tag']} */ ;
// CSS variable injection 
// CSS variable injection end 
/** @type {[typeof DefaultLayout, typeof DefaultLayout, ]} */ ;
// @ts-ignore
const __VLS_0 = __VLS_asFunctionalComponent(DefaultLayout, new DefaultLayout({}));
const __VLS_1 = __VLS_0({}, ...__VLS_functionalComponentArgsRest(__VLS_0));
var __VLS_3 = {};
__VLS_2.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "nav-container" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "map-area" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    id: "amap-container",
    ref: "mapContainer",
});
/** @type {typeof __VLS_ctx.mapContainer} */ ;
if (!__VLS_ctx.mapReady) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "map-hint" },
    });
}
if (__VLS_ctx.mapReady && __VLS_ctx.pickingStart) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mode-hint" },
    });
    const __VLS_4 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
        ...{ 'onClick': {} },
        size: "small",
    }));
    const __VLS_6 = __VLS_5({
        ...{ 'onClick': {} },
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_5));
    let __VLS_8;
    let __VLS_9;
    let __VLS_10;
    const __VLS_11 = {
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.mapReady && __VLS_ctx.pickingStart))
                return;
            __VLS_ctx.pickingStart = false;
        }
    };
    __VLS_7.slots.default;
    var __VLS_7;
}
if (__VLS_ctx.mapReady && __VLS_ctx.pickingWaypointIdx !== null) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mode-hint" },
    });
    (__VLS_ctx.pickingWaypointIdx + 1);
    const __VLS_12 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
        ...{ 'onClick': {} },
        size: "small",
    }));
    const __VLS_14 = __VLS_13({
        ...{ 'onClick': {} },
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_13));
    let __VLS_16;
    let __VLS_17;
    let __VLS_18;
    const __VLS_19 = {
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.mapReady && __VLS_ctx.pickingWaypointIdx !== null))
                return;
            __VLS_ctx.pickingWaypointIdx = null;
        }
    };
    __VLS_15.slots.default;
    var __VLS_15;
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "control-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
    ...{ class: "panel-title" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "quick-links" },
});
const __VLS_20 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
    ...{ 'onClick': {} },
    size: "small",
    type: "primary",
}));
const __VLS_22 = __VLS_21({
    ...{ 'onClick': {} },
    size: "small",
    type: "primary",
}, ...__VLS_functionalComponentArgsRest(__VLS_21));
let __VLS_24;
let __VLS_25;
let __VLS_26;
const __VLS_27 = {
    onClick: (...[$event]) => {
        __VLS_ctx.$router.push('/itineraries');
    }
};
__VLS_23.slots.default;
var __VLS_23;
const __VLS_28 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({
    ...{ 'onClick': {} },
    size: "small",
    type: "warning",
}));
const __VLS_30 = __VLS_29({
    ...{ 'onClick': {} },
    size: "small",
    type: "warning",
}, ...__VLS_functionalComponentArgsRest(__VLS_29));
let __VLS_32;
let __VLS_33;
let __VLS_34;
const __VLS_35 = {
    onClick: (...[$event]) => {
        __VLS_ctx.$router.push('/itineraries');
    }
};
__VLS_31.slots.default;
var __VLS_31;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "point-row" },
});
const __VLS_36 = {}.ElTag;
/** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
// @ts-ignore
const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
    type: "success",
    size: "small",
}));
const __VLS_38 = __VLS_37({
    type: "success",
    size: "small",
}, ...__VLS_functionalComponentArgsRest(__VLS_37));
__VLS_39.slots.default;
var __VLS_39;
if (__VLS_ctx.startPoint) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "point-name" },
    });
    (__VLS_ctx.startPoint.name || '起点');
}
if (__VLS_ctx.startPoint) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "point-coord" },
    });
    (__VLS_ctx.startPoint.lng.toFixed(5));
    (__VLS_ctx.startPoint.lat.toFixed(5));
}
const __VLS_40 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
    ...{ 'onClick': {} },
    size: "small",
    type: (__VLS_ctx.pickingStart ? 'danger' : 'primary'),
}));
const __VLS_42 = __VLS_41({
    ...{ 'onClick': {} },
    size: "small",
    type: (__VLS_ctx.pickingStart ? 'danger' : 'primary'),
}, ...__VLS_functionalComponentArgsRest(__VLS_41));
let __VLS_44;
let __VLS_45;
let __VLS_46;
const __VLS_47 = {
    onClick: (...[$event]) => {
        __VLS_ctx.pickingStart = !__VLS_ctx.pickingStart;
        __VLS_ctx.pickingWaypointIdx = null;
    }
};
__VLS_43.slots.default;
(__VLS_ctx.pickingStart ? '点击地图选起点' : '选起点');
var __VLS_43;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "waypoints-section" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "waypoints-header" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "section-label" },
});
const __VLS_48 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
    ...{ 'onClick': {} },
    size: "small",
    type: "success",
    plain: true,
    disabled: (__VLS_ctx.pickingStart),
}));
const __VLS_50 = __VLS_49({
    ...{ 'onClick': {} },
    size: "small",
    type: "success",
    plain: true,
    disabled: (__VLS_ctx.pickingStart),
}, ...__VLS_functionalComponentArgsRest(__VLS_49));
let __VLS_52;
let __VLS_53;
let __VLS_54;
const __VLS_55 = {
    onClick: (__VLS_ctx.addWaypoint)
};
__VLS_51.slots.default;
const __VLS_56 = {}.ElIcon;
/** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
// @ts-ignore
const __VLS_57 = __VLS_asFunctionalComponent(__VLS_56, new __VLS_56({}));
const __VLS_58 = __VLS_57({}, ...__VLS_functionalComponentArgsRest(__VLS_57));
__VLS_59.slots.default;
const __VLS_60 = {}.Plus;
/** @type {[typeof __VLS_components.Plus, ]} */ ;
// @ts-ignore
const __VLS_61 = __VLS_asFunctionalComponent(__VLS_60, new __VLS_60({}));
const __VLS_62 = __VLS_61({}, ...__VLS_functionalComponentArgsRest(__VLS_61));
var __VLS_59;
var __VLS_51;
for (const [wp, idx] of __VLS_getVForSourceType((__VLS_ctx.waypoints))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "waypoint-row" },
        key: (idx),
    });
    const __VLS_64 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_65 = __VLS_asFunctionalComponent(__VLS_64, new __VLS_64({
        type: (idx === __VLS_ctx.pickingWaypointIdx ? 'warning' : 'success'),
        size: "small",
        ...{ class: "wp-num" },
    }));
    const __VLS_66 = __VLS_65({
        type: (idx === __VLS_ctx.pickingWaypointIdx ? 'warning' : 'success'),
        size: "small",
        ...{ class: "wp-num" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_65));
    __VLS_67.slots.default;
    (idx + 1);
    var __VLS_67;
    if (idx === __VLS_ctx.finalDestinationIdx) {
        const __VLS_68 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_69 = __VLS_asFunctionalComponent(__VLS_68, new __VLS_68({
            type: "danger",
            size: "small",
            ...{ class: "wp-final-tag" },
        }));
        const __VLS_70 = __VLS_69({
            type: "danger",
            size: "small",
            ...{ class: "wp-final-tag" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_69));
        __VLS_71.slots.default;
        var __VLS_71;
    }
    if (wp.name) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "point-name" },
        });
        (wp.name);
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "point-name placeholder" },
        });
        (idx + 1);
    }
    if (wp.lat !== null && wp.lng !== null) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "point-coord" },
        });
        (wp.lng.toFixed(5));
        (wp.lat.toFixed(5));
    }
    const __VLS_72 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_73 = __VLS_asFunctionalComponent(__VLS_72, new __VLS_72({
        ...{ 'onClick': {} },
        size: "small",
        type: (__VLS_ctx.pickingWaypointIdx === idx ? 'danger' : 'primary'),
        plain: true,
        disabled: (__VLS_ctx.pickingStart),
    }));
    const __VLS_74 = __VLS_73({
        ...{ 'onClick': {} },
        size: "small",
        type: (__VLS_ctx.pickingWaypointIdx === idx ? 'danger' : 'primary'),
        plain: true,
        disabled: (__VLS_ctx.pickingStart),
    }, ...__VLS_functionalComponentArgsRest(__VLS_73));
    let __VLS_76;
    let __VLS_77;
    let __VLS_78;
    const __VLS_79 = {
        onClick: (...[$event]) => {
            __VLS_ctx.toggleWaypointPick(idx);
        }
    };
    __VLS_75.slots.default;
    (__VLS_ctx.pickingWaypointIdx === idx ? '选点中...' : '选点');
    var __VLS_75;
    const __VLS_80 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_81 = __VLS_asFunctionalComponent(__VLS_80, new __VLS_80({
        ...{ 'onClick': {} },
        size: "small",
        type: (idx === __VLS_ctx.finalDestinationIdx ? 'danger' : 'warning'),
        plain: true,
        disabled: (__VLS_ctx.pickingWaypointIdx !== null || __VLS_ctx.pickingStart || wp.lat === null),
    }));
    const __VLS_82 = __VLS_81({
        ...{ 'onClick': {} },
        size: "small",
        type: (idx === __VLS_ctx.finalDestinationIdx ? 'danger' : 'warning'),
        plain: true,
        disabled: (__VLS_ctx.pickingWaypointIdx !== null || __VLS_ctx.pickingStart || wp.lat === null),
    }, ...__VLS_functionalComponentArgsRest(__VLS_81));
    let __VLS_84;
    let __VLS_85;
    let __VLS_86;
    const __VLS_87 = {
        onClick: (...[$event]) => {
            __VLS_ctx.finalDestinationIdx = __VLS_ctx.finalDestinationIdx === idx ? -1 : idx;
        }
    };
    __VLS_83.slots.default;
    (idx === __VLS_ctx.finalDestinationIdx ? '终点' : '设终点');
    var __VLS_83;
    const __VLS_88 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_89 = __VLS_asFunctionalComponent(__VLS_88, new __VLS_88({
        ...{ 'onClick': {} },
        size: "small",
        type: "danger",
        plain: true,
        disabled: (__VLS_ctx.pickingWaypointIdx !== null || __VLS_ctx.pickingStart),
    }));
    const __VLS_90 = __VLS_89({
        ...{ 'onClick': {} },
        size: "small",
        type: "danger",
        plain: true,
        disabled: (__VLS_ctx.pickingWaypointIdx !== null || __VLS_ctx.pickingStart),
    }, ...__VLS_functionalComponentArgsRest(__VLS_89));
    let __VLS_92;
    let __VLS_93;
    let __VLS_94;
    const __VLS_95 = {
        onClick: (...[$event]) => {
            __VLS_ctx.removeWaypoint(idx);
        }
    };
    __VLS_91.slots.default;
    const __VLS_96 = {}.ElIcon;
    /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
    // @ts-ignore
    const __VLS_97 = __VLS_asFunctionalComponent(__VLS_96, new __VLS_96({}));
    const __VLS_98 = __VLS_97({}, ...__VLS_functionalComponentArgsRest(__VLS_97));
    __VLS_99.slots.default;
    const __VLS_100 = {}.Delete;
    /** @type {[typeof __VLS_components.Delete, ]} */ ;
    // @ts-ignore
    const __VLS_101 = __VLS_asFunctionalComponent(__VLS_100, new __VLS_100({}));
    const __VLS_102 = __VLS_101({}, ...__VLS_functionalComponentArgsRest(__VLS_101));
    var __VLS_99;
    var __VLS_91;
}
if (__VLS_ctx.waypoints.length === 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "waypoints-empty" },
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "transport-section" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "section-label" },
});
const __VLS_104 = {}.ElCheckboxGroup;
/** @type {[typeof __VLS_components.ElCheckboxGroup, typeof __VLS_components.elCheckboxGroup, typeof __VLS_components.ElCheckboxGroup, typeof __VLS_components.elCheckboxGroup, ]} */ ;
// @ts-ignore
const __VLS_105 = __VLS_asFunctionalComponent(__VLS_104, new __VLS_104({
    modelValue: (__VLS_ctx.transports),
    ...{ class: "transport-group" },
}));
const __VLS_106 = __VLS_105({
    modelValue: (__VLS_ctx.transports),
    ...{ class: "transport-group" },
}, ...__VLS_functionalComponentArgsRest(__VLS_105));
__VLS_107.slots.default;
const __VLS_108 = {}.ElCheckbox;
/** @type {[typeof __VLS_components.ElCheckbox, typeof __VLS_components.elCheckbox, typeof __VLS_components.ElCheckbox, typeof __VLS_components.elCheckbox, ]} */ ;
// @ts-ignore
const __VLS_109 = __VLS_asFunctionalComponent(__VLS_108, new __VLS_108({
    label: "WALK",
}));
const __VLS_110 = __VLS_109({
    label: "WALK",
}, ...__VLS_functionalComponentArgsRest(__VLS_109));
__VLS_111.slots.default;
var __VLS_111;
const __VLS_112 = {}.ElCheckbox;
/** @type {[typeof __VLS_components.ElCheckbox, typeof __VLS_components.elCheckbox, typeof __VLS_components.ElCheckbox, typeof __VLS_components.elCheckbox, ]} */ ;
// @ts-ignore
const __VLS_113 = __VLS_asFunctionalComponent(__VLS_112, new __VLS_112({
    label: "BIKE",
}));
const __VLS_114 = __VLS_113({
    label: "BIKE",
}, ...__VLS_functionalComponentArgsRest(__VLS_113));
__VLS_115.slots.default;
var __VLS_115;
const __VLS_116 = {}.ElCheckbox;
/** @type {[typeof __VLS_components.ElCheckbox, typeof __VLS_components.elCheckbox, typeof __VLS_components.ElCheckbox, typeof __VLS_components.elCheckbox, ]} */ ;
// @ts-ignore
const __VLS_117 = __VLS_asFunctionalComponent(__VLS_116, new __VLS_116({
    label: "SHUTTLE",
}));
const __VLS_118 = __VLS_117({
    label: "SHUTTLE",
}, ...__VLS_functionalComponentArgsRest(__VLS_117));
__VLS_119.slots.default;
var __VLS_119;
var __VLS_107;
const __VLS_120 = {}.ElRadioGroup;
/** @type {[typeof __VLS_components.ElRadioGroup, typeof __VLS_components.elRadioGroup, typeof __VLS_components.ElRadioGroup, typeof __VLS_components.elRadioGroup, ]} */ ;
// @ts-ignore
const __VLS_121 = __VLS_asFunctionalComponent(__VLS_120, new __VLS_120({
    modelValue: (__VLS_ctx.strategy),
    ...{ class: "strategy-group" },
}));
const __VLS_122 = __VLS_121({
    modelValue: (__VLS_ctx.strategy),
    ...{ class: "strategy-group" },
}, ...__VLS_functionalComponentArgsRest(__VLS_121));
__VLS_123.slots.default;
const __VLS_124 = {}.ElRadio;
/** @type {[typeof __VLS_components.ElRadio, typeof __VLS_components.elRadio, typeof __VLS_components.ElRadio, typeof __VLS_components.elRadio, ]} */ ;
// @ts-ignore
const __VLS_125 = __VLS_asFunctionalComponent(__VLS_124, new __VLS_124({
    label: "DISTANCE",
}));
const __VLS_126 = __VLS_125({
    label: "DISTANCE",
}, ...__VLS_functionalComponentArgsRest(__VLS_125));
__VLS_127.slots.default;
var __VLS_127;
const __VLS_128 = {}.ElRadio;
/** @type {[typeof __VLS_components.ElRadio, typeof __VLS_components.elRadio, typeof __VLS_components.ElRadio, typeof __VLS_components.elRadio, ]} */ ;
// @ts-ignore
const __VLS_129 = __VLS_asFunctionalComponent(__VLS_128, new __VLS_128({
    label: "TIME",
}));
const __VLS_130 = __VLS_129({
    label: "TIME",
}, ...__VLS_functionalComponentArgsRest(__VLS_129));
__VLS_131.slots.default;
var __VLS_131;
var __VLS_123;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "poi-search-section" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "section-label" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "poi-search-row" },
});
const __VLS_132 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_133 = __VLS_asFunctionalComponent(__VLS_132, new __VLS_132({
    ...{ 'onKeyup': {} },
    modelValue: (__VLS_ctx.poiKeyword),
    placeholder: "输入景点/地名...",
    size: "small",
    clearable: true,
}));
const __VLS_134 = __VLS_133({
    ...{ 'onKeyup': {} },
    modelValue: (__VLS_ctx.poiKeyword),
    placeholder: "输入景点/地名...",
    size: "small",
    clearable: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_133));
let __VLS_136;
let __VLS_137;
let __VLS_138;
const __VLS_139 = {
    onKeyup: (__VLS_ctx.searchPOI)
};
var __VLS_135;
const __VLS_140 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_141 = __VLS_asFunctionalComponent(__VLS_140, new __VLS_140({
    ...{ 'onClick': {} },
    size: "small",
    type: "primary",
}));
const __VLS_142 = __VLS_141({
    ...{ 'onClick': {} },
    size: "small",
    type: "primary",
}, ...__VLS_functionalComponentArgsRest(__VLS_141));
let __VLS_144;
let __VLS_145;
let __VLS_146;
const __VLS_147 = {
    onClick: (__VLS_ctx.searchPOI)
};
__VLS_143.slots.default;
var __VLS_143;
if (__VLS_ctx.poiResults.length) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "poi-results" },
    });
    for (const [poi, idx] of __VLS_getVForSourceType((__VLS_ctx.poiResults))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.poiResults.length))
                        return;
                    __VLS_ctx.selectPOI(poi);
                } },
            key: (idx),
            ...{ class: "poi-result-item" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "poi-name" },
        });
        (poi.name);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "poi-coord" },
        });
        (poi.lat.toFixed(4));
        (poi.lon.toFixed(4));
        const __VLS_148 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_149 = __VLS_asFunctionalComponent(__VLS_148, new __VLS_148({
            ...{ 'onClick': {} },
            size: "small",
            type: "success",
            plain: true,
        }));
        const __VLS_150 = __VLS_149({
            ...{ 'onClick': {} },
            size: "small",
            type: "success",
            plain: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_149));
        let __VLS_152;
        let __VLS_153;
        let __VLS_154;
        const __VLS_155 = {
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.poiResults.length))
                    return;
                __VLS_ctx.setStartFromPOI(poi);
            }
        };
        __VLS_151.slots.default;
        var __VLS_151;
        const __VLS_156 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_157 = __VLS_asFunctionalComponent(__VLS_156, new __VLS_156({
            ...{ 'onClick': {} },
            size: "small",
            type: "danger",
            plain: true,
        }));
        const __VLS_158 = __VLS_157({
            ...{ 'onClick': {} },
            size: "small",
            type: "danger",
            plain: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_157));
        let __VLS_160;
        let __VLS_161;
        let __VLS_162;
        const __VLS_163 = {
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.poiResults.length))
                    return;
                __VLS_ctx.setTargetFromPOI(poi);
            }
        };
        __VLS_159.slots.default;
        var __VLS_159;
    }
}
const __VLS_164 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_165 = __VLS_asFunctionalComponent(__VLS_164, new __VLS_164({
    ...{ 'onClick': {} },
    type: "primary",
    ...{ class: "plan-btn" },
    loading: (__VLS_ctx.planning),
    disabled: (!__VLS_ctx.startPoint || __VLS_ctx.waypoints.length === 0),
}));
const __VLS_166 = __VLS_165({
    ...{ 'onClick': {} },
    type: "primary",
    ...{ class: "plan-btn" },
    loading: (__VLS_ctx.planning),
    disabled: (!__VLS_ctx.startPoint || __VLS_ctx.waypoints.length === 0),
}, ...__VLS_functionalComponentArgsRest(__VLS_165));
let __VLS_168;
let __VLS_169;
let __VLS_170;
const __VLS_171 = {
    onClick: (__VLS_ctx.planRoute)
};
__VLS_167.slots.default;
var __VLS_167;
if (__VLS_ctx.routeResult) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "route-result" },
    });
    const __VLS_172 = {}.ElDivider;
    /** @type {[typeof __VLS_components.ElDivider, typeof __VLS_components.elDivider, ]} */ ;
    // @ts-ignore
    const __VLS_173 = __VLS_asFunctionalComponent(__VLS_172, new __VLS_172({}));
    const __VLS_174 = __VLS_173({}, ...__VLS_functionalComponentArgsRest(__VLS_173));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "result-stats" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "stat-item" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "stat-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "stat-value" },
    });
    ((__VLS_ctx.routeResult.totalDistance / 1000).toFixed(2));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "stat-item" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "stat-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "stat-value" },
    });
    (__VLS_ctx.formatTime(__VLS_ctx.routeResult.totalTime));
    if (__VLS_ctx.routeResult) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "segments" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "section-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "route-summary" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.startPoint?.name || '起点');
        for (const [wp, i] of __VLS_getVForSourceType((__VLS_ctx.waypoints))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                key: (i),
            });
            (wp.name || '点' + (i + 1));
        }
    }
    const __VLS_176 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_177 = __VLS_asFunctionalComponent(__VLS_176, new __VLS_176({
        ...{ 'onClick': {} },
        ...{ class: "save-btn" },
        loading: (__VLS_ctx.saving),
    }));
    const __VLS_178 = __VLS_177({
        ...{ 'onClick': {} },
        ...{ class: "save-btn" },
        loading: (__VLS_ctx.saving),
    }, ...__VLS_functionalComponentArgsRest(__VLS_177));
    let __VLS_180;
    let __VLS_181;
    let __VLS_182;
    const __VLS_183 = {
        onClick: (__VLS_ctx.saveItinerary)
    };
    __VLS_179.slots.default;
    var __VLS_179;
    const __VLS_184 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_185 = __VLS_asFunctionalComponent(__VLS_184, new __VLS_184({
        ...{ 'onClick': {} },
    }));
    const __VLS_186 = __VLS_185({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_185));
    let __VLS_188;
    let __VLS_189;
    let __VLS_190;
    const __VLS_191 = {
        onClick: (__VLS_ctx.clearRoute)
    };
    __VLS_187.slots.default;
    var __VLS_187;
}
const __VLS_192 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_193 = __VLS_asFunctionalComponent(__VLS_192, new __VLS_192({
    ...{ 'onClose': {} },
    modelValue: (__VLS_ctx.indoorDialogVisible),
    title: "🏛 综合实验教学楼 · 室内导航",
    width: "75%",
    top: "4vh",
    destroyOnClose: true,
}));
const __VLS_194 = __VLS_193({
    ...{ 'onClose': {} },
    modelValue: (__VLS_ctx.indoorDialogVisible),
    title: "🏛 综合实验教学楼 · 室内导航",
    width: "75%",
    top: "4vh",
    destroyOnClose: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_193));
let __VLS_196;
let __VLS_197;
let __VLS_198;
const __VLS_199 = {
    onClose: (__VLS_ctx.clearIndoor)
};
__VLS_195.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "indoor-dialog-body" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "indoor-left" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "indoor-toolbar" },
});
for (const [f] of __VLS_getVForSourceType((__VLS_ctx.indoorFloors))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.indoorFloor = f;
            } },
        key: (f),
        ...{ class: (['floor-tab', { active: __VLS_ctx.indoorFloor === f }]) },
    });
    (f);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "indoor-toolbar-spacer" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.indoorSelectMode = __VLS_ctx.indoorSelectMode === 'start' ? null : 'start';
        } },
    ...{ class: (['sel-btn', { active: __VLS_ctx.indoorSelectMode === 'start' }]) },
});
(__VLS_ctx.indoorStart ? 'S:' + __VLS_ctx.indoorStart.name : '选起点');
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.indoorSelectMode = __VLS_ctx.indoorSelectMode === 'end' ? null : 'end';
        } },
    ...{ class: (['sel-btn', { active: __VLS_ctx.indoorSelectMode === 'end' }]) },
});
(__VLS_ctx.indoorEnd ? 'E:' + __VLS_ctx.indoorEnd.name : '选终点');
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ onClick: (__VLS_ctx.indoorSvgClicked) },
    ...{ class: "indoor-plan-wrap" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
    viewBox: (__VLS_ctx.indoorSvgViewBox),
    ...{ class: "indoor-svg" },
});
for (const [e] of __VLS_getVForSourceType((__VLS_ctx.indoorFloorEdges))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.line)({
        key: (e.from + e.to),
        x1: (__VLS_ctx.indoorNodePos(e.from).x),
        y1: (__VLS_ctx.indoorNodePos(e.from).y),
        x2: (__VLS_ctx.indoorNodePos(e.to).x),
        y2: (__VLS_ctx.indoorNodePos(e.to).y),
        ...{ class: (['indoor-edge', { 'on-path': __VLS_ctx.indoorPathEdgeSet.has(e.from + '-' + e.to) }]) },
    });
}
for (const [e] of __VLS_getVForSourceType((__VLS_ctx.indoorPathEdges))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.line)({
        key: (e.from + e.to),
        x1: (__VLS_ctx.indoorNodePos(e.from).x),
        y1: (__VLS_ctx.indoorNodePos(e.from).y),
        x2: (__VLS_ctx.indoorNodePos(e.to).x),
        y2: (__VLS_ctx.indoorNodePos(e.to).y),
        ...{ class: "indoor-route-line" },
    });
}
for (const [n] of __VLS_getVForSourceType((__VLS_ctx.indoorFloorNodes))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.g, __VLS_intrinsicElements.g)({
        key: (n.id),
        ...{ class: "indoor-svg-node" },
        transform: ('translate(' + n.x + ',' + n.y + ')'),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.title, __VLS_intrinsicElements.title)({});
    (n.name);
    if (n.type === 'STAIRS' || n.type === 'ELEVATOR') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.rect)({
            x: "-8",
            y: "-8",
            width: "16",
            height: "16",
            rx: "3",
            ...{ class: ('ns-' + __VLS_ctx.indoorNodeType(n.type)) },
        });
    }
    else if (n.type === 'ENTRANCE') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.polygon)({
            points: "-10,8 0,-10 10,8",
            ...{ class: ('ns-' + __VLS_ctx.indoorNodeType(n.type)) },
        });
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.rect)({
            x: "-6",
            y: "-6",
            width: "12",
            height: "12",
            ...{ class: ('ns-' + __VLS_ctx.indoorNodeType(n.type)) },
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.text, __VLS_intrinsicElements.text)({
        x: "14",
        y: "4",
        ...{ class: "indoor-node-label" },
    });
    (n.name);
    if (__VLS_ctx.indoorStart && n.id === __VLS_ctx.indoorStart.id) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.text, __VLS_intrinsicElements.text)({
            x: "0",
            y: "-14",
            ...{ class: "indoor-marker-start" },
        });
    }
    if (__VLS_ctx.indoorEnd && n.id === __VLS_ctx.indoorEnd.id) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.text, __VLS_intrinsicElements.text)({
            x: "0",
            y: "-14",
            ...{ class: "indoor-marker-end" },
        });
    }
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "indoor-action-bar" },
});
const __VLS_200 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_201 = __VLS_asFunctionalComponent(__VLS_200, new __VLS_200({
    ...{ 'onClick': {} },
    size: "small",
}));
const __VLS_202 = __VLS_201({
    ...{ 'onClick': {} },
    size: "small",
}, ...__VLS_functionalComponentArgsRest(__VLS_201));
let __VLS_204;
let __VLS_205;
let __VLS_206;
const __VLS_207 = {
    onClick: (__VLS_ctx.clearIndoor)
};
__VLS_203.slots.default;
var __VLS_203;
const __VLS_208 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_209 = __VLS_asFunctionalComponent(__VLS_208, new __VLS_208({
    ...{ 'onClick': {} },
    size: "small",
    type: "primary",
    loading: (__VLS_ctx.indoorLoading),
}));
const __VLS_210 = __VLS_209({
    ...{ 'onClick': {} },
    size: "small",
    type: "primary",
    loading: (__VLS_ctx.indoorLoading),
}, ...__VLS_functionalComponentArgsRest(__VLS_209));
let __VLS_212;
let __VLS_213;
let __VLS_214;
const __VLS_215 = {
    onClick: (__VLS_ctx.doIndoorNav)
};
__VLS_211.slots.default;
var __VLS_211;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "indoor-right" },
});
if (__VLS_ctx.indoorRoute) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    (__VLS_ctx.indoorRoute.totalDistance.toFixed(0));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "indoor-step-list" },
    });
    for (const [s, i] of __VLS_getVForSourceType((__VLS_ctx.indoorRoute.steps))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (i),
            ...{ class: (['step-item', { 'cf': s.crossFloor }]) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "step-num" },
        });
        (i + 1);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        (s.instruction);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "step-meta" },
        });
        (s.fromFloor);
        (s.crossFloor ? __VLS_ctx.dirText(s.fromFloor, s.toFloor) : s.distance.toFixed(0) + 'm');
        if (s.crossFloor) {
            const __VLS_216 = {}.ElTag;
            /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
            // @ts-ignore
            const __VLS_217 = __VLS_asFunctionalComponent(__VLS_216, new __VLS_216({
                type: "warning",
                size: "small",
            }));
            const __VLS_218 = __VLS_217({
                type: "warning",
                size: "small",
            }, ...__VLS_functionalComponentArgsRest(__VLS_217));
            __VLS_219.slots.default;
            var __VLS_219;
        }
    }
    const __VLS_220 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_221 = __VLS_asFunctionalComponent(__VLS_220, new __VLS_220({
        ...{ 'onClick': {} },
        size: "small",
        ...{ class: "indoor-back-btn" },
    }));
    const __VLS_222 = __VLS_221({
        ...{ 'onClick': {} },
        size: "small",
        ...{ class: "indoor-back-btn" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_221));
    let __VLS_224;
    let __VLS_225;
    let __VLS_226;
    const __VLS_227 = {
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.indoorRoute))
                return;
            __VLS_ctx.indoorRoute = null;
        }
    };
    __VLS_223.slots.default;
    var __VLS_223;
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
    (__VLS_ctx.indoorFloor);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "indoor-node-list" },
    });
    for (const [n] of __VLS_getVForSourceType((__VLS_ctx.indoorFloorNodes))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.indoorRoute))
                        return;
                    __VLS_ctx.pickNode(n);
                } },
            key: (n.id),
            ...{ class: (['indoor-node-item', { 'is-start': n.id === __VLS_ctx.indoorStart?.id, 'is-end': n.id === __VLS_ctx.indoorEnd?.id }]) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.iconOf(n.type));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "node-name" },
        });
        (n.name);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "node-type" },
        });
        (n.type);
    }
}
var __VLS_195;
var __VLS_2;
/** @type {__VLS_StyleScopedClasses['nav-container']} */ ;
/** @type {__VLS_StyleScopedClasses['map-area']} */ ;
/** @type {__VLS_StyleScopedClasses['map-hint']} */ ;
/** @type {__VLS_StyleScopedClasses['mode-hint']} */ ;
/** @type {__VLS_StyleScopedClasses['mode-hint']} */ ;
/** @type {__VLS_StyleScopedClasses['control-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-title']} */ ;
/** @type {__VLS_StyleScopedClasses['quick-links']} */ ;
/** @type {__VLS_StyleScopedClasses['point-row']} */ ;
/** @type {__VLS_StyleScopedClasses['point-name']} */ ;
/** @type {__VLS_StyleScopedClasses['point-coord']} */ ;
/** @type {__VLS_StyleScopedClasses['waypoints-section']} */ ;
/** @type {__VLS_StyleScopedClasses['waypoints-header']} */ ;
/** @type {__VLS_StyleScopedClasses['section-label']} */ ;
/** @type {__VLS_StyleScopedClasses['waypoint-row']} */ ;
/** @type {__VLS_StyleScopedClasses['wp-num']} */ ;
/** @type {__VLS_StyleScopedClasses['wp-final-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['point-name']} */ ;
/** @type {__VLS_StyleScopedClasses['point-name']} */ ;
/** @type {__VLS_StyleScopedClasses['placeholder']} */ ;
/** @type {__VLS_StyleScopedClasses['point-coord']} */ ;
/** @type {__VLS_StyleScopedClasses['waypoints-empty']} */ ;
/** @type {__VLS_StyleScopedClasses['transport-section']} */ ;
/** @type {__VLS_StyleScopedClasses['section-label']} */ ;
/** @type {__VLS_StyleScopedClasses['transport-group']} */ ;
/** @type {__VLS_StyleScopedClasses['strategy-group']} */ ;
/** @type {__VLS_StyleScopedClasses['poi-search-section']} */ ;
/** @type {__VLS_StyleScopedClasses['section-label']} */ ;
/** @type {__VLS_StyleScopedClasses['poi-search-row']} */ ;
/** @type {__VLS_StyleScopedClasses['poi-results']} */ ;
/** @type {__VLS_StyleScopedClasses['poi-result-item']} */ ;
/** @type {__VLS_StyleScopedClasses['poi-name']} */ ;
/** @type {__VLS_StyleScopedClasses['poi-coord']} */ ;
/** @type {__VLS_StyleScopedClasses['plan-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['route-result']} */ ;
/** @type {__VLS_StyleScopedClasses['result-stats']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-item']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-label']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-value']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-item']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-label']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-value']} */ ;
/** @type {__VLS_StyleScopedClasses['segments']} */ ;
/** @type {__VLS_StyleScopedClasses['section-label']} */ ;
/** @type {__VLS_StyleScopedClasses['route-summary']} */ ;
/** @type {__VLS_StyleScopedClasses['save-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['indoor-dialog-body']} */ ;
/** @type {__VLS_StyleScopedClasses['indoor-left']} */ ;
/** @type {__VLS_StyleScopedClasses['indoor-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['indoor-toolbar-spacer']} */ ;
/** @type {__VLS_StyleScopedClasses['indoor-plan-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['indoor-svg']} */ ;
/** @type {__VLS_StyleScopedClasses['indoor-route-line']} */ ;
/** @type {__VLS_StyleScopedClasses['indoor-svg-node']} */ ;
/** @type {__VLS_StyleScopedClasses['indoor-node-label']} */ ;
/** @type {__VLS_StyleScopedClasses['indoor-marker-start']} */ ;
/** @type {__VLS_StyleScopedClasses['indoor-marker-end']} */ ;
/** @type {__VLS_StyleScopedClasses['indoor-action-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['indoor-right']} */ ;
/** @type {__VLS_StyleScopedClasses['indoor-step-list']} */ ;
/** @type {__VLS_StyleScopedClasses['step-num']} */ ;
/** @type {__VLS_StyleScopedClasses['step-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['indoor-back-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['indoor-node-list']} */ ;
/** @type {__VLS_StyleScopedClasses['node-name']} */ ;
/** @type {__VLS_StyleScopedClasses['node-type']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            DefaultLayout: DefaultLayout,
            Plus: Plus,
            Delete: Delete,
            mapContainer: mapContainer,
            mapReady: mapReady,
            pickingStart: pickingStart,
            pickingWaypointIdx: pickingWaypointIdx,
            finalDestinationIdx: finalDestinationIdx,
            planning: planning,
            saving: saving,
            strategy: strategy,
            transports: transports,
            startPoint: startPoint,
            waypoints: waypoints,
            routeResult: routeResult,
            poiKeyword: poiKeyword,
            poiResults: poiResults,
            indoorDialogVisible: indoorDialogVisible,
            indoorFloor: indoorFloor,
            indoorFloors: indoorFloors,
            indoorStart: indoorStart,
            indoorEnd: indoorEnd,
            indoorSelectMode: indoorSelectMode,
            indoorRoute: indoorRoute,
            indoorLoading: indoorLoading,
            indoorFloorNodes: indoorFloorNodes,
            indoorFloorEdges: indoorFloorEdges,
            indoorSvgViewBox: indoorSvgViewBox,
            indoorPathEdgeSet: indoorPathEdgeSet,
            indoorPathEdges: indoorPathEdges,
            indoorNodePos: indoorNodePos,
            pickNode: pickNode,
            indoorSvgClicked: indoorSvgClicked,
            clearIndoor: clearIndoor,
            doIndoorNav: doIndoorNav,
            dirText: dirText,
            iconOf: iconOf,
            indoorNodeType: indoorNodeType,
            addWaypoint: addWaypoint,
            toggleWaypointPick: toggleWaypointPick,
            removeWaypoint: removeWaypoint,
            planRoute: planRoute,
            formatTime: formatTime,
            searchPOI: searchPOI,
            selectPOI: selectPOI,
            setStartFromPOI: setStartFromPOI,
            setTargetFromPOI: setTargetFromPOI,
            clearRoute: clearRoute,
            saveItinerary: saveItinerary,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
