import { readFile } from 'node:fs/promises'
import { extname } from 'node:path'
import { resolveArchiveMediaPath } from '../../../repositories/filesystem-memory-repository'
import { getMemoryRepositoryMode } from '../../../utils/memory-repository'
import { assertRequestDate } from '../../../utils/query'

const mimeTypes: Record<string, string> = {
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.heic': 'image/heic',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.m4a': 'audio/mp4',
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.opus': 'audio/ogg',
  '.png': 'image/png',
  '.pdf': 'application/pdf',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.webm': 'video/webm',
  '.webp': 'image/webp'
}

export default defineEventHandler(async (event) => {
  const date = getRouterParam(event, 'date') || ''
  const rawPath = getRouterParam(event, 'path') || ''
  assertRequestDate(date)
  let mediaPath: string
  try {
    mediaPath = rawPath.split('/').map(decodeURIComponent).join('/')
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'Invalid media path' })
  }
  const config = useRuntimeConfig(event)
  if (getMemoryRepositoryMode(config) !== 'filesystem' || !config.archiveDir) throw createError({ statusCode: 404, statusMessage: 'Media not found' })
  const filePath = await resolveArchiveMediaPath(String(config.archiveDir), date, mediaPath)
  if (!filePath) throw createError({ statusCode: 404, statusMessage: 'Media not found' })
  setHeader(event, 'Content-Type', mimeTypes[extname(filePath).toLowerCase()] || 'application/octet-stream')
  setHeader(event, 'Cache-Control', 'private, max-age=60')
  return readFile(filePath)
})
