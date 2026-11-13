import type { H3Event } from 'h3'
import type { MemoryMapRepository } from '../../app/types/location-discovery'
import type { MemoryRepository } from '../../app/types/memory'
import { createFixtureMemoryRepository } from '../../app/repositories/memory-repository'
import { ArchivePathError, ArchiveUnavailableError, InvalidArchiveConfigurationError, InvalidMemoryDateError, InvalidMemoryMetadataError, MemoryConflictError, MemoryNotFoundError, createFilesystemMemoryRepository, type FilesystemMemoryRepository } from '../repositories/filesystem-memory-repository'

export type MemoryRepositoryMode = 'sample' | 'filesystem'

export const getMemoryRepositoryMode = (config: { archiveDir?: unknown; archiveRepository?: unknown }): MemoryRepositoryMode => {
  if (config.archiveRepository === 'filesystem' || (!config.archiveRepository && config.archiveDir)) return 'filesystem'
  if (!config.archiveRepository || config.archiveRepository === 'sample') return 'sample'
  throw createError({ statusCode: 500, statusMessage: 'Unsupported archive repository' })
}

export function getServerMemoryRepository(event: H3Event): MemoryRepository {
  const config = useRuntimeConfig(event)
  const mode = getMemoryRepositoryMode(config)
  if (mode === 'sample') return createFixtureMemoryRepository()
  if (mode === 'filesystem') {
    if (!config.archiveDir) throw createError({ statusCode: 500, statusMessage: 'Archive directory is not configured' })
    return createFilesystemMemoryRepository(String(config.archiveDir))
  }
  throw createError({ statusCode: 500, statusMessage: 'Unsupported archive repository' })
}

export function getServerMemoryMapRepository(event: H3Event): MemoryMapRepository {
  return getServerMemoryRepository(event) as unknown as MemoryMapRepository
}

export function getFilesystemMemoryRepository(event: H3Event): FilesystemMemoryRepository {
  const config = useRuntimeConfig(event)
  if (getMemoryRepositoryMode(config) !== 'filesystem') throw publicRepositoryError(409, 'Memory creation requires filesystem mode', 'REPOSITORY_READ_ONLY')
  if (!config.archiveDir) throw createError({ statusCode: 500, statusMessage: 'Archive directory is not configured' })
  return createFilesystemMemoryRepository(String(config.archiveDir))
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
