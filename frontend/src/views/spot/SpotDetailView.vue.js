/// <reference types="../../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import DefaultLayout from '@/layouts/DefaultLayout.vue';
import { spotApi } from '@/api/spotApi';
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
const loading = ref(true);
const congestionLevel = ref('EMPTY');
const congJustReported = ref(false);
const userRating = ref(Number(localStorage.getItem('spotRating_' + route.params.id)) || 0);
const rated = ref(userRating.value > 0);
const rateLoading = ref(false);
const selectedCongestion = ref('');
const congLoading = ref(false);
let mapInstance = null;
const colors = ['#ffdd00', '#ff69b4', '#00bfff', '#00e676', '#ff9100'];
const heroColor = computed(() => colors[(spot.value?.id || 0) % colors.length]);
const heroBg = computed(() => {
    const img = spot.value?.imageUrl;
    if (img)
        return `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url(${img}) center/cover no-repeat`;
    return heroColor.value;
});
const congestionOptions = [
    { value: 'OVERFLOWING', label: '爆满' },
    { value: 'CROWDED', label: '拥挤' },
    { value: 'MODERATE', label: '挺多' },
    { value: 'SPARSE', label: '挺少' },
    { value: 'EMPTY', label: '基本没人' }
];
const congestionLabel = computed(() => {
    const m = {
        OVERFLOWING: '爆满', CROWDED: '拥挤', MODERATE: '挺多', SPARSE: '挺少', EMPTY: '基本没人'
    };
    return m[congestionLevel.value] || congestionLevel.value;
});
const congestionIcon = computed(() => {
    const m = {
        OVERFLOWING: '🔴', CROWDED: '🟠', MODERATE: '🟡', SPARSE: '🟢', EMPTY: '🔵'
    };
    return m[congestionLevel.value] || '⚪';
});
function facilityIcon(category) {
    const icons = {
        TOILET: '🚻', PARKING: '🅿️', SERVICE: '🔧', SHOP: '🏪',
        CAFE: '☕', HOSPITAL: '🏥', AED: '❤️', ATM: '🏧', INFO: 'ℹ️', RESTAURANT: '🍽️'
    };
    return icons[category] || '📍';
}
const categoryLabels = {
    TOILET: '🚻 Toilets', PARKING: '🅿️ Parking', SERVICE: '🔧 Service', SHOP: '🏪 Shops',
    CAFE: '☕ Cafes', HOSPITAL: '🏥 Medical', AED: '❤️ AED', ATM: '🏧 ATMs', INFO: 'ℹ️ Info',
    RESTAURANT: '🍽️ Restaurants'
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
function initMap(lat, lng) {
    const container = document.getElementById('spot-map-container');
    if (!container)
        return;
    // Wait for AMap SDK
    const tryInit = () => {
        if (!window.AMap) {
            setTimeout(tryInit, 500);
            return;
        }
        const AMap = window.AMap;
        mapInstance = new AMap.Map(container, {
            zoom: 15, center: [lng, lat], resizeEnable: true
        });
        new AMap.Marker({ position: [lng, lat], map: mapInstance });
    };
    tryInit();
}
async function onRateChange(rating) {
    if (rating < 1 || !spot.value) {
        userRating.value = 0;
        return;
    }
    if (!authStore.isAuthenticated) {
        ElMessage.warning('Please log in to rate spots');
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
            ElMessage.success('Rating submitted!');
        }
    }
    catch (e) {
        console.error('Rate error:', e);
        if (e?.response?.status === 401) {
            ElMessage.error('Session expired — please log in again');
            authStore.logout();
            router.push('/login?redirect=' + route.path);
        }
        else {
            ElMessage.error('Failed to submit rating: ' + (e?.response?.data?.message || e?.message || 'unknown error'));
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
        ElMessage.warning('Please log in to report congestion');
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
            ElMessage.success('Congestion reported!');
        }
    }
    catch (e) {
        console.error('Congestion error:', e);
        if (e?.response?.status === 401) {
            ElMessage.error('Session expired — please log in again');
            authStore.logout();
            router.push('/login?redirect=' + route.path);
        }
        else {
            ElMessage.error('Failed to report congestion: ' + (e?.response?.data?.message || e?.message || 'server error'));
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
        // Wait a tick for DOM to render before init map
        nextTick(() => initMap(spot.value.latitude, spot.value.longitude));
        // Fetch nearby foods by walking distance
        try {
            const nearby = await apiClient.get('/spots/' + id + '/foods/nearby', { params: { maxDistance: 2000 } });
            if (nearby.data.data)
                walkingFoods.value = nearby.data.data;
        }
        catch { /* okay */ }
    }
});
onBeforeUnmount(() => {
    if (mapInstance) {
        mapInstance.destroy();
        mapInstance = null;
    }
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['error-state']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-hero']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-item']} */ ;
/** @type {__VLS_StyleScopedClasses['cong-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['cong-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['content-card']} */ ;
/** @type {__VLS_StyleScopedClasses['content-card']} */ ;
/** @type {__VLS_StyleScopedClasses['rating-card']} */ ;
/** @type {__VLS_StyleScopedClasses['rate-row']} */ ;
/** @type {__VLS_StyleScopedClasses['rate-row']} */ ;
/** @type {__VLS_StyleScopedClasses['rate-row']} */ ;
/** @type {__VLS_StyleScopedClasses['rate-row']} */ ;
/** @type {__VLS_StyleScopedClasses['el-rate__item']} */ ;
/** @type {__VLS_StyleScopedClasses['walking-food-card']} */ ;
/** @type {__VLS_StyleScopedClasses['facility-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['facility-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['clickable']} */ ;
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
    ...{ class: "detail-page" },
});
__VLS_asFunctionalDirective(__VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.loading) }, null, null);
if (!__VLS_ctx.loading && !__VLS_ctx.spot) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "error-state" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    const __VLS_4 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
        ...{ 'onClick': {} },
        type: "primary",
    }));
    const __VLS_6 = __VLS_5({
        ...{ 'onClick': {} },
        type: "primary",
    }, ...__VLS_functionalComponentArgsRest(__VLS_5));
    let __VLS_8;
    let __VLS_9;
    let __VLS_10;
    const __VLS_11 = {
        onClick: (...[$event]) => {
            if (!(!__VLS_ctx.loading && !__VLS_ctx.spot))
                return;
            __VLS_ctx.$router.push('/spots');
        }
    };
    __VLS_7.slots.default;
    var __VLS_7;
}
if (__VLS_ctx.spot) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "detail-hero" },
        ...{ style: ({ background: __VLS_ctx.heroBg }) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "hero-overlay" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "hero-content" },
    });
    const __VLS_12 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
        ...{ 'onClick': {} },
        ...{ class: "back-btn" },
        text: true,
    }));
    const __VLS_14 = __VLS_13({
        ...{ 'onClick': {} },
        ...{ class: "back-btn" },
        text: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_13));
    let __VLS_16;
    let __VLS_17;
    let __VLS_18;
    const __VLS_19 = {
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.spot))
                return;
            __VLS_ctx.$router.push('/spots');
        }
    };
    __VLS_15.slots.default;
    var __VLS_15;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({});
    (__VLS_ctx.spot.name);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "hero-tags" },
    });
    const __VLS_20 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
        size: "small",
        type: "warning",
    }));
    const __VLS_22 = __VLS_21({
        size: "small",
        type: "warning",
    }, ...__VLS_functionalComponentArgsRest(__VLS_21));
    __VLS_23.slots.default;
    (__VLS_ctx.spot.category);
    var __VLS_23;
    if (__VLS_ctx.spot.address) {
        const __VLS_24 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
            size: "small",
            type: "primary",
        }));
        const __VLS_26 = __VLS_25({
            size: "small",
            type: "primary",
        }, ...__VLS_functionalComponentArgsRest(__VLS_25));
        __VLS_27.slots.default;
        (__VLS_ctx.spot.address);
        var __VLS_27;
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "stats-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "stat-item" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "stat-num" },
    });
    (__VLS_ctx.spot.avgRating?.toFixed(1) || '—');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "stat-item" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "stat-num" },
    });
    (__VLS_ctx.spot.popularity || 0);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "stat-item" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "stat-num" },
    });
    (__VLS_ctx.spot.ratingCount || 0);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    if (__VLS_ctx.spot.ticketPrice) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "stat-item" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "stat-num" },
        });
        (__VLS_ctx.spot.ticketPrice);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "content-section" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "congestion-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "congestion-badge" },
        ...{ class: (['cong-' + __VLS_ctx.congestionLevel.toLowerCase(), { 'cong-pulse': __VLS_ctx.congJustReported }]) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "cong-icon" },
    });
    (__VLS_ctx.congestionIcon);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "cong-label" },
    });
    (__VLS_ctx.congestionLabel);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "congestion-report-group" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "cong-report-hint" },
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
    const __VLS_28 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({
        ...{ 'onClick': {} },
        size: "small",
        type: "primary",
        loading: (__VLS_ctx.congLoading),
        disabled: (!__VLS_ctx.selectedCongestion),
    }));
    const __VLS_30 = __VLS_29({
        ...{ 'onClick': {} },
        size: "small",
        type: "primary",
        loading: (__VLS_ctx.congLoading),
        disabled: (!__VLS_ctx.selectedCongestion),
    }, ...__VLS_functionalComponentArgsRest(__VLS_29));
    let __VLS_32;
    let __VLS_33;
    let __VLS_34;
    const __VLS_35 = {
        onClick: (__VLS_ctx.submitCongestion)
    };
    __VLS_31.slots.default;
    var __VLS_31;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "content-section" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "content-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    (__VLS_ctx.spot.description || 'No description available.');
    if (__VLS_ctx.spot.openingHours) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "info-line" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.spot.openingHours);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "content-section" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
        ...{ class: "section-title" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        id: "spot-map-container",
        ...{ class: "spot-map" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "content-section" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "rating-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "rate-row" },
    });
    const __VLS_36 = {}.ElRate;
    /** @type {[typeof __VLS_components.ElRate, typeof __VLS_components.elRate, ]} */ ;
    // @ts-ignore
    const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.userRating),
        max: (5),
        disabled: (__VLS_ctx.rated),
        size: "large",
        showScore: true,
        scoreTemplate: "{value} / 5",
    }));
    const __VLS_38 = __VLS_37({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.userRating),
        max: (5),
        disabled: (__VLS_ctx.rated),
        size: "large",
        showScore: true,
        scoreTemplate: "{value} / 5",
    }, ...__VLS_functionalComponentArgsRest(__VLS_37));
    let __VLS_40;
    let __VLS_41;
    let __VLS_42;
    const __VLS_43 = {
        onChange: (__VLS_ctx.onRateChange)
    };
    var __VLS_39;
    if (__VLS_ctx.rated) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "rated-badge" },
        });
        (__VLS_ctx.userRating);
    }
    if (__VLS_ctx.facilities.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "content-section" },
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
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "content-section" },
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
            (f.avgRating?.toFixed(1) || '—');
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
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "content-section" },
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
/** @type {__VLS_StyleScopedClasses['detail-page']} */ ;
/** @type {__VLS_StyleScopedClasses['error-state']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-hero']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-overlay']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-content']} */ ;
/** @type {__VLS_StyleScopedClasses['back-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-tags']} */ ;
/** @type {__VLS_StyleScopedClasses['stats-row']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-item']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-num']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-item']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-num']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-item']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-num']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-item']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-num']} */ ;
/** @type {__VLS_StyleScopedClasses['content-section']} */ ;
/** @type {__VLS_StyleScopedClasses['congestion-row']} */ ;
/** @type {__VLS_StyleScopedClasses['congestion-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['cong-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['cong-label']} */ ;
/** @type {__VLS_StyleScopedClasses['congestion-report-group']} */ ;
/** @type {__VLS_StyleScopedClasses['cong-report-hint']} */ ;
/** @type {__VLS_StyleScopedClasses['cong-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['content-section']} */ ;
/** @type {__VLS_StyleScopedClasses['content-card']} */ ;
/** @type {__VLS_StyleScopedClasses['info-line']} */ ;
/** @type {__VLS_StyleScopedClasses['content-section']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['spot-map']} */ ;
/** @type {__VLS_StyleScopedClasses['content-section']} */ ;
/** @type {__VLS_StyleScopedClasses['rating-card']} */ ;
/** @type {__VLS_StyleScopedClasses['rate-row']} */ ;
/** @type {__VLS_StyleScopedClasses['rated-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['content-section']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['facility-group']} */ ;
/** @type {__VLS_StyleScopedClasses['fac-group-title']} */ ;
/** @type {__VLS_StyleScopedClasses['facility-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['facility-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['clickable']} */ ;
/** @type {__VLS_StyleScopedClasses['fac-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['fac-name']} */ ;
/** @type {__VLS_StyleScopedClasses['content-section']} */ ;
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
/** @type {__VLS_StyleScopedClasses['content-section']} */ ;
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
            loading: loading,
            congestionLevel: congestionLevel,
            congJustReported: congJustReported,
            userRating: userRating,
            rated: rated,
            selectedCongestion: selectedCongestion,
            congLoading: congLoading,
            heroBg: heroBg,
            congestionOptions: congestionOptions,
            congestionLabel: congestionLabel,
            congestionIcon: congestionIcon,
            facilityIcon: facilityIcon,
            groupedFacilities: groupedFacilities,
            walkingDistance: walkingDistance,
            highlightFacility: highlightFacility,
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
