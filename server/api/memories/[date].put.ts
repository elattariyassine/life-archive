import type { MemoryDraft } from '../../../app/types/memory'
import type { MemoryWriteResponse } from '../../../app/types/memory-write-api'
import { getFilesystemMemoryRepository, withRepositoryErrors } from '../../utils/memory-repository'
import { assertRequestDate } from '../../utils/query'

export default defineEventHandler(async (event): Promise<MemoryWriteResponse> => {
  const date = getRouterParam(event, 'date') || ''
  assertRequestDate(date)
  const body = await readBody<MemoryDraft & { expectedVersion?: string }>(event)
  return withRepositoryErrors(async () => ({ memory: await getFilesystemMemoryRepository(event).updateMemory(date, body, body?.expectedVersion || '') }))
})
