import type { MemoryWriteResponse } from '../../../app/types/memory-write-api'
import type { MemoryCreateInput } from '../../../app/types/memory'
import { getFilesystemMemoryRepository, withRepositoryErrors } from '../../utils/memory-repository'

export default defineEventHandler(async (event): Promise<MemoryWriteResponse> => {
  const input = await readBody<MemoryCreateInput>(event)
  return withRepositoryErrors(async () => ({ memory: await getFilesystemMemoryRepository(event).createMemory(input) }))
})
