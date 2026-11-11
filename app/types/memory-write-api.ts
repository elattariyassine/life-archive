import type { Memory } from '~/types/memory'

export interface MemoryDeleteResponse {
  deleted: true
}

export interface MemoryWriteResponse {
  memory: Memory
}
