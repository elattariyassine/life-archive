import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Memory } from '../../app/types/memory'
import { ArchivePathError } from '../repositories/filesystem-memory-repository'
import { inspectExifLocations, normalizeExifLocation } from './exif-location'

const temporaryDirectories: string[] = []

const createArchive = async () => {
  const root = await mkdtemp(join(tmpdir(), 'life-archive-exif-test-'))
  temporaryDirectories.push(root)
  return root
}

const memoryWithMedia = (media: Memory['media']): Memory => ({
  date: '2026-12-01',
  title: 'Photographs',
  type: 'travel',
  tags: [],
  excerpt: '',
  content: '',
  media
})

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map(directory => rm(directory, { recursive: true, force: true })))
})

describe('EXIF location inspection', () => {
  it('normalizes GPS coordinates and optional readable EXIF place labels', () => {
    const result = normalizeExifLocation({ latitude: 31.6416, longitude: -8.0034 }, { City: 'Marrakech', Country: 'Morocco' }, { src: '/photo.jpg', path: 'photo.jpg', alt: 'Photo', kind: 'image' })

    expect(result).toMatchObject({
      media: { path: 'photo.jpg' },
      location: { name: 'Photo location', city: 'Marrakech', country: 'Morocco', latitude: 31.6416, longitude: -8.0034, source: 'exif' }
    })
  })

  it('finds multiple supported image locations and skips images without GPS or unsupported files', async () => {
    const root = await createArchive()
    const mediaRoot = join(root, '2026', '12', '01', 'media')
    await mkdir(mediaRoot, { recursive: true })
    await Promise.all(['one.jpg', 'two.png', 'three.svg', 'four.jpg'].map(file => writeFile(join(mediaRoot, file), file)))
    const readGps = vi.fn(async (data: Buffer) => data.toString() === 'one.jpg' ? { latitude: 1, longitude: 2 } : data.toString() === 'two.png' ? undefined : { latitude: 3, longitude: 4 })

    const suggestions = await inspectExifLocations(root, '2026-12-01', memoryWithMedia([
      { src: '/api/archive-media/2026-12-01/one.jpg', path: 'one.jpg', alt: 'One', kind: 'image' },
      { src: '/api/archive-media/2026-12-01/two.png', path: 'two.png', alt: 'Two', kind: 'image' },
      { src: '/api/archive-media/2026-12-01/three.svg', path: 'three.svg', alt: 'Three', kind: 'image' },
      { src: '/api/archive-media/2026-12-01/four.jpg', path: 'four.jpg', alt: 'Four', kind: 'image' }
    ]), { readGps })

    expect(suggestions.map(suggestion => suggestion.media.path)).toEqual(['one.jpg', 'four.jpg'])
    expect(readGps).toHaveBeenCalledTimes(3)
  })

  it('rejects media paths that escape the secure archive resolver', async () => {
    const root = await createArchive()
    await expect(inspectExifLocations(root, '2026-12-01', memoryWithMedia([{ src: '/bad', path: '../outside.jpg', alt: 'Bad', kind: 'image' }]), { readGps: vi.fn() })).rejects.toBeInstanceOf(ArchivePathError)
  })

  it('ignores invalid EXIF coordinates without contacting external services', async () => {
    const root = await createArchive()
    const mediaRoot = join(root, '2026', '12', '01', 'media')
    await mkdir(mediaRoot, { recursive: true })
    await writeFile(join(mediaRoot, 'photo.jpg'), 'photo')
    const readGps = vi.fn().mockResolvedValue({ latitude: 91, longitude: 0 })

    await expect(inspectExifLocations(root, '2026-12-01', memoryWithMedia([{ src: '/photo', path: 'photo.jpg', alt: 'Photo', kind: 'image' }]), { readGps })).resolves.toEqual([])
  })
})
