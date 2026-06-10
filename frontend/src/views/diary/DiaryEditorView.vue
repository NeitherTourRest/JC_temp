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
              <el-input
                v-model="form.content"
                type="textarea"
                :rows="10"
                placeholder="记录你的旅行故事…"
                maxlength="5000"
                show-word-limit
              />
            </el-form-item>

            <el-form-item label="图片">
              <div class="image-upload-area">
                <div v-for="(img, idx) in form.images" :key="idx" class="image-thumb" :class="{ 'is-cover': idx === 0 }">
                  <el-image :src="img" fit="cover" class="thumb-img" preview-teleported :preview-src-list="form.images" :initial-index="idx" />
                  <span v-if="idx === 0" class="cover-badge">封面</span>
                  <el-button class="remove-btn" circle size="small" type="danger" :icon="Delete" @click="removeImage(idx)" />
                </div>
                  <div v-if="form.images.length < 9" class="upload-trigger" @click="imageInput?.click()">
                  <div class="upload-placeholder">
                    <el-icon :size="28"><Plus /></el-icon>
                    <span>上传图片</span>
                  </div>
                  <input ref="imageInput" type="file" accept="image/*" hidden @change="onImageFileChange" />
                </div>
              </div>
            </el-form-item>

            <el-form-item label="视频">
              <div v-if="form.videoUrl" class="video-preview">
                <video :src="form.videoUrl" controls class="video-player" />
                <el-button class="video-remove-btn" size="small" type="danger" :icon="Delete" @click="form.videoUrl = ''; form.videoMeta = undefined">删除视频</el-button>
              </div>
              <div v-else class="upload-trigger upload-trigger--wide" :class="{ 'is-uploading': uploadingVideo }" @click="videoInput?.click()">
                <div class="upload-placeholder">
                  <el-icon :size="28" v-if="!uploadingVideo"><VideoCamera /></el-icon>
                  <span v-if="!uploadingVideo">上传视频（可选）</span>
                  <span v-else class="uploading-text">⏳ 上传中...</span>
                </div>
                <input ref="videoInput" type="file" accept="video/*" hidden @change="onVideoFileChange" />
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
                      <el-button size="small" @click="addAiImage">添加到日记图片</el-button>
                    </div>
                  </div>
                  <div class="ai-tool">
                    <div class="ai-tool-header">
                      <span>🎵 AI 生成音乐</span>
                      <el-button size="small" type="primary" @click="genMusic" :loading="aiMusicLoading" :disabled="!aiMusicPrompt.trim()">生成</el-button>
                    </div>
                    <el-input v-model="aiMusicPrompt" placeholder="描述音乐风格，如：轻快的吉他曲" />
                    <div v-if="aiMusicResult" class="ai-preview">
                      <audio :src="aiMusicResult" controls class="audio-player" />
                      <el-button size="small" @click="addAiMusic">使用此音乐</el-button>
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
                        <el-button size="small" @click="addAiVideo">使用此视频</el-button>
                      </template>
                      <div v-else-if="aiVideoStatus === 'Fail'" class="ai-video-fail">
                        <span>❌ 视频生成失败</span>
                      </div>
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
            <div class="preview-content" v-html="renderedContent" />

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
import { Plus, Delete, Location, Flag, Document, VideoCamera } from '@element-plus/icons-vue'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import { diaryApi } from '@/api/diaryApi'
import { spotApi } from '@/api/spotApi'
import { aiGenApi, fileApi } from '@/api/aiGenApi'
import type { SpotResponse } from '@/types/api'

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

// ── 图片处理 ──
const imageInput = ref<HTMLInputElement>()
const uploadingImage = ref(false)

async function onImageFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  if (!input.files?.length) return
  const file = input.files[0]
  if (file.size > 10 * 1024 * 1024) {
    ElMessage.warning('图片大小不能超过 10MB')
    return
  }
  uploadingImage.value = true
  try {
    const r = await fileApi.upload(file)
    if (r.data.data?.url) form.value.images.push(r.data.data.url)
    ElMessage.success('图片上传成功')
  } catch { ElMessage.error('图片上传失败') }
  finally { uploadingImage.value = false; input.value = '' }
}

function removeImage(idx: number) {
  form.value.images.splice(idx, 1)
}

// ── Video upload ──
const videoInput = ref<HTMLInputElement>()
const uploadingVideo = ref(false)

async function onVideoFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  if (!input.files?.length) return
  const file = input.files[0]
  if (file.size > 200 * 1024 * 1024) {
    ElMessage.warning('视频大小不能超过 200MB')
    input.value = ''
    return
  }
  uploadingVideo.value = true
  try {
    const r = await fileApi.upload(file)
    if (r.data.data?.url) {
      form.value.videoUrl = r.data.data.url
      form.value.videoMeta = { url: r.data.data.url, thumbnail: '' }
      ElMessage.success('视频上传成功')
    } else {
      ElMessage.error('上传返回数据异常')
    }
  } catch (e: any) {
    const msg = e?.response?.status === 413 ? '视频文件过大，请压缩后上传' : '视频上传失败'
    ElMessage.error(msg)
  }
  finally { uploadingVideo.value = false; input.value = '' }
}


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
    else ElMessage.error('生成失败')
  } catch { ElMessage.error('生成请求失败') }
  finally { aiImageLoading.value = false }
}

function addAiImage() {
  if (aiImageResult.value && !form.value.images.includes(aiImageResult.value)) {
    form.value.images.push(aiImageResult.value)
    ElMessage.success('已添加到日记')
  }
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
    else ElMessage.error('生成失败')
  } catch { ElMessage.error('生成请求失败') }
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
    } else ElMessage.error('创建失败')
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
    ElMessage.success('已添加到日记')
  }
}

// ── Preview ──
const previewMode = ref(false)

const hasContent = computed(
  () => form.value.title.trim() || form.value.content.trim() || form.value.images.length > 0
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
      content: form.value.content,
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
    router.push('/diaries')
  } catch {
    ElMessage.error('保存失败，请稍后再试')
  } finally {
    saving.value = false
  }
}

// ── 未保存更改提示 ──
const hasUnsavedChanges = computed(() => {
  return !!form.value.title || !!form.value.content || form.value.images.length > 0
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

// ── 生命周期 ──
onMounted(() => {
  loadDiary()
})
// 同组件路由切换（编辑A → 编辑B）时重新加载
watch(() => route.params.id, () => {
  if (route.params.id) {
    form.value = { title: '', content: '', destination: '', images: [], spotId: null, isPublic: true }
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
  backdrop-filter: blur(8px);
  width: 100%;
  overflow: hidden;
}
.ai-tools-header {
  padding: 10px 14px;
  font-family: inherit;
  font-weight: 700;
  font-size: 14px;
  background: rgba(167,111,215,0.15);
  border-bottom: 1px solid var(--frosted-border);
  color: var(--pop-yellow);
  letter-spacing: 1px;
}
.ai-tools-body { padding: 14px; display: flex; flex-direction: column; gap: 16px; }
.ai-tool { display: flex; flex-direction: column; gap: 6px; }
.ai-tool-header { display: flex; justify-content: space-between; align-items: center; }
.ai-tool-header span { font-weight: 700; font-size: 13px; color: var(--text-heading); }
.ai-preview { display: flex; align-items: center; gap: 8px; margin-top: 6px; flex-wrap: wrap; }
.ai-thumb { width: 80px; height: 80px; object-fit: cover; border: 1px solid var(--frosted-border); border-radius: 6px; }
.ai-video-pending, .ai-video-fail { padding: 8px; display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text-body); }

/* ── Video upload ── */
.video-preview { display: flex; flex-direction: column; gap: 6px; width: 100%; }
.video-player { max-width: 100%; max-height: 300px; border: 1px solid var(--frosted-border); border-radius: 8px; }
.video-remove-btn { align-self: flex-start; }
.upload-trigger--wide .upload-placeholder { width: 100%; min-width: 200px; }
.upload-trigger--wide.is-uploading { opacity: 0.6; pointer-events: none; }
.uploading-text { color: var(--pop-blue); font-weight: 600; }

/* ── Audio player ── */
.audio-player { width: 100%; max-width: 300px; }

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
