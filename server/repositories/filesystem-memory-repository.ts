import { createHash, randomUUID } from 'node:crypto'
import { cp, link, mkdir, mkdtemp, readdir, readFile, realpath, rename, rm, stat, unlink, writeFile } from 'node:fs/promises'
import { basename, dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { parseDocument, stringify } from 'yaml'
import { memoryTypes, type Memory, type MemoryDraft, type MemoryFilters, type MemoryMedia, type MemoryRepository } from '../../app/types/memory'

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const YEAR_PATTERN = /^\d{4}$/
const MONTH_PATTERN = /^(0[1-9]|1[0-2])$/
const DAY_PATTERN = /^(0[1-9]|[12]\d|3[01])$/
const FRONTMATTER_PATTERN = /^---\s*\r?\n([\s\S]*?)\r?\n---\s*(?:\r?\n|$)/
const MEDIA_REFERENCE_PATTERN = /!\[([^\]]*)\]\(([^)]+)\)/g
const MAX_TITLE_LENGTH = 200
const MAX_CONTENT_LENGTH = 2_000_000
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

const uploadTypes: Record<string, string> = {
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.mp4': 'video/mp4',
  '.png': 'image/png',
  '.webm': 'video/webm',
  '.webp': 'image/webp'
}

export interface FilesystemMediaUpload {
  filename: string
  contentType: string
  data: Uint8Array
}

export interface FilesystemMemoryRepository extends MemoryRepository {
  createMemory(draft: MemoryDraft): Promise<Memory>
  updateMemory(date: string, draft: MemoryDraft, expectedVersion: string): Promise<Memory>
  deleteMemory(date: string, expectedVersion: string): Promise<void>
  uploadMedia(date: string, upload: FilesystemMediaUpload, expectedVersion: string): Promise<MemoryMedia>
  removeMedia(date: string, mediaPath: string, expectedVersion: string): Promise<Memory>
}

export class InvalidMemoryDateError extends Error {
  constructor(date: string) {
    super(`Invalid memory date: ${date}`)
    this.name = 'InvalidMemoryDateError'
  }
}

export class InvalidArchiveConfigurationError extends Error {
  constructor() {
    super('The archive directory must be an absolute path')
    this.name = 'InvalidArchiveConfigurationError'
  }
}

export class ArchivePathError extends Error {
  constructor() {
    super('The requested archive path is not allowed')
    this.name = 'ArchivePathError'
  }
}

export class ArchiveUnavailableError extends Error {
  constructor() {
    super('The archive directory is unavailable')
    this.name = 'ArchiveUnavailableError'
  }
}

export class MemoryNotFoundError extends Error {
  constructor() {
    super('Memory not found')
    this.name = 'MemoryNotFoundError'
  }
}

export class MemoryConflictError extends Error {
  constructor() {
    super('Memory changed since it was loaded')
    this.name = 'MemoryConflictError'
  }
}

export class InvalidMemoryMetadataError extends Error {
  constructor() {
    super('Memory metadata is invalid')
    this.name = 'InvalidMemoryMetadataError'
  }
}

export class MediaValidationError extends Error {
  constructor() {
    super('Media file is invalid or unsupported')
    this.name = 'MediaValidationError'
  }
}

type RecordValue = Record<string, unknown>
type MemoryRecord = { memory: Memory; raw: string }

const isRecord = (value: unknown): value is RecordValue => Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const isInside = (parent: string, candidate: string) => {
  const path = relative(parent, candidate)
  return path === '' || (path !== '..' && !path.startsWith(`..${sep}`) && !isAbsolute(path))
}

export const isValidMemoryDate = (date: string) => {
  if (!DATE_PATTERN.test(date)) return false
  const year = Number(date.slice(0, 4))
  const month = Number(date.slice(5, 7))
  const day = Number(date.slice(8, 10))
  const parsed = new Date(Date.UTC(year, month - 1, day))
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day
}

const assertValidMemoryDate = (date: string): void => {
  if (!isValidMemoryDate(date)) throw new InvalidMemoryDateError(date)
}

const normalizeDate = (value: unknown) => {
  if (typeof value === 'string') return value.trim()
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10)
  return null
}

const getExcerpt = (content: string) => {
  const paragraph = content
    .split(/\r?\n\s*\r?\n/)
    .map(part => part.replace(/^#{1,6}\s+/, '').replace(/^>\s+/, '').replace(/!\[[^\]]*\]\([^)]*\)/g, '').trim())
    .find(Boolean)
  return paragraph?.replace(/[*_`]/g, '').slice(0, 180) ?? ''
}

const getMediaAlt = (fileName: string) => basename(fileName, extname(fileName)).replace(/[-_]+/g, ' ')
const encodeMediaPath = (fileName: string) => fileName.split('/').map(part => encodeURIComponent(part)).join('/')
const decodeMediaPath = (fileName: string) => fileName.split('/').map(part => {
  try {
    return decodeURIComponent(part)
  } catch {
    return part
  }
}).join('/')

const getMediaReferenceMap = (content: string) => {
  const references = new Map<string, string>()
  for (const match of content.matchAll(MEDIA_REFERENCE_PATTERN)) {
    const alt = (match[1] ?? '').trim()
    const source = (match[2] ?? '').trim().split(/[?#]/)[0] ?? ''
    const relativePath = decodeMediaPath(source.replace(/^\.\//, ''))
    if (!relativePath.startsWith('media/') || relativePath.includes('\0')) continue
    references.set(relativePath.slice('media/'.length), alt)
  }
  return references
}

const parseFrontmatter = (raw: string) => {
  const match = raw.match(FRONTMATTER_PATTERN)
  if (!match) return null
  try {
    const document = parseDocument(match[1] ?? '')
    if (document.errors.length > 0) return null
    const frontmatter = document.toJS()
    if (!isRecord(frontmatter)) return null
    return { frontmatter, content: raw.slice(match[0].length).trim(), prefix: match[0] }
  } catch {
    return null
  }
}

const normalizeMemory = (frontmatter: RecordValue, content: string, expectedDate: string): Omit<Memory, 'media' | 'version'> | null => {
  const date = normalizeDate(frontmatter.date)
  const title = typeof frontmatter.title === 'string' ? frontmatter.title.trim() : ''
  const type = typeof frontmatter.type === 'string' ? frontmatter.type.trim() : ''
  if (date !== expectedDate || !title || !memoryTypes.includes(type as typeof memoryTypes[number])) return null

  const tags = Array.isArray(frontmatter.tags) ? frontmatter.tags.filter((tag): tag is string => typeof tag === 'string').map(tag => tag.trim()).filter(Boolean) : []
  const moodValue = isRecord(frontmatter.mood) ? frontmatter.mood : null
  const mood = moodValue && typeof moodValue.label === 'string' && typeof moodValue.score === 'number' && Number.isFinite(moodValue.score) && moodValue.score >= 1 && moodValue.score <= 10
    ? { label: moodValue.label.trim(), score: moodValue.score }
    : undefined
  const musicValue = isRecord(frontmatter.music) ? frontmatter.music : null
  const music = musicValue && typeof musicValue.title === 'string' && typeof musicValue.artist === 'string' && typeof musicValue.url === 'string'
    ? { title: musicValue.title.trim(), artist: musicValue.artist.trim(), url: musicValue.url.trim() }
    : undefined
  const excerpt = typeof frontmatter.excerpt === 'string' && frontmatter.excerpt.trim() ? frontmatter.excerpt.trim() : getExcerpt(content)

  return {
    date,
    title,
    type: type as Memory['type'],
    mood,
    tags,
    location: typeof frontmatter.location === 'string' ? frontmatter.location.trim() || undefined : undefined,
    excerpt,
    content,
    music
  }
}

const sortByDate = (memories: Memory[]) => [...memories].sort((a, b) => b.date.localeCompare(a.date))

const readDirectory = async (directory: string) => {
  try {
    return await readdir(directory, { withFileTypes: true })
  } catch {
    return []
  }
}

const readMediaEntries = async (directory: string, prefix = ''): Promise<Array<{ fileName: string; relativePath: string }>> => {
  const entries = await readDirectory(directory)
  const files: Array<{ fileName: string; relativePath: string }> = []
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.isFile()) files.push({ fileName: entry.name, relativePath })
    if (entry.isDirectory()) files.push(...await readMediaEntries(join(directory, entry.name), relativePath))
  }
  return files
}

const getRealArchiveRoot = async (archiveRoot: string) => {
  try {
    const resolvedRoot = await realpath(archiveRoot)
    const rootStats = await stat(resolvedRoot)
    return rootStats.isDirectory() ? resolvedRoot : null
  } catch {
    return null
  }
}

const getDateDirectory = (archiveRoot: string, date: string) => resolve(archiveRoot, ...date.split('-'))

const pathExists = async (path: string) => {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

const readMedia = async (archiveRoot: string, date: string, content: string): Promise<MemoryMedia[]> => {
  const mediaRoot = resolve(archiveRoot, ...date.split('-'), 'media')
  if (!isInside(archiveRoot, mediaRoot)) return []
  let resolvedMediaRoot: string
  try {
    resolvedMediaRoot = await realpath(mediaRoot)
  } catch {
    return []
  }
  if (!isInside(archiveRoot, resolvedMediaRoot) || !isInside(getDateDirectory(archiveRoot, date), resolvedMediaRoot)) throw new ArchivePathError()
  const references = getMediaReferenceMap(content)
  const entries = await readMediaEntries(resolvedMediaRoot)
  return entries.map(entry => ({
    src: `/api/archive-media/${date}/${encodeMediaPath(entry.relativePath)}`,
    path: entry.relativePath,
    alt: references.get(entry.relativePath) || getMediaAlt(entry.fileName)
  }))
}

const rewriteMediaReferences = (content: string, date: string, media: MemoryMedia[]) => {
  return content.replace(MEDIA_REFERENCE_PATTERN, (reference, alt: string, source: string) => {
    const cleanSource = source.trim().split(/[?#]/)[0] ?? ''
    const relativePath = decodeMediaPath(cleanSource.replace(/^\.\//, ''))
    if (!relativePath.startsWith('media/')) return reference
    const mediaPath = decodeMediaPath(relativePath.slice('media/'.length))
    const resolvedMedia = media.find(item => item.path === mediaPath)
    return resolvedMedia ? `![${alt}](${resolvedMedia.src})` : reference
  })
}

const readMemoryRecordAtDate = async (archiveRoot: string, date: string): Promise<MemoryRecord | null> => {
  const memoryDirectory = getDateDirectory(archiveRoot, date)
  if (!isInside(archiveRoot, memoryDirectory)) throw new ArchivePathError()
  let resolvedMemoryDirectory: string
  try {
    resolvedMemoryDirectory = await realpath(memoryDirectory)
  } catch {
    return null
  }
  if (!isInside(archiveRoot, resolvedMemoryDirectory)) throw new ArchivePathError()
  const indexPath = join(resolvedMemoryDirectory, 'index.md')
  let resolvedIndexPath: string
  try {
    resolvedIndexPath = await realpath(indexPath)
  } catch {
    return null
  }
  if (!isInside(archiveRoot, resolvedIndexPath) || !isInside(resolvedMemoryDirectory, resolvedIndexPath)) throw new ArchivePathError()
  let raw: string
  try {
    raw = await readFile(resolvedIndexPath, 'utf8')
  } catch {
    return null
  }
  const parsed = parseFrontmatter(raw)
  if (!parsed) return null
  const normalized = normalizeMemory(parsed.frontmatter, parsed.content, date)
  if (!normalized) return null
  const media = await readMedia(archiveRoot, date, parsed.content)
  return { memory: { ...normalized, content: rewriteMediaReferences(normalized.content, date, media), media, version: createVersion(raw) }, raw }
}

const validateFilters = (filters?: MemoryFilters) => {
  if (filters?.year !== undefined && (!Number.isInteger(filters.year) || filters.year < 1 || filters.year > 9999)) throw new InvalidMemoryDateError(String(filters.year))
  if (filters?.month !== undefined && (!Number.isInteger(filters.month) || filters.month < 1 || filters.month > 12)) throw new InvalidMemoryDateError(String(filters.month))
}

const createVersion = (content: string) => createHash('sha256').update(content).digest('hex')

const validateDraft = (input: MemoryDraft): MemoryDraft => {
  if (!input || typeof input !== 'object' || !isValidMemoryDate(input.date) || typeof input.title !== 'string' || !input.title.trim() || input.title.trim().length > MAX_TITLE_LENGTH || !memoryTypes.includes(input.type)) throw new InvalidMemoryMetadataError()
  if (typeof input.content !== 'string' || input.content.length > MAX_CONTENT_LENGTH || !Array.isArray(input.tags) || input.tags.some(tag => typeof tag !== 'string' || tag.length > 50) || input.tags.length > 30) throw new InvalidMemoryMetadataError()
  if (input.mood && (typeof input.mood.label !== 'string' || !input.mood.label.trim() || !Number.isInteger(input.mood.score) || input.mood.score < 1 || input.mood.score > 10)) throw new InvalidMemoryMetadataError()
  if (input.location !== undefined && (typeof input.location !== 'string' || input.location.length > 200)) throw new InvalidMemoryMetadataError()
  if (input.music) {
    if (typeof input.music.title !== 'string' || typeof input.music.artist !== 'string' || typeof input.music.url !== 'string' || !input.music.title.trim() || !input.music.artist.trim()) throw new InvalidMemoryMetadataError()
    try {
      const url = new URL(input.music.url)
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error()
    } catch {
      throw new InvalidMemoryMetadataError()
    }
  }
  return { ...input, title: input.title.trim(), tags: input.tags.map(tag => tag.trim()).filter(Boolean), location: input.location?.trim() || undefined }
}

const restoreMediaReferences = (content: string) => {
  const pattern = /\(\/api\/archive-media\/\d{4}-\d{2}-\d{2}\/([^\s)]+)\)/g
  return content.replace(pattern, (_reference, encodedPath: string) => {
    try {
      return `(./media/${encodedPath.split('/').map(decodeURIComponent).join('/')})`
    } catch {
      return _reference
    }
  })
}

const appendMediaReference = (raw: string, filename: string) => {
  const parsed = parseFrontmatter(raw)
  if (!parsed) throw new InvalidMemoryMetadataError()
  if (getMediaReferenceMap(parsed.content).has(filename)) return raw
  const body = parsed.content.trim()
  const reference = `![${getMediaAlt(filename)}](./media/${encodeMediaPath(filename)})`
  return `${parsed.prefix}${body ? `${body}\n\n` : ''}${reference}\n`
}

const removeMediaReference = (raw: string, mediaPath: string) => {
  return raw.replace(MEDIA_REFERENCE_PATTERN, (reference, _alt: string, source: string) => {
    const cleanSource = source.trim().split(/[?#]/)[0] ?? ''
    const relativePath = decodeMediaPath(cleanSource.replace(/^\.\//, ''))
    return relativePath === `media/${mediaPath}` ? '' : reference
  })
}

const serializeMemory = (draft: MemoryDraft) => {
  const metadata: RecordValue = { date: draft.date, title: draft.title, type: draft.type }
  if (draft.mood) metadata.mood = draft.mood
  if (draft.tags.length) metadata.tags = draft.tags
  if (draft.location) metadata.location = draft.location
  if (draft.music) metadata.music = draft.music
  const body = restoreMediaReferences(draft.content)
  return `---\n${stringify(metadata, { lineWidth: 0 })}---\n\n${body.endsWith('\n') ? body : `${body}\n`}`
}

export async function writeFileAtomically(filePath: string, data: string | Uint8Array) {
  const temporaryPath = join(dirname(filePath), `.${basename(filePath)}.${randomUUID()}.tmp`)
  try {
    await writeFile(temporaryPath, data, { flag: 'wx' })
    await rename(temporaryPath, filePath)
  } catch (error) {
    await unlink(temporaryPath).catch(() => undefined)
    throw error
  }
}

const writeFileWithoutOverwrite = async (filePath: string, data: Uint8Array) => {
  const temporaryPath = join(dirname(filePath), `.${basename(filePath)}.${randomUUID()}.tmp`)
  try {
    await writeFile(temporaryPath, data, { flag: 'wx' })
    await link(temporaryPath, filePath)
    await unlink(temporaryPath)
  } catch (error) {
    await unlink(temporaryPath).catch(() => undefined)
    throw error
  }
}

const getWritableRoot = async (archiveRoot: string) => {
  const root = await getRealArchiveRoot(archiveRoot)
  if (!root) throw new ArchiveUnavailableError()
  return root
}

const assertExpectedVersion = (record: MemoryRecord, expectedVersion: string) => {
  if (!expectedVersion || record.memory.version !== expectedVersion) throw new MemoryConflictError()
}

const validateUpload = (upload: FilesystemMediaUpload) => {
  const filename = upload.filename
  const extension = extname(filename).toLowerCase()
  if (!filename || filename !== basename(filename) || filename.includes('\\') || filename.includes('\0') || !/^[a-zA-Z0-9][a-zA-Z0-9._ -]{0,120}$/.test(filename) || !uploadTypes[extension] || upload.contentType !== uploadTypes[extension] || upload.data.byteLength > MAX_UPLOAD_BYTES) throw new MediaValidationError()
  return filename
}

export async function resolveArchiveMediaPath(archiveRoot: string, date: string, mediaPath: string): Promise<string | null> {
  assertValidMemoryDate(date)
  const root = await getRealArchiveRoot(archiveRoot)
  if (!root || mediaPath.includes('\0') || isAbsolute(mediaPath)) return null
  const mediaRoot = resolve(root, ...date.split('-'), 'media')
  const candidate = resolve(mediaRoot, mediaPath)
  if (!isInside(root, candidate) || !isInside(mediaRoot, candidate)) throw new ArchivePathError()
  try {
    const resolvedCandidate = await realpath(candidate)
    if (!isInside(root, resolvedCandidate) || !isInside(mediaRoot, resolvedCandidate)) throw new ArchivePathError()
    const fileStats = await stat(resolvedCandidate)
    return fileStats.isFile() ? resolvedCandidate : null
  } catch (error: unknown) {
    if (error instanceof ArchivePathError) throw error
    return null
  }
}

export function createFilesystemMemoryRepository(archiveRoot: string): FilesystemMemoryRepository {
  if (!isAbsolute(archiveRoot)) throw new InvalidArchiveConfigurationError()

  return {
    async getMemories(filters) {
      validateFilters(filters)
      const root = await getRealArchiveRoot(archiveRoot)
      if (!root) return []
      const memories: Memory[] = []
      for (const yearEntry of await readDirectory(root)) {
        if (!yearEntry.isDirectory() || !YEAR_PATTERN.test(yearEntry.name)) continue
        if (filters?.year !== undefined && Number(yearEntry.name) !== filters.year) continue
        for (const monthEntry of await readDirectory(join(root, yearEntry.name))) {
          if (!monthEntry.isDirectory() || !MONTH_PATTERN.test(monthEntry.name)) continue
          if (filters?.month !== undefined && Number(monthEntry.name) !== filters.month) continue
          for (const dayEntry of await readDirectory(join(root, yearEntry.name, monthEntry.name))) {
            if (!dayEntry.isDirectory() || !DAY_PATTERN.test(dayEntry.name)) continue
            const date = `${yearEntry.name}-${monthEntry.name}-${dayEntry.name}`
            if (!isValidMemoryDate(date)) continue
            const record = await readMemoryRecordAtDate(root, date)
            if (record) memories.push(record.memory)
          }
        }
      }
      return sortByDate(memories)
    },
    async getMemoryByDate(date) {
      assertValidMemoryDate(date)
      const root = await getRealArchiveRoot(archiveRoot)
      const record = root ? await readMemoryRecordAtDate(root, date) : null
      return record?.memory ?? null
    },
    async getMemoriesByYear(year) {
      return this.getMemories({ year })
    },
    async createMemory(input) {
      const draft = validateDraft(input)
      const root = await getWritableRoot(archiveRoot)
      const targetDirectory = getDateDirectory(root, draft.date)
      if (!isInside(root, targetDirectory)) throw new ArchivePathError()
      if (await pathExists(targetDirectory)) throw new MemoryConflictError()
      const parentDirectory = dirname(targetDirectory)
      await mkdir(parentDirectory, { recursive: true })
      const temporaryDirectory = await mkdtemp(join(parentDirectory, `.${basename(targetDirectory)}.create-`))
      try {
        await mkdir(join(temporaryDirectory, 'media'))
        await writeFileAtomically(join(temporaryDirectory, 'index.md'), serializeMemory(draft))
        await rename(temporaryDirectory, targetDirectory)
      } catch (error) {
        await rm(temporaryDirectory, { recursive: true, force: true }).catch(() => undefined)
        throw error
      }
      const record = await readMemoryRecordAtDate(root, draft.date)
      if (!record) throw new Error('Created memory could not be read')
      return record.memory
    },
    async updateMemory(date, input, expectedVersion) {
      assertValidMemoryDate(date)
      const draft = validateDraft(input)
      const root = await getWritableRoot(archiveRoot)
      const current = await readMemoryRecordAtDate(root, date)
      if (!current) throw new MemoryNotFoundError()
      assertExpectedVersion(current, expectedVersion)
      const sourceDirectory = getDateDirectory(root, date)
      const targetDirectory = getDateDirectory(root, draft.date)
      if (date === draft.date) {
        await writeFileAtomically(join(sourceDirectory, 'index.md'), serializeMemory(draft))
      } else {
        if (await pathExists(targetDirectory)) throw new MemoryConflictError()
        const targetParent = dirname(targetDirectory)
        await mkdir(targetParent, { recursive: true })
        const temporaryDirectory = await mkdtemp(join(targetParent, `.${basename(targetDirectory)}.update-`))
        const oldDirectory = join(dirname(sourceDirectory), `.${basename(sourceDirectory)}.delete-${randomUUID()}`)
        try {
          await mkdir(join(temporaryDirectory, 'media'))
          await writeFileAtomically(join(temporaryDirectory, 'index.md'), serializeMemory(draft))
          const sourceMediaDirectory = join(sourceDirectory, 'media')
          if (await pathExists(sourceMediaDirectory)) await cp(sourceMediaDirectory, join(temporaryDirectory, 'media'), { recursive: true })
          await rename(sourceDirectory, oldDirectory)
          try {
            await rename(temporaryDirectory, targetDirectory)
          } catch (error) {
            await rename(oldDirectory, sourceDirectory).catch(() => undefined)
            throw error
          }
          await rm(oldDirectory, { recursive: true, force: true })
        } catch (error) {
          await rm(temporaryDirectory, { recursive: true, force: true }).catch(() => undefined)
          throw error
        }
      }
      const updated = await readMemoryRecordAtDate(root, draft.date)
      if (!updated) throw new Error('Updated memory could not be read')
      return updated.memory
    },
    async deleteMemory(date, expectedVersion) {
      assertValidMemoryDate(date)
      const root = await getWritableRoot(archiveRoot)
      const current = await readMemoryRecordAtDate(root, date)
      if (!current) throw new MemoryNotFoundError()
      assertExpectedVersion(current, expectedVersion)
      const sourceDirectory = getDateDirectory(root, date)
      const temporaryDirectory = join(dirname(sourceDirectory), `.${basename(sourceDirectory)}.delete-${randomUUID()}`)
      await rename(sourceDirectory, temporaryDirectory)
      try {
        await rm(temporaryDirectory, { recursive: true, force: false })
      } catch (error) {
        await rename(temporaryDirectory, sourceDirectory).catch(() => undefined)
        throw error
      }
    },
    async uploadMedia(date, upload, expectedVersion) {
      assertValidMemoryDate(date)
      const filename = validateUpload(upload)
      const root = await getWritableRoot(archiveRoot)
      const current = await readMemoryRecordAtDate(root, date)
      if (!current) throw new MemoryNotFoundError()
      assertExpectedVersion(current, expectedVersion)
      const memoryDirectory = getDateDirectory(root, date)
      const mediaDirectory = resolve(memoryDirectory, 'media')
      await mkdir(mediaDirectory, { recursive: true })
      const resolvedMediaDirectory = await realpath(mediaDirectory)
      if (!isInside(root, resolvedMediaDirectory) || !isInside(memoryDirectory, resolvedMediaDirectory)) throw new ArchivePathError()
      const targetPath = resolve(resolvedMediaDirectory, filename)
      if (!isInside(root, targetPath) || !isInside(resolvedMediaDirectory, targetPath)) throw new ArchivePathError()
      if (await pathExists(targetPath)) throw new MemoryConflictError()
      await writeFileWithoutOverwrite(targetPath, upload.data)
      try {
        const latest = await readMemoryRecordAtDate(root, date)
        if (!latest) throw new MemoryNotFoundError()
        assertExpectedVersion(latest, expectedVersion)
        const updatedRaw = appendMediaReference(latest.raw, filename)
        if (updatedRaw !== latest.raw) await writeFileAtomically(join(memoryDirectory, 'index.md'), updatedRaw)
      } catch (error) {
        await unlink(targetPath).catch(() => undefined)
        throw error
      }
      const updated = await readMemoryRecordAtDate(root, date)
      if (!updated) throw new Error('Memory could not be read after media upload')
      return updated.memory.media.find(media => media.path === filename) || { src: `/api/archive-media/${date}/${encodeMediaPath(filename)}`, path: filename, alt: getMediaAlt(filename) }
    },
    async removeMedia(date, mediaPath, expectedVersion) {
      assertValidMemoryDate(date)
      const root = await getWritableRoot(archiveRoot)
      const current = await readMemoryRecordAtDate(root, date)
      if (!current) throw new MemoryNotFoundError()
      assertExpectedVersion(current, expectedVersion)
      const filePath = await resolveArchiveMediaPath(root, date, mediaPath)
      if (!filePath) throw new MemoryNotFoundError()
      const temporaryPath = join(dirname(filePath), `.${basename(filePath)}.delete-${randomUUID()}`)
      const updatedRaw = removeMediaReference(current.raw, mediaPath)
      await rename(filePath, temporaryPath)
      try {
        if (updatedRaw !== current.raw) await writeFileAtomically(join(getDateDirectory(root, date), 'index.md'), updatedRaw)
        await rm(temporaryPath, { force: false })
      } catch (error) {
        if (updatedRaw !== current.raw) await writeFileAtomically(join(getDateDirectory(root, date), 'index.md'), current.raw).catch(() => undefined)
        await rename(temporaryPath, filePath).catch(() => undefined)
        throw error
      }
      const updated = await readMemoryRecordAtDate(root, date)
      if (!updated) throw new Error('Memory could not be read after media removal')
      return updated.memory
    }
  }
}
