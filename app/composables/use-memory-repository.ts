import { createApiMemoryRepository } from '../repositories/api-memory-repository'
import type { MemoryRepository, MemorySearchRepository, MemorySummaryRepository, MemoryWriteRepository } from '../types/memory'

export const useMemoryRepository = (): MemoryRepository & MemorySearchRepository & MemoryWriteRepository & MemorySummaryRepository => createApiMemoryRepository(useRequestFetch())

/** The shared, body-less index of the archive. One request serves every list view and stays cached per key. */
export const useMemorySummaries = () => {
  const repository = useMemoryRepository()
  return useAsyncData('memory-summaries', () => repository.getMemorySummaries(), { default: () => [] })
}
