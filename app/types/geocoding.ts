import type { MemoryLocation } from './memory'

export interface GeocodeSuggestion {
  id: string
  label: string
  location: MemoryLocation
}

export interface GeocodeResponse {
  results: GeocodeSuggestion[]
}
