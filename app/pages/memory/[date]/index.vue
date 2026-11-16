<script setup lang="ts">
import { formatMemoryDate, formatType, getMemoryPath, type MemoryOrigin } from '~/utils/memory'
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
const origin = computed<MemoryOrigin>(() => {
  const value = String(route.query.from || '')
  return value === 'home' || value === 'gallery' || value === 'search' || value === 'timeline' || value === 'map' ? value : 'timeline'
})
const returnPath = computed(() => ({ home: '/', timeline: '/timeline', gallery: '/gallery', search: '/search', map: '/map' })[origin.value])
const returnLabel = computed(() => ({ home: 'Back to archive', timeline: 'Back to timeline', gallery: 'Back to gallery', search: 'Back to search', map: 'Back to map' })[origin.value])
const contentWordCount = computed(() => memory.value?.content.trim().split(/\s+/).filter(Boolean).length ?? 0)
const isShortMemory = computed(() => contentWordCount.value <= 90)
const memoryTitleClass = computed(() => {
  const length = memory.value?.title.length ?? 0
  return length >= 66 ? 'memory-title--very-long' : length >= 42 ? 'memory-title--long' : ''
})
const memoryContent = computed(() => {
  const content = memory.value?.content ?? ''
  const lines = content.split(/\r?\n/)
  const firstContentLine = lines.findIndex(line => line.trim())
  if (firstContentLine < 0 || !memory.value) return content
  const firstLine = lines[firstContentLine]?.trim() ?? ''
  if (!/^#{1,2}\s+/.test(firstLine) || firstLine.replace(/^#{1,2}\s+/, '').trim() !== memory.value.title.trim()) return content
  return [...lines.slice(0, firstContentLine), ...lines.slice(firstContentLine + 1)].join('\n').trim()
})
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
  <div v-if="memory" class="page memory-page page-container" :class="{ 'memory-page--short': isShortMemory }">
     <NuxtLink :to="returnPath" class="back-link"><Icon name="lucide:arrow-left" class="app-icon" /> {{ returnLabel }}</NuxtLink>
     <header class="memory-header">
       <div class="memory-header-meta"><MemoryMeta :memory="memory" /><span v-if="memory.location" class="location-meta"><Icon name="lucide:map-pin" class="app-icon" />{{ formatMemoryLocation(memory.location) }}</span></div>
        <h1 :class="['memory-title', memoryTitleClass]" :title="memory.title">{{ memory.title }}</h1>
       <p class="memory-lede">{{ memory.excerpt }}</p>
      </header>

      <div class="memory-layout">
        <aside class="memory-sidebar">
         <div v-if="memory.tags.length" class="detail-fact"><span class="fact-label">Filed under</span><div class="tag-list"><span v-for="tag in memory.tags" :key="tag">{{ tag }}</span></div></div>
           <div v-if="memory.music" class="music-note"><span class="fact-label"><Icon name="lucide:music-2" class="app-icon" /> On repeat</span><strong>{{ memory.music.title }}</strong><span>{{ memory.music.artist }}</span><a :href="memory.music.url" target="_blank" rel="noreferrer">Listen <Icon name="lucide:arrow-up-right" class="app-icon" /></a></div>
         </aside>
        <article class="memory-content" :class="{ 'memory-content--short': isShortMemory }">
         <MDC :value="memoryContent" />
       </article>
      </div>

      <ExifLocationSuggestions :memory="memory" @updated="handleLocationUpdated" @reload="refresh" />

      <details class="memory-archive-actions">
        <summary>Archive actions <Icon name="lucide:chevron-down" class="app-icon" /></summary>
        <div class="memory-archive-actions-body">
          <ExternalEditingActions :folder-path="memory.folderPath" quiet />
          <div class="memory-archive-actions-footer">
            <button v-if="memory.folderPath" type="button" class="text-link text-link--danger" :disabled="deleting" @click="deleteMemory">{{ deleting ? 'Deleting...' : 'Delete memory' }}</button>
            <div v-if="deleteError" class="detail-message" role="alert"><span>{{ deleteError }}</span><button type="button" class="text-link" @click="refresh()">Reload memory <Icon name="lucide:arrow-right" class="app-icon" /></button></div>
          </div>
        </div>
      </details>

     <nav class="memory-navigation" aria-label="Memory navigation">
       <NuxtLink v-if="olderMemory" :to="getMemoryPath(olderMemory.date, origin)" class="memory-nav-item memory-nav-item--older"><span class="nav-direction">Older memory</span><strong>{{ olderMemory.title }}</strong><span>{{ formatMemoryDate(olderMemory.date, { month: 'short', day: 'numeric', year: 'numeric' }) }}</span></NuxtLink>
       <NuxtLink v-if="newerMemory" :to="getMemoryPath(newerMemory.date, origin)" class="memory-nav-item memory-nav-item--newer"><span class="nav-direction">Newer memory</span><strong>{{ newerMemory.title }}</strong><span>{{ formatMemoryDate(newerMemory.date, { month: 'short', day: 'numeric', year: 'numeric' }) }}</span></NuxtLink>
     </nav>
  </div>
</template>
