import { readFile } from 'node:fs/promises'
import { extname } from 'node:path'
import exifr from 'exifr'
import type { ExifLocationSuggestion } from '../../app/types/location-discovery'
import type { Memory, MemoryLocation } from '../../app/types/memory'
import { resolveArchiveMediaPath } from '../repositories/filesystem-memory-repository'

export const EXIF_IMAGE_EXTENSIONS = new Set(['.avif', '.heic', '.jpeg', '.jpg', '.png', '.webp'])

type ExifReader = (data: Buffer) => Promise<unknown>

const readString = (value: unknown) => typeof value === 'string' && value.trim() ? value.trim() : undefined

const readCoordinate = (value: unknown, min: number, max: number) => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max ? value : undefined

export const normalizeExifLocation = (gps: unknown, tags: Record<string, unknown> = {}, media: Memory['media'][number]): ExifLocationSuggestion | null => {
  if (!gps || typeof gps !== 'object') return null
  const value = gps as Record<string, unknown>
  const latitude = readCoordinate(value.latitude, -90, 90)
  const longitude = readCoordinate(value.longitude, -180, 180)
  if (latitude === undefined || longitude === undefined || !media.path) return null

  const label = readString(tags.LocationName) || readString(tags.GPSAreaInformation) || readString(tags.SubLocation)
  const city = readString(tags.City)
  const country = readString(tags.Country)
  const location: MemoryLocation = {
    name: label || 'Photo location',
    ...(city ? { city } : {}),
    ...(country ? { country } : {}),
    latitude,
    longitude,
    precision: 'place',
    source: 'exif'
  }

  return {
    id: `exif-${media.path}`,
    media: { src: media.src, path: media.path, alt: media.alt, kind: media.kind },
    location
  }
}

const readExifTags = async (data: Buffer, readTags: ExifReader) => {
  try {
    const result = await readTags(data)
    return result && typeof result === 'object' ? result as Record<string, unknown> : {}
  } catch {
    return {}
  }
}

export const inspectExifLocations = async (
  archiveRoot: string,
  date: string,
  memory: Memory,
  options: { readGps?: ExifReader; readTags?: ExifReader } = {}
): Promise<ExifLocationSuggestion[]> => {
  const readGps = options.readGps || (data => exifr.gps(data))
  const readTags = options.readTags || (data => exifr.parse(data, { pick: ['LocationName', 'GPSAreaInformation', 'SubLocation', 'City', 'Country'] }))
  const suggestions: ExifLocationSuggestion[] = []

  for (const media of memory.media) {
    const extension = extname(media.path || media.src).toLowerCase()
    if ((media.kind !== 'image' && media.kind !== undefined) || !EXIF_IMAGE_EXTENSIONS.has(extension) || !media.path) continue
    const filePath = await resolveArchiveMediaPath(archiveRoot, date, media.path)
    if (!filePath) continue

    let data: Buffer
    try {
      data = await readFile(filePath)
    } catch {
      continue
    }

    let gps: unknown
    try {
      gps = await readGps(data)
    } catch {
      continue
    }
    if (!gps) continue
    const tags = await readExifTags(data, readTags)
    const suggestion = normalizeExifLocation(gps, tags, media)
    if (suggestion) suggestions.push(suggestion)
  }

  return suggestions
}
