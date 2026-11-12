<script setup lang="ts">
import type { Memory } from '~/types/memory'
import { formatMemoryDate } from '~/utils/memory'

defineProps<{
  open: boolean
  memory: Memory | null
}>()

const emit = defineEmits<{
  close: []
}>()
</script>

<template>
  <ModalShell
    :open="open"
    title-id="memory-created-title"
    panel-class="modal-panel--confirmation"
    restore-focus-selector="[data-global-trigger='create']"
    @close="emit('close')"
  >
    <div v-if="memory" class="creation-success creation-success--modal">
      <p class="eyebrow">A new page / N</p>
      <h2 id="memory-created-title">Memory created</h2>
      <p class="creation-success-lede"><strong>{{ memory.title }}</strong> is ready for {{ formatMemoryDate(memory.date) }}. Continue in your preferred editor, then return here to read it.</p>
      <ExternalEditingActions :folder-path="memory.folderPath" />
      <NuxtLink :to="`/memory/${memory.date}`" class="button button--outline confirmation-read-link" @click="emit('close')">Read this memory <Icon name="lucide:arrow-up-right" class="app-icon" /></NuxtLink>
    </div>
  </ModalShell>
</template>
