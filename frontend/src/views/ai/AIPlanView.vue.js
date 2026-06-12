/// <reference types="../../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { ref } from 'vue';
import DefaultLayout from '@/layouts/DefaultLayout.vue';
import { aiApi } from '@/api/aiApi';
const loading = ref(false);
const result = ref(null);
const form = ref({ days: 2, interests: '自然风光,历史古迹', budget: '中', transport: '步行', additionalInfo: '' });
async function generate() {
    loading.value = true;
    result.value = null;
    try {
        const res = await aiApi.plan(form.value);
        result.value = res.data.data;
    }
    catch {
        result.value = { title: '生成计划失败', days: [], tips: ['请检查AI配置。'], estimatedCost: '' };
    }
    finally {
        loading.value = false;
    }
}
function formatTime(seconds) {
    if (!seconds || seconds <= 0)
        return '';
    if (seconds < 60)
        return Math.round(seconds) + '秒';
    if (seconds < 3600)
        return Math.round(seconds / 60) + '分钟';
    const h = Math.floor(seconds / 3600);
    const m = Math.round((seconds % 3600) / 60);
    return h + '小时' + (m > 0 ? m + '分钟' : '');
}
function matchLabel(type) {
    const map = { spot: '景点', food: '美食', amap_geocode: '高德', amap_poi: 'POI', none: '未匹配' };
    return map[type] || type;
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['raw-fallback']} */ ;
// CSS variable injection 
// CSS variable injection end 
/** @type {[typeof DefaultLayout, typeof DefaultLayout, ]} */ ;
// @ts-ignore
const __VLS_0 = __VLS_asFunctionalComponent(DefaultLayout, new DefaultLayout({}));
const __VLS_1 = __VLS_0({}, ...__VLS_functionalComponentArgsRest(__VLS_0));
var __VLS_3 = {};
__VLS_2.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "ai-page" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "page-header" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
    ...{ class: "page-title" },
});
const __VLS_4 = {}.ElRow;
/** @type {[typeof __VLS_components.ElRow, typeof __VLS_components.elRow, typeof __VLS_components.ElRow, typeof __VLS_components.elRow, ]} */ ;
// @ts-ignore
const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
    gutter: (20),
}));
const __VLS_6 = __VLS_5({
    gutter: (20),
}, ...__VLS_functionalComponentArgsRest(__VLS_5));
__VLS_7.slots.default;
const __VLS_8 = {}.ElCol;
/** @type {[typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ]} */ ;
// @ts-ignore
const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
    span: (10),
}));
const __VLS_10 = __VLS_9({
    span: (10),
}, ...__VLS_functionalComponentArgsRest(__VLS_9));
__VLS_11.slots.default;
const __VLS_12 = {}.ElCard;
/** @type {[typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ]} */ ;
// @ts-ignore
const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
    ...{ class: "form-card" },
}));
const __VLS_14 = __VLS_13({
    ...{ class: "form-card" },
}, ...__VLS_functionalComponentArgsRest(__VLS_13));
__VLS_15.slots.default;
const __VLS_16 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
    labelPosition: "top",
}));
const __VLS_18 = __VLS_17({
    labelPosition: "top",
}, ...__VLS_functionalComponentArgsRest(__VLS_17));
__VLS_19.slots.default;
const __VLS_20 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
    label: "天数",
}));
const __VLS_22 = __VLS_21({
    label: "天数",
}, ...__VLS_functionalComponentArgsRest(__VLS_21));
__VLS_23.slots.default;
const __VLS_24 = {}.ElInputNumber;
/** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
// @ts-ignore
const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
    modelValue: (__VLS_ctx.form.days),
    min: (1),
    max: (14),
}));
const __VLS_26 = __VLS_25({
    modelValue: (__VLS_ctx.form.days),
    min: (1),
    max: (14),
}, ...__VLS_functionalComponentArgsRest(__VLS_25));
var __VLS_23;
const __VLS_28 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({
    label: "兴趣偏好",
}));
const __VLS_30 = __VLS_29({
    label: "兴趣偏好",
}, ...__VLS_functionalComponentArgsRest(__VLS_29));
__VLS_31.slots.default;
const __VLS_32 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
    modelValue: (__VLS_ctx.form.interests),
    placeholder: "例如：自然风光、历史古迹",
}));
const __VLS_34 = __VLS_33({
    modelValue: (__VLS_ctx.form.interests),
    placeholder: "例如：自然风光、历史古迹",
}, ...__VLS_functionalComponentArgsRest(__VLS_33));
var __VLS_31;
const __VLS_36 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
    label: "预算水平",
}));
const __VLS_38 = __VLS_37({
    label: "预算水平",
}, ...__VLS_functionalComponentArgsRest(__VLS_37));
__VLS_39.slots.default;
const __VLS_40 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
    modelValue: (__VLS_ctx.form.budget),
}));
const __VLS_42 = __VLS_41({
    modelValue: (__VLS_ctx.form.budget),
}, ...__VLS_functionalComponentArgsRest(__VLS_41));
__VLS_43.slots.default;
const __VLS_44 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_45 = __VLS_asFunctionalComponent(__VLS_44, new __VLS_44({
    label: "低",
    value: "低",
}));
const __VLS_46 = __VLS_45({
    label: "低",
    value: "低",
}, ...__VLS_functionalComponentArgsRest(__VLS_45));
const __VLS_48 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
    label: "中",
    value: "中",
}));
const __VLS_50 = __VLS_49({
    label: "中",
    value: "中",
}, ...__VLS_functionalComponentArgsRest(__VLS_49));
const __VLS_52 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_53 = __VLS_asFunctionalComponent(__VLS_52, new __VLS_52({
    label: "高",
    value: "高",
}));
const __VLS_54 = __VLS_53({
    label: "高",
    value: "高",
}, ...__VLS_functionalComponentArgsRest(__VLS_53));
var __VLS_43;
var __VLS_39;
const __VLS_56 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_57 = __VLS_asFunctionalComponent(__VLS_56, new __VLS_56({
    label: "出行方式",
}));
const __VLS_58 = __VLS_57({
    label: "出行方式",
}, ...__VLS_functionalComponentArgsRest(__VLS_57));
__VLS_59.slots.default;
const __VLS_60 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_61 = __VLS_asFunctionalComponent(__VLS_60, new __VLS_60({
    modelValue: (__VLS_ctx.form.transport),
}));
const __VLS_62 = __VLS_61({
    modelValue: (__VLS_ctx.form.transport),
}, ...__VLS_functionalComponentArgsRest(__VLS_61));
__VLS_63.slots.default;
const __VLS_64 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_65 = __VLS_asFunctionalComponent(__VLS_64, new __VLS_64({
    label: "步行",
    value: "步行",
}));
const __VLS_66 = __VLS_65({
    label: "步行",
    value: "步行",
}, ...__VLS_functionalComponentArgsRest(__VLS_65));
const __VLS_68 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_69 = __VLS_asFunctionalComponent(__VLS_68, new __VLS_68({
    label: "骑行",
    value: "骑行",
}));
const __VLS_70 = __VLS_69({
    label: "骑行",
    value: "骑行",
}, ...__VLS_functionalComponentArgsRest(__VLS_69));
const __VLS_72 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_73 = __VLS_asFunctionalComponent(__VLS_72, new __VLS_72({
    label: "驾车",
    value: "驾车",
}));
const __VLS_74 = __VLS_73({
    label: "驾车",
    value: "驾车",
}, ...__VLS_functionalComponentArgsRest(__VLS_73));
var __VLS_63;
var __VLS_59;
const __VLS_76 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_77 = __VLS_asFunctionalComponent(__VLS_76, new __VLS_76({
    label: "额外要求",
}));
const __VLS_78 = __VLS_77({
    label: "额外要求",
}, ...__VLS_functionalComponentArgsRest(__VLS_77));
__VLS_79.slots.default;
const __VLS_80 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_81 = __VLS_asFunctionalComponent(__VLS_80, new __VLS_80({
    modelValue: (__VLS_ctx.form.additionalInfo),
    type: "textarea",
    rows: (3),
    placeholder: "有什么特殊需求...",
}));
const __VLS_82 = __VLS_81({
    modelValue: (__VLS_ctx.form.additionalInfo),
    type: "textarea",
    rows: (3),
    placeholder: "有什么特殊需求...",
}, ...__VLS_functionalComponentArgsRest(__VLS_81));
var __VLS_79;
const __VLS_84 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_85 = __VLS_asFunctionalComponent(__VLS_84, new __VLS_84({
    ...{ 'onClick': {} },
    type: "primary",
    loading: (__VLS_ctx.loading),
    ...{ style: {} },
}));
const __VLS_86 = __VLS_85({
    ...{ 'onClick': {} },
    type: "primary",
    loading: (__VLS_ctx.loading),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_85));
let __VLS_88;
let __VLS_89;
let __VLS_90;
const __VLS_91 = {
    onClick: (__VLS_ctx.generate)
};
__VLS_87.slots.default;
var __VLS_87;
var __VLS_19;
var __VLS_15;
var __VLS_11;
const __VLS_92 = {}.ElCol;
/** @type {[typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ]} */ ;
// @ts-ignore
const __VLS_93 = __VLS_asFunctionalComponent(__VLS_92, new __VLS_92({
    span: (14),
}));
const __VLS_94 = __VLS_93({
    span: (14),
}, ...__VLS_functionalComponentArgsRest(__VLS_93));
__VLS_95.slots.default;
const __VLS_96 = {}.ElCard;
/** @type {[typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ]} */ ;
// @ts-ignore
const __VLS_97 = __VLS_asFunctionalComponent(__VLS_96, new __VLS_96({
    ...{ class: "result-card" },
}));
const __VLS_98 = __VLS_97({
    ...{ class: "result-card" },
}, ...__VLS_functionalComponentArgsRest(__VLS_97));
__VLS_99.slots.default;
if (!__VLS_ctx.result && !__VLS_ctx.loading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "empty" },
    });
}
if (__VLS_ctx.loading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "empty" },
    });
}
if (__VLS_ctx.result) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
        ...{ class: "plan-title" },
    });
    (__VLS_ctx.result.title);
    for (const [day] of __VLS_getVForSourceType((__VLS_ctx.result.days))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (day.day),
            ...{ class: "day-block" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({
            ...{ class: "day-header" },
        });
        (day.date);
        (day.theme);
        if (day.routeTotalDistance) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "day-route-summary" },
            });
            ((day.routeTotalDistance / 1000).toFixed(1));
            (__VLS_ctx.formatTime(day.routeTotalTime));
        }
        for (const [act, ai] of __VLS_getVForSourceType((day.schedule))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                key: (act.time),
                ...{ class: "activity" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "act-time" },
            });
            (act.time);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "act-name" },
            });
            (act.activity);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "act-loc" },
            });
            (act.location);
            if (act.routePrevDistance) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "act-route" },
                });
                ((act.routePrevDistance / 1000).toFixed(1));
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "route-time" },
                });
                (__VLS_ctx.formatTime(act.routePrevTime));
            }
            if (act.matchedType) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "act-match-tag" },
                    ...{ class: ('tag-' + act.matchedType) },
                });
                (__VLS_ctx.matchLabel(act.matchedType));
            }
        }
    }
    if (__VLS_ctx.result.tips?.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "tips-section" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
        for (const [tip, i] of __VLS_getVForSourceType((__VLS_ctx.result.tips))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                key: (i),
            });
            (tip);
        }
    }
    if (__VLS_ctx.result.estimatedCost) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "cost-tag" },
        });
        (__VLS_ctx.result.estimatedCost);
    }
    if (__VLS_ctx.result.rawResponse) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "raw-fallback" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.pre, __VLS_intrinsicElements.pre)({});
        (__VLS_ctx.result.rawResponse);
    }
}
var __VLS_99;
var __VLS_95;
var __VLS_7;
var __VLS_2;
/** @type {__VLS_StyleScopedClasses['ai-page']} */ ;
/** @type {__VLS_StyleScopedClasses['page-header']} */ ;
/** @type {__VLS_StyleScopedClasses['page-title']} */ ;
/** @type {__VLS_StyleScopedClasses['form-card']} */ ;
/** @type {__VLS_StyleScopedClasses['result-card']} */ ;
/** @type {__VLS_StyleScopedClasses['empty']} */ ;
/** @type {__VLS_StyleScopedClasses['empty']} */ ;
/** @type {__VLS_StyleScopedClasses['plan-title']} */ ;
/** @type {__VLS_StyleScopedClasses['day-block']} */ ;
/** @type {__VLS_StyleScopedClasses['day-header']} */ ;
/** @type {__VLS_StyleScopedClasses['day-route-summary']} */ ;
/** @type {__VLS_StyleScopedClasses['activity']} */ ;
/** @type {__VLS_StyleScopedClasses['act-time']} */ ;
/** @type {__VLS_StyleScopedClasses['act-name']} */ ;
/** @type {__VLS_StyleScopedClasses['act-loc']} */ ;
/** @type {__VLS_StyleScopedClasses['act-route']} */ ;
/** @type {__VLS_StyleScopedClasses['route-time']} */ ;
/** @type {__VLS_StyleScopedClasses['act-match-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['tips-section']} */ ;
/** @type {__VLS_StyleScopedClasses['cost-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['raw-fallback']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            DefaultLayout: DefaultLayout,
            loading: loading,
            result: result,
            form: form,
            generate: generate,
            formatTime: formatTime,
            matchLabel: matchLabel,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
