import type { H3Event } from 'h3'
import type { MemoryMapRepository } from '../../app/types/location-discovery'
import type { Memory, MemoryRepository } from '../../app/types/memory'
import { createFixtureMemoryRepository } from '../../app/repositories/memory-repository'
import { ArchivePathError, ArchiveUnavailableError, InvalidArchiveConfigurationError, InvalidMemoryDateError, InvalidMemoryMetadataError, MemoryConflictError, MemoryNotFoundError, createFilesystemMemoryRepository, type FilesystemMemoryRepository } from '../repositories/filesystem-memory-repository'

export type MemoryRepositoryMode = 'sample' | 'filesystem'

/** The archive folder is used whenever NUXT_ARCHIVE_DIR is set; otherwise the read-only sample memories are shown. */
export const getMemoryRepositoryMode = (config: { archiveDir?: unknown }): MemoryRepositoryMode => {
  return typeof config.archiveDir === 'string' && config.archiveDir.trim() ? 'filesystem' : 'sample'
}

/**
 * Folder paths are shown to the reader for "Open in VS Code" and "Copy path". When the server sees the archive
 * at a different location than the reader's machine (for example /archive inside Docker), NUXT_ARCHIVE_HOST_DIR
 * maps the server path back to the host path.
 */
export const toHostFolderPath = (folderPath: string | undefined, archiveDir: string, hostDir: string) => {
  if (!folderPath || !hostDir.trim() || !archiveDir.trim()) return folderPath
  const serverRoot = archiveDir.replace(/[\\/]+$/, '')
  if (folderPath !== serverRoot && !folderPath.startsWith(`${serverRoot}/`)) return folderPath
  return `${hostDir.replace(/[\\/]+$/, '')}${folderPath.slice(serverRoot.length)}`
}

export function toClientMemory<T extends Pick<Memory, 'folderPath'>>(event: H3Event, memory: T): T {
  const config = useRuntimeConfig(event)
  const folderPath = toHostFolderPath(memory.folderPath, String(config.archiveDir || ''), String(config.archiveHostDir || ''))
  return folderPath === memory.folderPath ? memory : { ...memory, folderPath }
}

export function getServerMemoryRepository(event: H3Event): MemoryRepository {
  const config = useRuntimeConfig(event)
  const mode = getMemoryRepositoryMode(config)
  if (mode === 'sample') return createFixtureMemoryRepository()
  return createFilesystemMemoryRepository(String(config.archiveDir).trim())
}

export function getServerMemoryMapRepository(event: H3Event): MemoryMapRepository {
  return getServerMemoryRepository(event) as unknown as MemoryMapRepository
}

export function getFilesystemMemoryRepository(event: H3Event): FilesystemMemoryRepository {
  const config = useRuntimeConfig(event)
  if (getMemoryRepositoryMode(config) !== 'filesystem') throw publicRepositoryError(409, 'Memory creation requires filesystem mode', 'REPOSITORY_READ_ONLY')
  return createFilesystemMemoryRepository(String(config.archiveDir).trim())
}

export async function withRepositoryErrors<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation()
  } catch (error: unknown) {
    console.error('[life-archive] repository request failed', error)
    if (error instanceof MemoryConflictError) throw publicRepositoryError(409, 'Memory changed externally', 'MEMORY_CONFLICT')
    if (error instanceof MemoryNotFoundError) throw publicRepositoryError(404, 'Memory not found', 'MEMORY_NOT_FOUND')
    if (error instanceof InvalidMemoryDateError) throw publicRepositoryError(400, 'The memory date is invalid', 'INVALID_MEMORY_DATE', 'date')
    if (error instanceof InvalidMemoryMetadataError) throw publicRepositoryError(400, 'Memory metadata is invalid. Check the title, type, tags, mood, and location fields.', 'INVALID_MEMORY_METADATA')
    if (error instanceof ArchivePathError) throw publicRepositoryError(400, 'The requested archive path is not allowed', 'INVALID_ARCHIVE_PATH')
    if (error instanceof ArchiveUnavailableError || error instanceof InvalidArchiveConfigurationError) throw publicRepositoryError(500, 'Archive is unavailable', 'ARCHIVE_UNAVAILABLE')
    throw publicRepositoryError(500, 'The memory could not be persisted', 'MEMORY_PERSISTENCE_FAILED')
  }
}

function publicRepositoryError(statusCode: number, statusMessage: string, code: string, field?: string) {
  const error = createError({ statusCode, statusMessage, data: { code, ...(field ? { field } : {}) } })
  error.stack = undefined
  return error
}
