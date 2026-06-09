<template>
  <DefaultLayout>
    <div class="detail-page">
      <div v-if="loading" class="center">Loading...</div>
      <div v-else-if="!diary" class="center">Diary not found</div>
      <div v-else class="content">
        <button class="back-btn" @click="$router.push('/diaries')">&#8592; Back</button>
        <div class="hero glass">
          <h1>{{ diary.title }}</h1>
          <div class="hero-meta">
            <span>#{{ diary.userId }}</span>
            <span>&#11088; {{ diary.avgRating?.toFixed(1) || '—' }}</span>
            <span>&#128065; {{ diary.popularity }}</span>
            <span>{{ diary.createdAt?.substring(0,10) }}</span>
          </div>
          <el-tag v-if="diary.destination" size="small" type="warning" style="margin-top: 8px;">{{ diary.destination }}</el-tag>
        </div>
        <div class="actions" v-if="isOwner">
          <el-button type="primary" @click="$router.push('/diaries/' + diary.id + '/edit')">Edit</el-button>
          <el-button type="danger" @click="del">Delete</el-button>
        </div>
        <div v-if="diary.images?.length" class="gallery glass">
          <img v-for="(img,i) in diary.images" :key="i" :src="img" @click="previewIdx=i;showPreview=true" />
        </div>
        <div v-if="diary.videoMeta?.url" class="glass" style="padding:20px"><video :src="diary.videoMeta.url" controls style="width:100%;max-height:400px;border-radius:8px" /></div>
        <div v-if="diary.musicUrl" class="glass" style="padding:20px"><audio :src="diary.musicUrl" controls style="width:100%" /></div>
        <div class="glass" style="padding:20px;margin-top:16px">
          <div class="diary-content" v-html="rendered"></div>
        </div>
        <div class="glass" style="padding:20px;margin-top:16px">
          <h3>Rate this diary</h3>
          <el-rate v-model="rating" @change="rate" style="margin-top:8px" />
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
import { diaryApi } from '@/api/diaryApi'
import type { DiaryResponse } from '@/types/api'

const route = useRoute(); const router = useRouter()
const diary = ref<DiaryResponse | null>(null)
const loading = ref(true)
const rating = ref(0)
const previewIdx = ref(0)
const showPreview = ref(false)

const isOwner = computed(() => diary.value?.userId === 1) // simplified
const rendered = computed(() => {
  let t = diary.value?.content || ''
  t = t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  t = t.replace(/\n/g, '<br>')
  return t
})

async function del() {
  if (!diary.value) return
  try { await ElMessageBox.confirm('Delete?', 'Confirm', { type: 'warning' }); await diaryApi.del(diary.value.id); ElMessage.success('Deleted'); router.push('/diaries') } catch (e: any) { if (e !== 'cancel') console.error('Delete diary error:', e) }
}
async function rate(v: number) { try { await diaryApi.rate(diary.value!.id, v); ElMessage.success('Rated!') } catch (e) { console.error('Rate error:', e); ElMessage.error('Failed') } }

onMounted(async () => {
  try { const r = await diaryApi.get(route.params.id as string); diary.value = r.data.data } catch (e) { console.error('Load diary error:', e) } finally { loading.value = false }
})
</script>

<style scoped>
.detail-page { max-width: 800px; margin: 0 auto; padding: 20px 0; }
.center { text-align: center; padding: 80px; color: var(--text-muted); }
.back-btn { background: none; border: none; font-family: inherit; font-size: 14px; cursor: pointer; color: var(--text-regular); margin-bottom: 16px; transition: color 0.2s; }
.back-btn:hover { color: var(--pop-pink); }
.hero { padding: 24px; margin-bottom: 16px; }
.hero h1 { font-family: inherit; font-size: 1.8rem; margin: 0 0 8px; color: var(--text-primary); }
.hero-meta { display: flex; gap: 14px; font-size: 13px; color: var(--text-secondary); flex-wrap: wrap; }
.actions { display: flex; gap: 8px; margin-bottom: 16px; }
.gallery { padding: 12px; display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
.gallery img { width: 100px; height: 100px; object-fit: cover; border-radius: 8px; cursor: pointer; border: 1px solid var(--frosted-border); transition: opacity 0.2s; }
.gallery img:hover { opacity: 0.8; }
.diary-content { font-size: 15px; line-height: 1.8; white-space: pre-wrap; }
@media (max-width: 768px) { .hero h1 { font-size: 1.4rem; } }
</style>
