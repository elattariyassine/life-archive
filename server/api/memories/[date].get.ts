import type { MemoryDetailResponse } from '../../../app/types/memory-api'
import { getServerMemoryRepository, toClientMemory } from '../../utils/memory-repository'
import { assertRequestDate } from '../../utils/query'

export default defineEventHandler(async (event): Promise<MemoryDetailResponse> => {
  const date = getRouterParam(event, 'date') || ''
  assertRequestDate(date)
  const memory = await getServerMemoryRepository(event).getMemoryByDate(date)
  if (!memory) throw createError({ statusCode: 404, statusMessage: 'Memory not found' })
  return { memory: toClientMemory(event, memory) }
})
