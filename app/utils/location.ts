import type { MemoryLocation, MemoryLocationPrecision, MemoryLocationSource } from '~/types/memory'

const precisions: MemoryLocationPrecision[] = ['place', 'city', 'region', 'unknown']
const sources: MemoryLocationSource[] = ['manual', 'geocoding', 'exif', 'device']

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value)
const hasOwn = (value: Record<string, unknown>, key: string) => Object.prototype.hasOwnProperty.call(value, key)

const readOptionalString = (value: Record<string, unknown>, key: string) => {
  if (!hasOwn(value, key)) return { valid: true, value: undefined as string | undefined }
  if (typeof value[key] !== 'string') return { valid: false, value: undefined }
  const result = value[key].trim()
  return { valid: true, value: result || undefined }
}

const readCoordinate = (value: Record<string, unknown>, key: 'latitude' | 'longitude', min: number, max: number) => {
  if (!hasOwn(value, key)) return { valid: true, value: undefined as number | undefined }
  const coordinate = value[key]
  if (typeof coordinate !== 'number' || !Number.isFinite(coordinate) || coordinate < min || coordinate > max) return { valid: false, value: undefined }
  return { valid: true, value: coordinate }
}

export const normalizeMemoryLocation = (value: unknown, options: { scalarSource?: MemoryLocationSource } = {}): MemoryLocation | null | undefined => {
  if (value === undefined || value === null) return undefined

  if (typeof value === 'string') {
    const name = value.trim()
    return name ? { name, precision: 'unknown', ...(options.scalarSource ? { source: options.scalarSource } : {}) } : undefined
  }

  if (!isRecord(value) || typeof value.name !== 'string' || !value.name.trim()) return null

  const city = readOptionalString(value, 'city')
  const country = readOptionalString(value, 'country')
  const latitude = readCoordinate(value, 'latitude', -90, 90)
  const longitude = readCoordinate(value, 'longitude', -180, 180)
  const precision = readOptionalString(value, 'precision')
  const source = readOptionalString(value, 'source')

  if (!city.valid || !country.valid || !latitude.valid || !longitude.valid || !precision.valid || !source.valid) return null
  if ((latitude.value === undefined) !== (longitude.value === undefined)) return null
  if (precision.value && !precisions.includes(precision.value as MemoryLocationPrecision)) return null
  if (source.value && !sources.includes(source.value as MemoryLocationSource)) return null

  return {
    name: value.name.trim(),
    ...(city.value ? { city: city.value } : {}),
    ...(country.value ? { country: country.value } : {}),
    ...(latitude.value !== undefined ? { latitude: latitude.value } : {}),
    ...(longitude.value !== undefined ? { longitude: longitude.value } : {}),
    ...(precision.value ? { precision: precision.value as MemoryLocationPrecision } : {}),
    ...(source.value ? { source: source.value as MemoryLocationSource } : {})
  }
}

export const formatMemoryLocation = (location?: MemoryLocation) => {
  if (!location) return ''
  return [...new Set([location.name, location.city, location.country].filter(Boolean))].join(', ')
}

export const getMemoryLocationSearchText = (location?: MemoryLocation) => {
  if (!location) return ''
  return [location.name, location.city, location.country].filter(Boolean).join(' ')
}
