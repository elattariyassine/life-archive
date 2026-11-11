import type { MemorySearchResponse } from '../../app/types/memory-api'
import { searchMemories } from '../utils/memory-search'
import { getServerMemoryRepository } from '../utils/memory-repository'
import { parseSearchQuery, parseTypeQuery, parseYearQuery } from '../utils/query'

export default defineEventHandler(async (event): Promise<MemorySearchResponse> => {
  const query = getQuery(event)
  const searchQuery = parseSearchQuery(query.q)
  const year = query.year === undefined ? undefined : parseYearQuery(query.year)
  const type = query.type === undefined ? undefined : parseTypeQuery(query.type)
  if (!searchQuery) return { results: [] }

  const memories = await getServerMemoryRepository(event).getMemories({ year, type })
  return { results: searchMemories(memories, searchQuery) }
})
