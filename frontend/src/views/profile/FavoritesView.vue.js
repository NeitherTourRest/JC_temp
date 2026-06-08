/// <reference types="../../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { Delete } from '@element-plus/icons-vue';
import DefaultLayout from '@/layouts/DefaultLayout.vue';
import { favoriteApi } from '@/api/favoriteApi';
// ---- filter & pagination ----
const activeType = ref('');
const page = ref(1);
const size = ref(6);
// ---- data ----
const favorites = ref([]);
const total = ref(0);
const loading = ref(false);
const removingId = ref(null);
// ---- type display helpers ----
const typeConfig = {
    SPOT: { label: '地点', icon: '📍', tagType: '' },
    FOOD: { label: '美食', icon: '🍴', tagType: 'warning' },
    DIARY: { label: '日记', icon: '📖', tagType: 'success' },
    ITINERARY: { label: '行程', icon: '🗺️', tagType: 'info' }
};
function getTypeLabel(type) {
    return typeConfig[type]?.label || type;
}
function getTypeIcon(type) {
    return typeConfig[type]?.icon || '📌';
}
function getTypeTagType(type) {
    return typeConfig[type]?.tagType || 'info';
}
function formatDate(dateStr) {
    const d = new Date(dateStr);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}
// ---- data fetching ----
async function fetchFavorites() {
    loading.value = true;
    try {
        const params = {
            page: page.value - 1,
            size: size.value
        };
        if (activeType.value) {
            params.type = activeType.value;
        }
        const res = await favoriteApi.list(params);
        const data = res.data.data;
        favorites.value = data.content;
        total.value = data.totalElements;
    }
    catch {
        ElMessage.error('加载收藏列表失败');
        favorites.value = [];
        total.value = 0;
    }
    finally {
        loading.value = false;
    }
}
// ---- event handlers ----
function handleTabChange() {
    page.value = 1;
    fetchFavorites();
}
function handlePageChange() {
    fetchFavorites();
}
async function handleRemove(item) {
    removingId.value = item.id;
    try {
        await favoriteApi.remove(item.type, item.targetId);
        ElMessage.success('已取消收藏');
        // if current page becomes empty after removal, go back one page
        if (favorites.value.length === 1 && page.value > 1) {
            page.value--;
        }
        fetchFavorites();
    }
    catch {
        ElMessage.error('取消收藏失败');
    }
    finally {
        removingId.value = null;
    }
}
// ---- lifecycle ----
onMounted(() => {
    fetchFavorites();
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['favorites-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['favorites-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['favorites-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['favorites-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['fav-card__inner']} */ ;
/** @type {__VLS_StyleScopedClasses['fav-card__inner']} */ ;
/** @type {__VLS_StyleScopedClasses['fav-card__remove-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['fav-card__inner']} */ ;
/** @type {__VLS_StyleScopedClasses['fav-card__accent']} */ ;
// CSS variable injection 
// CSS variable injection end 
/** @type {[typeof DefaultLayout, typeof DefaultLayout, ]} */ ;
// @ts-ignore
const __VLS_0 = __VLS_asFunctionalComponent(DefaultLayout, new DefaultLayout({}));
const __VLS_1 = __VLS_0({}, ...__VLS_functionalComponentArgsRest(__VLS_0));
var __VLS_3 = {};
__VLS_2.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "favorites-page" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "favorites-header" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
    ...{ class: "favorites-title" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "favorites-subtitle" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "favorites-tabs-wrapper" },
});
const __VLS_4 = {}.ElTabs;
/** @type {[typeof __VLS_components.ElTabs, typeof __VLS_components.elTabs, typeof __VLS_components.ElTabs, typeof __VLS_components.elTabs, ]} */ ;
// @ts-ignore
const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
    ...{ 'onTabChange': {} },
    modelValue: (__VLS_ctx.activeType),
    ...{ class: "favorites-tabs" },
}));
const __VLS_6 = __VLS_5({
    ...{ 'onTabChange': {} },
    modelValue: (__VLS_ctx.activeType),
    ...{ class: "favorites-tabs" },
}, ...__VLS_functionalComponentArgsRest(__VLS_5));
let __VLS_8;
let __VLS_9;
let __VLS_10;
const __VLS_11 = {
    onTabChange: (__VLS_ctx.handleTabChange)
};
__VLS_7.slots.default;
const __VLS_12 = {}.ElTabPane;
/** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
// @ts-ignore
const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
    label: "全部",
    name: "",
}));
const __VLS_14 = __VLS_13({
    label: "全部",
    name: "",
}, ...__VLS_functionalComponentArgsRest(__VLS_13));
const __VLS_16 = {}.ElTabPane;
/** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
// @ts-ignore
const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
    label: "地点",
    name: "SPOT",
}));
const __VLS_18 = __VLS_17({
    label: "地点",
    name: "SPOT",
}, ...__VLS_functionalComponentArgsRest(__VLS_17));
const __VLS_20 = {}.ElTabPane;
/** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
// @ts-ignore
const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
    label: "美食",
    name: "FOOD",
}));
const __VLS_22 = __VLS_21({
    label: "美食",
    name: "FOOD",
}, ...__VLS_functionalComponentArgsRest(__VLS_21));
const __VLS_24 = {}.ElTabPane;
/** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
// @ts-ignore
const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
    label: "日记",
    name: "DIARY",
}));
const __VLS_26 = __VLS_25({
    label: "日记",
    name: "DIARY",
}, ...__VLS_functionalComponentArgsRest(__VLS_25));
const __VLS_28 = {}.ElTabPane;
/** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
// @ts-ignore
const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({
    label: "行程",
    name: "ITINERARY",
}));
const __VLS_30 = __VLS_29({
    label: "行程",
    name: "ITINERARY",
}, ...__VLS_functionalComponentArgsRest(__VLS_29));
var __VLS_7;
if (__VLS_ctx.loading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "favorites-grid" },
    });
    for (const [n] of __VLS_getVForSourceType((6))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (n),
            ...{ class: "favorites-skeleton" },
        });
        const __VLS_32 = {}.ElSkeleton;
        /** @type {[typeof __VLS_components.ElSkeleton, typeof __VLS_components.elSkeleton, typeof __VLS_components.ElSkeleton, typeof __VLS_components.elSkeleton, ]} */ ;
        // @ts-ignore
        const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
            animated: true,
        }));
        const __VLS_34 = __VLS_33({
            animated: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_33));
        __VLS_35.slots.default;
        {
            const { template: __VLS_thisSlot } = __VLS_35.slots;
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "favorites-skeleton-inner" },
            });
            const __VLS_36 = {}.ElSkeletonItem;
            /** @type {[typeof __VLS_components.ElSkeletonItem, typeof __VLS_components.elSkeletonItem, ]} */ ;
            // @ts-ignore
            const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
                variant: "text",
                ...{ style: {} },
            }));
            const __VLS_38 = __VLS_37({
                variant: "text",
                ...{ style: {} },
            }, ...__VLS_functionalComponentArgsRest(__VLS_37));
            const __VLS_40 = {}.ElSkeletonItem;
            /** @type {[typeof __VLS_components.ElSkeletonItem, typeof __VLS_components.elSkeletonItem, ]} */ ;
            // @ts-ignore
            const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
                variant: "text",
                ...{ style: {} },
            }));
            const __VLS_42 = __VLS_41({
                variant: "text",
                ...{ style: {} },
            }, ...__VLS_functionalComponentArgsRest(__VLS_41));
            const __VLS_44 = {}.ElSkeletonItem;
            /** @type {[typeof __VLS_components.ElSkeletonItem, typeof __VLS_components.elSkeletonItem, ]} */ ;
            // @ts-ignore
            const __VLS_45 = __VLS_asFunctionalComponent(__VLS_44, new __VLS_44({
                variant: "text",
                ...{ style: {} },
            }));
            const __VLS_46 = __VLS_45({
                variant: "text",
                ...{ style: {} },
            }, ...__VLS_functionalComponentArgsRest(__VLS_45));
            const __VLS_48 = {}.ElSkeletonItem;
            /** @type {[typeof __VLS_components.ElSkeletonItem, typeof __VLS_components.elSkeletonItem, ]} */ ;
            // @ts-ignore
            const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
                variant: "text",
                ...{ style: {} },
            }));
            const __VLS_50 = __VLS_49({
                variant: "text",
                ...{ style: {} },
            }, ...__VLS_functionalComponentArgsRest(__VLS_49));
        }
        var __VLS_35;
    }
}
else if (!__VLS_ctx.loading && __VLS_ctx.favorites.length === 0) {
    const __VLS_52 = {}.ElEmpty;
    /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
    // @ts-ignore
    const __VLS_53 = __VLS_asFunctionalComponent(__VLS_52, new __VLS_52({
        description: "还没有收藏，去探索吧！",
        imageSize: (160),
        ...{ class: "favorites-empty" },
    }));
    const __VLS_54 = __VLS_53({
        description: "还没有收藏，去探索吧！",
        imageSize: (160),
        ...{ class: "favorites-empty" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_53));
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "favorites-grid" },
    });
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.favorites))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (item.id),
            ...{ class: "fav-card" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "fav-card__inner" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "fav-card__top" },
        });
        const __VLS_56 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_57 = __VLS_asFunctionalComponent(__VLS_56, new __VLS_56({
            type: (__VLS_ctx.getTypeTagType(item.type)),
            size: "small",
            effect: "plain",
            ...{ class: "fav-card__badge" },
        }));
        const __VLS_58 = __VLS_57({
            type: (__VLS_ctx.getTypeTagType(item.type)),
            size: "small",
            effect: "plain",
            ...{ class: "fav-card__badge" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_57));
        __VLS_59.slots.default;
        (__VLS_ctx.getTypeLabel(item.type));
        var __VLS_59;
        const __VLS_60 = {}.ElPopconfirm;
        /** @type {[typeof __VLS_components.ElPopconfirm, typeof __VLS_components.elPopconfirm, typeof __VLS_components.ElPopconfirm, typeof __VLS_components.elPopconfirm, ]} */ ;
        // @ts-ignore
        const __VLS_61 = __VLS_asFunctionalComponent(__VLS_60, new __VLS_60({
            ...{ 'onConfirm': {} },
            title: "确定要取消收藏吗？",
            confirmButtonText: "确定",
            cancelButtonText: "取消",
        }));
        const __VLS_62 = __VLS_61({
            ...{ 'onConfirm': {} },
            title: "确定要取消收藏吗？",
            confirmButtonText: "确定",
            cancelButtonText: "取消",
        }, ...__VLS_functionalComponentArgsRest(__VLS_61));
        let __VLS_64;
        let __VLS_65;
        let __VLS_66;
        const __VLS_67 = {
            onConfirm: (...[$event]) => {
                if (!!(__VLS_ctx.loading))
                    return;
                if (!!(!__VLS_ctx.loading && __VLS_ctx.favorites.length === 0))
                    return;
                __VLS_ctx.handleRemove(item);
            }
        };
        __VLS_63.slots.default;
        {
            const { reference: __VLS_thisSlot } = __VLS_63.slots;
            const __VLS_68 = {}.ElButton;
            /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
            // @ts-ignore
            const __VLS_69 = __VLS_asFunctionalComponent(__VLS_68, new __VLS_68({
                type: "danger",
                icon: (__VLS_ctx.Delete),
                size: "small",
                circle: true,
                plain: true,
                ...{ class: "fav-card__remove-btn" },
                loading: (__VLS_ctx.removingId === item.id),
            }));
            const __VLS_70 = __VLS_69({
                type: "danger",
                icon: (__VLS_ctx.Delete),
                size: "small",
                circle: true,
                plain: true,
                ...{ class: "fav-card__remove-btn" },
                loading: (__VLS_ctx.removingId === item.id),
            }, ...__VLS_functionalComponentArgsRest(__VLS_69));
        }
        var __VLS_63;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "fav-card__body" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "fav-card__target-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "fav-card__target-id" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "fav-card__target-icon" },
        });
        (__VLS_ctx.getTypeIcon(item.type));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "fav-card__target-text" },
        });
        (item.targetId);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "fav-card__date" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "fav-card__date-icon" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.formatDate(item.createdAt));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "fav-card__accent" },
        });
    }
}
if (__VLS_ctx.total > 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "favorites-pagination" },
    });
    const __VLS_72 = {}.ElPagination;
    /** @type {[typeof __VLS_components.ElPagination, typeof __VLS_components.elPagination, ]} */ ;
    // @ts-ignore
    const __VLS_73 = __VLS_asFunctionalComponent(__VLS_72, new __VLS_72({
        ...{ 'onSizeChange': {} },
        ...{ 'onCurrentChange': {} },
        currentPage: (__VLS_ctx.page),
        pageSize: (__VLS_ctx.size),
        pageSizes: ([6, 12, 18, 24]),
        total: (__VLS_ctx.total),
        layout: "total, sizes, prev, pager, next, jumper",
        background: true,
    }));
    const __VLS_74 = __VLS_73({
        ...{ 'onSizeChange': {} },
        ...{ 'onCurrentChange': {} },
        currentPage: (__VLS_ctx.page),
        pageSize: (__VLS_ctx.size),
        pageSizes: ([6, 12, 18, 24]),
        total: (__VLS_ctx.total),
        layout: "total, sizes, prev, pager, next, jumper",
        background: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_73));
    let __VLS_76;
    let __VLS_77;
    let __VLS_78;
    const __VLS_79 = {
        onSizeChange: (__VLS_ctx.handlePageChange)
    };
    const __VLS_80 = {
        onCurrentChange: (__VLS_ctx.handlePageChange)
    };
    var __VLS_75;
}
var __VLS_2;
/** @type {__VLS_StyleScopedClasses['favorites-page']} */ ;
/** @type {__VLS_StyleScopedClasses['favorites-header']} */ ;
/** @type {__VLS_StyleScopedClasses['favorites-title']} */ ;
/** @type {__VLS_StyleScopedClasses['favorites-subtitle']} */ ;
/** @type {__VLS_StyleScopedClasses['favorites-tabs-wrapper']} */ ;
/** @type {__VLS_StyleScopedClasses['favorites-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['favorites-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['favorites-skeleton']} */ ;
/** @type {__VLS_StyleScopedClasses['favorites-skeleton-inner']} */ ;
/** @type {__VLS_StyleScopedClasses['favorites-empty']} */ ;
/** @type {__VLS_StyleScopedClasses['favorites-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['fav-card']} */ ;
/** @type {__VLS_StyleScopedClasses['fav-card__inner']} */ ;
/** @type {__VLS_StyleScopedClasses['fav-card__top']} */ ;
/** @type {__VLS_StyleScopedClasses['fav-card__badge']} */ ;
/** @type {__VLS_StyleScopedClasses['fav-card__remove-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['fav-card__body']} */ ;
/** @type {__VLS_StyleScopedClasses['fav-card__target-label']} */ ;
/** @type {__VLS_StyleScopedClasses['fav-card__target-id']} */ ;
/** @type {__VLS_StyleScopedClasses['fav-card__target-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['fav-card__target-text']} */ ;
/** @type {__VLS_StyleScopedClasses['fav-card__date']} */ ;
/** @type {__VLS_StyleScopedClasses['fav-card__date-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['fav-card__accent']} */ ;
/** @type {__VLS_StyleScopedClasses['favorites-pagination']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            Delete: Delete,
            DefaultLayout: DefaultLayout,
            activeType: activeType,
            page: page,
            size: size,
            favorites: favorites,
            total: total,
            loading: loading,
            removingId: removingId,
            getTypeLabel: getTypeLabel,
            getTypeIcon: getTypeIcon,
            getTypeTagType: getTypeTagType,
            formatDate: formatDate,
            handleTabChange: handleTabChange,
            handlePageChange: handlePageChange,
            handleRemove: handleRemove,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
