import type { MemorySummaryListResponse } from '../../app/types/memory-api'
import { getServerMemoryRepository } from '../utils/memory-repository'
import { toMemorySummary } from '../utils/memory-summary'

/** Every memory without its Markdown body: the shared index for lists, grids, calendars, and navigation. */
export default defineEventHandler(async (event): Promise<MemorySummaryListResponse> => {
  const memories = await getServerMemoryRepository(event).getMemories()
  return { memories: memories.map(toMemorySummary) }
})
