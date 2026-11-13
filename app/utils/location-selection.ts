import type { MemoryLocation } from '~/types/memory'

export const LOCATION_SEARCH_DEBOUNCE_MS = 300

export const createManualMemoryLocation = (name: string): MemoryLocation | undefined => {
  const trimmed = name.trim()
  return trimmed ? { name: trimmed, precision: 'unknown', source: 'manual' } : undefined
}

export const createMapMemoryLocation = (existing: MemoryLocation | undefined, latitude: number, longitude: number): MemoryLocation | undefined => {
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) return undefined
  return {
    name: existing?.name || 'Selected location',
    ...(existing?.city ? { city: existing.city } : {}),
    ...(existing?.country ? { country: existing.country } : {}),
    latitude,
    longitude,
    precision: 'place',
    source: 'manual'
  }
}

export const createDeviceMemoryLocation = (latitude: number, longitude: number): MemoryLocation | undefined => {
  const location = createMapMemoryLocation(undefined, latitude, longitude)
  return location ? { ...location, name: 'Current location', source: 'device' } : undefined
}

export const getDeviceLocationErrorMessage = (code: number) => {
  if (code === 1) return 'Location permission was denied. You can enter a place manually instead.'
  if (code === 2) return 'Your device could not determine a location. You can enter a place manually instead.'
  if (code === 3) return 'Location lookup timed out. You can enter a place manually instead.'
  return 'Your device location is unavailable. You can enter a place manually instead.'
}

export class InvalidDeviceLocationError extends Error {
  constructor() {
    super('The device returned invalid coordinates')
    this.name = 'InvalidDeviceLocationError'
  }
}

export const requestDeviceMemoryLocation = (geolocation: Pick<Geolocation, 'getCurrentPosition'>) => new Promise<MemoryLocation>((resolve, reject) => {
  geolocation.getCurrentPosition(
    position => {
      const location = createDeviceMemoryLocation(position.coords.latitude, position.coords.longitude)
      if (location) resolve(location)
      else reject(new InvalidDeviceLocationError())
    },
    reject,
    { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
  )
})

export const createDebouncedTask = (task: () => void, delay = LOCATION_SEARCH_DEBOUNCE_MS) => {
  let timeout: ReturnType<typeof setTimeout> | undefined
  return {
    schedule() {
      if (timeout) clearTimeout(timeout)
      timeout = setTimeout(task, delay)
    },
    cancel() {
      if (timeout) clearTimeout(timeout)
      timeout = undefined
    }
  }
}
