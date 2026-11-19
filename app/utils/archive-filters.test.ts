import { describe, expect, it } from 'vitest'
import { describeArchiveFilters, hasArchiveFilters, matchesArchiveFilters, parseArchiveFilters, placeFilter, toArchiveFilterQuery } from './archive-filters'

const memory = {
  date: '2026-07-02',
  type: 'travel' as const,
  tags: ['Summer', 'friends'],
  mood: { label: 'Calm', score: 7 },
  location: { name: 'Old port', city: 'Lisbon', country: 'Portugal' }
}

describe('archive filters', () => {
  it('parses only valid query values', () => {
    expect(parseArchiveFilters({ year: '2026', type: 'travel', tag: ' summer ', city: ['Lisbon', 'Porto'] })).toEqual({ year: 2026, type: 'travel', tag: 'summer', city: 'Lisbon' })
    expect(parseArchiveFilters({ year: '26', type: 'nope', tag: '' })).toEqual({})
  })

  it('round-trips through a query object', () => {
    const filters = { year: 2025, tag: 'home' }
    expect(parseArchiveFilters(toArchiveFilterQuery(filters))).toEqual(filters)
    expect(hasArchiveFilters({})).toBe(false)
    expect(hasArchiveFilters(filters)).toBe(true)
  })

  it('matches case-insensitively on exact values', () => {
    expect(matchesArchiveFilters(memory, { tag: 'summer', city: 'lisbon', mood: 'calm', year: 2026, type: 'travel' })).toBe(true)
    expect(matchesArchiveFilters(memory, { tag: 'sum' })).toBe(false)
    expect(matchesArchiveFilters(memory, { country: 'Spain' })).toBe(false)
    expect(matchesArchiveFilters({ ...memory, location: undefined }, { city: 'Lisbon' })).toBe(false)
  })

  it('describes active filters and builds place filters', () => {
    expect(describeArchiveFilters({ type: 'travel', tag: 'home' }).map(item => item.label)).toEqual(['Travel', '#home'])
    expect(placeFilter(memory.location)).toEqual({ city: 'Lisbon' })
    expect(placeFilter({ name: 'Somewhere', country: 'Portugal' })).toEqual({ country: 'Portugal' })
    expect(placeFilter({ name: 'Somewhere' })).toBeNull()
  })
})
