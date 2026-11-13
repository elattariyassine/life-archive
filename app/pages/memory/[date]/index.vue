<script setup lang="ts">
import { formatMemoryDate, formatType } from '~/utils/memory'
import { formatMemoryLocation } from '~/utils/location'

const route = useRoute()
const repository = useMemoryRepository()
const { data: memory, refresh } = await useAsyncData(`memory-${route.params.date}`, () => repository.getMemoryByDate(String(route.params.date)))
const { data: allMemories } = await useAsyncData('memory-navigation', () => repository.getMemories())

if (!memory.value) {
  throw createError({ statusCode: 404, statusMessage: 'Memory not found' })
}

const currentIndex = computed(() => allMemories.value?.findIndex(item => item.date === memory.value?.date) ?? -1)
const newerMemory = computed(() => currentIndex.value > 0 ? allMemories.value?.[currentIndex.value - 1] : undefined)
const olderMemory = computed(() => currentIndex.value >= 0 ? allMemories.value?.[currentIndex.value + 1] : undefined)
const deleteError = ref('')
const deleting = ref(false)

const handleLocationUpdated = (updated: typeof memory.value) => {
  if (updated) memory.value = updated
}

const deleteMemory = async () => {
  if (!memory.value || !window.confirm(`Delete “${memory.value.title}”? This permanently deletes index.md and every file in its media/ folder.`)) return
  deleting.value = true
  deleteError.value = ''
  try {
    await repository.deleteMemory(memory.value.date, memory.value.version || '')
    await navigateTo('/timeline')
  } catch (error: unknown) {
    deleteError.value = error && typeof error === 'object' && 'statusCode' in error && error.statusCode === 409
      ? 'This memory changed outside Life Archive. Reload it before deleting.'
      : 'The memory could not be deleted.'
  } finally {
    deleting.value = false
  }
}

useSeoMeta({
  title: () => memory.value ? `${memory.value.title} / Life Archive` : 'Memory / Life Archive',
  description: () => memory.value?.excerpt
})
</script>

<template>
  <div v-if="memory" class="page memory-page page-container">
    <NuxtLink to="/timeline" class="back-link"><Icon name="lucide:arrow-right" class="app-icon" /> Back to timeline</NuxtLink>
    <header class="memory-header">
       <div class="memory-header-meta"><MemoryMeta :memory="memory" /><span v-if="memory.location" class="location-meta"><Icon name="lucide:map-pin" class="app-icon" />{{ formatMemoryLocation(memory.location) }}</span></div>
       <h1>{{ memory.title }}</h1>
       <p class="memory-lede">{{ memory.excerpt }}</p>
     </header>

    <div class="memory-layout">
      <aside class="memory-sidebar">
        <div v-if="memory.mood" class="detail-fact"><span class="fact-label">Mood</span><strong>{{ memory.mood.label }}</strong><span class="mood-scale"><span :style="{ width: `${memory.mood.score * 10}%` }" /></span><small>{{ memory.mood.score }} / 10</small></div>
        <div class="detail-fact"><span class="fact-label">Type</span><strong>{{ formatType(memory.type) }}</strong></div>
        <div v-if="memory.tags.length" class="detail-fact"><span class="fact-label">Filed under</span><div class="tag-list"><span v-for="tag in memory.tags" :key="tag">{{ tag }}</span></div></div>
          <div v-if="memory.music" class="music-note"><span class="fact-label"><Icon name="lucide:music-2" class="app-icon" /> On repeat</span><strong>{{ memory.music.title }}</strong><span>{{ memory.music.artist }}</span><a :href="memory.music.url" target="_blank" rel="noreferrer">Listen <Icon name="lucide:arrow-up-right" class="app-icon" /></a></div>
          <div v-if="memory.media.length" class="detail-fact"><span class="fact-label">Media folder</span><strong>{{ memory.media.length }} {{ memory.media.length === 1 ? 'file' : 'files' }}</strong><span>Managed outside Life Archive</span></div>
          <details class="memory-actions-menu">
            <summary>Memory actions <Icon name="lucide:chevron-down" class="app-icon" /></summary>
            <button type="button" class="text-link text-link--danger" :disabled="deleting" @click="deleteMemory">{{ deleting ? 'Deleting...' : 'Delete memory' }}</button>
          </details>
          <div v-if="deleteError" class="detail-message detail-message--sidebar" role="alert"><span>{{ deleteError }}</span><button type="button" class="text-link" @click="refresh()">Reload memory <Icon name="lucide:arrow-right" class="app-icon" /></button></div>
       </aside>
       <article class="memory-content">
         <MDC :value="memory.content" />
       </article>
      </div>

      <ExifLocationSuggestions :memory="memory" @updated="handleLocationUpdated" @reload="refresh" />

       <ExternalEditingActions :folder-path="memory.folderPath" quiet />

    <nav class="memory-navigation" aria-label="Memory navigation">
      <NuxtLink v-if="olderMemory" :to="`/memory/${olderMemory.date}`" class="memory-nav-item memory-nav-item--older"><span class="nav-direction">Older memory</span><strong>{{ olderMemory.title }}</strong><span>{{ formatMemoryDate(olderMemory.date, { month: 'short', day: 'numeric', year: 'numeric' }) }}</span></NuxtLink>
      <NuxtLink v-if="newerMemory" :to="`/memory/${newerMemory.date}`" class="memory-nav-item memory-nav-item--newer"><span class="nav-direction">Newer memory</span><strong>{{ newerMemory.title }}</strong><span>{{ formatMemoryDate(newerMemory.date, { month: 'short', day: 'numeric', year: 'numeric' }) }}</span></NuxtLink>
    </nav>
  </div>
</template>
