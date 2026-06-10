/// <reference types="../../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { ref, computed, onMounted } from 'vue';
import DefaultLayout from '@/layouts/DefaultLayout.vue';
import { diaryApi } from '@/api/diaryApi';
import { spotApi } from '@/api/spotApi';
const featuredSpots = ref([]);
const recentDiaries = ref([]);
const pageLoading = ref(true);
const pageError = ref('');
const stats = ref({ spots: 0, diaries: 0 });
const statItems = computed(() => [
    { value: stats.value.spots || '—', label: '景点' },
    { value: stats.value.diaries || '—', label: '游记' },
    { value: '10+', label: '用户' },
]);
const categories = [
    { name: '景点', path: '/spots', icon: '🏞️', color: '#e3f2fd' },
    { name: '美食', path: '/foods', icon: '🍜', color: '#fff3e0' },
    { name: '游记', path: '/diaries', icon: '📓', color: '#e8f5e9' },
    { name: '导航', path: '/navigation', icon: '🗺️', color: '#fce4ec' },
    { name: 'AI', path: '/ai/chat', icon: '🤖', color: '#f3e5f5' },
];
async function loadAll() {
    pageLoading.value = true;
    pageError.value = '';
    try {
        const [s, d] = await Promise.all([
            spotApi.search({ size: 8 }).catch(() => null),
            diaryApi.list({ size: 5 }).catch(() => null),
        ]);
        if (s?.data?.data?.content)
            featuredSpots.value = s.data.data.content;
        if (d?.data?.data?.content)
            recentDiaries.value = d.data.data.content;
        const sc = await spotApi.search({ size: 1 }).catch(() => null);
        if (sc?.data?.data?.totalElements != null)
            stats.value.spots = sc.data.data.totalElements;
        if (d?.data?.data?.totalElements != null)
            stats.value.diaries = d.data.data.totalElements;
    }
    catch (e) {
        pageError.value = e?.message || '加载首页数据失败';
    }
    finally {
        pageLoading.value = false;
    }
}
onMounted(loadAll);
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['hero-content']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-content']} */ ;
/** @type {__VLS_StyleScopedClasses['section-header']} */ ;
/** @type {__VLS_StyleScopedClasses['cat-card']} */ ;
/** @type {__VLS_StyleScopedClasses['hao-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-overlay']} */ ;
/** @type {__VLS_StyleScopedClasses['hao-card']} */ ;
/** @type {__VLS_StyleScopedClasses['hao-card']} */ ;
/** @type {__VLS_StyleScopedClasses['hao-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-img']} */ ;
/** @type {__VLS_StyleScopedClasses['diary-img']} */ ;
/** @type {__VLS_StyleScopedClasses['diary-body']} */ ;
/** @type {__VLS_StyleScopedClasses['diary-body']} */ ;
/** @type {__VLS_StyleScopedClasses['hero']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-content']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-content']} */ ;
/** @type {__VLS_StyleScopedClasses['diary-card']} */ ;
/** @type {__VLS_StyleScopedClasses['diary-img']} */ ;
/** @type {__VLS_StyleScopedClasses['diary-img-placeholder']} */ ;
/** @type {__VLS_StyleScopedClasses['stats-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-item']} */ ;
// CSS variable injection 
// CSS variable injection end 
/** @type {[typeof DefaultLayout, typeof DefaultLayout, ]} */ ;
// @ts-ignore
const __VLS_0 = __VLS_asFunctionalComponent(DefaultLayout, new DefaultLayout({}));
const __VLS_1 = __VLS_0({}, ...__VLS_functionalComponentArgsRest(__VLS_0));
var __VLS_3 = {};
__VLS_2.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "home-page" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "hero glass" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "hero-content" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "stats-bar" },
});
for (const [st] of __VLS_getVForSourceType((__VLS_ctx.statItems))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "stat-item glass-sm" },
        key: (st.label),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "stat-num" },
    });
    (st.value);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "stat-label" },
    });
    (st.label);
}
if (__VLS_ctx.pageLoading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "loading-msg" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "loading-spinner" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
}
else if (__VLS_ctx.pageError) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "error-msg" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "error-icon" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.pageError);
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
        onClick: (__VLS_ctx.loadAll)
    };
    __VLS_7.slots.default;
    var __VLS_7;
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "section" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "cat-grid" },
    });
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.categories))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.pageLoading))
                        return;
                    if (!!(__VLS_ctx.pageError))
                        return;
                    __VLS_ctx.$router.push(item.path);
                } },
            key: (item.name),
            ...{ class: "cat-card glass-sm" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "cat-icon" },
            ...{ style: ({ background: item.color }) },
        });
        (item.icon);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (item.name);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "section" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "section-header" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    const __VLS_12 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
        ...{ 'onClick': {} },
        text: true,
        type: "primary",
    }));
    const __VLS_14 = __VLS_13({
        ...{ 'onClick': {} },
        text: true,
        type: "primary",
    }, ...__VLS_functionalComponentArgsRest(__VLS_13));
    let __VLS_16;
    let __VLS_17;
    let __VLS_18;
    const __VLS_19 = {
        onClick: (...[$event]) => {
            if (!!(__VLS_ctx.pageLoading))
                return;
            if (!!(__VLS_ctx.pageError))
                return;
            __VLS_ctx.$router.push('/spots');
        }
    };
    __VLS_15.slots.default;
    var __VLS_15;
    if (!__VLS_ctx.featuredSpots.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "empty-inline" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "home-container" },
        });
        for (const [s] of __VLS_getVForSourceType((__VLS_ctx.featuredSpots))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ onClick: (...[$event]) => {
                        if (!!(__VLS_ctx.pageLoading))
                            return;
                        if (!!(__VLS_ctx.pageError))
                            return;
                        if (!!(!__VLS_ctx.featuredSpots.length))
                            return;
                        __VLS_ctx.$router.push('/spots/' + s.id);
                    } },
                key: (s.id),
                ...{ class: "hao-card" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "card-img" },
                ...{ style: ({ backgroundImage: s.imageUrl ? `url(${s.imageUrl})` : 'none' }) },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "card-cat-tag" },
            });
            (s.category);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "card-overlay" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
            (s.name);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
            (s.description?.substring(0, 60) || '');
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "card-bottom-bar" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
            (s.avgRating?.toFixed(1) || '—');
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
            (s.category);
        }
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "section" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "section-header" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    const __VLS_20 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
        ...{ 'onClick': {} },
        text: true,
        type: "primary",
    }));
    const __VLS_22 = __VLS_21({
        ...{ 'onClick': {} },
        text: true,
        type: "primary",
    }, ...__VLS_functionalComponentArgsRest(__VLS_21));
    let __VLS_24;
    let __VLS_25;
    let __VLS_26;
    const __VLS_27 = {
        onClick: (...[$event]) => {
            if (!!(__VLS_ctx.pageLoading))
                return;
            if (!!(__VLS_ctx.pageError))
                return;
            __VLS_ctx.$router.push('/diaries');
        }
    };
    __VLS_23.slots.default;
    var __VLS_23;
    if (!__VLS_ctx.recentDiaries.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "empty-inline" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "diary-list" },
        });
        for (const [d] of __VLS_getVForSourceType((__VLS_ctx.recentDiaries))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ onClick: (...[$event]) => {
                        if (!!(__VLS_ctx.pageLoading))
                            return;
                        if (!!(__VLS_ctx.pageError))
                            return;
                        if (!!(!__VLS_ctx.recentDiaries.length))
                            return;
                        __VLS_ctx.$router.push('/diaries/' + d.id);
                    } },
                key: (d.id),
                ...{ class: "diary-card glass-sm" },
            });
            if (d.images?.length) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "diary-img" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
                    src: (d.images[0]),
                    alt: "",
                });
            }
            else {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "diary-img-placeholder" },
                });
            }
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "diary-body" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
            (d.title);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
            ((d.content || '').substring(0, 120));
            ((d.content || '').length > 120 ? '...' : '');
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "diary-footer" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (d.avgRating?.toFixed(1) || '—');
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (d.createdAt ? d.createdAt.substring(0, 10) : '');
        }
    }
}
var __VLS_2;
/** @type {__VLS_StyleScopedClasses['home-page']} */ ;
/** @type {__VLS_StyleScopedClasses['hero']} */ ;
/** @type {__VLS_StyleScopedClasses['glass']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-content']} */ ;
/** @type {__VLS_StyleScopedClasses['stats-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-item']} */ ;
/** @type {__VLS_StyleScopedClasses['glass-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-num']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-label']} */ ;
/** @type {__VLS_StyleScopedClasses['loading-msg']} */ ;
/** @type {__VLS_StyleScopedClasses['loading-spinner']} */ ;
/** @type {__VLS_StyleScopedClasses['error-msg']} */ ;
/** @type {__VLS_StyleScopedClasses['error-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['section']} */ ;
/** @type {__VLS_StyleScopedClasses['cat-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['cat-card']} */ ;
/** @type {__VLS_StyleScopedClasses['glass-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['cat-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['section']} */ ;
/** @type {__VLS_StyleScopedClasses['section-header']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-inline']} */ ;
/** @type {__VLS_StyleScopedClasses['home-container']} */ ;
/** @type {__VLS_StyleScopedClasses['hao-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-img']} */ ;
/** @type {__VLS_StyleScopedClasses['card-cat-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['card-overlay']} */ ;
/** @type {__VLS_StyleScopedClasses['card-bottom-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['section']} */ ;
/** @type {__VLS_StyleScopedClasses['section-header']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-inline']} */ ;
/** @type {__VLS_StyleScopedClasses['diary-list']} */ ;
/** @type {__VLS_StyleScopedClasses['diary-card']} */ ;
/** @type {__VLS_StyleScopedClasses['glass-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['diary-img']} */ ;
/** @type {__VLS_StyleScopedClasses['diary-img-placeholder']} */ ;
/** @type {__VLS_StyleScopedClasses['diary-body']} */ ;
/** @type {__VLS_StyleScopedClasses['diary-footer']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            DefaultLayout: DefaultLayout,
            featuredSpots: featuredSpots,
            recentDiaries: recentDiaries,
            pageLoading: pageLoading,
            pageError: pageError,
            statItems: statItems,
            categories: categories,
            loadAll: loadAll,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
