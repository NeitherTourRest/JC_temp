/// <reference types="../../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { ref, onMounted } from 'vue';
import DefaultLayout from '@/layouts/DefaultLayout.vue';
import { spotApi } from '@/api/spotApi';
const spots = ref([]);
const loading = ref(false);
const errorMsg = ref('');
const keyword = ref('');
const activeCat = ref('All');
const cats = ['All', '景点', '校园', '餐厅', '商场', '公园', '博物馆', '酒店', '体育场馆'];
async function fetch() {
    loading.value = true;
    errorMsg.value = '';
    try {
        const p = { size: 20 };
        if (keyword.value.trim())
            p.keyword = keyword.value.trim();
        if (activeCat.value !== 'All')
            p.category = activeCat.value;
        const r = await spotApi.search(p);
        spots.value = r.data.data?.content || [];
    }
    catch (e) {
        errorMsg.value = e?.message || '加载景点失败，请重试。';
        spots.value = [];
    }
    finally {
        loading.value = false;
    }
}
function search() { errorMsg.value = ''; fetch(); }
function filterCat(c) { activeCat.value = c; errorMsg.value = ''; fetch(); }
onMounted(fetch);
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['cat-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['cat-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['loading-msg']} */ ;
/** @type {__VLS_StyleScopedClasses['spot-cover-content']} */ ;
/** @type {__VLS_StyleScopedClasses['spots-grid']} */ ;
// CSS variable injection 
// CSS variable injection end 
/** @type {[typeof DefaultLayout, typeof DefaultLayout, ]} */ ;
// @ts-ignore
const __VLS_0 = __VLS_asFunctionalComponent(DefaultLayout, new DefaultLayout({}));
const __VLS_1 = __VLS_0({}, ...__VLS_functionalComponentArgsRest(__VLS_0));
var __VLS_3 = {};
__VLS_2.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "spots-page" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "toolbar glass-sm" },
});
const __VLS_4 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
    ...{ 'onKeyup': {} },
    ...{ 'onClear': {} },
    modelValue: (__VLS_ctx.keyword),
    placeholder: "搜索景点名称、地址、描述…",
    prefixIcon: "Search",
    clearable: true,
    ...{ class: "search-bar" },
}));
const __VLS_6 = __VLS_5({
    ...{ 'onKeyup': {} },
    ...{ 'onClear': {} },
    modelValue: (__VLS_ctx.keyword),
    placeholder: "搜索景点名称、地址、描述…",
    prefixIcon: "Search",
    clearable: true,
    ...{ class: "search-bar" },
}, ...__VLS_functionalComponentArgsRest(__VLS_5));
let __VLS_8;
let __VLS_9;
let __VLS_10;
const __VLS_11 = {
    onKeyup: (__VLS_ctx.search)
};
const __VLS_12 = {
    onClear: (__VLS_ctx.fetch)
};
var __VLS_7;
const __VLS_13 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_14 = __VLS_asFunctionalComponent(__VLS_13, new __VLS_13({
    ...{ 'onClick': {} },
    size: "small",
    type: "primary",
}));
const __VLS_15 = __VLS_14({
    ...{ 'onClick': {} },
    size: "small",
    type: "primary",
}, ...__VLS_functionalComponentArgsRest(__VLS_14));
let __VLS_17;
let __VLS_18;
let __VLS_19;
const __VLS_20 = {
    onClick: (__VLS_ctx.search)
};
__VLS_16.slots.default;
var __VLS_16;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "cat-filters" },
});
for (const [c] of __VLS_getVForSourceType((__VLS_ctx.cats))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.filterCat(c);
            } },
        key: (c),
        ...{ class: (['cat-btn', { active: __VLS_ctx.activeCat === c }]) },
    });
    (c);
}
if (__VLS_ctx.loading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "loading-msg" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "loading-spinner" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
}
else if (__VLS_ctx.errorMsg) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "error-msg" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "error-icon" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.errorMsg);
    const __VLS_21 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_22 = __VLS_asFunctionalComponent(__VLS_21, new __VLS_21({
        ...{ 'onClick': {} },
        size: "small",
    }));
    const __VLS_23 = __VLS_22({
        ...{ 'onClick': {} },
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_22));
    let __VLS_25;
    let __VLS_26;
    let __VLS_27;
    const __VLS_28 = {
        onClick: (__VLS_ctx.fetch)
    };
    __VLS_24.slots.default;
    var __VLS_24;
}
else if (!__VLS_ctx.spots.length) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "empty-msg" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ style: {} },
    });
    (__VLS_ctx.keyword ? ' for "' + __VLS_ctx.keyword + '"' : '');
    (__VLS_ctx.activeCat !== 'All' ? ' in ' + __VLS_ctx.activeCat : '');
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "spots-grid" },
    });
    for (const [s] of __VLS_getVForSourceType((__VLS_ctx.spots))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.loading))
                        return;
                    if (!!(__VLS_ctx.errorMsg))
                        return;
                    if (!!(!__VLS_ctx.spots.length))
                        return;
                    __VLS_ctx.$router.push('/spots/' + s.id);
                } },
            key: (s.id),
            ...{ class: "spot-card glass" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "spot-cover" },
            ...{ style: ({ backgroundImage: s.imageUrl ? `url(${s.imageUrl})` : 'none' }) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
            ...{ class: "spot-cover-overlay" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "spot-cover-content" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "spot-cat-tag" },
        });
        (s.category);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
        (s.name);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "spot-body" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "spot-desc" },
        });
        ((s.description || '').substring(0, 80));
        ((s.description || '').length > 80 ? '...' : '');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "spot-foot" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "spot-rating" },
        });
        (s.avgRating?.toFixed(1) || '—');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (s.popularity || '—');
        if (s.address) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "spot-addr" },
            });
            (s.address?.substring(0, 18));
        }
    }
}
var __VLS_2;
/** @type {__VLS_StyleScopedClasses['spots-page']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['glass-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['search-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['cat-filters']} */ ;
/** @type {__VLS_StyleScopedClasses['loading-msg']} */ ;
/** @type {__VLS_StyleScopedClasses['loading-spinner']} */ ;
/** @type {__VLS_StyleScopedClasses['error-msg']} */ ;
/** @type {__VLS_StyleScopedClasses['error-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-msg']} */ ;
/** @type {__VLS_StyleScopedClasses['spots-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['spot-card']} */ ;
/** @type {__VLS_StyleScopedClasses['glass']} */ ;
/** @type {__VLS_StyleScopedClasses['spot-cover']} */ ;
/** @type {__VLS_StyleScopedClasses['spot-cover-overlay']} */ ;
/** @type {__VLS_StyleScopedClasses['spot-cover-content']} */ ;
/** @type {__VLS_StyleScopedClasses['spot-cat-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['spot-body']} */ ;
/** @type {__VLS_StyleScopedClasses['spot-desc']} */ ;
/** @type {__VLS_StyleScopedClasses['spot-foot']} */ ;
/** @type {__VLS_StyleScopedClasses['spot-rating']} */ ;
/** @type {__VLS_StyleScopedClasses['spot-addr']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            DefaultLayout: DefaultLayout,
            spots: spots,
            loading: loading,
            errorMsg: errorMsg,
            keyword: keyword,
            activeCat: activeCat,
            cats: cats,
            fetch: fetch,
            search: search,
            filterCat: filterCat,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
