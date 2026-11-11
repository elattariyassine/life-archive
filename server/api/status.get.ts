import { stat } from 'node:fs/promises'
import type { MemoryRepositoryStatusResponse } from '../../app/types/memory-api'
import { getMemoryRepositoryMode } from '../utils/memory-repository'

export default defineEventHandler(async (event): Promise<MemoryRepositoryStatusResponse> => {
  const config = useRuntimeConfig(event)
  const mode = getMemoryRepositoryMode(config)
  const archiveConfigured = typeof config.archiveDir === 'string' && config.archiveDir.trim().length > 0
  const archiveAvailable = mode === 'filesystem' && archiveConfigured && await isDirectory(String(config.archiveDir))

  return { mode, archiveConfigured, archiveAvailable }
})

async function isDirectory(path: string) {
  try {
    return (await stat(path)).isDirectory()
  } catch {
    return false
  }
}
