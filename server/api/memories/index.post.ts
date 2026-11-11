import type { MemoryWriteResponse } from '../../../app/types/memory-write-api'
import type { MemoryDraft } from '../../../app/types/memory'
import { getFilesystemMemoryRepository, withRepositoryErrors } from '../../utils/memory-repository'

export default defineEventHandler(async (event): Promise<MemoryWriteResponse> => {
  const draft = await readBody<MemoryDraft>(event)
  return withRepositoryErrors(async () => ({ memory: await getFilesystemMemoryRepository(event).createMemory(draft) }))
})
