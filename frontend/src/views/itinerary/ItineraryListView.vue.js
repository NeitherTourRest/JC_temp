/// <reference types="../../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { ref, reactive, computed, onMounted, nextTick } from 'vue';
import DefaultLayout from '@/layouts/DefaultLayout.vue';
import { itineraryApi } from '@/api/itineraryApi';
import { ElMessage } from 'element-plus';
import { spotApi } from '@/api/spotApi';
import { aiApi } from '@/api/aiApi';
import { navigationApi } from '@/api/navigationApi';
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
    version: 3,
    title: '',
    startDate: '',
    endDate: '',
    days: []
});
const activeDayIndex = ref(0);
const activeDay = computed(() => tripPlan.days[activeDayIndex.value] ?? null);
const routeLoading = ref(false);
const appliedBudget = ref(null);
/* ── Dialog 1: Map Picker state ──────────────────────── */
const mapDialogVisible = ref(false);
let tripMap = null;
let tripAMapInstance = null;
/* ── Dialog 2: Slot Editor state ─────────────────────── */
const slotEditVisible = ref(false);
const editingSlot = ref(null);
const editingSlotIndex = ref(-1);
const slotEditType = ref('text');
const slotEditStart = ref(null);
const slotEditEnd = ref(null);
const slotEditText = ref('');
const slotSearchKeyword = ref('');
const slotSpotResults = ref([]);
const slotFoodResults = ref([]);
/* ── Dialog 3: AI Chat state ─────────────────────────── */
const aiDialogVisible = ref(false);
const aiInput = ref('');
const aiLoading = ref(false);
const aiMessages = ref([]);
const aiChatRef = ref();
/* ── Dialog 4: AI Plan state ──────────────────────────── */
const aiPlanDialogVisible = ref(false);
const planForm = ref({ days: 2, interests: '自然风光,历史古迹', budget: '中', transport: '步行', additionalInfo: '' });
const planResult = ref(null);
const planLoading = ref(false);
/* ── Dialog 5: Budget state ──────────────────────────── */
const budgetDialogVisible = ref(false);
const budgetForm = ref({ days: 2, peopleCount: 2, spots: '十三陵,居庸关长城', transport: '公共交通', diningPref: '普通', accommodation: '经济型' });
const budgetResult = ref(null);
const budgetLoading = ref(false);
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
        ElMessage.error('加载行程失败');
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
        ElMessage.success('行程已创建！');
        createDialogVisible.value = false;
        await fetchItineraries();
    }
    catch (e) {
        ElMessage.error('创建行程失败');
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
        ElMessage.success('行程已删除');
        await fetchItineraries();
    }
    catch (e) {
        ElMessage.error('删除行程失败');
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
function migrateLegacyPlan(legacy) {
    const ld = legacy;
    return {
        version: 3,
        title: ld.title || '',
        startDate: ld.startDate || '',
        endDate: ld.endDate || '',
        aiSessionId: ld.aiSessionId,
        days: (ld.days || []).map((d) => ({
            dayIndex: d.dayIndex,
            date: d.date || '',
            slots: [
                ...(d.sections?.attractions || []).map((p) => ({
                    id: p.id || `slot_${Date.now()}_${Math.random()}`,
                    startTime: p.startTime || '09:00',
                    endTime: p.endTime || '10:00',
                    spotId: p.spotId,
                    spotName: p.name,
                    name: p.name,
                    type: 'spot',
                })),
                ...(d.sections?.dining || []).map((p) => ({
                    id: p.id || `slot_${Date.now()}_${Math.random()}`,
                    startTime: p.startTime || '12:00',
                    endTime: p.endTime || '13:00',
                    foodId: p.foodId,
                    foodName: p.name,
                    name: p.name,
                    type: 'food',
                })),
                ...(d.sections?.other || []).map((p) => ({
                    id: p.id || `slot_${Date.now()}_${Math.random()}`,
                    startTime: p.startTime || '14:00',
                    endTime: p.endTime || '15:00',
                    text: p.name,
                    name: p.name,
                    type: 'text',
                })),
            ].sort((a, b) => a.startTime.localeCompare(b.startTime)),
        })),
    };
}
function enterPlanning(item) {
    editingId.value = item.id;
    // Try to restore saved plan from routeData
    if (item.routeData) {
        try {
            const parsed = JSON.parse(item.routeData);
            if (parsed.version === 3) {
                // Already new format — restore directly
                const p = parsed;
                tripPlan.version = 3;
                tripPlan.title = p.title || item.name;
                tripPlan.startDate = p.startDate || '';
                tripPlan.endDate = p.endDate || '';
                tripPlan.days = p.days || [];
                tripPlan.aiSessionId = p.aiSessionId;
            }
            else {
                // Old format — migrate
                const migrated = migrateLegacyPlan(parsed);
                tripPlan.version = 3;
                tripPlan.title = migrated.title || item.name;
                tripPlan.startDate = migrated.startDate;
                tripPlan.endDate = migrated.endDate;
                tripPlan.days = migrated.days;
                tripPlan.aiSessionId = migrated.aiSessionId;
            }
        }
        catch {
            // Invalid JSON — start fresh
            tripPlan.title = item.name;
            tripPlan.startDate = '';
            tripPlan.endDate = '';
            tripPlan.days = [];
            tripPlan.aiSessionId = undefined;
        }
    }
    else {
        tripPlan.title = item.name;
        tripPlan.startDate = '';
        tripPlan.endDate = '';
        tripPlan.days = [];
        tripPlan.aiSessionId = undefined;
    }
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
            slots: []
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
        slots: []
    });
    activeDayIndex.value = tripPlan.days.length - 1;
}
/* ───────────────────────────────────────────────────────
   Planning mode: Timeline functions
   ─────────────────────────────────────────────────────── */
const sortedSlots = computed(() => [...(activeDay.value?.slots || [])].sort((a, b) => a.startTime.localeCompare(b.startTime)));
const totalRoutedStops = computed(() => (activeDay.value?.slots || []).filter(s => s.routeOrder != null).length);
function slotTop(slot) {
    const h = Math.max(0, parseInt(slot.startTime.split(':')[0]) || 0);
    const m = Math.max(0, parseInt(slot.startTime.split(':')[1]) || 0);
    return `${h * 60 + m}px`;
}
function slotHeight(slot) {
    const [sh, sm] = slot.startTime.split(':').map(Number);
    const [eh, em] = slot.endTime.split(':').map(Number);
    const startMin = Math.max(0, sh) * 60 + Math.max(0, sm);
    const endMin = Math.max(0, eh) * 60 + Math.max(0, em);
    return `${Math.max(28, endMin - startMin)}px`;
}
function onTimelineClick(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const hour = Math.round(y / 60);
    addSlotAt(Math.max(0, Math.min(23, hour)));
}
function addSlotAt(hour) {
    if (!activeDay.value)
        return;
    activeDay.value.slots.push({
        id: nextItemId(),
        startTime: `${String(hour).padStart(2, '0')}:00`,
        endTime: `${String(Math.min(hour + 1, 24)).padStart(2, '0')}:00`,
        type: 'text',
        name: '',
    });
}
function deleteSlot(slotId) {
    if (!activeDay.value)
        return;
    const idx = activeDay.value.slots.findIndex(s => s.id === slotId);
    if (idx >= 0)
        activeDay.value.slots.splice(idx, 1);
}
/* ───────────────────────────────────────────────────────
   Planning mode: Slot Editor
   ─────────────────────────────────────────────────────── */
function openSlotEditor(slot) {
    editingSlot.value = { ...slot };
    const idx = activeDay.value?.slots.findIndex(s => s.id === slot.id) ?? -1;
    editingSlotIndex.value = idx;
    slotEditType.value = slot.type;
    const [sh, sm] = slot.startTime.split(':').map(Number);
    const [eh, em] = slot.endTime.split(':').map(Number);
    const d = new Date();
    slotEditStart.value = new Date(d.getFullYear(), d.getMonth(), d.getDate(), sh, sm);
    slotEditEnd.value = new Date(d.getFullYear(), d.getMonth(), d.getDate(), eh, em);
    slotEditText.value = slot.text || '';
    slotSearchKeyword.value = '';
    slotSpotResults.value = [];
    slotFoodResults.value = [];
    slotEditVisible.value = true;
}
function saveSlotEdit() {
    if (!editingSlot.value || !activeDay.value || editingSlotIndex.value < 0)
        return;
    const slot = activeDay.value.slots[editingSlotIndex.value];
    if (slotEditStart.value) {
        slot.startTime = `${String(slotEditStart.value.getHours()).padStart(2, '0')}:${String(slotEditStart.value.getMinutes()).padStart(2, '0')}`;
    }
    if (slotEditEnd.value) {
        slot.endTime = `${String(slotEditEnd.value.getHours()).padStart(2, '0')}:${String(slotEditEnd.value.getMinutes()).padStart(2, '0')}`;
    }
    slot.type = slotEditType.value;
    slot.text = slotEditText.value || undefined;
    if (slotEditType.value !== 'spot') {
        slot.spotId = undefined;
        slot.spotName = undefined;
    }
    if (slotEditType.value !== 'food') {
        slot.foodId = undefined;
        slot.foodName = undefined;
    }
    // Coordinates: clear for text, copy from search result for spot/food
    if (slotEditType.value === 'text') {
        slot.lat = undefined;
        slot.lng = undefined;
    }
    if (slotEditType.value === 'spot' || slotEditType.value === 'food') {
        if (editingSlot.value.lat != null)
            slot.lat = editingSlot.value.lat;
        if (editingSlot.value.lng != null)
            slot.lng = editingSlot.value.lng;
    }
    if (slotEditType.value === 'spot') {
        slot.name = editingSlot.value.name;
    }
    if (slotEditType.value === 'food') {
        slot.name = editingSlot.value.name;
    }
    slotEditVisible.value = false;
}
async function doSlotSpotSearch() {
    if (!slotSearchKeyword.value.trim())
        return;
    const r = await spotApi.search({ keyword: slotSearchKeyword.value.trim(), size: 10 });
    slotSpotResults.value = r.data.data?.content || [];
}
async function doSlotFoodSearch() {
    if (!slotSearchKeyword.value.trim())
        return;
    const { foodApi } = await import('@/api/foodApi');
    const r = await foodApi.search({ keyword: slotSearchKeyword.value.trim(), size: 10 });
    slotFoodResults.value = r.data.data?.content || [];
}
function selectSlotSpot(spot) {
    if (!editingSlot.value)
        return;
    editingSlot.value.spotId = spot.id;
    editingSlot.value.spotName = spot.name;
    editingSlot.value.name = spot.name;
    editingSlot.value.lat = spot.latitude;
    editingSlot.value.lng = spot.longitude;
}
function selectSlotFood(food) {
    if (!editingSlot.value)
        return;
    editingSlot.value.foodId = food.id;
    editingSlot.value.foodName = food.name;
    editingSlot.value.name = food.name;
    editingSlot.value.lat = food.latitude;
    editingSlot.value.lng = food.longitude;
}
/* ───────────────────────────────────────────────────────
   Planning mode: ID generator
   ─────────────────────────────────────────────────────── */
let itemIdCounter = 0;
function nextItemId() {
    return `item_${Date.now()}_${++itemIdCounter}`;
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
            activeDay.value.slots.push({
                id: nextItemId(),
                startTime: '09:00',
                endTime: '10:00',
                name: `📍 Map Point (${lng.toFixed(4)}, ${lat.toFixed(4)})`,
                text: `Map point: ${lng.toFixed(4)}, ${lat.toFixed(4)}`,
                type: 'text',
                lat,
                lng,
            });
            ElMessage.success('Point added to day');
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
        aiMessages.value.push({ role: 'assistant', content: '⚠️ 获取AI回复失败', time: '' });
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
   Dialog 4/5: AI Plan & Budget
   ─────────────────────────────────────────────────────── */
function openAiPlanDialog() {
    aiPlanDialogVisible.value = true;
    planResult.value = null;
}
function openBudgetDialog() {
    budgetDialogVisible.value = true;
    budgetResult.value = null;
    budgetLoading.value = false;
    // Auto-fill from trip data
    budgetForm.value.days = tripPlan.days.length || 2;
    const allSpotNames = [];
    for (const day of tripPlan.days) {
        for (const slot of day.slots) {
            if (slot.spotName && !allSpotNames.includes(slot.spotName)) {
                allSpotNames.push(slot.spotName);
            }
        }
    }
    if (allSpotNames.length > 0) {
        budgetForm.value.spots = allSpotNames.join(',');
    }
}
async function generatePlan() {
    planLoading.value = true;
    planResult.value = null;
    try {
        const res = await aiApi.plan(planForm.value);
        planResult.value = res.data.data;
    }
    catch {
        planResult.value = { title: '请求失败', days: [], tips: ['请检查AI配置'], estimatedCost: '' };
    }
    finally {
        planLoading.value = false;
    }
}
async function estimateBudget() {
    budgetLoading.value = true;
    budgetResult.value = null;
    try {
        const res = await aiApi.budget(budgetForm.value);
        budgetResult.value = res.data.data;
    }
    catch {
        budgetResult.value = { totalBudget: 'N/A', categories: [], suggestions: ['Check AI config'] };
    }
    finally {
        budgetLoading.value = false;
    }
}
function applyPlanResult() {
    if (!planResult.value || !planResult.value.days)
        return;
    // Build tripPlan days from plan result with spot/food matching
    tripPlan.days = planResult.value.days.map((day, di) => ({
        dayIndex: di + 1,
        date: day.date || `Day ${di + 1}`,
        slots: (day.schedule || []).map((a) => {
            const st = a.time || '09:00';
            const [sh, sm] = st.split(':').map(Number);
            const endH = Math.min(sh + 1, 23);
            const base = {
                id: nextItemId(),
                startTime: st,
                endTime: `${String(endH).padStart(2, '0')}:${String(sm).padStart(2, '0')}`,
                name: a.activity || '',
                text: a.activity || '',
                type: 'text',
            };
            if (a.matchedType === 'spot' && a.matchedLat != null && a.matchedLng != null) {
                base.type = 'spot';
                base.spotId = a.matchedSpotId;
                base.spotName = a.matchedName || a.activity;
                base.lat = a.matchedLat;
                base.lng = a.matchedLng;
            }
            else if (a.matchedType === 'food' && a.matchedLat != null && a.matchedLng != null) {
                base.type = 'food';
                base.foodId = a.matchedFoodId;
                base.foodName = a.matchedName || a.activity;
                base.lat = a.matchedLat;
                base.lng = a.matchedLng;
            }
            return base;
        }),
    }));
    ElMessage.success('已应用AI规划至行程 — 已关联 ' + countMatched(planResult.value.days) + ' 个地点');
    aiPlanDialogVisible.value = false;
}
function countMatched(days) {
    let n = 0;
    for (const d of days) {
        for (const a of (d.schedule || [])) {
            if (a.matchedType === 'spot' || a.matchedType === 'food')
                n++;
        }
    }
    return n;
}
/* ───────────────────────────────────────────────────────
   Planning mode: save
   ─────────────────────────────────────────────────────── */
async function routeDayPlan() {
    if (!activeDay.value)
        return;
    // Filter slots with coordinates, sorted by time order
    const withCoords = [...activeDay.value.slots]
        .filter(s => s.lat != null && s.lng != null)
        .sort((a, b) => a.startTime.localeCompare(b.startTime));
    if (withCoords.length < 2) {
        ElMessage.warning(withCoords.length === 0 ? 'No locations with coordinates — add spots/food first' : 'Need at least 2 locations with coordinates');
        return;
    }
    routeLoading.value = true;
    try {
        // Clear old route orders
        activeDay.value.slots.forEach(s => { s.routeOrder = undefined; });
        // Sequential routing: Dijkstra between each consecutive pair
        let totalDistance = 0;
        for (let i = 0; i < withCoords.length - 1; i++) {
            const from = withCoords[i];
            const to = withCoords[i + 1];
            const isLast = i === withCoords.length - 2;
            const res = await navigationApi.planRoute({
                startLat: from.lat,
                startLng: from.lng,
                targets: [{ lat: to.lat, lng: to.lng, name: to.name || '' }],
                strategy: 'DISTANCE',
                transports: ['WALK'],
                finalDestinationIdx: isLast ? 0 : undefined,
            });
            const rd = res.data.data;
            if (rd) {
                totalDistance += rd.totalDistance;
            }
        }
        // Assign route order by time sequence (1 = first, last = final destination)
        withCoords.forEach((s, i) => { s.routeOrder = i + 1; });
        // Estimate walking time: 80 m/min ≈ 5 km/h
        const estimatedMinutes = Math.round(totalDistance / 80);
        activeDay.value.routeDistance = totalDistance;
        activeDay.value.routeTime = estimatedMinutes;
        ElMessage.success(`Route planned: ${withCoords.length} stops · ${formatDistance(totalDistance)} · ${formatTime(estimatedMinutes)}`);
    }
    catch (e) {
        ElMessage.error('路线规划失败');
        console.error(e);
    }
    finally {
        routeLoading.value = false;
    }
}
function clearDayRoute() {
    if (!activeDay.value)
        return;
    activeDay.value.slots.forEach(s => { s.routeOrder = undefined; });
    activeDay.value.routeDistance = undefined;
    activeDay.value.routeTime = undefined;
}
function applyBudgetResult() {
    if (!budgetResult.value)
        return;
    appliedBudget.value = budgetResult.value;
    ElMessage.success('Budget applied to trip');
    budgetDialogVisible.value = false;
}
async function handleSave() {
    if (!editingId.value)
        return;
    try {
        const plan = {
            version: 3,
            title: tripPlan.title,
            startDate: tripPlan.startDate,
            endDate: tripPlan.endDate,
            days: tripPlan.days.map(d => ({
                dayIndex: d.dayIndex,
                date: d.date,
                slots: d.slots || [],
            })),
            aiSessionId: tripPlan.aiSessionId,
        };
        await itineraryApi.update(editingId.value, {
            name: tripPlan.title,
            routeData: JSON.stringify(plan)
        });
        ElMessage.success('Trip saved!');
    }
    catch (e) {
        ElMessage.error('保存行程失败');
        console.error(e);
    }
}
function goBackToList() {
    viewMode.value = 'list';
    fetchItineraries();
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
/** @type {__VLS_StyleScopedClasses['timeline-header']} */ ;
/** @type {__VLS_StyleScopedClasses['route-clear-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-slot-card']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-slot-card']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-slot-card']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-slot-card']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-slot-card']} */ ;
/** @type {__VLS_StyleScopedClasses['slot-delete']} */ ;
/** @type {__VLS_StyleScopedClasses['slot-edit-row']} */ ;
/** @type {__VLS_StyleScopedClasses['slot-time-pickers']} */ ;
/** @type {__VLS_StyleScopedClasses['slot-search-item']} */ ;
/** @type {__VLS_StyleScopedClasses['slot-search-item']} */ ;
/** @type {__VLS_StyleScopedClasses['planning-empty']} */ ;
/** @type {__VLS_StyleScopedClasses['ai-float-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['map-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['ai-msg-row']} */ ;
/** @type {__VLS_StyleScopedClasses['ai-msg-bubble']} */ ;
/** @type {__VLS_StyleScopedClasses['user']} */ ;
/** @type {__VLS_StyleScopedClasses['ai-msg-bubble']} */ ;
/** @type {__VLS_StyleScopedClasses['ai-msg-content']} */ ;
/** @type {__VLS_StyleScopedClasses['ai-msg-bubble']} */ ;
/** @type {__VLS_StyleScopedClasses['user']} */ ;
/** @type {__VLS_StyleScopedClasses['ai-msg-content']} */ ;
/** @type {__VLS_StyleScopedClasses['ai-input-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['hero']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-content']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-content']} */ ;
/** @type {__VLS_StyleScopedClasses['trips-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['trip-top']} */ ;
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
                title: "确定删除此行程？",
                confirmButtonText: "删除",
                cancelButtonText: "取消",
            }));
            const __VLS_30 = __VLS_29({
                ...{ 'onConfirm': {} },
                title: "确定删除此行程？",
                confirmButtonText: "删除",
                cancelButtonText: "取消",
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
                    title: "删除行程",
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
        ...{ onClick: (__VLS_ctx.goBackToList) },
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
    if (__VLS_ctx.appliedBudget) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "budget-summary-bar" },
        });
        (__VLS_ctx.appliedBudget.totalBudget);
        (__VLS_ctx.appliedBudget.categories?.length || 0);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.viewMode === 'list'))
                        return;
                    if (!(__VLS_ctx.appliedBudget))
                        return;
                    __VLS_ctx.appliedBudget = null;
                } },
            ...{ class: "route-clear-btn" },
        });
    }
    if (__VLS_ctx.activeDay) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "day-content" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "timeline-container" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "timeline-header" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
        (__VLS_ctx.activeDay.dayIndex);
        (__VLS_ctx.activeDay.date);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "timeline-header-actions" },
        });
        const __VLS_99 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_100 = __VLS_asFunctionalComponent(__VLS_99, new __VLS_99({
            ...{ 'onClick': {} },
            size: "small",
            type: "success",
            loading: (__VLS_ctx.routeLoading),
            disabled: (!__VLS_ctx.activeDay || !__VLS_ctx.activeDay.slots.length),
        }));
        const __VLS_101 = __VLS_100({
            ...{ 'onClick': {} },
            size: "small",
            type: "success",
            loading: (__VLS_ctx.routeLoading),
            disabled: (!__VLS_ctx.activeDay || !__VLS_ctx.activeDay.slots.length),
        }, ...__VLS_functionalComponentArgsRest(__VLS_100));
        let __VLS_103;
        let __VLS_104;
        let __VLS_105;
        const __VLS_106 = {
            onClick: (__VLS_ctx.routeDayPlan)
        };
        __VLS_102.slots.default;
        var __VLS_102;
        const __VLS_107 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_108 = __VLS_asFunctionalComponent(__VLS_107, new __VLS_107({
            ...{ 'onClick': {} },
            size: "small",
            type: "primary",
        }));
        const __VLS_109 = __VLS_108({
            ...{ 'onClick': {} },
            size: "small",
            type: "primary",
        }, ...__VLS_functionalComponentArgsRest(__VLS_108));
        let __VLS_111;
        let __VLS_112;
        let __VLS_113;
        const __VLS_114 = {
            onClick: (...[$event]) => {
                if (!!(__VLS_ctx.viewMode === 'list'))
                    return;
                if (!(__VLS_ctx.activeDay))
                    return;
                __VLS_ctx.addSlotAt(12);
            }
        };
        __VLS_110.slots.default;
        var __VLS_110;
        if (__VLS_ctx.activeDay?.routeDistance != null) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "route-info-bar" },
            });
            (__VLS_ctx.formatDistance(__VLS_ctx.activeDay.routeDistance));
            (__VLS_ctx.formatTime(__VLS_ctx.activeDay.routeTime));
            (__VLS_ctx.totalRoutedStops);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (__VLS_ctx.clearDayRoute) },
                ...{ class: "route-clear-btn" },
                title: "Clear route",
            });
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (__VLS_ctx.onTimelineClick) },
            ...{ class: "timeline-track" },
        });
        for (const [h] of __VLS_getVForSourceType((24))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                key: (h),
                ...{ class: "timeline-hour" },
                ...{ style: ({ top: h * 60 + 'px' }) },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "hour-label" },
            });
            (String(h).padStart(2, '0'));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "hour-line" },
            });
        }
        for (const [slot] of __VLS_getVForSourceType((__VLS_ctx.sortedSlots))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ onClick: (...[$event]) => {
                        if (!!(__VLS_ctx.viewMode === 'list'))
                            return;
                        if (!(__VLS_ctx.activeDay))
                            return;
                        __VLS_ctx.openSlotEditor(slot);
                    } },
                key: (slot.id),
                ...{ class: "timeline-slot-card glass-sm" },
                ...{ class: ('slot-' + slot.type) },
                ...{ style: ({ top: __VLS_ctx.slotTop(slot), height: __VLS_ctx.slotHeight(slot) }) },
            });
            if (slot.routeOrder != null) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "route-order-badge" },
                });
                (slot.routeOrder);
            }
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "slot-time" },
            });
            (slot.startTime);
            (slot.endTime);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "slot-name" },
            });
            (slot.name || slot.text || 'New Activity');
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "slot-icon" },
            });
            (slot.type === 'spot' ? '📍' : slot.type === 'food' ? '🍽️' : '📝');
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(__VLS_ctx.viewMode === 'list'))
                            return;
                        if (!(__VLS_ctx.activeDay))
                            return;
                        __VLS_ctx.deleteSlot(slot.id);
                    } },
                ...{ class: "slot-delete" },
            });
        }
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "planning-empty" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ai-float-group" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.openAiPlanDialog) },
        ...{ class: "ai-float-btn" },
        title: "AI Plan",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.openBudgetDialog) },
        ...{ class: "ai-float-btn" },
        title: "预算",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.openAiDialog) },
        ...{ class: "ai-float-btn" },
        title: "AI Assistant",
    });
    const __VLS_115 = {}.ElDialog;
    /** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
    // @ts-ignore
    const __VLS_116 = __VLS_asFunctionalComponent(__VLS_115, new __VLS_115({
        ...{ 'onOpened': {} },
        ...{ 'onClose': {} },
        modelValue: (__VLS_ctx.mapDialogVisible),
        title: "🗺️ Map Picker",
        width: "720px",
        destroyOnClose: true,
    }));
    const __VLS_117 = __VLS_116({
        ...{ 'onOpened': {} },
        ...{ 'onClose': {} },
        modelValue: (__VLS_ctx.mapDialogVisible),
        title: "🗺️ Map Picker",
        width: "720px",
        destroyOnClose: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_116));
    let __VLS_119;
    let __VLS_120;
    let __VLS_121;
    const __VLS_122 = {
        onOpened: (__VLS_ctx.onMapDialogOpened)
    };
    const __VLS_123 = {
        onClose: (__VLS_ctx.closeMapDialog)
    };
    __VLS_118.slots.default;
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
        const { footer: __VLS_thisSlot } = __VLS_118.slots;
        const __VLS_124 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_125 = __VLS_asFunctionalComponent(__VLS_124, new __VLS_124({
            ...{ 'onClick': {} },
        }));
        const __VLS_126 = __VLS_125({
            ...{ 'onClick': {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_125));
        let __VLS_128;
        let __VLS_129;
        let __VLS_130;
        const __VLS_131 = {
            onClick: (...[$event]) => {
                if (!!(__VLS_ctx.viewMode === 'list'))
                    return;
                __VLS_ctx.mapDialogVisible = false;
            }
        };
        __VLS_127.slots.default;
        var __VLS_127;
    }
    var __VLS_118;
    const __VLS_132 = {}.ElDialog;
    /** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
    // @ts-ignore
    const __VLS_133 = __VLS_asFunctionalComponent(__VLS_132, new __VLS_132({
        modelValue: (__VLS_ctx.aiDialogVisible),
        title: "🤖 AI Trip Assistant",
        width: "620px",
        destroyOnClose: true,
    }));
    const __VLS_134 = __VLS_133({
        modelValue: (__VLS_ctx.aiDialogVisible),
        title: "🤖 AI Trip Assistant",
        width: "620px",
        destroyOnClose: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_133));
    __VLS_135.slots.default;
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
    const __VLS_136 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_137 = __VLS_asFunctionalComponent(__VLS_136, new __VLS_136({
        ...{ 'onKeyup': {} },
        modelValue: (__VLS_ctx.aiInput),
        placeholder: "Ask me about your trip...",
        size: "large",
        disabled: (__VLS_ctx.aiLoading),
    }));
    const __VLS_138 = __VLS_137({
        ...{ 'onKeyup': {} },
        modelValue: (__VLS_ctx.aiInput),
        placeholder: "Ask me about your trip...",
        size: "large",
        disabled: (__VLS_ctx.aiLoading),
    }, ...__VLS_functionalComponentArgsRest(__VLS_137));
    let __VLS_140;
    let __VLS_141;
    let __VLS_142;
    const __VLS_143 = {
        onKeyup: (__VLS_ctx.sendAiMessage)
    };
    var __VLS_139;
    const __VLS_144 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_145 = __VLS_asFunctionalComponent(__VLS_144, new __VLS_144({
        ...{ 'onClick': {} },
        type: "primary",
        size: "large",
        loading: (__VLS_ctx.aiLoading),
        ...{ class: "ai-send-btn" },
    }));
    const __VLS_146 = __VLS_145({
        ...{ 'onClick': {} },
        type: "primary",
        size: "large",
        loading: (__VLS_ctx.aiLoading),
        ...{ class: "ai-send-btn" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_145));
    let __VLS_148;
    let __VLS_149;
    let __VLS_150;
    const __VLS_151 = {
        onClick: (__VLS_ctx.sendAiMessage)
    };
    __VLS_147.slots.default;
    var __VLS_147;
    var __VLS_135;
    const __VLS_152 = {}.ElDialog;
    /** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
    // @ts-ignore
    const __VLS_153 = __VLS_asFunctionalComponent(__VLS_152, new __VLS_152({
        modelValue: (__VLS_ctx.aiPlanDialogVisible),
        title: "📋 AI Trip Plan",
        width: "700px",
        top: "5vh",
        destroyOnClose: true,
    }));
    const __VLS_154 = __VLS_153({
        modelValue: (__VLS_ctx.aiPlanDialogVisible),
        title: "📋 AI Trip Plan",
        width: "700px",
        top: "5vh",
        destroyOnClose: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_153));
    __VLS_155.slots.default;
    const __VLS_156 = {}.ElForm;
    /** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
    // @ts-ignore
    const __VLS_157 = __VLS_asFunctionalComponent(__VLS_156, new __VLS_156({
        labelPosition: "top",
    }));
    const __VLS_158 = __VLS_157({
        labelPosition: "top",
    }, ...__VLS_functionalComponentArgsRest(__VLS_157));
    __VLS_159.slots.default;
    const __VLS_160 = {}.ElRow;
    /** @type {[typeof __VLS_components.ElRow, typeof __VLS_components.elRow, typeof __VLS_components.ElRow, typeof __VLS_components.elRow, ]} */ ;
    // @ts-ignore
    const __VLS_161 = __VLS_asFunctionalComponent(__VLS_160, new __VLS_160({
        gutter: (16),
    }));
    const __VLS_162 = __VLS_161({
        gutter: (16),
    }, ...__VLS_functionalComponentArgsRest(__VLS_161));
    __VLS_163.slots.default;
    const __VLS_164 = {}.ElCol;
    /** @type {[typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ]} */ ;
    // @ts-ignore
    const __VLS_165 = __VLS_asFunctionalComponent(__VLS_164, new __VLS_164({
        span: (12),
    }));
    const __VLS_166 = __VLS_165({
        span: (12),
    }, ...__VLS_functionalComponentArgsRest(__VLS_165));
    __VLS_167.slots.default;
    const __VLS_168 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_169 = __VLS_asFunctionalComponent(__VLS_168, new __VLS_168({
        label: "Days",
    }));
    const __VLS_170 = __VLS_169({
        label: "Days",
    }, ...__VLS_functionalComponentArgsRest(__VLS_169));
    __VLS_171.slots.default;
    const __VLS_172 = {}.ElInputNumber;
    /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
    // @ts-ignore
    const __VLS_173 = __VLS_asFunctionalComponent(__VLS_172, new __VLS_172({
        modelValue: (__VLS_ctx.planForm.days),
        min: (1),
        max: (14),
        ...{ style: {} },
    }));
    const __VLS_174 = __VLS_173({
        modelValue: (__VLS_ctx.planForm.days),
        min: (1),
        max: (14),
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_173));
    var __VLS_171;
    var __VLS_167;
    const __VLS_176 = {}.ElCol;
    /** @type {[typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ]} */ ;
    // @ts-ignore
    const __VLS_177 = __VLS_asFunctionalComponent(__VLS_176, new __VLS_176({
        span: (12),
    }));
    const __VLS_178 = __VLS_177({
        span: (12),
    }, ...__VLS_functionalComponentArgsRest(__VLS_177));
    __VLS_179.slots.default;
    const __VLS_180 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_181 = __VLS_asFunctionalComponent(__VLS_180, new __VLS_180({
        label: "Budget",
    }));
    const __VLS_182 = __VLS_181({
        label: "Budget",
    }, ...__VLS_functionalComponentArgsRest(__VLS_181));
    __VLS_183.slots.default;
    const __VLS_184 = {}.ElSelect;
    /** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
    // @ts-ignore
    const __VLS_185 = __VLS_asFunctionalComponent(__VLS_184, new __VLS_184({
        modelValue: (__VLS_ctx.planForm.budget),
        ...{ style: {} },
    }));
    const __VLS_186 = __VLS_185({
        modelValue: (__VLS_ctx.planForm.budget),
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_185));
    __VLS_187.slots.default;
    const __VLS_188 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_189 = __VLS_asFunctionalComponent(__VLS_188, new __VLS_188({
        label: "Low",
        value: "低",
    }));
    const __VLS_190 = __VLS_189({
        label: "Low",
        value: "低",
    }, ...__VLS_functionalComponentArgsRest(__VLS_189));
    const __VLS_192 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_193 = __VLS_asFunctionalComponent(__VLS_192, new __VLS_192({
        label: "Medium",
        value: "中",
    }));
    const __VLS_194 = __VLS_193({
        label: "Medium",
        value: "中",
    }, ...__VLS_functionalComponentArgsRest(__VLS_193));
    const __VLS_196 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_197 = __VLS_asFunctionalComponent(__VLS_196, new __VLS_196({
        label: "High",
        value: "高",
    }));
    const __VLS_198 = __VLS_197({
        label: "High",
        value: "高",
    }, ...__VLS_functionalComponentArgsRest(__VLS_197));
    var __VLS_187;
    var __VLS_183;
    var __VLS_179;
    var __VLS_163;
    const __VLS_200 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_201 = __VLS_asFunctionalComponent(__VLS_200, new __VLS_200({
        label: "Interests",
    }));
    const __VLS_202 = __VLS_201({
        label: "Interests",
    }, ...__VLS_functionalComponentArgsRest(__VLS_201));
    __VLS_203.slots.default;
    const __VLS_204 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_205 = __VLS_asFunctionalComponent(__VLS_204, new __VLS_204({
        modelValue: (__VLS_ctx.planForm.interests),
        placeholder: "e.g. nature, history, food",
    }));
    const __VLS_206 = __VLS_205({
        modelValue: (__VLS_ctx.planForm.interests),
        placeholder: "e.g. nature, history, food",
    }, ...__VLS_functionalComponentArgsRest(__VLS_205));
    var __VLS_203;
    const __VLS_208 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_209 = __VLS_asFunctionalComponent(__VLS_208, new __VLS_208({
        label: "Transport",
    }));
    const __VLS_210 = __VLS_209({
        label: "Transport",
    }, ...__VLS_functionalComponentArgsRest(__VLS_209));
    __VLS_211.slots.default;
    const __VLS_212 = {}.ElSelect;
    /** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
    // @ts-ignore
    const __VLS_213 = __VLS_asFunctionalComponent(__VLS_212, new __VLS_212({
        modelValue: (__VLS_ctx.planForm.transport),
        ...{ style: {} },
    }));
    const __VLS_214 = __VLS_213({
        modelValue: (__VLS_ctx.planForm.transport),
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_213));
    __VLS_215.slots.default;
    const __VLS_216 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_217 = __VLS_asFunctionalComponent(__VLS_216, new __VLS_216({
        label: "Walk",
        value: "步行",
    }));
    const __VLS_218 = __VLS_217({
        label: "Walk",
        value: "步行",
    }, ...__VLS_functionalComponentArgsRest(__VLS_217));
    const __VLS_220 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_221 = __VLS_asFunctionalComponent(__VLS_220, new __VLS_220({
        label: "Bike",
        value: "骑行",
    }));
    const __VLS_222 = __VLS_221({
        label: "Bike",
        value: "骑行",
    }, ...__VLS_functionalComponentArgsRest(__VLS_221));
    const __VLS_224 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_225 = __VLS_asFunctionalComponent(__VLS_224, new __VLS_224({
        label: "Drive",
        value: "驾车",
    }));
    const __VLS_226 = __VLS_225({
        label: "Drive",
        value: "驾车",
    }, ...__VLS_functionalComponentArgsRest(__VLS_225));
    var __VLS_215;
    var __VLS_211;
    const __VLS_228 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_229 = __VLS_asFunctionalComponent(__VLS_228, new __VLS_228({
        label: "Extra Requirements",
    }));
    const __VLS_230 = __VLS_229({
        label: "Extra Requirements",
    }, ...__VLS_functionalComponentArgsRest(__VLS_229));
    __VLS_231.slots.default;
    const __VLS_232 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_233 = __VLS_asFunctionalComponent(__VLS_232, new __VLS_232({
        modelValue: (__VLS_ctx.planForm.additionalInfo),
        type: "textarea",
        rows: (2),
    }));
    const __VLS_234 = __VLS_233({
        modelValue: (__VLS_ctx.planForm.additionalInfo),
        type: "textarea",
        rows: (2),
    }, ...__VLS_functionalComponentArgsRest(__VLS_233));
    var __VLS_231;
    const __VLS_236 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_237 = __VLS_asFunctionalComponent(__VLS_236, new __VLS_236({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.planLoading),
        ...{ style: {} },
    }));
    const __VLS_238 = __VLS_237({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.planLoading),
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_237));
    let __VLS_240;
    let __VLS_241;
    let __VLS_242;
    const __VLS_243 = {
        onClick: (__VLS_ctx.generatePlan)
    };
    __VLS_239.slots.default;
    var __VLS_239;
    var __VLS_159;
    if (__VLS_ctx.planResult && !__VLS_ctx.planLoading) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "dialog-result" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({
            ...{ class: "plan-title-name" },
        });
        (__VLS_ctx.planResult.title);
        for (const [day] of __VLS_getVForSourceType((__VLS_ctx.planResult.days))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                key: (day.day),
                ...{ class: "day-block" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (day.date);
            (day.theme);
            for (const [act] of __VLS_getVForSourceType((day.schedule))) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    key: (act.time),
                    ...{ class: "activity" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "act-time" },
                });
                (act.time);
                if (act.matchedType === 'spot') {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                        ...{ class: "act-match-icon" },
                    });
                }
                else if (act.matchedType === 'food') {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                        ...{ class: "act-match-icon" },
                    });
                }
                else {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                        ...{ class: "act-match-icon" },
                    });
                }
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
                (act.activity);
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "act-loc" },
                });
                (act.location);
            }
        }
        if (__VLS_ctx.planResult.tips?.length) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "plan-tips" },
            });
            for (const [t, i] of __VLS_getVForSourceType((__VLS_ctx.planResult.tips))) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                    key: (i),
                });
                (t);
            }
        }
        if (__VLS_ctx.planResult.estimatedCost) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "plan-cost" },
            });
            (__VLS_ctx.planResult.estimatedCost);
        }
        const __VLS_244 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_245 = __VLS_asFunctionalComponent(__VLS_244, new __VLS_244({
            ...{ 'onClick': {} },
            size: "small",
            type: "success",
            ...{ style: {} },
        }));
        const __VLS_246 = __VLS_245({
            ...{ 'onClick': {} },
            size: "small",
            type: "success",
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_245));
        let __VLS_248;
        let __VLS_249;
        let __VLS_250;
        const __VLS_251 = {
            onClick: (__VLS_ctx.applyPlanResult)
        };
        __VLS_247.slots.default;
        var __VLS_247;
    }
    var __VLS_155;
    const __VLS_252 = {}.ElDialog;
    /** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
    // @ts-ignore
    const __VLS_253 = __VLS_asFunctionalComponent(__VLS_252, new __VLS_252({
        modelValue: (__VLS_ctx.budgetDialogVisible),
        title: "💰 Budget Estimate",
        width: "700px",
        top: "5vh",
        destroyOnClose: true,
    }));
    const __VLS_254 = __VLS_253({
        modelValue: (__VLS_ctx.budgetDialogVisible),
        title: "💰 Budget Estimate",
        width: "700px",
        top: "5vh",
        destroyOnClose: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_253));
    __VLS_255.slots.default;
    const __VLS_256 = {}.ElForm;
    /** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
    // @ts-ignore
    const __VLS_257 = __VLS_asFunctionalComponent(__VLS_256, new __VLS_256({
        labelPosition: "top",
    }));
    const __VLS_258 = __VLS_257({
        labelPosition: "top",
    }, ...__VLS_functionalComponentArgsRest(__VLS_257));
    __VLS_259.slots.default;
    const __VLS_260 = {}.ElRow;
    /** @type {[typeof __VLS_components.ElRow, typeof __VLS_components.elRow, typeof __VLS_components.ElRow, typeof __VLS_components.elRow, ]} */ ;
    // @ts-ignore
    const __VLS_261 = __VLS_asFunctionalComponent(__VLS_260, new __VLS_260({
        gutter: (16),
    }));
    const __VLS_262 = __VLS_261({
        gutter: (16),
    }, ...__VLS_functionalComponentArgsRest(__VLS_261));
    __VLS_263.slots.default;
    const __VLS_264 = {}.ElCol;
    /** @type {[typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ]} */ ;
    // @ts-ignore
    const __VLS_265 = __VLS_asFunctionalComponent(__VLS_264, new __VLS_264({
        span: (12),
    }));
    const __VLS_266 = __VLS_265({
        span: (12),
    }, ...__VLS_functionalComponentArgsRest(__VLS_265));
    __VLS_267.slots.default;
    const __VLS_268 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_269 = __VLS_asFunctionalComponent(__VLS_268, new __VLS_268({
        label: "Days",
    }));
    const __VLS_270 = __VLS_269({
        label: "Days",
    }, ...__VLS_functionalComponentArgsRest(__VLS_269));
    __VLS_271.slots.default;
    const __VLS_272 = {}.ElInputNumber;
    /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
    // @ts-ignore
    const __VLS_273 = __VLS_asFunctionalComponent(__VLS_272, new __VLS_272({
        modelValue: (__VLS_ctx.budgetForm.days),
        min: (1),
        max: (30),
        ...{ style: {} },
    }));
    const __VLS_274 = __VLS_273({
        modelValue: (__VLS_ctx.budgetForm.days),
        min: (1),
        max: (30),
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_273));
    var __VLS_271;
    var __VLS_267;
    const __VLS_276 = {}.ElCol;
    /** @type {[typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ]} */ ;
    // @ts-ignore
    const __VLS_277 = __VLS_asFunctionalComponent(__VLS_276, new __VLS_276({
        span: (12),
    }));
    const __VLS_278 = __VLS_277({
        span: (12),
    }, ...__VLS_functionalComponentArgsRest(__VLS_277));
    __VLS_279.slots.default;
    const __VLS_280 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_281 = __VLS_asFunctionalComponent(__VLS_280, new __VLS_280({
        label: "People",
    }));
    const __VLS_282 = __VLS_281({
        label: "People",
    }, ...__VLS_functionalComponentArgsRest(__VLS_281));
    __VLS_283.slots.default;
    const __VLS_284 = {}.ElInputNumber;
    /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
    // @ts-ignore
    const __VLS_285 = __VLS_asFunctionalComponent(__VLS_284, new __VLS_284({
        modelValue: (__VLS_ctx.budgetForm.peopleCount),
        min: (1),
        max: (20),
        ...{ style: {} },
    }));
    const __VLS_286 = __VLS_285({
        modelValue: (__VLS_ctx.budgetForm.peopleCount),
        min: (1),
        max: (20),
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_285));
    var __VLS_283;
    var __VLS_279;
    var __VLS_263;
    const __VLS_288 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_289 = __VLS_asFunctionalComponent(__VLS_288, new __VLS_288({
        label: "游览景点",
    }));
    const __VLS_290 = __VLS_289({
        label: "游览景点",
    }, ...__VLS_functionalComponentArgsRest(__VLS_289));
    __VLS_291.slots.default;
    const __VLS_292 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_293 = __VLS_asFunctionalComponent(__VLS_292, new __VLS_292({
        modelValue: (__VLS_ctx.budgetForm.spots),
        placeholder: "例如：十三陵、居庸关",
    }));
    const __VLS_294 = __VLS_293({
        modelValue: (__VLS_ctx.budgetForm.spots),
        placeholder: "例如：十三陵、居庸关",
    }, ...__VLS_functionalComponentArgsRest(__VLS_293));
    var __VLS_291;
    const __VLS_296 = {}.ElRow;
    /** @type {[typeof __VLS_components.ElRow, typeof __VLS_components.elRow, typeof __VLS_components.ElRow, typeof __VLS_components.elRow, ]} */ ;
    // @ts-ignore
    const __VLS_297 = __VLS_asFunctionalComponent(__VLS_296, new __VLS_296({
        gutter: (16),
    }));
    const __VLS_298 = __VLS_297({
        gutter: (16),
    }, ...__VLS_functionalComponentArgsRest(__VLS_297));
    __VLS_299.slots.default;
    const __VLS_300 = {}.ElCol;
    /** @type {[typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ]} */ ;
    // @ts-ignore
    const __VLS_301 = __VLS_asFunctionalComponent(__VLS_300, new __VLS_300({
        span: (8),
    }));
    const __VLS_302 = __VLS_301({
        span: (8),
    }, ...__VLS_functionalComponentArgsRest(__VLS_301));
    __VLS_303.slots.default;
    const __VLS_304 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_305 = __VLS_asFunctionalComponent(__VLS_304, new __VLS_304({
        label: "Transport",
    }));
    const __VLS_306 = __VLS_305({
        label: "Transport",
    }, ...__VLS_functionalComponentArgsRest(__VLS_305));
    __VLS_307.slots.default;
    const __VLS_308 = {}.ElSelect;
    /** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
    // @ts-ignore
    const __VLS_309 = __VLS_asFunctionalComponent(__VLS_308, new __VLS_308({
        modelValue: (__VLS_ctx.budgetForm.transport),
        ...{ style: {} },
    }));
    const __VLS_310 = __VLS_309({
        modelValue: (__VLS_ctx.budgetForm.transport),
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_309));
    __VLS_311.slots.default;
    const __VLS_312 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_313 = __VLS_asFunctionalComponent(__VLS_312, new __VLS_312({
        label: "Public",
        value: "公共交通",
    }));
    const __VLS_314 = __VLS_313({
        label: "Public",
        value: "公共交通",
    }, ...__VLS_functionalComponentArgsRest(__VLS_313));
    const __VLS_316 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_317 = __VLS_asFunctionalComponent(__VLS_316, new __VLS_316({
        label: "Self-drive",
        value: "自驾",
    }));
    const __VLS_318 = __VLS_317({
        label: "Self-drive",
        value: "自驾",
    }, ...__VLS_functionalComponentArgsRest(__VLS_317));
    const __VLS_320 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_321 = __VLS_asFunctionalComponent(__VLS_320, new __VLS_320({
        label: "Mixed",
        value: "混合",
    }));
    const __VLS_322 = __VLS_321({
        label: "Mixed",
        value: "混合",
    }, ...__VLS_functionalComponentArgsRest(__VLS_321));
    var __VLS_311;
    var __VLS_307;
    var __VLS_303;
    const __VLS_324 = {}.ElCol;
    /** @type {[typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ]} */ ;
    // @ts-ignore
    const __VLS_325 = __VLS_asFunctionalComponent(__VLS_324, new __VLS_324({
        span: (8),
    }));
    const __VLS_326 = __VLS_325({
        span: (8),
    }, ...__VLS_functionalComponentArgsRest(__VLS_325));
    __VLS_327.slots.default;
    const __VLS_328 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_329 = __VLS_asFunctionalComponent(__VLS_328, new __VLS_328({
        label: "Dining",
    }));
    const __VLS_330 = __VLS_329({
        label: "Dining",
    }, ...__VLS_functionalComponentArgsRest(__VLS_329));
    __VLS_331.slots.default;
    const __VLS_332 = {}.ElSelect;
    /** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
    // @ts-ignore
    const __VLS_333 = __VLS_asFunctionalComponent(__VLS_332, new __VLS_332({
        modelValue: (__VLS_ctx.budgetForm.diningPref),
        ...{ style: {} },
    }));
    const __VLS_334 = __VLS_333({
        modelValue: (__VLS_ctx.budgetForm.diningPref),
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_333));
    __VLS_335.slots.default;
    const __VLS_336 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_337 = __VLS_asFunctionalComponent(__VLS_336, new __VLS_336({
        label: "Simple",
        value: "简餐",
    }));
    const __VLS_338 = __VLS_337({
        label: "Simple",
        value: "简餐",
    }, ...__VLS_functionalComponentArgsRest(__VLS_337));
    const __VLS_340 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_341 = __VLS_asFunctionalComponent(__VLS_340, new __VLS_340({
        label: "Normal",
        value: "普通",
    }));
    const __VLS_342 = __VLS_341({
        label: "Normal",
        value: "普通",
    }, ...__VLS_functionalComponentArgsRest(__VLS_341));
    const __VLS_344 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_345 = __VLS_asFunctionalComponent(__VLS_344, new __VLS_344({
        label: "Gourmet",
        value: "美食体验",
    }));
    const __VLS_346 = __VLS_345({
        label: "Gourmet",
        value: "美食体验",
    }, ...__VLS_functionalComponentArgsRest(__VLS_345));
    var __VLS_335;
    var __VLS_331;
    var __VLS_327;
    const __VLS_348 = {}.ElCol;
    /** @type {[typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ]} */ ;
    // @ts-ignore
    const __VLS_349 = __VLS_asFunctionalComponent(__VLS_348, new __VLS_348({
        span: (8),
    }));
    const __VLS_350 = __VLS_349({
        span: (8),
    }, ...__VLS_functionalComponentArgsRest(__VLS_349));
    __VLS_351.slots.default;
    const __VLS_352 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_353 = __VLS_asFunctionalComponent(__VLS_352, new __VLS_352({
        label: "Accommodation",
    }));
    const __VLS_354 = __VLS_353({
        label: "Accommodation",
    }, ...__VLS_functionalComponentArgsRest(__VLS_353));
    __VLS_355.slots.default;
    const __VLS_356 = {}.ElSelect;
    /** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
    // @ts-ignore
    const __VLS_357 = __VLS_asFunctionalComponent(__VLS_356, new __VLS_356({
        modelValue: (__VLS_ctx.budgetForm.accommodation),
        ...{ style: {} },
    }));
    const __VLS_358 = __VLS_357({
        modelValue: (__VLS_ctx.budgetForm.accommodation),
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_357));
    __VLS_359.slots.default;
    const __VLS_360 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_361 = __VLS_asFunctionalComponent(__VLS_360, new __VLS_360({
        label: "Budget",
        value: "经济型",
    }));
    const __VLS_362 = __VLS_361({
        label: "Budget",
        value: "经济型",
    }, ...__VLS_functionalComponentArgsRest(__VLS_361));
    const __VLS_364 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_365 = __VLS_asFunctionalComponent(__VLS_364, new __VLS_364({
        label: "Comfort",
        value: "舒适型",
    }));
    const __VLS_366 = __VLS_365({
        label: "Comfort",
        value: "舒适型",
    }, ...__VLS_functionalComponentArgsRest(__VLS_365));
    const __VLS_368 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_369 = __VLS_asFunctionalComponent(__VLS_368, new __VLS_368({
        label: "Luxury",
        value: "高档",
    }));
    const __VLS_370 = __VLS_369({
        label: "Luxury",
        value: "高档",
    }, ...__VLS_functionalComponentArgsRest(__VLS_369));
    var __VLS_359;
    var __VLS_355;
    var __VLS_351;
    var __VLS_299;
    const __VLS_372 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_373 = __VLS_asFunctionalComponent(__VLS_372, new __VLS_372({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.budgetLoading),
        ...{ style: {} },
    }));
    const __VLS_374 = __VLS_373({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.budgetLoading),
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_373));
    let __VLS_376;
    let __VLS_377;
    let __VLS_378;
    const __VLS_379 = {
        onClick: (__VLS_ctx.estimateBudget)
    };
    __VLS_375.slots.default;
    var __VLS_375;
    var __VLS_259;
    if (__VLS_ctx.budgetResult && !__VLS_ctx.budgetLoading) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "dialog-result" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({
            ...{ class: "budget-total" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "total-amount" },
        });
        (__VLS_ctx.budgetResult.totalBudget);
        for (const [cat] of __VLS_getVForSourceType((__VLS_ctx.budgetResult.categories))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                key: (cat.name),
                ...{ class: "cat-row" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "cat-name" },
            });
            (cat.name);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "cat-amount" },
            });
            (cat.amount);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "cat-detail" },
            });
            (cat.details);
        }
        if (__VLS_ctx.budgetResult.suggestions?.length) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "plan-tips" },
            });
            for (const [s, i] of __VLS_getVForSourceType((__VLS_ctx.budgetResult.suggestions))) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                    key: (i),
                });
                (s);
            }
        }
    }
    if (__VLS_ctx.budgetResult && !__VLS_ctx.budgetLoading) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "budget-apply-row" },
        });
        const __VLS_380 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_381 = __VLS_asFunctionalComponent(__VLS_380, new __VLS_380({
            ...{ 'onClick': {} },
            type: "success",
        }));
        const __VLS_382 = __VLS_381({
            ...{ 'onClick': {} },
            type: "success",
        }, ...__VLS_functionalComponentArgsRest(__VLS_381));
        let __VLS_384;
        let __VLS_385;
        let __VLS_386;
        const __VLS_387 = {
            onClick: (__VLS_ctx.applyBudgetResult)
        };
        __VLS_383.slots.default;
        var __VLS_383;
    }
    var __VLS_255;
    const __VLS_388 = {}.ElDialog;
    /** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
    // @ts-ignore
    const __VLS_389 = __VLS_asFunctionalComponent(__VLS_388, new __VLS_388({
        modelValue: (__VLS_ctx.slotEditVisible),
        title: "Edit Activity",
        width: "500px",
        destroyOnClose: true,
    }));
    const __VLS_390 = __VLS_389({
        modelValue: (__VLS_ctx.slotEditVisible),
        title: "Edit Activity",
        width: "500px",
        destroyOnClose: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_389));
    __VLS_391.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "slot-edit-body" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "slot-edit-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "slot-time-pickers" },
    });
    const __VLS_392 = {}.ElTimePicker;
    /** @type {[typeof __VLS_components.ElTimePicker, typeof __VLS_components.elTimePicker, ]} */ ;
    // @ts-ignore
    const __VLS_393 = __VLS_asFunctionalComponent(__VLS_392, new __VLS_392({
        modelValue: (__VLS_ctx.slotEditStart),
        format: "HH:mm",
        placeholder: "Start",
    }));
    const __VLS_394 = __VLS_393({
        modelValue: (__VLS_ctx.slotEditStart),
        format: "HH:mm",
        placeholder: "Start",
    }, ...__VLS_functionalComponentArgsRest(__VLS_393));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    const __VLS_396 = {}.ElTimePicker;
    /** @type {[typeof __VLS_components.ElTimePicker, typeof __VLS_components.elTimePicker, ]} */ ;
    // @ts-ignore
    const __VLS_397 = __VLS_asFunctionalComponent(__VLS_396, new __VLS_396({
        modelValue: (__VLS_ctx.slotEditEnd),
        format: "HH:mm",
        placeholder: "End",
    }));
    const __VLS_398 = __VLS_397({
        modelValue: (__VLS_ctx.slotEditEnd),
        format: "HH:mm",
        placeholder: "End",
    }, ...__VLS_functionalComponentArgsRest(__VLS_397));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "slot-edit-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    const __VLS_400 = {}.ElRadioGroup;
    /** @type {[typeof __VLS_components.ElRadioGroup, typeof __VLS_components.elRadioGroup, typeof __VLS_components.ElRadioGroup, typeof __VLS_components.elRadioGroup, ]} */ ;
    // @ts-ignore
    const __VLS_401 = __VLS_asFunctionalComponent(__VLS_400, new __VLS_400({
        modelValue: (__VLS_ctx.slotEditType),
    }));
    const __VLS_402 = __VLS_401({
        modelValue: (__VLS_ctx.slotEditType),
    }, ...__VLS_functionalComponentArgsRest(__VLS_401));
    __VLS_403.slots.default;
    const __VLS_404 = {}.ElRadio;
    /** @type {[typeof __VLS_components.ElRadio, typeof __VLS_components.elRadio, typeof __VLS_components.ElRadio, typeof __VLS_components.elRadio, ]} */ ;
    // @ts-ignore
    const __VLS_405 = __VLS_asFunctionalComponent(__VLS_404, new __VLS_404({
        value: "spot",
    }));
    const __VLS_406 = __VLS_405({
        value: "spot",
    }, ...__VLS_functionalComponentArgsRest(__VLS_405));
    __VLS_407.slots.default;
    var __VLS_407;
    const __VLS_408 = {}.ElRadio;
    /** @type {[typeof __VLS_components.ElRadio, typeof __VLS_components.elRadio, typeof __VLS_components.ElRadio, typeof __VLS_components.elRadio, ]} */ ;
    // @ts-ignore
    const __VLS_409 = __VLS_asFunctionalComponent(__VLS_408, new __VLS_408({
        value: "food",
    }));
    const __VLS_410 = __VLS_409({
        value: "food",
    }, ...__VLS_functionalComponentArgsRest(__VLS_409));
    __VLS_411.slots.default;
    var __VLS_411;
    const __VLS_412 = {}.ElRadio;
    /** @type {[typeof __VLS_components.ElRadio, typeof __VLS_components.elRadio, typeof __VLS_components.ElRadio, typeof __VLS_components.elRadio, ]} */ ;
    // @ts-ignore
    const __VLS_413 = __VLS_asFunctionalComponent(__VLS_412, new __VLS_412({
        value: "text",
    }));
    const __VLS_414 = __VLS_413({
        value: "text",
    }, ...__VLS_functionalComponentArgsRest(__VLS_413));
    __VLS_415.slots.default;
    var __VLS_415;
    var __VLS_403;
    if (__VLS_ctx.slotEditType === 'spot') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "slot-edit-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
        const __VLS_416 = {}.ElInput;
        /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
        // @ts-ignore
        const __VLS_417 = __VLS_asFunctionalComponent(__VLS_416, new __VLS_416({
            modelValue: (__VLS_ctx.slotSearchKeyword),
            placeholder: "Search spots...",
            size: "small",
        }));
        const __VLS_418 = __VLS_417({
            modelValue: (__VLS_ctx.slotSearchKeyword),
            placeholder: "Search spots...",
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_417));
        const __VLS_420 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_421 = __VLS_asFunctionalComponent(__VLS_420, new __VLS_420({
            ...{ 'onClick': {} },
            size: "small",
        }));
        const __VLS_422 = __VLS_421({
            ...{ 'onClick': {} },
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_421));
        let __VLS_424;
        let __VLS_425;
        let __VLS_426;
        const __VLS_427 = {
            onClick: (__VLS_ctx.doSlotSpotSearch)
        };
        __VLS_423.slots.default;
        var __VLS_423;
        if (__VLS_ctx.slotSpotResults.length) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "slot-search-results" },
            });
            for (const [r] of __VLS_getVForSourceType((__VLS_ctx.slotSpotResults))) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ onClick: (...[$event]) => {
                            if (!!(__VLS_ctx.viewMode === 'list'))
                                return;
                            if (!(__VLS_ctx.slotEditType === 'spot'))
                                return;
                            if (!(__VLS_ctx.slotSpotResults.length))
                                return;
                            __VLS_ctx.selectSlotSpot(r);
                        } },
                    key: (r.id),
                    ...{ class: "slot-search-item" },
                    ...{ class: ({ selected: __VLS_ctx.editingSlot?.spotId === r.id }) },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
                (r.name);
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "text-sm" },
                });
                (r.category);
            }
        }
        if (__VLS_ctx.editingSlot?.spotName) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "slot-selected" },
            });
            (__VLS_ctx.editingSlot.spotName);
        }
    }
    if (__VLS_ctx.slotEditType === 'food') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "slot-edit-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
        const __VLS_428 = {}.ElInput;
        /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
        // @ts-ignore
        const __VLS_429 = __VLS_asFunctionalComponent(__VLS_428, new __VLS_428({
            modelValue: (__VLS_ctx.slotSearchKeyword),
            placeholder: "Search food...",
            size: "small",
        }));
        const __VLS_430 = __VLS_429({
            modelValue: (__VLS_ctx.slotSearchKeyword),
            placeholder: "Search food...",
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_429));
        const __VLS_432 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_433 = __VLS_asFunctionalComponent(__VLS_432, new __VLS_432({
            ...{ 'onClick': {} },
            size: "small",
        }));
        const __VLS_434 = __VLS_433({
            ...{ 'onClick': {} },
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_433));
        let __VLS_436;
        let __VLS_437;
        let __VLS_438;
        const __VLS_439 = {
            onClick: (__VLS_ctx.doSlotFoodSearch)
        };
        __VLS_435.slots.default;
        var __VLS_435;
        if (__VLS_ctx.slotFoodResults.length) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "slot-search-results" },
            });
            for (const [r] of __VLS_getVForSourceType((__VLS_ctx.slotFoodResults))) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ onClick: (...[$event]) => {
                            if (!!(__VLS_ctx.viewMode === 'list'))
                                return;
                            if (!(__VLS_ctx.slotEditType === 'food'))
                                return;
                            if (!(__VLS_ctx.slotFoodResults.length))
                                return;
                            __VLS_ctx.selectSlotFood(r);
                        } },
                    key: (r.id),
                    ...{ class: "slot-search-item" },
                    ...{ class: ({ selected: __VLS_ctx.editingSlot?.foodId === r.id }) },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
                (r.name);
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "text-sm" },
                });
                (r.cuisine);
            }
        }
        if (__VLS_ctx.editingSlot?.foodName) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "slot-selected" },
            });
            (__VLS_ctx.editingSlot.foodName);
        }
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "slot-edit-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    const __VLS_440 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_441 = __VLS_asFunctionalComponent(__VLS_440, new __VLS_440({
        modelValue: (__VLS_ctx.slotEditText),
        type: "textarea",
        rows: (3),
        placeholder: "What do you want to do?",
    }));
    const __VLS_442 = __VLS_441({
        modelValue: (__VLS_ctx.slotEditText),
        type: "textarea",
        rows: (3),
        placeholder: "What do you want to do?",
    }, ...__VLS_functionalComponentArgsRest(__VLS_441));
    {
        const { footer: __VLS_thisSlot } = __VLS_391.slots;
        const __VLS_444 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_445 = __VLS_asFunctionalComponent(__VLS_444, new __VLS_444({
            ...{ 'onClick': {} },
        }));
        const __VLS_446 = __VLS_445({
            ...{ 'onClick': {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_445));
        let __VLS_448;
        let __VLS_449;
        let __VLS_450;
        const __VLS_451 = {
            onClick: (...[$event]) => {
                if (!!(__VLS_ctx.viewMode === 'list'))
                    return;
                __VLS_ctx.slotEditVisible = false;
            }
        };
        __VLS_447.slots.default;
        var __VLS_447;
        const __VLS_452 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_453 = __VLS_asFunctionalComponent(__VLS_452, new __VLS_452({
            ...{ 'onClick': {} },
            type: "primary",
        }));
        const __VLS_454 = __VLS_453({
            ...{ 'onClick': {} },
            type: "primary",
        }, ...__VLS_functionalComponentArgsRest(__VLS_453));
        let __VLS_456;
        let __VLS_457;
        let __VLS_458;
        const __VLS_459 = {
            onClick: (__VLS_ctx.saveSlotEdit)
        };
        __VLS_455.slots.default;
        var __VLS_455;
    }
    var __VLS_391;
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
/** @type {__VLS_StyleScopedClasses['budget-summary-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['route-clear-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['day-content']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-container']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-header']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-header-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['route-info-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['route-clear-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-track']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-hour']} */ ;
/** @type {__VLS_StyleScopedClasses['hour-label']} */ ;
/** @type {__VLS_StyleScopedClasses['hour-line']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-slot-card']} */ ;
/** @type {__VLS_StyleScopedClasses['glass-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['route-order-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['slot-time']} */ ;
/** @type {__VLS_StyleScopedClasses['slot-name']} */ ;
/** @type {__VLS_StyleScopedClasses['slot-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['slot-delete']} */ ;
/** @type {__VLS_StyleScopedClasses['planning-empty']} */ ;
/** @type {__VLS_StyleScopedClasses['ai-float-group']} */ ;
/** @type {__VLS_StyleScopedClasses['ai-float-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['ai-float-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['ai-float-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['map-picker-body']} */ ;
/** @type {__VLS_StyleScopedClasses['map-hint-text']} */ ;
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
/** @type {__VLS_StyleScopedClasses['dialog-result']} */ ;
/** @type {__VLS_StyleScopedClasses['plan-title-name']} */ ;
/** @type {__VLS_StyleScopedClasses['day-block']} */ ;
/** @type {__VLS_StyleScopedClasses['activity']} */ ;
/** @type {__VLS_StyleScopedClasses['act-time']} */ ;
/** @type {__VLS_StyleScopedClasses['act-match-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['act-match-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['act-match-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['act-loc']} */ ;
/** @type {__VLS_StyleScopedClasses['plan-tips']} */ ;
/** @type {__VLS_StyleScopedClasses['plan-cost']} */ ;
/** @type {__VLS_StyleScopedClasses['dialog-result']} */ ;
/** @type {__VLS_StyleScopedClasses['budget-total']} */ ;
/** @type {__VLS_StyleScopedClasses['total-amount']} */ ;
/** @type {__VLS_StyleScopedClasses['cat-row']} */ ;
/** @type {__VLS_StyleScopedClasses['cat-name']} */ ;
/** @type {__VLS_StyleScopedClasses['cat-amount']} */ ;
/** @type {__VLS_StyleScopedClasses['cat-detail']} */ ;
/** @type {__VLS_StyleScopedClasses['plan-tips']} */ ;
/** @type {__VLS_StyleScopedClasses['budget-apply-row']} */ ;
/** @type {__VLS_StyleScopedClasses['slot-edit-body']} */ ;
/** @type {__VLS_StyleScopedClasses['slot-edit-row']} */ ;
/** @type {__VLS_StyleScopedClasses['slot-time-pickers']} */ ;
/** @type {__VLS_StyleScopedClasses['slot-edit-row']} */ ;
/** @type {__VLS_StyleScopedClasses['slot-edit-row']} */ ;
/** @type {__VLS_StyleScopedClasses['slot-search-results']} */ ;
/** @type {__VLS_StyleScopedClasses['slot-search-item']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['slot-selected']} */ ;
/** @type {__VLS_StyleScopedClasses['slot-edit-row']} */ ;
/** @type {__VLS_StyleScopedClasses['slot-search-results']} */ ;
/** @type {__VLS_StyleScopedClasses['slot-search-item']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['slot-selected']} */ ;
/** @type {__VLS_StyleScopedClasses['slot-edit-row']} */ ;
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
            routeLoading: routeLoading,
            appliedBudget: appliedBudget,
            mapDialogVisible: mapDialogVisible,
            slotEditVisible: slotEditVisible,
            editingSlot: editingSlot,
            slotEditType: slotEditType,
            slotEditStart: slotEditStart,
            slotEditEnd: slotEditEnd,
            slotEditText: slotEditText,
            slotSearchKeyword: slotSearchKeyword,
            slotSpotResults: slotSpotResults,
            slotFoodResults: slotFoodResults,
            aiDialogVisible: aiDialogVisible,
            aiInput: aiInput,
            aiLoading: aiLoading,
            aiMessages: aiMessages,
            aiChatRef: aiChatRef,
            aiPlanDialogVisible: aiPlanDialogVisible,
            planForm: planForm,
            planResult: planResult,
            planLoading: planLoading,
            budgetDialogVisible: budgetDialogVisible,
            budgetForm: budgetForm,
            budgetResult: budgetResult,
            budgetLoading: budgetLoading,
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
            sortedSlots: sortedSlots,
            totalRoutedStops: totalRoutedStops,
            slotTop: slotTop,
            slotHeight: slotHeight,
            onTimelineClick: onTimelineClick,
            addSlotAt: addSlotAt,
            deleteSlot: deleteSlot,
            openSlotEditor: openSlotEditor,
            saveSlotEdit: saveSlotEdit,
            doSlotSpotSearch: doSlotSpotSearch,
            doSlotFoodSearch: doSlotFoodSearch,
            selectSlotSpot: selectSlotSpot,
            selectSlotFood: selectSlotFood,
            openMapDialog: openMapDialog,
            onMapDialogOpened: onMapDialogOpened,
            closeMapDialog: closeMapDialog,
            openAiDialog: openAiDialog,
            sendAiMessage: sendAiMessage,
            openAiPlanDialog: openAiPlanDialog,
            openBudgetDialog: openBudgetDialog,
            generatePlan: generatePlan,
            estimateBudget: estimateBudget,
            applyPlanResult: applyPlanResult,
            routeDayPlan: routeDayPlan,
            clearDayRoute: clearDayRoute,
            applyBudgetResult: applyBudgetResult,
            handleSave: handleSave,
            goBackToList: goBackToList,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
