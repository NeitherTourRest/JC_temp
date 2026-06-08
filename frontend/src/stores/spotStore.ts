import { defineStore } from 'pinia'
import { ref } from 'vue'
import { spotApi } from '@/api/spotApi'
import type { SpotResponse } from '@/types/api'

export const useSpotStore = defineStore('spot', () => {
  const spots = ref<SpotResponse[]>([])
  const loading = ref(false)

  async function fetchSpots(params?: any) {
    loading.value = true
    try { const res = await spotApi.search(params || {}); spots.value = res.data.data.content } 
    finally { loading.value = false }
  }

  return { spots, loading, fetchSpots }
})
