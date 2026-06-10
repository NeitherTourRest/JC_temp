<template>
  <DefaultLayout>
    <!-- ══════════════════════════════════════════════════════
         LIST MODE
         ══════════════════════════════════════════════════════ -->
    <div v-if="viewMode === 'list'" class="itinerary-page">
      <!-- ── Hero Section ──────────────────────────────── -->
      <section class="hero">
        <div class="hero-bg"></div>
        <div class="hero-content">
          <h1>My Trips</h1>
          <p>Plan your perfect journey through Changping</p>
          <div class="hero-actions">
            <el-button type="primary" size="large" @click="openCreateDialog">
              ✦ New Trip
            </el-button>
            <el-button size="large" @click="$router.push('/navigation')">
              🗺️ Plan Route
            </el-button>
          </div>
        </div>
      </section>

      <!-- ── Loading State ─────────────────────────────── -->
      <div v-if="loading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>正在加载行程...</p>
      </div>

      <!-- ── Empty State ───────────────────────────────── -->
      <div v-else-if="!itineraries.length" class="empty-state">
        <div class="empty-icon">📋</div>
        <h3>还没有行程</h3>
        <p>创建你的第一个旅行计划，开始探索昌平</p>
        <el-button type="primary" size="large" @click="openCreateDialog">
          Create Your First Trip
        </el-button>
      </div>

      <!-- 行程卡片列表 -->
      <div v-else class="trips-grid">
        <div
          v-for="item in itineraries"
          :key="item.id"
          class="trip-card glass"
          @click="enterPlanning(item)"
        >
          <div
            class="trip-top"
            :style="{ background: tripColors[item.id % tripColors.length] }"
          >
            <el-popconfirm
              title="确定删除此行程？"
              confirm-button-text="删除"
              cancel-button-text="取消"
              @confirm="handleDelete(item.id)"
            >
              <template #reference>
                <button class="trip-delete-btn" @click.stop title="删除行程">✕</button>
              </template>
            </el-popconfirm>
          </div>
          <div class="trip-body">
            <h3 class="trip-name">{{ item.name }}</h3>
            <div class="trip-stats">
              <span class="stat">📍 {{ getSpotCount(item.spotIds) }}个景点</span>
              <span class="stat">📏 {{ formatDistance(item.totalDistance) }}</span>
              <span class="stat">⏱ {{ formatTime(item.totalTime) }}</span>
            </div>
            <div class="trip-foot">
              <span class="trip-date">{{ formatDate(item.createdAt) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Pagination ────────────────────────────────── -->
      <div v-if="total > 0" class="pagination-wrap">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[6, 12, 18, 24]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>

      <!-- ── Create Dialog ─────────────────────────────── -->
      <el-dialog
        v-model="createDialogVisible"
        title="NEW TRIP"
        width="460px"
        :close-on-click-modal="false"
        destroy-on-close
      >
        <el-form
          ref="createFormRef"
          :model="createForm"
          :rules="createRules"
          label-position="top"
          @submit.prevent
        >
          <el-form-item label="Trip Name" prop="name">
            <el-input
              v-model="createForm.name"
              placeholder="e.g. Beijing 3-Day Tour"
              maxlength="50"
              show-word-limit
            />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="createDialogVisible = false">Cancel</el-button>
          <el-button type="primary" :loading="submitting" @click="handleCreate">
            Create Trip
          </el-button>
        </template>
      </el-dialog>
    </div>

    <!-- ══════════════════════════════════════════════════════
         PLANNING MODE
         ══════════════════════════════════════════════════════ -->
    <div v-else class="planning-page">
      <!-- ── Top Bar ───────────────────────────────────── -->
      <div class="planning-topbar glass-sm">
        <button class="back-btn" @click="goBackToList">← Back</button>
        <input
          v-model="tripPlan.title"
          class="title-input"
          placeholder="Trip Title"
          maxlength="50"
        />
        <button class="map-btn" @click="openMapDialog" title="Map Picker">🗺️</button>
        <button class="save-btn" @click="handleSave">💾 Save</button>
      </div>

      <!-- ── Date Row ──────────────────────────────────── -->
      <div class="planning-dates glass-sm">
        <div class="date-field">
          <label>Start Date</label>
          <el-date-picker
            v-model="tripPlan.startDate"
            type="date"
            placeholder="Pick start date"
            value-format="YYYY-MM-DD"
            @change="regenerateDays"
          />
        </div>
        <span class="date-arrow">→</span>
        <div class="date-field">
          <label>End Date</label>
          <el-date-picker
            v-model="tripPlan.endDate"
            type="date"
            placeholder="Pick end date"
            value-format="YYYY-MM-DD"
            @change="regenerateDays"
          />
        </div>
        <span v-if="tripPlan.days.length" class="day-count">{{ tripPlan.days.length }} days</span>
      </div>

      <!-- ── Day Tabs ──────────────────────────────────── -->
      <div class="day-tabs glass-sm">
        <div class="tabs-scroll">
          <button
            v-for="(day, di) in tripPlan.days"
            :key="di"
            class="day-tab"
            :class="{ active: activeDayIndex === di }"
            @click="activeDayIndex = di"
          >
            Day {{ day.dayIndex }}
            <span class="tab-date">{{ day.date }}</span>
          </button>
        </div>
        <button class="add-day-btn" @click="addDay" title="Add day">+</button>
      </div>

      <!-- ── Budget Summary Bar ────────────────────── -->
      <div v-if="appliedBudget" class="budget-summary-bar">
        💰 Budget: {{ appliedBudget.totalBudget }} · {{ appliedBudget.categories?.length || 0 }} categories
        <button class="route-clear-btn" @click="appliedBudget = null">✕</button>
      </div>

      <!-- ── Day Content (Timeline) ────────────────────── -->
      <div v-if="activeDay" class="day-content">
        <div class="timeline-container">
          <div class="timeline-header">
            <h3>Day {{ activeDay.dayIndex }} · {{ activeDay.date }}</h3>
            <div class="timeline-header-actions">
              <el-button size="small" type="success" @click="routeDayPlan" :loading="routeLoading" :disabled="!activeDay || !activeDay.slots.length">
                🚗 Route
              </el-button>
              <el-button size="small" type="primary" @click="addSlotAt(12)">+ Add Activity</el-button>
            </div>
          </div>
          <div v-if="activeDay?.routeDistance != null" class="route-info-bar">
            🚗 Route: {{ formatDistance(activeDay.routeDistance) }} · {{ formatTime(activeDay.routeTime) }} · {{ totalRoutedStops }} stops
            <button class="route-clear-btn" @click="clearDayRoute" title="Clear route">✕</button>
          </div>
          <div class="timeline-track" @click="onTimelineClick">
            <div v-for="h in 24" :key="h" class="timeline-hour" :style="{ top: h * 60 + 'px' }">
              <span class="hour-label">{{ String(h).padStart(2,'0') }}:00</span>
              <div class="hour-line"></div>
            </div>
            <!-- Slot cards -->
            <div v-for="slot in sortedSlots" :key="slot.id"
              class="timeline-slot-card glass-sm"
              :class="'slot-' + slot.type"
              :style="{ top: slotTop(slot), height: slotHeight(slot) }"
              @click.stop="openSlotEditor(slot)"
            >
              <span v-if="slot.routeOrder != null" class="route-order-badge">{{ slot.routeOrder }}</span>
              <span class="slot-time">{{ slot.startTime }}–{{ slot.endTime }}</span>
              <span class="slot-name">{{ slot.name || slot.text || 'New Activity' }}</span>
              <span class="slot-icon">{{ slot.type === 'spot' ? '📍' : slot.type === 'food' ? '🍽️' : '📝' }}</span>
              <button class="slot-delete" @click.stop="deleteSlot(slot.id)">×</button>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Empty planning state ──────────────────────── -->
      <div v-else class="planning-empty">
        <p>Pick start and end dates to begin planning your days</p>
      </div>

      <!-- ── Floating AI Buttons ────────────────────────── -->
      <div class="ai-float-group">
        <button class="ai-float-btn" title="AI Plan" @click="openAiPlanDialog">📋 Plan</button>
        <button class="ai-float-btn" title="预算" @click="openBudgetDialog">💰 预算</button>
        <button class="ai-float-btn" title="AI Assistant" @click="openAiDialog">🤖 Chat</button>
      </div>

      <!-- ══════════════════════════════════════════════════════
           DIALOG 1: Map Picker 🗺️
           ══════════════════════════════════════════════════════ -->
      <el-dialog
        v-model="mapDialogVisible"
        title="🗺️ Map Picker"
        width="720px"
        destroy-on-close
        @opened="onMapDialogOpened"
        @close="closeMapDialog"
      >
        <div class="map-picker-body">
          <div id="trip-map-container" style="height: 400px; border: 1px solid var(--frosted-border); border-radius: 8px;"></div>
          <p class="map-hint-text">Click anywhere on the map to add a point to today's timeline</p>
        </div>
        <template #footer>
          <el-button @click="mapDialogVisible = false">Close</el-button>
        </template>
      </el-dialog>

      <!-- ══════════════════════════════════════════════════════
           DIALOG 3: AI Chat 🤖
           ══════════════════════════════════════════════════════ -->
      <el-dialog
        v-model="aiDialogVisible"
        title="🤖 AI Trip Assistant"
        width="620px"
        destroy-on-close
      >
        <div class="ai-dialog-body">
          <div class="ai-chat-area" ref="aiChatRef">
            <div v-for="(msg, i) in aiMessages" :key="i" :class="['ai-msg-row', msg.role]">
              <div class="ai-msg-bubble" :class="msg.role">
                <div class="ai-msg-avatar">{{ msg.role === 'user' ? '😎' : '🤖' }}</div>
                <div class="ai-msg-content">
                  <div class="ai-msg-text">{{ msg.content }}</div>
                  <div class="ai-msg-time">{{ msg.time }}</div>
                </div>
              </div>
            </div>
            <div v-if="aiLoading" class="ai-msg-row assistant">
              <div class="ai-msg-bubble assistant">
                <div class="ai-msg-avatar">🤖</div>
                <div class="ai-msg-content">
                  <span class="typing-dots">Thinking</span>
                </div>
              </div>
            </div>
          </div>
          <div class="ai-input-bar">
            <el-input
              v-model="aiInput"
              placeholder="Ask me about your trip..."
              size="large"
              @keyup.enter="sendAiMessage"
              :disabled="aiLoading"
            />
            <el-button
              type="primary"
              size="large"
              @click="sendAiMessage"
              :loading="aiLoading"
              class="ai-send-btn"
            >
              SEND
            </el-button>
          </div>
        </div>
      </el-dialog>

      <!-- ══════════════════════════════════════════════════════
           DIALOG 4: AI Plan 📋
           ══════════════════════════════════════════════════════ -->
      <el-dialog v-model="aiPlanDialogVisible" title="📋 AI Trip Plan" width="700px" top="5vh" destroy-on-close>
        <el-form label-position="top">
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="Days"><el-input-number v-model="planForm.days" :min="1" :max="14" style="width:100%" /></el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="Budget"><el-select v-model="planForm.budget" style="width:100%">
                <el-option label="Low" value="低" /><el-option label="Medium" value="中" /><el-option label="High" value="高" />
              </el-select></el-form-item>
            </el-col>
          </el-row>
          <el-form-item label="Interests"><el-input v-model="planForm.interests" placeholder="e.g. nature, history, food" /></el-form-item>
          <el-form-item label="Transport"><el-select v-model="planForm.transport" style="width:100%">
            <el-option label="Walk" value="步行" /><el-option label="Bike" value="骑行" /><el-option label="Drive" value="驾车" />
          </el-select></el-form-item>
          <el-form-item label="Extra Requirements"><el-input v-model="planForm.additionalInfo" type="textarea" :rows="2" /></el-form-item>
          <el-button type="primary" @click="generatePlan" :loading="planLoading" style="width:100%">Generate Plan</el-button>
        </el-form>
        <div v-if="planResult && !planLoading" class="dialog-result">
          <h4 class="plan-title-name">{{ planResult.title }}</h4>
          <div v-for="day in planResult.days" :key="day.day" class="day-block">
            <strong>{{ day.date }} · {{ day.theme }}</strong>
            <div v-for="act in day.schedule" :key="act.time" class="activity">
              <span class="act-time">{{ act.time }}</span>
              <span class="act-match-icon" v-if="act.matchedType === 'spot'">📍</span>
              <span class="act-match-icon" v-else-if="act.matchedType === 'food'">🍽️</span>
              <span class="act-match-icon" v-else>❓</span>
              <span>{{ act.activity }}</span>
              <span class="act-loc">{{ act.location }}</span>
            </div>
          </div>
          <div v-if="planResult.tips?.length" class="plan-tips">
            <p v-for="(t, i) in planResult.tips" :key="i">• {{ t }}</p>
          </div>
          <div v-if="planResult.estimatedCost" class="plan-cost">💰 {{ planResult.estimatedCost }}</div>
          <el-button size="small" type="success" @click="applyPlanResult" style="margin-top:8px">Apply to Trip</el-button>
        </div>
      </el-dialog>

      <!-- ══════════════════════════════════════════════════════
           DIALOG 5: Budget 💰
           ══════════════════════════════════════════════════════ -->
      <el-dialog v-model="budgetDialogVisible" title="💰 Budget Estimate" width="700px" top="5vh" destroy-on-close>
        <el-form label-position="top">
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="Days"><el-input-number v-model="budgetForm.days" :min="1" :max="30" style="width:100%" /></el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="People"><el-input-number v-model="budgetForm.peopleCount" :min="1" :max="20" style="width:100%" /></el-form-item>
            </el-col>
          </el-row>
          <el-form-item label="游览景点"><el-input v-model="budgetForm.spots" placeholder="例如：十三陵、居庸关" /></el-form-item>
          <el-row :gutter="16">
            <el-col :span="8">
              <el-form-item label="Transport"><el-select v-model="budgetForm.transport" style="width:100%">
                <el-option label="Public" value="公共交通" /><el-option label="Self-drive" value="自驾" /><el-option label="Mixed" value="混合" />
              </el-select></el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="Dining"><el-select v-model="budgetForm.diningPref" style="width:100%">
                <el-option label="Simple" value="简餐" /><el-option label="Normal" value="普通" /><el-option label="Gourmet" value="美食体验" />
              </el-select></el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="Accommodation"><el-select v-model="budgetForm.accommodation" style="width:100%">
                <el-option label="Budget" value="经济型" /><el-option label="Comfort" value="舒适型" /><el-option label="Luxury" value="高档" />
              </el-select></el-form-item>
            </el-col>
          </el-row>
          <el-button type="primary" @click="estimateBudget" :loading="budgetLoading" style="width:100%">Estimate Budget</el-button>
        </el-form>
        <div v-if="budgetResult && !budgetLoading" class="dialog-result">
          <h4 class="budget-total">💰 Total: <span class="total-amount">{{ budgetResult.totalBudget }}</span></h4>
          <div v-for="cat in budgetResult.categories" :key="cat.name" class="cat-row">
            <span class="cat-name">{{ cat.name }}</span>
            <span class="cat-amount">¥{{ cat.amount }}</span>
            <span class="cat-detail">{{ cat.details }}</span>
          </div>
          <div v-if="budgetResult.suggestions?.length" class="plan-tips">
            <p v-for="(s, i) in budgetResult.suggestions" :key="i">• {{ s }}</p>
          </div>
        </div>
        <div v-if="budgetResult && !budgetLoading" class="budget-apply-row">
          <el-button type="success" @click="applyBudgetResult">✅ Apply to Trip</el-button>
        </div>
      </el-dialog>

      <!-- ══════════════════════════════════════════════════════
           DIALOG 6: Slot Editor ✏️
           ══════════════════════════════════════════════════════ -->
      <el-dialog v-model="slotEditVisible" title="Edit Activity" width="500px" destroy-on-close>
        <div class="slot-edit-body">
          <!-- Time range -->
          <div class="slot-edit-row">
            <label>Time</label>
            <div class="slot-time-pickers">
              <el-time-picker v-model="slotEditStart" format="HH:mm" placeholder="Start" />
              <span>—</span>
              <el-time-picker v-model="slotEditEnd" format="HH:mm" placeholder="End" />
            </div>
          </div>
          <!-- Type selector -->
          <div class="slot-edit-row">
            <label>Type</label>
            <el-radio-group v-model="slotEditType">
              <el-radio value="spot">📍 Spot</el-radio>
              <el-radio value="food">🍽️ Food</el-radio>
              <el-radio value="text">📝 Notes</el-radio>
            </el-radio-group>
          </div>
          <!-- Spot search (if type=spot) -->
          <div v-if="slotEditType === 'spot'" class="slot-edit-row">
            <label>Spot</label>
            <el-input v-model="slotSearchKeyword" placeholder="Search spots..." size="small" />
            <el-button size="small" @click="doSlotSpotSearch">Search</el-button>
            <div v-if="slotSpotResults.length" class="slot-search-results">
              <div v-for="r in slotSpotResults" :key="r.id" class="slot-search-item"
                :class="{ selected: editingSlot?.spotId === r.id }"
                @click="selectSlotSpot(r)">
                <span>{{ r.name }}</span>
                <span class="text-sm">{{ r.category }}</span>
              </div>
            </div>
            <div v-if="editingSlot?.spotName" class="slot-selected">Selected: {{ editingSlot.spotName }}</div>
          </div>
          <!-- Food search (if type=food) -->
          <div v-if="slotEditType === 'food'" class="slot-edit-row">
            <label>Food</label>
            <el-input v-model="slotSearchKeyword" placeholder="Search food..." size="small" />
            <el-button size="small" @click="doSlotFoodSearch">Search</el-button>
            <div v-if="slotFoodResults.length" class="slot-search-results">
              <div v-for="r in slotFoodResults" :key="r.id" class="slot-search-item"
                :class="{ selected: editingSlot?.foodId === r.id }"
                @click="selectSlotFood(r)">
                <span>{{ r.name }}</span>
                <span class="text-sm">{{ r.cuisine }}</span>
              </div>
            </div>
            <div v-if="editingSlot?.foodName" class="slot-selected">Selected: {{ editingSlot.foodName }}</div>
          </div>
          <!-- Notes — always visible, any type can have notes -->
          <div class="slot-edit-row">
            <label>Notes</label>
            <el-input v-model="slotEditText" type="textarea" :rows="3" placeholder="What do you want to do?" />
          </div>
        </div>
        <template #footer>
          <el-button @click="slotEditVisible = false">Cancel</el-button>
          <el-button type="primary" @click="saveSlotEdit">Save</el-button>
        </template>
      </el-dialog>
    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import { itineraryApi, type ItineraryResponse } from '@/api/itineraryApi'
import type { TimeSlot, TimelineDay, TimelinePlan, RouteRequest, PlanDaySchedule, PlanActivityItem } from '@/types/api'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { spotApi } from '@/api/spotApi'
import { aiApi } from '@/api/aiApi'
import { navigationApi } from '@/api/navigationApi'

// Legacy types for migration detection (old section-based format)
interface LegacyPlanItem {
  id: string; name: string; spotId?: number; foodId?: number; lat?: number; lng?: number; startTime: string; endTime: string
}
interface LegacyDayPlan {
  dayIndex: number; date: string
  sections: { attractions: LegacyPlanItem[]; dining: LegacyPlanItem[]; other: LegacyPlanItem[] }
}
interface LegacyTripPlan {
  title: string; startDate: string; endDate: string; days: LegacyDayPlan[]; aiSessionId?: string
}

/* ───────────────────────────────────────────────────────
   State
   ─────────────────────────────────────────────────────── */
const viewMode = ref<'list' | 'planning'>('list')
const editingId = ref<number | null>(null)

/* ── List mode state ─────────────────────────────────── */
const itineraries = ref<ItineraryResponse[]>([])
const loading = ref(false)
const submitting = ref(false)
const currentPage = ref(1)
const pageSize = ref(12)
const total = ref(0)

const tripColors = [
  '#22d3ee', '#34d399', '#fbbf24', '#e879f9',
  '#fb923c', '#f472b6', '#4ade80', '#f87171'
]

const createDialogVisible = ref(false)
const createFormRef = ref<FormInstance>()
const createForm = reactive({ name: '' })
const createRules: FormRules = {
  name: [
    { required: true, message: 'Please enter a trip name', trigger: 'blur' },
    { min: 2, message: 'Name must be at least 2 characters', trigger: 'blur' }
  ]
}

/* ── Planning mode state ─────────────────────────────── */
const tripPlan = reactive<TimelinePlan>({
  version: 3,
  title: '',
  startDate: '',
  endDate: '',
  days: []
})
const activeDayIndex = ref(0)

const activeDay = computed(() => tripPlan.days[activeDayIndex.value] ?? null)

const routeLoading = ref(false)
const appliedBudget = ref<any>(null)

/* ── Dialog 1: Map Picker state ──────────────────────── */
const mapDialogVisible = ref(false)
let tripMap: any = null
let tripAMapInstance: any = null

/* ── Dialog 2: Slot Editor state ─────────────────────── */
const slotEditVisible = ref(false)
const editingSlot = ref<TimeSlot | null>(null)
const editingSlotIndex = ref(-1)
const slotEditType = ref<'spot' | 'food' | 'text'>('text')
const slotEditStart = ref<Date | null>(null)
const slotEditEnd = ref<Date | null>(null)
const slotEditText = ref('')
const slotSearchKeyword = ref('')
const slotSpotResults = ref<any[]>([])
const slotFoodResults = ref<any[]>([])

/* ── Dialog 3: AI Chat state ─────────────────────────── */
const aiDialogVisible = ref(false)
const aiInput = ref('')
const aiLoading = ref(false)
const aiMessages = ref<{ role: string; content: string; time: string }[]>([])
const aiChatRef = ref<HTMLElement>()

/* ── Dialog 4: AI Plan state ──────────────────────────── */
const aiPlanDialogVisible = ref(false)
const planForm = ref({ days: 2, interests: '自然风光,历史古迹', budget: '中', transport: '步行', additionalInfo: '' })
const planResult = ref<any>(null)
const planLoading = ref(false)

/* ── Dialog 5: Budget state ──────────────────────────── */
const budgetDialogVisible = ref(false)
const budgetForm = ref({ days: 2, peopleCount: 2, spots: '十三陵,居庸关长城', transport: '公共交通', diningPref: '普通', accommodation: '经济型' })
const budgetResult = ref<any>(null)
const budgetLoading = ref(false)

/* ───────────────────────────────────────────────────────
   List mode: data fetching
   ─────────────────────────────────────────────────────── */
async function fetchItineraries() {
  loading.value = true
  try {
    const res = await itineraryApi.list(currentPage.value - 1, pageSize.value)
    const body = res.data
    if (body.success) {
      itineraries.value = body.data.content
      total.value = body.data.totalElements
    }
  } catch (e) {
    ElMessage.error('加载行程失败')
    console.error(e)
  } finally {
    loading.value = false
  }
}

/* ───────────────────────────────────────────────────────
   List mode: create
   ─────────────────────────────────────────────────────── */
function openCreateDialog() {
  createForm.name = ''
  createFormRef.value?.resetFields()
  createDialogVisible.value = true
}

async function handleCreate() {
  const valid = await createFormRef.value?.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    await itineraryApi.create({ name: createForm.name })
    ElMessage.success('行程已创建！')
    createDialogVisible.value = false
    await fetchItineraries()
  } catch (e) {
    ElMessage.error('创建行程失败')
    console.error(e)
  } finally {
    submitting.value = false
  }
}

/* ───────────────────────────────────────────────────────
   List mode: delete
   ─────────────────────────────────────────────────────── */
async function handleDelete(id: number) {
  try {
    await itineraryApi.del(id)
    ElMessage.success('行程已删除')
    await fetchItineraries()
  } catch (e) {
    ElMessage.error('删除行程失败')
    console.error(e)
  }
}

/* ───────────────────────────────────────────────────────
   List mode: pagination
   ─────────────────────────────────────────────────────── */
function handlePageChange(page: number) {
  currentPage.value = page
  fetchItineraries()
}

function handleSizeChange(size: number) {
  pageSize.value = size
  currentPage.value = 1
  fetchItineraries()
}

/* ───────────────────────────────────────────────────────
   List mode: formatters
   ─────────────────────────────────────────────────────── */
function getSpotCount(spotIds?: string): number {
  if (!spotIds) return 0
  return spotIds.split(',').filter(Boolean).length
}

function formatDistance(meters?: number): string {
  if (meters == null) return '—'
  const km = meters / 1000
  return km >= 1 ? `${km.toFixed(1)} km` : `${meters.toFixed(0)} m`
}

function formatTime(minutes?: number): string {
  if (minutes == null) return '—'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const da = String(d.getDate()).padStart(2, '0')
  return `${y}-${mo}-${da}`
}

/* ───────────────────────────────────────────────────────
   Planning mode: enter from a card
   ─────────────────────────────────────────────────────── */
function migrateLegacyPlan(legacy: any): TimelinePlan {
  const ld = legacy as LegacyTripPlan
  return {
    version: 3,
    title: ld.title || '',
    startDate: ld.startDate || '',
    endDate: ld.endDate || '',
    aiSessionId: ld.aiSessionId,
    days: (ld.days || []).map((d: LegacyDayPlan): TimelineDay => ({
      dayIndex: d.dayIndex,
      date: d.date || '',
      slots: [
        ...(d.sections?.attractions || []).map((p: LegacyPlanItem): TimeSlot => ({
          id: p.id || `slot_${Date.now()}_${Math.random()}`,
          startTime: p.startTime || '09:00',
          endTime: p.endTime || '10:00',
          spotId: p.spotId,
          spotName: p.name,
          name: p.name,
          type: 'spot',
        })),
        ...(d.sections?.dining || []).map((p: LegacyPlanItem): TimeSlot => ({
          id: p.id || `slot_${Date.now()}_${Math.random()}`,
          startTime: p.startTime || '12:00',
          endTime: p.endTime || '13:00',
          foodId: p.foodId,
          foodName: p.name,
          name: p.name,
          type: 'food',
        })),
        ...(d.sections?.other || []).map((p: LegacyPlanItem): TimeSlot => ({
          id: p.id || `slot_${Date.now()}_${Math.random()}`,
          startTime: p.startTime || '14:00',
          endTime: p.endTime || '15:00',
          text: p.name,
          name: p.name,
          type: 'text',
        })),
      ].sort((a, b) => a.startTime.localeCompare(b.startTime)),
    })),
  }
}

function enterPlanning(item: ItineraryResponse) {
  editingId.value = item.id
  // Try to restore saved plan from routeData
  if (item.routeData) {
    try {
      const parsed = JSON.parse(item.routeData) as any
      if (parsed.version === 3) {
        // Already new format — restore directly
        const p = parsed as TimelinePlan
        tripPlan.version = 3
        tripPlan.title = p.title || item.name
        tripPlan.startDate = p.startDate || ''
        tripPlan.endDate = p.endDate || ''
        tripPlan.days = p.days || []
        tripPlan.aiSessionId = p.aiSessionId
      } else {
        // Old format — migrate
        const migrated = migrateLegacyPlan(parsed)
        tripPlan.version = 3
        tripPlan.title = migrated.title || item.name
        tripPlan.startDate = migrated.startDate
        tripPlan.endDate = migrated.endDate
        tripPlan.days = migrated.days
        tripPlan.aiSessionId = migrated.aiSessionId
      }
    } catch {
      // Invalid JSON — start fresh
      tripPlan.title = item.name
      tripPlan.startDate = ''
      tripPlan.endDate = ''
      tripPlan.days = []
      tripPlan.aiSessionId = undefined
    }
  } else {
    tripPlan.title = item.name
    tripPlan.startDate = ''
    tripPlan.endDate = ''
    tripPlan.days = []
    tripPlan.aiSessionId = undefined
  }
  activeDayIndex.value = 0
  viewMode.value = 'planning'
}

/* ───────────────────────────────────────────────────────
   Planning mode: day generation
   ─────────────────────────────────────────────────────── */
function regenerateDays() {
  const { startDate, endDate } = tripPlan
  if (!startDate || !endDate) {
    tripPlan.days = []
    return
  }
  const start = new Date(startDate)
  const end = new Date(endDate)
  if (end < start) {
    tripPlan.days = []
    return
  }
  const msPerDay = 24 * 60 * 60 * 1000
  const diffDays = Math.floor((end.getTime() - start.getTime()) / msPerDay) + 1
  const days: TimelineDay[] = []
  for (let i = 0; i < diffDays; i++) {
    const d = new Date(start.getTime() + i * msPerDay)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const da = String(d.getDate()).padStart(2, '0')
    days.push({
      dayIndex: i + 1,
      date: `${y}-${m}-${da}`,
      slots: []
    })
  }
  tripPlan.days = days
  if (activeDayIndex.value >= days.length) {
    activeDayIndex.value = Math.max(0, days.length - 1)
  }
}

function addDay() {
  const lastDayIdx = tripPlan.days.length
  const lastDate = tripPlan.days.length
    ? new Date(tripPlan.days[tripPlan.days.length - 1].date)
    : tripPlan.startDate
      ? new Date(tripPlan.startDate)
      : new Date()
  lastDate.setDate(lastDate.getDate() + 1)
  const y = lastDate.getFullYear()
  const m = String(lastDate.getMonth() + 1).padStart(2, '0')
  const d = String(lastDate.getDate()).padStart(2, '0')
  tripPlan.days.push({
    dayIndex: lastDayIdx + 1,
    date: `${y}-${m}-${d}`,
    slots: []
  })
  activeDayIndex.value = tripPlan.days.length - 1
}

/* ───────────────────────────────────────────────────────
   Planning mode: Timeline functions
   ─────────────────────────────────────────────────────── */
const sortedSlots = computed(() =>
  [...(activeDay.value?.slots || [])].sort((a, b) => a.startTime.localeCompare(b.startTime))
)

const totalRoutedStops = computed(() =>
  (activeDay.value?.slots || []).filter(s => s.routeOrder != null).length
)

function slotTop(slot: TimeSlot): string {
  const h = Math.max(0, parseInt(slot.startTime.split(':')[0]) || 0)
  const m = Math.max(0, parseInt(slot.startTime.split(':')[1]) || 0)
  return `${h * 60 + m}px`
}
function slotHeight(slot: TimeSlot): string {
  const [sh, sm] = slot.startTime.split(':').map(Number)
  const [eh, em] = slot.endTime.split(':').map(Number)
  const startMin = Math.max(0, sh) * 60 + Math.max(0, sm)
  const endMin = Math.max(0, eh) * 60 + Math.max(0, em)
  return `${Math.max(28, endMin - startMin)}px`
}
function onTimelineClick(e: MouseEvent) {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const y = e.clientY - rect.top
  const hour = Math.round(y / 60)
  addSlotAt(Math.max(0, Math.min(23, hour)))
}
function addSlotAt(hour: number) {
  if (!activeDay.value) return
  activeDay.value.slots.push({
    id: nextItemId(),
    startTime: `${String(hour).padStart(2,'0')}:00`,
    endTime: `${String(Math.min(hour + 1, 24)).padStart(2,'0')}:00`,
    type: 'text',
    name: '',
  })
}
function deleteSlot(slotId: string) {
  if (!activeDay.value) return
  const idx = activeDay.value.slots.findIndex(s => s.id === slotId)
  if (idx >= 0) activeDay.value.slots.splice(idx, 1)
}

/* ───────────────────────────────────────────────────────
   Planning mode: Slot Editor
   ─────────────────────────────────────────────────────── */
function openSlotEditor(slot: TimeSlot) {
  editingSlot.value = { ...slot }
  const idx = activeDay.value?.slots.findIndex(s => s.id === slot.id) ?? -1
  editingSlotIndex.value = idx
  slotEditType.value = slot.type
  const [sh, sm] = slot.startTime.split(':').map(Number)
  const [eh, em] = slot.endTime.split(':').map(Number)
  const d = new Date()
  slotEditStart.value = new Date(d.getFullYear(), d.getMonth(), d.getDate(), sh, sm)
  slotEditEnd.value = new Date(d.getFullYear(), d.getMonth(), d.getDate(), eh, em)
  slotEditText.value = slot.text || ''
  slotSearchKeyword.value = ''
  slotSpotResults.value = []
  slotFoodResults.value = []
  slotEditVisible.value = true
}
function saveSlotEdit() {
  if (!editingSlot.value || !activeDay.value || editingSlotIndex.value < 0) return
  const slot = activeDay.value.slots[editingSlotIndex.value]
  if (slotEditStart.value) {
    slot.startTime = `${String(slotEditStart.value.getHours()).padStart(2,'0')}:${String(slotEditStart.value.getMinutes()).padStart(2,'0')}`
  }
  if (slotEditEnd.value) {
    slot.endTime = `${String(slotEditEnd.value.getHours()).padStart(2,'0')}:${String(slotEditEnd.value.getMinutes()).padStart(2,'0')}`
  }
  slot.type = slotEditType.value
  slot.text = slotEditText.value || undefined
  if (slotEditType.value !== 'spot') { slot.spotId = undefined; slot.spotName = undefined }
  if (slotEditType.value !== 'food') { slot.foodId = undefined; slot.foodName = undefined }
  // Coordinates: clear for text, copy from search result for spot/food
  if (slotEditType.value === 'text') { slot.lat = undefined; slot.lng = undefined }
  if (slotEditType.value === 'spot' || slotEditType.value === 'food') {
    if (editingSlot.value.lat != null) slot.lat = editingSlot.value.lat
    if (editingSlot.value.lng != null) slot.lng = editingSlot.value.lng
  }
  if (slotEditType.value === 'spot') { slot.name = editingSlot.value.name }
  if (slotEditType.value === 'food') { slot.name = editingSlot.value.name }
  slotEditVisible.value = false
}
async function doSlotSpotSearch() {
  if (!slotSearchKeyword.value.trim()) return
  const r = await spotApi.search({ keyword: slotSearchKeyword.value.trim(), size: 10 })
  slotSpotResults.value = r.data.data?.content || []
}
async function doSlotFoodSearch() {
  if (!slotSearchKeyword.value.trim()) return
  const { foodApi } = await import('@/api/foodApi')
  const r = await foodApi.search({ keyword: slotSearchKeyword.value.trim(), size: 10 })
  slotFoodResults.value = r.data.data?.content || []
}
function selectSlotSpot(spot: any) {
  if (!editingSlot.value) return
  editingSlot.value.spotId = spot.id
  editingSlot.value.spotName = spot.name
  editingSlot.value.name = spot.name
  editingSlot.value.lat = spot.latitude
  editingSlot.value.lng = spot.longitude
}
function selectSlotFood(food: any) {
  if (!editingSlot.value) return
  editingSlot.value.foodId = food.id
  editingSlot.value.foodName = food.name
  editingSlot.value.name = food.name
  editingSlot.value.lat = food.latitude
  editingSlot.value.lng = food.longitude
}

/* ───────────────────────────────────────────────────────
   Planning mode: ID generator
   ─────────────────────────────────────────────────────── */
let itemIdCounter = 0
function nextItemId(): string {
  return `item_${Date.now()}_${++itemIdCounter}`
}

/* ───────────────────────────────────────────────────────
   Dialog 1: Map Picker
   ─────────────────────────────────────────────────────── */
function openMapDialog() {
  mapDialogVisible.value = true
}

function onMapDialogOpened() {
  nextTick(() => {
    const container = document.getElementById('trip-map-container')
    if (!container) return
    tripAMapInstance = (window as any).AMap
    if (!tripAMapInstance) {
      setTimeout(onMapDialogOpened, 500)
      return
    }
    tripMap = new tripAMapInstance.Map(container, {
      zoom: 15,
      center: [116.275, 40.155],
      resizeEnable: true
    })
    tripMap.on('click', (e: any) => {
      if (!activeDay.value) return
      const lng = e.lnglat.getLng()
      const lat = e.lnglat.getLat()
      activeDay.value.slots.push({
        id: nextItemId(),
        startTime: '09:00',
        endTime: '10:00',
        name: `📍 Map Point (${lng.toFixed(4)}, ${lat.toFixed(4)})`,
        text: `Map point: ${lng.toFixed(4)}, ${lat.toFixed(4)}`,
        type: 'text',
        lat,
        lng,
      })
      ElMessage.success('Point added to day')
    })
  })
}

function closeMapDialog() {
  if (tripMap) {
    tripMap.destroy()
    tripMap = null
  }
  tripAMapInstance = null
}

/* ───────────────────────────────────────────────────────
   Dialog 3: AI Chat
   ─────────────────────────────────────────────────────── */
function genUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

function openAiDialog() {
  aiDialogVisible.value = true
  if (aiMessages.value.length === 0) {
    aiMessages.value.push({
      role: 'assistant',
      content: "Hi! I'm your trip planning AI. Ask me about attractions, routes, or anything about your trip!",
      time: ''
    })
  }
}

async function sendAiMessage() {
  const text = aiInput.value.trim()
  if (!text || aiLoading.value) return
  aiInput.value = ''
  aiMessages.value.push({ role: 'user', content: text, time: new Date().toLocaleTimeString() })
  aiLoading.value = true
  scrollAiDown()
  try {
    const sid = tripPlan.aiSessionId || genUUID()
    const res = await aiApi.chat(sid, text)
    const data = res.data.data
    if (data) {
      tripPlan.aiSessionId = data.sessionId
      aiMessages.value.push({
        role: 'assistant',
        content: data.reply || 'No response',
        time: new Date().toLocaleTimeString()
      })
    }
  } catch {
    aiMessages.value.push({ role: 'assistant', content: '⚠️ 获取AI回复失败', time: '' })
  } finally {
    aiLoading.value = false
    scrollAiDown()
  }
}

function scrollAiDown() {
  nextTick(() => {
    if (aiChatRef.value) {
      aiChatRef.value.scrollTop = aiChatRef.value.scrollHeight
    }
  })
}

/* ───────────────────────────────────────────────────────
   Dialog 4/5: AI Plan & Budget
   ─────────────────────────────────────────────────────── */
function openAiPlanDialog() {
  aiPlanDialogVisible.value = true
  planResult.value = null
}
function openBudgetDialog() {
  budgetDialogVisible.value = true
  budgetResult.value = null
  budgetLoading.value = false
  // Auto-fill from trip data
  budgetForm.value.days = tripPlan.days.length || 2
  const allSpotNames: string[] = []
  for (const day of tripPlan.days) {
    for (const slot of day.slots) {
      if (slot.spotName && !allSpotNames.includes(slot.spotName)) {
        allSpotNames.push(slot.spotName)
      }
    }
  }
  if (allSpotNames.length > 0) {
    budgetForm.value.spots = allSpotNames.join(',')
  }
}
async function generatePlan() {
  planLoading.value = true
  planResult.value = null
  try {
    const res = await aiApi.plan(planForm.value)
    planResult.value = res.data.data
  } catch {
    planResult.value = { title: '请求失败', days: [], tips: ['请检查AI配置'], estimatedCost: '' }
  } finally { planLoading.value = false }
}
async function estimateBudget() {
  budgetLoading.value = true
  budgetResult.value = null
  try {
    const res = await aiApi.budget(budgetForm.value)
    budgetResult.value = res.data.data
  } catch {
    budgetResult.value = { totalBudget: 'N/A', categories: [], suggestions: ['Check AI config'] }
  } finally { budgetLoading.value = false }
}
function applyPlanResult() {
  if (!planResult.value || !planResult.value.days) return
  // Build tripPlan days from plan result with spot/food matching
  tripPlan.days = planResult.value.days.map((day: PlanDaySchedule, di: number) => ({
    dayIndex: di + 1,
    date: day.date || `Day ${di + 1}`,
    slots: (day.schedule || []).map((a: PlanActivityItem) => {
      const st = a.time || '09:00'
      const [sh, sm] = st.split(':').map(Number)
      const endH = Math.min(sh + 1, 23)
      const base: TimeSlot = {
        id: nextItemId(),
        startTime: st,
        endTime: `${String(endH).padStart(2,'0')}:${String(sm).padStart(2,'0')}`,
        name: a.activity || '',
        text: a.activity || '',
        type: 'text',
      }
      if (a.matchedType === 'spot' && a.matchedLat != null && a.matchedLng != null) {
        base.type = 'spot'
        base.spotId = a.matchedSpotId
        base.spotName = a.matchedName || a.activity
        base.lat = a.matchedLat
        base.lng = a.matchedLng
      } else if (a.matchedType === 'food' && a.matchedLat != null && a.matchedLng != null) {
        base.type = 'food'
        base.foodId = a.matchedFoodId
        base.foodName = a.matchedName || a.activity
        base.lat = a.matchedLat
        base.lng = a.matchedLng
      }
      return base
    }),
  }))
  ElMessage.success('已应用AI规划至行程 — 已关联 ' + countMatched(planResult.value.days) + ' 个地点')
  aiPlanDialogVisible.value = false
}

function countMatched(days: PlanDaySchedule[]): number {
  let n = 0
  for (const d of days) {
    for (const a of (d.schedule || [])) {
      if (a.matchedType === 'spot' || a.matchedType === 'food') n++
    }
  }
  return n
}

/* ───────────────────────────────────────────────────────
   Planning mode: save
   ─────────────────────────────────────────────────────── */
async function routeDayPlan() {
  if (!activeDay.value) return
  // Filter slots with coordinates, sorted by time order
  const withCoords = [...activeDay.value.slots]
    .filter(s => s.lat != null && s.lng != null)
    .sort((a, b) => a.startTime.localeCompare(b.startTime))

  if (withCoords.length < 2) {
    ElMessage.warning(withCoords.length === 0 ? 'No locations with coordinates — add spots/food first' : 'Need at least 2 locations with coordinates')
    return
  }
  routeLoading.value = true
  try {
    // Clear old route orders
    activeDay.value.slots.forEach(s => { s.routeOrder = undefined })

    // Sequential routing: Dijkstra between each consecutive pair
    let totalDistance = 0

    for (let i = 0; i < withCoords.length - 1; i++) {
      const from = withCoords[i]
      const to = withCoords[i + 1]
      const isLast = i === withCoords.length - 2

      const res = await navigationApi.planRoute({
        startLat: from.lat!,
        startLng: from.lng!,
        targets: [{ lat: to.lat!, lng: to.lng!, name: to.name || '' }],
        strategy: 'DISTANCE',
        transports: ['WALK'],
        finalDestinationIdx: isLast ? 0 : undefined,
      })
      const rd = res.data.data
      if (rd) {
        totalDistance += rd.totalDistance
      }
    }

    // Assign route order by time sequence (1 = first, last = final destination)
    withCoords.forEach((s, i) => { s.routeOrder = i + 1 })

    // Estimate walking time: 80 m/min ≈ 5 km/h
    const estimatedMinutes = Math.round(totalDistance / 80)
    activeDay.value.routeDistance = totalDistance
    activeDay.value.routeTime = estimatedMinutes

    ElMessage.success(`Route planned: ${withCoords.length} stops · ${formatDistance(totalDistance)} · ${formatTime(estimatedMinutes)}`)
  } catch (e) {
    ElMessage.error('路线规划失败')
    console.error(e)
  } finally { routeLoading.value = false }
}

function clearDayRoute() {
  if (!activeDay.value) return
  activeDay.value.slots.forEach(s => { s.routeOrder = undefined })
  activeDay.value.routeDistance = undefined
  activeDay.value.routeTime = undefined
}

function applyBudgetResult() {
  if (!budgetResult.value) return
  appliedBudget.value = budgetResult.value
  ElMessage.success('Budget applied to trip')
  budgetDialogVisible.value = false
}

async function handleSave() {
  if (!editingId.value) return
  try {
    const plan: TimelinePlan = {
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
    }
    await itineraryApi.update(editingId.value, {
      name: tripPlan.title,
      routeData: JSON.stringify(plan)
    })
    ElMessage.success('Trip saved!')
  } catch (e) {
    ElMessage.error('保存行程失败')
    console.error(e)
  }
}

function goBackToList() {
  viewMode.value = 'list'
  fetchItineraries()
}

/* ───────────────────────────────────────────────────────
   Init
   ─────────────────────────────────────────────────────── */
onMounted(fetchItineraries)
</script>

<style scoped>
/* ════════════════════════════════════════════════════════
   LIST MODE — Frosted Glass + Neumorphism
   ════════════════════════════════════════════════════════ */
.itinerary-page {
  padding: 0;
}

/* ── Hero ───────────────────────────────────────────── */
.hero {
  position: relative;
  background: linear-gradient(135deg, rgba(167,111,215,0.12), rgba(124,215,238,0.08));
  border: 1px solid var(--frosted-border);
  border-radius: var(--radius-card);
  box-shadow: var(--neu-shadow);
  padding: 56px 24px;
  text-align: center;
  margin-bottom: 28px;
  overflow: hidden;
}

.hero-bg {
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(circle, rgba(124,215,238,0.06) 1px, transparent 1px),
    radial-gradient(circle, rgba(167,111,215,0.04) 1px, transparent 1px);
  background-size: 20px 20px, 30px 30px;
  background-position: 0 0, 15px 15px;
  pointer-events: none;
}

.hero-content {
  position: relative;
  z-index: 1;
}

.hero-content h1 {
  font-family: inherit;
  font-size: 2rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 8px;
  letter-spacing: 2px;
  text-shadow: 2px 2px 10px rgba(0,0,0,0.5);
}

.hero-content p {
  font-family: inherit;
  font-size: 14px;
  color: var(--text-regular);
  margin: 0 0 24px;
}

.hero-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}

/* ── Loading ────────────────────────────────────────── */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  gap: 16px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--frosted-border);
  border-top-color: #7cd7ee;
  border-right-color: #a76fd7;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.loading-state p {
  font-family: inherit;
  font-size: 13px;
  color: var(--text-muted);
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ── Empty ──────────────────────────────────────────── */
.empty-state {
  text-align: center;
  padding: 80px 20px;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 16px;
}

.empty-state h3 {
  font-family: inherit;
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--text-heading);
  margin: 0 0 8px;
}

.empty-state p {
  font-family: inherit;
  font-size: 13px;
  color: var(--text-muted);
  margin: 0 0 20px;
}

/* ── Cards Grid ─────────────────────────────────────── */
.trips-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 18px;
}

.trip-card {
  overflow: hidden;
  cursor: pointer;
  border-radius: 14px;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.trip-card:hover {
  transform: translate(-2px, -2px);
  box-shadow: var(--neu-shadow);
}

.trip-top {
  height: 72px;
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  padding: 8px;
  position: relative;
}

.trip-top::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    rgba(255,255,255,0.15) 0%,
    transparent 60%
  );
  pointer-events: none;
}

.trip-delete-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.3);
  border: 1px solid var(--frosted-border);
  color: #fff;
  border-radius: 50%;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
  z-index: 1;
}

.trip-delete-btn:hover {
  background: var(--pop-red);
  border-color: rgba(255,255,255,0.3);
}

.trip-body {
  padding: 16px 18px 18px;
}

.trip-name {
  font-family: inherit;
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--text-heading);
  margin: 0 0 12px;
  overflow-wrap: break-word;
  word-break: break-word;
  line-height: 1.3;
}

.trip-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 12px;
}

.stat {
  font-family: inherit;
  font-size: 12px;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 2px;
}

.trip-foot {
  padding-top: 12px;
  border-top: 1px solid var(--frosted-border);
}

.trip-date {
  font-family: inherit;
  font-size: 11px;
  color: var(--text-muted);
}

/* ── Pagination ─────────────────────────────────────── */
.pagination-wrap {
  display: flex;
  justify-content: center;
  margin-top: 36px;
  padding-bottom: 24px;
}

/* ════════════════════════════════════════════════════════
   PLANNING MODE
   ════════════════════════════════════════════════════════ */
.planning-page {
  position: relative;
  padding-bottom: 100px;
}

/* ── Top Bar ────────────────────────────────────────── */
.planning-topbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  margin-bottom: 16px;
  background: var(--frosted-bg);
  border: 1px solid var(--frosted-border);
  border-radius: 12px;
  box-shadow: var(--neu-shadow);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.back-btn {
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  background: var(--frosted-bg);
  border: 1px solid var(--frosted-border);
  border-radius: var(--radius-pill);
  padding: 6px 14px;
  cursor: pointer;
  color: var(--text-primary);
  box-shadow: var(--neu-shadow-sm);
  transition: transform 0.1s, box-shadow 0.1s;
}

.back-btn:hover {
  transform: translate(-1px, -1px);
  box-shadow: var(--neu-shadow);
}

.title-input {
  flex: 1;
  font-family: inherit;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-heading);
  background: transparent;
  border: none;
  border-bottom: 2px dashed var(--frosted-border);
  padding: 6px 4px;
  outline: none;
}

.title-input:focus {
  border-bottom-color: rgba(124,215,238,0.4);
}

.save-btn {
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  background: linear-gradient(135deg, rgba(167,111,215,0.8), rgba(124,215,238,0.6));
  border: 1px solid rgba(167,111,215,0.4);
  border-radius: var(--radius-pill);
  padding: 6px 16px;
  cursor: pointer;
  color: #fff;
  box-shadow: var(--neu-shadow-sm);
  transition: transform 0.1s, box-shadow 0.1s;
}

.save-btn:hover {
  transform: translate(-1px, -1px);
  box-shadow: 0 0 15px var(--glow-primary), var(--neu-shadow);
}

/* ── Date Row ───────────────────────────────────────── */
.planning-dates {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  margin-bottom: 16px;
  background: var(--frosted-bg);
  border: 1px solid var(--frosted-border);
  border-radius: 12px;
  box-shadow: var(--neu-shadow);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.date-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.date-field label {
  font-family: inherit;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.date-arrow {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-muted);
  margin-top: 14px;
}

.day-count {
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  color: #7cd7ee;
  margin-left: auto;
  background: rgba(124,215,238,0.12);
  padding: 4px 10px;
  border-radius: 20px;
  border: 1px solid rgba(124,215,238,0.2);
}

/* ── Day Tabs ───────────────────────────────────────── */
.day-tabs {
  display: flex;
  align-items: center;
  gap: 0;
  padding: 6px 8px;
  margin-bottom: 18px;
  background: var(--frosted-bg);
  border: 1px solid var(--frosted-border);
  border-radius: 12px;
  box-shadow: var(--neu-shadow);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  overflow: visible;
}

.tabs-scroll {
  display: flex;
  gap: 4px;
  overflow-x: auto;
  flex: 1;
  padding: 2px 0;
}

.tabs-scroll::-webkit-scrollbar {
  height: 4px;
}

.tabs-scroll::-webkit-scrollbar-thumb {
  background: var(--text-muted);
  border-radius: 2px;
}

.day-tab {
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  background: transparent;
  border: 1px solid transparent;
  border-radius: 20px;
  padding: 6px 14px;
  cursor: pointer;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.12s;
}

.day-tab:hover {
  background: rgba(255,255,255,0.06);
  color: var(--text-primary);
}

.day-tab.active {
  background: linear-gradient(135deg, rgba(167,111,215,0.25), rgba(124,215,238,0.2));
  border-color: rgba(167,111,215,0.3);
  color: var(--text-primary);
  box-shadow: var(--neu-shadow-sm);
}

.tab-date {
  font-size: 10px;
  font-weight: 400;
  color: inherit;
  opacity: 0.7;
}

.add-day-btn {
  font-family: inherit;
  font-size: 16px;
  font-weight: 700;
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(58,210,159,0.3), rgba(58,210,159,0.15));
  color: #3ad29f;
  border: 1px solid rgba(58,210,159,0.3);
  border-radius: 50%;
  cursor: pointer;
  box-shadow: var(--neu-shadow-sm);
  transition: transform 0.1s, box-shadow 0.1s;
  flex-shrink: 0;
  margin-left: 8px;
}

.add-day-btn:hover {
  transform: translate(-1px, -1px);
  box-shadow: 0 0 12px var(--glow-success), var(--neu-shadow);
}

/* ── Day Content (Timeline) ──────────────────────────── */
.day-content {
  min-height: 300px;
}

/* ════════════════════════════════════════════════════
   TIMELINE
   ════════════════════════════════════════════════════ */
.timeline-container { position: relative; padding: 8px 0; }
.timeline-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.timeline-header h3 { font-size: 1.1rem; font-weight: 600; color: var(--text-heading); margin: 0; }

.timeline-header-actions { display: flex; gap: 8px; align-items: center; }

.route-info-bar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 6px 14px; margin-bottom: 10px;
  background: rgba(58,210,159,0.08);
  border: 1px solid rgba(58,210,159,0.3);
  border-radius: 8px;
  font-size: 13px; font-weight: 600; color: #3ad29f;
}
.route-clear-btn {
  background: none; border: none; color: inherit; cursor: pointer;
  font-size: 16px; opacity: 0.7; padding: 0 4px;
  transition: opacity 0.15s;
}
.route-clear-btn:hover { opacity: 1; }

.route-order-badge {
  position: absolute; top: -6px; left: -6px;
  width: 18px; height: 18px;
  display: flex; align-items: center; justify-content: center;
  background: #3ad29f; color: #fff;
  border-radius: 50%; font-size: 10px; font-weight: 700;
  z-index: 3; box-shadow: 0 0 6px rgba(58,210,159,0.4);
  pointer-events: none;
}

.budget-summary-bar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 14px; margin-bottom: 12px;
  background: rgba(255,193,7,0.08);
  border: 1px solid rgba(255,193,7,0.3);
  border-radius: 10px;
  font-size: 13px; font-weight: 600; color: #ffc107;
}

.budget-apply-row { display: flex; justify-content: center; padding: 8px 0; }

.timeline-track {
  position: relative;
  height: 1440px; /* 24h × 60px */
  margin-left: 60px;
  cursor: pointer;
  overflow: visible;
}

.timeline-hour {
  position: absolute;
  left: -60px;
  right: 0;
  height: 60px;
  display: flex;
  align-items: flex-start;
  pointer-events: none;
}
.hour-label {
  width: 52px;
  text-align: right;
  font-size: 11px;
  color: var(--text-muted);
  padding-right: 8px;
  line-height: 60px;
  flex-shrink: 0;
}
.hour-line {
  position: absolute;
  left: 60px;
  right: 0;
  top: 0;
  border-top: 1px solid var(--frosted-border);
}

/* Slot cards */
.timeline-slot-card {
  position: absolute;
  left: 64px;
  right: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 10px;
  border-radius: 8px;
  cursor: pointer;
  overflow: hidden;
  z-index: 2;
  border-left: 4px solid;
  min-height: 28px;
  background: var(--frosted-bg);
  border: 1px solid var(--frosted-border);
}
.timeline-slot-card:hover {
  box-shadow: 0 0 12px rgba(124,215,238,0.25);
}
.timeline-slot-card.slot-spot { border-left-color: #a76fd7; }
.timeline-slot-card.slot-food { border-left-color: #7cd7ee; }
.timeline-slot-card.slot-text { border-left-color: #ffc107; }

.slot-time { font-size: 11px; color: var(--text-muted); white-space: nowrap; flex-shrink: 0; }
.slot-name { font-size: 13px; font-weight: 600; color: var(--text-primary); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.slot-icon { font-size: 14px; flex-shrink: 0; }
.slot-delete {
  width: 20px; height: 20px;
  display: none;
  align-items: center; justify-content: center;
  background: var(--pop-red); color: #fff;
  border: none; border-radius: 50%;
  font-size: 12px; cursor: pointer; flex-shrink: 0;
}
.timeline-slot-card:hover .slot-delete { display: flex; }

/* Slot editor dialog */
.slot-edit-body { display: flex; flex-direction: column; gap: 16px; }
.slot-edit-row { display: flex; flex-direction: column; gap: 6px; }
.slot-edit-row label { font-size: 13px; font-weight: 600; color: var(--text-primary); }
.slot-time-pickers { display: flex; align-items: center; gap: 8px; }
.slot-time-pickers .el-time-picker { width: 130px; }
.slot-search-results { max-height: 200px; overflow-y: auto; border: 1px solid var(--frosted-border); border-radius: 8px; }
.slot-search-item { padding: 8px 12px; cursor: pointer; display: flex; justify-content: space-between; border-bottom: 1px solid var(--frosted-border); }
.slot-search-item:hover { background: rgba(124,215,238,0.1); }
.slot-search-item.selected { background: rgba(124,215,238,0.15); color: #7cd7ee; }
.slot-selected { padding: 6px 10px; background: rgba(124,215,238,0.1); border-radius: 6px; font-size: 13px; color: #7cd7ee; }

/* ── Planning Empty ─────────────────────────────────── */
.planning-empty {
  text-align: center;
  padding: 80px 20px;
}

.planning-empty p {
  font-family: inherit;
  font-size: 14px;
  color: var(--text-muted);
}

/* ── Floating AI Button Group ───────────────────────── */
.ai-float-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
  position: fixed;
  bottom: 28px;
  right: 28px;
  z-index: 100;
}

.ai-float-btn {
  font-family: inherit;
  font-size: 14px;
  font-weight: 700;
  background: linear-gradient(135deg, rgba(167,111,215,0.8), rgba(124,215,238,0.6));
  color: #fff;
  border: 1px solid rgba(167,111,215,0.4);
  border-radius: var(--radius-pill);
  padding: 12px 20px;
  cursor: pointer;
  box-shadow: var(--neu-shadow);
  transition: transform 0.12s, box-shadow 0.12s;
  letter-spacing: 1px;
}

.ai-float-btn:hover {
  transform: translate(-3px, -3px);
  box-shadow: 0 0 20px var(--glow-primary), var(--neu-shadow);
  background: linear-gradient(135deg, rgba(167,111,215,0.9), rgba(124,215,238,0.7));
}

/* ── Map Picker Button (topbar) ─────────────────────── */
.map-btn {
  font-family: inherit;
  font-size: 16px;
  font-weight: 700;
  background: linear-gradient(135deg, rgba(58,210,159,0.3), rgba(58,210,159,0.15));
  border: 1px solid rgba(58,210,159,0.3);
  border-radius: 8px;
  padding: 6px 12px;
  cursor: pointer;
  color: #3ad29f;
  box-shadow: var(--neu-shadow-sm);
  transition: transform 0.1s, box-shadow 0.1s;
}

.map-btn:hover {
  transform: translate(-1px, -1px);
  box-shadow: 0 0 12px var(--glow-success), var(--neu-shadow);
}

/* ── Map Picker Dialog ──────────────────────────────── */
.map-picker-body {
  text-align: center;
}

.map-hint-text {
  font-family: inherit;
  font-size: 12px;
  color: var(--text-muted);
  margin: 10px 0 0;
}

/* ── AI Chat Dialog ─────────────────────────────────── */
.ai-dialog-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 440px;
}

.ai-chat-area {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  border: 1px solid var(--frosted-border);
  border-radius: 8px;
  background: var(--frosted-bg);
  box-shadow: var(--neu-shadow-sm);
}

.ai-msg-row {
  margin-bottom: 12px;
}

.ai-msg-row.user {
  display: flex;
  justify-content: flex-end;
}

.ai-msg-bubble {
  display: flex;
  gap: 8px;
  max-width: 80%;
}

.ai-msg-bubble.user {
  flex-direction: row-reverse;
}

.ai-msg-avatar {
  font-size: 1.6rem;
  flex-shrink: 0;
}

.ai-msg-content {
  padding: 8px 12px;
  border: 1px solid var(--frosted-border);
  border-radius: 8px;
  box-shadow: var(--neu-shadow-sm);
}

.ai-msg-bubble.assistant .ai-msg-content {
  background: rgba(167,111,215,0.12);
}

.ai-msg-bubble.user .ai-msg-content {
  background: rgba(124,215,238,0.12);
}

.ai-msg-text {
  font-family: inherit;
  font-size: 13px;
  line-height: 1.5;
  white-space: pre-wrap;
  color: var(--text-primary);
}

.ai-msg-time {
  font-size: 10px;
  color: var(--text-muted);
  margin-top: 4px;
}

.ai-input-bar {
  display: flex;
  gap: 8px;
}

.ai-input-bar :deep(.el-input__wrapper) {
  box-shadow: var(--neu-shadow-sm) !important;
  border: 1px solid var(--frosted-border) !important;
}

.ai-send-btn {
  flex-shrink: 0;
}

.typing-dots::after {
  content: '...';
  animation: dots 1.5s steps(4) infinite;
}

@keyframes dots {
  0% { content: '.'; }
  25% { content: '..'; }
  50% { content: '...'; }
  75% { content: ''; }
}

/* ── AI Plan & Budget dialog styles ──────────────────── */
.dialog-result { margin-top: 16px; padding: 16px; border: 1px solid var(--frosted-border); border-radius: 8px; background: var(--frosted-bg); }
.plan-title-name { font-size: 16px; font-weight: 700; margin-bottom: 12px; text-align: center; color: var(--text-primary); }
.day-block { margin-bottom: 12px; padding: 10px; background: rgba(255,255,255,0.03); border: 1px solid var(--frosted-border); border-radius: 8px; }
.activity { display: flex; gap: 8px; padding: 4px 0; font-size: 13px; color: var(--text-regular); }
.act-time {
  color: #7cd7ee;
  font-weight: 600;
  width: 50px;
  flex-shrink: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.act-match-icon {
  width: 20px;
  flex-shrink: 0;
  text-align: center;
  font-size: 13px;
  line-height: 1.5;
}
.act-loc {
  color: var(--text-secondary);
  font-size: 12px;
  margin-left: auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 150px;
}
.plan-tips { margin-top: 8px; padding: 8px 12px; background: rgba(255,193,7,0.08); border: 1px solid rgba(255,193,7,0.25); font-size: 12px; color: var(--text-regular); border-radius: 6px; }
.plan-cost { margin-top: 8px; padding: 6px 12px; background: rgba(58,210,159,0.08); border: 1px solid rgba(58,210,159,0.25); display: inline-block; font-size: 14px; font-weight: 600; color: #3ad29f; border-radius: 6px; }
.budget-total { font-size: 18px; text-align: center; padding: 12px; margin-bottom: 12px; background: rgba(58,210,159,0.08); border: 1px solid rgba(58,210,159,0.25); border-radius: 6px; }
.total-amount { color: #3ad29f; font-size: 22px; }
.cat-row { display: flex; gap: 12px; padding: 8px 0; border-bottom: 1px solid var(--frosted-border); font-size: 13px; color: var(--text-regular); }
.cat-name {
  font-weight: 600;
  width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cat-amount {
  color: #ffc107;
  font-weight: 600;
  width: 70px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cat-detail { color: var(--text-secondary); flex: 1; }

/* ── Responsive ─────────────────────────────────────── */
@media (max-width: 768px) {
  .hero {
    padding: 40px 16px;
  }

  .hero-content h1 {
    font-size: 1.5rem;
    letter-spacing: 1px;
  }

  .hero-content p {
    font-size: 12px;
  }

  .trips-grid {
    grid-template-columns: 1fr;
    gap: 14px;
  }

  .trip-top {
    height: 60px;
  }

  .planning-dates {
    flex-wrap: wrap;
  }

  .day-count {
    margin-left: 0;
  }
}
</style>
