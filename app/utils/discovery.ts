import type { Memory } from '../types/memory'

type DatedMemory = Pick<Memory, 'date'>
type RelatableMemory = Pick<Memory, 'date' | 'tags' | 'location' | 'type'>

const DAY = 86_400_000

const toUtc = (date: string) => Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)))

export const toIsoDate = (value: Date) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`

/** Days between two calendar positions (month/day), ignoring the year and wrapping around New Year. */
const seasonalDistance = (date: string, reference: string) => {
  const referenceYear = Number(reference.slice(0, 4))
  const target = toUtc(reference)
  const monthDay = date.slice(4)
  return Math.min(...[referenceYear - 1, referenceYear, referenceYear + 1].map(year => Math.abs(toUtc(`${year}${monthDay}`) - target) / DAY))
}

export const yearsAgoLabel = (date: string, today: string) => {
  const years = Number(today.slice(0, 4)) - Number(date.slice(0, 4))
  return years === 1 ? 'A year ago' : `${years} years ago`
}

/** Memories from earlier years on the same day, or within a few days of it when that day is empty. */
export const getOnThisDay = <T extends DatedMemory>(memories: T[], today: string, windowDays = 3) => {
  const earlier = memories.filter(memory => memory.date.slice(0, 4) < today.slice(0, 4))
  const exact = earlier.filter(memory => memory.date.slice(5) === today.slice(5))
  if (exact.length) return { kind: 'day' as const, memories: exact.sort((a, b) => b.date.localeCompare(a.date)) }
  const nearby = earlier
    .map(memory => ({ memory, distance: seasonalDistance(memory.date, today) }))
    .filter(item => item.distance <= windowDays)
    .sort((a, b) => a.distance - b.distance || b.memory.date.localeCompare(a.memory.date))
    .map(item => item.memory)
  return { kind: nearby.length ? 'week' as const : 'none' as const, memories: nearby }
}

export interface RelatedMemory<T> {
  memory: T
  reason: string
}

/** Rank other memories by shared tags, shared place, and the same season in another year. */
export const getRelatedMemories = <T extends RelatableMemory>(current: RelatableMemory, memories: T[], limit = 3): RelatedMemory<T>[] => {
  const currentTags = new Set(current.tags.map(tag => tag.toLocaleLowerCase()))
  return memories
    .filter(memory => memory.date !== current.date)
    .map(memory => {
      const sharedTags = memory.tags.filter(tag => currentTags.has(tag.toLocaleLowerCase()))
      const sameCity = Boolean(current.location?.city && memory.location?.city?.toLocaleLowerCase() === current.location.city.toLocaleLowerCase())
      const sameCountry = !sameCity && Boolean(current.location?.country && memory.location?.country?.toLocaleLowerCase() === current.location.country.toLocaleLowerCase())
      const sameSeason = memory.date.slice(0, 4) !== current.date.slice(0, 4) && seasonalDistance(memory.date, current.date) <= 7
      const score = sharedTags.length * 2 + (sameCity ? 3 : 0) + (sameCountry ? 1 : 0) + (sameSeason ? 2 : 0)
      const reason = sameCity ? `Also in ${memory.location!.city}`
        : sharedTags.length ? `Also filed under ${sharedTags.slice(0, 2).join(', ')}`
          : sameSeason ? `Same week, ${memory.date.slice(0, 4)}`
            : sameCountry ? `Also in ${memory.location!.country}`
              : ''
      return { memory, score, reason }
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score || Math.abs(toUtc(a.memory.date) - toUtc(current.date)) - Math.abs(toUtc(b.memory.date) - toUtc(current.date)))
    .slice(0, limit)
    .map(({ memory, reason }) => ({ memory, reason }))
}

export const pickRandomMemory = <T extends DatedMemory>(memories: T[], excludeDate?: string, random = Math.random) => {
  const candidates = memories.length > 1 && excludeDate ? memories.filter(memory => memory.date !== excludeDate) : memories
  return candidates.length ? candidates[Math.floor(random() * candidates.length)] : undefined
}

export interface CalendarDay {
  date: string
  day: number
}

export interface CalendarMonth {
  month: string
  /** Leading empty cells so the first day sits under its weekday (weeks start on Monday). */
  offset: number
  days: CalendarDay[]
}

export const buildCalendarYear = (year: number): CalendarMonth[] => Array.from({ length: 12 }, (_, index) => {
  const month = `${year}-${String(index + 1).padStart(2, '0')}`
  const daysInMonth = new Date(Date.UTC(year, index + 1, 0)).getUTCDate()
  const offset = (new Date(Date.UTC(year, index, 1)).getUTCDay() + 6) % 7
  return {
    month,
    offset,
    days: Array.from({ length: daysInMonth }, (_, day) => ({ date: `${month}-${String(day + 1).padStart(2, '0')}`, day: day + 1 }))
  }
})

/** The longest run of consecutive days without a memory between the first and last memory of a set. */
export const getLongestGap = (dates: string[]) => {
  const sorted = [...dates].sort()
  let longest = 0
  for (let index = 1; index < sorted.length; index += 1) {
    longest = Math.max(longest, Math.round((toUtc(sorted[index]!) - toUtc(sorted[index - 1]!)) / DAY) - 1)
  }
  return longest
}
