import type { MemoryDetailResponse, MemoryListResponse } from '../types/memory-api'
import type { MemoryDraft, MemoryFilters, MemoryRepository, MemoryWriteRepository } from '../types/memory'
import type { MemoryDeleteResponse, MemoryMediaResponse, MemoryWriteResponse } from '../types/memory-write-api'

type ApiRequest = <T>(request: string, options?: { query?: Record<string, number | string>; method?: string; body?: BodyInit | Record<string, any> | null }) => Promise<T>

export function createApiMemoryRepository(request: ApiRequest): MemoryRepository & MemoryWriteRepository {
  return {
    async getMemories(filters?: MemoryFilters) {
      const query: Record<string, number> = {}
      if (filters?.year !== undefined) query.year = filters.year
      if (filters?.month !== undefined) query.month = filters.month
      const response = await request<MemoryListResponse>('/api/memories', { query })
      return response.memories
    },
    async getMemoryByDate(date) {
      try {
        const response = await request<MemoryDetailResponse>(`/api/memories/${encodeURIComponent(date)}`)
        return response.memory
      } catch (error: unknown) {
        if (error && typeof error === 'object' && 'statusCode' in error && error.statusCode === 404) return null
        throw error
      }
    },
    async getMemoriesByYear(year) {
      return this.getMemories({ year })
    },
    async createMemory(draft: MemoryDraft) {
      const response = await request<MemoryWriteResponse>('/api/memories', { method: 'POST', body: draft })
      return response.memory
    },
    async updateMemory(date, draft, expectedVersion) {
      const response = await request<MemoryWriteResponse>(`/api/memories/${encodeURIComponent(date)}`, { method: 'PUT', body: { ...draft, expectedVersion } })
      return response.memory
    },
    async deleteMemory(date, expectedVersion) {
      await request<MemoryDeleteResponse>(`/api/memories/${encodeURIComponent(date)}`, { method: 'DELETE', body: { expectedVersion } })
    },
    async uploadMedia(date, file, expectedVersion) {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('expectedVersion', expectedVersion)
      const response = await request<MemoryMediaResponse>(`/api/memories/${encodeURIComponent(date)}/media`, { method: 'POST', body: formData })
      return response.media
    },
    async removeMedia(date, mediaPath, expectedVersion) {
      const response = await request<MemoryWriteResponse>(`/api/memories/${encodeURIComponent(date)}/media/${mediaPath.split('/').map(encodeURIComponent).join('/')}`, { method: 'DELETE', body: { expectedVersion } })
      return response.memory
    }
  }
}
