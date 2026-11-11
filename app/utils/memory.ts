import type { Memory, MemoryType } from '~/types/memory'

export const formatMemoryDate = (date: string, options: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric', year: 'numeric' }) => {
  return new Intl.DateTimeFormat('en-US', { ...options, timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`))
}

export const formatMemoryDay = (date: string) => {
  return new Intl.DateTimeFormat('en-US', { day: '2-digit', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`))
}

export const formatMemoryMonth = (date: string) => {
  return new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`))
}

export const formatMemoryMonthYear = (date: string) => {
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`))
}

export const getMemoryYear = (date: string) => Number(date.slice(0, 4))

export const getMemoryMonth = (date: string) => date.slice(0, 7)

export const formatType = (type: MemoryType) => type.charAt(0).toUpperCase() + type.slice(1)

const imagePattern = /\.(avif|gif|heic|jpe?g|png|svg|webp)(?:[?#]|$)/i

export const getMemoryImages = (memory: Pick<Memory, 'media'>) => memory.media.filter(media => media.kind === 'image' || (!media.kind && imagePattern.test(media.path || media.src)))

export const groupMemoriesByYear = (memories: Memory[]) => {
  return memories.reduce<Record<number, Memory[]>>((groups, memory) => {
    const year = getMemoryYear(memory.date)
    groups[year] ??= []
    groups[year].push(memory)
    return groups
  }, {})
}

export const groupMemoriesByMonth = (memories: Memory[]) => {
  return memories.reduce<Record<string, Memory[]>>((groups, memory) => {
    const month = getMemoryMonth(memory.date)
    groups[month] ??= []
    groups[month].push(memory)
    return groups
  }, {})
}
