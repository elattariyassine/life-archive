import { mkdtemp, mkdir, readFile, readdir, realpath, rm, stat, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import type { MemoryCreateInput } from '../../app/types/memory'
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

const createInput = (date = '2026-12-01', overrides: Partial<MemoryCreateInput> = {}): MemoryCreateInput => ({
  date,
  title: 'Created memory',
  type: 'travel' as const,
  mood: { label: 'Curious', score: 8 },
  tags: ['travel', 'testing'],
  location: { name: 'Coast', precision: 'place', source: 'manual' },
  ...overrides
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
      location: { name: 'Coast', precision: 'place', source: 'manual' },
      folderPath: await realpath(directory),
      content: '# What happened'
    })
    expect(source).toContain('title: Created memory')
    expect(source).toContain('tags:')
    expect(source).toContain('name: Coast')
    expect(source).toContain('# Available frontmatter properties:')
    expect(source).toContain('#   precision:')
    expect(source).toContain('# music:')
    expect(await stat(join(directory, 'media'))).toBeDefined()
  })

  it('normalizes legacy scalar locations without rewriting the Markdown file', async () => {
    const root = await createArchive()
    const date = '2026-12-02'
    const directory = join(root, ...date.split('-'))
    const source = `---\ndate: ${date}\ntitle: Legacy place\ntype: travel\nlocation: Marrakech, Morocco\n---\n\nA legacy location.\n`
    await mkdir(directory, { recursive: true })
    await writeFile(join(directory, 'index.md'), source)

    const memory = await createFilesystemMemoryRepository(root).getMemoryByDate(date)

    expect(memory?.location).toEqual({ name: 'Marrakech, Morocco', precision: 'unknown' })
    expect(await readFile(join(directory, 'index.md'), 'utf8')).toBe(source)
  })

  it('parses structured locations with optional fields omitted', async () => {
    const root = await createArchive()
    const date = '2026-12-03'
    const directory = join(root, ...date.split('-'))
    await mkdir(directory, { recursive: true })
    await writeFile(join(directory, 'index.md'), `---\ndate: ${date}\ntitle: Named place\ntype: travel\nlocation:\n  name: The coast\n---\n\nA place without coordinates.\n`)

    const memory = await createFilesystemMemoryRepository(root).getMemoryByDate(date)

    expect(memory?.location).toEqual({ name: 'The coast' })
  })

  it('parses structured location details and preserves their source', async () => {
    const root = await createArchive()
    const date = '2026-12-05'
    const directory = join(root, ...date.split('-'))
    await mkdir(directory, { recursive: true })
    await writeFile(join(directory, 'index.md'), `---\ndate: ${date}\ntitle: Jardin Majorelle\ntype: travel\nlocation:\n  name: Jardin Majorelle\n  city: Marrakech\n  country: Morocco\n  latitude: 31.6416\n  longitude: -8.0034\n  precision: place\n  source: geocoding\n---\n\nA structured place.\n`)

    const memory = await createFilesystemMemoryRepository(root).getMemoryByDate(date)

    expect(memory?.location).toEqual({
      name: 'Jardin Majorelle',
      city: 'Marrakech',
      country: 'Morocco',
      latitude: 31.6416,
      longitude: -8.0034,
      precision: 'place',
      source: 'geocoding'
    })
  })

  it('does not overwrite an existing memory on the same date', async () => {
    const root = await createArchive()
    const directory = join(root, '2026', '12', '01')
    await writeMemory(root, '2026-12-01', 'Original writing')

    await expect(createFilesystemMemoryRepository(root).createMemory(createInput())).rejects.toBeInstanceOf(MemoryConflictError)
    expect(await readFile(join(directory, 'index.md'), 'utf8')).toContain('Original writing')
  })

  it('updates only location frontmatter atomically and preserves the Markdown body', async () => {
    const root = await createArchive()
    const date = '2026-12-06'
    const directory = join(root, ...date.split('-'))
    const body = '\n# What happened\n\n![Photo](./media/photo.jpg)\n\nA body kept byte-for-byte.\n'
    const source = `---\ndate: ${date}\ntitle: External memory\ntype: travel\ntags:\n  - original\nmood:\n  label: Calm\n  score: 7\n---${body}`
    await mkdir(join(directory, 'media'), { recursive: true })
    await writeFile(join(directory, 'index.md'), source)
    const repository = createFilesystemMemoryRepository(root)
    const current = await repository.getMemoryByDate(date)

    const updated = await repository.updateMemoryLocation(date, current?.version || '', { name: 'Essaouira', city: 'Essaouira', country: 'Morocco', latitude: 31, longitude: -9, precision: 'place', source: 'exif' })
    const updatedSource = await readFile(join(directory, 'index.md'), 'utf8')
    const bodyStart = updatedSource.indexOf('---\n', 4) + 3

    expect(updated.location).toMatchObject({ name: 'Essaouira', source: 'exif' })
    expect(updated.version).not.toBe(current?.version)
    expect(updatedSource.slice(bodyStart)).toBe(body)
    expect(updatedSource).toContain('  - original')
    expect(updatedSource).toContain('label: Calm')
    expect(updatedSource).toContain('name: Essaouira')
  })

  it('rejects stale or invalid location updates without changing the file', async () => {
    const root = await createArchive()
    const repository = createFilesystemMemoryRepository(root)
    const created = await repository.createMemory(createInput('2026-12-07'))
    const sourcePath = join(root, '2026', '12', '07', 'index.md')
    const source = await readFile(sourcePath, 'utf8')

    await expect(repository.updateMemoryLocation(created.date, 'stale-version', { name: 'Elsewhere', latitude: 1, longitude: 2 })).rejects.toBeInstanceOf(MemoryConflictError)
    await expect(repository.updateMemoryLocation(created.date, created.version || '', { name: 'Invalid', latitude: 91, longitude: 2 })).rejects.toBeInstanceOf(InvalidMemoryMetadataError)
    expect(await readFile(sourcePath, 'utf8')).toBe(source)
  })

  it('returns only coordinate-bearing memories from combined map filters', async () => {
    const root = await createArchive()
    const repository = createFilesystemMemoryRepository(root)
    await repository.createMemory(createInput('2026-12-08', { tags: ['summer'], location: { name: 'Essaouira', city: 'Essaouira', country: 'Morocco', latitude: 31, longitude: -9, precision: 'place', source: 'manual' } }))
    await repository.createMemory(createInput('2026-12-09', { tags: ['winter'], location: { name: 'No coordinates', precision: 'unknown', source: 'manual' } }))

    const points = await repository.getMemoryMapPoints({ year: 2026, type: 'travel', tag: 'summer', country: 'morocco', city: 'Essaouira' })

    expect(points).toHaveLength(1)
    expect(points[0]).toMatchObject({ date: '2026-12-08', location: { latitude: 31, longitude: -9 } })
    expect(points[0]).not.toHaveProperty('content')
    expect(points[0]).not.toHaveProperty('folderPath')
  })

  it('rejects invalid creation metadata before writing', async () => {
    const root = await createArchive()
    const repository = createFilesystemMemoryRepository(root)

    await expect(repository.createMemory({ ...createInput(), date: '2026-02-30' })).rejects.toBeInstanceOf(InvalidMemoryMetadataError)
    await expect(repository.createMemory({ ...createInput(), title: '' })).rejects.toBeInstanceOf(InvalidMemoryMetadataError)
    await expect(repository.createMemory({ ...createInput(), location: { name: '', source: 'manual' } })).rejects.toBeInstanceOf(InvalidMemoryMetadataError)
    await expect(repository.createMemory({ ...createInput(), location: { name: 'Place', latitude: 91, longitude: 0 } })).rejects.toBeInstanceOf(InvalidMemoryMetadataError)
    await expect(repository.createMemory({ ...createInput(), location: { name: 'Place', latitude: 0, longitude: 181 } })).rejects.toBeInstanceOf(InvalidMemoryMetadataError)
  })

  it('skips malformed structured locations without changing their source file', async () => {
    const root = await createArchive()
    const date = '2026-12-04'
    const directory = join(root, ...date.split('-'))
    const source = `---\ndate: ${date}\ntitle: Invalid place\ntype: travel\nlocation:\n  name: Place\n  latitude: 91\n  longitude: 0\n---\n\nInvalid coordinates.\n`
    await mkdir(directory, { recursive: true })
    await writeFile(join(directory, 'index.md'), source)

    await expect(createFilesystemMemoryRepository(root).getMemoryByDate(date)).resolves.toBeNull()
    expect(await readFile(join(directory, 'index.md'), 'utf8')).toBe(source)
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
    await writeFile(join(mediaDirectory, 'voice.opus'), 'audio')
    await writeFile(join(mediaDirectory, 'plan.pdf'), 'pdf')

    const loaded = await repository.getMemoryByDate(created.date)

    expect(loaded?.media.map(media => [media.path, media.kind])).toEqual([
      ['beach.jpg', 'image'],
      ['clip.mp4', 'video'],
      ['plan.pdf', 'document'],
      ['voice.mp3', 'audio'],
      ['voice.opus', 'audio']
    ])
  })

  it('rewrites supported relative image, video, audio, and PDF references only at read time', async () => {
    const root = await createArchive()
    await writeMemory(root, '2026-11-12', '<figure><img src="./media/photo.jpg" alt="Photo"><figcaption>Morning</figcaption></figure>\n\n<video src="./media/clip.mp4" controls></video>\n\n<audio src="./media/voice.mp3" controls></audio>\n\n[Plan](./media/plan.pdf)', ['photo.jpg', 'clip.mp4', 'voice.mp3', 'plan.pdf'])

    const memory = await createFilesystemMemoryRepository(root).getMemoryByDate('2026-11-12')

    expect(memory?.content).toContain('<img src="/api/archive-media/2026-11-12/photo.jpg" alt="Photo">')
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
