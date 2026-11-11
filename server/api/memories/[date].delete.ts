import type { MemoryDeleteResponse } from '../../../app/types/memory-write-api'
import { getFilesystemMemoryRepository, withRepositoryErrors } from '../../utils/memory-repository'
import { assertRequestDate } from '../../utils/query'

export default defineEventHandler(async (event): Promise<MemoryDeleteResponse> => {
  const date = getRouterParam(event, 'date') || ''
  assertRequestDate(date)
  const body = await readBody<{ expectedVersion?: string }>(event)
  await withRepositoryErrors(() => getFilesystemMemoryRepository(event).deleteMemory(date, body?.expectedVersion || ''))
  return { deleted: true }
})
