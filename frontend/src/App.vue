<template><router-view /></template>
<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuthStore } from '@/stores/authStore'

const auth = useAuthStore()
onMounted(() => {
  // Proactive auth check on app load — refreshes token if expired
  auth.checkAuth()
})
</script>
