import { createHash } from 'node:crypto'
import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { THUMBNAIL_WIDTHS } from './memory-summary'

const cacheDirectory = join(tmpdir(), 'life-archive-thumbnails')
const resizablePattern = /\.(avif|jpe?g|png|tiff?|webp)$/i

export const parseThumbnailWidth = (value: unknown) => {
  const width = typeof value === 'string' ? Number(value) : Number.NaN
  return (THUMBNAIL_WIDTHS as readonly number[]).includes(width) ? width : null
}

export const canResize = (filePath: string) => resizablePattern.test(filePath)

/**
 * Returns a cached WebP rendition of an archive image. The cache lives in the OS temp directory,
 * never inside the archive, and is keyed by path, size, modification time, and width so edits invalidate it.
 */
export async function getThumbnail(filePath: string, width: number): Promise<Buffer> {
  const info = await stat(filePath)
  const key = createHash('sha256').update(`${filePath}:${info.size}:${info.mtimeMs}:${width}`).digest('hex')
  const cachedPath = join(cacheDirectory, `${key}.webp`)
  try {
    return await readFile(cachedPath)
  } catch {
    // Not cached yet.
  }
  const { default: sharp } = await import('sharp')
  const output = await sharp(filePath, { failOn: 'none' })
    .rotate()
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: 74 })
    .toBuffer()
  await mkdir(cacheDirectory, { recursive: true })
  const temporaryPath = `${cachedPath}.${process.pid}.tmp`
  await writeFile(temporaryPath, output)
  await rename(temporaryPath, cachedPath).catch(() => undefined)
  return output
}
