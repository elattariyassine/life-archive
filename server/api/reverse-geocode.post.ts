import type { MemoryLocation } from '../../app/types/memory'
import { GeocodingProviderError, getGeocodingProvider } from '../utils/geocoding'
import { parseCoordinateQuery } from '../utils/query'

type ReverseGeocodeBody = {
  latitude?: unknown
  longitude?: unknown
}

export default defineEventHandler(async (event): Promise<{ location?: MemoryLocation }> => {
  const body = await readBody<ReverseGeocodeBody>(event)
  const latitude = parseCoordinateQuery(body?.latitude, -90, 90)
  const longitude = parseCoordinateQuery(body?.longitude, -180, 180)
  try {
    return { location: await getGeocodingProvider(useRuntimeConfig(event)).reverse(latitude, longitude) }
  } catch (error) {
    if (error instanceof GeocodingProviderError) throw createError({ statusCode: 502, statusMessage: 'The geocoding service is unavailable' })
    throw error
  }
})
