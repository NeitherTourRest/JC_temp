/// <reference types="../../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { ref, onMounted, nextTick, watch } from 'vue';
import DefaultLayout from '@/layouts/DefaultLayout.vue';
import { useAiStore } from '@/stores/aiStore';
const ai = useAiStore();
const input = ref('');
const chatRef = ref();
const showSidebar = ref(false);
onMounted(() => {
    ai.loadSessions();
    ai.newSession();
});
/** Auto-scroll chat to bottom when messages change */
watch(() => ai.messages.length, () => nextTick(scrollDown));
watch(() => ai.sending, (val) => { if (val)
    nextTick(scrollDown); });
function scrollDown() {
    const el = chatRef.value;
    if (el)
        el.scrollTop = el.scrollHeight;
}
async function handleSend() {
    const text = input.value.trim();
    if (!text)
        return;
    input.value = '';
    await ai.sendMessage(text);
    // On mobile, close sidebar after sending to show the response
    if (window.innerWidth < 768)
        showSidebar.value = false;
    nextTick(scrollDown);
}
function handleNewChat() {
    ai.newSession();
    if (window.innerWidth < 768)
        showSidebar.value = false;
}
function handleSwitchSession(sessionId) {
    ai.switchSession(sessionId);
    if (window.innerWidth < 768)
        showSidebar.value = false;
}
async function handleDeleteSession(sessionId) {
    await ai.deleteSession(sessionId);
}
function formatTime(ts) {
    if (!ts)
        return '';
    try {
        const d = new Date(ts);
        if (isNaN(d.getTime()))
            return '';
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    catch {
        return '';
    }
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['sidebar-toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-sessions']} */ ;
/** @type {__VLS_StyleScopedClasses['session-item']} */ ;
/** @type {__VLS_StyleScopedClasses['session-item']} */ ;
/** @type {__VLS_StyleScopedClasses['session-item']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['session-title']} */ ;
/** @type {__VLS_StyleScopedClasses['session-item']} */ ;
/** @type {__VLS_StyleScopedClasses['session-delete']} */ ;
/** @type {__VLS_StyleScopedClasses['session-delete']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-welcome']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-welcome']} */ ;
/** @type {__VLS_StyleScopedClasses['msg-row']} */ ;
/** @type {__VLS_StyleScopedClasses['msg-bubble']} */ ;
/** @type {__VLS_StyleScopedClasses['user']} */ ;
/** @type {__VLS_StyleScopedClasses['msg-bubble']} */ ;
/** @type {__VLS_StyleScopedClasses['msg-content']} */ ;
/** @type {__VLS_StyleScopedClasses['msg-bubble']} */ ;
/** @type {__VLS_StyleScopedClasses['user']} */ ;
/** @type {__VLS_StyleScopedClasses['msg-content']} */ ;
/** @type {__VLS_StyleScopedClasses['ai-chat-container']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['ai-sidebar']} */ ;
/** @type {__VLS_StyleScopedClasses['ai-sidebar']} */ ;
/** @type {__VLS_StyleScopedClasses['ai-chat-main']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-area']} */ ;
/** @type {__VLS_StyleScopedClasses['msg-bubble']} */ ;
// CSS variable injection 
// CSS variable injection end 
/** @type {[typeof DefaultLayout, typeof DefaultLayout, ]} */ ;
// @ts-ignore
const __VLS_0 = __VLS_asFunctionalComponent(DefaultLayout, new DefaultLayout({}));
const __VLS_1 = __VLS_0({}, ...__VLS_functionalComponentArgsRest(__VLS_0));
var __VLS_3 = {};
__VLS_2.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "ai-chat-container" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.showSidebar = !__VLS_ctx.showSidebar;
        } },
    ...{ class: "sidebar-toggle" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
(__VLS_ctx.showSidebar ? '隐藏' : '聊天');
__VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
    ...{ class: "ai-sidebar" },
    ...{ class: ({ open: __VLS_ctx.showSidebar }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "sidebar-header" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
    ...{ class: "sidebar-title" },
});
const __VLS_4 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
    ...{ 'onClick': {} },
    type: "primary",
    size: "small",
}));
const __VLS_6 = __VLS_5({
    ...{ 'onClick': {} },
    type: "primary",
    size: "small",
}, ...__VLS_functionalComponentArgsRest(__VLS_5));
let __VLS_8;
let __VLS_9;
let __VLS_10;
const __VLS_11 = {
    onClick: (__VLS_ctx.handleNewChat)
};
__VLS_7.slots.default;
var __VLS_7;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "session-list" },
});
__VLS_asFunctionalDirective(__VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.ai.loading) }, null, null);
if (!__VLS_ctx.ai.loading && __VLS_ctx.ai.sortedSessions.length === 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "empty-sessions" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "text-sm" },
    });
}
for (const [session] of __VLS_getVForSourceType((__VLS_ctx.ai.sortedSessions))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.handleSwitchSession(session.id);
            } },
        key: (session.id),
        ...{ class: "session-item" },
        ...{ class: ({ active: session.id === __VLS_ctx.ai.activeSessionId }) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "session-title" },
        title: (session.title),
    });
    (session.title);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.handleDeleteSession(session.id);
            } },
        ...{ class: "session-delete" },
        title: "删除聊天",
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "ai-chat-main" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "chat-area" },
    ref: "chatRef",
});
/** @type {typeof __VLS_ctx.chatRef} */ ;
if (__VLS_ctx.ai.messages.length === 0 && !__VLS_ctx.ai.sending) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "chat-welcome" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "welcome-icon" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
}
for (const [msg, i] of __VLS_getVForSourceType((__VLS_ctx.ai.messages))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        key: (i),
        ...{ class: (['msg-row', msg.role]) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "msg-bubble" },
        ...{ class: (msg.role) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "msg-avatar" },
    });
    (msg.role === 'user' ? '😎' : '🤖');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "msg-content" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "msg-text" },
    });
    (msg.content);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "msg-time" },
    });
    (__VLS_ctx.formatTime(msg.timestamp));
}
if (__VLS_ctx.ai.sending) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "msg-row assistant" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "msg-bubble assistant" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "msg-avatar" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "msg-content" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "typing-dots" },
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "input-bar" },
});
const __VLS_12 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
    ...{ 'onKeyup': {} },
    modelValue: (__VLS_ctx.input),
    placeholder: "问我任何旅行问题...",
    size: "large",
    disabled: (__VLS_ctx.ai.sending),
}));
const __VLS_14 = __VLS_13({
    ...{ 'onKeyup': {} },
    modelValue: (__VLS_ctx.input),
    placeholder: "问我任何旅行问题...",
    size: "large",
    disabled: (__VLS_ctx.ai.sending),
}, ...__VLS_functionalComponentArgsRest(__VLS_13));
let __VLS_16;
let __VLS_17;
let __VLS_18;
const __VLS_19 = {
    onKeyup: (__VLS_ctx.handleSend)
};
var __VLS_15;
const __VLS_20 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
    ...{ 'onClick': {} },
    type: "primary",
    size: "large",
    loading: (__VLS_ctx.ai.sending),
    ...{ class: "send-btn" },
}));
const __VLS_22 = __VLS_21({
    ...{ 'onClick': {} },
    type: "primary",
    size: "large",
    loading: (__VLS_ctx.ai.sending),
    ...{ class: "send-btn" },
}, ...__VLS_functionalComponentArgsRest(__VLS_21));
let __VLS_24;
let __VLS_25;
let __VLS_26;
const __VLS_27 = {
    onClick: (__VLS_ctx.handleSend)
};
__VLS_23.slots.default;
var __VLS_23;
var __VLS_2;
/** @type {__VLS_StyleScopedClasses['ai-chat-container']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['ai-sidebar']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-header']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-title']} */ ;
/** @type {__VLS_StyleScopedClasses['session-list']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-sessions']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['session-item']} */ ;
/** @type {__VLS_StyleScopedClasses['session-title']} */ ;
/** @type {__VLS_StyleScopedClasses['session-delete']} */ ;
/** @type {__VLS_StyleScopedClasses['ai-chat-main']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-area']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-welcome']} */ ;
/** @type {__VLS_StyleScopedClasses['welcome-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['msg-bubble']} */ ;
/** @type {__VLS_StyleScopedClasses['msg-avatar']} */ ;
/** @type {__VLS_StyleScopedClasses['msg-content']} */ ;
/** @type {__VLS_StyleScopedClasses['msg-text']} */ ;
/** @type {__VLS_StyleScopedClasses['msg-time']} */ ;
/** @type {__VLS_StyleScopedClasses['msg-row']} */ ;
/** @type {__VLS_StyleScopedClasses['assistant']} */ ;
/** @type {__VLS_StyleScopedClasses['msg-bubble']} */ ;
/** @type {__VLS_StyleScopedClasses['assistant']} */ ;
/** @type {__VLS_StyleScopedClasses['msg-avatar']} */ ;
/** @type {__VLS_StyleScopedClasses['msg-content']} */ ;
/** @type {__VLS_StyleScopedClasses['typing-dots']} */ ;
/** @type {__VLS_StyleScopedClasses['input-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['send-btn']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            DefaultLayout: DefaultLayout,
            ai: ai,
            input: input,
            chatRef: chatRef,
            showSidebar: showSidebar,
            handleSend: handleSend,
            handleNewChat: handleNewChat,
            handleSwitchSession: handleSwitchSession,
            handleDeleteSession: handleDeleteSession,
            formatTime: formatTime,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
