<script setup lang="ts">
import type { MemoryDraft, MemoryWriteRepository } from '~/types/memory'

const repository = useMemoryRepository() as MemoryWriteRepository
const busy = ref(false)
const error = ref('')

const getErrorMessage = (value: unknown) => {
  if (value && typeof value === 'object' && 'statusCode' in value && value.statusCode === 409) return 'Memory editing is not enabled for the current sample repository.'
  return 'The memory could not be saved. Check the fields and try again.'
}

const save = async (draft: MemoryDraft, file?: File) => {
  busy.value = true
  error.value = ''
  try {
    const memory = await repository.createMemory(draft)
    if (file) {
      try {
        await repository.uploadMedia(memory.date, file, memory.version || '')
      } catch {
        try {
          await repository.deleteMemory(memory.date, memory.version || '')
        } catch {
          error.value = 'The memory was created, but the media upload failed. It remains available without that file.'
          return
        }
        error.value = 'The memory was not saved because the media upload failed. Try again with a supported file under 10 MB.'
        return
      }
    }
    await navigateTo(`/memory/${memory.date}`)
  } catch (value) {
    error.value = getErrorMessage(value)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <MemoryEditor mode="create" :busy="busy" :error="error" @save="save" @cancel="navigateTo('/timeline')" />
</template>
