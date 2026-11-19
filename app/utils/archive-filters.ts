import { memoryTypes, type Memory, type MemoryType } from '../types/memory'
import { formatType } from './memory'

export interface ArchiveFilters {
  year?: number
  type?: MemoryType
  tag?: string
  mood?: string
  country?: string
  city?: string
}

export type ArchiveFilterKey = keyof ArchiveFilters

export const archiveFilterKeys: ArchiveFilterKey[] = ['year', 'type', 'tag', 'mood', 'country', 'city']

type QueryValue = string | null | undefined | Array<string | null>

const firstValue = (value: QueryValue) => {
  const scalar = Array.isArray(value) ? value[0] : value
  return typeof scalar === 'string' ? scalar.trim() : ''
}

export const parseArchiveFilters = (query: Record<string, QueryValue>): ArchiveFilters => {
  const filters: ArchiveFilters = {}
  const year = firstValue(query.year)
  if (/^\d{4}$/.test(year)) filters.year = Number(year)
  const type = firstValue(query.type)
  if (memoryTypes.includes(type as MemoryType)) filters.type = type as MemoryType
  for (const key of ['tag', 'mood', 'country', 'city'] as const) {
    const value = firstValue(query[key]).slice(0, 100)
    if (value) filters[key] = value
  }
  return filters
}

export const toArchiveFilterQuery = (filters: ArchiveFilters) => {
  const query: Record<string, string> = {}
  for (const key of archiveFilterKeys) {
    const value = filters[key]
    if (value !== undefined && value !== '') query[key] = String(value)
  }
  return query
}

export const hasArchiveFilters = (filters: ArchiveFilters) => archiveFilterKeys.some(key => filters[key] !== undefined && filters[key] !== '')

const sameText = (value: string | undefined, expected: string | undefined) => !expected || Boolean(value && value.toLocaleLowerCase() === expected.toLocaleLowerCase())

export const matchesArchiveFilters = (memory: Pick<Memory, 'date' | 'type' | 'tags' | 'mood' | 'location'>, filters: ArchiveFilters = {}) => {
  if (filters.year !== undefined && Number(memory.date.slice(0, 4)) !== filters.year) return false
  if (filters.type !== undefined && memory.type !== filters.type) return false
  if (filters.tag && !memory.tags.some(tag => sameText(tag, filters.tag))) return false
  if (!sameText(memory.mood?.label, filters.mood)) return false
  if (!sameText(memory.location?.country, filters.country)) return false
  if (!sameText(memory.location?.city, filters.city)) return false
  return true
}

export const describeArchiveFilters = (filters: ArchiveFilters) => archiveFilterKeys
  .filter(key => filters[key] !== undefined && filters[key] !== '')
  .map(key => {
    const value = filters[key]!
    const label = key === 'type' ? formatType(value as MemoryType) : key === 'tag' ? `#${value}` : String(value)
    return { key, label, kind: { year: 'Year', type: 'Type', tag: 'Tag', mood: 'Mood', country: 'Country', city: 'City' }[key] }
  })

export const archiveFilterLink = (path: string, filters: ArchiveFilters) => ({ path, query: toArchiveFilterQuery(filters) })

/** Link to the memories sharing this memory's place, preferring the most specific field. */
export const placeFilter = (location?: Memory['location']): ArchiveFilters | null => {
  if (location?.city) return { city: location.city }
  if (location?.country) return { country: location.country }
  return null
}
