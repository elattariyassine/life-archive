import type { MemoryWriteResponse } from '../../../../../app/types/memory-write-api'
import { getFilesystemMemoryRepository, withRepositoryErrors } from '../../../../utils/memory-repository'
import { assertRequestDate } from '../../../../utils/query'

export default defineEventHandler(async (event): Promise<MemoryWriteResponse> => {
  const date = getRouterParam(event, 'date') || ''
  const rawPath = getRouterParam(event, 'path') || ''
  assertRequestDate(date)
  let mediaPath: string
  try {
    mediaPath = rawPath.split('/').map(decodeURIComponent).join('/')
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'Invalid media path' })
  }
  const body = await readBody<{ expectedVersion?: string }>(event)
  return withRepositoryErrors(async () => ({ memory: await getFilesystemMemoryRepository(event).removeMedia(date, mediaPath, body?.expectedVersion || '') }))
})
