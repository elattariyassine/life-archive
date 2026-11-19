import type { Memory, MemoryMedia, MemorySummary } from '../../app/types/memory'
import { countMemoryWords, isMemoryDraft } from '../../app/utils/memory'

export const THUMBNAIL_WIDTHS = [320, 640, 1280] as const
export const DEFAULT_THUMBNAIL_WIDTH = 640

const resizablePattern = /\.(avif|jpe?g|png|tiff?|webp)$/i

/** Archive images can be resized by the media endpoint; sample media and vector or animated files are served as-is. */
export const withThumbnail = (media: MemoryMedia): MemoryMedia => {
  if (!media.src.startsWith('/api/archive-media/') || !resizablePattern.test(media.path || media.src.split('?')[0]!)) return media
  return { ...media, thumb: `${media.src}${media.src.includes('?') ? '&' : '?'}w=${DEFAULT_THUMBNAIL_WIDTH}` }
}

export const toMemorySummary = (memory: Memory): MemorySummary => ({
  date: memory.date,
  title: memory.title,
  type: memory.type,
  mood: memory.mood,
  tags: memory.tags,
  location: memory.location,
  excerpt: memory.excerpt,
  media: memory.media.map(withThumbnail),
  music: memory.music,
  wordCount: countMemoryWords(memory.content),
  draft: isMemoryDraft(memory.content)
})
