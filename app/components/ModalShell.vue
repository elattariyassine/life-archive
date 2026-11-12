<script setup lang="ts">
const props = withDefaults(defineProps<{
  open: boolean
  titleId: string
  panelClass?: string
  closeDisabled?: boolean
  restoreFocusSelector?: string
}>(), { panelClass: '', closeDisabled: false, restoreFocusSelector: '' })

const emit = defineEmits<{
  close: []
}>()

const panel = ref<HTMLElement | null>(null)
const previousFocus = shallowRef<HTMLElement | null>(null)
let previousOverflow = ''
let hasOpened = false

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',')

const focusInitialElement = () => {
  const root = panel.value
  if (!root) return
  const autofocus = root.querySelector<HTMLElement>('[data-modal-autofocus]')
  const firstFocusable = root.querySelector<HTMLElement>(focusableSelector)
  ;(autofocus || firstFocusable || root).focus()
}

const restoreFocus = () => {
  const target = previousFocus.value && previousFocus.value !== document.body
    ? previousFocus.value
    : props.restoreFocusSelector
      ? document.querySelector<HTMLElement>(props.restoreFocusSelector)
      : null
  target?.focus()
  previousFocus.value = null
}

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    if (!props.closeDisabled) emit('close')
    return
  }
  if (event.key !== 'Tab') return

  const root = panel.value
  if (!root) return
  const focusable = [...root.querySelectorAll<HTMLElement>(focusableSelector)]
  if (!focusable.length) {
    event.preventDefault()
    root.focus()
    return
  }
  const first = focusable[0]!
  const last = focusable[focusable.length - 1]!
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

watch(() => props.open, async open => {
  if (!import.meta.client) return
  if (open) {
    hasOpened = true
    previousFocus.value = document.activeElement as HTMLElement | null
    previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    await nextTick()
    focusInitialElement()
  } else {
    if (!hasOpened) return
    document.body.style.overflow = previousOverflow
    restoreFocus()
  }
}, { immediate: true })

onBeforeUnmount(() => {
  if (!import.meta.client) return
  if (!hasOpened) return
  document.body.style.overflow = previousOverflow
  restoreFocus()
})
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="modal-backdrop" @click.self="!closeDisabled && emit('close')">
      <section
        ref="panel"
        class="modal-panel"
        :class="panelClass"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        tabindex="-1"
        @keydown="handleKeydown"
      >
        <button type="button" class="modal-close" aria-label="Close dialog" :disabled="closeDisabled" @click="emit('close')">
          <Icon name="lucide:x" class="app-icon" />
        </button>
        <slot />
      </section>
    </div>
  </Teleport>
</template>
