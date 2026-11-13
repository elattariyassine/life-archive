import { fixtureMemories } from '../data/fixtures'
import type { MemoryMapFilters, MemoryMapPoint, MemoryMapRepository } from '../types/location-discovery'
import type { Memory, MemoryFilters, MemoryRepository } from '../types/memory'
import { hasValidMemoryCoordinates, matchesMemoryMapFilters } from '../utils/location-filters'

const sortByDate = (memories: Memory[]) => [...memories].sort((a, b) => b.date.localeCompare(a.date))

const toMapPoint = (memory: Memory): MemoryMapPoint | null => {
  const location = memory.location
  if (!hasValidMemoryCoordinates(location) || !location) return null
  return { date: memory.date, title: memory.title, type: memory.type, mood: memory.mood, tags: memory.tags, location, media: memory.media }
}

export function createFixtureMemoryRepository(memories: Memory[] = fixtureMemories): MemoryRepository & MemoryMapRepository {
  return {
    async getMemories(filters?: MemoryFilters) {
      return sortByDate(memories.filter((memory) => {
        if (filters?.year && !memory.date.startsWith(`${filters.year}-`)) return false
        if (filters?.month && memory.date.slice(5, 7) !== String(filters.month).padStart(2, '0')) return false
        if (filters?.type && memory.type !== filters.type) return false
        return true
      }))
    },
    async getMemoryByDate(date) {
      return memories.find(memory => memory.date === date) ?? null
    },
    async getMemoriesByYear(year) {
      return sortByDate(memories.filter(memory => memory.date.startsWith(`${year}-`)))
    },
    async getMemoryMapPoints(filters?: MemoryMapFilters) {
      const points = memories.map(toMapPoint).filter((point): point is MemoryMapPoint => Boolean(point))
      return points.filter(point => matchesMemoryMapFilters(point, filters))
    }
  }
}

export const memoryRepository = createFixtureMemoryRepository()
