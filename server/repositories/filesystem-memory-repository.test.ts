import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  ArchivePathError,
  InvalidMemoryDateError,
  createFilesystemMemoryRepository,
  resolveArchiveMediaPath
} from './filesystem-memory-repository'

const temporaryDirectories: string[] = []

const createArchive = async () => {
  const directory = await mkdtemp(join(tmpdir(), 'life-archive-test-'))
  temporaryDirectories.push(directory)
  return directory
}

const writeMemory = async (root: string, date: string, options: { title?: string; content?: string; media?: string[] } = {}) => {
  const memoryDirectory = join(root, ...date.split('-'))
  const mediaDirectory = join(memoryDirectory, 'media')
  await mkdir(mediaDirectory, { recursive: true })
  const media = options.media ?? []
  await Promise.all(media.map(fileName => writeFile(join(mediaDirectory, fileName), 'sample media')))
  const content = options.content ?? `## ${options.title ?? 'A memory'}\n\nA useful remembered detail.\n\n![A detail](./media/${media[0] ?? 'missing.jpg'})`
  await writeFile(join(memoryDirectory, 'index.md'), `---\ndate: ${date}\ntitle: ${options.title ?? 'A memory'}\ntype: highlight\nmood:\n  label: Calm\n  score: 7\ntags:\n  - test\nlocation: Test place\n---\n\n${content}\n`)
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map(directory => rm(directory, { recursive: true, force: true })))
})

describe('filesystem memory repository', () => {
  it('reads a valid memory and resolves existing media', async () => {
    const root = await createArchive()
    await writeMemory(root, '2026-11-10', { title: 'A valid memory', media: ['photo.jpg'] })

    const memory = await createFilesystemMemoryRepository(root).getMemoryByDate('2026-11-10')

    expect(memory).toMatchObject({ date: '2026-11-10', title: 'A valid memory', type: 'highlight', location: 'Test place' })
    expect(memory?.content).toContain('A useful remembered detail.')
    expect(memory?.content).toContain('](/api/archive-media/2026-11-10/photo.jpg)')
    expect(memory?.media).toEqual([{ src: '/api/archive-media/2026-11-10/photo.jpg', alt: 'A detail' }])
  })

  it('lists memories newest first and filters by year and month', async () => {
    const root = await createArchive()
    await writeMemory(root, '2025-12-01', { title: 'Older' })
    await writeMemory(root, '2026-01-02', { title: 'January' })
    await writeMemory(root, '2026-11-10', { title: 'Newest' })

    const repository = createFilesystemMemoryRepository(root)

    expect((await repository.getMemories()).map(memory => memory.date)).toEqual(['2026-11-10', '2026-01-02', '2025-12-01'])
    expect((await repository.getMemories({ year: 2026 })).map(memory => memory.title)).toEqual(['Newest', 'January'])
    expect((await repository.getMemories({ year: 2026, month: 1 })).map(memory => memory.date)).toEqual(['2026-01-02'])
  })

  it('returns null for a nonexistent date', async () => {
    const root = await createArchive()
    const memory = await createFilesystemMemoryRepository(root).getMemoryByDate('2026-11-10')

    expect(memory).toBeNull()
  })

  it('rejects invalid dates before touching the filesystem', async () => {
    const root = await createArchive()

    await expect(createFilesystemMemoryRepository(root).getMemoryByDate('2026-02-30')).rejects.toBeInstanceOf(InvalidMemoryDateError)
    await expect(createFilesystemMemoryRepository(root).getMemoryByDate('../secret')).rejects.toBeInstanceOf(InvalidMemoryDateError)
  })

  it('ignores missing media and malformed Markdown without failing the archive listing', async () => {
    const root = await createArchive()
    await writeMemory(root, '2026-11-10', { content: '## Missing image\n\n![Missing](./media/not-there.jpg)' })
    const malformedDirectory = join(root, '2026', '11', '11')
    await mkdir(malformedDirectory, { recursive: true })
    await writeFile(join(malformedDirectory, 'index.md'), '---\ntitle: [not valid\n---\n\nBroken')

    const memories = await createFilesystemMemoryRepository(root).getMemories()

    expect(memories).toHaveLength(1)
    expect(memories[0]?.media).toEqual([])
  })

  it('rejects media paths that escape the archive media directory', async () => {
    const root = await createArchive()
    await writeMemory(root, '2026-11-10', { media: ['photo.jpg'] })

    await expect(resolveArchiveMediaPath(root, '2026-11-10', '../index.md')).rejects.toBeInstanceOf(ArchivePathError)
    await expect(resolveArchiveMediaPath(root, '2026-11-10', '../../outside.jpg')).rejects.toBeInstanceOf(ArchivePathError)
  })

  it('returns empty results for a missing archive directory', async () => {
    const root = join(tmpdir(), 'life-archive-directory-does-not-exist')
    const repository = createFilesystemMemoryRepository(root)

    expect(await repository.getMemories()).toEqual([])
    expect(await repository.getMemoryByDate('2026-11-10')).toBeNull()
  })
})
