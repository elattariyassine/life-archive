import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import type { Memory } from '../../app/types/memory'
import { createFilesystemMemoryRepository } from '../repositories/filesystem-memory-repository'
import { searchMemories, stripMarkdown } from './memory-search'

const temporaryDirectories: string[] = []

const memory = (overrides: Partial<Memory> = {}): Memory => ({
  date: '2026-11-10',
  title: 'A quiet morning',
  type: 'highlight',
  tags: ['work', 'personal'],
  location: 'Marrakech, Morocco',
  excerpt: 'A quiet morning.',
  content: '# What happened\n\nI walked through the old city and wrote about **attention**.',
  media: [],
  ...overrides
})

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map(directory => rm(directory, { recursive: true, force: true })))
})

describe('memory search', () => {
  it('matches title, tags, and location case-insensitively with partial text', () => {
    expect(searchMemories([memory()], 'QUIET')[0]?.matches).toEqual(['title'])
    expect(searchMemories([memory()], 'pers')[0]?.matches).toEqual(['tag'])
    expect(searchMemories([memory()], 'RAKE')[0]?.matches).toEqual(['location'])
    expect(searchMemories([memory()], 'pers')[0]?.excerpt).toBe('Tag: personal')
  })

  it('ignores Markdown formatting while searching and returns a content excerpt', () => {
    const result = searchMemories([memory()], 'attention')

    expect(stripMarkdown('## A title\n\n![Photo](./media/photo.jpg) [Read](./notes.pdf) **attention**')).toBe('A title Photo Read attention')
    expect(result[0]?.matches).toEqual(['content'])
    expect(result[0]?.excerpt).toContain('attention')
  })

  it('returns newest matches first and handles empty and unmatched queries', () => {
    const results = searchMemories([
      memory({ date: '2025-01-01', title: 'Older match' }),
      memory({ date: '2026-01-01', title: 'Newer match' })
    ], 'match')

    expect(results.map(result => result.memory.date)).toEqual(['2026-01-01', '2025-01-01'])
    expect(searchMemories([memory()], '')).toEqual([])
    expect(searchMemories([memory()], 'not-found')).toEqual([])
  })

  it('combines year and type filters before searching', async () => {
    const root = await mkdtemp(join(tmpdir(), 'life-archive-search-filter-test-'))
    temporaryDirectories.push(root)
    const writeArchiveMemory = async (date: string, type: string, title: string) => {
      const directory = join(root, ...date.split('-'))
      await mkdir(directory, { recursive: true })
      await writeFile(join(directory, 'index.md'), `---\ndate: ${date}\ntitle: ${title}\ntype: ${type}\n---\n\nA road worth taking\n`)
    }
    await writeArchiveMemory('2026-11-10', 'travel', 'A road trip')
    await writeArchiveMemory('2026-11-11', 'thought', 'A road thought')
    await writeArchiveMemory('2025-11-10', 'travel', 'An older road')

    const scoped = await createFilesystemMemoryRepository(root).getMemories({ year: 2026, type: 'travel' })

    expect(searchMemories(scoped, 'road').map(result => result.memory.title)).toEqual(['A road trip'])
  })

  it('reflects externally modified Markdown on subsequent searches', async () => {
    const root = await mkdtemp(join(tmpdir(), 'life-archive-search-test-'))
    temporaryDirectories.push(root)
    const directory = join(root, '2026', '11', '10')
    await mkdir(directory, { recursive: true })
    const indexPath = join(directory, 'index.md')
    await writeFile(indexPath, '---\ndate: 2026-11-10\ntitle: Searchable memory\ntype: highlight\n---\n\nFirst version\n')
    const repository = createFilesystemMemoryRepository(root)

    expect(searchMemories(await repository.getMemories(), 'first')).toHaveLength(1)
    await writeFile(indexPath, '---\ndate: 2026-11-10\ntitle: Searchable memory\ntype: highlight\n---\n\nSecond version\n')

    const results = searchMemories(await repository.getMemories(), 'second')
    expect(results).toHaveLength(1)
    expect(results[0]?.excerpt).toContain('Second version')
    expect(await readFile(indexPath, 'utf8')).toContain('Second version')
  })
})
