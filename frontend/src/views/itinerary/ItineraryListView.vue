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
        <p>Loading your trips...</p>
      </div>

      <!-- ── Empty State ───────────────────────────────── -->
      <div v-else-if="!itineraries.length" class="empty-state">
        <div class="empty-icon">📋</div>
        <h3>No trips yet</h3>
        <p>Create your first travel itinerary and start exploring</p>
        <el-button type="primary" size="large" @click="openCreateDialog">
          Create Your First Trip
        </el-button>
      </div>

      <!-- ── Trip Cards Grid ───────────────────────────── -->
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
              title="Delete this trip?"
              confirm-button-text="Delete"
              cancel-button-text="Cancel"
              @confirm="handleDelete(item.id)"
            >
              <template #reference>
                <button class="trip-delete-btn" @click.stop title="Delete trip">✕</button>
              </template>
            </el-popconfirm>
          </div>
          <div class="trip-body">
            <h3 class="trip-name">{{ item.name }}</h3>
            <div class="trip-stats">
              <span class="stat">📍 {{ getSpotCount(item.spotIds) }} spots</span>
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
        <button class="back-btn" @click="viewMode = 'list'">← Back</button>
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

      <!-- ── Day Content ───────────────────────────────── -->
      <div v-if="activeDay" class="day-content">
        <div class="sections-grid">
          <!-- Attractions ✦ yellow -->
          <div class="section-card">
            <div class="section-header" style="background: var(--pop-yellow)">
              <h3>📍 Attractions</h3>
              <button class="add-btn" @click="openSearchDialog('attractions')">+ Add</button>
            </div>
            <div class="section-body">
              <div v-if="!activeDay.sections.attractions.length" class="section-empty">
                No attractions added yet
              </div>
              <div
                v-for="(item, ii) in activeDay.sections.attractions"
                :key="item.id"
                class="section-item"
              >
                <input
                  v-model="item.name"
                  class="item-name-input"
                  placeholder="Attraction name"
                />
                <div class="item-time">
                  <el-time-picker
                    v-model="item.startTime"
                    format="HH:mm"
                    value-format="HH:mm"
                    placeholder="Start"
                    size="small"
                  />
                  <span class="time-sep">~</span>
                  <el-time-picker
                    v-model="item.endTime"
                    format="HH:mm"
                    value-format="HH:mm"
                    placeholder="End"
                    size="small"
                  />
                </div>
                <button class="remove-btn" @click="removeItem('attractions', ii)">✕</button>
              </div>
            </div>
          </div>

          <!-- Dining ✦ pink -->
          <div class="section-card">
            <div class="section-header" style="background: var(--pop-pink); color: #fff">
              <h3>🍽️ Dining</h3>
              <button class="add-btn add-btn-light" @click="openSearchDialog('dining')">+ Add</button>
            </div>
            <div class="section-body">
              <div v-if="!activeDay.sections.dining.length" class="section-empty">
                No dining added yet
              </div>
              <div
                v-for="(item, ii) in activeDay.sections.dining"
                :key="item.id"
                class="section-item"
              >
                <input
                  v-model="item.name"
                  class="item-name-input"
                  placeholder="Restaurant / dish"
                />
                <div class="item-time">
                  <el-time-picker
                    v-model="item.startTime"
                    format="HH:mm"
                    value-format="HH:mm"
                    placeholder="Start"
                    size="small"
                  />
                  <span class="time-sep">~</span>
                  <el-time-picker
                    v-model="item.endTime"
                    format="HH:mm"
                    value-format="HH:mm"
                    placeholder="End"
                    size="small"
                  />
                </div>
                <button class="remove-btn" @click="removeItem('dining', ii)">✕</button>
              </div>
            </div>
          </div>

          <!-- Other ✦ blue -->
          <div class="section-card">
            <div class="section-header" style="background: var(--pop-blue)">
              <h3>📌 Other</h3>
              <button class="add-btn" @click="addItem('other')">+ Add</button>
            </div>
            <div class="section-body">
              <div v-if="!activeDay.sections.other.length" class="section-empty">
                No other items yet
              </div>
              <div
                v-for="(item, ii) in activeDay.sections.other"
                :key="item.id"
                class="section-item"
              >
                <input
                  v-model="item.name"
                  class="item-name-input"
                  placeholder="Activity / note"
                />
                <div class="item-time">
                  <el-time-picker
                    v-model="item.startTime"
                    format="HH:mm"
                    value-format="HH:mm"
                    placeholder="Start"
                    size="small"
                  />
                  <span class="time-sep">~</span>
                  <el-time-picker
                    v-model="item.endTime"
                    format="HH:mm"
                    value-format="HH:mm"
                    placeholder="End"
                    size="small"
                  />
                </div>
                <button class="remove-btn" @click="removeItem('other', ii)">✕</button>
              </div>
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
        <button class="ai-float-btn" title="Budget" @click="openBudgetDialog">💰 Budget</button>
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
          <div id="trip-map-container" style="height: 400px; border: 3px solid #000; border-radius: 8px;"></div>
          <p class="map-hint-text">Click anywhere on the map to add a point to today's Attractions</p>
        </div>
        <template #footer>
          <el-button @click="mapDialogVisible = false">Close</el-button>
        </template>
      </el-dialog>

      <!-- ══════════════════════════════════════════════════════
           DIALOG 2: Spot / Food Search 🔍
           ══════════════════════════════════════════════════════ -->
      <el-dialog
        v-model="searchDialogVisible"
        :title="searchSection === 'attractions' ? '🔍 Search Attractions' : '🍽️ Search Dining'"
        width="560px"
        destroy-on-close
      >
        <div class="search-dialog-body">
          <div class="search-input-row">
            <el-input
              v-model="searchKeyword"
              placeholder="Enter keyword..."
              size="large"
              @keyup.enter="doSearch"
            />
            <el-button type="primary" size="large" @click="doSearch" :loading="searchLoading">
              Search
            </el-button>
          </div>
          <div v-if="searchResults.length" class="search-results">
            <div
              v-for="item in searchResults"
              :key="item.id"
              class="search-result-card glass"
              @click="selectSearchResult(item)"
            >
              <div class="result-name">{{ item.name }}</div>
              <div class="result-meta">
                <span v-if="item.category" class="result-category">{{ item.category }}</span>
                <span v-if="item.address" class="result-address">📍 {{ item.address }}</span>
                <span v-if="item.latitude != null" class="result-coords">
                  {{ item.latitude.toFixed(4) }}, {{ item.longitude.toFixed(4) }}
                </span>
              </div>
            </div>
          </div>
          <div v-else-if="searchKeyword && !searchLoading" class="search-empty">
            No results found
          </div>
        </div>
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
          <el-form-item label="Spots to Visit"><el-input v-model="budgetForm.spots" placeholder="e.g. 十三陵,居庸关" /></el-form-item>
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
      </el-dialog>
    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import { itineraryApi, type ItineraryResponse } from '@/api/itineraryApi'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { spotApi } from '@/api/spotApi'
import { aiApi } from '@/api/aiApi'

/* ───────────────────────────────────────────────────────
   Type definitions
   ─────────────────────────────────────────────────────── */
interface PlanItem {
  id: string
  name: string
  spotId?: number
  foodId?: number
  lat?: number
  lng?: number
  startTime: string
  endTime: string
}

interface DayPlan {
  dayIndex: number
  date: string
  sections: {
    attractions: PlanItem[]
    dining: PlanItem[]
    other: PlanItem[]
  }
}

interface TripPlan {
  title: string
  startDate: string
  endDate: string
  days: DayPlan[]
  aiSessionId?: string
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
const tripPlan = reactive<TripPlan>({
  title: '',
  startDate: '',
  endDate: '',
  days: []
})
const activeDayIndex = ref(0)

const activeDay = computed(() => tripPlan.days[activeDayIndex.value] ?? null)

/* ── Dialog 1: Map Picker state ──────────────────────── */
const mapDialogVisible = ref(false)
let tripMap: any = null
let tripAMapInstance: any = null

/* ── Dialog 2: Spot/Food Search state ────────────────── */
const searchDialogVisible = ref(false)
const searchSection = ref<'attractions' | 'dining'>('attractions')
const searchKeyword = ref('')
const searchResults = ref<any[]>([])
const searchLoading = ref(false)

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
    ElMessage.error('Failed to load trips')
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
    ElMessage.success('Trip created!')
    createDialogVisible.value = false
    await fetchItineraries()
  } catch (e) {
    ElMessage.error('Failed to create trip')
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
    ElMessage.success('Trip deleted')
    await fetchItineraries()
  } catch (e) {
    ElMessage.error('Failed to delete trip')
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
function enterPlanning(item: ItineraryResponse) {
  editingId.value = item.id
  tripPlan.title = item.name
  tripPlan.startDate = ''
  tripPlan.endDate = ''
  tripPlan.days = []
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
  const days: DayPlan[] = []
  for (let i = 0; i < diffDays; i++) {
    const d = new Date(start.getTime() + i * msPerDay)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const da = String(d.getDate()).padStart(2, '0')
    days.push({
      dayIndex: i + 1,
      date: `${y}-${m}-${da}`,
      sections: {
        attractions: [],
        dining: [],
        other: []
      }
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
    sections: { attractions: [], dining: [], other: [] }
  })
  activeDayIndex.value = tripPlan.days.length - 1
}

/* ───────────────────────────────────────────────────────
   Planning mode: item CRUD
   ─────────────────────────────────────────────────────── */
let itemIdCounter = 0
function nextItemId(): string {
  return `item_${Date.now()}_${++itemIdCounter}`
}

function addItem(section: 'attractions' | 'dining' | 'other') {
  if (!activeDay.value) return
  activeDay.value.sections[section].push({
    id: nextItemId(),
    name: '',
    startTime: '',
    endTime: ''
  })
}

function removeItem(section: 'attractions' | 'dining' | 'other', index: number) {
  if (!activeDay.value) return
  activeDay.value.sections[section].splice(index, 1)
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
      activeDay.value.sections.attractions.push({
        id: nextItemId(),
        name: `Map Point (${lng.toFixed(4)}, ${lat.toFixed(4)})`,
        lat,
        lng,
        startTime: '',
        endTime: ''
      })
      ElMessage.success('Map point added to Attractions')
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
   Dialog 2: Spot / Food Search
   ─────────────────────────────────────────────────────── */
function openSearchDialog(section: 'attractions' | 'dining') {
  searchSection.value = section
  searchKeyword.value = ''
  searchResults.value = []
  searchDialogVisible.value = true
}

async function doSearch() {
  const kw = searchKeyword.value.trim()
  if (!kw) return
  searchLoading.value = true
  try {
    if (searchSection.value === 'attractions') {
      const res = await spotApi.search({ keyword: kw })
      searchResults.value = res.data.data?.content || []
    } else {
      const res = await spotApi.search({ keyword: kw, category: '餐厅' })
      searchResults.value = res.data.data?.content || []
    }
  } catch (e) {
    ElMessage.error('Search failed')
    console.error(e)
  } finally {
    searchLoading.value = false
  }
}

function selectSearchResult(item: any) {
  if (!activeDay.value) return
  const sec = searchSection.value
  const newItem: PlanItem = {
    id: nextItemId(),
    name: item.name || '',
    spotId: sec === 'attractions' ? item.id : undefined,
    foodId: sec === 'dining' ? item.id : undefined,
    lat: item.latitude,
    lng: item.longitude,
    startTime: '',
    endTime: ''
  }
  activeDay.value.sections[sec].push(newItem)
  ElMessage.success(`Added "${newItem.name}"`)
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
    aiMessages.value.push({ role: 'assistant', content: '⚠️ Failed to get AI response.', time: '' })
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
}
async function generatePlan() {
  planLoading.value = true
  planResult.value = null
  try {
    const res = await aiApi.plan(planForm.value)
    planResult.value = res.data.data
  } catch {
    planResult.value = { title: 'Request failed', days: [], tips: ['Check AI config'], estimatedCost: '' }
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
  // Build tripPlan days from plan result
  tripPlan.days = planResult.value.days.map((day: any, di: number) => ({
    date: day.date || `Day ${di + 1}`,
    sections: {
      attractions: (day.schedule || []).map((a: any) => ({
        id: nextItemId(),
        name: a.activity || '',
        startTime: a.time || '',
        endTime: ''
      })),
      dining: [],
      notes: []
    }
  }))
  ElMessage.success('Plan applied to trip')
  aiPlanDialogVisible.value = false
}

/* ───────────────────────────────────────────────────────
   Planning mode: save
   ─────────────────────────────────────────────────────── */
async function handleSave() {
  if (!editingId.value) return
  try {
    await itineraryApi.update(editingId.value, {
      name: tripPlan.title,
      routeData: JSON.stringify(tripPlan)
    })
    ElMessage.success('Trip saved!')
  } catch (e) {
    ElMessage.error('Failed to save trip')
    console.error(e)
  }
}

/* ───────────────────────────────────────────────────────
   Init
   ─────────────────────────────────────────────────────── */
onMounted(fetchItineraries)
</script>

<style scoped>
/* ════════════════════════════════════════════════════════
   LIST MODE (preserved from original)
   ════════════════════════════════════════════════════════ */
.itinerary-page {
  padding: 0;
}

/* ── Hero ───────────────────────────────────────────── */
.hero {
  position: relative;
  background: var(--pop-yellow);
  border: 3px solid #000;
  border-radius: 16px;
  box-shadow: 8px 8px 0 #000;
  padding: 56px 24px;
  text-align: center;
  margin-bottom: 28px;
  overflow: hidden;
}

.hero-bg {
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(circle, rgba(255,105,180,0.08) 1px, transparent 1px),
    radial-gradient(circle, rgba(0,191,255,0.06) 1px, transparent 1px);
  background-size: 20px 20px, 30px 30px;
  background-position: 0 0, 15px 15px;
  pointer-events: none;
}

.hero-content {
  position: relative;
  z-index: 1;
}

.hero-content h1 {
  font-family: 'Lucida Console', monospace;
  font-size: 2rem;
  font-weight: 700;
  color: #000;
  margin: 0 0 8px;
  letter-spacing: 2px;
  text-shadow: 3px 3px 0 var(--pop-pink);
}

.hero-content p {
  font-family: 'Lucida Console', monospace;
  font-size: 14px;
  color: rgba(0,0,0,0.6);
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
  border: 3px solid rgba(0,0,0,0.1);
  border-top-color: var(--pop-yellow);
  border-right-color: var(--pop-pink);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.loading-state p {
  font-family: 'Lucida Console', monospace;
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
  font-family: 'Lucida Console', monospace;
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--text-heading);
  margin: 0 0 8px;
}

.empty-state p {
  font-family: 'Lucida Console', monospace;
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
  box-shadow: 8px 8px 0 #000;
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
  border: 2px solid rgba(255,255,255,0.25);
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
  border-color: rgba(255,255,255,0.5);
}

.trip-body {
  padding: 16px 18px 18px;
}

.trip-name {
  font-family: 'Lucida Console', monospace;
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--text-heading);
  margin: 0 0 12px;
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
  font-family: 'Lucida Console', monospace;
  font-size: 12px;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 2px;
}

.trip-foot {
  padding-top: 12px;
  border-top: 2px solid rgba(0,0,0,0.08);
}

.trip-date {
  font-family: 'Lucida Console', monospace;
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
  background: #fff;
  border: 3px solid #000;
  border-radius: 10px;
  box-shadow: 4px 4px 0 #000;
}

.back-btn {
  font-family: 'Lucida Console', monospace;
  font-size: 13px;
  font-weight: 600;
  background: #fff;
  border: 2px solid #000;
  border-radius: 6px;
  padding: 6px 14px;
  cursor: pointer;
  color: var(--text-heading);
  box-shadow: 2px 2px 0 #000;
  transition: transform 0.1s, box-shadow 0.1s;
}

.back-btn:hover {
  transform: translate(-1px, -1px);
  box-shadow: 3px 3px 0 #000;
}

.title-input {
  flex: 1;
  font-family: 'Lucida Console', monospace;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-heading);
  background: transparent;
  border: none;
  border-bottom: 2px dashed rgba(0,0,0,0.3);
  padding: 6px 4px;
  outline: none;
}

.title-input:focus {
  border-bottom-color: var(--pop-yellow);
}

.save-btn {
  font-family: 'Lucida Console', monospace;
  font-size: 13px;
  font-weight: 600;
  background: var(--pop-yellow);
  border: 2px solid #000;
  border-radius: 6px;
  padding: 6px 16px;
  cursor: pointer;
  color: #000;
  box-shadow: 2px 2px 0 #000;
  transition: transform 0.1s, box-shadow 0.1s;
}

.save-btn:hover {
  transform: translate(-1px, -1px);
  box-shadow: 3px 3px 0 #000;
}

/* ── Date Row ───────────────────────────────────────── */
.planning-dates {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  margin-bottom: 16px;
  background: #fff;
  border: 3px solid #000;
  border-radius: 10px;
  box-shadow: 4px 4px 0 #000;
}

.date-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.date-field label {
  font-family: 'Lucida Console', monospace;
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
  font-family: 'Lucida Console', monospace;
  font-size: 12px;
  font-weight: 600;
  color: var(--pop-pink);
  margin-left: auto;
  background: rgba(255,105,180,0.1);
  padding: 4px 10px;
  border-radius: 6px;
  border: 2px solid var(--pop-pink);
}

/* ── Day Tabs ───────────────────────────────────────── */
.day-tabs {
  display: flex;
  align-items: center;
  gap: 0;
  padding: 6px 8px;
  margin-bottom: 18px;
  background: #fff;
  border: 3px solid #000;
  border-radius: 10px;
  box-shadow: 4px 4px 0 #000;
  overflow: hidden;
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
  background: #ccc;
  border-radius: 2px;
}

.day-tab {
  font-family: 'Lucida Console', monospace;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  background: transparent;
  border: 2px solid transparent;
  border-radius: 6px;
  padding: 6px 14px;
  cursor: pointer;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.12s;
}

.day-tab:hover {
  background: rgba(0,0,0,0.04);
}

.day-tab.active {
  background: var(--pop-yellow);
  border-color: #000;
  color: #000;
  box-shadow: 2px 2px 0 #000;
}

.tab-date {
  font-size: 10px;
  font-weight: 400;
  color: inherit;
  opacity: 0.7;
}

.add-day-btn {
  font-family: 'Lucida Console', monospace;
  font-size: 16px;
  font-weight: 700;
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--pop-green);
  color: #000;
  border: 2px solid #000;
  border-radius: 8px;
  cursor: pointer;
  box-shadow: 2px 2px 0 #000;
  transition: transform 0.1s;
  flex-shrink: 0;
  margin-left: 8px;
}

.add-day-btn:hover {
  transform: translate(-1px, -1px);
  box-shadow: 3px 3px 0 #000;
}

/* ── Day Content ────────────────────────────────────── */
.day-content {
  min-height: 300px;
}

.sections-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.section-card {
  border: 3px solid #000;
  border-radius: 12px;
  overflow: hidden;
  background: #fff;
  box-shadow: 5px 5px 0 #000;
  display: flex;
  flex-direction: column;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 3px solid #000;
}

.section-header h3 {
  font-family: 'Lucida Console', monospace;
  font-size: 13px;
  font-weight: 700;
  color: #000;
  margin: 0;
}

.add-btn {
  font-family: 'Lucida Console', monospace;
  font-size: 11px;
  font-weight: 700;
  background: #fff;
  color: #000;
  border: 2px solid #000;
  border-radius: 6px;
  padding: 3px 10px;
  cursor: pointer;
  box-shadow: 2px 2px 0 #000;
  transition: transform 0.1s;
}

.add-btn:hover {
  transform: translate(-1px, -1px);
  box-shadow: 3px 3px 0 #000;
}

.add-btn-light {
  color: #000;
}

.section-body {
  padding: 10px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-empty {
  font-family: 'Lucida Console', monospace;
  font-size: 12px;
  color: var(--text-muted);
  text-align: center;
  padding: 24px 8px;
}

/* ── Section Items ──────────────────────────────────── */
.section-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px;
  background: rgba(0,0,0,0.03);
  border: 2px solid rgba(0,0,0,0.12);
  border-radius: 8px;
  position: relative;
}

.item-name-input {
  font-family: 'Lucida Console', monospace;
  font-size: 13px;
  color: var(--text-heading);
  background: #fff;
  border: 2px solid #000;
  border-radius: 6px;
  padding: 6px 8px;
  outline: none;
  box-shadow: 2px 2px 0 rgba(0,0,0,0.1);
  width: 100%;
}

.item-name-input:focus {
  border-color: var(--pop-blue);
  box-shadow: 2px 2px 0 var(--pop-blue);
}

.item-time {
  display: flex;
  align-items: center;
  gap: 6px;
}

.item-time :deep(.el-input__wrapper) {
  padding: 2px 6px !important;
  box-shadow: 2px 2px 0 #000 !important;
}

.item-time :deep(.el-input__inner) {
  font-size: 11px !important;
}

.time-sep {
  font-family: 'Lucida Console', monospace;
  font-size: 12px;
  color: var(--text-muted);
  font-weight: 600;
}

.remove-btn {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--pop-red);
  color: #fff;
  border: 2px solid #000;
  border-radius: 50%;
  font-size: 10px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 2px 2px 0 #000;
  transition: transform 0.1s;
  line-height: 1;
}

.remove-btn:hover {
  transform: scale(1.15);
}

/* ── Planning Empty ─────────────────────────────────── */
.planning-empty {
  text-align: center;
  padding: 80px 20px;
}

.planning-empty p {
  font-family: 'Lucida Console', monospace;
  font-size: 14px;
  color: var(--text-muted);
}

/* ── Floating AI Button ─────────────────────────────── */
.ai-float-btn {
  position: fixed;
  bottom: 28px;
  right: 28px;
  z-index: 100;
  font-family: 'Lucida Console', monospace;
  font-size: 14px;
  font-weight: 700;
  background: var(--pop-yellow);
  color: #000;
  border: 3px solid #000;
  border-radius: 16px;
  padding: 12px 20px;
  cursor: pointer;
  box-shadow: 6px 6px 0 #000;
  transition: transform 0.12s, box-shadow 0.12s;
  letter-spacing: 1px;
}

.ai-float-btn:hover {
  transform: translate(-3px, -3px);
  box-shadow: 9px 9px 0 #000;
  background: var(--pop-pink);
  color: #fff;
}

/* ── Map Picker Button (topbar) ─────────────────────── */
.map-btn {
  font-family: 'Lucida Console', monospace;
  font-size: 16px;
  font-weight: 700;
  background: var(--pop-green);
  border: 2px solid #000;
  border-radius: 6px;
  padding: 6px 12px;
  cursor: pointer;
  color: #000;
  box-shadow: 2px 2px 0 #000;
  transition: transform 0.1s, box-shadow 0.1s;
}

.map-btn:hover {
  transform: translate(-1px, -1px);
  box-shadow: 3px 3px 0 #000;
}

/* ── Map Picker Dialog ──────────────────────────────── */
.map-picker-body {
  text-align: center;
}

.map-hint-text {
  font-family: 'Lucida Console', monospace;
  font-size: 12px;
  color: var(--text-muted);
  margin: 10px 0 0;
}

/* ── Search Dialog ──────────────────────────────────── */
.search-dialog-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.search-input-row {
  display: flex;
  gap: 8px;
}

.search-input-row :deep(.el-input__wrapper) {
  box-shadow: 3px 3px 0 #000 !important;
  border: 2px solid #000 !important;
}

.search-results {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 400px;
  overflow-y: auto;
}

.search-result-card {
  padding: 12px 14px;
  border: 3px solid #000;
  border-radius: 8px;
  box-shadow: 3px 3px 0 #000;
  cursor: pointer;
  transition: transform 0.1s, box-shadow 0.1s;
  background: #fff;
}

.search-result-card:hover {
  transform: translate(-1px, -1px);
  box-shadow: 5px 5px 0 #000;
}

.result-name {
  font-family: 'Lucida Console', monospace;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-heading);
  margin-bottom: 6px;
}

.result-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  font-size: 11px;
}

.result-category {
  font-family: 'Lucida Console', monospace;
  background: var(--pop-yellow);
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid #000;
  color: #000;
}

.result-address {
  font-family: 'Lucida Console', monospace;
  color: var(--text-muted);
}

.result-coords {
  font-family: 'Lucida Console', monospace;
  color: var(--pop-blue);
}

.search-empty {
  font-family: 'Lucida Console', monospace;
  font-size: 13px;
  color: var(--text-muted);
  text-align: center;
  padding: 30px 0;
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
  border: 3px solid #000;
  border-radius: 8px;
  background: #fff;
  box-shadow: 3px 3px 0 #000;
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
  border: 2px solid #000;
  border-radius: 8px;
  box-shadow: 2px 2px 0 #000;
}

.ai-msg-bubble.assistant .ai-msg-content {
  background: var(--pop-yellow);
}

.ai-msg-bubble.user .ai-msg-content {
  background: var(--pop-blue);
  color: #fff;
}

.ai-msg-text {
  font-family: 'Lucida Console', monospace;
  font-size: 13px;
  line-height: 1.5;
  white-space: pre-wrap;
}

.ai-msg-time {
  font-size: 10px;
  color: rgba(0,0,0,0.35);
  margin-top: 4px;
}

.ai-input-bar {
  display: flex;
  gap: 8px;
}

.ai-input-bar :deep(.el-input__wrapper) {
  box-shadow: 3px 3px 0 #000 !important;
  border: 2px solid #000 !important;
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
.dialog-result { margin-top: 16px; padding: 16px; border: 3px solid #000; border-radius: 8px; background: #fff; }
.plan-title-name { font-size: 16px; font-weight: 700; margin-bottom: 12px; text-align: center; }
.day-block { margin-bottom: 12px; padding: 10px; background: #faf8f5; border: 1px dashed #000; }
.activity { display: flex; gap: 8px; padding: 4px 0; font-size: 13px; }
.act-time { color: #2c3e7a; font-weight: 600; width: 50px; flex-shrink: 0; }
.act-loc { color: #666; font-size: 12px; margin-left: auto; }
.plan-tips { margin-top: 8px; padding: 8px 12px; background: #fff8e1; border: 1px dashed #e6a23c; font-size: 12px; }
.plan-cost { margin-top: 8px; padding: 6px 12px; background: #f0f9eb; border: 1px solid #67c23a; display: inline-block; font-size: 14px; font-weight: 600; }
.budget-total { font-size: 18px; text-align: center; padding: 12px; margin-bottom: 12px; background: #f0f9eb; border: 1px dashed #67c23a; }
.total-amount { color: #67c23a; font-size: 22px; }
.cat-row { display: flex; gap: 12px; padding: 8px 0; border-bottom: 1px solid #f0f0f0; font-size: 13px; }
.cat-name { font-weight: 600; width: 80px; }
.cat-amount { color: #e6a23c; font-weight: 600; width: 70px; }
.cat-detail { color: #666; flex: 1; }

/* ── Responsive ─────────────────────────────────────── */
@media (max-width: 768px) {
  .hero {
    padding: 40px 16px;
  }

  .hero-content h1 {
    font-size: 1.5rem;
    letter-spacing: 1px;
    text-shadow: 2px 2px 0 var(--pop-pink);
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

  .sections-grid {
    grid-template-columns: 1fr;
  }

  .planning-dates {
    flex-wrap: wrap;
  }

  .day-count {
    margin-left: 0;
  }
}
</style>
