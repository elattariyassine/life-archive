<script setup lang="ts">
import { countMemoryWords, formatMemoryDate, formatReadingTime, getMemoryPath, isMemoryDraft, summarizeMemoryMedia, type MemoryOrigin } from '~/utils/memory'
import { getRelatedMemories, yearsAgoLabel } from '~/utils/discovery'
import { hasValidMemoryCoordinates } from '~/utils/location-filters'
import { formatMemoryLocation } from '~/utils/location'
import { archiveFilterLink, placeFilter } from '~/utils/archive-filters'
import { NuxtLink } from '#components'

const route = useRoute()
const repository = useMemoryRepository()
const { data: memory, refresh } = await useAsyncData(`memory-${route.params.date}`, () => repository.getMemoryByDate(String(route.params.date)))
const { data: allMemories } = await useMemorySummaries()

if (!memory.value) {
  throw createError({ statusCode: 404, statusMessage: 'Memory not found' })
}

const currentIndex = computed(() => allMemories.value?.findIndex(item => item.date === memory.value?.date) ?? -1)
const newerMemory = computed(() => currentIndex.value > 0 ? allMemories.value?.[currentIndex.value - 1] : undefined)
const olderMemory = computed(() => currentIndex.value >= 0 ? allMemories.value?.[currentIndex.value + 1] : undefined)
const origin = computed<MemoryOrigin>(() => {
  const value = String(route.query.from || '')
  return value === 'home' || value === 'gallery' || value === 'search' || value === 'timeline' || value === 'map' || value === 'calendar' ? value : 'timeline'
})
const returnPath = computed(() => ({ home: '/', timeline: '/timeline', gallery: '/gallery', search: '/?modal=search', map: '/map', calendar: { path: '/calendar', query: { year: memory.value?.date.slice(0, 4) } } })[origin.value])
const returnLabel = computed(() => ({ home: 'Back to archive', timeline: 'Back to timeline', gallery: 'Back to gallery', search: 'Back to search', map: 'Back to map', calendar: 'Back to calendar' })[origin.value])
const today = useToday()
const contentWordCount = computed(() => countMemoryWords(memory.value?.content ?? ''))
const isShortMemory = computed(() => contentWordCount.value <= 90)
const isDraft = computed(() => isMemoryDraft(memory.value?.content ?? ''))
const mediaSummary = computed(() => memory.value ? summarizeMemoryMedia(memory.value) : [])
const hasCoordinates = computed(() => hasValidMemoryCoordinates(memory.value?.location))
const related = computed(() => memory.value ? getRelatedMemories(memory.value, allMemories.value ?? []) : [])
const articleElement = ref<HTMLElement | null>(null)
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
const place = computed(() => placeFilter(memory.value?.location))
const deleteError = ref('')
const deleteConflict = ref(false)
const deleting = ref(false)
const confirmingDelete = ref(false)

const handleLocationUpdated = (updated: typeof memory.value) => {
  if (updated) memory.value = updated
}

const openDeleteDialog = () => {
  deleteError.value = ''
  deleteConflict.value = false
  confirmingDelete.value = true
}

const closeDeleteDialog = () => {
  if (!deleting.value) confirmingDelete.value = false
}

const reloadAfterConflict = async () => {
  await refresh()
  deleteError.value = ''
  deleteConflict.value = false
}

const deleteMemory = async () => {
  if (!memory.value) return
  deleting.value = true
  deleteError.value = ''
  deleteConflict.value = false
  try {
    await repository.deleteMemory(memory.value.date, memory.value.version || '')
    confirmingDelete.value = false
    await navigateTo('/timeline')
  } catch (error: unknown) {
    deleteConflict.value = Boolean(error && typeof error === 'object' && 'statusCode' in error && error.statusCode === 409)
    deleteError.value = deleteConflict.value
      ? 'This memory changed outside Life Archive since you opened it. Reload it, check the changes, then delete again.'
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
    <ReadingProgress v-if="contentWordCount > 350" :target="articleElement" />
     <NuxtLink :to="returnPath" class="back-link"><Icon name="lucide:arrow-left" class="app-icon" /> {{ returnLabel }}</NuxtLink>
     <header class="memory-header">
       <div class="memory-header-meta"><MemoryMeta :memory="memory" /><component :is="place ? NuxtLink : 'span'" v-if="memory.location" :to="place ? archiveFilterLink('/timeline', place) : undefined" class="location-meta meta-link meta-link--muted"><Icon name="lucide:map-pin" class="app-icon" />{{ formatMemoryLocation(memory.location) }}</component></div>
        <h1 :class="['memory-title', memoryTitleClass]" :title="memory.title">{{ memory.title }}</h1>
       <p class="memory-lede">{{ memory.excerpt }}</p>
      </header>

      <div class="memory-layout">
        <aside class="memory-sidebar">
          <div class="detail-fact">
            <span class="fact-label">The day</span>
            <strong>{{ formatMemoryDate(memory.date, { weekday: 'long' }) }}</strong>
            <small>{{ memory.date.slice(0, 4) < today.slice(0, 4) ? yearsAgoLabel(memory.date, today) : formatMemoryDate(memory.date, { month: 'long', day: 'numeric' }) }}</small>
          </div>
          <div v-if="!isDraft || mediaSummary.length" class="detail-fact">
            <span class="fact-label">In this memory</span>
            <span v-if="!isDraft">{{ formatReadingTime(contentWordCount) }}</span>
            <span v-for="part in mediaSummary" :key="part">{{ part }}</span>
          </div>
          <div v-if="memory.mood" class="detail-fact">
            <span class="fact-label">Mood</span>
            <NuxtLink :to="archiveFilterLink('/timeline', { mood: memory.mood.label })" class="meta-link detail-fact-title" :title="`All memories that felt ${memory.mood.label.toLowerCase()}`">{{ memory.mood.label }}</NuxtLink>
            <div class="mood-scale" role="img" :aria-label="`${memory.mood.score} out of 10`"><span :style="{ width: `${memory.mood.score * 10}%` }" /></div>
            <small>{{ memory.mood.score }}/10</small>
          </div>
          <div v-if="memory.location" class="detail-fact">
            <span class="fact-label">Place</span>
            <strong>{{ memory.location.name }}</strong>
            <small v-if="[memory.location.city, memory.location.country].filter(Boolean).join(', ') !== memory.location.name">{{ [memory.location.city, memory.location.country].filter(Boolean).join(', ') }}</small>
            <NuxtLink v-if="hasCoordinates && place" :to="archiveFilterLink('/map', place)" class="text-link detail-fact-link">See it on the map <Icon name="lucide:map" class="app-icon" /></NuxtLink>
          </div>
          <div v-if="memory.tags.length" class="detail-fact"><span class="fact-label">Filed under</span><div class="tag-list"><NuxtLink v-for="tag in memory.tags" :key="tag" :to="archiveFilterLink('/timeline', { tag })" :title="`All memories tagged ${tag}`">{{ tag }}</NuxtLink></div></div>
          <div v-if="memory.music" class="music-note"><span class="fact-label"><Icon name="lucide:music-2" class="app-icon" /> On repeat</span><strong>{{ memory.music.title }}</strong><span>{{ memory.music.artist }}</span><a :href="memory.music.url" target="_blank" rel="noreferrer">Listen <Icon name="lucide:arrow-up-right" class="app-icon" /></a></div>
        </aside>
        <article ref="articleElement" class="memory-content" :class="{ 'memory-content--short': isShortMemory }">
          <div v-if="isDraft" class="memory-draft-note">
            <span class="draft-badge">Draft</span>
            <h2>This page is still blank.</h2>
            <p>The folder is ready, but nothing has been written in <code>index.md</code> yet. Open it in your editor, write what happened, and drop photos into <code>media/</code>. Come back to this tab and the page updates.</p>
            <ExternalEditingActions v-if="memory.folderPath" :folder-path="memory.folderPath" quiet />
          </div>
          <MDC v-else :value="memoryContent" />
        </article>
      </div>

      <ExifLocationSuggestions :memory="memory" @updated="handleLocationUpdated" @reload="refresh" />

      <details class="memory-archive-actions">
        <summary>Archive actions <Icon name="lucide:chevron-down" class="app-icon" /></summary>
        <div class="memory-archive-actions-body">
          <ExternalEditingActions :folder-path="memory.folderPath" quiet />
          <div v-if="memory.folderPath" class="memory-archive-actions-footer">
            <button type="button" class="text-link text-link--danger" @click="openDeleteDialog"><Icon name="lucide:trash-2" class="app-icon" /> Delete memory</button>
          </div>
        </div>
      </details>

      <ConfirmDialog
        :open="confirmingDelete"
        :title="`Delete “${memory.title}”?`"
        confirm-label="Delete permanently"
        busy-label="Deleting..."
        :confirmation-text="memory.date"
        :busy="deleting"
        :error="deleteError"
        @confirm="deleteMemory"
        @cancel="closeDeleteDialog"
      >
        <p>This permanently removes the folder for {{ formatMemoryDate(memory.date) }}: its <code>index.md</code> and every file in <code>media/</code>. Life Archive keeps no backup and this cannot be undone.</p>
        <template #error>
          <span>{{ deleteError }}</span>
          <button v-if="deleteConflict" type="button" class="text-link" @click="reloadAfterConflict">Reload memory <Icon name="lucide:refresh-cw" class="app-icon" /></button>
        </template>
      </ConfirmDialog>

     <section v-if="related.length" class="memory-related" aria-labelledby="memory-related-heading">
       <p id="memory-related-heading" class="section-label">Related pages</p>
       <div class="memory-related-list">
         <NuxtLink v-for="item in related" :key="item.memory.date" :to="getMemoryPath(item.memory.date, origin)" class="memory-related-item">
           <span class="memory-related-reason">{{ item.reason }}</span>
           <strong>{{ item.memory.title }}</strong>
           <span>{{ formatMemoryDate(item.memory.date, { month: 'short', day: 'numeric', year: 'numeric' }) }}</span>
         </NuxtLink>
       </div>
     </section>

     <nav class="memory-navigation" aria-label="Memory navigation">
       <NuxtLink v-if="olderMemory" :to="getMemoryPath(olderMemory.date, origin)" class="memory-nav-item memory-nav-item--older"><span class="nav-direction">Older memory</span><strong>{{ olderMemory.title }}</strong><span>{{ formatMemoryDate(olderMemory.date, { month: 'short', day: 'numeric', year: 'numeric' }) }}</span></NuxtLink>
       <NuxtLink v-if="newerMemory" :to="getMemoryPath(newerMemory.date, origin)" class="memory-nav-item memory-nav-item--newer"><span class="nav-direction">Newer memory</span><strong>{{ newerMemory.title }}</strong><span>{{ formatMemoryDate(newerMemory.date, { month: 'short', day: 'numeric', year: 'numeric' }) }}</span></NuxtLink>
     </nav>
     <div class="memory-random"><NuxtLink :to="{ path: '/random', query: { not: memory.date } }" class="text-link"><Icon name="lucide:shuffle" class="app-icon" /> Open a random page</NuxtLink></div>
  </div>
</template>
