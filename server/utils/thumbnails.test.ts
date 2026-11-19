import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import sharp from 'sharp'
import { afterAll, describe, expect, it } from 'vitest'
import { canResize, getThumbnail, parseThumbnailWidth } from './thumbnails'

const directories: string[] = []

afterAll(async () => {
  await Promise.all(directories.map(directory => rm(directory, { recursive: true, force: true })))
})

describe('thumbnails', () => {
  it('accepts only the supported widths and raster formats', () => {
    expect(parseThumbnailWidth('640')).toBe(640)
    expect(parseThumbnailWidth('641')).toBeNull()
    expect(parseThumbnailWidth(undefined)).toBeNull()
    expect(canResize('/a/photo.JPEG')).toBe(true)
    expect(canResize('/a/drawing.svg')).toBe(false)
  })

  it('creates a smaller WebP rendition and reuses it from the cache', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'life-archive-thumb-test-'))
    directories.push(directory)
    const source = join(directory, 'photo.png')
    await writeFile(source, await sharp({ create: { width: 1600, height: 900, channels: 3, background: '#ad5c43' } }).png().toBuffer())

    const first = await getThumbnail(source, 320)
    const metadata = await sharp(first).metadata()
    expect(metadata.format).toBe('webp')
    expect(metadata.width).toBe(320)
    expect(await getThumbnail(source, 320)).toEqual(first)
  })

  it('never enlarges small images', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'life-archive-thumb-test-'))
    directories.push(directory)
    const source = join(directory, 'small.png')
    await writeFile(source, await sharp({ create: { width: 200, height: 100, channels: 3, background: '#000' } }).png().toBuffer())
    expect((await sharp(await getThumbnail(source, 1280)).metadata()).width).toBe(200)
  })
})
