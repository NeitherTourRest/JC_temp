<template>
  <el-dialog v-model="visible" title="邀请协作者" width="450px" top="8vh" destroy-on-close>
    <div class="invite-body">
      <!-- Search user -->
      <el-input v-model="searchQuery" placeholder="输入用户名搜索..." clearable @input="onSearchInput" />
      <div v-if="searchResults.length" class="search-results">
        <div v-for="u in searchResults" :key="u.id" class="search-row">
          <span class="search-name">{{ u.nickname || u.username }}</span>
          <span class="search-uname">@{{ u.username }}</span>
          <el-button size="small" type="primary" @click="doInvite(u.id)" :loading="invitingId === u.id">邀请</el-button>
        </div>
      </div>
      <div v-else-if="searchQuery && !searchLoading" class="no-results">未找到用户</div>

      <!-- Pending invites -->
      <div v-if="pendingInvites.length" class="section">
        <div class="section-title">已邀请（待处理）</div>
        <div v-for="inv in pendingInvites" :key="inv.id" class="invite-row">
          <span>{{ inv.inviterName || '用户' + inv.inviterId }}</span>
          <el-tag size="small" type="warning">待处理</el-tag>
        </div>
      </div>

      <!-- Current collaborators -->
      <div v-if="collaborators.length" class="section">
        <div class="section-title">协作者</div>
        <div v-for="c in collaborators" :key="c.userId" class="invite-row">
          <span>{{ c.nickname || '用户' + c.userId }}</span>
          <el-tag size="small" :type="c.role === 'owner' ? 'danger' : 'success'">{{ c.role === 'owner' ? '创建者' : '编辑者' }}</el-tag>
          <el-button v-if="c.role !== 'owner' && isOwner" size="small" type="danger" text @click="$emit('remove', c.userId)">移除</el-button>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { userApi } from '@/api/userApi'
import { itineraryApi } from '@/api/itineraryApi'

const props = defineProps<{
  modelValue: boolean
  itineraryId: number
  collaborators: { userId: number; role: string; nickname: string }[]
  pendingInvites: { id: number; inviterId: number; inviterName: string }[]
  isOwner: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'invited': []
  'remove': [userId: number]
}>()

const visible = ref(props.modelValue)
watch(() => props.modelValue, v => visible.value = v)
watch(visible, v => emit('update:modelValue', v))

const searchQuery = ref('')
const searchResults = ref<{ id: number; username: string; nickname?: string }[]>([])
const searchLoading = ref(false)
const invitingId = ref<number | null>(null)
let searchTimer: ReturnType<typeof setTimeout> | null = null

async function onSearchInput() {
  const q = searchQuery.value.trim()
  if (!q || q.length < 2) { searchResults.value = []; return }
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(async () => {
    searchLoading.value = true
    try {
      const r = await userApi.search(q)
      searchResults.value = r.data.data || []
    } catch { searchResults.value = [] }
    finally { searchLoading.value = false }
  }, 300)
}

async function doInvite(userId: number) {
  invitingId.value = userId
  try {
    await itineraryApi.invite(props.itineraryId, userId)
    ElMessage.success('邀请已发送')
    emit('invited')
    searchQuery.value = ''
    searchResults.value = []
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || '邀请失败')
  } finally { invitingId.value = null }
}
</script>

<style scoped>
.invite-body { display: flex; flex-direction: column; gap: 12px; }
.search-results { max-height: 200px; overflow-y: auto; }
.search-row { display: flex; align-items: center; gap: 8px; padding: 6px 0; border-bottom: 1px solid var(--frosted-border); }
.search-name { font-weight: 600; color: var(--text-primary); flex: 1; }
.search-uname { font-size: 12px; color: var(--text-muted); }
.no-results { padding: 12px; text-align: center; color: var(--text-muted); font-size: 13px; }
.section { margin-top: 8px; }
.section-title { font-size: 12px; font-weight: 700; color: var(--text-secondary); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
.invite-row { display: flex; align-items: center; gap: 8px; padding: 6px 0; font-size: 13px; color: var(--text-regular); }
</style>
