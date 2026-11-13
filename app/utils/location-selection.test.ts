import { afterEach, describe, expect, it, vi } from 'vitest'
import { createDebouncedTask, createDeviceMemoryLocation, createManualMemoryLocation, createMapMemoryLocation, getDeviceLocationErrorMessage, requestDeviceMemoryLocation } from './location-selection'

afterEach(() => vi.useRealTimers())

describe('location selection helpers', () => {
  it('keeps manual fallback text usable without coordinates', () => {
    expect(createManualMemoryLocation('  Essaouira  ')).toEqual({ name: 'Essaouira', precision: 'unknown', source: 'manual' })
    expect(createManualMemoryLocation('   ')).toBeUndefined()
  })

  it('debounces autocomplete work to the latest input', () => {
    vi.useFakeTimers()
    const task = vi.fn()
    const debounced = createDebouncedTask(task, 300)

    debounced.schedule()
    debounced.schedule()
    vi.advanceTimersByTime(299)
    expect(task).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(task).toHaveBeenCalledTimes(1)
  })

  it('creates manual map selections and preserves useful selected metadata', () => {
    expect(createMapMemoryLocation({ name: 'Jardin Majorelle', city: 'Marrakech', country: 'Morocco', source: 'geocoding' }, 31.6416, -8.0034)).toEqual({
      name: 'Jardin Majorelle',
      city: 'Marrakech',
      country: 'Morocco',
      latitude: 31.6416,
      longitude: -8.0034,
      precision: 'place',
      source: 'manual'
    })
    expect(createMapMemoryLocation(undefined, 91, 0)).toBeUndefined()
  })

  it('marks device coordinates as approximate device-sourced places', () => {
    expect(createDeviceMemoryLocation(31.6416, -8.0034)).toEqual({
      name: 'Current location',
      latitude: 31.6416,
      longitude: -8.0034,
      precision: 'place',
      source: 'device'
    })
    expect(getDeviceLocationErrorMessage(1)).toContain('permission was denied')
    expect(getDeviceLocationErrorMessage(3)).toContain('timed out')
  })

  it('requests device location only through the injected browser API', async () => {
    const success = {
      getCurrentPosition: (onSuccess: PositionCallback) => onSuccess({ coords: { latitude: 31.6416, longitude: -8.0034 } } as GeolocationPosition)
    }
    const denied = {
      getCurrentPosition: (_onSuccess: PositionCallback, onError: PositionErrorCallback) => onError({ code: 1, message: 'denied' } as GeolocationPositionError)
    }

    await expect(requestDeviceMemoryLocation(success)).resolves.toMatchObject({ source: 'device', latitude: 31.6416, longitude: -8.0034 })
    await expect(requestDeviceMemoryLocation(denied)).rejects.toMatchObject({ code: 1 })
  })
})
