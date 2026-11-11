import type { H3Event } from 'h3'
import type { MemoryRepository } from '../../app/types/memory'
import { createFixtureMemoryRepository } from '../../app/repositories/memory-repository'
import { createFilesystemMemoryRepository } from '../repositories/filesystem-memory-repository'

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
