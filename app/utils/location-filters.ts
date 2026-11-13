import type { MemoryMapFilters, MemoryMapPoint } from '~/types/location-discovery'
import type { MemoryLocation } from '~/types/memory'

const includesText = (value: string | undefined, query: string | undefined) => !query || Boolean(value && value.toLocaleLowerCase().includes(query.toLocaleLowerCase()))

export const hasValidMemoryCoordinates = (location?: MemoryLocation) => Boolean(location && location.latitude !== undefined && location.longitude !== undefined && Number.isFinite(location.latitude) && Number.isFinite(location.longitude) && location.latitude >= -90 && location.latitude <= 90 && location.longitude >= -180 && location.longitude <= 180)

export const matchesMemoryMapFilters = (point: MemoryMapPoint, filters: MemoryMapFilters = {}) => {
  if (filters.year !== undefined && Number(point.date.slice(0, 4)) !== filters.year) return false
  if (filters.type !== undefined && point.type !== filters.type) return false
  if (filters.tag && !point.tags.some(tag => includesText(tag, filters.tag))) return false
  if (filters.mood && !includesText(point.mood?.label, filters.mood)) return false
  if (!includesText(point.location.country, filters.country)) return false
  if (!includesText(point.location.city, filters.city)) return false
  return true
}
