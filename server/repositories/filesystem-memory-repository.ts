import { readdir, readFile, realpath, stat } from 'node:fs/promises'
import { basename, extname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { parseDocument } from 'yaml'
import { memoryTypes, type Memory, type MemoryFilters, type MemoryMedia, type MemoryRepository } from '../../app/types/memory'

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const YEAR_PATTERN = /^\d{4}$/
const MONTH_PATTERN = /^(0[1-9]|1[0-2])$/
const DAY_PATTERN = /^(0[1-9]|[12]\d|3[01])$/
const FRONTMATTER_PATTERN = /^---\s*\r?\n([\s\S]*?)\r?\n---\s*(?:\r?\n|$)/
const MEDIA_REFERENCE_PATTERN = /!\[([^\]]*)\]\(([^)]+)\)/g

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

type RecordValue = Record<string, unknown>

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

const rewriteMediaReferences = (content: string, date: string, media: MemoryMedia[]) => {
  return content.replace(MEDIA_REFERENCE_PATTERN, (reference, alt: string, source: string) => {
    const cleanSource = source.trim().split(/[?#]/)[0] ?? ''
    const relativePath = cleanSource.replace(/^\.\//, '')
    if (!relativePath.startsWith('media/')) return reference
    const mediaPath = relativePath.slice('media/'.length)
    const resolvedMedia = media.find(item => item.src === `/api/archive-media/${date}/${encodeMediaPath(mediaPath)}`)
    return resolvedMedia ? `![${alt}](${resolvedMedia.src})` : reference
  })
}

const getMediaReferenceMap = (content: string) => {
  const references = new Map<string, string>()
  for (const match of content.matchAll(MEDIA_REFERENCE_PATTERN)) {
    const alt = (match[1] ?? '').trim()
    const source = (match[2] ?? '').trim().split(/[?#]/)[0] ?? ''
    const relativePath = source.replace(/^\.\//, '')
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
    return { frontmatter, content: raw.slice(match[0].length).trim() }
  } catch {
    return null
  }
}

const normalizeMemory = (frontmatter: RecordValue, content: string, expectedDate: string): Omit<Memory, 'media'> | null => {
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

const readMedia = async (archiveRoot: string, date: string, content: string): Promise<MemoryMedia[]> => {
  const mediaRoot = resolve(archiveRoot, ...date.split('-'), 'media')
  if (!isInside(archiveRoot, mediaRoot)) return []
  const references = getMediaReferenceMap(content)
  const entries = await readMediaEntries(mediaRoot)
  return entries
    .map((entry) => ({
      src: `/api/archive-media/${date}/${encodeMediaPath(entry.relativePath)}`,
      alt: references.get(entry.relativePath) || getMediaAlt(entry.fileName)
    }))
}

const readMemoryAtDate = async (archiveRoot: string, date: string): Promise<Memory | null> => {
  const memoryDirectory = resolve(archiveRoot, ...date.split('-'))
  if (!isInside(archiveRoot, memoryDirectory)) throw new ArchivePathError()
  const indexPath = join(memoryDirectory, 'index.md')
  let raw: string
  try {
    raw = await readFile(indexPath, 'utf8')
  } catch {
    return null
  }
  const parsed = parseFrontmatter(raw)
  if (!parsed) return null
  const normalized = normalizeMemory(parsed.frontmatter, parsed.content, date)
  if (!normalized) return null
  const media = await readMedia(archiveRoot, date, parsed.content)
  return { ...normalized, content: rewriteMediaReferences(normalized.content, date, media), media }
}

const validateFilters = (filters?: MemoryFilters) => {
  if (filters?.year !== undefined && (!Number.isInteger(filters.year) || filters.year < 1 || filters.year > 9999)) throw new InvalidMemoryDateError(String(filters.year))
  if (filters?.month !== undefined && (!Number.isInteger(filters.month) || filters.month < 1 || filters.month > 12)) throw new InvalidMemoryDateError(String(filters.month))
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

export function createFilesystemMemoryRepository(archiveRoot: string): MemoryRepository {
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
            const memory = await readMemoryAtDate(root, date)
            if (memory) memories.push(memory)
          }
        }
      }
      return sortByDate(memories)
    },
    async getMemoryByDate(date) {
      assertValidMemoryDate(date)
      const root = await getRealArchiveRoot(archiveRoot)
      return root ? readMemoryAtDate(root, date) : null
    },
    async getMemoriesByYear(year) {
      return this.getMemories({ year })
    }
  }
}
