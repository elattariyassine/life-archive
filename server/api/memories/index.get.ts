import type { MemoryListResponse } from '../../../app/types/memory-api'
import { getServerMemoryRepository, toClientMemory } from '../../utils/memory-repository'
import { parseMonthQuery, parseTypeQuery, parseYearQuery } from '../../utils/query'

export default defineEventHandler(async (event): Promise<MemoryListResponse> => {
  const query = getQuery(event)
  const year = query.year === undefined ? undefined : parseYearQuery(query.year)
  const month = query.month === undefined ? undefined : parseMonthQuery(query.month)
  const type = query.type === undefined ? undefined : parseTypeQuery(query.type)
  const repository = getServerMemoryRepository(event)
  return { memories: (await repository.getMemories({ year, month, type })).map(memory => toClientMemory(event, memory)) }
})
