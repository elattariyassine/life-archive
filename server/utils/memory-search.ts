import type { Memory, MemorySearchMatch, MemorySearchResult } from '../../app/types/memory'

export const stripMarkdown = (content: string, options: { removeHeadings?: boolean } = {}) => content
  .replace(/```[^\n]*\n([\s\S]*?)```/g, '$1')
  .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
  .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
  .replace(/<[^>]+>/g, ' ')
  .replace(options.removeHeadings ? /^\s{0,3}#{1,6}\s+.*$/gm : /^\s{0,3}#{1,6}\s+/gm, '')
  .replace(/^\s{0,3}>\s?/gm, '')
  .replace(/^\s*[-*+]\s+/gm, '')
  .replace(/^\s*\d+[.)]\s+/gm, '')
  .replace(/[*_~`]/g, '')
  .replace(/\s+/g, ' ')
  .trim()

const getContentExcerpt = (content: string, query: string) => {
  const normalizedContent = content.toLocaleLowerCase()
  const startIndex = normalizedContent.indexOf(query.toLocaleLowerCase())
  if (startIndex < 0) return content.slice(0, 180)
  const start = Math.max(0, startIndex - 70)
  const end = Math.min(content.length, startIndex + query.length + 110)
  return `${start > 0 ? '... ' : ''}${content.slice(start, end).trim()}${end < content.length ? ' ...' : ''}`
}

const hasMatch = (value: string, query: string) => value.toLocaleLowerCase().includes(query)

export const searchMemories = (memories: Memory[], rawQuery: string): MemorySearchResult[] => {
  const query = rawQuery.trim().toLocaleLowerCase()
  if (!query) return []

  return memories
    .map((memory): MemorySearchResult | null => {
      const content = stripMarkdown(memory.content)
      const excerptContent = stripMarkdown(memory.content, { removeHeadings: true })
      const matches: MemorySearchMatch[] = []
      if (hasMatch(memory.title, query)) matches.push('title')
      if (hasMatch(content, query)) matches.push('content')
      if (memory.tags.some(tag => hasMatch(tag, query))) matches.push('tag')
      if (memory.location && hasMatch(memory.location, query)) matches.push('location')
      if (hasMatch(memory.type, query)) matches.push('type')
      if (hasMatch(memory.date, query)) matches.push('date')
      if (!matches.length) return null

      const primaryMatch = matches[0]
      const excerpt = primaryMatch === 'content'
        ? getContentExcerpt(excerptContent, query)
        : primaryMatch === 'tag'
          ? `Tag: ${memory.tags.find(tag => hasMatch(tag, query))}`
          : primaryMatch === 'location'
            ? `Location: ${memory.location}`
            : primaryMatch === 'type'
              ? `Type: ${memory.type}`
              : primaryMatch === 'date'
                ? `Date: ${memory.date}`
                : memory.title

      const summary: MemorySearchResult['memory'] = {
        date: memory.date,
        title: memory.title,
        type: memory.type,
        tags: memory.tags,
        media: memory.media
      }
      if (memory.location) summary.location = memory.location

      return {
        memory: summary,
        matches,
        excerpt
      }
    })
    .filter((result): result is MemorySearchResult => result !== null)
    .sort((a, b) => b.memory.date.localeCompare(a.memory.date))
}
