/// <reference types="../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { userApi } from '@/api/userApi';
import { itineraryApi } from '@/api/itineraryApi';
const props = defineProps();
const emit = defineEmits();
const visible = ref(props.modelValue);
watch(() => props.modelValue, v => visible.value = v);
watch(visible, v => emit('update:modelValue', v));
const searchQuery = ref('');
const searchResults = ref([]);
const searchLoading = ref(false);
const invitingId = ref(null);
let searchTimer = null;
async function onSearchInput() {
    const q = searchQuery.value.trim();
    if (!q || q.length < 2) {
        searchResults.value = [];
        return;
    }
    if (searchTimer)
        clearTimeout(searchTimer);
    searchTimer = setTimeout(async () => {
        searchLoading.value = true;
        try {
            const r = await userApi.search(q);
            searchResults.value = r.data.data || [];
        }
        catch {
            searchResults.value = [];
        }
        finally {
            searchLoading.value = false;
        }
    }, 300);
}
async function doInvite(userId) {
    invitingId.value = userId;
    try {
        await itineraryApi.invite(props.itineraryId, userId);
        ElMessage.success('邀请已发送');
        emit('invited');
        searchQuery.value = '';
        searchResults.value = [];
    }
    catch (e) {
        ElMessage.error(e?.response?.data?.message || '邀请失败');
    }
    finally {
        invitingId.value = null;
    }
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
// CSS variable injection 
// CSS variable injection end 
const __VLS_0 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    modelValue: (__VLS_ctx.visible),
    title: "邀请协作者",
    width: "450px",
    top: "8vh",
    destroyOnClose: true,
}));
const __VLS_2 = __VLS_1({
    modelValue: (__VLS_ctx.visible),
    title: "邀请协作者",
    width: "450px",
    top: "8vh",
    destroyOnClose: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
var __VLS_4 = {};
__VLS_3.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "invite-body" },
});
const __VLS_5 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_6 = __VLS_asFunctionalComponent(__VLS_5, new __VLS_5({
    ...{ 'onInput': {} },
    modelValue: (__VLS_ctx.searchQuery),
    placeholder: "输入用户名搜索...",
    clearable: true,
}));
const __VLS_7 = __VLS_6({
    ...{ 'onInput': {} },
    modelValue: (__VLS_ctx.searchQuery),
    placeholder: "输入用户名搜索...",
    clearable: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_6));
let __VLS_9;
let __VLS_10;
let __VLS_11;
const __VLS_12 = {
    onInput: (__VLS_ctx.onSearchInput)
};
var __VLS_8;
if (__VLS_ctx.searchResults.length) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "search-results" },
    });
    for (const [u] of __VLS_getVForSourceType((__VLS_ctx.searchResults))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (u.id),
            ...{ class: "search-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "search-name" },
        });
        (u.nickname || u.username);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "search-uname" },
        });
        (u.username);
        const __VLS_13 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_14 = __VLS_asFunctionalComponent(__VLS_13, new __VLS_13({
            ...{ 'onClick': {} },
            size: "small",
            type: "primary",
            loading: (__VLS_ctx.invitingId === u.id),
        }));
        const __VLS_15 = __VLS_14({
            ...{ 'onClick': {} },
            size: "small",
            type: "primary",
            loading: (__VLS_ctx.invitingId === u.id),
        }, ...__VLS_functionalComponentArgsRest(__VLS_14));
        let __VLS_17;
        let __VLS_18;
        let __VLS_19;
        const __VLS_20 = {
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.searchResults.length))
                    return;
                __VLS_ctx.doInvite(u.id);
            }
        };
        __VLS_16.slots.default;
        var __VLS_16;
    }
}
else if (__VLS_ctx.searchQuery && !__VLS_ctx.searchLoading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "no-results" },
    });
}
if (__VLS_ctx.pendingInvites.length) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "section" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "section-title" },
    });
    for (const [inv] of __VLS_getVForSourceType((__VLS_ctx.pendingInvites))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (inv.id),
            ...{ class: "invite-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (inv.inviterName || '用户' + inv.inviterId);
        const __VLS_21 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_22 = __VLS_asFunctionalComponent(__VLS_21, new __VLS_21({
            size: "small",
            type: "warning",
        }));
        const __VLS_23 = __VLS_22({
            size: "small",
            type: "warning",
        }, ...__VLS_functionalComponentArgsRest(__VLS_22));
        __VLS_24.slots.default;
        var __VLS_24;
    }
}
if (__VLS_ctx.collaborators.length) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "section" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "section-title" },
    });
    for (const [c] of __VLS_getVForSourceType((__VLS_ctx.collaborators))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (c.userId),
            ...{ class: "invite-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (c.nickname || '用户' + c.userId);
        const __VLS_25 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_26 = __VLS_asFunctionalComponent(__VLS_25, new __VLS_25({
            size: "small",
            type: (c.role === 'owner' ? 'danger' : 'success'),
        }));
        const __VLS_27 = __VLS_26({
            size: "small",
            type: (c.role === 'owner' ? 'danger' : 'success'),
        }, ...__VLS_functionalComponentArgsRest(__VLS_26));
        __VLS_28.slots.default;
        (c.role === 'owner' ? '创建者' : '编辑者');
        var __VLS_28;
        if (c.role !== 'owner' && __VLS_ctx.isOwner) {
            const __VLS_29 = {}.ElButton;
            /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
            // @ts-ignore
            const __VLS_30 = __VLS_asFunctionalComponent(__VLS_29, new __VLS_29({
                ...{ 'onClick': {} },
                size: "small",
                type: "danger",
                text: true,
            }));
            const __VLS_31 = __VLS_30({
                ...{ 'onClick': {} },
                size: "small",
                type: "danger",
                text: true,
            }, ...__VLS_functionalComponentArgsRest(__VLS_30));
            let __VLS_33;
            let __VLS_34;
            let __VLS_35;
            const __VLS_36 = {
                onClick: (...[$event]) => {
                    if (!(__VLS_ctx.collaborators.length))
                        return;
                    if (!(c.role !== 'owner' && __VLS_ctx.isOwner))
                        return;
                    __VLS_ctx.$emit('remove', c.userId);
                }
            };
            __VLS_32.slots.default;
            var __VLS_32;
        }
    }
}
var __VLS_3;
/** @type {__VLS_StyleScopedClasses['invite-body']} */ ;
/** @type {__VLS_StyleScopedClasses['search-results']} */ ;
/** @type {__VLS_StyleScopedClasses['search-row']} */ ;
/** @type {__VLS_StyleScopedClasses['search-name']} */ ;
/** @type {__VLS_StyleScopedClasses['search-uname']} */ ;
/** @type {__VLS_StyleScopedClasses['no-results']} */ ;
/** @type {__VLS_StyleScopedClasses['section']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['invite-row']} */ ;
/** @type {__VLS_StyleScopedClasses['section']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['invite-row']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            visible: visible,
            searchQuery: searchQuery,
            searchResults: searchResults,
            searchLoading: searchLoading,
            invitingId: invitingId,
            onSearchInput: onSearchInput,
            doInvite: doInvite,
        };
    },
    __typeEmits: {},
    __typeProps: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeEmits: {},
    __typeProps: {},
});
; /* PartiallyEnd: #4569/main.vue */
