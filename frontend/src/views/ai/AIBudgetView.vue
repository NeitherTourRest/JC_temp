<template>
  <DefaultLayout>
    <div class="ai-page">
      <div class="page-header"><h2 class="page-title">AI预算估计</h2></div>
      <el-row :gutter="20">
        <el-col :span="10">
          <el-card class="form-card">
            <el-form label-position="top">
              <el-form-item label="旅行天数"><el-input-number v-model="form.days" :min="1" :max="30" /></el-form-item>
              <el-form-item label="人数"><el-input-number v-model="form.peopleCount" :min="1" :max="20" /></el-form-item>
              <el-form-item label="计划游览景点"><el-input v-model="form.spots" placeholder="如：十三陵,居庸关" /></el-form-item>
              <el-form-item label="交通方式"><el-select v-model="form.transport"><el-option label="公共交通" value="公共交通" /><el-option label="自驾" value="自驾" /><el-option label="混合" value="混合" /></el-select></el-form-item>
              <el-form-item label="餐饮偏好"><el-select v-model="form.diningPref"><el-option label="简餐" value="简餐" /><el-option label="普通" value="普通" /><el-option label="美食体验" value="美食体验" /></el-select></el-form-item>
              <el-form-item label="住宿要求"><el-select v-model="form.accommodation"><el-option label="经济型" value="经济型" /><el-option label="舒适型" value="舒适型" /><el-option label="高档" value="高档" /></el-select></el-form-item>
              <el-button type="primary" @click="estimate" :loading="loading" style="width:100%">生成预算报告</el-button>
            </el-form>
          </el-card>
        </el-col>
        <el-col :span="14">
          <el-card class="result-card">
            <div v-if="!result && !loading" class="empty">填写左侧信息，点击生成预算</div>
            <div v-if="loading" class="empty">AI正在计算预算...</div>
            <div v-if="result">
              <h3 class="budget-total">💰 总预算：<span class="total-amount">{{ result.totalBudget }}</span></h3>
              <div class="categories">
                <div v-for="cat in result.categories" :key="cat.name" class="cat-row">
                  <span class="cat-name">{{ cat.name }}</span>
                  <span class="cat-amount">¥{{ cat.amount }}</span>
                  <span class="cat-detail">{{ cat.details }}</span>
                </div>
              </div>
              <div v-if="result.suggestions?.length" class="suggestions">
                <h4>💡 省钱建议</h4>
                <p v-for="(s, i) in result.suggestions" :key="i">• {{ s }}</p>
              </div>
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
const form = ref({ days: 2, peopleCount: 2, spots: '十三陵,居庸关长城', transport: '公共交通', diningPref: '普通', accommodation: '经济型' })

async function estimate() {
  loading.value = true; result.value = null
  try {
    const res = await aiApi.budget(form.value)
    result.value = res.data.data
  } catch { result.value = { totalBudget: 'N/A', categories: [], suggestions: ['请检查AI配置'] } }
  finally { loading.value = false }
}
</script>

<style scoped>
.ai-page { max-width: 1100px; margin: 0 auto; padding: 24px 16px; }
.page-title { font-size: 22px; font-weight: 600; color: #2c2c2c; margin-bottom: 20px; }
.form-card, .result-card { border: 2px solid #2c2c2c; border-radius: 4px; box-shadow: 3px 3px 0 #2c2c2c; min-height: 400px; }
.empty { color: #999; text-align: center; padding: 80px 0; }
.budget-total { font-size: 24px; text-align: center; padding: 20px; margin-bottom: 20px; background: #f0f9eb; border: 1px dashed #67c23a; }
.total-amount { color: #67c23a; font-size: 28px; }
.categories { margin-bottom: 20px; }
.cat-row { display: flex; gap: 12px; padding: 10px 0; border-bottom: 1px solid #f0f0f0; font-size: 14px; }
.cat-name { font-weight: 600; width: 80px; }
.cat-amount { color: #e6a23c; font-weight: 600; width: 80px; }
.cat-detail { color: #666; flex: 1; }
.suggestions { margin-top: 20px; padding: 12px; background: #fff8e1; border: 1px dashed #e6a23c; }
.raw-fallback { margin-top: 20px; padding: 12px; background: #f5f5f5; }
.raw-fallback pre { white-space: pre-wrap; font-size: 12px; }
</style>
