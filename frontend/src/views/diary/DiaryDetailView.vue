<template>
  <DefaultLayout>
    <div class="detail-page">
      <!-- Full-page background image -->
      <div v-if="diary?.images?.[0]" class="detail-bg" :style="{ backgroundImage: `url(${diary.images[0]})` }" />
      <div class="detail-bg-overlay" />

      <div v-if="loading" class="center">Loading...</div>
      <div v-else-if="!diary" class="center">Diary not found</div>
      <div v-else class="detail-content">
        <button class="back-btn" @click="$router.push('/diaries')">← 返回</button>
        <div class="hero glass">
          <h1>{{ diary.title }}</h1>
          <div class="hero-meta">
            <span>#{{ diary.userId }}</span>
            <span>⭐ {{ diary.avgRating?.toFixed(1) || '—' }}</span>
            <span>👁 {{ diary.popularity }}</span>
            <span>{{ diary.createdAt?.substring(0,10) }}</span>
          </div>
          <el-tag v-if="diary.destination" size="small" type="warning" style="margin-top: 8px;">{{ diary.destination }}</el-tag>
        </div>
        <div class="actions" v-if="isOwner">
          <el-button type="primary" @click="$router.push('/diaries/' + diary.id + '/edit')">编辑</el-button>
          <el-button type="danger" @click="del">删除</el-button>
        </div>

        <!-- Rich HTML content (with inline images/videos) -->
        <div class="glass" style="padding:24px">
          <div class="diary-content" v-html="renderedHtml"></div>
        </div>

        <!-- Legacy media (fallback for old diaries without contentHtml) -->
        <template v-if="!diary.contentHtml">
          <div v-if="diary.images?.length" class="gallery glass">
            <img v-for="(img,i) in diary.images" :key="i" :src="img" @click="previewIdx=i;showPreview=true" />
          </div>
          <div v-if="diary.videoMeta?.url" class="glass" style="padding:20px">
            <video :src="diary.videoMeta.url" controls class="detail-video" />
          </div>
        </template>

        <div v-if="diary.musicUrl" class="glass music-player-section"><MusicPlayer :src="diary.musicUrl" /></div>
        <div class="glass rating-card">
          <h3>给这篇游记评分</h3>
          <div class="rate-row">
            <el-rate v-model="rating" :max="5" @change="rate" size="large" show-score score-template="{value} / 5" :disabled="rateLoading" />
            <span v-if="rated" class="rated-badge">✓ 你的评分 {{ rating }}/5</span>
            <span v-else class="rate-hint">点击星标评分</span>
          </div>
        </div>
        <el-image-viewer v-if="showPreview" :url-list="diary.images || []" :initial-index="previewIdx" @close="showPreview=false" />
      </div>
    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElImageViewer, ElMessageBox } from 'element-plus'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import MusicPlayer from '@/components/MusicPlayer.vue'
import { diaryApi } from '@/api/diaryApi'
import { useAuthStore } from '@/stores/authStore'
import type { DiaryResponse } from '@/types/api'

const route = useRoute(); const router = useRouter()
const authStore = useAuthStore()
const diary = ref<DiaryResponse | null>(null)
const loading = ref(true)
const rating = ref(0)
const rated = ref(false)
const rateLoading = ref(false)
const previewIdx = ref(0)
const showPreview = ref(false)

const isOwner = computed(() => diary.value?.userId != null && diary.value.userId === authStore.user?.id)
const renderedHtml = computed(() => {
  // If rich HTML content exists, use it directly
  if (diary.value?.contentHtml) return diary.value.contentHtml
  // Fallback: convert legacy markdown-style content to HTML
  let t = diary.value?.content || ''
  t = t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  t = t.replace(/\n/g, '<br>')
  return t
})

async function del() {
  if (!diary.value) return
  try { await ElMessageBox.confirm('确定删除这篇游记？', '确认', { type: 'warning' }); await diaryApi.del(diary.value.id); ElMessage.success('游记已删除'); router.push('/diaries') } catch (e: any) { if (e !== 'cancel') console.error('删除游记失败:', e) }
}
async function rate(v: number) {
  if (v < 1 || !diary.value) return
  rateLoading.value = true
  try {
    const res = await diaryApi.rate(diary.value.id, v)
    if (res.data.data) {
      const d = res.data.data
      diary.value!.avgRating = d.avgRating
      diary.value!.ratingCount = d.ratingCount
      rated.value = true
      localStorage.setItem('diaryRating_' + diary.value.id, String(v))
      ElMessage.success('评分已提交！')
    }
  } catch (e: any) {
    console.error('Rate error:', e)
    ElMessage.error('评分失败')
  } finally { rateLoading.value = false }
}

onMounted(async () => {
  try {
    const r = await diaryApi.get(route.params.id as string)
    diary.value = r.data.data
    // Restore user's previous rating from localStorage
    const saved = localStorage.getItem('diaryRating_' + route.params.id)
    if (saved) {
      rating.value = Number(saved)
      rated.value = true
    }
  } catch (e) { console.error('Load diary error:', e) } finally { loading.value = false }
})
</script>

<style scoped>
.detail-page { max-width: 800px; margin: 0 auto; padding: 20px 0; position: relative; }

/* ── Full-page background ── */
.detail-bg {
  position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
  background-size: cover; background-position: center;
  filter: blur(20px) brightness(0.5);
  transform: scale(1.1);
  z-index: 0;
  pointer-events: none;
}
.detail-bg-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.35);
  z-index: 0;
  pointer-events: none;
}
.detail-content {
  position: relative; z-index: 1;
}

.center { text-align: center; padding: 80px; color: var(--text-muted); }
.back-btn { background: none; border: none; font-family: inherit; font-size: 14px; cursor: pointer; color: var(--text-regular); margin-bottom: 16px; transition: color 0.2s; }
.back-btn:hover { color: var(--pop-pink); }
.hero {
  padding: 24px; margin-bottom: 16px;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}
.hero h1 { font-family: inherit; font-size: 1.8rem; margin: 0 0 8px; color: var(--text-primary); }
.hero-meta { display: flex; gap: 14px; font-size: 13px; color: var(--text-secondary); flex-wrap: wrap; }
.actions { display: flex; gap: 8px; margin-bottom: 16px; }
.gallery { padding: 12px; display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
.gallery img { width: 100px; height: 100px; object-fit: cover; border-radius: 8px; cursor: pointer; border: 1px solid var(--frosted-border); transition: opacity 0.2s; }
.gallery img:hover { opacity: 0.8; }

.diary-content { font-size: 15px; line-height: 1.8; overflow-wrap: break-word; }
.diary-content :deep(img) {
  max-width: 100%; border-radius: 8px; margin: 12px 0; display: block;
}
.diary-content :deep(video) {
  max-width: 100%; max-height: 400px; border-radius: 8px; margin: 12px 0; display: block;
}
.detail-video {
  width: 100%; max-height: 400px; border-radius: 8px;
}
.music-player-section { padding: 16px 20px; margin-bottom: 16px; }

@media (max-width: 768px) { .hero h1 { font-size: 1.4rem; } }

/* ── Rating card (matches Spot/Food style) ── */
.rating-card { padding: 20px; margin-top: 16px; }
.rating-card h3 { font-size: 1.2rem; margin: 0 0 12px; color: var(--text-primary); }
.rate-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.rate-row :deep(.el-rate__icon) { font-size: 24px !important; }
.rated-badge {
  font-size: 13px; color: var(--pop-green); font-weight: 600;
  padding: 4px 12px; background: rgba(58,210,159,0.12);
  border: 1px solid rgba(58,210,159,0.3); border-radius: var(--radius-pill);
}
.rate-hint { font-size: 13px; color: var(--text-muted); }
</style>
