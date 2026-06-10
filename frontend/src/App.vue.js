/// <reference types="../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useAuthStore } from '@/stores/authStore';
const auth = useAuthStore();
const cometCanvas = ref(null);
let animId = 0;
onMounted(() => {
    auth.checkAuth();
    initComet();
});
onBeforeUnmount(() => cancelAnimationFrame(animId));
const particles = [];
const MAX_PARTICLES = 20;
const TRAIL_LENGTH = 18;
function initComet() {
    const canvas = cometCanvas.value;
    if (!canvas)
        return;
    const ctx = canvas.getContext('2d');
    if (!ctx)
        return;
    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);
    let mx = -100, my = -100;
    document.addEventListener('mousemove', (e) => {
        mx = e.clientX;
        my = e.clientY;
        particles.push({ x: mx, y: my, age: 0, maxAge: TRAIL_LENGTH });
        if (particles.length > MAX_PARTICLES)
            particles.shift();
    });
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // Update and draw particles
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.age++;
            if (p.age > p.maxAge) {
                particles.splice(i, 1);
                continue;
            }
            const progress = p.age / p.maxAge;
            const opacity = (1 - progress) * 0.6;
            const size = (1 - progress) * 5 + 1;
            ctx.beginPath();
            ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(124, 215, 238, ${opacity})`;
            ctx.fill();
        }
        animId = requestAnimationFrame(draw);
    }
    draw();
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
// CSS variable injection 
// CSS variable injection end 
const __VLS_0 = {}.RouterView;
/** @type {[typeof __VLS_components.RouterView, typeof __VLS_components.routerView, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({}));
const __VLS_2 = __VLS_1({}, ...__VLS_functionalComponentArgsRest(__VLS_1));
__VLS_asFunctionalElement(__VLS_intrinsicElements.canvas, __VLS_intrinsicElements.canvas)({
    ref: "cometCanvas",
    ...{ class: "comet-canvas" },
});
/** @type {typeof __VLS_ctx.cometCanvas} */ ;
/** @type {__VLS_StyleScopedClasses['comet-canvas']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            cometCanvas: cometCanvas,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
