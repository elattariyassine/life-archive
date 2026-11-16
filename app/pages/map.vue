<script setup lang="ts">
import { memoryTypes, type MemoryType } from '~/types/memory'
import type { MemoryMapFilterOptions, MemoryMapResponse } from '~/types/location-discovery'
import { createDebouncedTask } from '~/utils/location-selection'
import { formatType } from '~/utils/memory'

const config = useRuntimeConfig()
const filters = reactive<{ year?: number; type?: MemoryType; tag: string; mood: string; country: string; city: string }>({ tag: '', mood: '', country: '', city: '' })

const requestQuery = () => ({
  ...(filters.year ? { year: filters.year } : {}),
  ...(filters.type ? { type: filters.type } : {}),
  ...(filters.tag.trim() ? { tag: filters.tag.trim() } : {}),
  ...(filters.mood.trim() ? { mood: filters.mood.trim() } : {}),
  ...(filters.country.trim() ? { country: filters.country.trim() } : {}),
  ...(filters.city.trim() ? { city: filters.city.trim() } : {})
})

const { data, pending, error, refresh } = await useAsyncData<MemoryMapResponse>('memory-map-points', () => $fetch<MemoryMapResponse>('/api/map' as string, { query: requestQuery() }))
const { data: filterOptions } = await useAsyncData<MemoryMapFilterOptions>('memory-map-filter-options', () => $fetch<MemoryMapFilterOptions>('/api/map-options' as string))
const points = computed(() => data.value?.points || [])
const yearOptions = computed(() => filterOptions.value?.years || [])
const tagOptions = computed(() => filterOptions.value?.tags || [])
const moodOptions = computed(() => filterOptions.value?.moods || [])
const countryOptions = computed(() => filterOptions.value?.countries || [])
const cityOptions = computed(() => filterOptions.value?.cities || [])
const mapStyleUrl = computed(() => String(config.public.mapStyleUrl || ''))
const debouncedRefresh = createDebouncedTask(() => void refresh(), 220)

watch(filters, () => debouncedRefresh.schedule(), { deep: true })
onBeforeUnmount(() => debouncedRefresh.cancel())

const clearFilters = () => {
  filters.year = undefined
  filters.type = undefined
  filters.tag = ''
  filters.mood = ''
  filters.country = ''
  filters.city = ''
}

useSeoMeta({ title: 'Map / Life Archive', description: 'Rediscover memories by location.' })
</script>

<template>
  <div class="page map-page page-container">
    <header class="page-intro map-page-intro">
      <p class="eyebrow">Places remembered / 05</p>
      <h1>Find the <em>where</em>.</h1>
      <p class="page-intro-copy">A quiet map of the memories that carry coordinates. Select a place to return to the page behind it.</p>
    </header>

    <section id="map-filters" class="map-filters" aria-label="Filter memories on the map">
      <div class="map-filter-heading"><span class="section-label">Filter the archive</span><button type="button" class="search-clear" @click="clearFilters">Clear all</button></div>
      <div class="map-filter-grid">
        <label><span>Year</span><select v-model="filters.year"><option :value="undefined">All years</option><option v-for="year in yearOptions" :key="year" :value="year">{{ year }}</option></select></label>
        <label><span>Type</span><select v-model="filters.type"><option :value="undefined">All types</option><option v-for="type in memoryTypes" :key="type" :value="type">{{ formatType(type) }}</option></select></label>
        <label><span>Tag</span><select v-model="filters.tag"><option value="">All tags</option><option v-for="tag in tagOptions" :key="tag" :value="tag">{{ tag }}</option></select></label>
        <label><span>Mood</span><select v-model="filters.mood"><option value="">All moods</option><option v-for="mood in moodOptions" :key="mood" :value="mood">{{ mood }}</option></select></label>
        <label><span>Country</span><select v-model="filters.country"><option value="">All countries</option><option v-for="country in countryOptions" :key="country" :value="country">{{ country }}</option></select></label>
        <label><span>City</span><select v-model="filters.city"><option value="">All cities</option><option v-for="city in cityOptions" :key="city" :value="city">{{ city }}</option></select></label>
      </div>
    </section>

    <div class="map-overview"><span>{{ pending ? 'Reading the archive...' : `${points.length} ${points.length === 1 ? 'memory' : 'memories'} with coordinates` }}</span><span><i class="map-legend-dot map-legend-dot--precise"></i> Precise <i class="map-legend-dot map-legend-dot--approximate"></i> Approximate</span></div>
    <div v-if="pending && !data" class="map-state"><p>Reading the archive...</p><small>Only memories with valid coordinates will appear.</small></div>
    <div v-else-if="error && !data" class="map-state map-state--error" role="alert"><p>The map could not read the archive right now.</p><small>Try the filters again or return to the timeline.</small></div>
    <div v-else class="map-stage" :class="{ 'map-stage--empty': !pending && !error && !points.length }">
      <MemoryMapExplorer :points="points" :style-url="mapStyleUrl" />
      <div v-if="!pending && !error && !points.length" class="map-empty-overlay">
        <div class="map-empty-card">
          <span class="eyebrow">A quiet patch</span>
          <p>No memories match these filters.</p>
          <button type="button" class="button button--dark" @click="clearFilters">Clear filters</button>
        </div>
      </div>
      <div v-if="pending" class="map-refresh-state">Updating the map...</div>
      <div v-if="error" class="map-refresh-state map-refresh-state--error" role="alert">The latest filter could not be loaded.</div>
    </div>
  </div>
</template>
