/// <reference types="../../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Star, StarFilled, View, LocationFilled, Shop } from '@element-plus/icons-vue';
import DefaultLayout from '@/layouts/DefaultLayout.vue';
import { foodApi } from '@/api/foodApi';
import { spotApi } from '@/api/spotApi';
import { useAuthStore } from '@/stores/authStore';
import apiClient from '@/api/axios';
const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const loading = ref(true);
const foodId = computed(() => Number(route.params.id));
const food = ref(null);
const userRating = ref(Number(localStorage.getItem('foodRating_' + route.params.id)) || 0);
const rated = ref(userRating.value > 0);
const nearbySpots = ref([]);
const congestionLevel = ref('EMPTY');
const congJustReported = ref(false);
const selectedCongestion = ref('');
const congLoading = ref(false);
let mapInstance = null;
const congestionOptions = [
    { value: 'OVERFLOWING', label: '爆满' },
    { value: 'CROWDED', label: '拥挤' },
    { value: 'MODERATE', label: '适中' },
    { value: 'SPARSE', label: '较少' },
    { value: 'EMPTY', label: '空闲' },
];
const heroStyle = computed(() => {
    const img = food.value?.imageUrl;
    if (img)
        return { backgroundImage: `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.45)), url(${img})`, backgroundSize: 'cover', backgroundPosition: 'center' };
    return { background: 'linear-gradient(135deg, var(--pop-orange), var(--pop-red))' };
});
const congestionLabel = computed(() => {
    const m = {
        OVERFLOWING: '爆满', CROWDED: '拥挤', MODERATE: '适中',
        SPARSE: '较少', EMPTY: '空闲',
    };
    return m[congestionLevel.value] || congestionLevel.value;
});
function formatNumber(num) {
    if (num >= 10000)
        return (num / 10000).toFixed(1) + '万';
    if (num >= 1000)
        return (num / 1000).toFixed(1) + 'k';
    return num.toString();
}
function initMap(lat, lng) {
    const container = document.getElementById('food-map-container');
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
    if (rating < 1 || !food.value) {
        userRating.value = 0;
        return;
    }
    try {
        const res = await foodApi.rate(foodId.value, rating);
        if (res.data.data) {
            food.value.avgRating = res.data.data.avgRating;
            food.value.ratingCount = res.data.data.ratingCount;
            userRating.value = rating;
            rated.value = true;
            localStorage.setItem('foodRating_' + food.value.id, String(rating));
            ElMessage.success('评分已提交！');
        }
    }
    catch {
        ElMessage.error('评分失败');
    }
}
async function submitCongestion() {
    if (!selectedCongestion.value || !food.value)
        return;
    if (!authStore.isAuthenticated) {
        ElMessage.warning('请先登录再上报拥挤度');
        router.push('/login?redirect=' + route.path);
        return;
    }
    congLoading.value = true;
    try {
        const r = await apiClient.post('/foods/' + food.value.id + '/congestion', null, { params: { level: selectedCongestion.value } });
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
            ElMessage.error('登录已过期 — 请重新登录');
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
async function loadFood() {
    loading.value = true;
    try {
        const res = await foodApi.getById(foodId.value);
        food.value = res.data.data;
        congestionLevel.value = res.data.data?.congestionLevel || 'EMPTY';
        // Try to load nearby spots
        const spotRes = await spotApi.search({ size: 5 });
        nearbySpots.value = spotRes.data.data?.content?.slice(0, 5) || [];
    }
    catch {
        food.value = null;
    }
    finally {
        loading.value = false;
    }
}
onMounted(async () => {
    await loadFood();
    if (food.value) {
        nextTick(() => initMap(food.value.latitude, food.value.longitude));
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
/** @type {__VLS_StyleScopedClasses['hero-rating']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-section']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-section']} */ ;
/** @type {__VLS_StyleScopedClasses['rating-card']} */ ;
/** @type {__VLS_StyleScopedClasses['rate-row']} */ ;
/** @type {__VLS_StyleScopedClasses['cong-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['cong-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['nearby-spot-card']} */ ;
/** @type {__VLS_StyleScopedClasses['ns-info']} */ ;
/** @type {__VLS_StyleScopedClasses['ns-info']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-title']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-content']} */ ;
// CSS variable injection 
// CSS variable injection end 
/** @type {[typeof DefaultLayout, typeof DefaultLayout, ]} */ ;
// @ts-ignore
const __VLS_0 = __VLS_asFunctionalComponent(DefaultLayout, new DefaultLayout({}));
const __VLS_1 = __VLS_0({}, ...__VLS_functionalComponentArgsRest(__VLS_0));
var __VLS_3 = {};
__VLS_2.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "food-detail" },
    'element-loading-text': "加载中...",
});
__VLS_asFunctionalDirective(__VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.loading) }, null, null);
if (__VLS_ctx.food?.imageUrl) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
        ...{ class: "detail-bg" },
        ...{ style: ({ backgroundImage: `url(${__VLS_ctx.food.imageUrl})` }) },
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
    ...{ class: "detail-bg-overlay" },
});
if (!__VLS_ctx.loading && !__VLS_ctx.food) {
    const __VLS_4 = {}.ElResult;
    /** @type {[typeof __VLS_components.ElResult, typeof __VLS_components.elResult, typeof __VLS_components.ElResult, typeof __VLS_components.elResult, ]} */ ;
    // @ts-ignore
    const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
        icon: "error",
        title: "美食未找到",
        subTitle: "无法加载该美食信息",
    }));
    const __VLS_6 = __VLS_5({
        icon: "error",
        title: "美食未找到",
        subTitle: "无法加载该美食信息",
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
                if (!(!__VLS_ctx.loading && !__VLS_ctx.food))
                    return;
                __VLS_ctx.$router.push('/foods');
            }
        };
        __VLS_11.slots.default;
        var __VLS_11;
    }
    var __VLS_7;
}
if (__VLS_ctx.food) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "detail-content" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "hero" },
        ...{ style: (__VLS_ctx.heroStyle) },
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
    if (__VLS_ctx.food.cuisine) {
        const __VLS_16 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
            effect: "dark",
            size: "large",
            ...{ class: "cuisine-tag" },
        }));
        const __VLS_18 = __VLS_17({
            effect: "dark",
            size: "large",
            ...{ class: "cuisine-tag" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_17));
        __VLS_19.slots.default;
        (__VLS_ctx.food.cuisine);
        var __VLS_19;
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "hero-rating" },
    });
    for (const [i] of __VLS_getVForSourceType((5))) {
        const __VLS_20 = {}.ElIcon;
        /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
        // @ts-ignore
        const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
            key: (i),
            size: (18),
            ...{ class: "star-icon" },
        }));
        const __VLS_22 = __VLS_21({
            key: (i),
            size: (18),
            ...{ class: "star-icon" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_21));
        __VLS_23.slots.default;
        if (i <= Math.round(__VLS_ctx.food.avgRating)) {
            const __VLS_24 = {}.StarFilled;
            /** @type {[typeof __VLS_components.StarFilled, ]} */ ;
            // @ts-ignore
            const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({}));
            const __VLS_26 = __VLS_25({}, ...__VLS_functionalComponentArgsRest(__VLS_25));
        }
        else {
            const __VLS_28 = {}.Star;
            /** @type {[typeof __VLS_components.Star, ]} */ ;
            // @ts-ignore
            const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({}));
            const __VLS_30 = __VLS_29({}, ...__VLS_functionalComponentArgsRest(__VLS_29));
        }
        var __VLS_23;
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "rating-text" },
    });
    (__VLS_ctx.food.avgRating?.toFixed(1));
    if (__VLS_ctx.food.priceRange) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "hero-price" },
        });
        (__VLS_ctx.food.priceRange);
    }
    if (__VLS_ctx.congestionLevel) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "hero-congestion" },
            ...{ class: ('hc-' + __VLS_ctx.congestionLevel.toLowerCase()) },
        });
        (__VLS_ctx.congestionLabel);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({
        ...{ class: "hero-title" },
    });
    (__VLS_ctx.food.name);
    if (__VLS_ctx.food.restaurantName) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "hero-restaurant" },
        });
        const __VLS_32 = {}.ElIcon;
        /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
        // @ts-ignore
        const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({}));
        const __VLS_34 = __VLS_33({}, ...__VLS_functionalComponentArgsRest(__VLS_33));
        __VLS_35.slots.default;
        const __VLS_36 = {}.Shop;
        /** @type {[typeof __VLS_components.Shop, ]} */ ;
        // @ts-ignore
        const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({}));
        const __VLS_38 = __VLS_37({}, ...__VLS_functionalComponentArgsRest(__VLS_37));
        var __VLS_35;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.food.restaurantName);
    }
    if (__VLS_ctx.food.description) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "hero-description" },
        });
        (__VLS_ctx.food.description);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "hero-meta" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "meta-item" },
    });
    const __VLS_40 = {}.ElIcon;
    /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
    // @ts-ignore
    const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({}));
    const __VLS_42 = __VLS_41({}, ...__VLS_functionalComponentArgsRest(__VLS_41));
    __VLS_43.slots.default;
    const __VLS_44 = {}.View;
    /** @type {[typeof __VLS_components.View, ]} */ ;
    // @ts-ignore
    const __VLS_45 = __VLS_asFunctionalComponent(__VLS_44, new __VLS_44({}));
    const __VLS_46 = __VLS_45({}, ...__VLS_functionalComponentArgsRest(__VLS_45));
    var __VLS_43;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.formatNumber(__VLS_ctx.food.popularity));
    if (__VLS_ctx.food.latitude !== undefined && __VLS_ctx.food.longitude !== undefined) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "meta-item" },
        });
        const __VLS_48 = {}.ElIcon;
        /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
        // @ts-ignore
        const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({}));
        const __VLS_50 = __VLS_49({}, ...__VLS_functionalComponentArgsRest(__VLS_49));
        __VLS_51.slots.default;
        const __VLS_52 = {}.LocationFilled;
        /** @type {[typeof __VLS_components.LocationFilled, ]} */ ;
        // @ts-ignore
        const __VLS_53 = __VLS_asFunctionalComponent(__VLS_52, new __VLS_52({}));
        const __VLS_54 = __VLS_53({}, ...__VLS_functionalComponentArgsRest(__VLS_53));
        var __VLS_51;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.food.latitude.toFixed(4));
        (__VLS_ctx.food.longitude.toFixed(4));
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
    const __VLS_56 = {}.ElRate;
    /** @type {[typeof __VLS_components.ElRate, typeof __VLS_components.elRate, ]} */ ;
    // @ts-ignore
    const __VLS_57 = __VLS_asFunctionalComponent(__VLS_56, new __VLS_56({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.userRating),
        max: (5),
        size: "large",
        showScore: true,
        scoreTemplate: "{value} / 5",
    }));
    const __VLS_58 = __VLS_57({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.userRating),
        max: (5),
        size: "large",
        showScore: true,
        scoreTemplate: "{value} / 5",
    }, ...__VLS_functionalComponentArgsRest(__VLS_57));
    let __VLS_60;
    let __VLS_61;
    let __VLS_62;
    const __VLS_63 = {
        onChange: (__VLS_ctx.onRateChange)
    };
    var __VLS_59;
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
        ...{ class: (['cong-' + __VLS_ctx.congestionLevel.toLowerCase(), { 'cong-pulse': __VLS_ctx.congJustReported }]) },
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
                    if (!(__VLS_ctx.food))
                        return;
                    __VLS_ctx.selectedCongestion = opt.value;
                } },
            key: (opt.value),
            ...{ class: "cong-btn" },
            ...{ class: ({ active: __VLS_ctx.selectedCongestion === opt.value }) },
        });
        (opt.label);
    }
    const __VLS_64 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_65 = __VLS_asFunctionalComponent(__VLS_64, new __VLS_64({
        ...{ 'onClick': {} },
        size: "small",
        type: "primary",
        loading: (__VLS_ctx.congLoading),
        disabled: (!__VLS_ctx.selectedCongestion),
    }));
    const __VLS_66 = __VLS_65({
        ...{ 'onClick': {} },
        size: "small",
        type: "primary",
        loading: (__VLS_ctx.congLoading),
        disabled: (!__VLS_ctx.selectedCongestion),
    }, ...__VLS_functionalComponentArgsRest(__VLS_65));
    let __VLS_68;
    let __VLS_69;
    let __VLS_70;
    const __VLS_71 = {
        onClick: (__VLS_ctx.submitCongestion)
    };
    __VLS_67.slots.default;
    var __VLS_67;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "detail-section" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
        ...{ class: "section-title" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        id: "food-map-container",
        ...{ class: "food-map" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "detail-section" },
    });
    const __VLS_72 = {}.ElDescriptions;
    /** @type {[typeof __VLS_components.ElDescriptions, typeof __VLS_components.elDescriptions, typeof __VLS_components.ElDescriptions, typeof __VLS_components.elDescriptions, ]} */ ;
    // @ts-ignore
    const __VLS_73 = __VLS_asFunctionalComponent(__VLS_72, new __VLS_72({
        column: (2),
        border: true,
        size: "large",
        title: "美食详情",
    }));
    const __VLS_74 = __VLS_73({
        column: (2),
        border: true,
        size: "large",
        title: "美食详情",
    }, ...__VLS_functionalComponentArgsRest(__VLS_73));
    __VLS_75.slots.default;
    const __VLS_76 = {}.ElDescriptionsItem;
    /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
    // @ts-ignore
    const __VLS_77 = __VLS_asFunctionalComponent(__VLS_76, new __VLS_76({
        label: "名称",
    }));
    const __VLS_78 = __VLS_77({
        label: "名称",
    }, ...__VLS_functionalComponentArgsRest(__VLS_77));
    __VLS_79.slots.default;
    (__VLS_ctx.food.name);
    var __VLS_79;
    const __VLS_80 = {}.ElDescriptionsItem;
    /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
    // @ts-ignore
    const __VLS_81 = __VLS_asFunctionalComponent(__VLS_80, new __VLS_80({
        label: "菜系",
    }));
    const __VLS_82 = __VLS_81({
        label: "菜系",
    }, ...__VLS_functionalComponentArgsRest(__VLS_81));
    __VLS_83.slots.default;
    if (__VLS_ctx.food.cuisine) {
        const __VLS_84 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_85 = __VLS_asFunctionalComponent(__VLS_84, new __VLS_84({
            size: "small",
        }));
        const __VLS_86 = __VLS_85({
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_85));
        __VLS_87.slots.default;
        (__VLS_ctx.food.cuisine);
        var __VLS_87;
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    }
    var __VLS_83;
    const __VLS_88 = {}.ElDescriptionsItem;
    /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
    // @ts-ignore
    const __VLS_89 = __VLS_asFunctionalComponent(__VLS_88, new __VLS_88({
        label: "餐厅",
    }));
    const __VLS_90 = __VLS_89({
        label: "餐厅",
    }, ...__VLS_functionalComponentArgsRest(__VLS_89));
    __VLS_91.slots.default;
    (__VLS_ctx.food.restaurantName || '--');
    var __VLS_91;
    const __VLS_92 = {}.ElDescriptionsItem;
    /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
    // @ts-ignore
    const __VLS_93 = __VLS_asFunctionalComponent(__VLS_92, new __VLS_92({
        label: "价格区间",
    }));
    const __VLS_94 = __VLS_93({
        label: "价格区间",
    }, ...__VLS_functionalComponentArgsRest(__VLS_93));
    __VLS_95.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "price-text" },
    });
    (__VLS_ctx.food.priceRange || '--');
    var __VLS_95;
    const __VLS_96 = {}.ElDescriptionsItem;
    /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
    // @ts-ignore
    const __VLS_97 = __VLS_asFunctionalComponent(__VLS_96, new __VLS_96({
        label: "评分",
    }));
    const __VLS_98 = __VLS_97({
        label: "评分",
    }, ...__VLS_functionalComponentArgsRest(__VLS_97));
    __VLS_99.slots.default;
    (__VLS_ctx.food.avgRating?.toFixed(1));
    var __VLS_99;
    const __VLS_100 = {}.ElDescriptionsItem;
    /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
    // @ts-ignore
    const __VLS_101 = __VLS_asFunctionalComponent(__VLS_100, new __VLS_100({
        label: "热度",
    }));
    const __VLS_102 = __VLS_101({
        label: "热度",
    }, ...__VLS_functionalComponentArgsRest(__VLS_101));
    __VLS_103.slots.default;
    (__VLS_ctx.formatNumber(__VLS_ctx.food.popularity));
    var __VLS_103;
    if (__VLS_ctx.food.description) {
        const __VLS_104 = {}.ElDescriptionsItem;
        /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
        // @ts-ignore
        const __VLS_105 = __VLS_asFunctionalComponent(__VLS_104, new __VLS_104({
            label: "描述",
            span: (2),
        }));
        const __VLS_106 = __VLS_105({
            label: "描述",
            span: (2),
        }, ...__VLS_functionalComponentArgsRest(__VLS_105));
        __VLS_107.slots.default;
        (__VLS_ctx.food.description);
        var __VLS_107;
    }
    var __VLS_75;
    if (__VLS_ctx.nearbySpots.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
            ...{ class: "detail-section" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
            ...{ class: "section-title" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "nearby-spots-grid" },
        });
        for (const [s] of __VLS_getVForSourceType((__VLS_ctx.nearbySpots))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.food))
                            return;
                        if (!(__VLS_ctx.nearbySpots.length))
                            return;
                        __VLS_ctx.$router.push('/spots/' + s.id);
                    } },
                key: (s.id),
                ...{ class: "nearby-spot-card" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "ns-icon" },
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
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "empty-hint" },
    });
}
var __VLS_2;
/** @type {__VLS_StyleScopedClasses['food-detail']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-bg']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-bg-overlay']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-content']} */ ;
/** @type {__VLS_StyleScopedClasses['hero']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-overlay']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-content']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-badges']} */ ;
/** @type {__VLS_StyleScopedClasses['cuisine-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-rating']} */ ;
/** @type {__VLS_StyleScopedClasses['star-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['rating-text']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-price']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-congestion']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-title']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-restaurant']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-description']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-meta']} */ ;
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
/** @type {__VLS_StyleScopedClasses['food-map']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-section']} */ ;
/** @type {__VLS_StyleScopedClasses['price-text']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-section']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['nearby-spots-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['nearby-spot-card']} */ ;
/** @type {__VLS_StyleScopedClasses['ns-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['ns-info']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-section']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-hint']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            Star: Star,
            StarFilled: StarFilled,
            View: View,
            LocationFilled: LocationFilled,
            Shop: Shop,
            DefaultLayout: DefaultLayout,
            loading: loading,
            food: food,
            userRating: userRating,
            rated: rated,
            nearbySpots: nearbySpots,
            congestionLevel: congestionLevel,
            congJustReported: congJustReported,
            selectedCongestion: selectedCongestion,
            congLoading: congLoading,
            congestionOptions: congestionOptions,
            heroStyle: heroStyle,
            congestionLabel: congestionLabel,
            formatNumber: formatNumber,
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
