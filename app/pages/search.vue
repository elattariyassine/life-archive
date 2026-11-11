<script setup lang="ts">
import { memoryTypes, type MemorySearchResult, type MemoryType } from '~/types/memory'
import { formatType, getMemoryYear } from '~/utils/memory'

const repository = useMemoryRepository()
const { data: archiveMemories } = await useAsyncData('search-years', () => repository.getMemories())
const years = computed(() => [...new Set((archiveMemories.value ?? []).map(memory => getMemoryYear(memory.date)))].sort((a, b) => b - a))
const query = ref('')
const year = ref('')
const type = ref<MemoryType | ''>('')
const results = ref<MemorySearchResult[]>([])
const hasSearched = ref(false)
const loading = ref(false)
const error = ref('')

const matchLabels: Record<MemorySearchResult['matches'][number], string> = {
  title: 'Title',
  content: 'Content',
  tag: 'Tag',
  location: 'Location'
}

const search = async () => {
  const trimmedQuery = query.value.trim()
  error.value = ''
  if (!trimmedQuery) {
    hasSearched.value = false
    results.value = []
    return
  }
  hasSearched.value = true

  const numericYear = year.value ? Number(year.value) : undefined
  if (numericYear !== undefined && (!Number.isInteger(numericYear) || numericYear < 1 || numericYear > 9999)) {
    error.value = 'Use a four-digit year.'
    results.value = []
    return
  }

  loading.value = true
  try {
    results.value = await repository.searchMemories({ query: trimmedQuery, year: numericYear, type: type.value || undefined })
  } catch {
    error.value = 'Search is unavailable. Check the archive and try again.'
    results.value = []
  } finally {
    loading.value = false
  }
}

const clearSearch = () => {
  query.value = ''
  year.value = ''
  type.value = ''
  results.value = []
  hasSearched.value = false
  error.value = ''
}

const clearQuery = () => {
  query.value = ''
  if (!loading.value) {
    results.value = []
    hasSearched.value = false
    error.value = ''
  }
}
</script>

<template>
  <div class="page page-container search-page">
    <section class="page-intro">
      <p class="eyebrow">Find your way back / 02</p>
      <h1>Search</h1>
      <p class="page-intro-copy">Look across titles, stories, tags, and places without leaving the archive.</p>
    </section>

    <form class="search-form" @submit.prevent="search">
      <label class="search-input-wrap">
        <span class="sr-only">Search the archive</span>
        <Icon name="lucide:search" class="app-icon" />
        <input v-model="query" type="search" placeholder="Try a person, place, or phrase" autocomplete="off">
        <button v-if="query" type="button" class="search-clear" aria-label="Clear search" @click="clearQuery">Clear</button>
      </label>
      <div class="search-filters">
        <label><span>Year</span><select v-model="year"><option value="">All years</option><option v-for="archiveYear in years" :key="archiveYear" :value="archiveYear">{{ archiveYear }}</option></select></label>
        <label><span>Type</span><select v-model="type"><option value="">All types</option><option v-for="memoryType in memoryTypes" :key="memoryType" :value="memoryType">{{ formatType(memoryType) }}</option></select></label>
        <div class="search-actions">
          <button type="submit" class="button button--dark" :disabled="loading || !query.trim()">{{ loading ? 'Searching...' : 'Search' }} <Icon name="lucide:arrow-right" class="app-icon" /></button>
          <button v-if="hasSearched" type="button" class="button button--outline" @click="clearSearch">Reset</button>
        </div>
      </div>
    </form>

    <div v-if="error" class="search-message search-message--error" role="alert">{{ error }}</div>
    <section v-else-if="!hasSearched" class="search-state">
      <span class="section-label">A quiet index</span>
      <h2>Search the whole archive.</h2>
      <p>Results are read directly from the current Markdown files, so external changes appear the next time you search.</p>
    </section>
    <section v-else-if="loading" class="search-state search-state--empty" aria-live="polite">
      <span class="section-label">Looking through the archive</span>
      <h2>Finding the right page.</h2>
    </section>
    <section v-else-if="!results.length && !loading" class="search-state search-state--empty">
      <span class="section-label">Nothing found</span>
      <h2>No memory matched “{{ query.trim() }}”.</h2>
      <p>Try a shorter phrase, another place, or a different memory type.</p>
    </section>
    <section v-else class="search-results" aria-live="polite">
      <div class="search-results-heading"><span>{{ results.length }} {{ results.length === 1 ? 'memory' : 'memories' }}</span><span>Most recent first</span></div>
      <NuxtLink v-for="result in results" :key="result.memory.date" :to="`/memory/${result.memory.date}`" class="search-result">
        <div class="search-result-date"><strong>{{ result.memory.date.slice(8, 10) }}</strong><span>{{ result.memory.date.slice(0, 7) }}</span></div>
        <div class="search-result-copy">
          <div class="entry-kicker"><span>{{ formatType(result.memory.type) }}</span><span v-for="match in result.matches" :key="match">{{ matchLabels[match] }}</span></div>
          <h2>{{ result.memory.title }}</h2>
          <p>{{ result.excerpt }}</p>
        </div>
        <Icon name="lucide:arrow-up-right" class="app-icon" />
      </NuxtLink>
    </section>
  </div>
</template>
