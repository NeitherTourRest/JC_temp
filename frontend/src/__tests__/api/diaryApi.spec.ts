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
import { diaryApi } from '@/api/diaryApi'

const mockApiResponse = (data: any) => ({
  data: { success: true, data, message: null, errors: null, timestamp: new Date().toISOString() }
})

describe('diaryApi', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('create sends POST with correct body', async () => {
    const mockPost = vi.mocked(apiClient.post)
    mockPost.mockResolvedValue(mockApiResponse({ id: 'd1', title: 'My Trip' }))

    const result = await diaryApi.create({ title: 'My Trip', content: 'Great!', destination: 'Beijing', isPublic: true })

    expect(mockPost).toHaveBeenCalledWith('/diaries', {
      title: 'My Trip',
      content: 'Great!',
      destination: 'Beijing',
      isPublic: true
    })
  })

  it('list calls GET with pagination params', async () => {
    const mockGet = vi.mocked(apiClient.get)
    mockGet.mockResolvedValue(mockApiResponse({ content: [], totalElements: 0 }))

    await diaryApi.list({ page: 0, size: 10, sortBy: 'popularity', destination: 'Beijing' })

    expect(mockGet).toHaveBeenCalledWith('/diaries', {
      params: { page: 0, size: 10, sortBy: 'popularity', destination: 'Beijing' }
    })
  })

  it('get returns diary by id', async () => {
    const mockGet = vi.mocked(apiClient.get)
    mockGet.mockResolvedValue(mockApiResponse({ id: 'd1', title: 'My Trip' }))

    const result = await diaryApi.get('d1')

    expect(mockGet).toHaveBeenCalledWith('/diaries/d1')
    expect(result.data.data.title).toBe('My Trip')
  })

  it('update sends PUT with updated fields', async () => {
    const mockPut = vi.mocked(apiClient.put)
    mockPut.mockResolvedValue(mockApiResponse({ id: 'd1', title: 'Updated' }))

    await diaryApi.update('d1', { title: 'Updated', content: 'New content' })

    expect(mockPut).toHaveBeenCalledWith('/diaries/d1', {
      title: 'Updated',
      content: 'New content'
    })
  })

  it('del sends DELETE by id', async () => {
    const mockDelete = vi.mocked(apiClient.delete)
    mockDelete.mockResolvedValue({ data: { success: true } })

    const result = await diaryApi.del('d1')

    expect(mockDelete).toHaveBeenCalledWith('/diaries/d1')
    expect(result.data.success).toBe(true)
  })

  it('rate sends POST with rating param', async () => {
    const mockPost = vi.mocked(apiClient.post)
    mockPost.mockResolvedValue(mockApiResponse({ id: 'd1', avgRating: 4.5 }))

    await diaryApi.rate('d1', 5)

    expect(mockPost).toHaveBeenCalledWith('/diaries/d1/rate', null, {
      params: { rating: 5 }
    })
  })

  it('search sends GET with keyword param', async () => {
    const mockGet = vi.mocked(apiClient.get)
    mockGet.mockResolvedValue(mockApiResponse({ content: [], totalElements: 0 }))

    await diaryApi.search('trip')

    expect(mockGet).toHaveBeenCalledWith('/diaries/search', {
      params: { keyword: 'trip' }
    })
  })
})
