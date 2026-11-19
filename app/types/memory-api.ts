import type { Memory, MemorySearchResult, MemorySummary } from '~/types/memory'

export interface MemoryListResponse {
  memories: Memory[]
}

export interface MemorySummaryListResponse {
  memories: MemorySummary[]
}

export interface MemoryDetailResponse {
  memory: Memory
}

export interface MemorySearchResponse {
  results: MemorySearchResult[]
}

export type MemoryRepositoryMode = 'sample' | 'filesystem'

export interface MemoryRepositoryStatusResponse {
  mode: MemoryRepositoryMode
  archiveConfigured: boolean
  archiveAvailable: boolean
}
