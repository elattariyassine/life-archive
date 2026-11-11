import type { Memory } from '~/types/memory'

export interface MemoryListResponse {
  memories: Memory[]
}

export interface MemoryDetailResponse {
  memory: Memory
}
