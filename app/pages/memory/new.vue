<script setup lang="ts">
import MemoryCreationForm from '~/components/MemoryCreationForm.vue'
import type { Memory, MemoryCreateInput, MemoryWriteRepository } from '~/types/memory'
import { getApiErrorCode, getApiErrorMessage } from '~/utils/api-error'

const repository = useMemoryRepository() as MemoryWriteRepository
const busy = ref(false)
const error = ref('')
const created = ref<Memory | null>(null)

const getErrorMessage = (value: unknown) => {
  if (getApiErrorCode(value) === 'REPOSITORY_READ_ONLY') return 'Memory creation requires filesystem mode and an archive directory.'
  if (getApiErrorCode(value) === 'MEMORY_CONFLICT') return 'A memory already exists for this date. Choose another date.'
  return getApiErrorMessage(value, 'The memory could not be created. Check the fields and try again.')
}

const createMemory = async (input: MemoryCreateInput) => {
  busy.value = true
  error.value = ''
  try {
    created.value = await repository.createMemory(input)
  } catch (value) {
    error.value = getErrorMessage(value)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <MemoryCreationForm v-if="!created" :busy="busy" :error="error" @save="createMemory" @cancel="navigateTo('/timeline')" />

  <main v-else class="creation-success page-container">
    <NuxtLink to="/timeline" class="back-link"><Icon name="lucide:arrow-right" class="app-icon" /> Back to timeline</NuxtLink>
    <p class="eyebrow">A new page / 04</p>
    <h1>Memory created</h1>
    <p class="creation-success-lede"><strong>{{ created.title }}</strong> is ready for {{ created.date }}. Continue in your preferred editor, then return here to read it.</p>
    <ExternalEditingActions :folder-path="created.folderPath" />
    <NuxtLink :to="`/memory/${created.date}`" class="text-link">Read this memory <Icon name="lucide:arrow-up-right" class="app-icon" /></NuxtLink>
  </main>
</template>
