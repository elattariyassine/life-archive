import type { MemoryMapResponse } from '../../app/types/location-discovery'
import { getServerMemoryMapRepository } from '../utils/memory-repository'
import { parseOptionalMapTextQuery, parseTypeQuery, parseYearQuery } from '../utils/query'

export default defineEventHandler(async (event): Promise<MemoryMapResponse> => {
  const query = getQuery(event)
  const year = query.year === undefined || query.year === '' ? undefined : parseYearQuery(query.year)
  const type = query.type === undefined || query.type === '' ? undefined : parseTypeQuery(query.type)
  return {
    points: await getServerMemoryMapRepository(event).getMemoryMapPoints({
      year,
      type,
      tag: parseOptionalMapTextQuery(query.tag),
      mood: parseOptionalMapTextQuery(query.mood),
      country: parseOptionalMapTextQuery(query.country),
      city: parseOptionalMapTextQuery(query.city)
    })
  }
})
