/// <reference types="../../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { ref, onMounted } from 'vue';
import DefaultLayout from '@/layouts/DefaultLayout.vue';
import { shopApi } from '@/api/shopApi';
const keyword = ref('');
const selectedCuisine = ref('');
const shops = ref([]);
const loading = ref(false);
const errorMsg = ref('');
const currentPage = ref(1);
const size = ref(20);
const total = ref(0);
const cuisineList = ['中餐', '火锅', '烧烤', '快餐', '小吃', '西餐', '日料', '咖啡厅', '川菜', '湘菜', '粤菜', '面馆', '饺子', '韩餐', '奶茶', '面包甜点'];
function toggleCuisine(c) {
    selectedCuisine.value = selectedCuisine.value === c ? '' : c;
    currentPage.value = 1;
    errorMsg.value = '';
    doSearch();
}
async function doSearch() {
    loading.value = true;
    errorMsg.value = '';
    try {
        const params = { page: currentPage.value - 1, size: size.value };
        if (keyword.value.trim())
            params.keyword = keyword.value.trim();
        if (selectedCuisine.value)
            params.cuisine = selectedCuisine.value;
        const r = await shopApi.search(params);
        shops.value = r.data.data?.content || [];
        total.value = r.data.data?.totalElements || 0;
    }
    catch (e) {
        errorMsg.value = e?.message || '加载餐馆失败，请重试。';
        shops.value = [];
    }
    finally {
        loading.value = false;
    }
}
onMounted(doSearch);
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['cat-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['cat-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['loading-msg']} */ ;
/** @type {__VLS_StyleScopedClasses['shop-card']} */ ;
/** @type {__VLS_StyleScopedClasses['ssv-grid']} */ ;
// CSS variable injection 
// CSS variable injection end 
/** @type {[typeof DefaultLayout, typeof DefaultLayout, ]} */ ;
// @ts-ignore
const __VLS_0 = __VLS_asFunctionalComponent(DefaultLayout, new DefaultLayout({}));
const __VLS_1 = __VLS_0({}, ...__VLS_functionalComponentArgsRest(__VLS_0));
var __VLS_3 = {};
__VLS_2.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "ssv-container" },
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
    placeholder: "搜索餐馆名称、地址、类型…",
    prefixIcon: "Search",
    clearable: true,
    ...{ class: "search-bar" },
}));
const __VLS_6 = __VLS_5({
    ...{ 'onKeyup': {} },
    ...{ 'onClear': {} },
    modelValue: (__VLS_ctx.keyword),
    placeholder: "搜索餐馆名称、地址、类型…",
    prefixIcon: "Search",
    clearable: true,
    ...{ class: "search-bar" },
}, ...__VLS_functionalComponentArgsRest(__VLS_5));
let __VLS_8;
let __VLS_9;
let __VLS_10;
const __VLS_11 = {
    onKeyup: (__VLS_ctx.doSearch)
};
const __VLS_12 = {
    onClear: (__VLS_ctx.doSearch)
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
    onClick: (__VLS_ctx.doSearch)
};
__VLS_16.slots.default;
var __VLS_16;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "cat-filters" },
});
for (const [c] of __VLS_getVForSourceType((__VLS_ctx.cuisineList))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.toggleCuisine(c);
            } },
        key: (c),
        ...{ class: (['cat-btn', { active: __VLS_ctx.selectedCuisine === c }]) },
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
        onClick: (__VLS_ctx.doSearch)
    };
    __VLS_24.slots.default;
    var __VLS_24;
}
else if (!__VLS_ctx.shops.length) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "empty-msg" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ style: {} },
    });
    (__VLS_ctx.keyword ? ' for "' + __VLS_ctx.keyword + '"' : '');
    (__VLS_ctx.selectedCuisine ? ' in ' + __VLS_ctx.selectedCuisine : '');
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ssv-grid" },
    });
    for (const [s] of __VLS_getVForSourceType((__VLS_ctx.shops))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.loading))
                        return;
                    if (!!(__VLS_ctx.errorMsg))
                        return;
                    if (!!(!__VLS_ctx.shops.length))
                        return;
                    __VLS_ctx.$router.push('/shops/' + s.id);
                } },
            key: (s.id),
            ...{ class: "shop-card glass" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "sc-img" },
            ...{ style: ({ backgroundImage: s.imageUrl ? `url(${s.imageUrl})` : 'none' }) },
        });
        if (!s.imageUrl) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "sc-img-placeholder" },
            });
            (s.name.charAt(0));
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "sc-body" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "sc-name" },
        });
        (s.name);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "sc-meta" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "sc-cuisine" },
        });
        (s.cuisine || '餐馆');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "sc-rating" },
        });
        (s.avgRating?.toFixed(1) || '—');
        if (s.address) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "sc-addr" },
            });
            (s.address);
        }
    }
}
if (__VLS_ctx.total > __VLS_ctx.size) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "pagination-wrap" },
    });
    const __VLS_29 = {}.ElPagination;
    /** @type {[typeof __VLS_components.ElPagination, typeof __VLS_components.elPagination, ]} */ ;
    // @ts-ignore
    const __VLS_30 = __VLS_asFunctionalComponent(__VLS_29, new __VLS_29({
        ...{ 'onCurrentChange': {} },
        currentPage: (__VLS_ctx.currentPage),
        pageSize: (__VLS_ctx.size),
        total: (__VLS_ctx.total),
        layout: "prev, pager, next",
    }));
    const __VLS_31 = __VLS_30({
        ...{ 'onCurrentChange': {} },
        currentPage: (__VLS_ctx.currentPage),
        pageSize: (__VLS_ctx.size),
        total: (__VLS_ctx.total),
        layout: "prev, pager, next",
    }, ...__VLS_functionalComponentArgsRest(__VLS_30));
    let __VLS_33;
    let __VLS_34;
    let __VLS_35;
    const __VLS_36 = {
        onCurrentChange: (__VLS_ctx.doSearch)
    };
    var __VLS_32;
}
var __VLS_2;
/** @type {__VLS_StyleScopedClasses['ssv-container']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['glass-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['search-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['cat-filters']} */ ;
/** @type {__VLS_StyleScopedClasses['loading-msg']} */ ;
/** @type {__VLS_StyleScopedClasses['loading-spinner']} */ ;
/** @type {__VLS_StyleScopedClasses['error-msg']} */ ;
/** @type {__VLS_StyleScopedClasses['error-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-msg']} */ ;
/** @type {__VLS_StyleScopedClasses['ssv-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['shop-card']} */ ;
/** @type {__VLS_StyleScopedClasses['glass']} */ ;
/** @type {__VLS_StyleScopedClasses['sc-img']} */ ;
/** @type {__VLS_StyleScopedClasses['sc-img-placeholder']} */ ;
/** @type {__VLS_StyleScopedClasses['sc-body']} */ ;
/** @type {__VLS_StyleScopedClasses['sc-name']} */ ;
/** @type {__VLS_StyleScopedClasses['sc-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['sc-cuisine']} */ ;
/** @type {__VLS_StyleScopedClasses['sc-rating']} */ ;
/** @type {__VLS_StyleScopedClasses['sc-addr']} */ ;
/** @type {__VLS_StyleScopedClasses['pagination-wrap']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            DefaultLayout: DefaultLayout,
            keyword: keyword,
            selectedCuisine: selectedCuisine,
            shops: shops,
            loading: loading,
            errorMsg: errorMsg,
            currentPage: currentPage,
            size: size,
            total: total,
            cuisineList: cuisineList,
            toggleCuisine: toggleCuisine,
            doSearch: doSearch,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
