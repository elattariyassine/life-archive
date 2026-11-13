import type { GeocodeSuggestion } from '../../app/types/geocoding'
import type { MemoryLocation, MemoryLocationPrecision } from '../../app/types/memory'

export const DEFAULT_PHOTON_URL = 'https://photon.komoot.io/api'
export const GEOCODING_TIMEOUT_MS = 5000
export const MAX_GEOCODING_RESULTS = 5

export interface GeocodingProvider {
  search(query: string, limit?: number): Promise<GeocodeSuggestion[]>
  reverse(latitude: number, longitude: number): Promise<MemoryLocation | undefined>
}

export class GeocodingProviderError extends Error {
  constructor(message = 'The geocoding provider is unavailable') {
    super(message)
    this.name = 'GeocodingProviderError'
  }
}

type RecordValue = Record<string, unknown>

const isRecord = (value: unknown): value is RecordValue => Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const readString = (record: RecordValue, key: string) => typeof record[key] === 'string' && record[key].trim() ? record[key].trim() : undefined

const firstString = (record: RecordValue, keys: string[]) => keys.map(key => readString(record, key)).find(Boolean)

const firstIdentifier = (record: RecordValue, keys: string[]) => keys.map(key => {
  const value = record[key]
  return typeof value === 'string' || typeof value === 'number' ? String(value) : undefined
}).find(Boolean)

const getPrecision = (properties: RecordValue): MemoryLocationPrecision => {
  const type = (firstString(properties, ['type', 'osm_value']) || '').toLowerCase()
  if (['city', 'town', 'village', 'municipality'].includes(type)) return 'city'
  if (['state', 'county', 'region', 'district', 'province'].includes(type)) return 'region'
  if (type === 'country') return 'region'
  if (type) return 'place'
  return 'unknown'
}

const getPlaceName = (properties: RecordValue) => {
  const namedPlace = firstString(properties, ['name', 'locality', 'amenity', 'tourism', 'landmark'])
  if (namedPlace) return namedPlace

  const street = firstString(properties, ['street'])
  const houseNumber = firstString(properties, ['housenumber'])
  if (street && houseNumber) return `${houseNumber} ${street}`
  return street || firstString(properties, ['city', 'town', 'village', 'municipality', 'county', 'state', 'country'])
}

const getCity = (properties: RecordValue) => firstString(properties, ['city', 'town', 'village', 'municipality'])

export const normalizePhotonFeature = (feature: unknown, index = 0): GeocodeSuggestion | null => {
  if (!isRecord(feature) || !isRecord(feature.properties) || !isRecord(feature.geometry)) return null
  const coordinates = feature.geometry.coordinates
  if (!Array.isArray(coordinates) || typeof coordinates[0] !== 'number' || typeof coordinates[1] !== 'number') return null

  const longitude = coordinates[0]
  const latitude = coordinates[1]
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180 || !Number.isFinite(latitude) || latitude < -90 || latitude > 90) return null

  const properties = feature.properties
  const name = getPlaceName(properties)
  if (!name) return null

  const city = getCity(properties)
  const country = firstString(properties, ['country'])
  const location = {
    name,
    ...(city ? { city } : {}),
    ...(country ? { country } : {}),
    latitude,
    longitude,
    precision: getPrecision(properties),
    source: 'geocoding' as const
  }
  const id = firstIdentifier(properties, ['osm_id']) || (typeof feature.id === 'string' || typeof feature.id === 'number' ? String(feature.id) : `${name}-${latitude}-${longitude}-${index}`)

  return {
    id: `${firstString(properties, ['osm_type']) || 'photon'}-${id}`,
    label: [...new Set([location.name, location.city, location.country].filter(Boolean))].join(', '),
    location
  }
}

const getFetch = (fetchImpl?: typeof fetch) => fetchImpl || globalThis.fetch

export const createPhotonProvider = (options: { baseUrl?: string; fetchImpl?: typeof fetch } = {}): GeocodingProvider => {
  const baseUrl = options.baseUrl || DEFAULT_PHOTON_URL
  const fetchImpl = getFetch(options.fetchImpl)

  return {
    async search(query, limit = MAX_GEOCODING_RESULTS) {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), GEOCODING_TIMEOUT_MS)

      try {
        const url = new URL(baseUrl)
        url.searchParams.set('q', query)
        url.searchParams.set('limit', String(Math.min(Math.max(limit, 1), MAX_GEOCODING_RESULTS)))
        const response = await fetchImpl(url, { headers: { Accept: 'application/json' }, signal: controller.signal })
        if (!response.ok) throw new GeocodingProviderError()
        const payload: unknown = await response.json()
        if (!isRecord(payload) || !Array.isArray(payload.features)) throw new GeocodingProviderError('The geocoding response was invalid')
        return payload.features
          .map((feature, index) => normalizePhotonFeature(feature, index))
          .filter((result): result is GeocodeSuggestion => Boolean(result))
          .slice(0, MAX_GEOCODING_RESULTS)
      } catch (error) {
        if (error instanceof GeocodingProviderError) throw error
        throw new GeocodingProviderError()
      } finally {
        clearTimeout(timeout)
      }
    },
    async reverse(latitude, longitude) {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), GEOCODING_TIMEOUT_MS)
      try {
        const url = new URL(baseUrl)
        url.searchParams.set('lat', String(latitude))
        url.searchParams.set('lon', String(longitude))
        const response = await fetchImpl(url, { headers: { Accept: 'application/json' }, signal: controller.signal })
        if (!response.ok) throw new GeocodingProviderError()
        const payload: unknown = await response.json()
        if (!isRecord(payload) || !Array.isArray(payload.features)) throw new GeocodingProviderError('The geocoding response was invalid')
        const result = normalizePhotonFeature(payload.features[0], 0)
        return result?.location
      } catch (error) {
        if (error instanceof GeocodingProviderError) throw error
        throw new GeocodingProviderError()
      } finally {
        clearTimeout(timeout)
      }
    }
  }
}

export const getGeocodingProvider = (config: { geocodingProvider?: unknown; photonUrl?: unknown }): GeocodingProvider => {
  const provider = config.geocodingProvider === undefined || config.geocodingProvider === '' ? 'photon' : config.geocodingProvider
  if (provider !== 'photon') throw new GeocodingProviderError('Unsupported geocoding provider')
  return createPhotonProvider({ baseUrl: typeof config.photonUrl === 'string' && config.photonUrl ? config.photonUrl : DEFAULT_PHOTON_URL })
}
