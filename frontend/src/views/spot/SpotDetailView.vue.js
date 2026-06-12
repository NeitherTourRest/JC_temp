/// <reference types="../../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import DefaultLayout from '@/layouts/DefaultLayout.vue';
import { spotApi } from '@/api/spotApi';
import { navigationApi } from '@/api/navigationApi';
import apiClient from '@/api/axios';
import { ElMessage } from 'element-plus';
import { useAuthStore } from '@/stores/authStore';
const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const spot = ref(null);
const reviews = ref([]);
const facilities = ref([]);
const walkingFoods = ref([]);
const featuredSpots = ref([]);
const loading = ref(true);
const congestionLevel = ref('EMPTY');
const congJustReported = ref(false);
const userRating = ref(Number(localStorage.getItem('spotRating_' + route.params.id)) || 0);
const rated = ref(userRating.value > 0);
const rateLoading = ref(false);
const selectedCongestion = ref('');
const congLoading = ref(false);
let mapInstance = null;
let navMapInstance = null;
let navGeocoder = null;
let navRoutePolyline = null;
let navMarkers = [];
const navDialogVisible = ref(false);
const navPickingStart = ref(false);
const navPickingWaypointIdx = ref(null);
const navFinalDestIdx = ref(-1);
const navPlanning = ref(false);
const navStrategy = ref('DISTANCE');
const navTransports = ref(['WALK']);
const navStart = ref(null);
const navWaypoints = ref([]);
const navRouteResult = ref(null);
const navPoiKeyword = ref('');
const navPoiResults = ref([]);
const heroBg = computed(() => {
    const img = spot.value?.imageUrl;
    if (img)
        return `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.45)), url(${img}) center/cover`;
    return 'linear-gradient(135deg, #a76fd7, #7cd7ee)';
});
const congestionOptions = [
    { value: 'OVERFLOWING', label: '爆满' },
    { value: 'CROWDED', label: '拥挤' },
    { value: 'MODERATE', label: '适中' },
    { value: 'SPARSE', label: '较少' },
    { value: 'EMPTY', label: '空闲' },
];
const congestionLabel = computed(() => {
    const m = {
        OVERFLOWING: '爆满', CROWDED: '拥挤', MODERATE: '适中',
        SPARSE: '较少', EMPTY: '空闲',
    };
    return m[congestionLevel.value] || congestionLevel.value;
});
function facilityIcon(category) {
    const icons = {
        TOILET: '🚻', PARKING: '🅿️', SERVICE: 'ℹ️', TICKET: '🎫',
        CLASSROOM: '🏫', LIBRARY: '📚', DORMITORY: '🏠', CAFETERIA: '🍽️',
        GYM: '🏟️', SUPERMARKET: '🏪', CAFE: '☕', HOSPITAL: '🏥',
    };
    return icons[category] || '📍';
}
const categoryLabels = {
    TOILET: 'Toilets', PARKING: 'Parking', SERVICE: 'Service', SHOP: 'Shops',
    CAFE: 'Cafes', HOSPITAL: 'Medical', AED: 'AED', ATM: 'ATMs', INFO: 'Info',
    RESTAURANT: 'Restaurants',
};
const groupedFacilities = computed(() => {
    const groups = {};
    for (const f of facilities.value) {
        const cat = f.category || 'OTHER';
        if (!groups[cat])
            groups[cat] = { label: categoryLabels[cat] || cat, items: [] };
        groups[cat].items.push(f);
    }
    return groups;
});
function walkingDistance(f) {
    if (!spot.value)
        return 0;
    const R = 6371000;
    const dLat = (f.latitude - spot.value.latitude) * Math.PI / 180;
    const dLng = (f.longitude - spot.value.longitude) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(spot.value.latitude * Math.PI / 180) * Math.cos(f.latitude * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}
function highlightFacility(f) {
    ElMessage.info(`${f.name} (${f.category})`);
}
function openNavDialog() {
    navStart.value = null;
    navWaypoints.value = [];
    navRouteResult.value = null;
    navPoiKeyword.value = '';
    navPoiResults.value = [];
    navPickingStart.value = false;
    navPickingWaypointIdx.value = null;
    navFinalDestIdx.value = -1;
    navDialogVisible.value = true;
    setTimeout(initNavMap, 300);
}
function clearNav() {
    if (navRoutePolyline)
        navRoutePolyline.setMap(null);
    navMarkers.forEach(m => m.setMap(null));
    navMarkers = [];
    if (navMapInstance) {
        navMapInstance.destroy();
        navMapInstance = null;
    }
}
function addNavWaypoint() {
    navWaypoints.value.push({ lat: null, lng: null, name: '' });
}
function removeNavWaypoint(idx) {
    navWaypoints.value.splice(idx, 1);
    if (navFinalDestIdx.value === idx)
        navFinalDestIdx.value = -1;
    else if (navFinalDestIdx.value > idx)
        navFinalDestIdx.value--;
}
function toggleNavWaypointPick(idx) {
    navPickingWaypointIdx.value = navPickingWaypointIdx.value === idx ? null : idx;
    navPickingStart.value = false;
}
// Map click to pick point
function onNavMapClick(lng, lat) {
    if (navPickingStart.value) {
        navStart.value = { lat, lng, name: '所选位置' };
        navPickingStart.value = false;
        initNavMap();
        return;
    }
    if (navPickingWaypointIdx.value !== null) {
        const idx = navPickingWaypointIdx.value;
        navWaypoints.value[idx] = { ...navWaypoints.value[idx], lat, lng, name: navWaypoints.value[idx].name || '所选位置' };
        navPickingWaypointIdx.value = null;
        initNavMap();
    }
}
function searchNavPOI() {
    const kw = navPoiKeyword.value.trim();
    if (!kw) {
        navPoiResults.value = [];
        return;
    }
    const results = [];
    // Search facilities
    for (const f of facilities.value) {
        if (f.name.toLowerCase().includes(kw.toLowerCase())) {
            results.push({
                name: f.name, lat: f.latitude, lon: f.longitude,
                source: 'facility',
            });
        }
    }
    if (navMapInstance && window.AMap) {
        const AMap = window.AMap;
        if (!navGeocoder)
            navGeocoder = new AMap.Geocoder({ city: '北京' });
    }
    navPoiResults.value = results;
}
function selectNavPOI(poi) {
    navPoiKeyword.value = poi.name;
    navPoiResults.value = [];
    if (navWaypoints.value.length === 0 || navWaypoints.value[navWaypoints.value.length - 1].lat != null) {
        addNavWaypoint();
    }
    const last = navWaypoints.value.length - 1;
    navWaypoints.value[last] = { lat: poi.lat, lng: poi.lon, name: poi.name };
    initNavMap();
}
function setNavStart(poi) {
    navStart.value = { lat: poi.lat, lng: poi.lon, name: poi.name };
    navPoiResults.value = [];
    initNavMap();
}
function setNavTarget(poi) {
    if (navWaypoints.value.length === 0 || navWaypoints.value[navWaypoints.value.length - 1].lat != null) {
        addNavWaypoint();
    }
    navWaypoints.value[navWaypoints.value.length - 1] = { lat: poi.lat, lng: poi.lon, name: poi.name };
    navFinalDestIdx.value = navWaypoints.value.length - 1;
    navPoiResults.value = [];
    initNavMap();
}
function initNavMap() {
    const container = document.getElementById('nav-map-container');
    if (!container || !spot.value)
        return;
    const tryInit = () => {
        if (!window.AMap) {
            setTimeout(tryInit, 500);
            return;
        }
        const AMap = window.AMap;
        const lat = spot.value.gcjLatitude || spot.value.latitude;
        const lng = spot.value.gcjLongitude || spot.value.longitude;
        if (navMapInstance) {
            navMapInstance.destroy();
        }
        navMapInstance = new AMap.Map(container, { zoom: 16, center: [lng, lat], resizeEnable: true });
        navMarkers.forEach(m => m.setMap(null));
        navMarkers = [];
        // Click handler
        navMapInstance.on('click', (e) => {
            onNavMapClick(e.lnglat.getLng(), e.lnglat.getLat());
        });
        // Helper: check if a coordinate matches any facility position
        const isFacilityPos = (lat, lng) => facilities.value.some((f) => {
            const fl = f.gcjLatitude || f.latitude;
            const fn = f.gcjLongitude || f.longitude;
            return Math.abs(fl - lat) < 0.0001 && Math.abs(fn - lng) < 0.0001;
        });
        // Start marker (black dot) — skip if at a facility position (facility marker handles it)
        if (navStart.value) {
            const sLat = navStart.value.gcjLatitude || navStart.value.lat;
            const sLng = navStart.value.gcjLongitude || navStart.value.lng;
            if (!isFacilityPos(sLat, sLng)) {
                const m = new AMap.Marker({
                    position: [sLng, sLat], map: navMapInstance,
                    content: `<div style="width:10px;height:10px;border-radius:50%;background:#1a1a1a;border:2px solid rgba(255,255,255,0.6);box-shadow:0 1px 4px rgba(0,0,0,0.4);"></div>`,
                });
                navMarkers.push(m);
            }
        }
        // Waypoint markers (small black dots) — skip if at a facility position
        for (let i = 0; i < navWaypoints.value.length; i++) {
            const wp = navWaypoints.value[i];
            if (wp.lat == null || wp.lng == null)
                continue;
            if (!isFacilityPos(wp.lat, wp.lng)) {
                const m = new AMap.Marker({
                    position: [wp.lng, wp.lat], map: navMapInstance,
                    content: `<div style="width:10px;height:10px;border-radius:50%;background:#1a1a1a;border:2px solid rgba(255,255,255,0.6);box-shadow:0 1px 4px rgba(0,0,0,0.4);"></div>`,
                });
                navMarkers.push(m);
            }
        }
        // Facility markers — selected ones show black dot instead of cyan
        for (const f of facilities.value) {
            const fLat = f.gcjLatitude || f.latitude;
            const fLng = f.gcjLongitude || f.longitude;
            if (!fLat || !fLng)
                continue;
            const isStart = navStart.value && Math.abs(fLat - (navStart.value.gcjLatitude || navStart.value.lat)) < 0.0001 && Math.abs(fLng - (navStart.value.gcjLongitude || navStart.value.lng)) < 0.0001;
            const isWp = navWaypoints.value.some(wp => wp.lat != null && wp.lng != null && Math.abs(wp.lat - fLat) < 0.0001 && Math.abs(wp.lng - fLng) < 0.0001);
            const selected = isStart || isWp;
            const dotColor = selected ? '#1a1a1a' : '#7cd7ee';
            const dotBorder = selected ? '2px solid rgba(255,255,255,0.6)' : '2px solid rgba(255,255,255,0.7)';
            const dotShadow = selected ? '0 1px 4px rgba(0,0,0,0.4)' : '0 0 6px rgba(124,215,238,0.5)';
            const labelHtml = `<div style="
            position:absolute;left:50%;top:9px;transform:translateX(-50%);
            background:rgba(42,40,40,0.85);backdrop-filter:blur(8px);
            -webkit-backdrop-filter:blur(8px);
            border:1px solid rgba(255,255,255,0.1);border-radius:4px;
            padding:1px 6px;
            font-family:'Lucida Console',monospace;
            font-size:11px;color:#e8e8e8;white-space:nowrap;
            box-shadow:0 2px 6px rgba(0,0,0,0.3);
          ">${f.name}</div>`;
            const m = new AMap.Marker({
                position: [fLng, fLat],
                map: navMapInstance,
                offset: new window.AMap.Pixel(0, 0),
                content: `<div style="position:relative;width:0;height:0">
          <div style="position:absolute;left:-6px;top:-6px;width:12px;height:12px;border-radius:50%;background:${dotColor};border:${dotBorder};box-shadow:${dotShadow};"></div>
          ${labelHtml}
        </div>`,
            });
            m.on('click', () => {
                // Respect picking mode
                if (navPickingStart.value) {
                    navStart.value = { lat: fLat, lng: fLng, name: f.name };
                    navPickingStart.value = false;
                    initNavMap();
                    return;
                }
                if (navPickingWaypointIdx.value !== null) {
                    const idx = navPickingWaypointIdx.value;
                    navWaypoints.value[idx] = { lat: fLat, lng: fLng, name: f.name };
                    navPickingWaypointIdx.value = null;
                    initNavMap();
                    return;
                }
                // Default: add as new waypoint
                if (navWaypoints.value.length === 0 || navWaypoints.value[navWaypoints.value.length - 1].lat != null) {
                    addNavWaypoint();
                }
                navWaypoints.value[navWaypoints.value.length - 1] = { lat: fLat, lng: fLng, name: f.name };
                initNavMap();
            });
            navMarkers.push(m);
        }
    };
    tryInit();
}
async function planNavRoute() {
    if (!navStart.value || navWaypoints.value.length === 0)
        return;
    navPlanning.value = true;
    try {
        const valid = navWaypoints.value.filter(wp => wp.lat != null && wp.lng != null);
        if (!valid.length) {
            ElMessage.warning('请至少添加一个有效的途径点');
            navPlanning.value = false;
            return;
        }
        const res = await navigationApi.planRoute({
            startLat: navStart.value.lat, startLng: navStart.value.lng,
            targets: valid.map(wp => ({ lat: wp.lat, lng: wp.lng, name: wp.name || '途径点' })),
            strategy: navStrategy.value,
            transports: navTransports.value.length ? navTransports.value : ['WALK'],
        });
        const route = res.data.data;
        navRouteResult.value = { totalDistance: route.totalDistance, totalTime: route.totalTime };
        if (navRoutePolyline)
            navRoutePolyline.setMap(null);
        if (navMapInstance && route.path?.length) {
            const AMap = window.AMap;
            const path = route.path.map((p) => [p.longitude, p.latitude]);
            navRoutePolyline = new AMap.Polyline({
                path, map: navMapInstance,
                strokeColor: '#7cd7ee', strokeWeight: 4, strokeOpacity: 0.8,
                lineJoin: 'round', lineCap: 'round',
            });
            navMapInstance.setFitView(null, false, [50, 50, 50, 50]);
        }
    }
    catch (e) {
        ElMessage.error('路线规划失败: ' + (e?.response?.data?.message || e.message || '未知错误'));
    }
    finally {
        navPlanning.value = false;
    }
}
function clearNavRoute() {
    if (navRoutePolyline) {
        navRoutePolyline.setMap(null);
        navRoutePolyline = null;
    }
    navRouteResult.value = null;
}
function formatNavDistance(m) {
    if (m >= 1000)
        return (m / 1000).toFixed(2) + ' km';
    return m.toFixed(0) + ' m';
}
function formatNavTime(s) {
    if (s >= 60)
        return Math.round(s / 60) + ' 分钟';
    return s + ' 秒';
}
function initMap(lat, lng, facilities) {
    const container = document.getElementById('spot-map-container');
    if (!container)
        return;
    const tryInit = () => {
        if (!window.AMap) {
            setTimeout(tryInit, 500);
            return;
        }
        const AMap = window.AMap;
        if (mapInstance) {
            mapInstance.destroy();
        }
        mapInstance = new AMap.Map(container, { zoom: 16, center: [lng, lat], resizeEnable: true });
        // Spot marker
        new AMap.Marker({ position: [lng, lat], map: mapInstance, title: spot.value?.name });
        // Facility markers (frosted glass text labels)
        if (facilities) {
            for (const f of facilities) {
                const fLat = f.gcjLatitude || f.latitude;
                const fLng = f.gcjLongitude || f.longitude;
                if (!fLat || !fLng)
                    continue;
                const marker = new AMap.Marker({
                    position: [fLng, fLat],
                    map: mapInstance,
                    offset: new window.AMap.Pixel(0, 0),
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
                });
                marker.on('click', () => {
                    ElMessage.info(`${f.name} (${f.category})`);
                });
            }
        }
    };
    tryInit();
}
async function onRateChange(rating) {
    if (rating < 1 || !spot.value) {
        userRating.value = 0;
        return;
    }
    if (!authStore.isAuthenticated) {
        ElMessage.warning('请先登录再评分');
        router.push('/login?redirect=' + route.path);
        userRating.value = 0;
        return;
    }
    rateLoading.value = true;
    try {
        const r = await apiClient.post('/spots/' + spot.value.id + '/rate', null, { params: { rating } });
        if (r.data.data) {
            const d = r.data.data;
            spot.value.avgRating = d.avgRating;
            spot.value.ratingCount = d.ratingCount;
            reviews.value = d.reviews || [];
            userRating.value = rating;
            rated.value = true;
            localStorage.setItem('spotRating_' + spot.value.id, String(rating));
            ElMessage.success('评分已提交！');
        }
    }
    catch (e) {
        console.error('Rate error:', e);
        if (e?.response?.status === 401) {
            ElMessage.error('登录已过期 - 请重新登录');
            authStore.logout();
            router.push('/login?redirect=' + route.path);
        }
        else {
            ElMessage.error('评分提交失败：' + (e?.response?.data?.message || e?.message || '未知错误'));
        }
    }
    finally {
        rateLoading.value = false;
    }
}
async function submitCongestion() {
    if (!selectedCongestion.value || !spot.value)
        return;
    if (!authStore.isAuthenticated) {
        ElMessage.warning('请先登录再上报拥挤度');
        router.push('/login?redirect=' + route.path);
        return;
    }
    congLoading.value = true;
    try {
        const r = await apiClient.post('/spots/' + spot.value.id + '/congestion', null, { params: { level: selectedCongestion.value } });
        if (r.data.data) {
            congestionLevel.value = r.data.data.congestionLevel || selectedCongestion.value;
            congJustReported.value = true;
            setTimeout(() => { congJustReported.value = false; }, 2000);
            ElMessage.success('拥挤度已上报！');
        }
    }
    catch (e) {
        console.error('Congestion error:', e);
        if (e?.response?.status === 401) {
            ElMessage.error('登录已过期 - 请重新登录');
            authStore.logout();
            router.push('/login?redirect=' + route.path);
        }
        else {
            ElMessage.error('拥挤度上报失败：' + (e?.response?.data?.message || e?.message || '服务器错误'));
        }
    }
    finally {
        congLoading.value = false;
    }
}
onMounted(async () => {
    const id = Number(route.params.id);
    try {
        const r = await spotApi.getDetail(id);
        if (r.data.data) {
            const d = r.data.data;
            spot.value = d;
            reviews.value = d.reviews || [];
            facilities.value = d.facilities || [];
            congestionLevel.value = d.congestionLevel || 'EMPTY';
        }
    }
    catch {
        spot.value = null;
    }
    finally {
        loading.value = false;
    }
    if (spot.value) {
        nextTick(() => initMap(spot.value.gcjLatitude || spot.value.latitude, spot.value.gcjLongitude || spot.value.longitude, facilities.value.map(f => ({
            ...f,
            gcjLatitude: f.gcjLatitude || f.latitude,
            gcjLongitude: f.gcjLongitude || f.longitude,
        }))));
        try {
            const nearby = await apiClient.get('/spots/' + id + '/foods/nearby', { params: { maxDistance: 2000 } });
            if (nearby.data.data)
                walkingFoods.value = nearby.data.data;
        }
        catch { /* okay */ }
        try {
            const s = await spotApi.search({ size: 6 });
            const all = s.data.data?.content || [];
            featuredSpots.value = all.filter((x) => x.id !== id).slice(0, 4);
        }
        catch { /* okay */ }
    }
});
onBeforeUnmount(() => {
    if (mapInstance) {
        mapInstance.destroy();
        mapInstance = null;
    }
    clearNav();
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['rating-card']} */ ;
/** @type {__VLS_StyleScopedClasses['rate-row']} */ ;
/** @type {__VLS_StyleScopedClasses['cong-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['cong-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['point-name']} */ ;
/** @type {__VLS_StyleScopedClasses['transport-group']} */ ;
/** @type {__VLS_StyleScopedClasses['strategy-group']} */ ;
/** @type {__VLS_StyleScopedClasses['poi-result-item']} */ ;
/** @type {__VLS_StyleScopedClasses['facility-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['walking-food-card']} */ ;
/** @type {__VLS_StyleScopedClasses['nearby-spot-card']} */ ;
/** @type {__VLS_StyleScopedClasses['ns-info']} */ ;
/** @type {__VLS_StyleScopedClasses['ns-info']} */ ;
/** @type {__VLS_StyleScopedClasses['review-header']} */ ;
/** @type {__VLS_StyleScopedClasses['review-header']} */ ;
/** @type {__VLS_StyleScopedClasses['review-card']} */ ;
// CSS variable injection 
// CSS variable injection end 
/** @type {[typeof DefaultLayout, typeof DefaultLayout, ]} */ ;
// @ts-ignore
const __VLS_0 = __VLS_asFunctionalComponent(DefaultLayout, new DefaultLayout({}));
const __VLS_1 = __VLS_0({}, ...__VLS_functionalComponentArgsRest(__VLS_0));
var __VLS_3 = {};
__VLS_2.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "spot-detail" },
});
__VLS_asFunctionalDirective(__VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.loading) }, null, null);
if (__VLS_ctx.spot?.imageUrl) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
        ...{ class: "detail-bg" },
        ...{ style: ({ backgroundImage: `url(${__VLS_ctx.spot.imageUrl})` }) },
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
    ...{ class: "detail-bg-overlay" },
});
if (!__VLS_ctx.loading && !__VLS_ctx.spot) {
    const __VLS_4 = {}.ElResult;
    /** @type {[typeof __VLS_components.ElResult, typeof __VLS_components.elResult, typeof __VLS_components.ElResult, typeof __VLS_components.elResult, ]} */ ;
    // @ts-ignore
    const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
        icon: "error",
        title: "景点未找到",
        subTitle: "无法加载该景点信息",
    }));
    const __VLS_6 = __VLS_5({
        icon: "error",
        title: "景点未找到",
        subTitle: "无法加载该景点信息",
    }, ...__VLS_functionalComponentArgsRest(__VLS_5));
    __VLS_7.slots.default;
    {
        const { extra: __VLS_thisSlot } = __VLS_7.slots;
        const __VLS_8 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
            ...{ 'onClick': {} },
            type: "primary",
        }));
        const __VLS_10 = __VLS_9({
            ...{ 'onClick': {} },
            type: "primary",
        }, ...__VLS_functionalComponentArgsRest(__VLS_9));
        let __VLS_12;
        let __VLS_13;
        let __VLS_14;
        const __VLS_15 = {
            onClick: (...[$event]) => {
                if (!(!__VLS_ctx.loading && !__VLS_ctx.spot))
                    return;
                __VLS_ctx.$router.push('/spots');
            }
        };
        __VLS_11.slots.default;
        var __VLS_11;
    }
    var __VLS_7;
}
if (__VLS_ctx.spot) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "detail-content" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "hero" },
        ...{ style: ({ background: __VLS_ctx.heroBg }) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
        ...{ class: "hero-overlay" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "hero-content" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "hero-badges" },
    });
    const __VLS_16 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
        size: "small",
        type: "warning",
    }));
    const __VLS_18 = __VLS_17({
        size: "small",
        type: "warning",
    }, ...__VLS_functionalComponentArgsRest(__VLS_17));
    __VLS_19.slots.default;
    (__VLS_ctx.spot.category);
    var __VLS_19;
    if (__VLS_ctx.spot.address) {
        const __VLS_20 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
            size: "small",
            type: "primary",
        }));
        const __VLS_22 = __VLS_21({
            size: "small",
            type: "primary",
        }, ...__VLS_functionalComponentArgsRest(__VLS_21));
        __VLS_23.slots.default;
        (__VLS_ctx.spot.address);
        var __VLS_23;
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "hero-rating" },
    });
    (__VLS_ctx.spot.avgRating?.toFixed(1) || '--');
    if (__VLS_ctx.spot.ticketPrice) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "hero-price" },
        });
        (__VLS_ctx.spot.ticketPrice);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "hero-congestion" },
        ...{ class: ('hc-' + __VLS_ctx.congestionLevel.toLowerCase()) },
    });
    (__VLS_ctx.congestionLabel);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({
        ...{ class: "hero-title" },
    });
    (__VLS_ctx.spot.name);
    if (__VLS_ctx.spot.description) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "hero-description" },
        });
        (__VLS_ctx.spot.description);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "hero-meta" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "meta-item" },
    });
    (__VLS_ctx.spot.popularity || 0);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "meta-item" },
    });
    (__VLS_ctx.spot.ratingCount || 0);
    if (__VLS_ctx.spot.openingHours) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "meta-item" },
        });
        (__VLS_ctx.spot.openingHours);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "detail-section" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "rating-card glass-sm" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "rate-row" },
    });
    const __VLS_24 = {}.ElRate;
    /** @type {[typeof __VLS_components.ElRate, typeof __VLS_components.elRate, ]} */ ;
    // @ts-ignore
    const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.userRating),
        max: (5),
        size: "large",
        showScore: true,
        scoreTemplate: "{value} / 5",
    }));
    const __VLS_26 = __VLS_25({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.userRating),
        max: (5),
        size: "large",
        showScore: true,
        scoreTemplate: "{value} / 5",
    }, ...__VLS_functionalComponentArgsRest(__VLS_25));
    let __VLS_28;
    let __VLS_29;
    let __VLS_30;
    const __VLS_31 = {
        onChange: (__VLS_ctx.onRateChange)
    };
    var __VLS_27;
    if (__VLS_ctx.rated) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "rated-badge" },
        });
        (__VLS_ctx.userRating);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "detail-section" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "rating-card glass-sm" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "congestion-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "congestion-badge" },
        ...{ class: ('cong-' + __VLS_ctx.congestionLevel.toLowerCase()) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "cong-label" },
    });
    (__VLS_ctx.congestionLabel);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "congestion-report-group" },
    });
    for (const [opt] of __VLS_getVForSourceType((__VLS_ctx.congestionOptions))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.spot))
                        return;
                    __VLS_ctx.selectedCongestion = opt.value;
                } },
            key: (opt.value),
            ...{ class: "cong-btn" },
            ...{ class: ({ active: __VLS_ctx.selectedCongestion === opt.value }) },
        });
        (opt.label);
    }
    const __VLS_32 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
        ...{ 'onClick': {} },
        size: "small",
        type: "primary",
        loading: (__VLS_ctx.congLoading),
        disabled: (!__VLS_ctx.selectedCongestion),
    }));
    const __VLS_34 = __VLS_33({
        ...{ 'onClick': {} },
        size: "small",
        type: "primary",
        loading: (__VLS_ctx.congLoading),
        disabled: (!__VLS_ctx.selectedCongestion),
    }, ...__VLS_functionalComponentArgsRest(__VLS_33));
    let __VLS_36;
    let __VLS_37;
    let __VLS_38;
    const __VLS_39 = {
        onClick: (__VLS_ctx.submitCongestion)
    };
    __VLS_35.slots.default;
    var __VLS_35;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "detail-section" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "section-header" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
        ...{ class: "section-title" },
    });
    if (__VLS_ctx.facilities.length) {
        const __VLS_40 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
            ...{ 'onClick': {} },
            size: "small",
            type: "primary",
        }));
        const __VLS_42 = __VLS_41({
            ...{ 'onClick': {} },
            size: "small",
            type: "primary",
        }, ...__VLS_functionalComponentArgsRest(__VLS_41));
        let __VLS_44;
        let __VLS_45;
        let __VLS_46;
        const __VLS_47 = {
            onClick: (__VLS_ctx.openNavDialog)
        };
        __VLS_43.slots.default;
        var __VLS_43;
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        id: "spot-map-container",
        ...{ class: "spot-map" },
    });
    const __VLS_48 = {}.ElDialog;
    /** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
    // @ts-ignore
    const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
        ...{ 'onClosed': {} },
        modelValue: (__VLS_ctx.navDialogVisible),
        title: "🚶 景区内导航",
        width: "1100px",
        destroyOnClose: true,
    }));
    const __VLS_50 = __VLS_49({
        ...{ 'onClosed': {} },
        modelValue: (__VLS_ctx.navDialogVisible),
        title: "🚶 景区内导航",
        width: "1100px",
        destroyOnClose: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_49));
    let __VLS_52;
    let __VLS_53;
    let __VLS_54;
    const __VLS_55 = {
        onClosed: (__VLS_ctx.clearNav)
    };
    __VLS_51.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "nav-layout" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "nav-sidebar" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
        ...{ class: "panel-title" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "point-row" },
    });
    const __VLS_56 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_57 = __VLS_asFunctionalComponent(__VLS_56, new __VLS_56({
        type: "success",
        size: "small",
    }));
    const __VLS_58 = __VLS_57({
        type: "success",
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_57));
    __VLS_59.slots.default;
    var __VLS_59;
    if (__VLS_ctx.navStart) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "point-name" },
        });
        (__VLS_ctx.navStart.name);
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "point-name placeholder" },
        });
    }
    const __VLS_60 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_61 = __VLS_asFunctionalComponent(__VLS_60, new __VLS_60({
        ...{ 'onClick': {} },
        size: "small",
        type: (__VLS_ctx.navPickingStart ? 'danger' : 'primary'),
    }));
    const __VLS_62 = __VLS_61({
        ...{ 'onClick': {} },
        size: "small",
        type: (__VLS_ctx.navPickingStart ? 'danger' : 'primary'),
    }, ...__VLS_functionalComponentArgsRest(__VLS_61));
    let __VLS_64;
    let __VLS_65;
    let __VLS_66;
    const __VLS_67 = {
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.spot))
                return;
            __VLS_ctx.navPickingStart = !__VLS_ctx.navPickingStart;
            __VLS_ctx.navPickingWaypointIdx = null;
        }
    };
    __VLS_63.slots.default;
    (__VLS_ctx.navPickingStart ? '点击地图选起点' : '选起点');
    var __VLS_63;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "waypoints-section" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "waypoints-header" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "section-label" },
    });
    const __VLS_68 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_69 = __VLS_asFunctionalComponent(__VLS_68, new __VLS_68({
        ...{ 'onClick': {} },
        size: "small",
        type: "success",
        plain: true,
        disabled: (__VLS_ctx.navPickingStart),
    }));
    const __VLS_70 = __VLS_69({
        ...{ 'onClick': {} },
        size: "small",
        type: "success",
        plain: true,
        disabled: (__VLS_ctx.navPickingStart),
    }, ...__VLS_functionalComponentArgsRest(__VLS_69));
    let __VLS_72;
    let __VLS_73;
    let __VLS_74;
    const __VLS_75 = {
        onClick: (__VLS_ctx.addNavWaypoint)
    };
    __VLS_71.slots.default;
    var __VLS_71;
    for (const [wp, idx] of __VLS_getVForSourceType((__VLS_ctx.navWaypoints))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "waypoint-row" },
            key: (idx),
        });
        const __VLS_76 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_77 = __VLS_asFunctionalComponent(__VLS_76, new __VLS_76({
            type: (__VLS_ctx.navPickingWaypointIdx === idx ? 'warning' : 'success'),
            size: "small",
            ...{ class: "wp-num" },
        }));
        const __VLS_78 = __VLS_77({
            type: (__VLS_ctx.navPickingWaypointIdx === idx ? 'warning' : 'success'),
            size: "small",
            ...{ class: "wp-num" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_77));
        __VLS_79.slots.default;
        (idx + 1);
        var __VLS_79;
        if (idx === __VLS_ctx.navFinalDestIdx) {
            const __VLS_80 = {}.ElTag;
            /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
            // @ts-ignore
            const __VLS_81 = __VLS_asFunctionalComponent(__VLS_80, new __VLS_80({
                type: "danger",
                size: "small",
                ...{ class: "wp-final-tag" },
            }));
            const __VLS_82 = __VLS_81({
                type: "danger",
                size: "small",
                ...{ class: "wp-final-tag" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_81));
            __VLS_83.slots.default;
            var __VLS_83;
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
        const __VLS_84 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_85 = __VLS_asFunctionalComponent(__VLS_84, new __VLS_84({
            ...{ 'onClick': {} },
            size: "small",
            type: (__VLS_ctx.navPickingWaypointIdx === idx ? 'danger' : 'primary'),
            plain: true,
            disabled: (__VLS_ctx.navPickingStart),
        }));
        const __VLS_86 = __VLS_85({
            ...{ 'onClick': {} },
            size: "small",
            type: (__VLS_ctx.navPickingWaypointIdx === idx ? 'danger' : 'primary'),
            plain: true,
            disabled: (__VLS_ctx.navPickingStart),
        }, ...__VLS_functionalComponentArgsRest(__VLS_85));
        let __VLS_88;
        let __VLS_89;
        let __VLS_90;
        const __VLS_91 = {
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.spot))
                    return;
                __VLS_ctx.toggleNavWaypointPick(idx);
            }
        };
        __VLS_87.slots.default;
        var __VLS_87;
        const __VLS_92 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_93 = __VLS_asFunctionalComponent(__VLS_92, new __VLS_92({
            ...{ 'onClick': {} },
            size: "small",
            type: (idx === __VLS_ctx.navFinalDestIdx ? 'danger' : 'warning'),
            plain: true,
            disabled: (__VLS_ctx.navPickingWaypointIdx !== null || __VLS_ctx.navPickingStart || wp.lat == null),
        }));
        const __VLS_94 = __VLS_93({
            ...{ 'onClick': {} },
            size: "small",
            type: (idx === __VLS_ctx.navFinalDestIdx ? 'danger' : 'warning'),
            plain: true,
            disabled: (__VLS_ctx.navPickingWaypointIdx !== null || __VLS_ctx.navPickingStart || wp.lat == null),
        }, ...__VLS_functionalComponentArgsRest(__VLS_93));
        let __VLS_96;
        let __VLS_97;
        let __VLS_98;
        const __VLS_99 = {
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.spot))
                    return;
                __VLS_ctx.navFinalDestIdx = __VLS_ctx.navFinalDestIdx === idx ? -1 : idx;
            }
        };
        __VLS_95.slots.default;
        (idx === __VLS_ctx.navFinalDestIdx ? '终点' : '设终点');
        var __VLS_95;
        const __VLS_100 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_101 = __VLS_asFunctionalComponent(__VLS_100, new __VLS_100({
            ...{ 'onClick': {} },
            size: "small",
            type: "danger",
            plain: true,
            disabled: (__VLS_ctx.navPickingWaypointIdx !== null || __VLS_ctx.navPickingStart),
        }));
        const __VLS_102 = __VLS_101({
            ...{ 'onClick': {} },
            size: "small",
            type: "danger",
            plain: true,
            disabled: (__VLS_ctx.navPickingWaypointIdx !== null || __VLS_ctx.navPickingStart),
        }, ...__VLS_functionalComponentArgsRest(__VLS_101));
        let __VLS_104;
        let __VLS_105;
        let __VLS_106;
        const __VLS_107 = {
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.spot))
                    return;
                __VLS_ctx.removeNavWaypoint(idx);
            }
        };
        __VLS_103.slots.default;
        var __VLS_103;
    }
    if (__VLS_ctx.navWaypoints.length === 0) {
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
    const __VLS_108 = {}.ElCheckboxGroup;
    /** @type {[typeof __VLS_components.ElCheckboxGroup, typeof __VLS_components.elCheckboxGroup, typeof __VLS_components.ElCheckboxGroup, typeof __VLS_components.elCheckboxGroup, ]} */ ;
    // @ts-ignore
    const __VLS_109 = __VLS_asFunctionalComponent(__VLS_108, new __VLS_108({
        modelValue: (__VLS_ctx.navTransports),
        ...{ class: "transport-group" },
    }));
    const __VLS_110 = __VLS_109({
        modelValue: (__VLS_ctx.navTransports),
        ...{ class: "transport-group" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_109));
    __VLS_111.slots.default;
    const __VLS_112 = {}.ElCheckbox;
    /** @type {[typeof __VLS_components.ElCheckbox, typeof __VLS_components.elCheckbox, typeof __VLS_components.ElCheckbox, typeof __VLS_components.elCheckbox, ]} */ ;
    // @ts-ignore
    const __VLS_113 = __VLS_asFunctionalComponent(__VLS_112, new __VLS_112({
        label: "WALK",
    }));
    const __VLS_114 = __VLS_113({
        label: "WALK",
    }, ...__VLS_functionalComponentArgsRest(__VLS_113));
    __VLS_115.slots.default;
    var __VLS_115;
    const __VLS_116 = {}.ElCheckbox;
    /** @type {[typeof __VLS_components.ElCheckbox, typeof __VLS_components.elCheckbox, typeof __VLS_components.ElCheckbox, typeof __VLS_components.elCheckbox, ]} */ ;
    // @ts-ignore
    const __VLS_117 = __VLS_asFunctionalComponent(__VLS_116, new __VLS_116({
        label: "BIKE",
    }));
    const __VLS_118 = __VLS_117({
        label: "BIKE",
    }, ...__VLS_functionalComponentArgsRest(__VLS_117));
    __VLS_119.slots.default;
    var __VLS_119;
    const __VLS_120 = {}.ElCheckbox;
    /** @type {[typeof __VLS_components.ElCheckbox, typeof __VLS_components.elCheckbox, typeof __VLS_components.ElCheckbox, typeof __VLS_components.elCheckbox, ]} */ ;
    // @ts-ignore
    const __VLS_121 = __VLS_asFunctionalComponent(__VLS_120, new __VLS_120({
        label: "SHUTTLE",
    }));
    const __VLS_122 = __VLS_121({
        label: "SHUTTLE",
    }, ...__VLS_functionalComponentArgsRest(__VLS_121));
    __VLS_123.slots.default;
    var __VLS_123;
    var __VLS_111;
    const __VLS_124 = {}.ElRadioGroup;
    /** @type {[typeof __VLS_components.ElRadioGroup, typeof __VLS_components.elRadioGroup, typeof __VLS_components.ElRadioGroup, typeof __VLS_components.elRadioGroup, ]} */ ;
    // @ts-ignore
    const __VLS_125 = __VLS_asFunctionalComponent(__VLS_124, new __VLS_124({
        modelValue: (__VLS_ctx.navStrategy),
        ...{ class: "strategy-group" },
    }));
    const __VLS_126 = __VLS_125({
        modelValue: (__VLS_ctx.navStrategy),
        ...{ class: "strategy-group" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_125));
    __VLS_127.slots.default;
    const __VLS_128 = {}.ElRadio;
    /** @type {[typeof __VLS_components.ElRadio, typeof __VLS_components.elRadio, typeof __VLS_components.ElRadio, typeof __VLS_components.elRadio, ]} */ ;
    // @ts-ignore
    const __VLS_129 = __VLS_asFunctionalComponent(__VLS_128, new __VLS_128({
        label: "DISTANCE",
    }));
    const __VLS_130 = __VLS_129({
        label: "DISTANCE",
    }, ...__VLS_functionalComponentArgsRest(__VLS_129));
    __VLS_131.slots.default;
    var __VLS_131;
    const __VLS_132 = {}.ElRadio;
    /** @type {[typeof __VLS_components.ElRadio, typeof __VLS_components.elRadio, typeof __VLS_components.ElRadio, typeof __VLS_components.elRadio, ]} */ ;
    // @ts-ignore
    const __VLS_133 = __VLS_asFunctionalComponent(__VLS_132, new __VLS_132({
        label: "TIME",
    }));
    const __VLS_134 = __VLS_133({
        label: "TIME",
    }, ...__VLS_functionalComponentArgsRest(__VLS_133));
    __VLS_135.slots.default;
    var __VLS_135;
    var __VLS_127;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "poi-search-section" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "section-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "poi-search-row" },
    });
    const __VLS_136 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_137 = __VLS_asFunctionalComponent(__VLS_136, new __VLS_136({
        ...{ 'onKeyup': {} },
        modelValue: (__VLS_ctx.navPoiKeyword),
        placeholder: "输入景点/地名...",
        size: "small",
        clearable: true,
    }));
    const __VLS_138 = __VLS_137({
        ...{ 'onKeyup': {} },
        modelValue: (__VLS_ctx.navPoiKeyword),
        placeholder: "输入景点/地名...",
        size: "small",
        clearable: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_137));
    let __VLS_140;
    let __VLS_141;
    let __VLS_142;
    const __VLS_143 = {
        onKeyup: (__VLS_ctx.searchNavPOI)
    };
    var __VLS_139;
    const __VLS_144 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_145 = __VLS_asFunctionalComponent(__VLS_144, new __VLS_144({
        ...{ 'onClick': {} },
        size: "small",
        type: "primary",
    }));
    const __VLS_146 = __VLS_145({
        ...{ 'onClick': {} },
        size: "small",
        type: "primary",
    }, ...__VLS_functionalComponentArgsRest(__VLS_145));
    let __VLS_148;
    let __VLS_149;
    let __VLS_150;
    const __VLS_151 = {
        onClick: (__VLS_ctx.searchNavPOI)
    };
    __VLS_147.slots.default;
    var __VLS_147;
    if (__VLS_ctx.navPoiResults.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "poi-results" },
        });
        for (const [poi, idx] of __VLS_getVForSourceType((__VLS_ctx.navPoiResults))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.spot))
                            return;
                        if (!(__VLS_ctx.navPoiResults.length))
                            return;
                        __VLS_ctx.selectNavPOI(poi);
                    } },
                key: (idx),
                ...{ class: "poi-result-item" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "poi-name" },
            });
            (poi.name);
            const __VLS_152 = {}.ElButton;
            /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
            // @ts-ignore
            const __VLS_153 = __VLS_asFunctionalComponent(__VLS_152, new __VLS_152({
                ...{ 'onClick': {} },
                size: "small",
                type: "success",
                plain: true,
            }));
            const __VLS_154 = __VLS_153({
                ...{ 'onClick': {} },
                size: "small",
                type: "success",
                plain: true,
            }, ...__VLS_functionalComponentArgsRest(__VLS_153));
            let __VLS_156;
            let __VLS_157;
            let __VLS_158;
            const __VLS_159 = {
                onClick: (...[$event]) => {
                    if (!(__VLS_ctx.spot))
                        return;
                    if (!(__VLS_ctx.navPoiResults.length))
                        return;
                    __VLS_ctx.setNavStart(poi);
                }
            };
            __VLS_155.slots.default;
            var __VLS_155;
            const __VLS_160 = {}.ElButton;
            /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
            // @ts-ignore
            const __VLS_161 = __VLS_asFunctionalComponent(__VLS_160, new __VLS_160({
                ...{ 'onClick': {} },
                size: "small",
                type: "primary",
                plain: true,
            }));
            const __VLS_162 = __VLS_161({
                ...{ 'onClick': {} },
                size: "small",
                type: "primary",
                plain: true,
            }, ...__VLS_functionalComponentArgsRest(__VLS_161));
            let __VLS_164;
            let __VLS_165;
            let __VLS_166;
            const __VLS_167 = {
                onClick: (...[$event]) => {
                    if (!(__VLS_ctx.spot))
                        return;
                    if (!(__VLS_ctx.navPoiResults.length))
                        return;
                    __VLS_ctx.setNavTarget(poi);
                }
            };
            __VLS_163.slots.default;
            var __VLS_163;
        }
    }
    const __VLS_168 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_169 = __VLS_asFunctionalComponent(__VLS_168, new __VLS_168({
        ...{ 'onClick': {} },
        type: "primary",
        ...{ class: "plan-btn" },
        loading: (__VLS_ctx.navPlanning),
        disabled: (!__VLS_ctx.navStart || __VLS_ctx.navWaypoints.length === 0),
    }));
    const __VLS_170 = __VLS_169({
        ...{ 'onClick': {} },
        type: "primary",
        ...{ class: "plan-btn" },
        loading: (__VLS_ctx.navPlanning),
        disabled: (!__VLS_ctx.navStart || __VLS_ctx.navWaypoints.length === 0),
    }, ...__VLS_functionalComponentArgsRest(__VLS_169));
    let __VLS_172;
    let __VLS_173;
    let __VLS_174;
    const __VLS_175 = {
        onClick: (__VLS_ctx.planNavRoute)
    };
    __VLS_171.slots.default;
    var __VLS_171;
    if (__VLS_ctx.navRouteResult) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "route-result" },
        });
        const __VLS_176 = {}.ElDivider;
        /** @type {[typeof __VLS_components.ElDivider, typeof __VLS_components.elDivider, ]} */ ;
        // @ts-ignore
        const __VLS_177 = __VLS_asFunctionalComponent(__VLS_176, new __VLS_176({}));
        const __VLS_178 = __VLS_177({}, ...__VLS_functionalComponentArgsRest(__VLS_177));
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
        ((__VLS_ctx.navRouteResult.totalDistance / 1000).toFixed(2));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "stat-item" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "stat-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "stat-value" },
        });
        (__VLS_ctx.formatNavTime(__VLS_ctx.navRouteResult.totalTime));
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
        (__VLS_ctx.navStart?.name || '起点');
        for (const [wp, i] of __VLS_getVForSourceType((__VLS_ctx.navWaypoints))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                key: (i),
            });
            (wp.name || '点' + (i + 1));
        }
        const __VLS_180 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_181 = __VLS_asFunctionalComponent(__VLS_180, new __VLS_180({
            ...{ 'onClick': {} },
        }));
        const __VLS_182 = __VLS_181({
            ...{ 'onClick': {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_181));
        let __VLS_184;
        let __VLS_185;
        let __VLS_186;
        const __VLS_187 = {
            onClick: (__VLS_ctx.clearNavRoute)
        };
        __VLS_183.slots.default;
        var __VLS_183;
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "nav-map-area" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        id: "nav-map-container",
        ...{ class: "nav-map" },
    });
    if (__VLS_ctx.navPickingStart) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "mode-hint" },
        });
        const __VLS_188 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_189 = __VLS_asFunctionalComponent(__VLS_188, new __VLS_188({
            ...{ 'onClick': {} },
            size: "small",
        }));
        const __VLS_190 = __VLS_189({
            ...{ 'onClick': {} },
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_189));
        let __VLS_192;
        let __VLS_193;
        let __VLS_194;
        const __VLS_195 = {
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.spot))
                    return;
                if (!(__VLS_ctx.navPickingStart))
                    return;
                __VLS_ctx.navPickingStart = false;
            }
        };
        __VLS_191.slots.default;
        var __VLS_191;
    }
    if (__VLS_ctx.navPickingWaypointIdx !== null) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "mode-hint" },
        });
        (__VLS_ctx.navPickingWaypointIdx + 1);
        const __VLS_196 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_197 = __VLS_asFunctionalComponent(__VLS_196, new __VLS_196({
            ...{ 'onClick': {} },
            size: "small",
        }));
        const __VLS_198 = __VLS_197({
            ...{ 'onClick': {} },
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_197));
        let __VLS_200;
        let __VLS_201;
        let __VLS_202;
        const __VLS_203 = {
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.spot))
                    return;
                if (!(__VLS_ctx.navPickingWaypointIdx !== null))
                    return;
                __VLS_ctx.navPickingWaypointIdx = null;
            }
        };
        __VLS_199.slots.default;
        var __VLS_199;
    }
    var __VLS_51;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "detail-section" },
    });
    const __VLS_204 = {}.ElDescriptions;
    /** @type {[typeof __VLS_components.ElDescriptions, typeof __VLS_components.elDescriptions, typeof __VLS_components.ElDescriptions, typeof __VLS_components.elDescriptions, ]} */ ;
    // @ts-ignore
    const __VLS_205 = __VLS_asFunctionalComponent(__VLS_204, new __VLS_204({
        column: (2),
        border: true,
        size: "large",
        title: "景点详情",
    }));
    const __VLS_206 = __VLS_205({
        column: (2),
        border: true,
        size: "large",
        title: "景点详情",
    }, ...__VLS_functionalComponentArgsRest(__VLS_205));
    __VLS_207.slots.default;
    const __VLS_208 = {}.ElDescriptionsItem;
    /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
    // @ts-ignore
    const __VLS_209 = __VLS_asFunctionalComponent(__VLS_208, new __VLS_208({
        label: "名称",
    }));
    const __VLS_210 = __VLS_209({
        label: "名称",
    }, ...__VLS_functionalComponentArgsRest(__VLS_209));
    __VLS_211.slots.default;
    (__VLS_ctx.spot.name);
    var __VLS_211;
    const __VLS_212 = {}.ElDescriptionsItem;
    /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
    // @ts-ignore
    const __VLS_213 = __VLS_asFunctionalComponent(__VLS_212, new __VLS_212({
        label: "类别",
    }));
    const __VLS_214 = __VLS_213({
        label: "类别",
    }, ...__VLS_functionalComponentArgsRest(__VLS_213));
    __VLS_215.slots.default;
    const __VLS_216 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_217 = __VLS_asFunctionalComponent(__VLS_216, new __VLS_216({
        size: "small",
    }));
    const __VLS_218 = __VLS_217({
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_217));
    __VLS_219.slots.default;
    (__VLS_ctx.spot.category);
    var __VLS_219;
    var __VLS_215;
    const __VLS_220 = {}.ElDescriptionsItem;
    /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
    // @ts-ignore
    const __VLS_221 = __VLS_asFunctionalComponent(__VLS_220, new __VLS_220({
        label: "评分",
    }));
    const __VLS_222 = __VLS_221({
        label: "评分",
    }, ...__VLS_functionalComponentArgsRest(__VLS_221));
    __VLS_223.slots.default;
    (__VLS_ctx.spot.avgRating?.toFixed(1));
    var __VLS_223;
    const __VLS_224 = {}.ElDescriptionsItem;
    /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
    // @ts-ignore
    const __VLS_225 = __VLS_asFunctionalComponent(__VLS_224, new __VLS_224({
        label: "热度",
    }));
    const __VLS_226 = __VLS_225({
        label: "热度",
    }, ...__VLS_functionalComponentArgsRest(__VLS_225));
    __VLS_227.slots.default;
    (__VLS_ctx.spot.popularity || 0);
    var __VLS_227;
    if (__VLS_ctx.spot.address) {
        const __VLS_228 = {}.ElDescriptionsItem;
        /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
        // @ts-ignore
        const __VLS_229 = __VLS_asFunctionalComponent(__VLS_228, new __VLS_228({
            label: "地址",
            span: (2),
        }));
        const __VLS_230 = __VLS_229({
            label: "地址",
            span: (2),
        }, ...__VLS_functionalComponentArgsRest(__VLS_229));
        __VLS_231.slots.default;
        (__VLS_ctx.spot.address);
        var __VLS_231;
    }
    if (__VLS_ctx.spot.openingHours) {
        const __VLS_232 = {}.ElDescriptionsItem;
        /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
        // @ts-ignore
        const __VLS_233 = __VLS_asFunctionalComponent(__VLS_232, new __VLS_232({
            label: "营业时间",
        }));
        const __VLS_234 = __VLS_233({
            label: "营业时间",
        }, ...__VLS_functionalComponentArgsRest(__VLS_233));
        __VLS_235.slots.default;
        (__VLS_ctx.spot.openingHours);
        var __VLS_235;
    }
    if (__VLS_ctx.spot.ticketPrice) {
        const __VLS_236 = {}.ElDescriptionsItem;
        /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
        // @ts-ignore
        const __VLS_237 = __VLS_asFunctionalComponent(__VLS_236, new __VLS_236({
            label: "门票",
        }));
        const __VLS_238 = __VLS_237({
            label: "门票",
        }, ...__VLS_functionalComponentArgsRest(__VLS_237));
        __VLS_239.slots.default;
        (__VLS_ctx.spot.ticketPrice);
        var __VLS_239;
    }
    if (__VLS_ctx.spot.description) {
        const __VLS_240 = {}.ElDescriptionsItem;
        /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
        // @ts-ignore
        const __VLS_241 = __VLS_asFunctionalComponent(__VLS_240, new __VLS_240({
            label: "描述",
            span: (2),
        }));
        const __VLS_242 = __VLS_241({
            label: "描述",
            span: (2),
        }, ...__VLS_functionalComponentArgsRest(__VLS_241));
        __VLS_243.slots.default;
        (__VLS_ctx.spot.description);
        var __VLS_243;
    }
    var __VLS_207;
    if (__VLS_ctx.facilities.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
            ...{ class: "detail-section" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
            ...{ class: "section-title" },
        });
        for (const [group, cat] of __VLS_getVForSourceType((__VLS_ctx.groupedFacilities))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                key: (cat),
                ...{ class: "facility-group" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({
                ...{ class: "fac-group-title" },
            });
            (group.label);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "facility-grid" },
            });
            for (const [f] of __VLS_getVForSourceType((group.items))) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ onClick: (...[$event]) => {
                            if (!(__VLS_ctx.spot))
                                return;
                            if (!(__VLS_ctx.facilities.length))
                                return;
                            __VLS_ctx.highlightFacility(f);
                        } },
                    key: (f.id),
                    ...{ class: "facility-tag clickable" },
                    ...{ class: ('fac-' + (f.category || '').toLowerCase()) },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "fac-icon" },
                });
                (__VLS_ctx.facilityIcon(f.category));
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "fac-name" },
                });
                (f.name);
            }
        }
    }
    if (__VLS_ctx.walkingFoods.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
            ...{ class: "detail-section" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
            ...{ class: "section-title" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "walking-food-list" },
        });
        for (const [f] of __VLS_getVForSourceType((__VLS_ctx.walkingFoods))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.spot))
                            return;
                        if (!(__VLS_ctx.walkingFoods.length))
                            return;
                        __VLS_ctx.$router.push('/foods/' + f.id);
                    } },
                key: (f.id),
                ...{ class: "walking-food-card" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "wfc-top" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({
                ...{ class: "wfc-name" },
            });
            (f.name);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "wfc-rating" },
            });
            (f.avgRating?.toFixed(1) || '--');
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "wfc-meta" },
            });
            if (f.cuisine) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "wfc-cuisine" },
                });
                (f.cuisine);
            }
            if (f.restaurantName) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "wfc-restaurant" },
                });
                (f.restaurantName);
            }
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "wfc-distance" },
            });
            (__VLS_ctx.walkingDistance(f));
        }
    }
    if (__VLS_ctx.featuredSpots.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
            ...{ class: "detail-section" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
            ...{ class: "section-title" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "nearby-spots-grid" },
        });
        for (const [s] of __VLS_getVForSourceType((__VLS_ctx.featuredSpots))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.spot))
                            return;
                        if (!(__VLS_ctx.featuredSpots.length))
                            return;
                        __VLS_ctx.$router.push('/spots/' + s.id);
                    } },
                key: (s.id),
                ...{ class: "nearby-spot-card" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "ns-info" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (s.name);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (s.category);
            (s.avgRating?.toFixed(1));
        }
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "detail-section" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
        ...{ class: "section-title" },
    });
    if (!__VLS_ctx.reviews.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "empty-hint" },
        });
    }
    for (const [r] of __VLS_getVForSourceType((__VLS_ctx.reviews))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (r.id),
            ...{ class: "review-card" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "review-header" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (r.userId);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (r.rating);
        if (r.content) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
            (r.content);
        }
    }
}
var __VLS_2;
/** @type {__VLS_StyleScopedClasses['spot-detail']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-bg']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-bg-overlay']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-content']} */ ;
/** @type {__VLS_StyleScopedClasses['hero']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-overlay']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-content']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-badges']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-rating']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-price']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-congestion']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-title']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-description']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['meta-item']} */ ;
/** @type {__VLS_StyleScopedClasses['meta-item']} */ ;
/** @type {__VLS_StyleScopedClasses['meta-item']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-section']} */ ;
/** @type {__VLS_StyleScopedClasses['rating-card']} */ ;
/** @type {__VLS_StyleScopedClasses['glass-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['rate-row']} */ ;
/** @type {__VLS_StyleScopedClasses['rated-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-section']} */ ;
/** @type {__VLS_StyleScopedClasses['rating-card']} */ ;
/** @type {__VLS_StyleScopedClasses['glass-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['congestion-row']} */ ;
/** @type {__VLS_StyleScopedClasses['congestion-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['cong-label']} */ ;
/** @type {__VLS_StyleScopedClasses['congestion-report-group']} */ ;
/** @type {__VLS_StyleScopedClasses['cong-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-section']} */ ;
/** @type {__VLS_StyleScopedClasses['section-header']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['spot-map']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-sidebar']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-title']} */ ;
/** @type {__VLS_StyleScopedClasses['point-row']} */ ;
/** @type {__VLS_StyleScopedClasses['point-name']} */ ;
/** @type {__VLS_StyleScopedClasses['point-name']} */ ;
/** @type {__VLS_StyleScopedClasses['placeholder']} */ ;
/** @type {__VLS_StyleScopedClasses['waypoints-section']} */ ;
/** @type {__VLS_StyleScopedClasses['waypoints-header']} */ ;
/** @type {__VLS_StyleScopedClasses['section-label']} */ ;
/** @type {__VLS_StyleScopedClasses['waypoint-row']} */ ;
/** @type {__VLS_StyleScopedClasses['wp-num']} */ ;
/** @type {__VLS_StyleScopedClasses['wp-final-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['point-name']} */ ;
/** @type {__VLS_StyleScopedClasses['point-name']} */ ;
/** @type {__VLS_StyleScopedClasses['placeholder']} */ ;
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
/** @type {__VLS_StyleScopedClasses['nav-map-area']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-map']} */ ;
/** @type {__VLS_StyleScopedClasses['mode-hint']} */ ;
/** @type {__VLS_StyleScopedClasses['mode-hint']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-section']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-section']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['facility-group']} */ ;
/** @type {__VLS_StyleScopedClasses['fac-group-title']} */ ;
/** @type {__VLS_StyleScopedClasses['facility-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['facility-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['clickable']} */ ;
/** @type {__VLS_StyleScopedClasses['fac-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['fac-name']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-section']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['walking-food-list']} */ ;
/** @type {__VLS_StyleScopedClasses['walking-food-card']} */ ;
/** @type {__VLS_StyleScopedClasses['wfc-top']} */ ;
/** @type {__VLS_StyleScopedClasses['wfc-name']} */ ;
/** @type {__VLS_StyleScopedClasses['wfc-rating']} */ ;
/** @type {__VLS_StyleScopedClasses['wfc-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['wfc-cuisine']} */ ;
/** @type {__VLS_StyleScopedClasses['wfc-restaurant']} */ ;
/** @type {__VLS_StyleScopedClasses['wfc-distance']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-section']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['nearby-spots-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['nearby-spot-card']} */ ;
/** @type {__VLS_StyleScopedClasses['ns-info']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-section']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-hint']} */ ;
/** @type {__VLS_StyleScopedClasses['review-card']} */ ;
/** @type {__VLS_StyleScopedClasses['review-header']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            DefaultLayout: DefaultLayout,
            spot: spot,
            reviews: reviews,
            facilities: facilities,
            walkingFoods: walkingFoods,
            featuredSpots: featuredSpots,
            loading: loading,
            congestionLevel: congestionLevel,
            userRating: userRating,
            rated: rated,
            selectedCongestion: selectedCongestion,
            congLoading: congLoading,
            navDialogVisible: navDialogVisible,
            navPickingStart: navPickingStart,
            navPickingWaypointIdx: navPickingWaypointIdx,
            navFinalDestIdx: navFinalDestIdx,
            navPlanning: navPlanning,
            navStrategy: navStrategy,
            navTransports: navTransports,
            navStart: navStart,
            navWaypoints: navWaypoints,
            navRouteResult: navRouteResult,
            navPoiKeyword: navPoiKeyword,
            navPoiResults: navPoiResults,
            heroBg: heroBg,
            congestionOptions: congestionOptions,
            congestionLabel: congestionLabel,
            facilityIcon: facilityIcon,
            groupedFacilities: groupedFacilities,
            walkingDistance: walkingDistance,
            highlightFacility: highlightFacility,
            openNavDialog: openNavDialog,
            clearNav: clearNav,
            addNavWaypoint: addNavWaypoint,
            removeNavWaypoint: removeNavWaypoint,
            toggleNavWaypointPick: toggleNavWaypointPick,
            searchNavPOI: searchNavPOI,
            selectNavPOI: selectNavPOI,
            setNavStart: setNavStart,
            setNavTarget: setNavTarget,
            planNavRoute: planNavRoute,
            clearNavRoute: clearNavRoute,
            formatNavTime: formatNavTime,
            onRateChange: onRateChange,
            submitCongestion: submitCongestion,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
