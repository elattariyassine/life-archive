import { fixtureMemories } from '../data/fixtures'
import type { Memory, MemoryFilters, MemoryRepository } from '../types/memory'

const sortByDate = (memories: Memory[]) => [...memories].sort((a, b) => b.date.localeCompare(a.date))

export function createFixtureMemoryRepository(memories: Memory[] = fixtureMemories): MemoryRepository {
  return {
    async getMemories(filters?: MemoryFilters) {
      return sortByDate(memories.filter((memory) => {
        if (filters?.year && !memory.date.startsWith(`${filters.year}-`)) return false
        if (filters?.month && memory.date.slice(5, 7) !== String(filters.month).padStart(2, '0')) return false
        return true
      }))
    },
    async getMemoryByDate(date) {
      return memories.find(memory => memory.date === date) ?? null
    },
    async getMemoriesByYear(year) {
      return sortByDate(memories.filter(memory => memory.date.startsWith(`${year}-`)))
    }
  }
}

export const memoryRepository = createFixtureMemoryRepository()
