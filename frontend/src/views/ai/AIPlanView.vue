<template>
  <DefaultLayout>
    <div class="ai-page">
      <div class="page-header"><h2 class="page-title">AI 行程规划</h2></div>
      <el-row :gutter="20">
        <el-col :span="10">
          <el-card class="form-card">
            <el-form label-position="top">
              <el-form-item label="天数"><el-input-number v-model="form.days" :min="1" :max="14" /></el-form-item>
              <el-form-item label="兴趣偏好"><el-input v-model="form.interests" placeholder="例如：自然风光、历史古迹" /></el-form-item>
              <el-form-item label="预算水平"><el-select v-model="form.budget"><el-option label="低" value="低" /><el-option label="中" value="中" /><el-option label="高" value="高" /></el-select></el-form-item>
              <el-form-item label="出行方式"><el-select v-model="form.transport"><el-option label="步行" value="步行" /><el-option label="骑行" value="骑行" /><el-option label="驾车" value="驾车" /></el-select></el-form-item>
              <el-form-item label="额外要求"><el-input v-model="form.additionalInfo" type="textarea" :rows="3" placeholder="有什么特殊需求..." /></el-form-item>
              <el-button type="primary" @click="generate" :loading="loading" style="width:100%">生成计划</el-button>
            </el-form>
          </el-card>
        </el-col>
        <el-col :span="14">
          <el-card class="result-card">
            <div v-if="!result && !loading" class="empty">填写左侧信息，点击生成</div>
            <div v-if="loading" class="empty">正在生成...</div>
            <div v-if="result">
              <h3 class="plan-title">{{ result.title }}</h3>
              <div v-for="day in result.days" :key="day.day" class="day-block">
                <h4 class="day-header">📅 {{ day.date }} · {{ day.theme }}</h4>
                <div v-if="day.routeTotalDistance" class="day-route-summary">
                  🚶 全天步行 {{ (day.routeTotalDistance / 1000).toFixed(1) }} km ·
                  约 {{ formatTime(day.routeTotalTime) }}
                </div>
                <div v-for="(act, ai) in day.schedule" :key="act.time" class="activity">
                  <span class="act-time">{{ act.time }}</span>
                  <span class="act-name">{{ act.activity }}</span>
                  <span class="act-loc">{{ act.location }}</span>
                  <span v-if="act.routePrevDistance" class="act-route">
                    ← {{ (act.routePrevDistance / 1000).toFixed(1) }} km
                    <span class="route-time">{{ formatTime(act.routePrevTime) }}</span>
                  </span>
                  <span v-if="act.matchedType" class="act-match-tag" :class="'tag-' + act.matchedType">{{ matchLabel(act.matchedType) }}</span>
                </div>
              </div>
              <div v-if="result.tips?.length" class="tips-section">
                <h4>💡 小贴士</h4>
                <p v-for="(tip, i) in result.tips" :key="i">• {{ tip }}</p>
              </div>
              <div v-if="result.estimatedCost" class="cost-tag">💰 预估费用：{{ result.estimatedCost }}</div>
              <div v-if="result.rawResponse" class="raw-fallback">
                <h4>AI原始回复：</h4>
                <pre>{{ result.rawResponse }}</pre>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import { aiApi } from '@/api/aiApi'

const loading = ref(false)
const result = ref<any>(null)
const form = ref({ days: 2, interests: '自然风光,历史古迹', budget: '中', transport: '步行', additionalInfo: '' })

async function generate() {
  loading.value = true; result.value = null
  try {
    const res = await aiApi.plan(form.value)
    result.value = res.data.data
  } catch { result.value = { title: '生成计划失败', days: [], tips: ['请检查AI配置。'], estimatedCost: '' } }
  finally { loading.value = false }
}

function formatTime(seconds: number): string {
  if (!seconds || seconds <= 0) return ''
  if (seconds < 60) return Math.round(seconds) + '秒'
  if (seconds < 3600) return Math.round(seconds / 60) + '分钟'
  const h = Math.floor(seconds / 3600)
  const m = Math.round((seconds % 3600) / 60)
  return h + '小时' + (m > 0 ? m + '分钟' : '')
}

function matchLabel(type: string): string {
  const map: Record<string, string> = { spot: '景点', food: '美食', amap_geocode: '高德', amap_poi: 'POI', none: '未匹配' }
  return map[type] || type
}
</script>

<style scoped>
.ai-page { max-width: 1100px; margin: 0 auto; padding: 24px 16px; }
.page-title { font-size: 22px; font-weight: 600; color: var(--text-primary); margin-bottom: 20px; }
.form-card, .result-card { border: 1px solid var(--frosted-border); border-radius: var(--radius-card); box-shadow: var(--neu-shadow); min-height: 400px; background: var(--frosted-bg); backdrop-filter: blur(var(--glass-blur)); }
.empty { color: var(--text-secondary); text-align: center; padding: 80px 0; }
.plan-title { font-size: 20px; margin-bottom: 20px; text-align: center; color: var(--text-primary); }
.day-block { margin-bottom: 20px; padding: 12px; background: rgba(255,255,255,0.03); border: 1px solid var(--frosted-border); border-radius: 8px; }
.day-header { font-size: 16px; margin-bottom: 12px; color: var(--text-primary); }
.day-route-summary { font-size: 12px; color: var(--pop-green); padding: 4px 0 8px; font-weight: 600; }
.activity { display: flex; gap: 12px; padding: 6px 0; border-bottom: 1px solid var(--frosted-border); font-size: 14px; align-items: center; }
.act-time { color: var(--pop-pink); font-weight: 600; width: 60px; flex-shrink: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.act-name { flex: 1; color: var(--text-regular); }
.act-loc { color: var(--text-secondary); width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex-shrink: 0; }
.act-route { color: var(--pop-green); font-size: 11px; white-space: nowrap; flex-shrink: 0; margin-left: auto; }
.route-time { color: var(--text-muted); }
.act-match-tag { font-size: 10px; padding: 1px 6px; border-radius: 8px; flex-shrink: 0; font-weight: 600; }
.tag-spot { background: rgba(124,215,238,0.2); color: #7cd7ee; }
.tag-food { background: rgba(255,145,0,0.2); color: #ffb347; }
.tag-amap_geocode { background: rgba(167,111,215,0.2); color: #c9a0e8; }
.tag-amap_poi { background: rgba(58,210,159,0.2); color: #6fcf97; }
.tag-none { background: rgba(255,59,59,0.15); color: #ff6b6b; }
.tips-section { margin-top: 20px; padding: 12px; background: rgba(255,193,7,0.08); border: 1px solid rgba(255,193,7,0.2); border-radius: 8px; }
.cost-tag { margin-top: 16px; padding: 8px 16px; background: rgba(58,210,159,0.1); border: 1px solid rgba(58,210,159,0.3); border-radius: 8px; display: inline-block; font-size: 16px; font-weight: 600; color: var(--pop-green); }
.raw-fallback { margin-top: 20px; padding: 12px; background: rgba(255,255,255,0.03); border-radius: 8px; }
.raw-fallback pre { white-space: pre-wrap; font-size: 12px; color: var(--text-regular); }
</style>
