import type { MemoryLocation } from '../../../../app/types/memory'
import type { MemoryWriteResponse } from '../../../../app/types/memory-write-api'
import { getFilesystemMemoryRepository, withRepositoryErrors } from '../../../utils/memory-repository'
import { assertRequestDate } from '../../../utils/query'

type LocationUpdateBody = {
  expectedVersion?: unknown
  location?: unknown
}

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value)

export default defineEventHandler(async (event): Promise<MemoryWriteResponse> => {
  const date = getRouterParam(event, 'date') || ''
  assertRequestDate(date)
  const body = await readBody<LocationUpdateBody>(event)
  if (!isRecord(body) || typeof body.expectedVersion !== 'string' || !isRecord(body.location)) throw createError({ statusCode: 400, statusMessage: 'Invalid location update' })
  return withRepositoryErrors(async () => ({
    memory: await getFilesystemMemoryRepository(event).updateMemoryLocation(date, body.expectedVersion as string, body.location as MemoryLocation)
  }))
})
