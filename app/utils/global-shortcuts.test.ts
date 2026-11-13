import { describe, expect, it } from 'vitest'
import { getGlobalShortcutAction } from './global-shortcuts'

const event = (key: string, overrides: Partial<KeyboardEvent> = {}) => ({
  key,
  metaKey: false,
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  ...overrides
}) as KeyboardEvent

describe('global shortcuts', () => {
  it('opens search with the platform command shortcut', () => {
    expect(getGlobalShortcutAction(event('k', { metaKey: true }), null)).toBe('search')
    expect(getGlobalShortcutAction(event('k', { ctrlKey: true }), null)).toBe('search')
  })

  it('keeps search available while an editable field is focused', () => {
    expect(getGlobalShortcutAction(event('k', { metaKey: true }), { tagName: 'INPUT', isContentEditable: false } as HTMLElement)).toBe('search')
    expect(getGlobalShortcutAction(event('k', { ctrlKey: true }), { tagName: 'TEXTAREA', isContentEditable: false } as HTMLElement)).toBe('search')
  })

  it('opens creation with N outside editable fields', () => {
    expect(getGlobalShortcutAction(event('n'), { tagName: 'BODY', isContentEditable: false } as HTMLElement)).toBe('create')
    expect(getGlobalShortcutAction(event('n'), { tagName: 'INPUT', isContentEditable: false } as HTMLElement)).toBeNull()
    expect(getGlobalShortcutAction(event('n'), { tagName: 'TEXTAREA', isContentEditable: false } as HTMLElement)).toBeNull()
    expect(getGlobalShortcutAction(event('n'), { tagName: 'SELECT', isContentEditable: false } as HTMLElement)).toBeNull()
    expect(getGlobalShortcutAction(event('n'), { tagName: 'DIV', isContentEditable: true } as HTMLElement)).toBeNull()
  })

  it('allows Escape to close and ignores modified creation shortcuts', () => {
    expect(getGlobalShortcutAction(event('Escape'), null)).toBe('close')
    expect(getGlobalShortcutAction(event('Escape'), { tagName: 'INPUT', isContentEditable: false } as HTMLElement)).toBe('close')
    expect(getGlobalShortcutAction(event('n', { shiftKey: true }), null)).toBeNull()
    expect(getGlobalShortcutAction(event('n', { metaKey: true }), null)).toBeNull()
  })
})
