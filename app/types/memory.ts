export const memoryTypes = ['highlight', 'thought', 'experience', 'travel', 'milestone', 'letter'] as const

export type MemoryType = (typeof memoryTypes)[number]

export interface Mood {
  label: string
  score: number
}

export type MemoryLocationPrecision = 'place' | 'city' | 'region' | 'unknown'
export type MemoryLocationSource = 'manual' | 'geocoding' | 'exif' | 'device'

export interface MemoryLocation {
  name: string
  city?: string
  country?: string
  latitude?: number
  longitude?: number
  precision?: MemoryLocationPrecision
  source?: MemoryLocationSource
}

export interface MemoryMedia {
  src: string
  alt: string
  path?: string
  kind?: MemoryMediaKind
  /** A smaller rendition for grids and lists; falls back to `src` when absent. */
  thumb?: string
}

export type MemoryMediaKind = 'image' | 'video' | 'audio' | 'document'

export interface MemoryMusic {
  title: string
  artist: string
  url: string
}

export interface Memory {
  date: string
  title: string
  type: MemoryType
  mood?: Mood
  tags: string[]
  location?: MemoryLocation
  excerpt: string
  content: string
  media: MemoryMedia[]
  music?: MemoryMusic
  version?: string
  folderPath?: string
}

/** The lightweight shape used by lists, grids, and navigation: everything except the Markdown body. */
export interface MemorySummary extends Pick<Memory, 'date' | 'title' | 'type' | 'mood' | 'tags' | 'location' | 'excerpt' | 'media' | 'music'> {
  wordCount: number
  draft: boolean
}

export interface MemoryFilters {
  year?: number
  month?: number
  type?: MemoryType
}

export type MemorySearchMatch = 'title' | 'content' | 'tag' | 'location' | 'type' | 'date'

export interface MemorySearchFilters {
  query: string
  year?: number
  type?: MemoryType
}

export interface MemorySearchResult {
  memory: Pick<Memory, 'date' | 'title' | 'type' | 'tags' | 'location' | 'media'>
  matches: MemorySearchMatch[]
  excerpt: string
}

export interface MemorySearchRepository {
  searchMemories(filters: MemorySearchFilters): Promise<MemorySearchResult[]>
}

export interface MemoryCreateInput {
  date: string
  title: string
  type: MemoryType
  mood?: Mood
  tags: string[]
  location?: string | MemoryLocation
}

export interface MemoryWriteRepository {
  createMemory(input: MemoryCreateInput): Promise<Memory>
  updateMemoryLocation(date: string, expectedVersion: string, location: MemoryLocation): Promise<Memory>
  deleteMemory(date: string, expectedVersion: string): Promise<void>
}

export interface MemorySummaryRepository {
  getMemorySummaries(): Promise<MemorySummary[]>
}

export interface MemoryRepository {
  getMemories(filters?: MemoryFilters): Promise<Memory[]>
  getMemoryByDate(date: string): Promise<Memory | null>
  getMemoriesByYear(year: number): Promise<Memory[]>
}
