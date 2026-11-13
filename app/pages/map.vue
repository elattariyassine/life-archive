<script setup lang="ts">
import { memoryTypes, type MemoryType } from '~/types/memory'
import type { MemoryMapResponse } from '~/types/location-discovery'
import { createDebouncedTask } from '~/utils/location-selection'
import { formatType } from '~/utils/memory'

const config = useRuntimeConfig()
const filters = reactive<{ year?: number; type?: MemoryType; tag: string; mood: string; country: string; city: string }>({ tag: '', mood: '', country: '', city: '' })
const yearOptions = ref<number[]>([])

const requestQuery = () => ({
  ...(filters.year ? { year: filters.year } : {}),
  ...(filters.type ? { type: filters.type } : {}),
  ...(filters.tag.trim() ? { tag: filters.tag.trim() } : {}),
  ...(filters.mood.trim() ? { mood: filters.mood.trim() } : {}),
  ...(filters.country.trim() ? { country: filters.country.trim() } : {}),
  ...(filters.city.trim() ? { city: filters.city.trim() } : {})
})

const { data, pending, error, refresh } = await useAsyncData<MemoryMapResponse>('memory-map-points', () => $fetch<MemoryMapResponse>('/api/map' as string, { query: requestQuery() }))
const points = computed(() => data.value?.points || [])
const mapStyleUrl = computed(() => String(config.public.mapStyleUrl || ''))
const debouncedRefresh = createDebouncedTask(() => void refresh(), 220)

watch(data, value => {
  if (yearOptions.value.length || !value?.points.length) return
  yearOptions.value = [...new Set(value.points.map(point => Number(point.date.slice(0, 4))))].sort((a, b) => b - a)
}, { immediate: true })

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

    <section class="map-filters" aria-label="Filter memories on the map">
      <div class="map-filter-heading"><span class="section-label">Filter the archive</span><button type="button" class="search-clear" @click="clearFilters">Clear all</button></div>
      <div class="map-filter-grid">
        <label><span>Year</span><select v-model="filters.year"><option :value="undefined">All years</option><option v-for="year in yearOptions" :key="year" :value="year">{{ year }}</option></select></label>
        <label><span>Type</span><select v-model="filters.type"><option :value="undefined">All types</option><option v-for="type in memoryTypes" :key="type" :value="type">{{ formatType(type) }}</option></select></label>
        <label><span>Tag</span><input v-model="filters.tag" type="search" placeholder="summer"></label>
        <label><span>Mood</span><input v-model="filters.mood" type="search" placeholder="grateful"></label>
        <label><span>Country</span><input v-model="filters.country" type="search" placeholder="Morocco"></label>
        <label><span>City</span><input v-model="filters.city" type="search" placeholder="Marrakech"></label>
      </div>
    </section>

    <div class="map-overview"><span>{{ pending ? 'Reading the archive...' : `${points.length} ${points.length === 1 ? 'memory' : 'memories'} with coordinates` }}</span><span><i class="map-legend-dot map-legend-dot--precise"></i> Precise <i class="map-legend-dot map-legend-dot--approximate"></i> Approximate</span></div>
    <div v-if="pending && !points.length" class="map-state"><p>Reading the archive...</p><small>Only memories with valid coordinates will appear.</small></div>
    <div v-else-if="error && !points.length" class="map-state map-state--error" role="alert"><p>The map could not read the archive right now.</p><small>Try the filters again or return to the timeline.</small></div>
    <div v-else-if="!points.length" class="map-state"><p>No memories match this place.</p><small>Memories need valid coordinates before they can appear here.</small></div>
    <div v-else class="map-stage">
      <MemoryMapExplorer :points="points" :style-url="mapStyleUrl" />
      <div v-if="pending" class="map-refresh-state">Updating the map...</div>
      <div v-if="error" class="map-refresh-state map-refresh-state--error" role="alert">The latest filter could not be loaded.</div>
    </div>
  </div>
</template>
