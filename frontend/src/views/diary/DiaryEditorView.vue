<template>
  <DefaultLayout>
    <div class="diary-editor">
      <div class="editor-header">
        <h2>{{ isEditMode ? '编辑游记' : '写游记' }}</h2>
        <div class="header-actions">
          <el-switch
            v-model="previewMode"
            :active-text="isMobile ? '预览' : ''"
            :inactive-text="isMobile ? '编辑' : ''"
            size="large"
          />
          <span v-if="!isMobile" class="mode-label">{{ previewMode ? '仅预览' : '编辑 + 预览' }}</span>
        </div>
      </div>

      <div class="editor-body" :class="{ 'stacked': isMobile && previewMode }">
        <!-- 左侧：编辑表单 -->
        <div class="editor-form-panel" v-show="!isMobile || !previewMode" v-loading="loading">
          <el-form
            ref="formRef"
            :model="form"
            :rules="rules"
            label-position="top"
            @submit.prevent
          >
            <el-form-item label="标题" prop="title">
              <el-input
                v-model="form.title"
                placeholder="给你的旅行日记起个名字"
                maxlength="100"
                show-word-limit
              />
            </el-form-item>

            <el-form-item label="关联景点">
              <el-select
                v-model="form.spotId"
                filterable
                remote
                reserve-keyword
                clearable
                placeholder="搜索并选择景点（可选）"
                :remote-method="searchSpots"
                :loading="spotLoading"
                class="spot-select"
              >
                <el-option
                  v-for="spot in spotOptions"
                  :key="spot.id"
                  :label="spot.name"
                  :value="spot.id"
                >
                  <span>{{ spot.name }}</span>
                  <span class="spot-category">{{ spot.category }}</span>
                </el-option>
              </el-select>
            </el-form-item>

            <el-form-item label="目的地">
              <el-input
                v-model="form.destination"
                placeholder="目的地（可选）"
              />
            </el-form-item>

            <el-form-item label="内容" prop="content">
              <RichEditor ref="richEditorRef" v-model="form.contentHtml" :key="'editor-' + diaryId" />
            </el-form-item>

            <el-form-item label="封面图片">
              <div class="cover-upload-area">
                <div v-if="form.images[0]" class="cover-preview">
                  <el-image :src="form.images[0]" fit="cover" class="cover-thumb" />
                  <el-button class="cover-remove-btn" size="small" type="danger" circle @click="form.images = []">×</el-button>
                </div>
                <div v-else class="cover-upload-trigger" @click="coverInput?.click()">
                  <div class="cover-placeholder">
                    <span>+</span>
                    <span class="cover-label">上传封面</span>
                  </div>
                  <input ref="coverInput" type="file" accept="image/*" hidden @change="onCoverSelected" />
                </div>
              </div>
            </el-form-item>

            <!-- AI 工具 -->
            <el-form-item>
              <div class="ai-tools-section glass-sm">
                <div class="ai-tools-header">🤖 AI 工具</div>
                <div class="ai-tools-body">
                  <div class="ai-tool">
                    <div class="ai-tool-header">
                      <span>🎨 AI 生成图片</span>
                      <el-button size="small" type="primary" @click="genImage" :loading="aiImageLoading" :disabled="!aiImagePrompt.trim()">生成</el-button>
                    </div>
                    <el-input v-model="aiImagePrompt" placeholder="描述你想要生成的图片，如：夕阳下的海滩" />
                    <div v-if="aiImageResult" class="ai-preview">
                      <el-image :src="aiImageResult" fit="cover" class="ai-thumb" />
                      <div class="ai-preview-actions">
                        <el-button size="small" type="warning" @click="setAiImageAsCover">🖼 作为封面</el-button>
                        <el-button size="small" @click="insertAiImageIntoContent">📝 插入到内容中</el-button>
                      </div>
                    </div>
                  </div>
                  <div class="ai-tool">
                    <div class="ai-tool-header">
                      <span>🎵 AI 生成音乐</span>
                      <el-button size="small" type="primary" @click="genMusic" :loading="aiMusicLoading" :disabled="!aiMusicPrompt.trim()">生成</el-button>
                    </div>
                    <el-input v-model="aiMusicPrompt" placeholder="描述音乐风格，如：轻快的吉他曲" />
                    <div v-if="aiMusicResult" class="ai-preview">
                      <div class="music-player-card">
                        <div class="music-player-left">
                          <span class="music-eq">
                            <span class="eq-bar" style="animation-delay:0s"></span>
                            <span class="eq-bar" style="animation-delay:0.15s"></span>
                            <span class="eq-bar" style="animation-delay:0.3s"></span>
                            <span class="eq-bar" style="animation-delay:0.45s"></span>
                          </span>
                          <span class="music-label">AI 生成</span>
                        </div>
                        <div class="music-player-center">
                          <audio :src="aiMusicResult" controls class="music-audio-el" />
                        </div>
                        <div class="music-player-right">
                          <el-button size="small" type="success" round @click="addAiMusic">使用</el-button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="ai-tool">
                    <div class="ai-tool-header">
                      <span>🎬 AI 生成视频</span>
                      <el-button size="small" type="primary" @click="genVideo" :loading="aiVideoLoading" :disabled="!aiVideoPrompt.trim()">生成</el-button>
                    </div>
                    <el-input v-model="aiVideoPrompt" placeholder="描述视频场景" />
                    <div v-if="aiVideoTaskId" class="ai-preview">
                      <template v-if="aiVideoStatus === 'Processing' || aiVideoStatus === 'Queueing' || aiVideoStatus === 'Preparing'">
                        <div class="ai-video-pending">
                          <span>⏳ 视频生成中（{{ aiVideoStatus }}）...</span>
                          <el-button size="small" @click="checkVideoStatus">刷新状态</el-button>
                        </div>
                      </template>
                      <template v-else-if="aiVideoDownloadUrl">
                        <video :src="aiVideoDownloadUrl" controls class="video-player" />
                        <div class="ai-preview-actions">
                          <el-button size="small" @click="addAiVideo">添加到日记底部</el-button>
                          <el-button size="small" @click="insertAiVideoIntoContent">📝 插入到内容中</el-button>
                        </div>
                      </template>
                      <div v-else-if="aiVideoStatus === 'Fail'" class="ai-video-fail">
                        <span>❌ 视频生成失败</span>
                      </div>
                    </div>
                  </div>
                  <div class="ai-tool">
                    <div class="ai-tool-header">
                      <span>✍️ AI 生成游记文本</span>
                      <el-button size="small" type="primary" @click="openAiGenerateDialog">打开</el-button>
                    </div>
                  </div>
                </div>
              </div>
            </el-form-item>

            <el-form-item label="公开可见">
              <el-switch v-model="form.isPublic" active-text="公开" inactive-text="私密" />
            </el-form-item>

            <el-form-item>
              <el-button
                type="primary"
                size="large"
                :loading="saving"
                @click="handleSave"
                class="save-btn"
              >
                {{ isEditMode ? '保存' : '发布日记' }}
              </el-button>
              <el-button size="large" @click="router.back()">取消</el-button>
            </el-form-item>
          </el-form>
        </div>

        <!-- AI 生成游记文本弹窗（在编辑器主体外部，居中于页面） -->
        <el-dialog v-model="aiGenerateDialogVisible" class="ai-gen-dialog" title="✍️ AI 生成游记文本" width="620px" top="6vh" destroy-on-close>
          <div class="ai-gen-body">
            <div class="ai-gen-section">
              <div class="ai-gen-section-title">📋 选择已有行程</div>
              <el-select v-model="aiGenerateItineraryId" filterable remote clearable placeholder="搜索并选择行程…"
                :remote-method="searchItineraries" :loading="itineraryLoading" class="ai-gen-select" @change="onItinerarySelected">
                <el-option v-for="it in itineraryOptions" :key="it.id" :label="it.name" :value="it.id" />
              </el-select>

              <!-- 行程详情分页展示 -->
              <div v-if="selectedItineraryDays.length > 0" class="itinerary-days-preview">
                <div class="itinerary-days-header">
                  <span>📅 行程预览（{{ selectedItineraryDays.length }} 天）</span>
                </div>
                <el-pagination
                  v-if="selectedItineraryDays.length > 1"
                  v-model:current-page="itineraryPreviewPage"
                  :page-size="1"
                  :total="selectedItineraryDays.length"
                  layout="prev, pager, next"
                  small
                  class="itinerary-day-pager"
                  :pager-count="5"
                />
                <div class="itinerary-day-card" v-if="currentPreviewDay">
                  <div class="itinerary-day-title">Day {{ currentPreviewDay.dayIndex }} · {{ currentPreviewDay.date }}</div>
                  <div class="itinerary-day-slots">
                    <div v-for="(slot, si) in currentPreviewDay.slots" :key="slot.id" class="itinerary-slot-item">
                      <span class="slot-time-badge">{{ slot.startTime }}–{{ slot.endTime }}</span>
                      <span class="slot-type-icon">{{ slot.type === 'spot' ? '📍' : slot.type === 'food' ? '🍽️' : '📝' }}</span>
                      <span class="slot-name">{{ slot.name || slot.spotName || slot.foodName || slot.text }}</span>
                      <span v-if="slot.lat != null && slot.lng != null" class="slot-coord">{{ slot.lat.toFixed(4) }}, {{ slot.lng.toFixed(4) }}</span>
                    </div>
                    <div v-if="!currentPreviewDay.slots.length" class="itinerary-empty-slots">当天暂无活动</div>
                  </div>
                </div>
              </div>

              <div class="ai-gen-divider">— 或 —</div>
              <div class="ai-gen-section-title">✏️ 自定义提示词</div>
              <el-input v-model="aiGeneratePrompt" type="textarea" :rows="4" class="ai-gen-textarea"
                placeholder="描述你想写的游记内容，例如：&#10;描述一次在十三陵的旅行经历，感受历史文化……" />
            </div>
            <el-button type="primary" class="ai-gen-submit-btn" @click="generateDiaryText" :loading="aiGenerateLoading"
              :disabled="!aiGeneratePrompt.trim() && !aiGenerateItineraryId">✨ 生成游记</el-button>
          </div>
          <div v-if="aiGeneratedText" class="ai-gen-result-card">
            <div class="ai-gen-result-header">
              <span>📝 生成结果</span>
              <el-button size="small" text @click="aiGeneratedText = ''">重新生成</el-button>
            </div>
            <div class="ai-gen-result-text">{{ aiGeneratedText }}</div>
            <div class="ai-gen-result-actions">
              <el-button type="success" round @click="insertGeneratedText">📝 插入到内容</el-button>
              <el-button round @click="aiGenerateDialogVisible = false">关闭</el-button>
            </div>
          </div>
        </el-dialog>

        <!-- 右侧：预览面板 -->
        <div class="editor-preview-panel" v-show="isMobile ? previewMode : true">
          <div class="preview-card" v-if="hasContent">
            <!-- 封面图 -->
            <div class="preview-cover" v-if="form.images.length > 0">
              <el-image :src="form.images[0]" fit="cover" class="cover-img" />
              <div class="cover-overlay">
                <h3>{{ form.title || '未命名日记' }}</h3>
              </div>
            </div>
            <div class="preview-cover preview-cover--empty" v-else>
              <div class="cover-overlay">
                <h3>{{ form.title || '未命名日记' }}</h3>
              </div>
            </div>

            <!-- 元信息 -->
            <div class="preview-meta">
              <span v-if="form.destination" class="meta-item">
                <el-icon><Location /></el-icon>
                {{ form.destination }}
              </span>
              <span v-if="selectedSpotName" class="meta-item">
                <el-icon><Flag /></el-icon>
                {{ selectedSpotName }}
              </span>
              <el-tag :type="form.isPublic ? 'success' : 'info'" size="small">
                {{ form.isPublic ? '公开' : '私密' }}
              </el-tag>
            </div>

            <!-- 内容 -->
            <div class="preview-content" v-html="form.contentHtml || renderedContent" />

            <!-- 图片画廊 -->
            <div class="preview-gallery" v-if="form.images.length > 1">
              <el-image
                v-for="(img, idx) in form.images.slice(1)"
                :key="idx"
                :src="img"
                fit="cover"
                class="gallery-img"
                preview-teleported
                :preview-src-list="form.images"
                :initial-index="idx + 1"
              />
            </div>

            <div class="preview-media" v-if="form.videoUrl">
              <video :src="form.videoUrl" controls class="preview-video" />
            </div>
            <div class="preview-media" v-if="form.musicUrl">
              <audio :src="form.musicUrl" controls class="preview-audio" />
            </div>
          </div>

          <div class="preview-empty" v-else>
            <el-icon :size="48"><Document /></el-icon>
            <p>暂无内容预览</p>
            <p class="hint">填写标题和内容后，这里会实时展示日记效果</p>
          </div>
        </div>
      </div>
    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { Plus, Delete, Location, Flag, Document } from '@element-plus/icons-vue'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import RichEditor from '@/components/RichEditor.vue'
import { diaryApi } from '@/api/diaryApi'
import { spotApi } from '@/api/spotApi'
import { aiGenApi, fileApi } from '@/api/aiGenApi'
import { aiApi } from '@/api/aiApi'
import { itineraryApi } from '@/api/itineraryApi'
import type { SpotResponse, TimelineDay, TimeSlot, TimelinePlan } from '@/types/api'

const route = useRoute()
const router = useRouter()

// ── 模式判断 ──
const isEditMode = computed(() => !!route.params.id)
const diaryId = computed(() => route.params.id as string | undefined)

// ── 响应式 ──
const isMobile = ref(window.innerWidth < 768)
window.addEventListener('resize', () => {
  isMobile.value = window.innerWidth < 768
})

// ── 表单 ──
const formRef = ref<FormInstance>()
const saving = ref(false)
const loading = ref(false)

interface DiaryForm {
  title: string
  content: string
  contentHtml: string
  destination: string
  images: string[]
  videoUrl?: string
  videoMeta?: { url: string; duration?: number; thumbnail?: string }
  musicUrl?: string
  spotId: number | null
  isPublic: boolean
}

const form = ref<DiaryForm>({
  title: '',
  content: '',
  contentHtml: '',
  destination: '',
  images: [],
  spotId: null,
  isPublic: true,
})

const rules: FormRules = {
  title: [
    { required: true, message: '请输入日记标题', trigger: 'blur' },
    { min: 2, max: 100, message: '标题长度在 2 到 100 个字符', trigger: 'blur' },
  ],
  content: [
    { required: true, message: '请输入日记内容', trigger: 'blur' },
    { min: 10, message: '内容至少 10 个字符', trigger: 'blur' },
  ],
}

// ── 景点搜索 ──
const spotOptions = ref<SpotResponse[]>([])
const spotLoading = ref(false)
let searchTimer: ReturnType<typeof setTimeout> | null = null

const selectedSpotName = computed(() => {
  if (!form.value.spotId) return ''
  const spot = spotOptions.value.find((s) => s.id === form.value.spotId)
  return spot?.name ?? ''
})

async function searchSpots(query: string) {
  if (!query || query.length < 1) {
    spotOptions.value = []
    return
  }
  spotLoading.value = true
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(async () => {
    try {
      const res = await spotApi.search({ keyword: query, size: 20 })
      spotOptions.value = res.data.data.content ?? []
    } catch {
      spotOptions.value = []
    } finally {
      spotLoading.value = false
    }
  }, 300)
}

// ── 封面图片上传 ──
const coverInput = ref<HTMLInputElement>()
const uploadingCover = ref(false)

async function onCoverSelected(e: Event) {
  const input = e.target as HTMLInputElement
  if (!input.files?.length) return
  const file = input.files[0]
  if (file.size > 10 * 1024 * 1024) {
    ElMessage.warning('图片大小不能超过 10MB')
    return
  }
  uploadingCover.value = true
  try {
    const r = await fileApi.upload(file)
    if (r.data.data?.url) form.value.images = [r.data.data.url]
    ElMessage.success('封面上传成功')
  } catch { ElMessage.error('封面上传失败') }
  finally { uploadingCover.value = false; input.value = '' }
}


// ── RichEditor ref（用于插入内容） ──
const richEditorRef = ref<InstanceType<typeof RichEditor>>()

// ── AI Image generation ──
const aiImagePrompt = ref('')
const aiImageLoading = ref(false)
const aiImageResult = ref('')

async function genImage() {
  if (!aiImagePrompt.value.trim()) return
  aiImageLoading.value = true
  aiImageResult.value = ''
  try {
    const r = await aiGenApi.generateImage(aiImagePrompt.value)
    if (r.data.data?.imageUrl) aiImageResult.value = r.data.data.imageUrl
    else ElMessage.error(r.data.message || '图片生成失败')
  } catch { ElMessage.error('图片生成请求失败') }
  finally { aiImageLoading.value = false }
}

function setAiImageAsCover() {
  if (!aiImageResult.value) return
  // 把当前封面移到 images 数组后面，新图片做封面
  const existing = form.value.images.filter(u => u !== aiImageResult.value)
  form.value.images = [aiImageResult.value, ...existing]
  ElMessage.success('已设为封面')
}

function insertAiImageIntoContent() {
  if (!aiImageResult.value || !richEditorRef.value) return
  const html = `<img src="${aiImageResult.value}" alt="AI生成图片" style="max-width:100%;border-radius:8px;margin:8px 0;display:block" />`
  richEditorRef.value.insertHTML(html)
  ElMessage.success('已插入到内容中')
}

// ── AI Music generation ──
const aiMusicPrompt = ref('')
const aiMusicLoading = ref(false)
const aiMusicResult = ref('')

async function genMusic() {
  if (!aiMusicPrompt.value.trim()) return
  aiMusicLoading.value = true
  aiMusicResult.value = ''
  try {
    const r = await aiGenApi.generateMusic(aiMusicPrompt.value, '', true)
    if (r.data.data?.audioUrl) aiMusicResult.value = r.data.data.audioUrl
    else ElMessage.error(r.data.message || '音乐生成失败')
  } catch { ElMessage.error('音乐生成请求失败') }
  finally { aiMusicLoading.value = false }
}

function addAiMusic() {
  if (aiMusicResult.value) {
    form.value.musicUrl = aiMusicResult.value
    ElMessage.success('已添加到日记')
  }
}

// ── AI Video generation ──
const aiVideoPrompt = ref('')
const aiVideoLoading = ref(false)
const aiVideoTaskId = ref('')
const aiVideoStatus = ref('')
const aiVideoDownloadUrl = ref('')

async function genVideo() {
  if (!aiVideoPrompt.value.trim()) return
  aiVideoLoading.value = true
  aiVideoTaskId.value = ''
  aiVideoStatus.value = ''
  aiVideoDownloadUrl.value = ''
  try {
    const r = await aiGenApi.createVideo(aiVideoPrompt.value)
    if (r.data.data?.taskId) {
      aiVideoTaskId.value = r.data.data.taskId
      aiVideoStatus.value = 'Processing'
      ElMessage.success('视频任务已提交，点击刷新检查状态')
    } else ElMessage.error(r.data.message || '视频创建失败')
  } catch { ElMessage.error('请求失败') }
  finally { aiVideoLoading.value = false }
}

async function checkVideoStatus() {
  if (!aiVideoTaskId.value) return
  try {
    const r = await aiGenApi.queryVideo(aiVideoTaskId.value)
    const data = r.data.data
    aiVideoStatus.value = data.status || ''
    if (data.downloadUrl) aiVideoDownloadUrl.value = data.downloadUrl
    if (data.status === 'Success' && data.downloadUrl) {
      ElMessage.success('视频生成完成！')
    } else if (data.status === 'Fail') {
      ElMessage.error('视频生成失败')
    }
  } catch { ElMessage.error('查询失败') }
}

function addAiVideo() {
  if (aiVideoDownloadUrl.value) {
    form.value.videoUrl = aiVideoDownloadUrl.value
    form.value.videoMeta = { url: aiVideoDownloadUrl.value, thumbnail: '' }
    ElMessage.success('已添加到日记底部')
  }
}

function insertAiVideoIntoContent() {
  if (!aiVideoDownloadUrl.value || !richEditorRef.value) return
  const html = `<video src="${aiVideoDownloadUrl.value}" controls style="max-width:100%;max-height:400px;border-radius:8px;margin:8px 0;display:block" />`
  richEditorRef.value.insertHTML(html)
  ElMessage.success('已插入到内容中')
}

// ── AI 生成游记文本 ──
const aiGenerateDialogVisible = ref(false)
const aiGeneratePrompt = ref('')
const aiGenerateItineraryId = ref<number | null>(null)
const aiGenerateLoading = ref(false)
const aiGeneratedText = ref('')
const itineraryLoading = ref(false)
const itineraryOptions = ref<{ id: number; name: string }[]>([])

const selectedItineraryDays = ref<TimelineDay[]>([])
const itineraryPreviewPage = ref(1)
const currentPreviewDay = computed(() => {
  const idx = itineraryPreviewPage.value - 1
  return selectedItineraryDays.value[idx] || null
})

async function onItinerarySelected(id: number) {
  selectedItineraryDays.value = []
  itineraryPreviewPage.value = 1
  if (!id) return
  try {
    const res = await itineraryApi.get(id)
    const data = res.data.data
    if (data.routeData) {
      const parsed = JSON.parse(data.routeData) as TimelinePlan
      if (parsed.days) {
        selectedItineraryDays.value = parsed.days
      }
    }
  } catch {
    selectedItineraryDays.value = []
  }
}

function openAiGenerateDialog() {
  aiGenerateDialogVisible.value = true
  aiGeneratePrompt.value = ''
  aiGenerateItineraryId.value = null
  aiGeneratedText.value = ''
  selectedItineraryDays.value = []
  itineraryPreviewPage.value = 1
}

async function searchItineraries(query: string) {
  if (!query || query.length < 1) { itineraryOptions.value = []; return }
  itineraryLoading.value = true
  try {
    const res = await itineraryApi.list({ keyword: query, size: 20 })
    itineraryOptions.value = (res.data.data.content || []).map((it: any) => ({ id: it.id, name: it.name }))
  } catch { itineraryOptions.value = [] }
  finally { itineraryLoading.value = false }
}

async function generateDiaryText() {
  if (!aiGeneratePrompt.value.trim() && !aiGenerateItineraryId.value) {
    ElMessage.warning('请填写提示词或选择行程')
    return
  }
  aiGenerateLoading.value = true
  aiGeneratedText.value = ''
  try {
    const res = await aiApi.generateDiary({
      prompt: aiGeneratePrompt.value,
      itineraryId: aiGenerateItineraryId.value || undefined,
    })
    aiGeneratedText.value = res.data.data.text
  } catch {
    ElMessage.error('生成失败，请检查AI配置')
  } finally { aiGenerateLoading.value = false }
}

function insertGeneratedText() {
  if (!aiGeneratedText.value || !richEditorRef.value) return
  const html = aiGeneratedText.value.replace(/\n/g, '<br>')
  richEditorRef.value.insertHTML(`<p>${html}</p>`)
  ElMessage.success('已插入到内容中')
  aiGenerateDialogVisible.value = false
}

// ── Preview ──
const previewMode = ref(false)

const hasContent = computed(
  () => form.value.title.trim() || form.value.contentHtml.trim() || form.value.images.length > 0
)

const renderedContent = computed(() => {
  let text = form.value.content || ''
  // 基础 Markdown 渲染：粗体、斜体、换行
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  text = text.replace(/\*(.+?)\*/g, '<em>$1</em>')
  text = text.replace(/\n\n/g, '</p><p>')
  text = text.replace(/\n/g, '<br>')
  return `<p>${text}</p>`
})

// ── 加载已有日记（编辑模式） ──
async function loadDiary() {
  if (!isEditMode.value || !diaryId.value) return
  loading.value = true
  try {
    const res = await diaryApi.get(diaryId.value)
    const d = res.data.data
    form.value.title = d.title ?? ''
    form.value.content = d.content ?? ''
    form.value.contentHtml = d.contentHtml || ''
    form.value.destination = d.destination ?? ''
    form.value.images = d.images ?? []
    form.value.spotId = d.spotId ?? null
    form.value.isPublic = d.isPublic ?? true
    // 预加载关联景点名称到下拉选项
    if (form.value.spotId) {
      try {
        const spotRes = await spotApi.getDetail(form.value.spotId)
        spotOptions.value = [spotRes.data.data]
      } catch { /* 景点详情加载失败不影响编辑 */ }
    }
  } catch {
    ElMessage.error('日记加载失败')
    router.push('/diaries')
  } finally {
    loading.value = false
  }
}

// ── 保存 ──
async function handleSave() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  saving.value = true
  try {
    const payload: any = {
      title: form.value.title,
      content: form.value.content || '',
      contentHtml: form.value.contentHtml || undefined,
      destination: form.value.destination,
      images: form.value.images,
      spotId: form.value.spotId,
      isPublic: form.value.isPublic,
      musicUrl: form.value.musicUrl || undefined,
    }
    if (form.value.videoMeta) payload.videoMeta = form.value.videoMeta

    if (isEditMode.value && diaryId.value) {
      await diaryApi.update(diaryId.value, payload)
      ElMessage.success('日记更新成功')
    } else {
      await diaryApi.create(payload)
      ElMessage.success('日记发布成功')
    }
    // Clear form so unsaved-changes guard doesn't fire
    form.value = { title: '', content: '', contentHtml: '', destination: '', images: [], spotId: null, isPublic: true }
    router.push('/diaries')
  } catch {
    ElMessage.error('保存失败，请稍后再试')
  } finally {
    saving.value = false
  }
}

// ── 未保存更改提示 ──
const hasUnsavedChanges = computed(() => {
  return !!form.value.title || !!form.value.contentHtml || form.value.images.length > 0
})

onBeforeRouteLeave((_to, _from, next) => {
  if (hasUnsavedChanges.value) {
    const answer = window.confirm('有未保存的更改，确定要离开吗？')
    if (!answer) { next(false); return }
  }
  next()
})

window.addEventListener('beforeunload', (e: BeforeUnloadEvent) => {
  if (hasUnsavedChanges.value) {
    e.preventDefault()
    e.returnValue = ''
  }
})

onBeforeUnmount(() => {
  // Remove the beforeunload listener if we navigate away cleanly
})

// Auto-extract plain text from contentHtml for backward compat
watch(() => form.value.contentHtml, (html) => {
  if (html) {
    const div = document.createElement('div')
    div.innerHTML = html
    form.value.content = div.textContent || div.innerText || ''
  }
})
onMounted(() => {
  loadDiary()
})
// 同组件路由切换（编辑A → 编辑B）时重新加载
watch(() => route.params.id, () => {
  if (route.params.id) {
    form.value = { title: '', content: '', contentHtml: '', destination: '', images: [], spotId: null, isPublic: true }
    spotOptions.value = []
    loadDiary()
  }
})
</script>

<style scoped>
/* ── 容器 ── */
.diary-editor {
  max-width: 1400px;
  margin: 0 auto;
}

/* ── 头部 ── */
.editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 12px;
}
.editor-header h2 {
  margin: 0;
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--text-heading);
  letter-spacing: 1px;
}
.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}
.mode-label {
  font-size: 13px;
  color: var(--text-muted);
}

/* ── 双栏布局 ── */
.editor-body {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  align-items: start;
}
.editor-body.stacked {
  grid-template-columns: 1fr;
}

/* ── 表单面板 ── */
.editor-form-panel {
  background: var(--frosted-bg);
  backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--frosted-border);
  border-radius: var(--radius-card);
  padding: 28px;
  box-shadow: var(--neu-shadow);
}

/* ── 图片上传 ── */
.image-upload-area {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.image-thumb {
  position: relative;
  width: 100px;
  height: 100px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--frosted-border);
  transition: border-color 0.2s;
}
.image-thumb.is-cover {
  width: 120px;
  height: 120px;
  border-color: var(--pop-blue);
}
.thumb-img {
  width: 100%;
  height: 100%;
}
.cover-badge {
  position: absolute;
  top: 4px;
  left: 4px;
  background: rgba(167,111,215,0.2);
  color: var(--pop-yellow);
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  z-index: 2;
  font-weight: 600;
}
.remove-btn {
  position: absolute;
  top: -6px;
  right: -6px;
  z-index: 2;
  width: 22px;
  height: 22px;
}

.upload-trigger {
  display: flex;
}
.upload-placeholder {
  width: 100px;
  height: 100px;
  border: 1px dashed var(--frosted-border);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: var(--text-muted);
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s;
  font-size: 12px;
}
.upload-placeholder:hover {
  border-color: var(--pop-blue);
  color: var(--pop-blue);
}

/* ── 保存按钮 ── */
.save-btn {
  min-width: 120px;
}

/* ── 景点选择 ── */
.spot-select {
  width: 100%;
}
.spot-category {
  float: right;
  color: var(--text-muted);
  font-size: 12px;
}

/* ── 预览面板 ── */
.editor-preview-panel {
  position: sticky;
  top: 20px;
}

.preview-card {
  background: var(--frosted-bg);
  backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--frosted-border);
  border-radius: var(--radius-card);
  overflow: hidden;
  box-shadow: var(--neu-shadow);
}
.preview-cover {
  position: relative;
  width: 100%;
  height: 220px;
  overflow: hidden;
}
.preview-cover--empty {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
.cover-img {
  width: 100%;
  height: 100%;
}
.cover-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24px 20px;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.6));
  color: #fff;
}
.cover-overlay h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.preview-meta {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 20px;
  border-bottom: 1px solid var(--frosted-border);
  flex-wrap: wrap;
  font-size: 13px;
  color: var(--text-body);
}
.meta-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.preview-content {
  padding: 20px;
  font-size: 15px;
  line-height: 1.8;
  color: var(--text-body);
  overflow-wrap: break-word;
  word-break: break-word;
}
.preview-content :deep(p) {
  margin: 0 0 1em;
}
.preview-content :deep(p:last-child) {
  margin-bottom: 0;
}
.preview-content :deep(img) {
  max-width: 100%;
  border-radius: 8px;
  margin: 12px 0;
  display: block;
}
.preview-content :deep(video) {
  max-width: 100%;
  max-height: 400px;
  border-radius: 8px;
  margin: 12px 0;
  display: block;
}

.preview-gallery {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  padding: 0 20px 20px;
}
.gallery-img {
  aspect-ratio: 1;
  border-radius: 6px;
  overflow: hidden;
}

/* ── AI tools section ── */
.ai-tools-section {
  border: 1px solid var(--frosted-border);
  border-radius: var(--radius-card);
  background: var(--frosted-bg);
  backdrop-filter: blur(10px);
  width: 100%;
  overflow: hidden;
  box-shadow: var(--neu-shadow-sm);
}
.ai-tools-header {
  padding: 10px 16px;
  font-weight: 700;
  font-size: 14px;
  background: rgba(167,111,215,0.15);
  border-bottom: 1px solid var(--frosted-border);
  color: var(--pop-yellow);
  letter-spacing: 1px;
  cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='12' fill='none' stroke='rgba(124,215,238,0.9)' stroke-width='2'/%3E%3Cline x1='11' y1='16' x2='21' y2='16' stroke='rgba(124,215,238,1)' stroke-width='2.5' stroke-linecap='round'/%3E%3Cline x1='16' y1='11' x2='16' y2='21' stroke='rgba(124,215,238,1)' stroke-width='2.5' stroke-linecap='round'/%3E%3C/svg%3E") 16 16, pointer;
}
.ai-tools-body { padding: 16px; display: flex; flex-direction: column; gap: 20px; }
.ai-tool {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: rgba(0,0,0,0.15);
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.04);
}
.ai-tool-header { display: flex; justify-content: space-between; align-items: center; }
.ai-tool-header span { font-weight: 700; font-size: 13px; color: var(--text-heading); }
.ai-tool .el-button, .ai-tool .el-input, .music-player-card .el-button {
  cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='12' fill='none' stroke='rgba(124,215,238,0.9)' stroke-width='2'/%3E%3Cline x1='11' y1='16' x2='21' y2='16' stroke='rgba(124,215,238,1)' stroke-width='2.5' stroke-linecap='round'/%3E%3Cline x1='16' y1='11' x2='16' y2='21' stroke='rgba(124,215,238,1)' stroke-width='2.5' stroke-linecap='round'/%3E%3C/svg%3E") 16 16, pointer !important;
}
.ai-preview { margin-top: 8px; }
.ai-thumb {
  width: 80px; height: 80px; object-fit: cover;
  border: 1px solid var(--frosted-border);
  border-radius: 10px;
  box-shadow: var(--neu-shadow-sm);
  transition: transform 0.2s;
}
.ai-thumb:hover { transform: scale(1.05); }
.ai-video-pending, .ai-video-fail {
  padding: 10px 12px; display: flex; align-items: center; gap: 10px;
  font-size: 13px; color: var(--text-body);
  background: rgba(0,0,0,0.15); border-radius: 8px;
}

/* ── Music player card ── */
.music-player-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: linear-gradient(135deg, rgba(58,210,159,0.08) 0%, rgba(124,215,238,0.08) 100%);
  border: 1px solid rgba(58,210,159,0.2);
  border-radius: 12px;
  box-shadow: var(--neu-inset-sm), var(--neu-shadow-sm);
  width: 100%;
}
.music-player-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.music-eq {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 20px;
}
.eq-bar {
  display: block;
  width: 3px;
  background: var(--pop-green);
  border-radius: 2px;
  animation: eqPulse 0.8s ease-in-out infinite alternate;
}
.eq-bar:nth-child(1) { height: 10px; }
.eq-bar:nth-child(2) { height: 16px; }
.eq-bar:nth-child(3) { height: 12px; }
.eq-bar:nth-child(4) { height: 18px; }
@keyframes eqPulse {
  0% { opacity: 0.4; transform: scaleY(0.6); }
  100% { opacity: 1; transform: scaleY(1); }
}
.music-label { font-size: 11px; color: var(--pop-green); font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; }
.music-player-center { flex: 1; min-width: 0; }
.music-audio-el {
  width: 100%; height: 32px;
  border-radius: 6px;
  filter: hue-rotate(140deg) saturate(0.8);
}
.music-player-right { flex-shrink: 0; }

/* ── Video upload ── */
.video-preview { display: flex; flex-direction: column; gap: 6px; width: 100%; }
.video-player {
  max-width: 100%; max-height: 300px;
  border: 1px solid var(--frosted-border);
  border-radius: 10px;
  box-shadow: var(--neu-shadow-sm);
}
.video-remove-btn { align-self: flex-start; }
.upload-trigger--wide .upload-placeholder { width: 100%; min-width: 200px; }
.upload-trigger--wide.is-uploading { opacity: 0.6; pointer-events: none; }
.uploading-text { color: var(--pop-blue); font-weight: 600; }

/* ── AI preview action buttons ── */
.ai-preview-actions { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 6px; width: 100%; }
.ai-preview-actions .el-button {
  cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='12' fill='none' stroke='rgba(124,215,238,0.9)' stroke-width='2'/%3E%3Cline x1='11' y1='16' x2='21' y2='16' stroke='rgba(124,215,238,1)' stroke-width='2.5' stroke-linecap='round'/%3E%3Cline x1='16' y1='11' x2='16' y2='21' stroke='rgba(124,215,238,1)' stroke-width='2.5' stroke-linecap='round'/%3E%3C/svg%3E") 16 16, pointer !important;
}

/* ── AI Generate diary text dialog ── */
.ai-gen-dialog :deep(.el-dialog) {
  background: rgba(35,34,34,0.92) !important;
  backdrop-filter: blur(20px) !important;
  border: 1px solid var(--frosted-border);
  border-radius: var(--radius-dialog) !important;
  box-shadow: var(--neu-shadow);
}
.ai-gen-dialog :deep(.el-dialog__title) {
  color: var(--pop-yellow);
  font-weight: 700;
  letter-spacing: 1px;
}
.ai-gen-dialog :deep(.el-dialog__headerbtn) {
  cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='12' fill='none' stroke='rgba(124,215,238,0.9)' stroke-width='2'/%3E%3Cline x1='11' y1='16' x2='21' y2='16' stroke='rgba(124,215,238,1)' stroke-width='2.5' stroke-linecap='round'/%3E%3Cline x1='16' y1='11' x2='16' y2='21' stroke='rgba(124,215,238,1)' stroke-width='2.5' stroke-linecap='round'/%3E%3C/svg%3E") 16 16, pointer !important;
}
.ai-gen-body { padding: 4px 0; }
.ai-gen-section { margin-bottom: 16px; }
.ai-gen-section-title {
  font-size: 13px; font-weight: 600; color: var(--text-secondary);
  margin-bottom: 8px; letter-spacing: 0.5px;
}
.ai-gen-select { width: 100%; }
.ai-gen-divider {
  text-align: center; font-size: 12px; color: var(--text-muted);
  margin: 14px 0; letter-spacing: 2px;
  position: relative;
}
.ai-gen-divider::before,
.ai-gen-divider::after {
  content: ''; position: absolute; top: 50%;
  width: 35%; height: 1px; background: var(--frosted-border);
}
.ai-gen-divider::before { left: 0; }
.ai-gen-divider::after { right: 0; }
.ai-gen-textarea :deep(textarea) {
  background: rgba(0,0,0,0.2) !important;
  border: 1px solid var(--frosted-border) !important;
  border-radius: 10px !important;
  color: var(--text-regular) !important;
  font-size: 13px !important;
  line-height: 1.6 !important;
  resize: vertical !important;
}
.ai-gen-submit-btn {
  width: 100%;
  font-weight: 700 !important;
  letter-spacing: 1px;
  height: 42px !important;
  border-radius: var(--radius-pill) !important;
  box-shadow: var(--neu-shadow-sm);
}
.ai-gen-result-card {
  margin-top: 20px;
  padding: 16px;
  background: rgba(0,0,0,0.2);
  border: 1px solid rgba(58,210,159,0.2);
  border-radius: 14px;
  box-shadow: var(--neu-inset-sm);
}
.ai-gen-result-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 10px;
}
.ai-gen-result-header span { font-size: 14px; font-weight: 700; color: var(--pop-green); }
.ai-gen-result-text {
  font-size: 14px; line-height: 1.8; color: var(--text-regular);
  white-space: pre-wrap; max-height: 280px; overflow-y: auto;
  padding: 12px;
  background: rgba(0,0,0,0.15);
  border-radius: 10px;
  border: 1px solid var(--frosted-border);
}
.ai-gen-result-actions { display: flex; gap: 8px; margin-top: 12px; justify-content: flex-end; }

/* ── Itinerary days preview inside AI gen dialog ── */
.itinerary-days-preview {
  margin-top: 12px;
  padding: 12px;
  background: rgba(0,0,0,0.15);
  border: 1px solid rgba(58,210,159,0.15);
  border-radius: 12px;
}
.itinerary-days-header {
  font-size: 13px; font-weight: 600; color: var(--pop-green);
  margin-bottom: 8px;
}
.itinerary-day-pager {
  margin-bottom: 10px;
  justify-content: center;
}
.itinerary-day-pager :deep(.el-pager li) {
  cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='12' fill='none' stroke='rgba(124,215,238,0.9)' stroke-width='2'/%3E%3Cline x1='11' y1='16' x2='21' y2='16' stroke='rgba(124,215,238,1)' stroke-width='2.5' stroke-linecap='round'/%3E%3Cline x1='16' y1='11' x2='16' y2='21' stroke='rgba(124,215,238,1)' stroke-width='2.5' stroke-linecap='round'/%3E%3C/svg%3E") 16 16, pointer !important;
}
.itinerary-day-card {
  background: rgba(0,0,0,0.15);
  border-radius: 10px;
  padding: 10px;
}
.itinerary-day-title {
  font-size: 13px; font-weight: 700; color: var(--text-primary);
  margin-bottom: 8px; padding-bottom: 6px;
  border-bottom: 1px solid var(--frosted-border);
}
.itinerary-day-slots { display: flex; flex-direction: column; gap: 4px; }
.itinerary-slot-item {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 8px;
  background: rgba(255,255,255,0.03);
  border-radius: 6px;
  font-size: 12px;
}
.itinerary-slot-item:hover { background: rgba(255,255,255,0.06); }
.slot-time-badge {
  font-size: 11px; color: var(--pop-green); font-weight: 600;
  white-space: nowrap; flex-shrink: 0;
}
.slot-type-icon { flex-shrink: 0; font-size: 13px; }
.slot-name {
  flex: 1; color: var(--text-regular); overflow: hidden;
  text-overflow: ellipsis; white-space: nowrap;
}
.slot-coord { font-size: 10px; color: var(--text-muted); flex-shrink: 0; }
.itinerary-empty-slots { text-align: center; padding: 16px; color: var(--text-muted); font-size: 12px; }

/* 空预览 */
.preview-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 40px;
  background: var(--frosted-bg);
  backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--frosted-border);
  border-radius: var(--radius-card);
  box-shadow: var(--neu-shadow);
  color: var(--text-muted);
}
.preview-empty p {
  margin: 8px 0 0;
  font-size: 14px;
}
.preview-empty .hint {
  font-size: 12px;
  color: var(--text-muted);
}

/* ── 响应式 ── */
@media (max-width: 767px) {
  .editor-body {
    grid-template-columns: 1fr;
  }
  .editor-form-panel {
    padding: 16px;
  }
  .editor-preview-panel {
    position: static;
  }
  .preview-cover {
    height: 180px;
  }
  .preview-gallery {
    grid-template-columns: repeat(2, 1fr);
  }
  .image-thumb.is-cover {
    width: 100px;
    height: 100px;
  }
}
</style>
