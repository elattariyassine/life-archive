import type { ExifLocationResponse } from '../../../../app/types/location-discovery'
import { getMemoryRepositoryMode, getServerMemoryRepository } from '../../../utils/memory-repository'
import { inspectExifLocations } from '../../../utils/exif-location'
import { assertRequestDate } from '../../../utils/query'

export default defineEventHandler(async (event): Promise<ExifLocationResponse> => {
  const date = getRouterParam(event, 'date') || ''
  assertRequestDate(date)
  const config = useRuntimeConfig(event)
  const repository = getServerMemoryRepository(event)
  const memory = await repository.getMemoryByDate(date)
  if (!memory) throw createError({ statusCode: 404, statusMessage: 'Memory not found' })
  if (getMemoryRepositoryMode(config) !== 'filesystem' || !config.archiveDir) return { suggestions: [] }
  return { suggestions: await inspectExifLocations(String(config.archiveDir), date, memory) }
})
