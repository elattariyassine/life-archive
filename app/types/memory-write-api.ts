import type { Memory, MemoryMedia } from '~/types/memory'

export interface MemoryDeleteResponse {
  deleted: true
}

export interface MemoryMediaResponse {
  media: MemoryMedia
}

export interface MemoryWriteResponse {
  memory: Memory
}
