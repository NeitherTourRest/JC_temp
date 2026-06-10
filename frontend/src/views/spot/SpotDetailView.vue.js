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
        TOILET: '[W]', PARKING: '[P]', SERVICE: '[S]', SHOP: '[M]',
        CAFE: '[C]', HOSPITAL: '[H]', AED: '[+]', ATM: '[A]', INFO: '[i]', RESTAURANT: '[R]',
    };
    return icons[category] || '[?]';
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
function initMap(lat, lng) {
    const container = document.getElementById('spot-map-container');
    if (!container)
        return;
    const tryInit = () => {
        if (!window.AMap) {
            setTimeout(tryInit, 500);
            return;
        }
        const AMap = window.AMap;
        mapInstance = new AMap.Map(container, { zoom: 15, center: [lng, lat], resizeEnable: true });
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
        nextTick(() => initMap(spot.value.latitude, spot.value.longitude));
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
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['rating-card']} */ ;
/** @type {__VLS_StyleScopedClasses['rate-row']} */ ;
/** @type {__VLS_StyleScopedClasses['cong-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['cong-btn']} */ ;
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
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
        ...{ class: "section-title" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        id: "spot-map-container",
        ...{ class: "spot-map" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "detail-section" },
    });
    const __VLS_40 = {}.ElDescriptions;
    /** @type {[typeof __VLS_components.ElDescriptions, typeof __VLS_components.elDescriptions, typeof __VLS_components.ElDescriptions, typeof __VLS_components.elDescriptions, ]} */ ;
    // @ts-ignore
    const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
        column: (2),
        border: true,
        size: "large",
        title: "景点详情",
    }));
    const __VLS_42 = __VLS_41({
        column: (2),
        border: true,
        size: "large",
        title: "景点详情",
    }, ...__VLS_functionalComponentArgsRest(__VLS_41));
    __VLS_43.slots.default;
    const __VLS_44 = {}.ElDescriptionsItem;
    /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
    // @ts-ignore
    const __VLS_45 = __VLS_asFunctionalComponent(__VLS_44, new __VLS_44({
        label: "名称",
    }));
    const __VLS_46 = __VLS_45({
        label: "名称",
    }, ...__VLS_functionalComponentArgsRest(__VLS_45));
    __VLS_47.slots.default;
    (__VLS_ctx.spot.name);
    var __VLS_47;
    const __VLS_48 = {}.ElDescriptionsItem;
    /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
    // @ts-ignore
    const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
        label: "类别",
    }));
    const __VLS_50 = __VLS_49({
        label: "类别",
    }, ...__VLS_functionalComponentArgsRest(__VLS_49));
    __VLS_51.slots.default;
    const __VLS_52 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_53 = __VLS_asFunctionalComponent(__VLS_52, new __VLS_52({
        size: "small",
    }));
    const __VLS_54 = __VLS_53({
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_53));
    __VLS_55.slots.default;
    (__VLS_ctx.spot.category);
    var __VLS_55;
    var __VLS_51;
    const __VLS_56 = {}.ElDescriptionsItem;
    /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
    // @ts-ignore
    const __VLS_57 = __VLS_asFunctionalComponent(__VLS_56, new __VLS_56({
        label: "评分",
    }));
    const __VLS_58 = __VLS_57({
        label: "评分",
    }, ...__VLS_functionalComponentArgsRest(__VLS_57));
    __VLS_59.slots.default;
    (__VLS_ctx.spot.avgRating?.toFixed(1));
    var __VLS_59;
    const __VLS_60 = {}.ElDescriptionsItem;
    /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
    // @ts-ignore
    const __VLS_61 = __VLS_asFunctionalComponent(__VLS_60, new __VLS_60({
        label: "热度",
    }));
    const __VLS_62 = __VLS_61({
        label: "热度",
    }, ...__VLS_functionalComponentArgsRest(__VLS_61));
    __VLS_63.slots.default;
    (__VLS_ctx.spot.popularity || 0);
    var __VLS_63;
    if (__VLS_ctx.spot.address) {
        const __VLS_64 = {}.ElDescriptionsItem;
        /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
        // @ts-ignore
        const __VLS_65 = __VLS_asFunctionalComponent(__VLS_64, new __VLS_64({
            label: "地址",
            span: (2),
        }));
        const __VLS_66 = __VLS_65({
            label: "地址",
            span: (2),
        }, ...__VLS_functionalComponentArgsRest(__VLS_65));
        __VLS_67.slots.default;
        (__VLS_ctx.spot.address);
        var __VLS_67;
    }
    if (__VLS_ctx.spot.openingHours) {
        const __VLS_68 = {}.ElDescriptionsItem;
        /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
        // @ts-ignore
        const __VLS_69 = __VLS_asFunctionalComponent(__VLS_68, new __VLS_68({
            label: "营业时间",
        }));
        const __VLS_70 = __VLS_69({
            label: "营业时间",
        }, ...__VLS_functionalComponentArgsRest(__VLS_69));
        __VLS_71.slots.default;
        (__VLS_ctx.spot.openingHours);
        var __VLS_71;
    }
    if (__VLS_ctx.spot.ticketPrice) {
        const __VLS_72 = {}.ElDescriptionsItem;
        /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
        // @ts-ignore
        const __VLS_73 = __VLS_asFunctionalComponent(__VLS_72, new __VLS_72({
            label: "门票",
        }));
        const __VLS_74 = __VLS_73({
            label: "门票",
        }, ...__VLS_functionalComponentArgsRest(__VLS_73));
        __VLS_75.slots.default;
        (__VLS_ctx.spot.ticketPrice);
        var __VLS_75;
    }
    if (__VLS_ctx.spot.description) {
        const __VLS_76 = {}.ElDescriptionsItem;
        /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
        // @ts-ignore
        const __VLS_77 = __VLS_asFunctionalComponent(__VLS_76, new __VLS_76({
            label: "描述",
            span: (2),
        }));
        const __VLS_78 = __VLS_77({
            label: "描述",
            span: (2),
        }, ...__VLS_functionalComponentArgsRest(__VLS_77));
        __VLS_79.slots.default;
        (__VLS_ctx.spot.description);
        var __VLS_79;
    }
    var __VLS_43;
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
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['spot-map']} */ ;
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
            heroBg: heroBg,
            congestionOptions: congestionOptions,
            congestionLabel: congestionLabel,
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
