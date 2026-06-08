<template>
  <DefaultLayout>
    <div class="ai-page">
      <div class="page-header"><h2 class="page-title">AI行程规划</h2></div>
      <el-row :gutter="20">
        <el-col :span="10">
          <el-card class="form-card">
            <el-form label-position="top">
              <el-form-item label="旅行天数"><el-input-number v-model="form.days" :min="1" :max="14" /></el-form-item>
              <el-form-item label="兴趣偏好"><el-input v-model="form.interests" placeholder="如：自然风光,历史古迹,美食" /></el-form-item>
              <el-form-item label="预算水平"><el-select v-model="form.budget"><el-option label="低" value="低" /><el-option label="中" value="中" /><el-option label="高" value="高" /></el-select></el-form-item>
              <el-form-item label="出行方式"><el-select v-model="form.transport"><el-option label="步行" value="步行" /><el-option label="骑行" value="骑行" /><el-option label="驾车" value="驾车" /></el-select></el-form-item>
              <el-form-item label="额外要求"><el-input v-model="form.additionalInfo" type="textarea" :rows="3" placeholder="如：想去的景点、特别需求" /></el-form-item>
              <el-button type="primary" @click="generate" :loading="loading" style="width:100%">生成行程规划</el-button>
            </el-form>
          </el-card>
        </el-col>
        <el-col :span="14">
          <el-card class="result-card">
            <div v-if="!result && !loading" class="empty">填写左侧信息，点击生成</div>
            <div v-if="loading" class="empty">AI正在为您规划行程...</div>
            <div v-if="result">
              <h3 class="plan-title">{{ result.title }}</h3>
              <div v-for="day in result.days" :key="day.day" class="day-block">
                <h4 class="day-header">📅 {{ day.date }} · {{ day.theme }}</h4>
                <div v-for="act in day.schedule" :key="act.time" class="activity">
                  <span class="act-time">{{ act.time }}</span>
                  <span class="act-name">{{ act.activity }}</span>
                  <span class="act-loc">{{ act.location }}</span>
                </div>
              </div>
              <div v-if="result.tips?.length" class="tips-section">
                <h4>💡 出行建议</h4>
                <p v-for="(tip, i) in result.tips" :key="i">• {{ tip }}</p>
              </div>
              <div v-if="result.estimatedCost" class="cost-tag">💰 {{ result.estimatedCost }}</div>
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
  } catch { result.value = { title: '请求失败', days: [], tips: ['请检查AI配置'], estimatedCost: '' } }
  finally { loading.value = false }
}
</script>

<style scoped>
.ai-page { max-width: 1100px; margin: 0 auto; padding: 24px 16px; }
.page-title { font-size: 22px; font-weight: 600; color: #2c2c2c; margin-bottom: 20px; }
.form-card, .result-card { border: 2px solid #2c2c2c; border-radius: 4px; box-shadow: 3px 3px 0 #2c2c2c; min-height: 400px; }
.empty { color: #999; text-align: center; padding: 80px 0; }
.plan-title { font-size: 20px; margin-bottom: 20px; text-align: center; }
.day-block { margin-bottom: 20px; padding: 12px; background: #faf8f5; border: 1px dashed #2c2c2c; }
.day-header { font-size: 16px; margin-bottom: 12px; }
.activity { display: flex; gap: 12px; padding: 6px 0; border-bottom: 1px solid #f0f0f0; font-size: 14px; }
.act-time { color: #2c3e7a; font-weight: 600; width: 60px; flex-shrink: 0; }
.act-name { flex: 1; }
.act-loc { color: #666; width: 120px; }
.tips-section { margin-top: 20px; padding: 12px; background: #fff8e1; border: 1px dashed #e6a23c; }
.cost-tag { margin-top: 16px; padding: 8px 16px; background: #f0f9eb; border: 1px solid #67c23a; display: inline-block; font-size: 16px; font-weight: 600; }
.raw-fallback { margin-top: 20px; padding: 12px; background: #f5f5f5; }
.raw-fallback pre { white-space: pre-wrap; font-size: 12px; }
</style>
