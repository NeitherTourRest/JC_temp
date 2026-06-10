/// <reference types="../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { ref, computed, watch, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/authStore';
const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const q = ref('');
const navRef = ref(null);
const btnRefs = ref([]);
const isLoggedIn = computed(() => authStore.isAuthenticated);
const nickname = computed(() => {
    if (authStore.user?.nickname)
        return authStore.user.nickname;
    if (authStore.user?.username)
        return authStore.user.username;
    return localStorage.getItem('nickname') || '用户';
});
const avatarUrl = computed(() => {
    if (authStore.user?.avatar)
        return authStore.user.avatar;
    return localStorage.getItem('avatar') || '';
});
const avatarLetter = computed(() => nickname.value ? nickname.value.charAt(0).toUpperCase() : '?');
const avatarStyle = computed(() => avatarUrl.value ? {
    backgroundImage: 'url(' + avatarUrl.value + ')',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    color: 'transparent'
} : {});
const navItems = [
    { path: '/spots', icon: '🏞️', label: '景点' },
    { path: '/foods', icon: '🍜', label: '美食' },
    { path: '/diaries', icon: '📓', label: '游记' },
    { path: '/navigation', icon: '🗺️', label: '地图' },
    { path: '/itineraries', icon: '📋', label: '行程' },
    { path: '/ai/chat', icon: '🤖', label: 'AI' },
];
function isActive(path) { return route.path.startsWith(path); }
function doSearch() {
    if (q.value.trim())
        router.push('/spots?keyword=' + encodeURIComponent(q.value));
}
const pageTitle = computed(() => ({
    '/': '首页', '/spots': '景点', '/foods': '美食',
    '/diaries': '游记', '/navigation': '地图', '/ai/chat': 'AI 助手',
    '/itineraries': '行程规划', '/profile': '个人中心'
}[route.path] || 'JourneyCraft'));
const pageDesc = computed(() => ({
    '/': '探索昌平，发现精彩', '/spots': '发现周边的精彩景点',
    '/foods': '寻找美味的食物', '/diaries': '旅行故事',
    '/navigation': '规划你的路线', '/ai/chat': '问我任何旅行问题',
    '/itineraries': '规划你的旅程', '/profile': '你的账号信息'
}[route.path] || ''));
/* ── Tab slider — measures actual button positions for precision ── */
const activeIndex = computed(() => {
    const idx = navItems.findIndex(item => route.path.startsWith(item.path));
    return idx >= 0 ? idx : 0;
});
const sliderStyle = ref({
    left: '0',
    width: '0',
});
function updateSlider() {
    const nav = navRef.value;
    const btns = btnRefs.value;
    if (!nav || !btns.length)
        return;
    const idx = Math.min(activeIndex.value, btns.length - 1);
    const btn = btns[idx];
    if (!btn)
        return;
    const navRect = nav.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    sliderStyle.value = {
        left: `${btnRect.left - navRect.left}px`,
        width: `${btnRect.width}px`,
    };
}
watch(activeIndex, () => nextTick(updateSlider), { immediate: true });
watch(() => route.path, () => nextTick(updateSlider));
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['main-top-logo']} */ ;
/** @type {__VLS_StyleScopedClasses['top-nav-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['top-nav-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['top-search-box']} */ ;
/** @type {__VLS_StyleScopedClasses['top-search-box']} */ ;
/** @type {__VLS_StyleScopedClasses['top-search-box']} */ ;
/** @type {__VLS_StyleScopedClasses['top-profile']} */ ;
/** @type {__VLS_StyleScopedClasses['top-login-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['main-top']} */ ;
/** @type {__VLS_StyleScopedClasses['main-top-nav']} */ ;
/** @type {__VLS_StyleScopedClasses['top-nav-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['tnav-label']} */ ;
/** @type {__VLS_StyleScopedClasses['top-search-box']} */ ;
/** @type {__VLS_StyleScopedClasses['top-username']} */ ;
/** @type {__VLS_StyleScopedClasses['page-header-area']} */ ;
/** @type {__VLS_StyleScopedClasses['main-content-area']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "app-shell" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({
    ...{ class: "main-top" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.$router.push('/');
        } },
    ...{ class: "main-top-logo" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "logo-icon" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "logo-text" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.nav, __VLS_intrinsicElements.nav)({
    ...{ class: "main-top-nav" },
    ref: "navRef",
});
/** @type {typeof __VLS_ctx.navRef} */ ;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "tab-slider" },
    ...{ style: (__VLS_ctx.sliderStyle) },
});
for (const [item, i] of __VLS_getVForSourceType((__VLS_ctx.navItems))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.$router.push(item.path);
            } },
        key: (item.path),
        ref: "btnRefs",
        ...{ class: "top-nav-btn" },
        ...{ class: ({ active: __VLS_ctx.isActive(item.path) }) },
    });
    /** @type {typeof __VLS_ctx.btnRefs} */ ;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "tnav-icon" },
    });
    (item.icon);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "tnav-label" },
    });
    (item.label);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "main-top-right" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "top-search-box" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "search-icon" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ onKeyup: (__VLS_ctx.doSearch) },
    placeholder: "搜索景点、美食...",
});
(__VLS_ctx.q);
if (__VLS_ctx.isLoggedIn) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.isLoggedIn))
                    return;
                __VLS_ctx.$router.push('/profile');
            } },
        ...{ class: "top-profile" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "top-avatar" },
        ...{ style: (__VLS_ctx.avatarStyle) },
    });
    (__VLS_ctx.avatarLetter);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "top-username" },
    });
    (__VLS_ctx.nickname);
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!!(__VLS_ctx.isLoggedIn))
                    return;
                __VLS_ctx.$router.push('/login');
            } },
        ...{ class: "top-login-btn" },
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "page-header-area" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "ph-left" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
    ...{ class: "ph-title" },
});
(__VLS_ctx.pageTitle);
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "ph-desc" },
});
(__VLS_ctx.pageDesc);
__VLS_asFunctionalElement(__VLS_intrinsicElements.main, __VLS_intrinsicElements.main)({
    ...{ class: "main-content-area" },
});
var __VLS_0 = {};
/** @type {__VLS_StyleScopedClasses['app-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['main-top']} */ ;
/** @type {__VLS_StyleScopedClasses['main-top-logo']} */ ;
/** @type {__VLS_StyleScopedClasses['logo-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['logo-text']} */ ;
/** @type {__VLS_StyleScopedClasses['main-top-nav']} */ ;
/** @type {__VLS_StyleScopedClasses['tab-slider']} */ ;
/** @type {__VLS_StyleScopedClasses['top-nav-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['tnav-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['tnav-label']} */ ;
/** @type {__VLS_StyleScopedClasses['main-top-right']} */ ;
/** @type {__VLS_StyleScopedClasses['top-search-box']} */ ;
/** @type {__VLS_StyleScopedClasses['search-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['top-profile']} */ ;
/** @type {__VLS_StyleScopedClasses['top-avatar']} */ ;
/** @type {__VLS_StyleScopedClasses['top-username']} */ ;
/** @type {__VLS_StyleScopedClasses['top-login-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['page-header-area']} */ ;
/** @type {__VLS_StyleScopedClasses['ph-left']} */ ;
/** @type {__VLS_StyleScopedClasses['ph-title']} */ ;
/** @type {__VLS_StyleScopedClasses['ph-desc']} */ ;
/** @type {__VLS_StyleScopedClasses['main-content-area']} */ ;
// @ts-ignore
var __VLS_1 = __VLS_0;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            q: q,
            navRef: navRef,
            btnRefs: btnRefs,
            isLoggedIn: isLoggedIn,
            nickname: nickname,
            avatarLetter: avatarLetter,
            avatarStyle: avatarStyle,
            navItems: navItems,
            isActive: isActive,
            doSearch: doSearch,
            pageTitle: pageTitle,
            pageDesc: pageDesc,
            sliderStyle: sliderStyle,
        };
    },
});
const __VLS_component = (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
export default {};
; /* PartiallyEnd: #4569/main.vue */
