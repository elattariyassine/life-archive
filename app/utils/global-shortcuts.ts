export type GlobalShortcutAction = 'search' | 'create' | 'close'

type ShortcutEvent = Pick<KeyboardEvent, 'key' | 'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey'>

export const isEditableTarget = (target: EventTarget | null) => {
  if (!target || typeof target !== 'object') return false
  const element = target as HTMLElement
  return element.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName)
}

export const getGlobalShortcutAction = (event: ShortcutEvent, target: EventTarget | null): GlobalShortcutAction | null => {
  const key = event.key.toLowerCase()
  if ((event.metaKey || event.ctrlKey) && key === 'k' && !event.altKey && !event.shiftKey) return 'search'
  if (key === 'escape') return 'close'
  if (key === 'n' && !event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey && !isEditableTarget(target)) return 'create'
  return null
}
