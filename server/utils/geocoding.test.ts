import { describe, expect, it, vi } from 'vitest'
import { createPhotonProvider, GeocodingProviderError, normalizePhotonFeature } from './geocoding'

const feature = (overrides: Record<string, unknown> = {}) => ({
  type: 'Feature',
  id: 'N123',
  properties: {
    osm_type: 'N',
    osm_id: 123,
    name: 'Jardin Majorelle',
    type: 'tourism',
    city: 'Marrakech',
    country: 'Morocco',
    ...overrides
  },
  geometry: { type: 'Point', coordinates: [-8.0034, 31.6416] }
})

describe('Photon geocoding provider', () => {
  it('normalizes place, city, country, coordinates, source, and precision', () => {
    expect(normalizePhotonFeature(feature())).toEqual({
      id: 'N-123',
      label: 'Jardin Majorelle, Marrakech, Morocco',
      location: {
        name: 'Jardin Majorelle',
        city: 'Marrakech',
        country: 'Morocco',
        latitude: 31.6416,
        longitude: -8.0034,
        precision: 'place',
        source: 'geocoding'
      }
    })
  })

  it('assigns city precision from a city result and builds address names', () => {
    expect(normalizePhotonFeature(feature({ name: undefined, type: 'city', city: 'Marrakech' }))).toMatchObject({
      location: { name: 'Marrakech', city: 'Marrakech', precision: 'city' }
    })
    expect(normalizePhotonFeature(feature({ name: undefined, type: 'house', housenumber: '12', street: 'Rue Example' }))).toMatchObject({
      location: { name: '12 Rue Example', precision: 'place' }
    })
  })

  it('rejects malformed provider features and coordinates', () => {
    expect(normalizePhotonFeature({})).toBeNull()
    expect(normalizePhotonFeature(feature({ type: 'city' }))).not.toBeNull()
    expect(normalizePhotonFeature({ ...feature(), geometry: { coordinates: [181, 0] } })).toBeNull()
    expect(normalizePhotonFeature({ ...feature(), geometry: { coordinates: [0] } })).toBeNull()
  })

  it('sends only the explicit query, caps results, and normalizes the response', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ features: Array.from({ length: 8 }, (_, index) => feature({ name: `Place ${index}` })) }), { status: 200 }))
    const provider = createPhotonProvider({ baseUrl: 'https://photon.example/api', fetchImpl })

    const results = await provider.search('Marrakech old city', 20)

    expect(results).toHaveLength(5)
    const request = fetchImpl.mock.calls[0]?.[0] as URL
    expect(request.toString()).toBe('https://photon.example/api?q=Marrakech+old+city&limit=5')
    expect(request.searchParams.has('title')).toBe(false)
  })

  it('turns provider failures and invalid payloads into safe provider errors', async () => {
    const failedFetch = vi.fn<typeof fetch>().mockResolvedValue(new Response('', { status: 503 }))
    const invalidFetch = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ nope: true }), { status: 200 }))

    await expect(createPhotonProvider({ fetchImpl: failedFetch }).search('Paris')).rejects.toBeInstanceOf(GeocodingProviderError)
    await expect(createPhotonProvider({ fetchImpl: invalidFetch }).search('Paris')).rejects.toBeInstanceOf(GeocodingProviderError)
  })

  it('uses coordinates only for explicit reverse geocoding', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ features: [feature()] }), { status: 200 }))
    const location = await createPhotonProvider({ baseUrl: 'https://photon.example/api', fetchImpl }).reverse(31, -9)

    expect(location).toMatchObject({ source: 'geocoding', latitude: 31.6416, longitude: -8.0034 })
    const request = fetchImpl.mock.calls[0]?.[0] as URL
    expect(request.searchParams.get('lat')).toBe('31')
    expect(request.searchParams.get('lon')).toBe('-9')
    expect(request.searchParams.has('q')).toBe(false)
  })
})
