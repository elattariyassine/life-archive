<script setup lang="ts">
import type { MemorySearchResult } from '~/types/memory'
import { formatMemoryDate, formatType, getMemoryImages } from '~/utils/memory'
import { formatMemoryLocation } from '~/utils/location'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const repository = useMemoryRepository()
const query = ref('')
const results = ref<MemorySearchResult[]>([])
const selectedIndex = ref(0)
const loading = ref(false)
const error = ref('')
let debounceTimer: ReturnType<typeof setTimeout> | undefined
let requestId = 0

const selectedResult = computed(() => results.value[selectedIndex.value])

const reset = () => {
  if (debounceTimer) clearTimeout(debounceTimer)
  requestId += 1
  query.value = ''
  results.value = []
  selectedIndex.value = 0
  loading.value = false
  error.value = ''
}

const search = async (value: string) => {
  const currentRequest = ++requestId
  const trimmedQuery = value.trim()
  if (!trimmedQuery) {
    results.value = []
    selectedIndex.value = 0
    loading.value = false
    error.value = ''
    return
  }

  loading.value = true
  error.value = ''
  try {
    const nextResults = await repository.searchMemories({ query: trimmedQuery })
    if (currentRequest !== requestId) return
    results.value = nextResults
    selectedIndex.value = 0
  } catch {
    if (currentRequest !== requestId) return
    results.value = []
    error.value = 'Search is unavailable. Check the archive and try again.'
  } finally {
    if (currentRequest === requestId) loading.value = false
  }
}

watch(query, value => {
  if (debounceTimer) clearTimeout(debounceTimer)
  if (!value.trim()) {
    requestId += 1
    results.value = []
    selectedIndex.value = 0
    loading.value = false
    error.value = ''
    return
  }
  loading.value = true
  debounceTimer = setTimeout(() => search(value), 180)
})

watch(() => props.open, open => {
  if (!open) reset()
})

const moveSelection = (direction: 1 | -1) => {
  if (!results.value.length) return
  selectedIndex.value = (selectedIndex.value + direction + results.value.length) % results.value.length
  nextTick(() => document.getElementById(`global-search-result-${selectedIndex.value}`)?.scrollIntoView({ block: 'nearest' }))
}

const openSelected = () => {
  const result = selectedResult.value
  if (!result) return
  emit('close')
  navigateTo(`/memory/${result.memory.date}`)
}

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    moveSelection(1)
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    moveSelection(-1)
  } else if (event.key === 'Enter' && selectedResult.value) {
    event.preventDefault()
    openSelected()
  }
}
</script>

<template>
  <ModalShell
    :open="open"
    title-id="global-search-title"
    panel-class="modal-panel--search"
    restore-focus-selector="[data-global-trigger='search']"
    @close="emit('close')"
  >
    <div class="global-search" @keydown="handleKeydown">
      <header class="global-search-heading">
        <div>
          <p class="eyebrow">A quiet index / ⌘K</p>
          <h2 id="global-search-title">Search the archive</h2>
        </div>
        <span class="modal-hint">Esc to close</span>
      </header>
      <label class="global-search-input-wrap">
        <span class="sr-only">Search the archive</span>
        <Icon name="lucide:search" class="app-icon" />
        <input v-model="query" data-modal-autofocus type="search" placeholder="Try a person, place, or phrase" autocomplete="off" aria-controls="global-search-results" :aria-activedescendant="selectedResult ? `global-search-result-${selectedIndex}` : undefined">
        <button v-if="query" type="button" class="search-clear" aria-label="Clear search" @click="query = ''">Clear</button>
      </label>

      <div v-if="loading" class="global-search-state" aria-live="polite">
        <span class="section-label">Looking through the archive</span>
        <p>Finding the right page.</p>
      </div>
      <div v-else-if="error" class="search-message search-message--error" role="alert">{{ error }}</div>
      <div v-else-if="!query.trim()" class="global-search-state">
        <span class="section-label">Ready when you are</span>
        <p>Search titles, stories, tags, places, types, and dates.</p>
      </div>
      <div v-else-if="!results.length" class="global-search-state">
        <span class="section-label">Nothing found</span>
        <p>No memory matched “{{ query.trim() }}”.</p>
      </div>
      <div v-else id="global-search-results" class="global-search-results" role="listbox" aria-label="Search results">
        <NuxtLink
          v-for="(result, index) in results"
          :id="`global-search-result-${index}`"
          :key="result.memory.date"
          :to="`/memory/${result.memory.date}`"
          class="global-search-result"
          :class="{ 'global-search-result--selected': index === selectedIndex }"
          role="option"
          :aria-selected="index === selectedIndex"
          @mouseenter="selectedIndex = index"
          @click="emit('close')"
        >
          <div v-if="getMemoryImages(result.memory)[0]" class="global-search-result-image">
            <img :src="getMemoryImages(result.memory)[0].src" :alt="getMemoryImages(result.memory)[0].alt" loading="lazy" decoding="async">
          </div>
          <div v-else class="global-search-result-image media-placeholder" aria-hidden="true" />
          <div class="global-search-result-copy">
             <div class="entry-kicker"><span>{{ formatType(result.memory.type) }}</span><span>{{ formatMemoryDate(result.memory.date, { month: 'short', day: 'numeric', year: 'numeric' }) }}</span><span v-if="result.memory.location"><Icon name="lucide:map-pin" class="app-icon" />{{ formatMemoryLocation(result.memory.location) }}</span></div>
            <h3>{{ result.memory.title }}</h3>
            <p>{{ result.excerpt }}</p>
          </div>
          <Icon name="lucide:arrow-up-right" class="app-icon" />
        </NuxtLink>
      </div>
      <footer class="global-search-footer"><span><kbd>↑</kbd><kbd>↓</kbd> to move</span><span><kbd>Enter</kbd> to open</span></footer>
    </div>
  </ModalShell>
</template>
