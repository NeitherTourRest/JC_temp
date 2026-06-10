/// <reference types="../../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/authStore';
const r = useRouter();
const a = useAuthStore();
const u = ref('');
const p = ref('');
const l = ref(false);
const e = ref('');
async function login() { if (!u.value || !p.value) {
    e.value = '请输入用户名和密码';
    return;
} ; l.value = true; e.value = ''; try {
    await a.login(u.value, p.value);
    r.push('/');
}
catch (x) {
    e.value = x?.response?.data?.message || '登录失败';
}
finally {
    l.value = false;
} }
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['auth-card']} */ ;
/** @type {__VLS_StyleScopedClasses['switch']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "auth-page" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "auth-card glass" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({});
const __VLS_0 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ...{ 'onSubmit': {} },
}));
const __VLS_2 = __VLS_1({
    ...{ 'onSubmit': {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
let __VLS_4;
let __VLS_5;
let __VLS_6;
const __VLS_7 = {
    onSubmit: (__VLS_ctx.login)
};
__VLS_3.slots.default;
const __VLS_8 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({}));
const __VLS_10 = __VLS_9({}, ...__VLS_functionalComponentArgsRest(__VLS_9));
__VLS_11.slots.default;
const __VLS_12 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
    modelValue: (__VLS_ctx.u),
    placeholder: "用户名",
    size: "large",
}));
const __VLS_14 = __VLS_13({
    modelValue: (__VLS_ctx.u),
    placeholder: "用户名",
    size: "large",
}, ...__VLS_functionalComponentArgsRest(__VLS_13));
var __VLS_11;
const __VLS_16 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({}));
const __VLS_18 = __VLS_17({}, ...__VLS_functionalComponentArgsRest(__VLS_17));
__VLS_19.slots.default;
const __VLS_20 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
    modelValue: (__VLS_ctx.p),
    type: "password",
    placeholder: "密码",
    size: "large",
    showPassword: true,
}));
const __VLS_22 = __VLS_21({
    modelValue: (__VLS_ctx.p),
    type: "password",
    placeholder: "密码",
    size: "large",
    showPassword: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_21));
var __VLS_19;
const __VLS_24 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({}));
const __VLS_26 = __VLS_25({}, ...__VLS_functionalComponentArgsRest(__VLS_25));
__VLS_27.slots.default;
const __VLS_28 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({
    ...{ 'onClick': {} },
    type: "primary",
    size: "large",
    ...{ class: "full-btn" },
    loading: (__VLS_ctx.l),
}));
const __VLS_30 = __VLS_29({
    ...{ 'onClick': {} },
    type: "primary",
    size: "large",
    ...{ class: "full-btn" },
    loading: (__VLS_ctx.l),
}, ...__VLS_functionalComponentArgsRest(__VLS_29));
let __VLS_32;
let __VLS_33;
let __VLS_34;
const __VLS_35 = {
    onClick: (__VLS_ctx.login)
};
__VLS_31.slots.default;
var __VLS_31;
var __VLS_27;
var __VLS_3;
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "switch" },
});
const __VLS_36 = {}.RouterLink;
/** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, ]} */ ;
// @ts-ignore
const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
    to: "/register",
}));
const __VLS_38 = __VLS_37({
    to: "/register",
}, ...__VLS_functionalComponentArgsRest(__VLS_37));
__VLS_39.slots.default;
var __VLS_39;
if (__VLS_ctx.e) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "err" },
    });
    (__VLS_ctx.e);
}
/** @type {__VLS_StyleScopedClasses['auth-page']} */ ;
/** @type {__VLS_StyleScopedClasses['auth-card']} */ ;
/** @type {__VLS_StyleScopedClasses['glass']} */ ;
/** @type {__VLS_StyleScopedClasses['full-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['switch']} */ ;
/** @type {__VLS_StyleScopedClasses['err']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            u: u,
            p: p,
            l: l,
            e: e,
            login: login,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
