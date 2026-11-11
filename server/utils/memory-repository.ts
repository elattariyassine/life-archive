import type { H3Event } from 'h3'
import type { MemoryRepository } from '../../app/types/memory'
import { createFixtureMemoryRepository } from '../../app/repositories/memory-repository'
import { ArchivePathError, ArchiveUnavailableError, InvalidArchiveConfigurationError, InvalidMemoryDateError, InvalidMemoryMetadataError, MediaValidationError, MemoryConflictError, MemoryNotFoundError, createFilesystemMemoryRepository, type FilesystemMemoryRepository } from '../repositories/filesystem-memory-repository'

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

export function getFilesystemMemoryRepository(event: H3Event): FilesystemMemoryRepository {
  const config = useRuntimeConfig(event)
  if (getMemoryRepositoryMode(config) !== 'filesystem') throw createError({ statusCode: 409, statusMessage: 'Memory editing requires filesystem mode' })
  if (!config.archiveDir) throw createError({ statusCode: 500, statusMessage: 'Archive directory is not configured' })
  return createFilesystemMemoryRepository(String(config.archiveDir))
}

export async function withRepositoryErrors<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation()
  } catch (error: unknown) {
    if (error instanceof MemoryConflictError) throw createError({ statusCode: 409, statusMessage: 'Memory changed externally', data: { code: 'MEMORY_CONFLICT' } })
    if (error instanceof MemoryNotFoundError) throw createError({ statusCode: 404, statusMessage: 'Memory not found' })
    if (error instanceof InvalidMemoryDateError || error instanceof InvalidMemoryMetadataError || error instanceof MediaValidationError || error instanceof ArchivePathError) throw createError({ statusCode: 400, statusMessage: 'Invalid memory request' })
    if (error instanceof ArchiveUnavailableError || error instanceof InvalidArchiveConfigurationError) throw createError({ statusCode: 500, statusMessage: 'Archive is unavailable' })
    throw error
  }
}
