<script setup lang="ts">
defineOptions({ inheritAttrs: false })

const props = defineProps<{
  src: string
  alt?: string
}>()

const attrs = useAttrs()
const isOpen = ref(false)

const closeViewer = () => {
  isOpen.value = false
}

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') closeViewer()
}

watch(isOpen, open => {
  if (!import.meta.client) return
  if (open) {
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeydown)
  } else {
    document.body.style.overflow = ''
    window.removeEventListener('keydown', handleKeydown)
  }
})

onBeforeUnmount(() => {
  if (!import.meta.client) return
  document.body.style.overflow = ''
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <span class="memory-image-viewer">
    <img v-bind="attrs" :src="props.src" :alt="props.alt || ''">
    <button type="button" class="memory-image-fullscreen" aria-label="Open image full screen" @click="isOpen = true">
      <Icon name="lucide:expand" class="app-icon" />
    </button>
  </span>

  <Teleport to="body">
    <div v-if="isOpen" class="memory-image-lightbox" role="dialog" aria-modal="true" :aria-label="props.alt || 'Full-screen image'" @click.self="closeViewer">
      <button type="button" class="memory-image-lightbox-close" aria-label="Close full-screen image" @click="closeViewer">
        <Icon name="lucide:x" class="app-icon" />
      </button>
      <img :src="props.src" :alt="props.alt || ''">
    </div>
  </Teleport>
</template>
