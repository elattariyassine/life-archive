import { describe, expect, it } from 'vitest'
import { buildCalendarYear, getLongestGap, getOnThisDay, getRelatedMemories, pickRandomMemory, yearsAgoLabel } from './discovery'

const memory = (date: string, extra: Partial<{ tags: string[]; city: string; country: string }> = {}) => ({
  date,
  type: 'thought' as const,
  tags: extra.tags ?? [],
  location: extra.city || extra.country ? { name: extra.city ?? extra.country ?? '', city: extra.city, country: extra.country } : undefined
})

describe('on this day', () => {
  it('prefers exact anniversaries from earlier years', () => {
    const result = getOnThisDay([memory('2024-11-19'), memory('2025-11-19'), memory('2026-11-19'), memory('2025-11-18')], '2026-11-19')
    expect(result.kind).toBe('day')
    expect(result.memories.map(item => item.date)).toEqual(['2025-11-19', '2024-11-19'])
  })

  it('falls back to the surrounding week, wrapping around New Year', () => {
    const result = getOnThisDay([memory('2025-12-30'), memory('2025-01-10'), memory('2024-01-03')], '2026-01-01')
    expect(result.kind).toBe('week')
    expect(result.memories.map(item => item.date)).toEqual(['2025-12-30', '2024-01-03'])
    expect(getOnThisDay([memory('2025-06-01')], '2026-01-01').kind).toBe('none')
  })

  it('labels the distance in years', () => {
    expect(yearsAgoLabel('2025-11-19', '2026-11-19')).toBe('A year ago')
    expect(yearsAgoLabel('2020-11-19', '2026-11-19')).toBe('6 years ago')
  })
})

describe('related memories', () => {
  it('ranks shared place and tags above loose matches and explains why', () => {
    const current = memory('2026-07-02', { tags: ['summer', 'sea'], city: 'Lisbon', country: 'Portugal' })
    const related = getRelatedMemories(current, [
      current,
      memory('2025-07-04', { tags: ['summer'] }),
      memory('2024-02-01', { city: 'Lisbon', country: 'Portugal', tags: ['sea'] }),
      memory('2023-03-01', { country: 'Portugal' }),
      memory('2022-09-09')
    ])
    expect(related.map(item => item.memory.date)).toEqual(['2024-02-01', '2025-07-04', '2023-03-01'])
    expect(related[0]!.reason).toBe('Also in Lisbon')
    expect(related[1]!.reason).toBe('Also filed under summer')
  })
})

describe('random and calendar helpers', () => {
  it('avoids returning the current memory when there is a choice', () => {
    const memories = [memory('2026-01-01'), memory('2026-01-02')]
    expect(pickRandomMemory(memories, '2026-01-01', () => 0)?.date).toBe('2026-01-02')
    expect(pickRandomMemory([], undefined)).toBeUndefined()
  })

  it('builds Monday-first months and measures gaps', () => {
    const months = buildCalendarYear(2026)
    expect(months).toHaveLength(12)
    expect(months[0]!.offset).toBe(3)
    expect(months[1]!.days).toHaveLength(28)
    expect(buildCalendarYear(2024)[1]!.days).toHaveLength(29)
    expect(getLongestGap(['2026-01-01', '2026-01-05', '2026-01-06'])).toBe(3)
    expect(getLongestGap(['2026-01-01'])).toBe(0)
  })
})
