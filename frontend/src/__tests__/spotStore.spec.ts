import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSpotStore } from '@/stores/spotStore'

const mockSpots = vi.hoisted(() => [
  { id: 1, name: 'Great Wall', category: 'scenic', popularity: 100, avgRating: 4.5, latitude: 40.0, longitude: 116.0 },
  { id: 2, name: 'Forbidden City', category: 'museum', popularity: 80, avgRating: 4.3, latitude: 39.9, longitude: 116.4 }
])

vi.mock('@/api/spotApi', () => ({
  spotApi: {
    search: vi.fn().mockResolvedValue({ data: { data: { content: mockSpots, totalElements: 2 } } })
  }
}))

describe('SpotStore', () => {
  beforeEach(() => { setActivePinia(createPinia()) })

  it('initializes with empty spots array', () => {
    const store = useSpotStore()
    expect(store.spots).toEqual([])
    expect(store.loading).toBe(false)
  })

  it('fetchSpots fills spots from API', async () => {
    const store = useSpotStore()
    await store.fetchSpots({ keyword: 'wall' })
    expect(store.spots.length).toBe(2)
    expect(store.spots[0].name).toBe('Great Wall')
  })
})
