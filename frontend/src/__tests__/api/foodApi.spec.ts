import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/api/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}))

import apiClient from '@/api/axios'
import { foodApi } from '@/api/foodApi'

const mockApiResponse = (data: any) => ({
  data: { success: true, data, message: null, errors: null, timestamp: new Date().toISOString() }
})

describe('foodApi', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('search calls correct endpoint with params', async () => {
    const mockGet = vi.mocked(apiClient.get)
    mockGet.mockResolvedValue(mockApiResponse({ content: [], totalElements: 0 }))

    await foodApi.search({ keyword: 'pizza', cuisine: 'Italian', page: 0, size: 10 })

    expect(mockGet).toHaveBeenCalledWith('/foods/search', {
      params: { keyword: 'pizza', cuisine: 'Italian', page: 0, size: 10 }
    })
  })

  it('getById calls correct endpoint', async () => {
    const mockGet = vi.mocked(apiClient.get)
    mockGet.mockResolvedValue(mockApiResponse({ id: 1, name: 'Pizza' }))

    const result = await foodApi.getById(1)
    
    expect(mockGet).toHaveBeenCalledWith('/foods/1')
    expect(result.data.data.name).toBe('Pizza')
  })

  it('getBySpot calls correct endpoint with spotId', async () => {
    const mockGet = vi.mocked(apiClient.get)
    mockGet.mockResolvedValue(mockApiResponse({ content: [], totalElements: 0 }))

    await foodApi.getBySpot(1, { page: 0, size: 10 })

    expect(mockGet).toHaveBeenCalledWith('/spots/1/foods', {
      params: { page: 0, size: 10 }
    })
  })

  it('search includes location params for distance sort', async () => {
    const mockGet = vi.mocked(apiClient.get)
    mockGet.mockResolvedValue(mockApiResponse({ content: [], totalElements: 0 }))

    await foodApi.search({ keyword: 'sushi', sortBy: 'distance', lat: 39.9, lng: 116.4, page: 0, size: 10 })

    expect(mockGet).toHaveBeenCalledWith('/foods/search', expect.objectContaining({
      params: expect.objectContaining({ lat: 39.9, lng: 116.4, sortBy: 'distance' })
    }))
  })
})
