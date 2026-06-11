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
const searchKeyword = ref('');
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
        const params = { page: currentPage.value - 1, size: pageSize.value };
        const kw = searchKeyword.value.trim();
        if (kw)
            params.keyword = kw;
        const res = await itineraryApi.list(params);
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
function doSearch() {
    currentPage.value = 1;
    fetchItineraries();
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
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "toolbar glass-sm" },
    });
    const __VLS_20 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
        ...{ 'onKeyup': {} },
        ...{ 'onClear': {} },
        modelValue: (__VLS_ctx.searchKeyword),
        placeholder: "搜索行程名称、地点、事件描述…",
        prefixIcon: "Search",
        clearable: true,
        ...{ class: "search-bar" },
    }));
    const __VLS_22 = __VLS_21({
        ...{ 'onKeyup': {} },
        ...{ 'onClear': {} },
        modelValue: (__VLS_ctx.searchKeyword),
        placeholder: "搜索行程名称、地点、事件描述…",
        prefixIcon: "Search",
        clearable: true,
        ...{ class: "search-bar" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_21));
    let __VLS_24;
    let __VLS_25;
    let __VLS_26;
    const __VLS_27 = {
        onKeyup: (__VLS_ctx.doSearch)
    };
    const __VLS_28 = {
        onClear: (__VLS_ctx.doSearch)
    };
    var __VLS_23;
    const __VLS_29 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_30 = __VLS_asFunctionalComponent(__VLS_29, new __VLS_29({
        ...{ 'onClick': {} },
        size: "small",
        type: "primary",
    }));
    const __VLS_31 = __VLS_30({
        ...{ 'onClick': {} },
        size: "small",
        type: "primary",
    }, ...__VLS_functionalComponentArgsRest(__VLS_30));
    let __VLS_33;
    let __VLS_34;
    let __VLS_35;
    const __VLS_36 = {
        onClick: (__VLS_ctx.doSearch)
    };
    __VLS_32.slots.default;
    var __VLS_32;
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
        const __VLS_37 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_38 = __VLS_asFunctionalComponent(__VLS_37, new __VLS_37({
            ...{ 'onClick': {} },
            type: "primary",
            size: "large",
        }));
        const __VLS_39 = __VLS_38({
            ...{ 'onClick': {} },
            type: "primary",
            size: "large",
        }, ...__VLS_functionalComponentArgsRest(__VLS_38));
        let __VLS_41;
        let __VLS_42;
        let __VLS_43;
        const __VLS_44 = {
            onClick: (__VLS_ctx.openCreateDialog)
        };
        __VLS_40.slots.default;
        var __VLS_40;
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
            const __VLS_45 = {}.ElPopconfirm;
            /** @type {[typeof __VLS_components.ElPopconfirm, typeof __VLS_components.elPopconfirm, typeof __VLS_components.ElPopconfirm, typeof __VLS_components.elPopconfirm, ]} */ ;
            // @ts-ignore
            const __VLS_46 = __VLS_asFunctionalComponent(__VLS_45, new __VLS_45({
                ...{ 'onConfirm': {} },
                title: "确定删除此行程？",
                confirmButtonText: "删除",
                cancelButtonText: "取消",
            }));
            const __VLS_47 = __VLS_46({
                ...{ 'onConfirm': {} },
                title: "确定删除此行程？",
                confirmButtonText: "删除",
                cancelButtonText: "取消",
            }, ...__VLS_functionalComponentArgsRest(__VLS_46));
            let __VLS_49;
            let __VLS_50;
            let __VLS_51;
            const __VLS_52 = {
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
            __VLS_48.slots.default;
            {
                const { reference: __VLS_thisSlot } = __VLS_48.slots;
                __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                    ...{ onClick: () => { } },
                    ...{ class: "trip-delete-btn" },
                    title: "删除行程",
                });
            }
            var __VLS_48;
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
        const __VLS_53 = {}.ElPagination;
        /** @type {[typeof __VLS_components.ElPagination, typeof __VLS_components.elPagination, ]} */ ;
        // @ts-ignore
        const __VLS_54 = __VLS_asFunctionalComponent(__VLS_53, new __VLS_53({
            ...{ 'onSizeChange': {} },
            ...{ 'onCurrentChange': {} },
            currentPage: (__VLS_ctx.currentPage),
            pageSize: (__VLS_ctx.pageSize),
            pageSizes: ([6, 12, 18, 24]),
            total: (__VLS_ctx.total),
            layout: "total, sizes, prev, pager, next, jumper",
            background: true,
        }));
        const __VLS_55 = __VLS_54({
            ...{ 'onSizeChange': {} },
            ...{ 'onCurrentChange': {} },
            currentPage: (__VLS_ctx.currentPage),
            pageSize: (__VLS_ctx.pageSize),
            pageSizes: ([6, 12, 18, 24]),
            total: (__VLS_ctx.total),
            layout: "total, sizes, prev, pager, next, jumper",
            background: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_54));
        let __VLS_57;
        let __VLS_58;
        let __VLS_59;
        const __VLS_60 = {
            onSizeChange: (__VLS_ctx.handleSizeChange)
        };
        const __VLS_61 = {
            onCurrentChange: (__VLS_ctx.handlePageChange)
        };
        var __VLS_56;
    }
    const __VLS_62 = {}.ElDialog;
    /** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
    // @ts-ignore
    const __VLS_63 = __VLS_asFunctionalComponent(__VLS_62, new __VLS_62({
        modelValue: (__VLS_ctx.createDialogVisible),
        title: "NEW TRIP",
        width: "460px",
        closeOnClickModal: (false),
        destroyOnClose: true,
    }));
    const __VLS_64 = __VLS_63({
        modelValue: (__VLS_ctx.createDialogVisible),
        title: "NEW TRIP",
        width: "460px",
        closeOnClickModal: (false),
        destroyOnClose: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_63));
    __VLS_65.slots.default;
    const __VLS_66 = {}.ElForm;
    /** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
    // @ts-ignore
    const __VLS_67 = __VLS_asFunctionalComponent(__VLS_66, new __VLS_66({
        ...{ 'onSubmit': {} },
        ref: "createFormRef",
        model: (__VLS_ctx.createForm),
        rules: (__VLS_ctx.createRules),
        labelPosition: "top",
    }));
    const __VLS_68 = __VLS_67({
        ...{ 'onSubmit': {} },
        ref: "createFormRef",
        model: (__VLS_ctx.createForm),
        rules: (__VLS_ctx.createRules),
        labelPosition: "top",
    }, ...__VLS_functionalComponentArgsRest(__VLS_67));
    let __VLS_70;
    let __VLS_71;
    let __VLS_72;
    const __VLS_73 = {
        onSubmit: () => { }
    };
    /** @type {typeof __VLS_ctx.createFormRef} */ ;
    var __VLS_74 = {};
    __VLS_69.slots.default;
    const __VLS_76 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_77 = __VLS_asFunctionalComponent(__VLS_76, new __VLS_76({
        label: "Trip Name",
        prop: "name",
    }));
    const __VLS_78 = __VLS_77({
        label: "Trip Name",
        prop: "name",
    }, ...__VLS_functionalComponentArgsRest(__VLS_77));
    __VLS_79.slots.default;
    const __VLS_80 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_81 = __VLS_asFunctionalComponent(__VLS_80, new __VLS_80({
        modelValue: (__VLS_ctx.createForm.name),
        placeholder: "e.g. Beijing 3-Day Tour",
        maxlength: "50",
        showWordLimit: true,
    }));
    const __VLS_82 = __VLS_81({
        modelValue: (__VLS_ctx.createForm.name),
        placeholder: "e.g. Beijing 3-Day Tour",
        maxlength: "50",
        showWordLimit: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_81));
    var __VLS_79;
    var __VLS_69;
    {
        const { footer: __VLS_thisSlot } = __VLS_65.slots;
        const __VLS_84 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_85 = __VLS_asFunctionalComponent(__VLS_84, new __VLS_84({
            ...{ 'onClick': {} },
        }));
        const __VLS_86 = __VLS_85({
            ...{ 'onClick': {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_85));
        let __VLS_88;
        let __VLS_89;
        let __VLS_90;
        const __VLS_91 = {
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.viewMode === 'list'))
                    return;
                __VLS_ctx.createDialogVisible = false;
            }
        };
        __VLS_87.slots.default;
        var __VLS_87;
        const __VLS_92 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_93 = __VLS_asFunctionalComponent(__VLS_92, new __VLS_92({
            ...{ 'onClick': {} },
            type: "primary",
            loading: (__VLS_ctx.submitting),
        }));
        const __VLS_94 = __VLS_93({
            ...{ 'onClick': {} },
            type: "primary",
            loading: (__VLS_ctx.submitting),
        }, ...__VLS_functionalComponentArgsRest(__VLS_93));
        let __VLS_96;
        let __VLS_97;
        let __VLS_98;
        const __VLS_99 = {
            onClick: (__VLS_ctx.handleCreate)
        };
        __VLS_95.slots.default;
        var __VLS_95;
    }
    var __VLS_65;
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
    const __VLS_100 = {}.ElDatePicker;
    /** @type {[typeof __VLS_components.ElDatePicker, typeof __VLS_components.elDatePicker, ]} */ ;
    // @ts-ignore
    const __VLS_101 = __VLS_asFunctionalComponent(__VLS_100, new __VLS_100({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.tripPlan.startDate),
        type: "date",
        placeholder: "Pick start date",
        valueFormat: "YYYY-MM-DD",
    }));
    const __VLS_102 = __VLS_101({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.tripPlan.startDate),
        type: "date",
        placeholder: "Pick start date",
        valueFormat: "YYYY-MM-DD",
    }, ...__VLS_functionalComponentArgsRest(__VLS_101));
    let __VLS_104;
    let __VLS_105;
    let __VLS_106;
    const __VLS_107 = {
        onChange: (__VLS_ctx.regenerateDays)
    };
    var __VLS_103;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "date-arrow" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "date-field" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    const __VLS_108 = {}.ElDatePicker;
    /** @type {[typeof __VLS_components.ElDatePicker, typeof __VLS_components.elDatePicker, ]} */ ;
    // @ts-ignore
    const __VLS_109 = __VLS_asFunctionalComponent(__VLS_108, new __VLS_108({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.tripPlan.endDate),
        type: "date",
        placeholder: "Pick end date",
        valueFormat: "YYYY-MM-DD",
    }));
    const __VLS_110 = __VLS_109({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.tripPlan.endDate),
        type: "date",
        placeholder: "Pick end date",
        valueFormat: "YYYY-MM-DD",
    }, ...__VLS_functionalComponentArgsRest(__VLS_109));
    let __VLS_112;
    let __VLS_113;
    let __VLS_114;
    const __VLS_115 = {
        onChange: (__VLS_ctx.regenerateDays)
    };
    var __VLS_111;
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
        const __VLS_116 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_117 = __VLS_asFunctionalComponent(__VLS_116, new __VLS_116({
            ...{ 'onClick': {} },
            size: "small",
            type: "success",
            loading: (__VLS_ctx.routeLoading),
            disabled: (!__VLS_ctx.activeDay || !__VLS_ctx.activeDay.slots.length),
        }));
        const __VLS_118 = __VLS_117({
            ...{ 'onClick': {} },
            size: "small",
            type: "success",
            loading: (__VLS_ctx.routeLoading),
            disabled: (!__VLS_ctx.activeDay || !__VLS_ctx.activeDay.slots.length),
        }, ...__VLS_functionalComponentArgsRest(__VLS_117));
        let __VLS_120;
        let __VLS_121;
        let __VLS_122;
        const __VLS_123 = {
            onClick: (__VLS_ctx.routeDayPlan)
        };
        __VLS_119.slots.default;
        var __VLS_119;
        const __VLS_124 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_125 = __VLS_asFunctionalComponent(__VLS_124, new __VLS_124({
            ...{ 'onClick': {} },
            size: "small",
            type: "primary",
        }));
        const __VLS_126 = __VLS_125({
            ...{ 'onClick': {} },
            size: "small",
            type: "primary",
        }, ...__VLS_functionalComponentArgsRest(__VLS_125));
        let __VLS_128;
        let __VLS_129;
        let __VLS_130;
        const __VLS_131 = {
            onClick: (...[$event]) => {
                if (!!(__VLS_ctx.viewMode === 'list'))
                    return;
                if (!(__VLS_ctx.activeDay))
                    return;
                __VLS_ctx.addSlotAt(12);
            }
        };
        __VLS_127.slots.default;
        var __VLS_127;
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
    const __VLS_132 = {}.ElDialog;
    /** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
    // @ts-ignore
    const __VLS_133 = __VLS_asFunctionalComponent(__VLS_132, new __VLS_132({
        ...{ 'onOpened': {} },
        ...{ 'onClose': {} },
        modelValue: (__VLS_ctx.mapDialogVisible),
        title: "🗺️ Map Picker",
        width: "720px",
        destroyOnClose: true,
    }));
    const __VLS_134 = __VLS_133({
        ...{ 'onOpened': {} },
        ...{ 'onClose': {} },
        modelValue: (__VLS_ctx.mapDialogVisible),
        title: "🗺️ Map Picker",
        width: "720px",
        destroyOnClose: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_133));
    let __VLS_136;
    let __VLS_137;
    let __VLS_138;
    const __VLS_139 = {
        onOpened: (__VLS_ctx.onMapDialogOpened)
    };
    const __VLS_140 = {
        onClose: (__VLS_ctx.closeMapDialog)
    };
    __VLS_135.slots.default;
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
        const { footer: __VLS_thisSlot } = __VLS_135.slots;
        const __VLS_141 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_142 = __VLS_asFunctionalComponent(__VLS_141, new __VLS_141({
            ...{ 'onClick': {} },
        }));
        const __VLS_143 = __VLS_142({
            ...{ 'onClick': {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_142));
        let __VLS_145;
        let __VLS_146;
        let __VLS_147;
        const __VLS_148 = {
            onClick: (...[$event]) => {
                if (!!(__VLS_ctx.viewMode === 'list'))
                    return;
                __VLS_ctx.mapDialogVisible = false;
            }
        };
        __VLS_144.slots.default;
        var __VLS_144;
    }
    var __VLS_135;
    const __VLS_149 = {}.ElDialog;
    /** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
    // @ts-ignore
    const __VLS_150 = __VLS_asFunctionalComponent(__VLS_149, new __VLS_149({
        modelValue: (__VLS_ctx.aiDialogVisible),
        title: "🤖 AI Trip Assistant",
        width: "620px",
        destroyOnClose: true,
    }));
    const __VLS_151 = __VLS_150({
        modelValue: (__VLS_ctx.aiDialogVisible),
        title: "🤖 AI Trip Assistant",
        width: "620px",
        destroyOnClose: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_150));
    __VLS_152.slots.default;
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
    const __VLS_153 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_154 = __VLS_asFunctionalComponent(__VLS_153, new __VLS_153({
        ...{ 'onKeyup': {} },
        modelValue: (__VLS_ctx.aiInput),
        placeholder: "Ask me about your trip...",
        size: "large",
        disabled: (__VLS_ctx.aiLoading),
    }));
    const __VLS_155 = __VLS_154({
        ...{ 'onKeyup': {} },
        modelValue: (__VLS_ctx.aiInput),
        placeholder: "Ask me about your trip...",
        size: "large",
        disabled: (__VLS_ctx.aiLoading),
    }, ...__VLS_functionalComponentArgsRest(__VLS_154));
    let __VLS_157;
    let __VLS_158;
    let __VLS_159;
    const __VLS_160 = {
        onKeyup: (__VLS_ctx.sendAiMessage)
    };
    var __VLS_156;
    const __VLS_161 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_162 = __VLS_asFunctionalComponent(__VLS_161, new __VLS_161({
        ...{ 'onClick': {} },
        type: "primary",
        size: "large",
        loading: (__VLS_ctx.aiLoading),
        ...{ class: "ai-send-btn" },
    }));
    const __VLS_163 = __VLS_162({
        ...{ 'onClick': {} },
        type: "primary",
        size: "large",
        loading: (__VLS_ctx.aiLoading),
        ...{ class: "ai-send-btn" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_162));
    let __VLS_165;
    let __VLS_166;
    let __VLS_167;
    const __VLS_168 = {
        onClick: (__VLS_ctx.sendAiMessage)
    };
    __VLS_164.slots.default;
    var __VLS_164;
    var __VLS_152;
    const __VLS_169 = {}.ElDialog;
    /** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
    // @ts-ignore
    const __VLS_170 = __VLS_asFunctionalComponent(__VLS_169, new __VLS_169({
        modelValue: (__VLS_ctx.aiPlanDialogVisible),
        title: "📋 AI Trip Plan",
        width: "700px",
        top: "5vh",
        destroyOnClose: true,
    }));
    const __VLS_171 = __VLS_170({
        modelValue: (__VLS_ctx.aiPlanDialogVisible),
        title: "📋 AI Trip Plan",
        width: "700px",
        top: "5vh",
        destroyOnClose: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_170));
    __VLS_172.slots.default;
    const __VLS_173 = {}.ElForm;
    /** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
    // @ts-ignore
    const __VLS_174 = __VLS_asFunctionalComponent(__VLS_173, new __VLS_173({
        labelPosition: "top",
    }));
    const __VLS_175 = __VLS_174({
        labelPosition: "top",
    }, ...__VLS_functionalComponentArgsRest(__VLS_174));
    __VLS_176.slots.default;
    const __VLS_177 = {}.ElRow;
    /** @type {[typeof __VLS_components.ElRow, typeof __VLS_components.elRow, typeof __VLS_components.ElRow, typeof __VLS_components.elRow, ]} */ ;
    // @ts-ignore
    const __VLS_178 = __VLS_asFunctionalComponent(__VLS_177, new __VLS_177({
        gutter: (16),
    }));
    const __VLS_179 = __VLS_178({
        gutter: (16),
    }, ...__VLS_functionalComponentArgsRest(__VLS_178));
    __VLS_180.slots.default;
    const __VLS_181 = {}.ElCol;
    /** @type {[typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ]} */ ;
    // @ts-ignore
    const __VLS_182 = __VLS_asFunctionalComponent(__VLS_181, new __VLS_181({
        span: (12),
    }));
    const __VLS_183 = __VLS_182({
        span: (12),
    }, ...__VLS_functionalComponentArgsRest(__VLS_182));
    __VLS_184.slots.default;
    const __VLS_185 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_186 = __VLS_asFunctionalComponent(__VLS_185, new __VLS_185({
        label: "Days",
    }));
    const __VLS_187 = __VLS_186({
        label: "Days",
    }, ...__VLS_functionalComponentArgsRest(__VLS_186));
    __VLS_188.slots.default;
    const __VLS_189 = {}.ElInputNumber;
    /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
    // @ts-ignore
    const __VLS_190 = __VLS_asFunctionalComponent(__VLS_189, new __VLS_189({
        modelValue: (__VLS_ctx.planForm.days),
        min: (1),
        max: (14),
        ...{ style: {} },
    }));
    const __VLS_191 = __VLS_190({
        modelValue: (__VLS_ctx.planForm.days),
        min: (1),
        max: (14),
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_190));
    var __VLS_188;
    var __VLS_184;
    const __VLS_193 = {}.ElCol;
    /** @type {[typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ]} */ ;
    // @ts-ignore
    const __VLS_194 = __VLS_asFunctionalComponent(__VLS_193, new __VLS_193({
        span: (12),
    }));
    const __VLS_195 = __VLS_194({
        span: (12),
    }, ...__VLS_functionalComponentArgsRest(__VLS_194));
    __VLS_196.slots.default;
    const __VLS_197 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_198 = __VLS_asFunctionalComponent(__VLS_197, new __VLS_197({
        label: "Budget",
    }));
    const __VLS_199 = __VLS_198({
        label: "Budget",
    }, ...__VLS_functionalComponentArgsRest(__VLS_198));
    __VLS_200.slots.default;
    const __VLS_201 = {}.ElSelect;
    /** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
    // @ts-ignore
    const __VLS_202 = __VLS_asFunctionalComponent(__VLS_201, new __VLS_201({
        modelValue: (__VLS_ctx.planForm.budget),
        ...{ style: {} },
    }));
    const __VLS_203 = __VLS_202({
        modelValue: (__VLS_ctx.planForm.budget),
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_202));
    __VLS_204.slots.default;
    const __VLS_205 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_206 = __VLS_asFunctionalComponent(__VLS_205, new __VLS_205({
        label: "Low",
        value: "低",
    }));
    const __VLS_207 = __VLS_206({
        label: "Low",
        value: "低",
    }, ...__VLS_functionalComponentArgsRest(__VLS_206));
    const __VLS_209 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_210 = __VLS_asFunctionalComponent(__VLS_209, new __VLS_209({
        label: "Medium",
        value: "中",
    }));
    const __VLS_211 = __VLS_210({
        label: "Medium",
        value: "中",
    }, ...__VLS_functionalComponentArgsRest(__VLS_210));
    const __VLS_213 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_214 = __VLS_asFunctionalComponent(__VLS_213, new __VLS_213({
        label: "High",
        value: "高",
    }));
    const __VLS_215 = __VLS_214({
        label: "High",
        value: "高",
    }, ...__VLS_functionalComponentArgsRest(__VLS_214));
    var __VLS_204;
    var __VLS_200;
    var __VLS_196;
    var __VLS_180;
    const __VLS_217 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_218 = __VLS_asFunctionalComponent(__VLS_217, new __VLS_217({
        label: "Interests",
    }));
    const __VLS_219 = __VLS_218({
        label: "Interests",
    }, ...__VLS_functionalComponentArgsRest(__VLS_218));
    __VLS_220.slots.default;
    const __VLS_221 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_222 = __VLS_asFunctionalComponent(__VLS_221, new __VLS_221({
        modelValue: (__VLS_ctx.planForm.interests),
        placeholder: "e.g. nature, history, food",
    }));
    const __VLS_223 = __VLS_222({
        modelValue: (__VLS_ctx.planForm.interests),
        placeholder: "e.g. nature, history, food",
    }, ...__VLS_functionalComponentArgsRest(__VLS_222));
    var __VLS_220;
    const __VLS_225 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_226 = __VLS_asFunctionalComponent(__VLS_225, new __VLS_225({
        label: "Transport",
    }));
    const __VLS_227 = __VLS_226({
        label: "Transport",
    }, ...__VLS_functionalComponentArgsRest(__VLS_226));
    __VLS_228.slots.default;
    const __VLS_229 = {}.ElSelect;
    /** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
    // @ts-ignore
    const __VLS_230 = __VLS_asFunctionalComponent(__VLS_229, new __VLS_229({
        modelValue: (__VLS_ctx.planForm.transport),
        ...{ style: {} },
    }));
    const __VLS_231 = __VLS_230({
        modelValue: (__VLS_ctx.planForm.transport),
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_230));
    __VLS_232.slots.default;
    const __VLS_233 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_234 = __VLS_asFunctionalComponent(__VLS_233, new __VLS_233({
        label: "Walk",
        value: "步行",
    }));
    const __VLS_235 = __VLS_234({
        label: "Walk",
        value: "步行",
    }, ...__VLS_functionalComponentArgsRest(__VLS_234));
    const __VLS_237 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_238 = __VLS_asFunctionalComponent(__VLS_237, new __VLS_237({
        label: "Bike",
        value: "骑行",
    }));
    const __VLS_239 = __VLS_238({
        label: "Bike",
        value: "骑行",
    }, ...__VLS_functionalComponentArgsRest(__VLS_238));
    const __VLS_241 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_242 = __VLS_asFunctionalComponent(__VLS_241, new __VLS_241({
        label: "Drive",
        value: "驾车",
    }));
    const __VLS_243 = __VLS_242({
        label: "Drive",
        value: "驾车",
    }, ...__VLS_functionalComponentArgsRest(__VLS_242));
    var __VLS_232;
    var __VLS_228;
    const __VLS_245 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_246 = __VLS_asFunctionalComponent(__VLS_245, new __VLS_245({
        label: "Extra Requirements",
    }));
    const __VLS_247 = __VLS_246({
        label: "Extra Requirements",
    }, ...__VLS_functionalComponentArgsRest(__VLS_246));
    __VLS_248.slots.default;
    const __VLS_249 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_250 = __VLS_asFunctionalComponent(__VLS_249, new __VLS_249({
        modelValue: (__VLS_ctx.planForm.additionalInfo),
        type: "textarea",
        rows: (2),
    }));
    const __VLS_251 = __VLS_250({
        modelValue: (__VLS_ctx.planForm.additionalInfo),
        type: "textarea",
        rows: (2),
    }, ...__VLS_functionalComponentArgsRest(__VLS_250));
    var __VLS_248;
    const __VLS_253 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_254 = __VLS_asFunctionalComponent(__VLS_253, new __VLS_253({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.planLoading),
        ...{ style: {} },
    }));
    const __VLS_255 = __VLS_254({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.planLoading),
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_254));
    let __VLS_257;
    let __VLS_258;
    let __VLS_259;
    const __VLS_260 = {
        onClick: (__VLS_ctx.generatePlan)
    };
    __VLS_256.slots.default;
    var __VLS_256;
    var __VLS_176;
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
        const __VLS_261 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_262 = __VLS_asFunctionalComponent(__VLS_261, new __VLS_261({
            ...{ 'onClick': {} },
            size: "small",
            type: "success",
            ...{ style: {} },
        }));
        const __VLS_263 = __VLS_262({
            ...{ 'onClick': {} },
            size: "small",
            type: "success",
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_262));
        let __VLS_265;
        let __VLS_266;
        let __VLS_267;
        const __VLS_268 = {
            onClick: (__VLS_ctx.applyPlanResult)
        };
        __VLS_264.slots.default;
        var __VLS_264;
    }
    var __VLS_172;
    const __VLS_269 = {}.ElDialog;
    /** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
    // @ts-ignore
    const __VLS_270 = __VLS_asFunctionalComponent(__VLS_269, new __VLS_269({
        modelValue: (__VLS_ctx.budgetDialogVisible),
        title: "💰 Budget Estimate",
        width: "700px",
        top: "5vh",
        destroyOnClose: true,
    }));
    const __VLS_271 = __VLS_270({
        modelValue: (__VLS_ctx.budgetDialogVisible),
        title: "💰 Budget Estimate",
        width: "700px",
        top: "5vh",
        destroyOnClose: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_270));
    __VLS_272.slots.default;
    const __VLS_273 = {}.ElForm;
    /** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
    // @ts-ignore
    const __VLS_274 = __VLS_asFunctionalComponent(__VLS_273, new __VLS_273({
        labelPosition: "top",
    }));
    const __VLS_275 = __VLS_274({
        labelPosition: "top",
    }, ...__VLS_functionalComponentArgsRest(__VLS_274));
    __VLS_276.slots.default;
    const __VLS_277 = {}.ElRow;
    /** @type {[typeof __VLS_components.ElRow, typeof __VLS_components.elRow, typeof __VLS_components.ElRow, typeof __VLS_components.elRow, ]} */ ;
    // @ts-ignore
    const __VLS_278 = __VLS_asFunctionalComponent(__VLS_277, new __VLS_277({
        gutter: (16),
    }));
    const __VLS_279 = __VLS_278({
        gutter: (16),
    }, ...__VLS_functionalComponentArgsRest(__VLS_278));
    __VLS_280.slots.default;
    const __VLS_281 = {}.ElCol;
    /** @type {[typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ]} */ ;
    // @ts-ignore
    const __VLS_282 = __VLS_asFunctionalComponent(__VLS_281, new __VLS_281({
        span: (12),
    }));
    const __VLS_283 = __VLS_282({
        span: (12),
    }, ...__VLS_functionalComponentArgsRest(__VLS_282));
    __VLS_284.slots.default;
    const __VLS_285 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_286 = __VLS_asFunctionalComponent(__VLS_285, new __VLS_285({
        label: "Days",
    }));
    const __VLS_287 = __VLS_286({
        label: "Days",
    }, ...__VLS_functionalComponentArgsRest(__VLS_286));
    __VLS_288.slots.default;
    const __VLS_289 = {}.ElInputNumber;
    /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
    // @ts-ignore
    const __VLS_290 = __VLS_asFunctionalComponent(__VLS_289, new __VLS_289({
        modelValue: (__VLS_ctx.budgetForm.days),
        min: (1),
        max: (30),
        ...{ style: {} },
    }));
    const __VLS_291 = __VLS_290({
        modelValue: (__VLS_ctx.budgetForm.days),
        min: (1),
        max: (30),
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_290));
    var __VLS_288;
    var __VLS_284;
    const __VLS_293 = {}.ElCol;
    /** @type {[typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ]} */ ;
    // @ts-ignore
    const __VLS_294 = __VLS_asFunctionalComponent(__VLS_293, new __VLS_293({
        span: (12),
    }));
    const __VLS_295 = __VLS_294({
        span: (12),
    }, ...__VLS_functionalComponentArgsRest(__VLS_294));
    __VLS_296.slots.default;
    const __VLS_297 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_298 = __VLS_asFunctionalComponent(__VLS_297, new __VLS_297({
        label: "People",
    }));
    const __VLS_299 = __VLS_298({
        label: "People",
    }, ...__VLS_functionalComponentArgsRest(__VLS_298));
    __VLS_300.slots.default;
    const __VLS_301 = {}.ElInputNumber;
    /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
    // @ts-ignore
    const __VLS_302 = __VLS_asFunctionalComponent(__VLS_301, new __VLS_301({
        modelValue: (__VLS_ctx.budgetForm.peopleCount),
        min: (1),
        max: (20),
        ...{ style: {} },
    }));
    const __VLS_303 = __VLS_302({
        modelValue: (__VLS_ctx.budgetForm.peopleCount),
        min: (1),
        max: (20),
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_302));
    var __VLS_300;
    var __VLS_296;
    var __VLS_280;
    const __VLS_305 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_306 = __VLS_asFunctionalComponent(__VLS_305, new __VLS_305({
        label: "游览景点",
    }));
    const __VLS_307 = __VLS_306({
        label: "游览景点",
    }, ...__VLS_functionalComponentArgsRest(__VLS_306));
    __VLS_308.slots.default;
    const __VLS_309 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_310 = __VLS_asFunctionalComponent(__VLS_309, new __VLS_309({
        modelValue: (__VLS_ctx.budgetForm.spots),
        placeholder: "例如：十三陵、居庸关",
    }));
    const __VLS_311 = __VLS_310({
        modelValue: (__VLS_ctx.budgetForm.spots),
        placeholder: "例如：十三陵、居庸关",
    }, ...__VLS_functionalComponentArgsRest(__VLS_310));
    var __VLS_308;
    const __VLS_313 = {}.ElRow;
    /** @type {[typeof __VLS_components.ElRow, typeof __VLS_components.elRow, typeof __VLS_components.ElRow, typeof __VLS_components.elRow, ]} */ ;
    // @ts-ignore
    const __VLS_314 = __VLS_asFunctionalComponent(__VLS_313, new __VLS_313({
        gutter: (16),
    }));
    const __VLS_315 = __VLS_314({
        gutter: (16),
    }, ...__VLS_functionalComponentArgsRest(__VLS_314));
    __VLS_316.slots.default;
    const __VLS_317 = {}.ElCol;
    /** @type {[typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ]} */ ;
    // @ts-ignore
    const __VLS_318 = __VLS_asFunctionalComponent(__VLS_317, new __VLS_317({
        span: (8),
    }));
    const __VLS_319 = __VLS_318({
        span: (8),
    }, ...__VLS_functionalComponentArgsRest(__VLS_318));
    __VLS_320.slots.default;
    const __VLS_321 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_322 = __VLS_asFunctionalComponent(__VLS_321, new __VLS_321({
        label: "Transport",
    }));
    const __VLS_323 = __VLS_322({
        label: "Transport",
    }, ...__VLS_functionalComponentArgsRest(__VLS_322));
    __VLS_324.slots.default;
    const __VLS_325 = {}.ElSelect;
    /** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
    // @ts-ignore
    const __VLS_326 = __VLS_asFunctionalComponent(__VLS_325, new __VLS_325({
        modelValue: (__VLS_ctx.budgetForm.transport),
        ...{ style: {} },
    }));
    const __VLS_327 = __VLS_326({
        modelValue: (__VLS_ctx.budgetForm.transport),
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_326));
    __VLS_328.slots.default;
    const __VLS_329 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_330 = __VLS_asFunctionalComponent(__VLS_329, new __VLS_329({
        label: "Public",
        value: "公共交通",
    }));
    const __VLS_331 = __VLS_330({
        label: "Public",
        value: "公共交通",
    }, ...__VLS_functionalComponentArgsRest(__VLS_330));
    const __VLS_333 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_334 = __VLS_asFunctionalComponent(__VLS_333, new __VLS_333({
        label: "Self-drive",
        value: "自驾",
    }));
    const __VLS_335 = __VLS_334({
        label: "Self-drive",
        value: "自驾",
    }, ...__VLS_functionalComponentArgsRest(__VLS_334));
    const __VLS_337 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_338 = __VLS_asFunctionalComponent(__VLS_337, new __VLS_337({
        label: "Mixed",
        value: "混合",
    }));
    const __VLS_339 = __VLS_338({
        label: "Mixed",
        value: "混合",
    }, ...__VLS_functionalComponentArgsRest(__VLS_338));
    var __VLS_328;
    var __VLS_324;
    var __VLS_320;
    const __VLS_341 = {}.ElCol;
    /** @type {[typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ]} */ ;
    // @ts-ignore
    const __VLS_342 = __VLS_asFunctionalComponent(__VLS_341, new __VLS_341({
        span: (8),
    }));
    const __VLS_343 = __VLS_342({
        span: (8),
    }, ...__VLS_functionalComponentArgsRest(__VLS_342));
    __VLS_344.slots.default;
    const __VLS_345 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_346 = __VLS_asFunctionalComponent(__VLS_345, new __VLS_345({
        label: "Dining",
    }));
    const __VLS_347 = __VLS_346({
        label: "Dining",
    }, ...__VLS_functionalComponentArgsRest(__VLS_346));
    __VLS_348.slots.default;
    const __VLS_349 = {}.ElSelect;
    /** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
    // @ts-ignore
    const __VLS_350 = __VLS_asFunctionalComponent(__VLS_349, new __VLS_349({
        modelValue: (__VLS_ctx.budgetForm.diningPref),
        ...{ style: {} },
    }));
    const __VLS_351 = __VLS_350({
        modelValue: (__VLS_ctx.budgetForm.diningPref),
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_350));
    __VLS_352.slots.default;
    const __VLS_353 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_354 = __VLS_asFunctionalComponent(__VLS_353, new __VLS_353({
        label: "Simple",
        value: "简餐",
    }));
    const __VLS_355 = __VLS_354({
        label: "Simple",
        value: "简餐",
    }, ...__VLS_functionalComponentArgsRest(__VLS_354));
    const __VLS_357 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_358 = __VLS_asFunctionalComponent(__VLS_357, new __VLS_357({
        label: "Normal",
        value: "普通",
    }));
    const __VLS_359 = __VLS_358({
        label: "Normal",
        value: "普通",
    }, ...__VLS_functionalComponentArgsRest(__VLS_358));
    const __VLS_361 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_362 = __VLS_asFunctionalComponent(__VLS_361, new __VLS_361({
        label: "Gourmet",
        value: "美食体验",
    }));
    const __VLS_363 = __VLS_362({
        label: "Gourmet",
        value: "美食体验",
    }, ...__VLS_functionalComponentArgsRest(__VLS_362));
    var __VLS_352;
    var __VLS_348;
    var __VLS_344;
    const __VLS_365 = {}.ElCol;
    /** @type {[typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ]} */ ;
    // @ts-ignore
    const __VLS_366 = __VLS_asFunctionalComponent(__VLS_365, new __VLS_365({
        span: (8),
    }));
    const __VLS_367 = __VLS_366({
        span: (8),
    }, ...__VLS_functionalComponentArgsRest(__VLS_366));
    __VLS_368.slots.default;
    const __VLS_369 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_370 = __VLS_asFunctionalComponent(__VLS_369, new __VLS_369({
        label: "Accommodation",
    }));
    const __VLS_371 = __VLS_370({
        label: "Accommodation",
    }, ...__VLS_functionalComponentArgsRest(__VLS_370));
    __VLS_372.slots.default;
    const __VLS_373 = {}.ElSelect;
    /** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
    // @ts-ignore
    const __VLS_374 = __VLS_asFunctionalComponent(__VLS_373, new __VLS_373({
        modelValue: (__VLS_ctx.budgetForm.accommodation),
        ...{ style: {} },
    }));
    const __VLS_375 = __VLS_374({
        modelValue: (__VLS_ctx.budgetForm.accommodation),
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_374));
    __VLS_376.slots.default;
    const __VLS_377 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_378 = __VLS_asFunctionalComponent(__VLS_377, new __VLS_377({
        label: "Budget",
        value: "经济型",
    }));
    const __VLS_379 = __VLS_378({
        label: "Budget",
        value: "经济型",
    }, ...__VLS_functionalComponentArgsRest(__VLS_378));
    const __VLS_381 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_382 = __VLS_asFunctionalComponent(__VLS_381, new __VLS_381({
        label: "Comfort",
        value: "舒适型",
    }));
    const __VLS_383 = __VLS_382({
        label: "Comfort",
        value: "舒适型",
    }, ...__VLS_functionalComponentArgsRest(__VLS_382));
    const __VLS_385 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_386 = __VLS_asFunctionalComponent(__VLS_385, new __VLS_385({
        label: "Luxury",
        value: "高档",
    }));
    const __VLS_387 = __VLS_386({
        label: "Luxury",
        value: "高档",
    }, ...__VLS_functionalComponentArgsRest(__VLS_386));
    var __VLS_376;
    var __VLS_372;
    var __VLS_368;
    var __VLS_316;
    const __VLS_389 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_390 = __VLS_asFunctionalComponent(__VLS_389, new __VLS_389({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.budgetLoading),
        ...{ style: {} },
    }));
    const __VLS_391 = __VLS_390({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.budgetLoading),
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_390));
    let __VLS_393;
    let __VLS_394;
    let __VLS_395;
    const __VLS_396 = {
        onClick: (__VLS_ctx.estimateBudget)
    };
    __VLS_392.slots.default;
    var __VLS_392;
    var __VLS_276;
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
        const __VLS_397 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_398 = __VLS_asFunctionalComponent(__VLS_397, new __VLS_397({
            ...{ 'onClick': {} },
            type: "success",
        }));
        const __VLS_399 = __VLS_398({
            ...{ 'onClick': {} },
            type: "success",
        }, ...__VLS_functionalComponentArgsRest(__VLS_398));
        let __VLS_401;
        let __VLS_402;
        let __VLS_403;
        const __VLS_404 = {
            onClick: (__VLS_ctx.applyBudgetResult)
        };
        __VLS_400.slots.default;
        var __VLS_400;
    }
    var __VLS_272;
    const __VLS_405 = {}.ElDialog;
    /** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
    // @ts-ignore
    const __VLS_406 = __VLS_asFunctionalComponent(__VLS_405, new __VLS_405({
        modelValue: (__VLS_ctx.slotEditVisible),
        title: "Edit Activity",
        width: "500px",
        destroyOnClose: true,
    }));
    const __VLS_407 = __VLS_406({
        modelValue: (__VLS_ctx.slotEditVisible),
        title: "Edit Activity",
        width: "500px",
        destroyOnClose: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_406));
    __VLS_408.slots.default;
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
    const __VLS_409 = {}.ElTimePicker;
    /** @type {[typeof __VLS_components.ElTimePicker, typeof __VLS_components.elTimePicker, ]} */ ;
    // @ts-ignore
    const __VLS_410 = __VLS_asFunctionalComponent(__VLS_409, new __VLS_409({
        modelValue: (__VLS_ctx.slotEditStart),
        format: "HH:mm",
        placeholder: "Start",
    }));
    const __VLS_411 = __VLS_410({
        modelValue: (__VLS_ctx.slotEditStart),
        format: "HH:mm",
        placeholder: "Start",
    }, ...__VLS_functionalComponentArgsRest(__VLS_410));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    const __VLS_413 = {}.ElTimePicker;
    /** @type {[typeof __VLS_components.ElTimePicker, typeof __VLS_components.elTimePicker, ]} */ ;
    // @ts-ignore
    const __VLS_414 = __VLS_asFunctionalComponent(__VLS_413, new __VLS_413({
        modelValue: (__VLS_ctx.slotEditEnd),
        format: "HH:mm",
        placeholder: "End",
    }));
    const __VLS_415 = __VLS_414({
        modelValue: (__VLS_ctx.slotEditEnd),
        format: "HH:mm",
        placeholder: "End",
    }, ...__VLS_functionalComponentArgsRest(__VLS_414));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "slot-edit-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    const __VLS_417 = {}.ElRadioGroup;
    /** @type {[typeof __VLS_components.ElRadioGroup, typeof __VLS_components.elRadioGroup, typeof __VLS_components.ElRadioGroup, typeof __VLS_components.elRadioGroup, ]} */ ;
    // @ts-ignore
    const __VLS_418 = __VLS_asFunctionalComponent(__VLS_417, new __VLS_417({
        modelValue: (__VLS_ctx.slotEditType),
    }));
    const __VLS_419 = __VLS_418({
        modelValue: (__VLS_ctx.slotEditType),
    }, ...__VLS_functionalComponentArgsRest(__VLS_418));
    __VLS_420.slots.default;
    const __VLS_421 = {}.ElRadio;
    /** @type {[typeof __VLS_components.ElRadio, typeof __VLS_components.elRadio, typeof __VLS_components.ElRadio, typeof __VLS_components.elRadio, ]} */ ;
    // @ts-ignore
    const __VLS_422 = __VLS_asFunctionalComponent(__VLS_421, new __VLS_421({
        value: "spot",
    }));
    const __VLS_423 = __VLS_422({
        value: "spot",
    }, ...__VLS_functionalComponentArgsRest(__VLS_422));
    __VLS_424.slots.default;
    var __VLS_424;
    const __VLS_425 = {}.ElRadio;
    /** @type {[typeof __VLS_components.ElRadio, typeof __VLS_components.elRadio, typeof __VLS_components.ElRadio, typeof __VLS_components.elRadio, ]} */ ;
    // @ts-ignore
    const __VLS_426 = __VLS_asFunctionalComponent(__VLS_425, new __VLS_425({
        value: "food",
    }));
    const __VLS_427 = __VLS_426({
        value: "food",
    }, ...__VLS_functionalComponentArgsRest(__VLS_426));
    __VLS_428.slots.default;
    var __VLS_428;
    const __VLS_429 = {}.ElRadio;
    /** @type {[typeof __VLS_components.ElRadio, typeof __VLS_components.elRadio, typeof __VLS_components.ElRadio, typeof __VLS_components.elRadio, ]} */ ;
    // @ts-ignore
    const __VLS_430 = __VLS_asFunctionalComponent(__VLS_429, new __VLS_429({
        value: "text",
    }));
    const __VLS_431 = __VLS_430({
        value: "text",
    }, ...__VLS_functionalComponentArgsRest(__VLS_430));
    __VLS_432.slots.default;
    var __VLS_432;
    var __VLS_420;
    if (__VLS_ctx.slotEditType === 'spot') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "slot-edit-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
        const __VLS_433 = {}.ElInput;
        /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
        // @ts-ignore
        const __VLS_434 = __VLS_asFunctionalComponent(__VLS_433, new __VLS_433({
            modelValue: (__VLS_ctx.slotSearchKeyword),
            placeholder: "Search spots...",
            size: "small",
        }));
        const __VLS_435 = __VLS_434({
            modelValue: (__VLS_ctx.slotSearchKeyword),
            placeholder: "Search spots...",
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_434));
        const __VLS_437 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_438 = __VLS_asFunctionalComponent(__VLS_437, new __VLS_437({
            ...{ 'onClick': {} },
            size: "small",
        }));
        const __VLS_439 = __VLS_438({
            ...{ 'onClick': {} },
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_438));
        let __VLS_441;
        let __VLS_442;
        let __VLS_443;
        const __VLS_444 = {
            onClick: (__VLS_ctx.doSlotSpotSearch)
        };
        __VLS_440.slots.default;
        var __VLS_440;
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
        const __VLS_445 = {}.ElInput;
        /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
        // @ts-ignore
        const __VLS_446 = __VLS_asFunctionalComponent(__VLS_445, new __VLS_445({
            modelValue: (__VLS_ctx.slotSearchKeyword),
            placeholder: "Search food...",
            size: "small",
        }));
        const __VLS_447 = __VLS_446({
            modelValue: (__VLS_ctx.slotSearchKeyword),
            placeholder: "Search food...",
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_446));
        const __VLS_449 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_450 = __VLS_asFunctionalComponent(__VLS_449, new __VLS_449({
            ...{ 'onClick': {} },
            size: "small",
        }));
        const __VLS_451 = __VLS_450({
            ...{ 'onClick': {} },
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_450));
        let __VLS_453;
        let __VLS_454;
        let __VLS_455;
        const __VLS_456 = {
            onClick: (__VLS_ctx.doSlotFoodSearch)
        };
        __VLS_452.slots.default;
        var __VLS_452;
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
    const __VLS_457 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_458 = __VLS_asFunctionalComponent(__VLS_457, new __VLS_457({
        modelValue: (__VLS_ctx.slotEditText),
        type: "textarea",
        rows: (3),
        placeholder: "What do you want to do?",
    }));
    const __VLS_459 = __VLS_458({
        modelValue: (__VLS_ctx.slotEditText),
        type: "textarea",
        rows: (3),
        placeholder: "What do you want to do?",
    }, ...__VLS_functionalComponentArgsRest(__VLS_458));
    {
        const { footer: __VLS_thisSlot } = __VLS_408.slots;
        const __VLS_461 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_462 = __VLS_asFunctionalComponent(__VLS_461, new __VLS_461({
            ...{ 'onClick': {} },
        }));
        const __VLS_463 = __VLS_462({
            ...{ 'onClick': {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_462));
        let __VLS_465;
        let __VLS_466;
        let __VLS_467;
        const __VLS_468 = {
            onClick: (...[$event]) => {
                if (!!(__VLS_ctx.viewMode === 'list'))
                    return;
                __VLS_ctx.slotEditVisible = false;
            }
        };
        __VLS_464.slots.default;
        var __VLS_464;
        const __VLS_469 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_470 = __VLS_asFunctionalComponent(__VLS_469, new __VLS_469({
            ...{ 'onClick': {} },
            type: "primary",
        }));
        const __VLS_471 = __VLS_470({
            ...{ 'onClick': {} },
            type: "primary",
        }, ...__VLS_functionalComponentArgsRest(__VLS_470));
        let __VLS_473;
        let __VLS_474;
        let __VLS_475;
        const __VLS_476 = {
            onClick: (__VLS_ctx.saveSlotEdit)
        };
        __VLS_472.slots.default;
        var __VLS_472;
    }
    var __VLS_408;
}
var __VLS_2;
/** @type {__VLS_StyleScopedClasses['itinerary-page']} */ ;
/** @type {__VLS_StyleScopedClasses['hero']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-bg']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-content']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['glass-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['search-bar']} */ ;
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
var __VLS_75 = __VLS_74;
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
            searchKeyword: searchKeyword,
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
            doSearch: doSearch,
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
