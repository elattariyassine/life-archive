import { describe, expect, it } from 'vitest'
import type { MemoryMapPoint } from '~/types/location-discovery'
import { hasValidMemoryCoordinates, matchesMemoryMapFilters } from './location-filters'

const point: MemoryMapPoint = {
  date: '2026-08-15',
  title: 'The blue hour',
  type: 'travel',
  mood: { label: 'Grateful', score: 9 },
  tags: ['summer', 'sea'],
  location: { name: 'Essaouira', city: 'Essaouira', country: 'Morocco', latitude: 31, longitude: -9, precision: 'place', source: 'manual' },
  media: []
}

describe('map filters', () => {
  it('combines year, type, tag, mood, country, and city filters', () => {
    expect(matchesMemoryMapFilters(point, { year: 2026, type: 'travel', tag: 'sum', mood: 'grat', country: 'mor', city: 'essa' })).toBe(true)
    expect(matchesMemoryMapFilters(point, { year: 2025, type: 'travel' })).toBe(false)
    expect(matchesMemoryMapFilters(point, { year: 2026, type: 'thought' })).toBe(false)
    expect(matchesMemoryMapFilters(point, { year: 2026, tag: 'winter', mood: 'tired', country: 'France', city: 'Paris' })).toBe(false)
  })

  it('accepts only finite coordinate pairs within geographic bounds', () => {
    expect(hasValidMemoryCoordinates(point.location)).toBe(true)
    expect(hasValidMemoryCoordinates({ name: 'Bad', latitude: 91, longitude: 0 })).toBe(false)
    expect(hasValidMemoryCoordinates({ name: 'Partial', latitude: 1 })).toBe(false)
  })
})
