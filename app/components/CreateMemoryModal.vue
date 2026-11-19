<script setup lang="ts">
import type { Memory, MemoryCreateInput, MemoryWriteRepository } from '~/types/memory'
import { getApiErrorCode, getApiErrorMessage } from '~/utils/api-error'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  close: []
  created: [memory: Memory]
}>()

const repository = useMemoryRepository() as MemoryWriteRepository
const { createDate } = useGlobalModal()
const { canWrite, isFilesystem, isChecking } = useArchiveStatus()
const busy = ref(false)
const error = ref('')

const getErrorMessage = (value: unknown) => {
  if (getApiErrorCode(value) === 'REPOSITORY_READ_ONLY') return 'Memory creation requires filesystem mode and an archive directory.'
  if (getApiErrorCode(value) === 'MEMORY_CONFLICT') return 'A memory already exists for this date. Choose another date.'
  return getApiErrorMessage(value, 'The memory could not be created. Check the fields and try again.')
}

const close = () => {
  if (busy.value) return
  error.value = ''
  emit('close')
}

const createMemory = async (input: MemoryCreateInput) => {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    const created = await repository.createMemory(input)
    emit('created', created)
  } catch (value) {
    error.value = getErrorMessage(value)
  } finally {
    busy.value = false
  }
}

watch(() => props.open, open => {
  if (!open) {
    busy.value = false
    error.value = ''
  }
})
</script>

<template>
  <ModalShell
    :open="open"
    title-id="create-memory-modal-title"
    panel-class="modal-panel--create"
    :close-disabled="busy"
    restore-focus-selector="[data-global-trigger='create']"
    @close="close"
  >
    <MemoryCreationForm v-if="open && canWrite" :initial-date="createDate || undefined" :busy="busy" :error="error" @save="createMemory" @cancel="close" />
    <div v-else-if="open" class="creation-readonly">
      <p class="eyebrow">Capture a page / N</p>
      <h2 id="create-memory-modal-title">{{ isChecking ? 'Checking the archive…' : 'This archive is read-only' }}</h2>
      <p v-if="!isChecking" class="creation-readonly-copy">
        {{ isFilesystem
          ? 'The configured archive folder could not be found or opened, so a new memory has nowhere to go. Check the folder and restart the server.'
          : 'You are browsing the sample memories. New memories are created as folders in your own archive, so connect one first by setting NUXT_ARCHIVE_DIR on the server.' }}
      </p>
      <div class="creation-actions">
        <NuxtLink to="/settings" class="button button--dark" @click="close">Archive settings <Icon name="lucide:arrow-right" class="app-icon" /></NuxtLink>
        <button type="button" class="button button--outline" @click="close">Close</button>
      </div>
    </div>
  </ModalShell>
</template>
