import type { MemoryDetailResponse, MemoryListResponse } from '../types/memory-api'
import type { MemoryFilters, MemoryRepository } from '../types/memory'

type ApiRequest = <T>(request: string, options?: { query?: Record<string, number> }) => Promise<T>

export function createApiMemoryRepository(request: ApiRequest): MemoryRepository {
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
    }
  }
}
