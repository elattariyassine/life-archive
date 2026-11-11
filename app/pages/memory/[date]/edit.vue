<script setup lang="ts">
import type { Memory, MemoryDraft } from '~/types/memory'

const route = useRoute()
const repository = useMemoryRepository()
const { data: memory, error: loadError, refresh } = await useAsyncData(`memory-edit-${route.params.date}`, () => repository.getMemoryByDate(String(route.params.date)))
if (loadError.value) throw loadError.value
if (!memory.value) throw createError({ statusCode: 404, statusMessage: 'Memory not found' })

const currentMemory = ref<Memory>(memory.value)
const busy = ref(false)
const error = ref('')
const conflict = ref(false)

const getErrorMessage = (value: unknown) => {
  if (value && typeof value === 'object' && 'statusCode' in value && value.statusCode === 409) {
    conflict.value = true
    return 'This memory changed outside Life Archive. No changes were written.'
  }
  return 'The memory could not be saved. Check the fields and try again.'
}

const save = async (draft: MemoryDraft, file?: File) => {
  busy.value = true
  error.value = ''
  conflict.value = false
  try {
    const updated = await repository.updateMemory(currentMemory.value.date, draft, currentMemory.value.version || '')
    currentMemory.value = updated
    if (file) {
      try {
        await repository.uploadMedia(updated.date, file, updated.version || '')
      } catch (value) {
        error.value = value && typeof value === 'object' && 'statusCode' in value && value.statusCode === 409
          ? 'The memory was saved, but the media upload conflicted with another change.'
          : 'The memory was saved, but the media upload failed. Try again with a supported file under 10 MB.'
        return
      }
    }
    await navigateTo(`/memory/${updated.date}`)
  } catch (value) {
    error.value = getErrorMessage(value)
  } finally {
    busy.value = false
  }
}

const removeMedia = async (path: string) => {
  busy.value = true
  error.value = ''
  try {
    currentMemory.value = await repository.removeMedia(currentMemory.value.date, path, currentMemory.value.version || '')
  } catch (value) {
    error.value = getErrorMessage(value)
  } finally {
    busy.value = false
  }
}

const reload = async () => {
  await refresh()
  if (memory.value) currentMemory.value = memory.value
  error.value = ''
  conflict.value = false
}
</script>

<template>
  <MemoryEditor v-if="currentMemory" mode="edit" :memory="currentMemory" :busy="busy" :error="error" :conflict="conflict" @save="save" @remove-media="removeMedia" @reload="reload" @cancel="navigateTo(`/memory/${currentMemory.date}`)" />
</template>
