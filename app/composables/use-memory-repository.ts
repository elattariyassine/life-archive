import { createApiMemoryRepository } from '../repositories/api-memory-repository'

export const useMemoryRepository = () => createApiMemoryRepository(useRequestFetch())
