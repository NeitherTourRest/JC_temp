/// <reference types="../../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElImageViewer, ElMessageBox } from 'element-plus';
import DefaultLayout from '@/layouts/DefaultLayout.vue';
import { diaryApi } from '@/api/diaryApi';
const route = useRoute();
const router = useRouter();
const diary = ref(null);
const loading = ref(true);
const rating = ref(0);
const previewIdx = ref(0);
const showPreview = ref(false);
const isOwner = computed(() => diary.value?.userId === 1); // simplified
const rendered = computed(() => {
    let t = diary.value?.content || '';
    t = t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    t = t.replace(/\n/g, '<br>');
    return t;
});
async function del() {
    if (!diary.value)
        return;
    try {
        await ElMessageBox.confirm('Delete?', 'Confirm', { type: 'warning' });
        await diaryApi.del(diary.value.id);
        ElMessage.success('Deleted');
        router.push('/diaries');
    }
    catch (e) {
        if (e !== 'cancel')
            console.error('Delete diary error:', e);
    }
}
async function rate(v) { try {
    await diaryApi.rate(diary.value.id, v);
    ElMessage.success('Rated!');
}
catch (e) {
    console.error('Rate error:', e);
    ElMessage.error('Failed');
} }
onMounted(async () => {
    try {
        const r = await diaryApi.get(route.params.id);
        diary.value = r.data.data;
    }
    catch (e) {
        console.error('Load diary error:', e);
    }
    finally {
        loading.value = false;
    }
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['back-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['hero']} */ ;
/** @type {__VLS_StyleScopedClasses['gallery']} */ ;
/** @type {__VLS_StyleScopedClasses['gallery']} */ ;
/** @type {__VLS_StyleScopedClasses['hero']} */ ;
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
if (__VLS_ctx.loading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "center" },
    });
}
else if (!__VLS_ctx.diary) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "center" },
    });
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "content" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!!(__VLS_ctx.loading))
                    return;
                if (!!(!__VLS_ctx.diary))
                    return;
                __VLS_ctx.$router.push('/diaries');
            } },
        ...{ class: "back-btn" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "hero glass" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({});
    (__VLS_ctx.diary.title);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "hero-meta" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.diary.userId);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.diary.avgRating?.toFixed(1) || '—');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.diary.popularity);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.diary.createdAt?.substring(0, 10));
    if (__VLS_ctx.diary.destination) {
        const __VLS_4 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
            size: "small",
            type: "warning",
            ...{ style: {} },
        }));
        const __VLS_6 = __VLS_5({
            size: "small",
            type: "warning",
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_5));
        __VLS_7.slots.default;
        (__VLS_ctx.diary.destination);
        var __VLS_7;
    }
    if (__VLS_ctx.isOwner) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "actions" },
        });
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
                if (!!(__VLS_ctx.loading))
                    return;
                if (!!(!__VLS_ctx.diary))
                    return;
                if (!(__VLS_ctx.isOwner))
                    return;
                __VLS_ctx.$router.push('/diaries/' + __VLS_ctx.diary.id + '/edit');
            }
        };
        __VLS_11.slots.default;
        var __VLS_11;
        const __VLS_16 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
            ...{ 'onClick': {} },
            type: "danger",
        }));
        const __VLS_18 = __VLS_17({
            ...{ 'onClick': {} },
            type: "danger",
        }, ...__VLS_functionalComponentArgsRest(__VLS_17));
        let __VLS_20;
        let __VLS_21;
        let __VLS_22;
        const __VLS_23 = {
            onClick: (__VLS_ctx.del)
        };
        __VLS_19.slots.default;
        var __VLS_19;
    }
    if (__VLS_ctx.diary.images?.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "gallery glass" },
        });
        for (const [img, i] of __VLS_getVForSourceType((__VLS_ctx.diary.images))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
                ...{ onClick: (...[$event]) => {
                        if (!!(__VLS_ctx.loading))
                            return;
                        if (!!(!__VLS_ctx.diary))
                            return;
                        if (!(__VLS_ctx.diary.images?.length))
                            return;
                        __VLS_ctx.previewIdx = i;
                        __VLS_ctx.showPreview = true;
                    } },
                key: (i),
                src: (img),
            });
        }
    }
    if (__VLS_ctx.diary.videoMeta?.url) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "glass" },
            ...{ style: {} },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.video)({
            src: (__VLS_ctx.diary.videoMeta.url),
            controls: true,
            ...{ style: {} },
        });
    }
    if (__VLS_ctx.diary.musicUrl) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "glass" },
            ...{ style: {} },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.audio)({
            src: (__VLS_ctx.diary.musicUrl),
            controls: true,
            ...{ style: {} },
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "glass" },
        ...{ style: {} },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "diary-content" },
    });
    __VLS_asFunctionalDirective(__VLS_directives.vHtml)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.rendered) }, null, null);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "glass" },
        ...{ style: {} },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    const __VLS_24 = {}.ElRate;
    /** @type {[typeof __VLS_components.ElRate, typeof __VLS_components.elRate, ]} */ ;
    // @ts-ignore
    const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.rating),
        ...{ style: {} },
    }));
    const __VLS_26 = __VLS_25({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.rating),
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_25));
    let __VLS_28;
    let __VLS_29;
    let __VLS_30;
    const __VLS_31 = {
        onChange: (__VLS_ctx.rate)
    };
    var __VLS_27;
    if (__VLS_ctx.showPreview) {
        const __VLS_32 = {}.ElImageViewer;
        /** @type {[typeof __VLS_components.ElImageViewer, typeof __VLS_components.elImageViewer, ]} */ ;
        // @ts-ignore
        const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
            ...{ 'onClose': {} },
            urlList: (__VLS_ctx.diary.images || []),
            initialIndex: (__VLS_ctx.previewIdx),
        }));
        const __VLS_34 = __VLS_33({
            ...{ 'onClose': {} },
            urlList: (__VLS_ctx.diary.images || []),
            initialIndex: (__VLS_ctx.previewIdx),
        }, ...__VLS_functionalComponentArgsRest(__VLS_33));
        let __VLS_36;
        let __VLS_37;
        let __VLS_38;
        const __VLS_39 = {
            onClose: (...[$event]) => {
                if (!!(__VLS_ctx.loading))
                    return;
                if (!!(!__VLS_ctx.diary))
                    return;
                if (!(__VLS_ctx.showPreview))
                    return;
                __VLS_ctx.showPreview = false;
            }
        };
        var __VLS_35;
    }
}
var __VLS_2;
/** @type {__VLS_StyleScopedClasses['detail-page']} */ ;
/** @type {__VLS_StyleScopedClasses['center']} */ ;
/** @type {__VLS_StyleScopedClasses['center']} */ ;
/** @type {__VLS_StyleScopedClasses['content']} */ ;
/** @type {__VLS_StyleScopedClasses['back-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['hero']} */ ;
/** @type {__VLS_StyleScopedClasses['glass']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['actions']} */ ;
/** @type {__VLS_StyleScopedClasses['gallery']} */ ;
/** @type {__VLS_StyleScopedClasses['glass']} */ ;
/** @type {__VLS_StyleScopedClasses['glass']} */ ;
/** @type {__VLS_StyleScopedClasses['glass']} */ ;
/** @type {__VLS_StyleScopedClasses['glass']} */ ;
/** @type {__VLS_StyleScopedClasses['diary-content']} */ ;
/** @type {__VLS_StyleScopedClasses['glass']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            ElImageViewer: ElImageViewer,
            DefaultLayout: DefaultLayout,
            diary: diary,
            loading: loading,
            rating: rating,
            previewIdx: previewIdx,
            showPreview: showPreview,
            isOwner: isOwner,
            rendered: rendered,
            del: del,
            rate: rate,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
