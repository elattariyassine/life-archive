import type { MemoryMapFilters, MemoryMapPoint } from '~/types/location-discovery'
import type { MemoryLocation } from '~/types/memory'
import { matchesArchiveFilters } from './archive-filters'


export const hasValidMemoryCoordinates = (location?: MemoryLocation) => Boolean(location && location.latitude !== undefined && location.longitude !== undefined && Number.isFinite(location.latitude) && Number.isFinite(location.longitude) && location.latitude >= -90 && location.latitude <= 90 && location.longitude >= -180 && location.longitude <= 180)

export const matchesMemoryMapFilters = (point: MemoryMapPoint, filters: MemoryMapFilters = {}) => matchesArchiveFilters(point, filters)
