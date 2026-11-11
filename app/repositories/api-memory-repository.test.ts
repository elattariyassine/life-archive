import { describe, expect, it } from 'vitest'
import { createApiMemoryRepository } from './api-memory-repository'

describe('API memory repository media uploads', () => {
  it('sends the actual file and expected version in multipart FormData', async () => {
    const calls: Array<{ path: string; options?: { body?: BodyInit | Record<string, any> | null } }> = []
    const request = async <T>(path: string, options?: { body?: BodyInit | Record<string, any> | null }) => {
      calls.push({ path, options })
      return { media: { src: '/api/archive-media/2026-12-06/photo.png', path: 'photo.png', alt: 'photo' } } as T
    }
    const repository = createApiMemoryRepository(request)
    const file = new File([new Uint8Array([1, 2, 3])], 'photo.png', { type: 'image/png' })

    await repository.uploadMedia('2026-12-06', file, 'expected-version')

    expect(calls[0]?.path).toBe('/api/memories/2026-12-06/media')
    expect(calls[0]?.options?.body).toBeInstanceOf(FormData)
    const formData = calls[0]?.options?.body as FormData
    expect(formData.get('file')).toBeInstanceOf(File)
    expect((formData.get('file') as File).name).toBe('photo.png')
    expect(formData.get('expectedVersion')).toBe('expected-version')
  })
})
