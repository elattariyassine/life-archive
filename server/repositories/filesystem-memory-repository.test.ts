import { mkdtemp, mkdir, readFile, readdir, rm, stat, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  ArchivePathError,
  InvalidMemoryDateError,
  createFilesystemMemoryRepository,
  InvalidMemoryMetadataError,
  MediaValidationError,
  MemoryConflictError,
  MemoryNotFoundError,
  resolveArchiveMediaPath,
  writeFileAtomically
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
    expect(memory?.media).toEqual([{ src: '/api/archive-media/2026-11-10/photo.jpg', path: 'photo.jpg', alt: 'A detail' }])
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

  it('rejects archive symlinks that escape the archive root', async () => {
    const root = await createArchive()
    const outside = await createArchive()
    const memoryDirectory = join(root, '2026', '11', '10')
    await mkdir(join(root, '2026', '11'), { recursive: true })
    await symlink(outside, memoryDirectory)

    const repository = createFilesystemMemoryRepository(root)

    await expect(repository.getMemoryByDate('2026-11-10')).rejects.toBeInstanceOf(ArchivePathError)
    await expect(repository.uploadMedia('2026-11-10', { filename: 'photo.jpg', contentType: 'image/jpeg', data: new Uint8Array([1]) }, '')).rejects.toBeInstanceOf(ArchivePathError)
  })

  it('returns empty results for a missing archive directory', async () => {
    const root = join(tmpdir(), 'life-archive-directory-does-not-exist')
    const repository = createFilesystemMemoryRepository(root)

    expect(await repository.getMemories()).toEqual([])
    expect(await repository.getMemoryByDate('2026-11-10')).toBeNull()
  })

  it('creates and updates a memory with a new version', async () => {
    const root = await createArchive()
    const repository = createFilesystemMemoryRepository(root)
    const draft = { date: '2026-12-01', title: 'Created memory', type: 'thought' as const, tags: ['testing'], content: '## A new note\n\n**Important** detail.' }

    const created = await repository.createMemory(draft)
    const updated = await repository.updateMemory(created.date, { ...draft, title: 'Updated memory' }, created.version || '')
    const source = await readFile(join(root, '2026', '12', '01', 'index.md'), 'utf8')

    expect(created.title).toBe('Created memory')
    expect(updated.title).toBe('Updated memory')
    expect(updated.version).not.toBe(created.version)
    expect(source).toContain('title: Updated memory')
    expect(source).toContain('**Important** detail.')
  })

  it('detects an external Markdown change before updating', async () => {
    const root = await createArchive()
    const repository = createFilesystemMemoryRepository(root)
    const created = await repository.createMemory({ date: '2026-12-02', title: 'Conflict candidate', type: 'highlight', tags: [], content: 'Original' })
    const indexPath = join(root, '2026', '12', '02', 'index.md')
    await writeFile(indexPath, `${await readFile(indexPath, 'utf8')}\nExternal edit\n`)

    await expect(repository.updateMemory(created.date, { ...created, content: 'Local edit', media: undefined } as never, created.version || '')).rejects.toBeInstanceOf(MemoryConflictError)
  })

  it('deletes a memory and its media after version validation', async () => {
    const root = await createArchive()
    const repository = createFilesystemMemoryRepository(root)
    const created = await repository.createMemory({ date: '2026-12-03', title: 'Delete me', type: 'experience', tags: [], content: 'Temporary' })
    await repository.uploadMedia(created.date, { filename: 'photo.jpg', contentType: 'image/jpeg', data: new Uint8Array([1, 2, 3]) }, created.version || '')
    const withMedia = await repository.getMemoryByDate(created.date)

    await repository.deleteMemory(created.date, withMedia?.version || '')

    expect(await repository.getMemoryByDate(created.date)).toBeNull()
    await expect(stat(join(root, '2026', '12', '03'))).rejects.toThrow()
  })

  it('uploads media, persists its Markdown reference, reloads it, and removes both', async () => {
    const root = await createArchive()
    const repository = createFilesystemMemoryRepository(root)
    const created = await repository.createMemory({ date: '2026-12-04', title: 'Media test', type: 'highlight', tags: [], content: 'A frame.' })
    const upload = await repository.uploadMedia(created.date, { filename: 'frame.png', contentType: 'image/png', data: new Uint8Array([9, 8, 7]) }, created.version || '')
    const reloaded = await repository.getMemoryByDate(created.date)
    const persistedBytes = await readFile(join(root, '2026', '12', '04', 'media', 'frame.png'))
    const afterRemove = await repository.removeMedia(created.date, 'frame.png', reloaded?.version || '')
    const source = await readFile(join(root, '2026', '12', '04', 'index.md'), 'utf8')

    expect(upload.path).toBe('frame.png')
    expect(Array.from(persistedBytes)).toEqual([9, 8, 7])
    expect(reloaded?.media).toEqual([upload])
    expect(reloaded?.content).toContain('/api/archive-media/2026-12-04/frame.png')
    expect(afterRemove.media).toEqual([])
    expect(source).toContain('title: Media test')
    expect(source).not.toContain('./media/frame.png')
    await expect(stat(join(root, '2026', '12', '04', 'media', 'frame.png'))).rejects.toThrow()
  })

  it('rejects invalid metadata, unsupported uploads, oversized uploads, and upload traversal', async () => {
    const root = await createArchive()
    const repository = createFilesystemMemoryRepository(root)
    const created = await repository.createMemory({ date: '2026-12-05', title: 'Validation test', type: 'highlight', tags: [], content: 'Test' })

    await expect(repository.createMemory({ date: '2026-02-30', title: 'Invalid', type: 'highlight', tags: [], content: '' })).rejects.toBeInstanceOf(InvalidMemoryMetadataError)
    await expect(repository.uploadMedia(created.date, { filename: 'file.exe', contentType: 'application/octet-stream', data: new Uint8Array([1]) }, created.version || '')).rejects.toBeInstanceOf(MediaValidationError)
    await expect(repository.uploadMedia(created.date, { filename: '../escape.jpg', contentType: 'image/jpeg', data: new Uint8Array([1]) }, created.version || '')).rejects.toBeInstanceOf(MediaValidationError)
    await expect(repository.uploadMedia(created.date, { filename: 'large.jpg', contentType: 'image/jpeg', data: new Uint8Array(10 * 1024 * 1024 + 1) }, created.version || '')).rejects.toBeInstanceOf(MediaValidationError)
    await expect(repository.uploadMedia('2026-12-08', { filename: 'missing.jpg', contentType: 'image/jpeg', data: new Uint8Array([1]) }, 'missing-version')).rejects.toBeInstanceOf(MemoryNotFoundError)
    expect(await repository.getMemoryByDate(created.date)).toMatchObject({ media: [] })
  })

  it('does not overwrite an existing media file or add a duplicate reference', async () => {
    const root = await createArchive()
    const repository = createFilesystemMemoryRepository(root)
    const created = await repository.createMemory({ date: '2026-12-06', title: 'Duplicate media', type: 'highlight', tags: [], content: 'Test' })
    await repository.uploadMedia(created.date, { filename: 'photo.jpg', contentType: 'image/jpeg', data: new Uint8Array([1]) }, created.version || '')
    const reloaded = await repository.getMemoryByDate(created.date)

    await expect(repository.uploadMedia(created.date, { filename: 'photo.jpg', contentType: 'image/jpeg', data: new Uint8Array([9]) }, reloaded?.version || '')).rejects.toBeInstanceOf(MemoryConflictError)
    expect(Array.from(await readFile(join(root, '2026', '12', '06', 'media', 'photo.jpg')))).toEqual([1])
    expect((await readFile(join(root, '2026', '12', '06', 'index.md'), 'utf8')).match(/photo\.jpg/g)).toHaveLength(1)
  })

  it('cleans up temporary files when an atomic write cannot replace its target', async () => {
    const root = await createArchive()
    const target = join(root, 'atomic-target')
    await mkdir(target)

    await expect(writeFileAtomically(target, 'cannot replace a directory')).rejects.toThrow()
    expect((await readdir(root)).some(entry => entry.includes('.tmp'))).toBe(false)
  })
})
