import type { MemoryMediaResponse } from '../../../../app/types/memory-write-api'
import { getFilesystemMemoryRepository, withRepositoryErrors } from '../../../utils/memory-repository'
import { assertRequestDate } from '../../../utils/query'

export default defineEventHandler(async (event): Promise<MemoryMediaResponse> => {
  const date = getRouterParam(event, 'date') || ''
  assertRequestDate(date)
  const parts = await readMultipartFormData(event)
  const file = parts?.find(part => part.name === 'file' && part.filename && part.data)
  const expectedVersionPart = parts?.find(part => part.name === 'expectedVersion' && part.data)
  if (!file?.filename || !file.data) throw createError({ statusCode: 400, statusMessage: 'A media file is required' })
  const expectedVersion = expectedVersionPart?.data?.toString() || ''
  return withRepositoryErrors(async () => ({ media: await getFilesystemMemoryRepository(event).uploadMedia(date, { filename: file.filename as string, contentType: file.type || '', data: file.data }, expectedVersion) }))
})
