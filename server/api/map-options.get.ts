import type { MemoryMapFilterOptions } from '../../app/types/location-discovery'
import { getServerMemoryRepository } from '../utils/memory-repository'

const uniqueSorted = (values: string[]) => [...new Set(values.map(value => value.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b))

export default defineEventHandler(async (event): Promise<MemoryMapFilterOptions> => {
  const memories = await getServerMemoryRepository(event).getMemories()
  return {
    years: [...new Set(memories.map(memory => Number(memory.date.slice(0, 4))))].sort((a, b) => b - a),
    tags: uniqueSorted(memories.flatMap(memory => memory.tags)),
    moods: uniqueSorted(memories.map(memory => memory.mood?.label || '')),
    countries: uniqueSorted(memories.map(memory => memory.location?.country || '')),
    cities: uniqueSorted(memories.map(memory => memory.location?.city || ''))
  }
})
