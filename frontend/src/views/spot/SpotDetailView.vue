<template>
  <DefaultLayout>
    <div class="detail-page" v-loading="loading">
      <div v-if="!loading && !spot" class="error-state">
        <h2>404</h2>
        <p>Spot not found</p>
        <el-button type="primary" @click="$router.push('/spots')">← Back to Spots</el-button>
      </div>

      <template v-if="spot">
        <!-- Hero -->
        <div class="detail-hero" :style="{ background: heroColor }">
          <div class="hero-content">
            <el-button class="back-btn" text @click="$router.push('/spots')">← BACK</el-button>
            <h1>{{ spot.name }}</h1>
            <div class="hero-tags">
              <el-tag size="small" type="warning">{{ spot.category }}</el-tag>
              <el-tag v-if="spot.address" size="small" type="primary">📍 {{ spot.address }}</el-tag>
            </div>
          </div>
        </div>

        <!-- Stats -->
        <div class="stats-row">
          <div class="stat-item"><span class="stat-num">⭐ {{ spot.avgRating?.toFixed(1) || '—' }}</span><span>Rating</span></div>
          <div class="stat-item"><span class="stat-num">👁 {{ spot.popularity || 0 }}</span><span>Popularity</span></div>
          <div class="stat-item"><span class="stat-num">📝 {{ spot.ratingCount || 0 }}</span><span>Reviews</span></div>
          <div class="stat-item" v-if="spot.ticketPrice"><span class="stat-num">¥{{ spot.ticketPrice }}</span><span>Ticket</span></div>
        </div>

        <!-- Description -->
        <div class="content-section">
          <div class="content-card">
            <h3>📖 About</h3>
            <p>{{ spot.description || 'No description available.' }}</p>
            <div v-if="spot.openingHours" class="info-line"><strong>🕐 Hours:</strong> {{ spot.openingHours }}</div>
          </div>
        </div>

        <!-- Foods nearby -->
        <div class="content-section" v-if="nearbyFoods.length">
          <h3 class="section-title">🍜 Nearby Foods</h3>
          <div class="mini-grid">
            <div v-for="f in nearbyFoods" :key="f.id" class="mini-card" @click="$router.push('/foods/' + f.id)">
              <div class="mini-card-color" :style="{ background: '#ff69b4' }"></div>
              <div class="mini-card-body">
                <strong>{{ f.name }}</strong>
                <span>⭐ {{ f.avgRating?.toFixed(1) || '—' }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Reviews -->
        <div class="content-section">
          <h3 class="section-title">💬 Reviews</h3>
          <div v-if="!reviews.length" class="empty-hint">No reviews yet. Be the first!</div>
          <div v-for="r in reviews" :key="r.id" class="review-card">
            <div class="review-header">
              <strong>User #{{ r.userId }}</strong>
              <span>⭐ {{ r.rating }}/5</span>
            </div>
            <p v-if="r.content">{{ r.content }}</p>
          </div>
        </div>
      </template>
    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import { spotApi } from '@/api/spotApi'
import type { SpotResponse } from '@/types/api'

const route = useRoute()
const router = useRouter()
const spot = ref<SpotResponse | null>(null)
const reviews = ref<any[]>([])
const nearbyFoods = ref<any[]>([])
const loading = ref(true)

const colors = ['#ffdd00', '#ff69b4', '#00bfff', '#00e676', '#ff9100']
const heroColor = computed(() => colors[(spot.value?.id || 0) % colors.length])

onMounted(async () => {
  try {
    const r = await spotApi.getDetail(Number(route.params.id))
    if (r.data.data) {
      const d = r.data.data
      spot.value = d as any
      reviews.value = (d as any).reviews || []
      nearbyFoods.value = (d as any).foods || []
    }
  } catch { spot.value = null }
  finally { loading.value = false }
})
</script>

<style scoped>
.detail-page { max-width: 800px; margin: 0 auto; }
.error-state { text-align: center; padding: 80px 20px; }
.error-state h2 { font-family: 'Bangers', cursive; font-size: 4rem; margin: 0; }

/* Hero */
.detail-hero { padding: 40px 24px; border: 4px solid #000; border-radius: 8px; margin-bottom: 16px; box-shadow: 6px 6px 0 #000; }
.hero-content { color: #000; }
.back-btn { color: #000 !important; border: 2px solid #000 !important; background: #fff !important; margin-bottom: 12px; }
.detail-hero h1 { font-family: 'Bangers', cursive; font-size: 2.5rem; margin: 8px 0; text-transform: uppercase; letter-spacing: 1px; text-shadow: 3px 3px 0 rgba(0,0,0,0.15); }
.hero-tags { display: flex; gap: 6px; flex-wrap: wrap; }

/* Stats */
.stats-row { display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; }
.stat-item { flex: 1; min-width: 100px; text-align: center; padding: 16px 8px; border: 4px solid #000; border-radius: 8px; box-shadow: 4px 4px 0 #000; background: #fff; }
.stat-num { display: block; font-family: 'Bangers', cursive; font-size: 1.5rem; }
.stat-item span:last-child { font-size: 12px; text-transform: uppercase; color: #666; }

/* Content */
.content-section { margin-bottom: 20px; }
.section-title { font-family: 'Bangers', cursive; font-size: 1.5rem; margin: 0 0 12px; letter-spacing: 1px; }
.content-card { padding: 20px; border: 4px solid #000; border-radius: 8px; box-shadow: 4px 4px 0 #000; background: #fff; }
.content-card h3 { font-family: 'Bangers', cursive; font-size: 1.2rem; margin: 0 0 8px; }
.content-card p { margin: 0; line-height: 1.6; color: #333; }
.info-line { margin-top: 10px; font-size: 14px; }

/* Mini grid */
.mini-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 10px; }
.mini-card { border: 4px solid #000; border-radius: 8px; overflow: hidden; cursor: pointer; box-shadow: 4px 4px 0 #000; background: #fff; }
.mini-card:hover { transform: translate(-2px, -2px); box-shadow: 6px 6px 0 #000; }
.mini-card-color { height: 40px; }
.mini-card-body { padding: 8px 10px; display: flex; justify-content: space-between; align-items: center; font-size: 13px; }

/* Reviews */
.review-card { padding: 14px; border: 4px solid #000; border-radius: 8px; margin-bottom: 10px; background: #fff; box-shadow: 3px 3px 0 #000; }
.review-header { display: flex; justify-content: space-between; margin-bottom: 6px; }
.review-card p { margin: 0; font-size: 14px; color: #333; }
.empty-hint { color: #999; font-size: 14px; padding: 20px; text-align: center; }
</style>