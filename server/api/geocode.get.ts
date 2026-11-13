import type { GeocodeResponse } from '../../app/types/geocoding'
import { parseGeocodeQuery } from '../utils/query'
import { GeocodingProviderError, getGeocodingProvider, MAX_GEOCODING_RESULTS } from '../utils/geocoding'

export default defineEventHandler(async (event): Promise<GeocodeResponse> => {
  const query = getQuery(event)
  const searchQuery = parseGeocodeQuery(query.q)
  const config = useRuntimeConfig(event)

  try {
    return { results: await getGeocodingProvider(config).search(searchQuery, MAX_GEOCODING_RESULTS) }
  } catch (error) {
    if (error instanceof GeocodingProviderError) throw createError({ statusCode: 502, statusMessage: 'The geocoding service is unavailable' })
    throw error
  }
})
