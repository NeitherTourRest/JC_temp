/// <reference types="../../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { ref, onMounted } from 'vue';
import DefaultLayout from '@/layouts/DefaultLayout.vue';
import { historyApi } from '@/api/historyApi';
// --- Tabs ---
const activeTab = ref('search');
const searchItems = ref([]);
const searchLoading = ref(false);
const searchPage = ref(1);
const searchSize = ref(10);
const searchTotal = ref(0);
async function loadSearchHistory(page = 1) {
    searchLoading.value = true;
    try {
        const res = await historyApi.getSearchHistory(page - 1, searchSize.value);
        const data = res.data.data;
        searchItems.value = data.content || [];
        searchTotal.value = data.totalElements || 0;
        searchPage.value = page;
    }
    catch {
        searchItems.value = [];
        searchTotal.value = 0;
    }
    finally {
        searchLoading.value = false;
    }
}
const browseItems = ref([]);
const browseLoading = ref(false);
const browsePage = ref(1);
const browseSize = ref(10);
const browseTotal = ref(0);
async function loadBrowseHistory(page = 1) {
    browseLoading.value = true;
    try {
        const res = await historyApi.getBrowseHistory(undefined, page - 1, browseSize.value);
        const data = res.data.data;
        browseItems.value = data.content || [];
        browseTotal.value = data.totalElements || 0;
        browsePage.value = page;
    }
    catch {
        browseItems.value = [];
        browseTotal.value = 0;
    }
    finally {
        browseLoading.value = false;
    }
}
const routeItems = ref([]);
const routesLoading = ref(false);
const routesPage = ref(1);
const routesSize = ref(10);
const routesTotal = ref(0);
async function loadRouteHistory(page = 1) {
    routesLoading.value = true;
    try {
        const res = await historyApi.getRouteHistory(page - 1, routesSize.value);
        const data = res.data.data;
        routeItems.value = data.content || [];
        routesTotal.value = data.totalElements || 0;
        routesPage.value = page;
    }
    catch {
        routeItems.value = [];
        routesTotal.value = 0;
    }
    finally {
        routesLoading.value = false;
    }
}
const facilityItems = ref([]);
const facilitiesLoading = ref(false);
const facilitiesPage = ref(1);
const facilitiesSize = ref(10);
const facilitiesTotal = ref(0);
async function loadFacilityHistory(page = 1) {
    facilitiesLoading.value = true;
    try {
        const res = await historyApi.getFacilityHistory(page - 1, facilitiesSize.value);
        const data = res.data.data;
        facilityItems.value = data.content || [];
        facilitiesTotal.value = data.totalElements || 0;
        facilitiesPage.value = page;
    }
    catch {
        facilityItems.value = [];
        facilitiesTotal.value = 0;
    }
    finally {
        facilitiesLoading.value = false;
    }
}
// --- Tab switch ---
function handleTabChange(tab) {
    if (tab === 'search' && searchItems.value.length === 0) {
        loadSearchHistory();
    }
    else if (tab === 'browse' && browseItems.value.length === 0) {
        loadBrowseHistory();
    }
    else if (tab === 'routes' && routeItems.value.length === 0) {
        loadRouteHistory();
    }
    else if (tab === 'facilities' && facilityItems.value.length === 0) {
        loadFacilityHistory();
    }
}
// --- Helpers ---
const typeMap = {
    SPOT: '景点',
    FOOD: '美食',
    DIARY: '游记'
};
function getTypeLabel(type) {
    return typeMap[type] || type;
}
function getTypeTagType(type) {
    const map = {
        SPOT: 'success',
        FOOD: 'warning',
        DIARY: 'info'
    };
    return map[type] || '';
}
function formatDate(dateStr) {
    if (!dateStr)
        return '--';
    const d = new Date(dateStr);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${day} ${h}:${min}`;
}
// --- Init ---
onMounted(() => {
    loadSearchHistory();
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['history-card']} */ ;
/** @type {__VLS_StyleScopedClasses['history-item']} */ ;
/** @type {__VLS_StyleScopedClasses['history-card']} */ ;
// CSS variable injection 
// CSS variable injection end 
/** @type {[typeof DefaultLayout, typeof DefaultLayout, ]} */ ;
// @ts-ignore
const __VLS_0 = __VLS_asFunctionalComponent(DefaultLayout, new DefaultLayout({}));
const __VLS_1 = __VLS_0({}, ...__VLS_functionalComponentArgsRest(__VLS_0));
var __VLS_3 = {};
__VLS_2.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "history-page" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "page-header" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
    ...{ class: "page-title" },
});
const __VLS_4 = {}.ElCard;
/** @type {[typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ]} */ ;
// @ts-ignore
const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
    shadow: "never",
    ...{ class: "history-card glass" },
}));
const __VLS_6 = __VLS_5({
    shadow: "never",
    ...{ class: "history-card glass" },
}, ...__VLS_functionalComponentArgsRest(__VLS_5));
__VLS_7.slots.default;
const __VLS_8 = {}.ElTabs;
/** @type {[typeof __VLS_components.ElTabs, typeof __VLS_components.elTabs, typeof __VLS_components.ElTabs, typeof __VLS_components.elTabs, ]} */ ;
// @ts-ignore
const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
    ...{ 'onTabChange': {} },
    modelValue: (__VLS_ctx.activeTab),
}));
const __VLS_10 = __VLS_9({
    ...{ 'onTabChange': {} },
    modelValue: (__VLS_ctx.activeTab),
}, ...__VLS_functionalComponentArgsRest(__VLS_9));
let __VLS_12;
let __VLS_13;
let __VLS_14;
const __VLS_15 = {
    onTabChange: (__VLS_ctx.handleTabChange)
};
__VLS_11.slots.default;
const __VLS_16 = {}.ElTabPane;
/** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
// @ts-ignore
const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
    label: "搜索历史",
    name: "search",
}));
const __VLS_18 = __VLS_17({
    label: "搜索历史",
    name: "search",
}, ...__VLS_functionalComponentArgsRest(__VLS_17));
__VLS_19.slots.default;
if (__VLS_ctx.searchLoading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "list-loading" },
    });
    for (const [n] of __VLS_getVForSourceType((5))) {
        const __VLS_20 = {}.ElSkeleton;
        /** @type {[typeof __VLS_components.ElSkeleton, typeof __VLS_components.elSkeleton, typeof __VLS_components.ElSkeleton, typeof __VLS_components.elSkeleton, ]} */ ;
        // @ts-ignore
        const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
            key: (n),
            animated: true,
            throttle: (0),
        }));
        const __VLS_22 = __VLS_21({
            key: (n),
            animated: true,
            throttle: (0),
        }, ...__VLS_functionalComponentArgsRest(__VLS_21));
        __VLS_23.slots.default;
        {
            const { template: __VLS_thisSlot } = __VLS_23.slots;
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ style: {} },
            });
            const __VLS_24 = {}.ElSkeletonItem;
            /** @type {[typeof __VLS_components.ElSkeletonItem, typeof __VLS_components.elSkeletonItem, ]} */ ;
            // @ts-ignore
            const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
                variant: "text",
                ...{ style: {} },
            }));
            const __VLS_26 = __VLS_25({
                variant: "text",
                ...{ style: {} },
            }, ...__VLS_functionalComponentArgsRest(__VLS_25));
            const __VLS_28 = {}.ElSkeletonItem;
            /** @type {[typeof __VLS_components.ElSkeletonItem, typeof __VLS_components.elSkeletonItem, ]} */ ;
            // @ts-ignore
            const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({
                variant: "text",
                ...{ style: {} },
            }));
            const __VLS_30 = __VLS_29({
                variant: "text",
                ...{ style: {} },
            }, ...__VLS_functionalComponentArgsRest(__VLS_29));
        }
        var __VLS_23;
    }
}
else if (!__VLS_ctx.searchLoading && __VLS_ctx.searchItems.length === 0) {
    const __VLS_32 = {}.ElEmpty;
    /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
    // @ts-ignore
    const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
        description: "暂无搜索历史",
    }));
    const __VLS_34 = __VLS_33({
        description: "暂无搜索历史",
    }, ...__VLS_functionalComponentArgsRest(__VLS_33));
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "history-list" },
    });
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.searchItems))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (item.id),
            ...{ class: "history-item" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "history-item-main" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "history-keyword" },
        });
        (item.keyword);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "history-item-meta" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "history-date" },
        });
        (__VLS_ctx.formatDate(item.createdAt));
    }
    if (__VLS_ctx.searchTotal > __VLS_ctx.searchSize) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "pagination-wrap" },
        });
        const __VLS_36 = {}.ElPagination;
        /** @type {[typeof __VLS_components.ElPagination, typeof __VLS_components.elPagination, ]} */ ;
        // @ts-ignore
        const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
            ...{ 'onCurrentChange': {} },
            currentPage: (__VLS_ctx.searchPage),
            pageSize: (__VLS_ctx.searchSize),
            total: (__VLS_ctx.searchTotal),
            layout: "prev, pager, next",
            background: true,
            small: true,
        }));
        const __VLS_38 = __VLS_37({
            ...{ 'onCurrentChange': {} },
            currentPage: (__VLS_ctx.searchPage),
            pageSize: (__VLS_ctx.searchSize),
            total: (__VLS_ctx.searchTotal),
            layout: "prev, pager, next",
            background: true,
            small: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_37));
        let __VLS_40;
        let __VLS_41;
        let __VLS_42;
        const __VLS_43 = {
            onCurrentChange: (__VLS_ctx.loadSearchHistory)
        };
        var __VLS_39;
    }
}
var __VLS_19;
const __VLS_44 = {}.ElTabPane;
/** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
// @ts-ignore
const __VLS_45 = __VLS_asFunctionalComponent(__VLS_44, new __VLS_44({
    label: "浏览历史",
    name: "browse",
}));
const __VLS_46 = __VLS_45({
    label: "浏览历史",
    name: "browse",
}, ...__VLS_functionalComponentArgsRest(__VLS_45));
__VLS_47.slots.default;
if (__VLS_ctx.browseLoading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "list-loading" },
    });
    for (const [n] of __VLS_getVForSourceType((5))) {
        const __VLS_48 = {}.ElSkeleton;
        /** @type {[typeof __VLS_components.ElSkeleton, typeof __VLS_components.elSkeleton, typeof __VLS_components.ElSkeleton, typeof __VLS_components.elSkeleton, ]} */ ;
        // @ts-ignore
        const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
            key: (n),
            animated: true,
            throttle: (0),
        }));
        const __VLS_50 = __VLS_49({
            key: (n),
            animated: true,
            throttle: (0),
        }, ...__VLS_functionalComponentArgsRest(__VLS_49));
        __VLS_51.slots.default;
        {
            const { template: __VLS_thisSlot } = __VLS_51.slots;
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ style: {} },
            });
            const __VLS_52 = {}.ElSkeletonItem;
            /** @type {[typeof __VLS_components.ElSkeletonItem, typeof __VLS_components.elSkeletonItem, ]} */ ;
            // @ts-ignore
            const __VLS_53 = __VLS_asFunctionalComponent(__VLS_52, new __VLS_52({
                variant: "text",
                ...{ style: {} },
            }));
            const __VLS_54 = __VLS_53({
                variant: "text",
                ...{ style: {} },
            }, ...__VLS_functionalComponentArgsRest(__VLS_53));
            const __VLS_56 = {}.ElSkeletonItem;
            /** @type {[typeof __VLS_components.ElSkeletonItem, typeof __VLS_components.elSkeletonItem, ]} */ ;
            // @ts-ignore
            const __VLS_57 = __VLS_asFunctionalComponent(__VLS_56, new __VLS_56({
                variant: "text",
                ...{ style: {} },
            }));
            const __VLS_58 = __VLS_57({
                variant: "text",
                ...{ style: {} },
            }, ...__VLS_functionalComponentArgsRest(__VLS_57));
            const __VLS_60 = {}.ElSkeletonItem;
            /** @type {[typeof __VLS_components.ElSkeletonItem, typeof __VLS_components.elSkeletonItem, ]} */ ;
            // @ts-ignore
            const __VLS_61 = __VLS_asFunctionalComponent(__VLS_60, new __VLS_60({
                variant: "text",
                ...{ style: {} },
            }));
            const __VLS_62 = __VLS_61({
                variant: "text",
                ...{ style: {} },
            }, ...__VLS_functionalComponentArgsRest(__VLS_61));
        }
        var __VLS_51;
    }
}
else if (!__VLS_ctx.browseLoading && __VLS_ctx.browseItems.length === 0) {
    const __VLS_64 = {}.ElEmpty;
    /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
    // @ts-ignore
    const __VLS_65 = __VLS_asFunctionalComponent(__VLS_64, new __VLS_64({
        description: "暂无浏览历史",
    }));
    const __VLS_66 = __VLS_65({
        description: "暂无浏览历史",
    }, ...__VLS_functionalComponentArgsRest(__VLS_65));
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "history-list" },
    });
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.browseItems))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (item.id),
            ...{ class: "history-item" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "history-item-main" },
        });
        const __VLS_68 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_69 = __VLS_asFunctionalComponent(__VLS_68, new __VLS_68({
            type: (__VLS_ctx.getTypeTagType(item.type)),
            size: "small",
            effect: "plain",
        }));
        const __VLS_70 = __VLS_69({
            type: (__VLS_ctx.getTypeTagType(item.type)),
            size: "small",
            effect: "plain",
        }, ...__VLS_functionalComponentArgsRest(__VLS_69));
        __VLS_71.slots.default;
        (__VLS_ctx.getTypeLabel(item.type));
        var __VLS_71;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "history-target" },
        });
        (item.targetId);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "history-item-meta" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "history-date" },
        });
        (__VLS_ctx.formatDate(item.createdAt));
    }
    if (__VLS_ctx.browseTotal > __VLS_ctx.browseSize) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "pagination-wrap" },
        });
        const __VLS_72 = {}.ElPagination;
        /** @type {[typeof __VLS_components.ElPagination, typeof __VLS_components.elPagination, ]} */ ;
        // @ts-ignore
        const __VLS_73 = __VLS_asFunctionalComponent(__VLS_72, new __VLS_72({
            ...{ 'onCurrentChange': {} },
            currentPage: (__VLS_ctx.browsePage),
            pageSize: (__VLS_ctx.browseSize),
            total: (__VLS_ctx.browseTotal),
            layout: "prev, pager, next",
            background: true,
            small: true,
        }));
        const __VLS_74 = __VLS_73({
            ...{ 'onCurrentChange': {} },
            currentPage: (__VLS_ctx.browsePage),
            pageSize: (__VLS_ctx.browseSize),
            total: (__VLS_ctx.browseTotal),
            layout: "prev, pager, next",
            background: true,
            small: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_73));
        let __VLS_76;
        let __VLS_77;
        let __VLS_78;
        const __VLS_79 = {
            onCurrentChange: (__VLS_ctx.loadBrowseHistory)
        };
        var __VLS_75;
    }
}
var __VLS_47;
const __VLS_80 = {}.ElTabPane;
/** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
// @ts-ignore
const __VLS_81 = __VLS_asFunctionalComponent(__VLS_80, new __VLS_80({
    label: "路径回顾",
    name: "routes",
}));
const __VLS_82 = __VLS_81({
    label: "路径回顾",
    name: "routes",
}, ...__VLS_functionalComponentArgsRest(__VLS_81));
__VLS_83.slots.default;
if (__VLS_ctx.routesLoading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "list-loading" },
    });
    for (const [n] of __VLS_getVForSourceType((3))) {
        const __VLS_84 = {}.ElSkeleton;
        /** @type {[typeof __VLS_components.ElSkeleton, typeof __VLS_components.elSkeleton, typeof __VLS_components.ElSkeleton, typeof __VLS_components.elSkeleton, ]} */ ;
        // @ts-ignore
        const __VLS_85 = __VLS_asFunctionalComponent(__VLS_84, new __VLS_84({
            key: (n),
            animated: true,
        }));
        const __VLS_86 = __VLS_85({
            key: (n),
            animated: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_85));
        __VLS_87.slots.default;
        {
            const { template: __VLS_thisSlot } = __VLS_87.slots;
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ style: {} },
            });
            const __VLS_88 = {}.ElSkeletonItem;
            /** @type {[typeof __VLS_components.ElSkeletonItem, typeof __VLS_components.elSkeletonItem, ]} */ ;
            // @ts-ignore
            const __VLS_89 = __VLS_asFunctionalComponent(__VLS_88, new __VLS_88({
                variant: "text",
                ...{ style: {} },
            }));
            const __VLS_90 = __VLS_89({
                variant: "text",
                ...{ style: {} },
            }, ...__VLS_functionalComponentArgsRest(__VLS_89));
            const __VLS_92 = {}.ElSkeletonItem;
            /** @type {[typeof __VLS_components.ElSkeletonItem, typeof __VLS_components.elSkeletonItem, ]} */ ;
            // @ts-ignore
            const __VLS_93 = __VLS_asFunctionalComponent(__VLS_92, new __VLS_92({
                variant: "text",
                ...{ style: {} },
            }));
            const __VLS_94 = __VLS_93({
                variant: "text",
                ...{ style: {} },
            }, ...__VLS_functionalComponentArgsRest(__VLS_93));
        }
        var __VLS_87;
    }
}
else if (!__VLS_ctx.routesLoading && __VLS_ctx.routeItems.length === 0) {
    const __VLS_96 = {}.ElEmpty;
    /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
    // @ts-ignore
    const __VLS_97 = __VLS_asFunctionalComponent(__VLS_96, new __VLS_96({
        description: "暂无路径历史",
    }));
    const __VLS_98 = __VLS_97({
        description: "暂无路径历史",
    }, ...__VLS_functionalComponentArgsRest(__VLS_97));
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "history-list" },
    });
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.routeItems))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (item.id),
            ...{ class: "history-item" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "history-item-main" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "history-keyword" },
        });
        (item.id);
        if (item.distance) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "history-detail" },
            });
            ((item.distance / 1000).toFixed(1));
        }
        if (item.duration) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "history-detail" },
            });
            (Math.round(item.duration / 60));
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "history-item-meta" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "history-date" },
        });
        (__VLS_ctx.formatDate(item.createdAt));
    }
    if (__VLS_ctx.routesTotal > __VLS_ctx.routesSize) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "pagination-wrap" },
        });
        const __VLS_100 = {}.ElPagination;
        /** @type {[typeof __VLS_components.ElPagination, typeof __VLS_components.elPagination, ]} */ ;
        // @ts-ignore
        const __VLS_101 = __VLS_asFunctionalComponent(__VLS_100, new __VLS_100({
            ...{ 'onCurrentChange': {} },
            currentPage: (__VLS_ctx.routesPage),
            pageSize: (__VLS_ctx.routesSize),
            total: (__VLS_ctx.routesTotal),
            layout: "prev, pager, next",
            background: true,
            small: true,
        }));
        const __VLS_102 = __VLS_101({
            ...{ 'onCurrentChange': {} },
            currentPage: (__VLS_ctx.routesPage),
            pageSize: (__VLS_ctx.routesSize),
            total: (__VLS_ctx.routesTotal),
            layout: "prev, pager, next",
            background: true,
            small: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_101));
        let __VLS_104;
        let __VLS_105;
        let __VLS_106;
        const __VLS_107 = {
            onCurrentChange: (__VLS_ctx.loadRouteHistory)
        };
        var __VLS_103;
    }
}
var __VLS_83;
const __VLS_108 = {}.ElTabPane;
/** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
// @ts-ignore
const __VLS_109 = __VLS_asFunctionalComponent(__VLS_108, new __VLS_108({
    label: "场所查询",
    name: "facilities",
}));
const __VLS_110 = __VLS_109({
    label: "场所查询",
    name: "facilities",
}, ...__VLS_functionalComponentArgsRest(__VLS_109));
__VLS_111.slots.default;
if (__VLS_ctx.facilitiesLoading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "list-loading" },
    });
    for (const [n] of __VLS_getVForSourceType((3))) {
        const __VLS_112 = {}.ElSkeleton;
        /** @type {[typeof __VLS_components.ElSkeleton, typeof __VLS_components.elSkeleton, typeof __VLS_components.ElSkeleton, typeof __VLS_components.elSkeleton, ]} */ ;
        // @ts-ignore
        const __VLS_113 = __VLS_asFunctionalComponent(__VLS_112, new __VLS_112({
            key: (n),
            animated: true,
        }));
        const __VLS_114 = __VLS_113({
            key: (n),
            animated: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_113));
        __VLS_115.slots.default;
        {
            const { template: __VLS_thisSlot } = __VLS_115.slots;
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ style: {} },
            });
            const __VLS_116 = {}.ElSkeletonItem;
            /** @type {[typeof __VLS_components.ElSkeletonItem, typeof __VLS_components.elSkeletonItem, ]} */ ;
            // @ts-ignore
            const __VLS_117 = __VLS_asFunctionalComponent(__VLS_116, new __VLS_116({
                variant: "text",
                ...{ style: {} },
            }));
            const __VLS_118 = __VLS_117({
                variant: "text",
                ...{ style: {} },
            }, ...__VLS_functionalComponentArgsRest(__VLS_117));
            const __VLS_120 = {}.ElSkeletonItem;
            /** @type {[typeof __VLS_components.ElSkeletonItem, typeof __VLS_components.elSkeletonItem, ]} */ ;
            // @ts-ignore
            const __VLS_121 = __VLS_asFunctionalComponent(__VLS_120, new __VLS_120({
                variant: "text",
                ...{ style: {} },
            }));
            const __VLS_122 = __VLS_121({
                variant: "text",
                ...{ style: {} },
            }, ...__VLS_functionalComponentArgsRest(__VLS_121));
        }
        var __VLS_115;
    }
}
else if (!__VLS_ctx.facilitiesLoading && __VLS_ctx.facilityItems.length === 0) {
    const __VLS_124 = {}.ElEmpty;
    /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
    // @ts-ignore
    const __VLS_125 = __VLS_asFunctionalComponent(__VLS_124, new __VLS_124({
        description: "暂无场所查询历史",
    }));
    const __VLS_126 = __VLS_125({
        description: "暂无场所查询历史",
    }, ...__VLS_functionalComponentArgsRest(__VLS_125));
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "history-list" },
    });
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.facilityItems))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (item.id),
            ...{ class: "history-item" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "history-item-main" },
        });
        const __VLS_128 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_129 = __VLS_asFunctionalComponent(__VLS_128, new __VLS_128({
            size: "small",
            effect: "plain",
        }));
        const __VLS_130 = __VLS_129({
            size: "small",
            effect: "plain",
        }, ...__VLS_functionalComponentArgsRest(__VLS_129));
        __VLS_131.slots.default;
        (item.spotName || '未知场所');
        var __VLS_131;
        if (item.category) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "history-detail" },
            });
            (item.category);
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "history-item-meta" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "history-date" },
        });
        (__VLS_ctx.formatDate(item.createdAt));
    }
    if (__VLS_ctx.facilitiesTotal > __VLS_ctx.facilitiesSize) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "pagination-wrap" },
        });
        const __VLS_132 = {}.ElPagination;
        /** @type {[typeof __VLS_components.ElPagination, typeof __VLS_components.elPagination, ]} */ ;
        // @ts-ignore
        const __VLS_133 = __VLS_asFunctionalComponent(__VLS_132, new __VLS_132({
            ...{ 'onCurrentChange': {} },
            currentPage: (__VLS_ctx.facilitiesPage),
            pageSize: (__VLS_ctx.facilitiesSize),
            total: (__VLS_ctx.facilitiesTotal),
            layout: "prev, pager, next",
            background: true,
            small: true,
        }));
        const __VLS_134 = __VLS_133({
            ...{ 'onCurrentChange': {} },
            currentPage: (__VLS_ctx.facilitiesPage),
            pageSize: (__VLS_ctx.facilitiesSize),
            total: (__VLS_ctx.facilitiesTotal),
            layout: "prev, pager, next",
            background: true,
            small: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_133));
        let __VLS_136;
        let __VLS_137;
        let __VLS_138;
        const __VLS_139 = {
            onCurrentChange: (__VLS_ctx.loadFacilityHistory)
        };
        var __VLS_135;
    }
}
var __VLS_111;
var __VLS_11;
var __VLS_7;
var __VLS_2;
/** @type {__VLS_StyleScopedClasses['history-page']} */ ;
/** @type {__VLS_StyleScopedClasses['page-header']} */ ;
/** @type {__VLS_StyleScopedClasses['page-title']} */ ;
/** @type {__VLS_StyleScopedClasses['history-card']} */ ;
/** @type {__VLS_StyleScopedClasses['glass']} */ ;
/** @type {__VLS_StyleScopedClasses['list-loading']} */ ;
/** @type {__VLS_StyleScopedClasses['history-list']} */ ;
/** @type {__VLS_StyleScopedClasses['history-item']} */ ;
/** @type {__VLS_StyleScopedClasses['history-item-main']} */ ;
/** @type {__VLS_StyleScopedClasses['history-keyword']} */ ;
/** @type {__VLS_StyleScopedClasses['history-item-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['history-date']} */ ;
/** @type {__VLS_StyleScopedClasses['pagination-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['list-loading']} */ ;
/** @type {__VLS_StyleScopedClasses['history-list']} */ ;
/** @type {__VLS_StyleScopedClasses['history-item']} */ ;
/** @type {__VLS_StyleScopedClasses['history-item-main']} */ ;
/** @type {__VLS_StyleScopedClasses['history-target']} */ ;
/** @type {__VLS_StyleScopedClasses['history-item-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['history-date']} */ ;
/** @type {__VLS_StyleScopedClasses['pagination-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['list-loading']} */ ;
/** @type {__VLS_StyleScopedClasses['history-list']} */ ;
/** @type {__VLS_StyleScopedClasses['history-item']} */ ;
/** @type {__VLS_StyleScopedClasses['history-item-main']} */ ;
/** @type {__VLS_StyleScopedClasses['history-keyword']} */ ;
/** @type {__VLS_StyleScopedClasses['history-detail']} */ ;
/** @type {__VLS_StyleScopedClasses['history-detail']} */ ;
/** @type {__VLS_StyleScopedClasses['history-item-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['history-date']} */ ;
/** @type {__VLS_StyleScopedClasses['pagination-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['list-loading']} */ ;
/** @type {__VLS_StyleScopedClasses['history-list']} */ ;
/** @type {__VLS_StyleScopedClasses['history-item']} */ ;
/** @type {__VLS_StyleScopedClasses['history-item-main']} */ ;
/** @type {__VLS_StyleScopedClasses['history-detail']} */ ;
/** @type {__VLS_StyleScopedClasses['history-item-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['history-date']} */ ;
/** @type {__VLS_StyleScopedClasses['pagination-wrap']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            DefaultLayout: DefaultLayout,
            activeTab: activeTab,
            searchItems: searchItems,
            searchLoading: searchLoading,
            searchPage: searchPage,
            searchSize: searchSize,
            searchTotal: searchTotal,
            loadSearchHistory: loadSearchHistory,
            browseItems: browseItems,
            browseLoading: browseLoading,
            browsePage: browsePage,
            browseSize: browseSize,
            browseTotal: browseTotal,
            loadBrowseHistory: loadBrowseHistory,
            routeItems: routeItems,
            routesLoading: routesLoading,
            routesPage: routesPage,
            routesSize: routesSize,
            routesTotal: routesTotal,
            loadRouteHistory: loadRouteHistory,
            facilityItems: facilityItems,
            facilitiesLoading: facilitiesLoading,
            facilitiesPage: facilitiesPage,
            facilitiesSize: facilitiesSize,
            facilitiesTotal: facilitiesTotal,
            loadFacilityHistory: loadFacilityHistory,
            handleTabChange: handleTabChange,
            getTypeLabel: getTypeLabel,
            getTypeTagType: getTypeTagType,
            formatDate: formatDate,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
