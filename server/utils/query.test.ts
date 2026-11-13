import { describe, expect, it } from 'vitest'
import { parseCoordinateQuery, parseGeocodeQuery } from './query'

describe('geocoding query validation', () => {
  it('trims valid queries and rejects empty or oversized values', () => {
    expect(parseGeocodeQuery('  Kyoto  ')).toBe('Kyoto')
    expect(() => parseGeocodeQuery(undefined)).toThrow('Invalid geocoding query')
    expect(() => parseGeocodeQuery('x')).toThrow('Invalid geocoding query')
    expect(() => parseGeocodeQuery('x'.repeat(121))).toThrow('Invalid geocoding query')
  })

  it('validates reverse-geocoding coordinate bounds', () => {
    expect(parseCoordinateQuery('31.6', -90, 90)).toBe(31.6)
    expect(() => parseCoordinateQuery('91', -90, 90)).toThrow('Invalid coordinate')
    expect(() => parseCoordinateQuery(['31'], -90, 90)).toThrow('Invalid coordinate')
  })
})
