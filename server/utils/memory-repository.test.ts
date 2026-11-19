import { describe, expect, it } from 'vitest'
import { getMemoryRepositoryMode, toHostFolderPath } from './memory-repository'

describe('memory repository selection', () => {
  it('uses the archive folder only when NUXT_ARCHIVE_DIR is set', () => {
    expect(getMemoryRepositoryMode({ archiveDir: '/data/archive' })).toBe('filesystem')
    expect(getMemoryRepositoryMode({ archiveDir: '  ' })).toBe('sample')
    expect(getMemoryRepositoryMode({})).toBe('sample')
  })

  it('maps container folder paths back to the host archive path', () => {
    expect(toHostFolderPath('/archive/2026/11/10', '/archive', '/Users/me/life-archive-data/')).toBe('/Users/me/life-archive-data/2026/11/10')
    expect(toHostFolderPath('/archive/2026/11/10', '/archive/', '')).toBe('/archive/2026/11/10')
    expect(toHostFolderPath('/elsewhere/2026', '/archive', '/Users/me/data')).toBe('/elsewhere/2026')
    expect(toHostFolderPath('/archive-old/2026', '/archive', '/Users/me/data')).toBe('/archive-old/2026')
    expect(toHostFolderPath(undefined, '/archive', '/Users/me/data')).toBeUndefined()
  })
})
