import { describe, expect, it, vi } from 'vitest'
import { createApiMemoryRepository } from './api-memory-repository'

describe('API memory repository', () => {
  it('creates a memory with metadata and does not send Markdown content', async () => {
    const request = vi.fn().mockResolvedValue({ memory: { date: '2026-12-01', title: 'A day', type: 'highlight', tags: [], content: '# What happened', media: [] } })
    const repository = createApiMemoryRepository(request)
    const input = { date: '2026-12-01', title: 'A day', type: 'highlight' as const, tags: [], location: { name: 'Home', source: 'manual' as const } }

    await repository.createMemory(input)

    expect(request).toHaveBeenCalledWith('/api/memories', { method: 'POST', body: input })
  })

  it('deletes a memory using its expected version', async () => {
    const request = vi.fn().mockResolvedValue({ deleted: true })
    const repository = createApiMemoryRepository(request)

    await repository.deleteMemory('2026-12-01', 'version')

    expect(request).toHaveBeenCalledWith('/api/memories/2026-12-01', { method: 'DELETE', body: { expectedVersion: 'version' } })
  })

  it('updates only a memory location using its expected version', async () => {
    const request = vi.fn().mockResolvedValue({ memory: { date: '2026-12-01', title: 'A day', type: 'highlight', tags: [], content: '# What happened', media: [] } })
    const repository = createApiMemoryRepository(request)
    const location = { name: 'Home', latitude: 1, longitude: 2, precision: 'place' as const, source: 'exif' as const }

    await repository.updateMemoryLocation('2026-12-01', 'version', location)

    expect(request).toHaveBeenCalledWith('/api/memories/2026-12-01/location', { method: 'PATCH', body: { expectedVersion: 'version', location } })
  })

  it('searches with the query and combined filters', async () => {
    const request = vi.fn().mockResolvedValue({ results: [] })
    const repository = createApiMemoryRepository(request)

    await repository.searchMemories({ query: 'mor', year: 2026, type: 'travel' })

    expect(request).toHaveBeenCalledWith('/api/search', { query: { q: 'mor', year: 2026, type: 'travel' } })
  })
})
