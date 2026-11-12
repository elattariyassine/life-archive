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
    <MemoryCreationForm v-if="open" compact :busy="busy" :error="error" @save="createMemory" @cancel="close" />
  </ModalShell>
</template>
