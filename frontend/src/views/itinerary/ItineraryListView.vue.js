/// <reference types="../../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { ref, reactive, computed, onMounted, nextTick } from 'vue';
import DefaultLayout from '@/layouts/DefaultLayout.vue';
import { itineraryApi } from '@/api/itineraryApi';
import { ElMessage } from 'element-plus';
import { spotApi } from '@/api/spotApi';
import { aiApi } from '@/api/aiApi';
/* ───────────────────────────────────────────────────────
   State
   ─────────────────────────────────────────────────────── */
const viewMode = ref('list');
const editingId = ref(null);
/* ── List mode state ─────────────────────────────────── */
const itineraries = ref([]);
const loading = ref(false);
const submitting = ref(false);
const currentPage = ref(1);
const pageSize = ref(12);
const total = ref(0);
const tripColors = [
    '#22d3ee', '#34d399', '#fbbf24', '#e879f9',
    '#fb923c', '#f472b6', '#4ade80', '#f87171'
];
const createDialogVisible = ref(false);
const createFormRef = ref();
const createForm = reactive({ name: '' });
const createRules = {
    name: [
        { required: true, message: 'Please enter a trip name', trigger: 'blur' },
        { min: 2, message: 'Name must be at least 2 characters', trigger: 'blur' }
    ]
};
/* ── Planning mode state ─────────────────────────────── */
const tripPlan = reactive({
    title: '',
    startDate: '',
    endDate: '',
    days: []
});
const activeDayIndex = ref(0);
const activeDay = computed(() => tripPlan.days[activeDayIndex.value] ?? null);
/* ── Dialog 1: Map Picker state ──────────────────────── */
const mapDialogVisible = ref(false);
let tripMap = null;
let tripAMapInstance = null;
/* ── Dialog 2: Spot/Food Search state ────────────────── */
const searchDialogVisible = ref(false);
const searchSection = ref('attractions');
const searchKeyword = ref('');
const searchResults = ref([]);
const searchLoading = ref(false);
/* ── Dialog 3: AI Chat state ─────────────────────────── */
const aiDialogVisible = ref(false);
const aiInput = ref('');
const aiLoading = ref(false);
const aiMessages = ref([]);
const aiChatRef = ref();
/* ───────────────────────────────────────────────────────
   List mode: data fetching
   ─────────────────────────────────────────────────────── */
async function fetchItineraries() {
    loading.value = true;
    try {
        const res = await itineraryApi.list(currentPage.value - 1, pageSize.value);
        const body = res.data;
        if (body.success) {
            itineraries.value = body.data.content;
            total.value = body.data.totalElements;
        }
    }
    catch (e) {
        ElMessage.error('Failed to load trips');
        console.error(e);
    }
    finally {
        loading.value = false;
    }
}
/* ───────────────────────────────────────────────────────
   List mode: create
   ─────────────────────────────────────────────────────── */
function openCreateDialog() {
    createForm.name = '';
    createFormRef.value?.resetFields();
    createDialogVisible.value = true;
}
async function handleCreate() {
    const valid = await createFormRef.value?.validate().catch(() => false);
    if (!valid)
        return;
    submitting.value = true;
    try {
        await itineraryApi.create({ name: createForm.name });
        ElMessage.success('Trip created!');
        createDialogVisible.value = false;
        await fetchItineraries();
    }
    catch (e) {
        ElMessage.error('Failed to create trip');
        console.error(e);
    }
    finally {
        submitting.value = false;
    }
}
/* ───────────────────────────────────────────────────────
   List mode: delete
   ─────────────────────────────────────────────────────── */
async function handleDelete(id) {
    try {
        await itineraryApi.del(id);
        ElMessage.success('Trip deleted');
        await fetchItineraries();
    }
    catch (e) {
        ElMessage.error('Failed to delete trip');
        console.error(e);
    }
}
/* ───────────────────────────────────────────────────────
   List mode: pagination
   ─────────────────────────────────────────────────────── */
function handlePageChange(page) {
    currentPage.value = page;
    fetchItineraries();
}
function handleSizeChange(size) {
    pageSize.value = size;
    currentPage.value = 1;
    fetchItineraries();
}
/* ───────────────────────────────────────────────────────
   List mode: formatters
   ─────────────────────────────────────────────────────── */
function getSpotCount(spotIds) {
    if (!spotIds)
        return 0;
    return spotIds.split(',').filter(Boolean).length;
}
function formatDistance(meters) {
    if (meters == null)
        return '—';
    const km = meters / 1000;
    return km >= 1 ? `${km.toFixed(1)} km` : `${meters.toFixed(0)} m`;
}
function formatTime(minutes) {
    if (minutes == null)
        return '—';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
function formatDate(dateStr) {
    if (!dateStr)
        return '—';
    const d = new Date(dateStr);
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    return `${y}-${mo}-${da}`;
}
/* ───────────────────────────────────────────────────────
   Planning mode: enter from a card
   ─────────────────────────────────────────────────────── */
function enterPlanning(item) {
    editingId.value = item.id;
    tripPlan.title = item.name;
    tripPlan.startDate = '';
    tripPlan.endDate = '';
    tripPlan.days = [];
    activeDayIndex.value = 0;
    viewMode.value = 'planning';
}
/* ───────────────────────────────────────────────────────
   Planning mode: day generation
   ─────────────────────────────────────────────────────── */
function regenerateDays() {
    const { startDate, endDate } = tripPlan;
    if (!startDate || !endDate) {
        tripPlan.days = [];
        return;
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) {
        tripPlan.days = [];
        return;
    }
    const msPerDay = 24 * 60 * 60 * 1000;
    const diffDays = Math.floor((end.getTime() - start.getTime()) / msPerDay) + 1;
    const days = [];
    for (let i = 0; i < diffDays; i++) {
        const d = new Date(start.getTime() + i * msPerDay);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const da = String(d.getDate()).padStart(2, '0');
        days.push({
            dayIndex: i + 1,
            date: `${y}-${m}-${da}`,
            sections: {
                attractions: [],
                dining: [],
                other: []
            }
        });
    }
    tripPlan.days = days;
    if (activeDayIndex.value >= days.length) {
        activeDayIndex.value = Math.max(0, days.length - 1);
    }
}
function addDay() {
    const lastDayIdx = tripPlan.days.length;
    const lastDate = tripPlan.days.length
        ? new Date(tripPlan.days[tripPlan.days.length - 1].date)
        : tripPlan.startDate
            ? new Date(tripPlan.startDate)
            : new Date();
    lastDate.setDate(lastDate.getDate() + 1);
    const y = lastDate.getFullYear();
    const m = String(lastDate.getMonth() + 1).padStart(2, '0');
    const d = String(lastDate.getDate()).padStart(2, '0');
    tripPlan.days.push({
        dayIndex: lastDayIdx + 1,
        date: `${y}-${m}-${d}`,
        sections: { attractions: [], dining: [], other: [] }
    });
    activeDayIndex.value = tripPlan.days.length - 1;
}
/* ───────────────────────────────────────────────────────
   Planning mode: item CRUD
   ─────────────────────────────────────────────────────── */
let itemIdCounter = 0;
function nextItemId() {
    return `item_${Date.now()}_${++itemIdCounter}`;
}
function addItem(section) {
    if (!activeDay.value)
        return;
    activeDay.value.sections[section].push({
        id: nextItemId(),
        name: '',
        startTime: '',
        endTime: ''
    });
}
function removeItem(section, index) {
    if (!activeDay.value)
        return;
    activeDay.value.sections[section].splice(index, 1);
}
/* ───────────────────────────────────────────────────────
   Dialog 1: Map Picker
   ─────────────────────────────────────────────────────── */
function openMapDialog() {
    mapDialogVisible.value = true;
}
function onMapDialogOpened() {
    nextTick(() => {
        const container = document.getElementById('trip-map-container');
        if (!container)
            return;
        tripAMapInstance = window.AMap;
        if (!tripAMapInstance) {
            setTimeout(onMapDialogOpened, 500);
            return;
        }
        tripMap = new tripAMapInstance.Map(container, {
            zoom: 15,
            center: [116.275, 40.155],
            resizeEnable: true
        });
        tripMap.on('click', (e) => {
            if (!activeDay.value)
                return;
            const lng = e.lnglat.getLng();
            const lat = e.lnglat.getLat();
            activeDay.value.sections.attractions.push({
                id: nextItemId(),
                name: `Map Point (${lng.toFixed(4)}, ${lat.toFixed(4)})`,
                lat,
                lng,
                startTime: '',
                endTime: ''
            });
            ElMessage.success('Map point added to Attractions');
        });
    });
}
function closeMapDialog() {
    if (tripMap) {
        tripMap.destroy();
        tripMap = null;
    }
    tripAMapInstance = null;
}
/* ───────────────────────────────────────────────────────
   Dialog 2: Spot / Food Search
   ─────────────────────────────────────────────────────── */
function openSearchDialog(section) {
    searchSection.value = section;
    searchKeyword.value = '';
    searchResults.value = [];
    searchDialogVisible.value = true;
}
async function doSearch() {
    const kw = searchKeyword.value.trim();
    if (!kw)
        return;
    searchLoading.value = true;
    try {
        if (searchSection.value === 'attractions') {
            const res = await spotApi.search({ keyword: kw });
            searchResults.value = res.data.data?.content || [];
        }
        else {
            const res = await spotApi.search({ keyword: kw, category: '餐厅' });
            searchResults.value = res.data.data?.content || [];
        }
    }
    catch (e) {
        ElMessage.error('Search failed');
        console.error(e);
    }
    finally {
        searchLoading.value = false;
    }
}
function selectSearchResult(item) {
    if (!activeDay.value)
        return;
    const sec = searchSection.value;
    const newItem = {
        id: nextItemId(),
        name: item.name || '',
        spotId: sec === 'attractions' ? item.id : undefined,
        foodId: sec === 'dining' ? item.id : undefined,
        lat: item.latitude,
        lng: item.longitude,
        startTime: '',
        endTime: ''
    };
    activeDay.value.sections[sec].push(newItem);
    ElMessage.success(`Added "${newItem.name}"`);
}
/* ───────────────────────────────────────────────────────
   Dialog 3: AI Chat
   ─────────────────────────────────────────────────────── */
function genUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}
function openAiDialog() {
    aiDialogVisible.value = true;
    if (aiMessages.value.length === 0) {
        aiMessages.value.push({
            role: 'assistant',
            content: "Hi! I'm your trip planning AI. Ask me about attractions, routes, or anything about your trip!",
            time: ''
        });
    }
}
async function sendAiMessage() {
    const text = aiInput.value.trim();
    if (!text || aiLoading.value)
        return;
    aiInput.value = '';
    aiMessages.value.push({ role: 'user', content: text, time: new Date().toLocaleTimeString() });
    aiLoading.value = true;
    scrollAiDown();
    try {
        const sid = tripPlan.aiSessionId || genUUID();
        const res = await aiApi.chat(sid, text);
        const data = res.data.data;
        if (data) {
            tripPlan.aiSessionId = data.sessionId;
            aiMessages.value.push({
                role: 'assistant',
                content: data.reply || 'No response',
                time: new Date().toLocaleTimeString()
            });
        }
    }
    catch {
        aiMessages.value.push({ role: 'assistant', content: '⚠️ Failed to get AI response.', time: '' });
    }
    finally {
        aiLoading.value = false;
        scrollAiDown();
    }
}
function scrollAiDown() {
    nextTick(() => {
        if (aiChatRef.value) {
            aiChatRef.value.scrollTop = aiChatRef.value.scrollHeight;
        }
    });
}
/* ───────────────────────────────────────────────────────
   Planning mode: save
   ─────────────────────────────────────────────────────── */
async function handleSave() {
    if (!editingId.value)
        return;
    try {
        await itineraryApi.update(editingId.value, {
            name: tripPlan.title,
            routeData: JSON.stringify(tripPlan)
        });
        ElMessage.success('Trip saved!');
    }
    catch (e) {
        ElMessage.error('Failed to save trip');
        console.error(e);
    }
}
/* ───────────────────────────────────────────────────────
   Init
   ─────────────────────────────────────────────────────── */
onMounted(fetchItineraries);
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['hero-content']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-content']} */ ;
/** @type {__VLS_StyleScopedClasses['loading-state']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-state']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-state']} */ ;
/** @type {__VLS_StyleScopedClasses['trip-card']} */ ;
/** @type {__VLS_StyleScopedClasses['trip-top']} */ ;
/** @type {__VLS_StyleScopedClasses['trip-delete-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['back-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['title-input']} */ ;
/** @type {__VLS_StyleScopedClasses['save-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['date-field']} */ ;
/** @type {__VLS_StyleScopedClasses['tabs-scroll']} */ ;
/** @type {__VLS_StyleScopedClasses['tabs-scroll']} */ ;
/** @type {__VLS_StyleScopedClasses['day-tab']} */ ;
/** @type {__VLS_StyleScopedClasses['day-tab']} */ ;
/** @type {__VLS_StyleScopedClasses['add-day-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['section-header']} */ ;
/** @type {__VLS_StyleScopedClasses['add-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['item-name-input']} */ ;
/** @type {__VLS_StyleScopedClasses['item-time']} */ ;
/** @type {__VLS_StyleScopedClasses['item-time']} */ ;
/** @type {__VLS_StyleScopedClasses['remove-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['planning-empty']} */ ;
/** @type {__VLS_StyleScopedClasses['ai-float-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['map-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['search-input-row']} */ ;
/** @type {__VLS_StyleScopedClasses['el-input__wrapper']} */ ;
/** @type {__VLS_StyleScopedClasses['search-result-card']} */ ;
/** @type {__VLS_StyleScopedClasses['ai-msg-row']} */ ;
/** @type {__VLS_StyleScopedClasses['ai-msg-bubble']} */ ;
/** @type {__VLS_StyleScopedClasses['user']} */ ;
/** @type {__VLS_StyleScopedClasses['ai-msg-bubble']} */ ;
/** @type {__VLS_StyleScopedClasses['ai-msg-content']} */ ;
/** @type {__VLS_StyleScopedClasses['ai-msg-bubble']} */ ;
/** @type {__VLS_StyleScopedClasses['user']} */ ;
/** @type {__VLS_StyleScopedClasses['ai-msg-content']} */ ;
/** @type {__VLS_StyleScopedClasses['ai-input-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['el-input__wrapper']} */ ;
/** @type {__VLS_StyleScopedClasses['hero']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-content']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-content']} */ ;
/** @type {__VLS_StyleScopedClasses['trips-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['trip-top']} */ ;
/** @type {__VLS_StyleScopedClasses['sections-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['planning-dates']} */ ;
/** @type {__VLS_StyleScopedClasses['day-count']} */ ;
// CSS variable injection 
// CSS variable injection end 
/** @type {[typeof DefaultLayout, typeof DefaultLayout, ]} */ ;
// @ts-ignore
const __VLS_0 = __VLS_asFunctionalComponent(DefaultLayout, new DefaultLayout({}));
const __VLS_1 = __VLS_0({}, ...__VLS_functionalComponentArgsRest(__VLS_0));
var __VLS_3 = {};
__VLS_2.slots.default;
if (__VLS_ctx.viewMode === 'list') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "itinerary-page" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "hero" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "hero-bg" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "hero-content" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "hero-actions" },
    });
    const __VLS_4 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
        ...{ 'onClick': {} },
        type: "primary",
        size: "large",
    }));
    const __VLS_6 = __VLS_5({
        ...{ 'onClick': {} },
        type: "primary",
        size: "large",
    }, ...__VLS_functionalComponentArgsRest(__VLS_5));
    let __VLS_8;
    let __VLS_9;
    let __VLS_10;
    const __VLS_11 = {
        onClick: (__VLS_ctx.openCreateDialog)
    };
    __VLS_7.slots.default;
    var __VLS_7;
    const __VLS_12 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
        ...{ 'onClick': {} },
        size: "large",
    }));
    const __VLS_14 = __VLS_13({
        ...{ 'onClick': {} },
        size: "large",
    }, ...__VLS_functionalComponentArgsRest(__VLS_13));
    let __VLS_16;
    let __VLS_17;
    let __VLS_18;
    const __VLS_19 = {
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.viewMode === 'list'))
                return;
            __VLS_ctx.$router.push('/navigation');
        }
    };
    __VLS_15.slots.default;
    var __VLS_15;
    if (__VLS_ctx.loading) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "loading-state" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "loading-spinner" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    }
    else if (!__VLS_ctx.itineraries.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "empty-state" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "empty-icon" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
        const __VLS_20 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
            ...{ 'onClick': {} },
            type: "primary",
            size: "large",
        }));
        const __VLS_22 = __VLS_21({
            ...{ 'onClick': {} },
            type: "primary",
            size: "large",
        }, ...__VLS_functionalComponentArgsRest(__VLS_21));
        let __VLS_24;
        let __VLS_25;
        let __VLS_26;
        const __VLS_27 = {
            onClick: (__VLS_ctx.openCreateDialog)
        };
        __VLS_23.slots.default;
        var __VLS_23;
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "trips-grid" },
        });
        for (const [item] of __VLS_getVForSourceType((__VLS_ctx.itineraries))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.viewMode === 'list'))
                            return;
                        if (!!(__VLS_ctx.loading))
                            return;
                        if (!!(!__VLS_ctx.itineraries.length))
                            return;
                        __VLS_ctx.enterPlanning(item);
                    } },
                key: (item.id),
                ...{ class: "trip-card glass" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "trip-top" },
                ...{ style: ({ background: __VLS_ctx.tripColors[item.id % __VLS_ctx.tripColors.length] }) },
            });
            const __VLS_28 = {}.ElPopconfirm;
            /** @type {[typeof __VLS_components.ElPopconfirm, typeof __VLS_components.elPopconfirm, typeof __VLS_components.ElPopconfirm, typeof __VLS_components.elPopconfirm, ]} */ ;
            // @ts-ignore
            const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({
                ...{ 'onConfirm': {} },
                title: "Delete this trip?",
                confirmButtonText: "Delete",
                cancelButtonText: "Cancel",
            }));
            const __VLS_30 = __VLS_29({
                ...{ 'onConfirm': {} },
                title: "Delete this trip?",
                confirmButtonText: "Delete",
                cancelButtonText: "Cancel",
            }, ...__VLS_functionalComponentArgsRest(__VLS_29));
            let __VLS_32;
            let __VLS_33;
            let __VLS_34;
            const __VLS_35 = {
                onConfirm: (...[$event]) => {
                    if (!(__VLS_ctx.viewMode === 'list'))
                        return;
                    if (!!(__VLS_ctx.loading))
                        return;
                    if (!!(!__VLS_ctx.itineraries.length))
                        return;
                    __VLS_ctx.handleDelete(item.id);
                }
            };
            __VLS_31.slots.default;
            {
                const { reference: __VLS_thisSlot } = __VLS_31.slots;
                __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                    ...{ onClick: () => { } },
                    ...{ class: "trip-delete-btn" },
                    title: "Delete trip",
                });
            }
            var __VLS_31;
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "trip-body" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
                ...{ class: "trip-name" },
            });
            (item.name);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "trip-stats" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "stat" },
            });
            (__VLS_ctx.getSpotCount(item.spotIds));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "stat" },
            });
            (__VLS_ctx.formatDistance(item.totalDistance));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "stat" },
            });
            (__VLS_ctx.formatTime(item.totalTime));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "trip-foot" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "trip-date" },
            });
            (__VLS_ctx.formatDate(item.createdAt));
        }
    }
    if (__VLS_ctx.total > 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "pagination-wrap" },
        });
        const __VLS_36 = {}.ElPagination;
        /** @type {[typeof __VLS_components.ElPagination, typeof __VLS_components.elPagination, ]} */ ;
        // @ts-ignore
        const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
            ...{ 'onSizeChange': {} },
            ...{ 'onCurrentChange': {} },
            currentPage: (__VLS_ctx.currentPage),
            pageSize: (__VLS_ctx.pageSize),
            pageSizes: ([6, 12, 18, 24]),
            total: (__VLS_ctx.total),
            layout: "total, sizes, prev, pager, next, jumper",
            background: true,
        }));
        const __VLS_38 = __VLS_37({
            ...{ 'onSizeChange': {} },
            ...{ 'onCurrentChange': {} },
            currentPage: (__VLS_ctx.currentPage),
            pageSize: (__VLS_ctx.pageSize),
            pageSizes: ([6, 12, 18, 24]),
            total: (__VLS_ctx.total),
            layout: "total, sizes, prev, pager, next, jumper",
            background: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_37));
        let __VLS_40;
        let __VLS_41;
        let __VLS_42;
        const __VLS_43 = {
            onSizeChange: (__VLS_ctx.handleSizeChange)
        };
        const __VLS_44 = {
            onCurrentChange: (__VLS_ctx.handlePageChange)
        };
        var __VLS_39;
    }
    const __VLS_45 = {}.ElDialog;
    /** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
    // @ts-ignore
    const __VLS_46 = __VLS_asFunctionalComponent(__VLS_45, new __VLS_45({
        modelValue: (__VLS_ctx.createDialogVisible),
        title: "NEW TRIP",
        width: "460px",
        closeOnClickModal: (false),
        destroyOnClose: true,
    }));
    const __VLS_47 = __VLS_46({
        modelValue: (__VLS_ctx.createDialogVisible),
        title: "NEW TRIP",
        width: "460px",
        closeOnClickModal: (false),
        destroyOnClose: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_46));
    __VLS_48.slots.default;
    const __VLS_49 = {}.ElForm;
    /** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
    // @ts-ignore
    const __VLS_50 = __VLS_asFunctionalComponent(__VLS_49, new __VLS_49({
        ...{ 'onSubmit': {} },
        ref: "createFormRef",
        model: (__VLS_ctx.createForm),
        rules: (__VLS_ctx.createRules),
        labelPosition: "top",
    }));
    const __VLS_51 = __VLS_50({
        ...{ 'onSubmit': {} },
        ref: "createFormRef",
        model: (__VLS_ctx.createForm),
        rules: (__VLS_ctx.createRules),
        labelPosition: "top",
    }, ...__VLS_functionalComponentArgsRest(__VLS_50));
    let __VLS_53;
    let __VLS_54;
    let __VLS_55;
    const __VLS_56 = {
        onSubmit: () => { }
    };
    /** @type {typeof __VLS_ctx.createFormRef} */ ;
    var __VLS_57 = {};
    __VLS_52.slots.default;
    const __VLS_59 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_60 = __VLS_asFunctionalComponent(__VLS_59, new __VLS_59({
        label: "Trip Name",
        prop: "name",
    }));
    const __VLS_61 = __VLS_60({
        label: "Trip Name",
        prop: "name",
    }, ...__VLS_functionalComponentArgsRest(__VLS_60));
    __VLS_62.slots.default;
    const __VLS_63 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_64 = __VLS_asFunctionalComponent(__VLS_63, new __VLS_63({
        modelValue: (__VLS_ctx.createForm.name),
        placeholder: "e.g. Beijing 3-Day Tour",
        maxlength: "50",
        showWordLimit: true,
    }));
    const __VLS_65 = __VLS_64({
        modelValue: (__VLS_ctx.createForm.name),
        placeholder: "e.g. Beijing 3-Day Tour",
        maxlength: "50",
        showWordLimit: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_64));
    var __VLS_62;
    var __VLS_52;
    {
        const { footer: __VLS_thisSlot } = __VLS_48.slots;
        const __VLS_67 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_68 = __VLS_asFunctionalComponent(__VLS_67, new __VLS_67({
            ...{ 'onClick': {} },
        }));
        const __VLS_69 = __VLS_68({
            ...{ 'onClick': {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_68));
        let __VLS_71;
        let __VLS_72;
        let __VLS_73;
        const __VLS_74 = {
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.viewMode === 'list'))
                    return;
                __VLS_ctx.createDialogVisible = false;
            }
        };
        __VLS_70.slots.default;
        var __VLS_70;
        const __VLS_75 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_76 = __VLS_asFunctionalComponent(__VLS_75, new __VLS_75({
            ...{ 'onClick': {} },
            type: "primary",
            loading: (__VLS_ctx.submitting),
        }));
        const __VLS_77 = __VLS_76({
            ...{ 'onClick': {} },
            type: "primary",
            loading: (__VLS_ctx.submitting),
        }, ...__VLS_functionalComponentArgsRest(__VLS_76));
        let __VLS_79;
        let __VLS_80;
        let __VLS_81;
        const __VLS_82 = {
            onClick: (__VLS_ctx.handleCreate)
        };
        __VLS_78.slots.default;
        var __VLS_78;
    }
    var __VLS_48;
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "planning-page" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "planning-topbar glass-sm" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!!(__VLS_ctx.viewMode === 'list'))
                    return;
                __VLS_ctx.viewMode = 'list';
            } },
        ...{ class: "back-btn" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        ...{ class: "title-input" },
        placeholder: "Trip Title",
        maxlength: "50",
    });
    (__VLS_ctx.tripPlan.title);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.openMapDialog) },
        ...{ class: "map-btn" },
        title: "Map Picker",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.handleSave) },
        ...{ class: "save-btn" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "planning-dates glass-sm" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "date-field" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    const __VLS_83 = {}.ElDatePicker;
    /** @type {[typeof __VLS_components.ElDatePicker, typeof __VLS_components.elDatePicker, ]} */ ;
    // @ts-ignore
    const __VLS_84 = __VLS_asFunctionalComponent(__VLS_83, new __VLS_83({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.tripPlan.startDate),
        type: "date",
        placeholder: "Pick start date",
        valueFormat: "YYYY-MM-DD",
    }));
    const __VLS_85 = __VLS_84({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.tripPlan.startDate),
        type: "date",
        placeholder: "Pick start date",
        valueFormat: "YYYY-MM-DD",
    }, ...__VLS_functionalComponentArgsRest(__VLS_84));
    let __VLS_87;
    let __VLS_88;
    let __VLS_89;
    const __VLS_90 = {
        onChange: (__VLS_ctx.regenerateDays)
    };
    var __VLS_86;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "date-arrow" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "date-field" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    const __VLS_91 = {}.ElDatePicker;
    /** @type {[typeof __VLS_components.ElDatePicker, typeof __VLS_components.elDatePicker, ]} */ ;
    // @ts-ignore
    const __VLS_92 = __VLS_asFunctionalComponent(__VLS_91, new __VLS_91({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.tripPlan.endDate),
        type: "date",
        placeholder: "Pick end date",
        valueFormat: "YYYY-MM-DD",
    }));
    const __VLS_93 = __VLS_92({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.tripPlan.endDate),
        type: "date",
        placeholder: "Pick end date",
        valueFormat: "YYYY-MM-DD",
    }, ...__VLS_functionalComponentArgsRest(__VLS_92));
    let __VLS_95;
    let __VLS_96;
    let __VLS_97;
    const __VLS_98 = {
        onChange: (__VLS_ctx.regenerateDays)
    };
    var __VLS_94;
    if (__VLS_ctx.tripPlan.days.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "day-count" },
        });
        (__VLS_ctx.tripPlan.days.length);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "day-tabs glass-sm" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "tabs-scroll" },
    });
    for (const [day, di] of __VLS_getVForSourceType((__VLS_ctx.tripPlan.days))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.viewMode === 'list'))
                        return;
                    __VLS_ctx.activeDayIndex = di;
                } },
            key: (di),
            ...{ class: "day-tab" },
            ...{ class: ({ active: __VLS_ctx.activeDayIndex === di }) },
        });
        (day.dayIndex);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "tab-date" },
        });
        (day.date);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.addDay) },
        ...{ class: "add-day-btn" },
        title: "Add day",
    });
    if (__VLS_ctx.activeDay) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "day-content" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "sections-grid" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "section-card" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "section-header" },
            ...{ style: {} },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.viewMode === 'list'))
                        return;
                    if (!(__VLS_ctx.activeDay))
                        return;
                    __VLS_ctx.openSearchDialog('attractions');
                } },
            ...{ class: "add-btn" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "section-body" },
        });
        if (!__VLS_ctx.activeDay.sections.attractions.length) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "section-empty" },
            });
        }
        for (const [item, ii] of __VLS_getVForSourceType((__VLS_ctx.activeDay.sections.attractions))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                key: (item.id),
                ...{ class: "section-item" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
                ...{ class: "item-name-input" },
                placeholder: "Attraction name",
            });
            (item.name);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "item-time" },
            });
            const __VLS_99 = {}.ElTimePicker;
            /** @type {[typeof __VLS_components.ElTimePicker, typeof __VLS_components.elTimePicker, ]} */ ;
            // @ts-ignore
            const __VLS_100 = __VLS_asFunctionalComponent(__VLS_99, new __VLS_99({
                modelValue: (item.startTime),
                format: "HH:mm",
                valueFormat: "HH:mm",
                placeholder: "Start",
                size: "small",
            }));
            const __VLS_101 = __VLS_100({
                modelValue: (item.startTime),
                format: "HH:mm",
                valueFormat: "HH:mm",
                placeholder: "Start",
                size: "small",
            }, ...__VLS_functionalComponentArgsRest(__VLS_100));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "time-sep" },
            });
            const __VLS_103 = {}.ElTimePicker;
            /** @type {[typeof __VLS_components.ElTimePicker, typeof __VLS_components.elTimePicker, ]} */ ;
            // @ts-ignore
            const __VLS_104 = __VLS_asFunctionalComponent(__VLS_103, new __VLS_103({
                modelValue: (item.endTime),
                format: "HH:mm",
                valueFormat: "HH:mm",
                placeholder: "End",
                size: "small",
            }));
            const __VLS_105 = __VLS_104({
                modelValue: (item.endTime),
                format: "HH:mm",
                valueFormat: "HH:mm",
                placeholder: "End",
                size: "small",
            }, ...__VLS_functionalComponentArgsRest(__VLS_104));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(__VLS_ctx.viewMode === 'list'))
                            return;
                        if (!(__VLS_ctx.activeDay))
                            return;
                        __VLS_ctx.removeItem('attractions', ii);
                    } },
                ...{ class: "remove-btn" },
            });
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "section-card" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "section-header" },
            ...{ style: {} },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.viewMode === 'list'))
                        return;
                    if (!(__VLS_ctx.activeDay))
                        return;
                    __VLS_ctx.openSearchDialog('dining');
                } },
            ...{ class: "add-btn add-btn-light" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "section-body" },
        });
        if (!__VLS_ctx.activeDay.sections.dining.length) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "section-empty" },
            });
        }
        for (const [item, ii] of __VLS_getVForSourceType((__VLS_ctx.activeDay.sections.dining))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                key: (item.id),
                ...{ class: "section-item" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
                ...{ class: "item-name-input" },
                placeholder: "Restaurant / dish",
            });
            (item.name);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "item-time" },
            });
            const __VLS_107 = {}.ElTimePicker;
            /** @type {[typeof __VLS_components.ElTimePicker, typeof __VLS_components.elTimePicker, ]} */ ;
            // @ts-ignore
            const __VLS_108 = __VLS_asFunctionalComponent(__VLS_107, new __VLS_107({
                modelValue: (item.startTime),
                format: "HH:mm",
                valueFormat: "HH:mm",
                placeholder: "Start",
                size: "small",
            }));
            const __VLS_109 = __VLS_108({
                modelValue: (item.startTime),
                format: "HH:mm",
                valueFormat: "HH:mm",
                placeholder: "Start",
                size: "small",
            }, ...__VLS_functionalComponentArgsRest(__VLS_108));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "time-sep" },
            });
            const __VLS_111 = {}.ElTimePicker;
            /** @type {[typeof __VLS_components.ElTimePicker, typeof __VLS_components.elTimePicker, ]} */ ;
            // @ts-ignore
            const __VLS_112 = __VLS_asFunctionalComponent(__VLS_111, new __VLS_111({
                modelValue: (item.endTime),
                format: "HH:mm",
                valueFormat: "HH:mm",
                placeholder: "End",
                size: "small",
            }));
            const __VLS_113 = __VLS_112({
                modelValue: (item.endTime),
                format: "HH:mm",
                valueFormat: "HH:mm",
                placeholder: "End",
                size: "small",
            }, ...__VLS_functionalComponentArgsRest(__VLS_112));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(__VLS_ctx.viewMode === 'list'))
                            return;
                        if (!(__VLS_ctx.activeDay))
                            return;
                        __VLS_ctx.removeItem('dining', ii);
                    } },
                ...{ class: "remove-btn" },
            });
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "section-card" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "section-header" },
            ...{ style: {} },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.viewMode === 'list'))
                        return;
                    if (!(__VLS_ctx.activeDay))
                        return;
                    __VLS_ctx.addItem('other');
                } },
            ...{ class: "add-btn" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "section-body" },
        });
        if (!__VLS_ctx.activeDay.sections.other.length) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "section-empty" },
            });
        }
        for (const [item, ii] of __VLS_getVForSourceType((__VLS_ctx.activeDay.sections.other))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                key: (item.id),
                ...{ class: "section-item" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
                ...{ class: "item-name-input" },
                placeholder: "Activity / note",
            });
            (item.name);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "item-time" },
            });
            const __VLS_115 = {}.ElTimePicker;
            /** @type {[typeof __VLS_components.ElTimePicker, typeof __VLS_components.elTimePicker, ]} */ ;
            // @ts-ignore
            const __VLS_116 = __VLS_asFunctionalComponent(__VLS_115, new __VLS_115({
                modelValue: (item.startTime),
                format: "HH:mm",
                valueFormat: "HH:mm",
                placeholder: "Start",
                size: "small",
            }));
            const __VLS_117 = __VLS_116({
                modelValue: (item.startTime),
                format: "HH:mm",
                valueFormat: "HH:mm",
                placeholder: "Start",
                size: "small",
            }, ...__VLS_functionalComponentArgsRest(__VLS_116));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "time-sep" },
            });
            const __VLS_119 = {}.ElTimePicker;
            /** @type {[typeof __VLS_components.ElTimePicker, typeof __VLS_components.elTimePicker, ]} */ ;
            // @ts-ignore
            const __VLS_120 = __VLS_asFunctionalComponent(__VLS_119, new __VLS_119({
                modelValue: (item.endTime),
                format: "HH:mm",
                valueFormat: "HH:mm",
                placeholder: "End",
                size: "small",
            }));
            const __VLS_121 = __VLS_120({
                modelValue: (item.endTime),
                format: "HH:mm",
                valueFormat: "HH:mm",
                placeholder: "End",
                size: "small",
            }, ...__VLS_functionalComponentArgsRest(__VLS_120));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(__VLS_ctx.viewMode === 'list'))
                            return;
                        if (!(__VLS_ctx.activeDay))
                            return;
                        __VLS_ctx.removeItem('other', ii);
                    } },
                ...{ class: "remove-btn" },
            });
        }
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "planning-empty" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.openAiDialog) },
        ...{ class: "ai-float-btn" },
        title: "AI Assistant",
    });
    const __VLS_123 = {}.ElDialog;
    /** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
    // @ts-ignore
    const __VLS_124 = __VLS_asFunctionalComponent(__VLS_123, new __VLS_123({
        ...{ 'onOpened': {} },
        ...{ 'onClose': {} },
        modelValue: (__VLS_ctx.mapDialogVisible),
        title: "🗺️ Map Picker",
        width: "720px",
        destroyOnClose: true,
    }));
    const __VLS_125 = __VLS_124({
        ...{ 'onOpened': {} },
        ...{ 'onClose': {} },
        modelValue: (__VLS_ctx.mapDialogVisible),
        title: "🗺️ Map Picker",
        width: "720px",
        destroyOnClose: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_124));
    let __VLS_127;
    let __VLS_128;
    let __VLS_129;
    const __VLS_130 = {
        onOpened: (__VLS_ctx.onMapDialogOpened)
    };
    const __VLS_131 = {
        onClose: (__VLS_ctx.closeMapDialog)
    };
    __VLS_126.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "map-picker-body" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        id: "trip-map-container",
        ...{ style: {} },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "map-hint-text" },
    });
    {
        const { footer: __VLS_thisSlot } = __VLS_126.slots;
        const __VLS_132 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_133 = __VLS_asFunctionalComponent(__VLS_132, new __VLS_132({
            ...{ 'onClick': {} },
        }));
        const __VLS_134 = __VLS_133({
            ...{ 'onClick': {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_133));
        let __VLS_136;
        let __VLS_137;
        let __VLS_138;
        const __VLS_139 = {
            onClick: (...[$event]) => {
                if (!!(__VLS_ctx.viewMode === 'list'))
                    return;
                __VLS_ctx.mapDialogVisible = false;
            }
        };
        __VLS_135.slots.default;
        var __VLS_135;
    }
    var __VLS_126;
    const __VLS_140 = {}.ElDialog;
    /** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
    // @ts-ignore
    const __VLS_141 = __VLS_asFunctionalComponent(__VLS_140, new __VLS_140({
        modelValue: (__VLS_ctx.searchDialogVisible),
        title: (__VLS_ctx.searchSection === 'attractions' ? '🔍 Search Attractions' : '🍽️ Search Dining'),
        width: "560px",
        destroyOnClose: true,
    }));
    const __VLS_142 = __VLS_141({
        modelValue: (__VLS_ctx.searchDialogVisible),
        title: (__VLS_ctx.searchSection === 'attractions' ? '🔍 Search Attractions' : '🍽️ Search Dining'),
        width: "560px",
        destroyOnClose: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_141));
    __VLS_143.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "search-dialog-body" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "search-input-row" },
    });
    const __VLS_144 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_145 = __VLS_asFunctionalComponent(__VLS_144, new __VLS_144({
        ...{ 'onKeyup': {} },
        modelValue: (__VLS_ctx.searchKeyword),
        placeholder: "Enter keyword...",
        size: "large",
    }));
    const __VLS_146 = __VLS_145({
        ...{ 'onKeyup': {} },
        modelValue: (__VLS_ctx.searchKeyword),
        placeholder: "Enter keyword...",
        size: "large",
    }, ...__VLS_functionalComponentArgsRest(__VLS_145));
    let __VLS_148;
    let __VLS_149;
    let __VLS_150;
    const __VLS_151 = {
        onKeyup: (__VLS_ctx.doSearch)
    };
    var __VLS_147;
    const __VLS_152 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_153 = __VLS_asFunctionalComponent(__VLS_152, new __VLS_152({
        ...{ 'onClick': {} },
        type: "primary",
        size: "large",
        loading: (__VLS_ctx.searchLoading),
    }));
    const __VLS_154 = __VLS_153({
        ...{ 'onClick': {} },
        type: "primary",
        size: "large",
        loading: (__VLS_ctx.searchLoading),
    }, ...__VLS_functionalComponentArgsRest(__VLS_153));
    let __VLS_156;
    let __VLS_157;
    let __VLS_158;
    const __VLS_159 = {
        onClick: (__VLS_ctx.doSearch)
    };
    __VLS_155.slots.default;
    var __VLS_155;
    if (__VLS_ctx.searchResults.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "search-results" },
        });
        for (const [item] of __VLS_getVForSourceType((__VLS_ctx.searchResults))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ onClick: (...[$event]) => {
                        if (!!(__VLS_ctx.viewMode === 'list'))
                            return;
                        if (!(__VLS_ctx.searchResults.length))
                            return;
                        __VLS_ctx.selectSearchResult(item);
                    } },
                key: (item.id),
                ...{ class: "search-result-card glass" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "result-name" },
            });
            (item.name);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "result-meta" },
            });
            if (item.category) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "result-category" },
                });
                (item.category);
            }
            if (item.address) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "result-address" },
                });
                (item.address);
            }
            if (item.latitude != null) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "result-coords" },
                });
                (item.latitude.toFixed(4));
                (item.longitude.toFixed(4));
            }
        }
    }
    else if (__VLS_ctx.searchKeyword && !__VLS_ctx.searchLoading) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "search-empty" },
        });
    }
    var __VLS_143;
    const __VLS_160 = {}.ElDialog;
    /** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
    // @ts-ignore
    const __VLS_161 = __VLS_asFunctionalComponent(__VLS_160, new __VLS_160({
        modelValue: (__VLS_ctx.aiDialogVisible),
        title: "🤖 AI Trip Assistant",
        width: "620px",
        destroyOnClose: true,
    }));
    const __VLS_162 = __VLS_161({
        modelValue: (__VLS_ctx.aiDialogVisible),
        title: "🤖 AI Trip Assistant",
        width: "620px",
        destroyOnClose: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_161));
    __VLS_163.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ai-dialog-body" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ai-chat-area" },
        ref: "aiChatRef",
    });
    /** @type {typeof __VLS_ctx.aiChatRef} */ ;
    for (const [msg, i] of __VLS_getVForSourceType((__VLS_ctx.aiMessages))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (i),
            ...{ class: (['ai-msg-row', msg.role]) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ai-msg-bubble" },
            ...{ class: (msg.role) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ai-msg-avatar" },
        });
        (msg.role === 'user' ? '😎' : '🤖');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ai-msg-content" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ai-msg-text" },
        });
        (msg.content);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ai-msg-time" },
        });
        (msg.time);
    }
    if (__VLS_ctx.aiLoading) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ai-msg-row assistant" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ai-msg-bubble assistant" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ai-msg-avatar" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ai-msg-content" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "typing-dots" },
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ai-input-bar" },
    });
    const __VLS_164 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_165 = __VLS_asFunctionalComponent(__VLS_164, new __VLS_164({
        ...{ 'onKeyup': {} },
        modelValue: (__VLS_ctx.aiInput),
        placeholder: "Ask me about your trip...",
        size: "large",
        disabled: (__VLS_ctx.aiLoading),
    }));
    const __VLS_166 = __VLS_165({
        ...{ 'onKeyup': {} },
        modelValue: (__VLS_ctx.aiInput),
        placeholder: "Ask me about your trip...",
        size: "large",
        disabled: (__VLS_ctx.aiLoading),
    }, ...__VLS_functionalComponentArgsRest(__VLS_165));
    let __VLS_168;
    let __VLS_169;
    let __VLS_170;
    const __VLS_171 = {
        onKeyup: (__VLS_ctx.sendAiMessage)
    };
    var __VLS_167;
    const __VLS_172 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_173 = __VLS_asFunctionalComponent(__VLS_172, new __VLS_172({
        ...{ 'onClick': {} },
        type: "primary",
        size: "large",
        loading: (__VLS_ctx.aiLoading),
        ...{ class: "ai-send-btn" },
    }));
    const __VLS_174 = __VLS_173({
        ...{ 'onClick': {} },
        type: "primary",
        size: "large",
        loading: (__VLS_ctx.aiLoading),
        ...{ class: "ai-send-btn" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_173));
    let __VLS_176;
    let __VLS_177;
    let __VLS_178;
    const __VLS_179 = {
        onClick: (__VLS_ctx.sendAiMessage)
    };
    __VLS_175.slots.default;
    var __VLS_175;
    var __VLS_163;
}
var __VLS_2;
/** @type {__VLS_StyleScopedClasses['itinerary-page']} */ ;
/** @type {__VLS_StyleScopedClasses['hero']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-bg']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-content']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['loading-state']} */ ;
/** @type {__VLS_StyleScopedClasses['loading-spinner']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-state']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['trips-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['trip-card']} */ ;
/** @type {__VLS_StyleScopedClasses['glass']} */ ;
/** @type {__VLS_StyleScopedClasses['trip-top']} */ ;
/** @type {__VLS_StyleScopedClasses['trip-delete-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['trip-body']} */ ;
/** @type {__VLS_StyleScopedClasses['trip-name']} */ ;
/** @type {__VLS_StyleScopedClasses['trip-stats']} */ ;
/** @type {__VLS_StyleScopedClasses['stat']} */ ;
/** @type {__VLS_StyleScopedClasses['stat']} */ ;
/** @type {__VLS_StyleScopedClasses['stat']} */ ;
/** @type {__VLS_StyleScopedClasses['trip-foot']} */ ;
/** @type {__VLS_StyleScopedClasses['trip-date']} */ ;
/** @type {__VLS_StyleScopedClasses['pagination-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['planning-page']} */ ;
/** @type {__VLS_StyleScopedClasses['planning-topbar']} */ ;
/** @type {__VLS_StyleScopedClasses['glass-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['back-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['title-input']} */ ;
/** @type {__VLS_StyleScopedClasses['map-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['save-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['planning-dates']} */ ;
/** @type {__VLS_StyleScopedClasses['glass-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['date-field']} */ ;
/** @type {__VLS_StyleScopedClasses['date-arrow']} */ ;
/** @type {__VLS_StyleScopedClasses['date-field']} */ ;
/** @type {__VLS_StyleScopedClasses['day-count']} */ ;
/** @type {__VLS_StyleScopedClasses['day-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['glass-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['tabs-scroll']} */ ;
/** @type {__VLS_StyleScopedClasses['day-tab']} */ ;
/** @type {__VLS_StyleScopedClasses['tab-date']} */ ;
/** @type {__VLS_StyleScopedClasses['add-day-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['day-content']} */ ;
/** @type {__VLS_StyleScopedClasses['sections-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['section-card']} */ ;
/** @type {__VLS_StyleScopedClasses['section-header']} */ ;
/** @type {__VLS_StyleScopedClasses['add-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['section-body']} */ ;
/** @type {__VLS_StyleScopedClasses['section-empty']} */ ;
/** @type {__VLS_StyleScopedClasses['section-item']} */ ;
/** @type {__VLS_StyleScopedClasses['item-name-input']} */ ;
/** @type {__VLS_StyleScopedClasses['item-time']} */ ;
/** @type {__VLS_StyleScopedClasses['time-sep']} */ ;
/** @type {__VLS_StyleScopedClasses['remove-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['section-card']} */ ;
/** @type {__VLS_StyleScopedClasses['section-header']} */ ;
/** @type {__VLS_StyleScopedClasses['add-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['add-btn-light']} */ ;
/** @type {__VLS_StyleScopedClasses['section-body']} */ ;
/** @type {__VLS_StyleScopedClasses['section-empty']} */ ;
/** @type {__VLS_StyleScopedClasses['section-item']} */ ;
/** @type {__VLS_StyleScopedClasses['item-name-input']} */ ;
/** @type {__VLS_StyleScopedClasses['item-time']} */ ;
/** @type {__VLS_StyleScopedClasses['time-sep']} */ ;
/** @type {__VLS_StyleScopedClasses['remove-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['section-card']} */ ;
/** @type {__VLS_StyleScopedClasses['section-header']} */ ;
/** @type {__VLS_StyleScopedClasses['add-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['section-body']} */ ;
/** @type {__VLS_StyleScopedClasses['section-empty']} */ ;
/** @type {__VLS_StyleScopedClasses['section-item']} */ ;
/** @type {__VLS_StyleScopedClasses['item-name-input']} */ ;
/** @type {__VLS_StyleScopedClasses['item-time']} */ ;
/** @type {__VLS_StyleScopedClasses['time-sep']} */ ;
/** @type {__VLS_StyleScopedClasses['remove-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['planning-empty']} */ ;
/** @type {__VLS_StyleScopedClasses['ai-float-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['map-picker-body']} */ ;
/** @type {__VLS_StyleScopedClasses['map-hint-text']} */ ;
/** @type {__VLS_StyleScopedClasses['search-dialog-body']} */ ;
/** @type {__VLS_StyleScopedClasses['search-input-row']} */ ;
/** @type {__VLS_StyleScopedClasses['search-results']} */ ;
/** @type {__VLS_StyleScopedClasses['search-result-card']} */ ;
/** @type {__VLS_StyleScopedClasses['glass']} */ ;
/** @type {__VLS_StyleScopedClasses['result-name']} */ ;
/** @type {__VLS_StyleScopedClasses['result-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['result-category']} */ ;
/** @type {__VLS_StyleScopedClasses['result-address']} */ ;
/** @type {__VLS_StyleScopedClasses['result-coords']} */ ;
/** @type {__VLS_StyleScopedClasses['search-empty']} */ ;
/** @type {__VLS_StyleScopedClasses['ai-dialog-body']} */ ;
/** @type {__VLS_StyleScopedClasses['ai-chat-area']} */ ;
/** @type {__VLS_StyleScopedClasses['ai-msg-bubble']} */ ;
/** @type {__VLS_StyleScopedClasses['ai-msg-avatar']} */ ;
/** @type {__VLS_StyleScopedClasses['ai-msg-content']} */ ;
/** @type {__VLS_StyleScopedClasses['ai-msg-text']} */ ;
/** @type {__VLS_StyleScopedClasses['ai-msg-time']} */ ;
/** @type {__VLS_StyleScopedClasses['ai-msg-row']} */ ;
/** @type {__VLS_StyleScopedClasses['assistant']} */ ;
/** @type {__VLS_StyleScopedClasses['ai-msg-bubble']} */ ;
/** @type {__VLS_StyleScopedClasses['assistant']} */ ;
/** @type {__VLS_StyleScopedClasses['ai-msg-avatar']} */ ;
/** @type {__VLS_StyleScopedClasses['ai-msg-content']} */ ;
/** @type {__VLS_StyleScopedClasses['typing-dots']} */ ;
/** @type {__VLS_StyleScopedClasses['ai-input-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['ai-send-btn']} */ ;
// @ts-ignore
var __VLS_58 = __VLS_57;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            DefaultLayout: DefaultLayout,
            viewMode: viewMode,
            itineraries: itineraries,
            loading: loading,
            submitting: submitting,
            currentPage: currentPage,
            pageSize: pageSize,
            total: total,
            tripColors: tripColors,
            createDialogVisible: createDialogVisible,
            createFormRef: createFormRef,
            createForm: createForm,
            createRules: createRules,
            tripPlan: tripPlan,
            activeDayIndex: activeDayIndex,
            activeDay: activeDay,
            mapDialogVisible: mapDialogVisible,
            searchDialogVisible: searchDialogVisible,
            searchSection: searchSection,
            searchKeyword: searchKeyword,
            searchResults: searchResults,
            searchLoading: searchLoading,
            aiDialogVisible: aiDialogVisible,
            aiInput: aiInput,
            aiLoading: aiLoading,
            aiMessages: aiMessages,
            aiChatRef: aiChatRef,
            openCreateDialog: openCreateDialog,
            handleCreate: handleCreate,
            handleDelete: handleDelete,
            handlePageChange: handlePageChange,
            handleSizeChange: handleSizeChange,
            getSpotCount: getSpotCount,
            formatDistance: formatDistance,
            formatTime: formatTime,
            formatDate: formatDate,
            enterPlanning: enterPlanning,
            regenerateDays: regenerateDays,
            addDay: addDay,
            addItem: addItem,
            removeItem: removeItem,
            openMapDialog: openMapDialog,
            onMapDialogOpened: onMapDialogOpened,
            closeMapDialog: closeMapDialog,
            openSearchDialog: openSearchDialog,
            doSearch: doSearch,
            selectSearchResult: selectSearchResult,
            openAiDialog: openAiDialog,
            sendAiMessage: sendAiMessage,
            handleSave: handleSave,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
