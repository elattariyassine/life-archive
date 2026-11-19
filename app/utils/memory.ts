import type { Memory, MemoryType } from '~/types/memory'

export type MemoryOrigin = 'home' | 'timeline' | 'gallery' | 'search' | 'map' | 'calendar'

export const getMemoryPath = (date: string, origin?: MemoryOrigin) => origin ? `/memory/${date}?from=${origin}` : `/memory/${date}`

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
const videoPattern = /\.(mov|mp4|webm)(?:[?#]|$)/i

export const getMemoryImages = (memory: Pick<Memory, 'media'>) => memory.media.filter(media => media.kind === 'image' || (!media.kind && imagePattern.test(media.path || media.src)))
export const getMemoryVisualMedia = (memory: Pick<Memory, 'media'>) => memory.media.filter(media => media.kind === 'image' || media.kind === 'video' || (!media.kind && (imagePattern.test(media.path || media.src) || videoPattern.test(media.path || media.src))))

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

/** Words of prose, ignoring headings, HTML, media embeds, and Markdown punctuation. */
export const countMemoryWords = (content: string) => content
  .replace(/<!--[\s\S]*?-->/g, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
  .split(/\r?\n/)
  .filter(line => !/^\s*#{1,6}\s/.test(line))
  .join(' ')
  .replace(/[#>*_`~[\]()-]/g, ' ')
  .split(/\s+/)
  .filter(word => /[\p{L}\p{N}]/u.test(word)).length

/** A memory is a draft until something beyond headings has been written or embedded. */
export const isMemoryDraft = (content: string) => !content
  .replace(/<!--[\s\S]*?-->/g, '')
  .split(/\r?\n/)
  .some(line => line.trim() && !/^\s*#{1,6}\s/.test(line))

export const formatReadingTime = (words: number) => words < 60 ? 'Under a minute' : `${Math.round(words / 220) || 1} min read`

export const summarizeMemoryMedia = (memory: Pick<Memory, 'media'>) => {
  const counts = { image: 0, video: 0, audio: 0, document: 0 }
  for (const media of memory.media) {
    const path = media.path || media.src
    const kind = media.kind ?? (imagePattern.test(path) ? 'image' : videoPattern.test(path) ? 'video' : /\.(mp3|m4a|wav|ogg|opus)(?:[?#]|$)/i.test(path) ? 'audio' : 'document')
    counts[kind] += 1
  }
  const parts: string[] = []
  if (counts.image) parts.push(`${counts.image} ${counts.image === 1 ? 'photo' : 'photos'}`)
  if (counts.video) parts.push(`${counts.video} ${counts.video === 1 ? 'video' : 'videos'}`)
  if (counts.audio) parts.push(`${counts.audio} ${counts.audio === 1 ? 'recording' : 'recordings'}`)
  if (counts.document) parts.push(`${counts.document} ${counts.document === 1 ? 'document' : 'documents'}`)
  return parts
}
