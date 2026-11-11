import { createApiMemoryRepository } from '../repositories/api-memory-repository'
import type { MemoryRepository, MemoryWriteRepository } from '../types/memory'

export const useMemoryRepository = (): MemoryRepository & MemoryWriteRepository => createApiMemoryRepository(useRequestFetch())
