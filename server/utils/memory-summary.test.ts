import { describe, expect, it } from 'vitest'
import { toMemorySummary, withThumbnail } from './memory-summary'

describe('memory summaries', () => {
  it('drops the body and derives word count and draft state', () => {
    const summary = toMemorySummary({ date: '2026-01-02', title: 'A day', type: 'thought', tags: [], excerpt: '', content: '# What happened\n', media: [], version: 'abc', folderPath: '/private/path' })
    expect(summary).not.toHaveProperty('content')
    expect(summary).not.toHaveProperty('folderPath')
    expect(summary.draft).toBe(true)
    expect(summary.wordCount).toBe(0)
  })

  it('adds thumbnails only for resizable archive images', () => {
    expect(withThumbnail({ src: '/api/archive-media/2026-01-02/media/a.JPG', path: 'media/a.JPG', alt: '' }).thumb).toBe('/api/archive-media/2026-01-02/media/a.JPG?w=640')
    expect(withThumbnail({ src: '/api/archive-media/2026-01-02/media/a.svg', path: 'media/a.svg', alt: '' }).thumb).toBeUndefined()
    expect(withThumbnail({ src: '/sample-media/a.jpg', alt: '' }).thumb).toBeUndefined()
  })
})
