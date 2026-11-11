export const memoryTypes = ['highlight', 'thought', 'experience', 'travel', 'milestone', 'letter'] as const

export type MemoryType = (typeof memoryTypes)[number]

export interface Mood {
  label: string
  score: number
}

export interface MemoryMedia {
  src: string
  alt: string
  caption?: string
  path?: string
}

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
  location?: string
  excerpt: string
  content: string
  media: MemoryMedia[]
  music?: MemoryMusic
  version?: string
}

export interface MemoryFilters {
  year?: number
  month?: number
}

export interface MemoryDraft {
  date: string
  title: string
  type: MemoryType
  mood?: Mood
  tags: string[]
  location?: string
  music?: MemoryMusic
  content: string
}

export interface MemoryWriteRepository {
  createMemory(draft: MemoryDraft): Promise<Memory>
  updateMemory(date: string, draft: MemoryDraft, expectedVersion: string): Promise<Memory>
  deleteMemory(date: string, expectedVersion: string): Promise<void>
  uploadMedia(date: string, file: File, expectedVersion: string): Promise<MemoryMedia>
  removeMedia(date: string, mediaPath: string, expectedVersion: string): Promise<Memory>
}

export interface MemoryRepository {
  getMemories(filters?: MemoryFilters): Promise<Memory[]>
  getMemoryByDate(date: string): Promise<Memory | null>
  getMemoriesByYear(year: number): Promise<Memory[]>
}
