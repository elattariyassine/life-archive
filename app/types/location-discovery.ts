import type { MemoryMedia, MemoryLocation, MemoryType, Mood } from './memory'

export interface ExifLocationSuggestion {
  id: string
  media: Pick<MemoryMedia, 'src' | 'path' | 'alt' | 'kind'>
  location: MemoryLocation
}

export interface ExifLocationResponse {
  suggestions: ExifLocationSuggestion[]
}

export interface MemoryMapFilters {
  year?: number
  type?: MemoryType
  tag?: string
  mood?: string
  country?: string
  city?: string
}

export interface MemoryMapPoint {
  date: string
  title: string
  type: MemoryType
  mood?: Mood
  tags: string[]
  location: MemoryLocation
  media: MemoryMedia[]
}

export interface MemoryMapResponse {
  points: MemoryMapPoint[]
}

export interface MemoryMapFilterOptions {
  years: number[]
  tags: string[]
  moods: string[]
  countries: string[]
  cities: string[]
}

export interface MemoryMapRepository {
  getMemoryMapPoints(filters?: MemoryMapFilters): Promise<MemoryMapPoint[]>
}
