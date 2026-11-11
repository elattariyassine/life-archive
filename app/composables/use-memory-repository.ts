import { createApiMemoryRepository } from '../repositories/api-memory-repository'
import type { MemoryRepository, MemorySearchRepository, MemoryWriteRepository } from '../types/memory'

export const useMemoryRepository = (): MemoryRepository & MemorySearchRepository & MemoryWriteRepository => createApiMemoryRepository(useRequestFetch())
