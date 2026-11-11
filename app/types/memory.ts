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
}

export interface MemoryFilters {
  year?: number
  month?: number
}

export interface MemoryRepository {
  getMemories(filters?: MemoryFilters): Promise<Memory[]>
  getMemoryByDate(date: string): Promise<Memory | null>
  getMemoriesByYear(year: number): Promise<Memory[]>
}
