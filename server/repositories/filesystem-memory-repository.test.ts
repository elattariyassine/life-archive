import { mkdtemp, mkdir, readFile, readdir, realpath, rm, stat, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  ArchivePathError,
  InvalidMemoryDateError,
  InvalidMemoryMetadataError,
  MemoryConflictError,
  createFilesystemMemoryRepository,
  resolveArchiveMediaPath,
  writeFileAtomically
} from './filesystem-memory-repository'

const temporaryDirectories: string[] = []

const createArchive = async () => {
  const directory = await mkdtemp(join(tmpdir(), 'life-archive-test-'))
  temporaryDirectories.push(directory)
  return directory
}

const createInput = (date = '2026-12-01') => ({
  date,
  title: 'Created memory',
  type: 'travel' as const,
  mood: { label: 'Curious', score: 8 },
  tags: ['travel', 'testing'],
  location: 'Coast'
})

const writeMemory = async (root: string, date: string, content: string, media: string[] = []) => {
  const memoryDirectory = join(root, ...date.split('-'))
  const mediaDirectory = join(memoryDirectory, 'media')
  await mkdir(mediaDirectory, { recursive: true })
  await Promise.all(media.map(fileName => writeFile(join(mediaDirectory, fileName), 'sample media')))
  await writeFile(join(memoryDirectory, 'index.md'), `---\ndate: ${date}\ntitle: External memory\ntype: highlight\n---\n\n${content}\n`)
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map(directory => rm(directory, { recursive: true, force: true })))
})

describe('filesystem memory repository', () => {
  it('creates metadata, folder structure, media directory, and starter Markdown', async () => {
    const root = await createArchive()
    const created = await createFilesystemMemoryRepository(root).createMemory(createInput())
    const directory = join(root, '2026', '12', '01')
    const source = await readFile(join(directory, 'index.md'), 'utf8')

    expect(created).toMatchObject({
      date: '2026-12-01',
      title: 'Created memory',
      type: 'travel',
      location: 'Coast',
      folderPath: await realpath(directory),
      content: '# What happened'
    })
    expect(source).toContain('title: Created memory')
    expect(source).toContain('tags:')
    expect(await stat(join(directory, 'media'))).toBeDefined()
  })

  it('does not overwrite an existing memory on the same date', async () => {
    const root = await createArchive()
    const directory = join(root, '2026', '12', '01')
    await writeMemory(root, '2026-12-01', 'Original writing')

    await expect(createFilesystemMemoryRepository(root).createMemory(createInput())).rejects.toBeInstanceOf(MemoryConflictError)
    expect(await readFile(join(directory, 'index.md'), 'utf8')).toContain('Original writing')
  })

  it('rejects invalid creation metadata before writing', async () => {
    const root = await createArchive()
    const repository = createFilesystemMemoryRepository(root)

    await expect(repository.createMemory({ ...createInput(), date: '2026-02-30' })).rejects.toBeInstanceOf(InvalidMemoryMetadataError)
    await expect(repository.createMemory({ ...createInput(), title: '' })).rejects.toBeInstanceOf(InvalidMemoryMetadataError)
  })

  it('reads Markdown changed externally and preserves relative references on disk', async () => {
    const root = await createArchive()
    const repository = createFilesystemMemoryRepository(root)
    const created = await repository.createMemory(createInput())
    const sourcePath = join(root, '2026', '12', '01', 'index.md')
    const externalContent = '## A day outside the app\n\n![Beach](./media/beach.jpg)\n\n[Plan](./media/plan.pdf)'
    await writeFile(sourcePath, `---\ndate: ${created.date}\ntitle: ${created.title}\ntype: ${created.type}\n---\n\n${externalContent}\n`)
    await writeFile(join(root, '2026', '12', '01', 'media', 'beach.jpg'), 'image')
    await writeFile(join(root, '2026', '12', '01', 'media', 'plan.pdf'), 'pdf')

    const loaded = await repository.getMemoryByDate(created.date)
    const raw = await readFile(sourcePath, 'utf8')

    expect(loaded?.content).toContain('![Beach](/api/archive-media/2026-12-01/beach.jpg)')
    expect(loaded?.content).toContain('[Plan](/api/archive-media/2026-12-01/plan.pdf)')
    expect(raw).toContain('./media/beach.jpg')
    expect(raw).toContain('./media/plan.pdf')
  })

  it('discovers media added directly to the filesystem', async () => {
    const root = await createArchive()
    const repository = createFilesystemMemoryRepository(root)
    const created = await repository.createMemory(createInput())
    const mediaDirectory = join(root, '2026', '12', '01', 'media')
    await writeFile(join(mediaDirectory, 'beach.jpg'), 'image')
    await writeFile(join(mediaDirectory, 'clip.mp4'), 'video')
    await writeFile(join(mediaDirectory, 'voice.mp3'), 'audio')
    await writeFile(join(mediaDirectory, 'plan.pdf'), 'pdf')

    const loaded = await repository.getMemoryByDate(created.date)

    expect(loaded?.media.map(media => [media.path, media.kind])).toEqual([
      ['beach.jpg', 'image'],
      ['clip.mp4', 'video'],
      ['plan.pdf', 'document'],
      ['voice.mp3', 'audio']
    ])
  })

  it('rewrites supported relative image, video, audio, and PDF references only at read time', async () => {
    const root = await createArchive()
    await writeMemory(root, '2026-11-12', '![Photo](./media/photo.jpg)\n\n<video src="./media/clip.mp4" controls></video>\n\n<audio src="./media/voice.mp3" controls></audio>\n\n[Plan](./media/plan.pdf)', ['photo.jpg', 'clip.mp4', 'voice.mp3', 'plan.pdf'])

    const memory = await createFilesystemMemoryRepository(root).getMemoryByDate('2026-11-12')

    expect(memory?.content).toContain('![Photo](/api/archive-media/2026-11-12/photo.jpg)')
    expect(memory?.content).toContain('<video src="/api/archive-media/2026-11-12/clip.mp4" controls></video>')
    expect(memory?.content).toContain('<audio src="/api/archive-media/2026-11-12/voice.mp3" controls></audio>')
    expect(memory?.content).toContain('[Plan](/api/archive-media/2026-11-12/plan.pdf)')
    expect(await readFile(join(root, '2026', '11', '12', 'index.md'), 'utf8')).toContain('./media/photo.jpg')
  })

  it('lists memories newest first and filters by year and month', async () => {
    const root = await createArchive()
    await writeMemory(root, '2025-12-01', 'Older')
    await writeMemory(root, '2026-01-02', 'January')
    await writeMemory(root, '2026-11-10', 'Newest')
    const repository = createFilesystemMemoryRepository(root)

    expect((await repository.getMemories()).map(memory => memory.date)).toEqual(['2026-11-10', '2026-01-02', '2025-12-01'])
    expect((await repository.getMemories({ year: 2026, month: 1 })).map(memory => memory.date)).toEqual(['2026-01-02'])
  })

  it('rejects invalid dates and media paths that escape the archive', async () => {
    const root = await createArchive()
    await expect(createFilesystemMemoryRepository(root).getMemoryByDate('2026-02-30')).rejects.toBeInstanceOf(InvalidMemoryDateError)
    await expect(resolveArchiveMediaPath(root, '2026-12-01', '../index.md')).rejects.toBeInstanceOf(ArchivePathError)
  })

  it('rejects archive symlinks that escape the archive root', async () => {
    const root = await createArchive()
    const outside = await createArchive()
    await mkdir(join(root, '2026', '12'), { recursive: true })
    await symlink(outside, join(root, '2026', '12', '01'))

    await expect(createFilesystemMemoryRepository(root).getMemoryByDate('2026-12-01')).rejects.toBeInstanceOf(ArchivePathError)
  })

  it('deletes a memory only after version validation', async () => {
    const root = await createArchive()
    const repository = createFilesystemMemoryRepository(root)
    const created = await repository.createMemory(createInput())

    await expect(repository.deleteMemory(created.date, 'wrong-version')).rejects.toBeInstanceOf(MemoryConflictError)
    await repository.deleteMemory(created.date, created.version || '')
    await expect(repository.getMemoryByDate(created.date)).resolves.toBeNull()
  })

  it('cleans up temporary files after a failed atomic write', async () => {
    const root = await createArchive()
    const target = join(root, 'atomic-target')
    await mkdir(target)

    await expect(writeFileAtomically(target, 'cannot replace a directory')).rejects.toThrow()
    expect((await readdir(root)).some(entry => entry.includes('.tmp'))).toBe(false)
  })
})
