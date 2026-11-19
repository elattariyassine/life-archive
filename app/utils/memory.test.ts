import { describe, expect, it } from 'vitest'
import { countMemoryWords, formatReadingTime, isMemoryDraft, summarizeMemoryMedia } from './memory'

describe('memory content helpers', () => {
  it('treats the starter body and heading-only files as drafts', () => {
    expect(isMemoryDraft('# What happened\n')).toBe(true)
    expect(isMemoryDraft('# What happened\n\n<!-- write here -->\n')).toBe(true)
    expect(isMemoryDraft('')).toBe(true)
    expect(isMemoryDraft('# What happened\n\nWe walked to the sea.')).toBe(false)
    expect(isMemoryDraft('![Photo](./media/a.jpg)')).toBe(false)
  })

  it('counts prose words only', () => {
    expect(countMemoryWords('# Title\n\nWe walked *to* the sea.\n\n![Alt text here](./media/a.jpg)\n<figure><img src="x"></figure>')).toBe(5)
    expect(formatReadingTime(30)).toBe('Under a minute')
    expect(formatReadingTime(900)).toBe('4 min read')
  })

  it('summarizes media by kind', () => {
    expect(summarizeMemoryMedia({ media: [
      { src: 'a.jpg', alt: '' },
      { src: 'b.png', alt: '' },
      { src: 'c.mp4', alt: '' },
      { src: 'd.mp3', alt: '' },
      { src: 'e.pdf', alt: '', kind: 'document' }
    ] })).toEqual(['2 photos', '1 video', '1 recording', '1 document'])
  })
})
