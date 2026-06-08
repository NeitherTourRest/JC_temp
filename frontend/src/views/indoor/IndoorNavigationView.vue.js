/// <reference types="../../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { ref, computed, onMounted } from 'vue';
import DefaultLayout from '@/layouts/DefaultLayout.vue';
import { indoorApi } from '@/api/indoorApi';
const floors = ['B1', 'F1', 'F2', 'F3', 'F4', 'F5'];
const currentFloor = ref('F1');
const fromNode = ref('');
const toNode = ref('');
const loading = ref(false);
const result = ref(null);
const error = ref('');
const selectMode = ref(null);
const floorPlanUrls = ref({});
const allNodes = ref([]);
onMounted(async () => { await loadNodes(); });
function getNodesByFloor(floor) {
    // For selection, show CLASSROOM, LAB, ENTRANCE, LOBBY, TOILET, OFFICE, STAIRS, ELEVATOR
    // Hide CORRIDOR intermediate nodes
    return allNodes.value.filter(n => n.floor === floor && n.type !== 'CORRIDOR');
}
async function loadNodes() {
    try {
        const r = await indoorApi.getBuilding('BUPT_ZHONGHE_ZONGHE');
        if (r.data.data?.nodes?.length) {
            allNodes.value = r.data.data.nodes;
            if (r.data.data.floorPlans)
                floorPlanUrls.value = r.data.data.floorPlans;
            return;
        }
    }
    catch {
        // silently fail — empty state
    }
}
function getFloorPlanUrl(floor) {
    if (floorPlanUrls.value[floor])
        return floorPlanUrls.value[floor];
    return `/images/indoor/BUPT_ZHONGHE_ZONGHE/${floor}.jpg`;
}
function toggleSelect(mode) {
    selectMode.value = selectMode.value === mode ? null : mode;
}
function onPlanClick(e) {
    if (!selectMode.value)
        return;
    const img = e.currentTarget;
    const rect = img.getBoundingClientRect();
    const natW = img.naturalWidth || 2000;
    const natH = img.naturalHeight || 1500;
    const scaleX = natW / rect.width;
    const scaleY = natH / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    // Find nearest node on this floor
    const nodes = allNodes.value.length > 0 ? allNodes.value : [];
    const candidates = nodes.filter(n => n.floor === currentFloor.value && n.type !== 'CORRIDOR');
    if (!candidates.length)
        return;
    const nearest = candidates.reduce((best, n) => {
        const d = Math.sqrt((n.x - x) ** 2 + (n.y - y) ** 2);
        return d < best.dist ? { node: n, dist: d } : best;
    }, { node: null, dist: 200 });
    if (nearest.node && nearest.dist < 150) {
        if (selectMode.value === 'start') {
            fromNode.value = nearest.node.id;
            selectMode.value = null;
        }
        else {
            toNode.value = nearest.node.id;
            selectMode.value = null;
        }
    }
}
const selectedNodes = computed(() => {
    const result = [];
    const src = allNodes.value;
    const start = src.find(n => n.id === fromNode.value);
    const end = src.find(n => n.id === toNode.value);
    if (start && start.floor === currentFloor.value)
        result.push({ ...start, role: 'start' });
    if (end && end.floor === currentFloor.value)
        result.push({ ...end, role: 'end' });
    return result;
});
const pathSegments = computed(() => {
    if (!result.value)
        return [];
    const segs = [];
    for (const s of result.value.steps) {
        if (s.crossFloor) {
            if (s.fromFloor === currentFloor.value || s.toFloor === currentFloor.value) {
                segs.push({ x1: s.fromX, y1: s.fromY, x2: s.toX, y2: s.toY, crossFloor: true });
            }
        }
        else if (s.fromFloor === currentFloor.value) {
            segs.push({ x1: s.fromX, y1: s.fromY, x2: s.toX, y2: s.toY, crossFloor: false });
        }
    }
    return segs;
});
const lastPoint = computed(() => {
    if (!result.value || !result.value.steps.length)
        return { x: 0, y: 0 };
    const steps = result.value.steps;
    for (let i = steps.length - 1; i >= 0; i--) {
        if (steps[i].toFloor === currentFloor.value)
            return { x: steps[i].toX, y: steps[i].toY };
    }
    return { x: steps[steps.length - 1].toX, y: steps[steps.length - 1].toY };
});
const svgViewBox = computed(() => {
    let mx = 2000, my = 1500;
    for (const n of allNodes.value) {
        if (n.x > mx)
            mx = n.x;
        if (n.y > my)
            my = n.y;
    }
    return `0 0 ${mx + 100} ${my + 100}`;
});
async function navigate() {
    if (!fromNode.value || !toNode.value)
        return;
    loading.value = true;
    error.value = '';
    result.value = null;
    try {
        const res = await indoorApi.navigate('BUPT_ZHONGHE_ZONGHE', fromNode.value, toNode.value);
        if (res.data.data.success) {
            result.value = res.data.data;
            if (res.data.data.floorPlans)
                floorPlanUrls.value = res.data.data.floorPlans;
            const start = allNodes.value.find(n => n.id === fromNode.value);
            if (start)
                currentFloor.value = start.floor;
        }
        else {
            error.value = res.data.data.error || '未找到路径';
        }
    }
    catch {
        error.value = '请求失败，请检查后端是否运行';
    }
    finally {
        loading.value = false;
    }
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['panel-section']} */ ;
/** @type {__VLS_StyleScopedClasses['node-select-row']} */ ;
/** @type {__VLS_StyleScopedClasses['step-item']} */ ;
/** @type {__VLS_StyleScopedClasses['floor-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['floor-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['floor-plan']} */ ;
/** @type {__VLS_StyleScopedClasses['node-marker']} */ ;
/** @type {__VLS_StyleScopedClasses['node-marker']} */ ;
/** @type {__VLS_StyleScopedClasses['path-line']} */ ;
// CSS variable injection 
// CSS variable injection end 
/** @type {[typeof DefaultLayout, typeof DefaultLayout, ]} */ ;
// @ts-ignore
const __VLS_0 = __VLS_asFunctionalComponent(DefaultLayout, new DefaultLayout({}));
const __VLS_1 = __VLS_0({}, ...__VLS_functionalComponentArgsRest(__VLS_0));
var __VLS_3 = {};
__VLS_2.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "indoor-page" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "page-header" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "main-layout" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "control-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "panel-section" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "node-select-row" },
});
const __VLS_4 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
    modelValue: (__VLS_ctx.fromNode),
    filterable: true,
    placeholder: "选择或点击地图选起点",
    size: "large",
    ...{ style: {} },
}));
const __VLS_6 = __VLS_5({
    modelValue: (__VLS_ctx.fromNode),
    filterable: true,
    placeholder: "选择或点击地图选起点",
    size: "large",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_5));
__VLS_7.slots.default;
for (const [floor] of __VLS_getVForSourceType((__VLS_ctx.floors))) {
    const __VLS_8 = {}.ElOptionGroup;
    /** @type {[typeof __VLS_components.ElOptionGroup, typeof __VLS_components.elOptionGroup, typeof __VLS_components.ElOptionGroup, typeof __VLS_components.elOptionGroup, ]} */ ;
    // @ts-ignore
    const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
        key: (floor),
        label: (`${floor}层`),
    }));
    const __VLS_10 = __VLS_9({
        key: (floor),
        label: (`${floor}层`),
    }, ...__VLS_functionalComponentArgsRest(__VLS_9));
    __VLS_11.slots.default;
    for (const [node] of __VLS_getVForSourceType((__VLS_ctx.getNodesByFloor(floor)))) {
        const __VLS_12 = {}.ElOption;
        /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
        // @ts-ignore
        const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
            key: (node.id),
            label: (node.name),
            value: (node.id),
        }));
        const __VLS_14 = __VLS_13({
            key: (node.id),
            label: (node.name),
            value: (node.id),
        }, ...__VLS_functionalComponentArgsRest(__VLS_13));
    }
    var __VLS_11;
}
var __VLS_7;
const __VLS_16 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
    ...{ 'onClick': {} },
    type: (__VLS_ctx.selectMode === 'start' ? 'warning' : 'default'),
    size: "small",
}));
const __VLS_18 = __VLS_17({
    ...{ 'onClick': {} },
    type: (__VLS_ctx.selectMode === 'start' ? 'warning' : 'default'),
    size: "small",
}, ...__VLS_functionalComponentArgsRest(__VLS_17));
let __VLS_20;
let __VLS_21;
let __VLS_22;
const __VLS_23 = {
    onClick: (...[$event]) => {
        __VLS_ctx.toggleSelect('start');
    }
};
__VLS_19.slots.default;
(__VLS_ctx.selectMode === 'start' ? '点图中↑' : '选点');
var __VLS_19;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "panel-section" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "node-select-row" },
});
const __VLS_24 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
    modelValue: (__VLS_ctx.toNode),
    filterable: true,
    placeholder: "选择或点击地图选终点",
    size: "large",
    ...{ style: {} },
}));
const __VLS_26 = __VLS_25({
    modelValue: (__VLS_ctx.toNode),
    filterable: true,
    placeholder: "选择或点击地图选终点",
    size: "large",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_25));
__VLS_27.slots.default;
for (const [floor] of __VLS_getVForSourceType((__VLS_ctx.floors))) {
    const __VLS_28 = {}.ElOptionGroup;
    /** @type {[typeof __VLS_components.ElOptionGroup, typeof __VLS_components.elOptionGroup, typeof __VLS_components.ElOptionGroup, typeof __VLS_components.elOptionGroup, ]} */ ;
    // @ts-ignore
    const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({
        key: (floor),
        label: (`${floor}层`),
    }));
    const __VLS_30 = __VLS_29({
        key: (floor),
        label: (`${floor}层`),
    }, ...__VLS_functionalComponentArgsRest(__VLS_29));
    __VLS_31.slots.default;
    for (const [node] of __VLS_getVForSourceType((__VLS_ctx.getNodesByFloor(floor)))) {
        const __VLS_32 = {}.ElOption;
        /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
        // @ts-ignore
        const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
            key: (node.id),
            label: (node.name),
            value: (node.id),
        }));
        const __VLS_34 = __VLS_33({
            key: (node.id),
            label: (node.name),
            value: (node.id),
        }, ...__VLS_functionalComponentArgsRest(__VLS_33));
    }
    var __VLS_31;
}
var __VLS_27;
const __VLS_36 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
    ...{ 'onClick': {} },
    type: (__VLS_ctx.selectMode === 'end' ? 'warning' : 'default'),
    size: "small",
}));
const __VLS_38 = __VLS_37({
    ...{ 'onClick': {} },
    type: (__VLS_ctx.selectMode === 'end' ? 'warning' : 'default'),
    size: "small",
}, ...__VLS_functionalComponentArgsRest(__VLS_37));
let __VLS_40;
let __VLS_41;
let __VLS_42;
const __VLS_43 = {
    onClick: (...[$event]) => {
        __VLS_ctx.toggleSelect('end');
    }
};
__VLS_39.slots.default;
(__VLS_ctx.selectMode === 'end' ? '点图中↑' : '选点');
var __VLS_39;
const __VLS_44 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_45 = __VLS_asFunctionalComponent(__VLS_44, new __VLS_44({
    ...{ 'onClick': {} },
    type: "primary",
    size: "large",
    ...{ style: {} },
    loading: (__VLS_ctx.loading),
    disabled: (!__VLS_ctx.fromNode || !__VLS_ctx.toNode),
}));
const __VLS_46 = __VLS_45({
    ...{ 'onClick': {} },
    type: "primary",
    size: "large",
    ...{ style: {} },
    loading: (__VLS_ctx.loading),
    disabled: (!__VLS_ctx.fromNode || !__VLS_ctx.toNode),
}, ...__VLS_functionalComponentArgsRest(__VLS_45));
let __VLS_48;
let __VLS_49;
let __VLS_50;
const __VLS_51 = {
    onClick: (__VLS_ctx.navigate)
};
__VLS_47.slots.default;
var __VLS_47;
if (__VLS_ctx.result) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "result-section" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "result-summary" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.result.totalDistance.toFixed(0));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.result.steps.length);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "step-list" },
    });
    for (const [step, i] of __VLS_getVForSourceType((__VLS_ctx.result.steps))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (i),
            ...{ class: (['step-item', { 'cross-floor': step.crossFloor }]) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "step-num" },
        });
        (i + 1);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "step-content" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "step-text" },
        });
        (step.instruction);
        if (!step.crossFloor) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "step-meta" },
            });
            (step.fromFloor);
            (step.distance.toFixed(0));
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "step-meta" },
            });
            (step.fromFloor);
            (step.toFloor);
        }
        if (step.crossFloor) {
            const __VLS_52 = {}.ElTag;
            /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
            // @ts-ignore
            const __VLS_53 = __VLS_asFunctionalComponent(__VLS_52, new __VLS_52({
                type: "warning",
                size: "small",
            }));
            const __VLS_54 = __VLS_53({
                type: "warning",
                size: "small",
            }, ...__VLS_functionalComponentArgsRest(__VLS_53));
            __VLS_55.slots.default;
            var __VLS_55;
        }
    }
}
if (__VLS_ctx.error) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "error-msg" },
    });
    (__VLS_ctx.error);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "map-area" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "floor-switcher" },
});
for (const [f] of __VLS_getVForSourceType((__VLS_ctx.floors))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.currentFloor = f;
            } },
        key: (f),
        ...{ class: (['floor-btn', { active: __VLS_ctx.currentFloor === f }]) },
    });
    (f);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "floor-plan-wrapper" },
    ref: "planWrapper",
});
/** @type {typeof __VLS_ctx.planWrapper} */ ;
__VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
    ...{ onClick: (__VLS_ctx.onPlanClick) },
    src: (__VLS_ctx.getFloorPlanUrl(__VLS_ctx.currentFloor)),
    ...{ class: "floor-plan" },
    ...{ class: ({ 'clickable': !!__VLS_ctx.selectMode }) },
    draggable: "false",
});
for (const [node] of __VLS_getVForSourceType((__VLS_ctx.selectedNodes))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        key: (node.id),
        ...{ class: "node-marker" },
        ...{ class: (node.role) },
        ...{ style: ({ left: node.x + 'px', top: node.y + 'px' }) },
    });
    (node.role === 'start' ? '起' : '终');
}
if (__VLS_ctx.pathSegments.length) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
        ...{ class: "path-overlay" },
        viewBox: (__VLS_ctx.svgViewBox),
    });
    for (const [seg, i] of __VLS_getVForSourceType((__VLS_ctx.pathSegments))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.line)({
            key: (i),
            x1: (seg.x1),
            y1: (seg.y1),
            x2: (seg.x2),
            y2: (seg.y2),
            ...{ class: (['path-line', { 'cross-floor-line': seg.crossFloor }]) },
            'stroke-width': (seg.crossFloor ? 2 : 4),
        });
    }
    for (const [seg, i] of __VLS_getVForSourceType((__VLS_ctx.pathSegments))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.circle)({
            key: ('dot' + i),
            cx: (seg.x1),
            cy: (seg.y1),
            r: "3",
            fill: "#409EFF",
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.circle)({
        cx: (__VLS_ctx.lastPoint.x),
        cy: (__VLS_ctx.lastPoint.y),
        r: "4",
        fill: "#F56C6C",
    });
}
if (__VLS_ctx.selectMode) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "select-hint" },
    });
    (__VLS_ctx.selectMode === 'start' ? '起点' : '终点');
}
var __VLS_2;
/** @type {__VLS_StyleScopedClasses['indoor-page']} */ ;
/** @type {__VLS_StyleScopedClasses['page-header']} */ ;
/** @type {__VLS_StyleScopedClasses['main-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['control-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-section']} */ ;
/** @type {__VLS_StyleScopedClasses['node-select-row']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-section']} */ ;
/** @type {__VLS_StyleScopedClasses['node-select-row']} */ ;
/** @type {__VLS_StyleScopedClasses['result-section']} */ ;
/** @type {__VLS_StyleScopedClasses['result-summary']} */ ;
/** @type {__VLS_StyleScopedClasses['step-list']} */ ;
/** @type {__VLS_StyleScopedClasses['step-num']} */ ;
/** @type {__VLS_StyleScopedClasses['step-content']} */ ;
/** @type {__VLS_StyleScopedClasses['step-text']} */ ;
/** @type {__VLS_StyleScopedClasses['step-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['step-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['error-msg']} */ ;
/** @type {__VLS_StyleScopedClasses['map-area']} */ ;
/** @type {__VLS_StyleScopedClasses['floor-switcher']} */ ;
/** @type {__VLS_StyleScopedClasses['floor-plan-wrapper']} */ ;
/** @type {__VLS_StyleScopedClasses['floor-plan']} */ ;
/** @type {__VLS_StyleScopedClasses['node-marker']} */ ;
/** @type {__VLS_StyleScopedClasses['path-overlay']} */ ;
/** @type {__VLS_StyleScopedClasses['select-hint']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            DefaultLayout: DefaultLayout,
            floors: floors,
            currentFloor: currentFloor,
            fromNode: fromNode,
            toNode: toNode,
            loading: loading,
            result: result,
            error: error,
            selectMode: selectMode,
            getNodesByFloor: getNodesByFloor,
            getFloorPlanUrl: getFloorPlanUrl,
            toggleSelect: toggleSelect,
            onPlanClick: onPlanClick,
            selectedNodes: selectedNodes,
            pathSegments: pathSegments,
            lastPoint: lastPoint,
            svgViewBox: svgViewBox,
            navigate: navigate,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
