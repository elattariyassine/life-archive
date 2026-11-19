<script setup lang="ts">
import type { MemoryMapResponse } from '~/types/location-discovery'
import { toArchiveFilterQuery } from '~/utils/archive-filters'

const config = useRuntimeConfig()
const { filters, isFiltered, clearFilters } = useArchiveFilters()
const mapQuery = computed(() => toArchiveFilterQuery(filters.value))
const { data, pending, error } = await useFetch<MemoryMapResponse>('/api/map', { key: 'memory-map-points', query: mapQuery })
const points = computed(() => data.value?.points || [])
const mapStyleUrl = computed(() => String(config.public.mapStyleUrl || ''))
const summary = computed(() => pending.value ? 'Reading the archive...' : `${points.value.length} ${points.value.length === 1 ? 'memory' : 'memories'} with coordinates`)

useSeoMeta({ title: 'Map / Life Archive', description: 'Rediscover memories by location.' })
</script>

<template>
  <div class="page map-page page-container">
    <header class="page-intro map-page-intro">
      <p class="eyebrow">Places remembered</p>
      <h1>Find the <em>where</em>.</h1>
      <p class="page-intro-copy">A quiet map of the memories that carry coordinates. Select a place to return to the page behind it.</p>
    </header>

    <div id="map-filters" class="map-controls">
      <ArchiveFilterBar :summary="summary">
        <span class="map-legend"><i class="map-legend-dot map-legend-dot--precise"></i> Precise <i class="map-legend-dot map-legend-dot--approximate"></i> Approximate</span>
      </ArchiveFilterBar>
    </div>
    <div v-if="pending && !data" class="map-state"><p>Reading the archive...</p><small>Only memories with valid coordinates will appear.</small></div>
    <div v-else-if="error && !data" class="map-state map-state--error" role="alert"><p>The map could not read the archive right now.</p><small>Try the filters again or return to the timeline.</small></div>
    <div v-else class="map-stage" :class="{ 'map-stage--empty': !pending && !error && !points.length }">
      <MemoryMapExplorer :points="points" :style-url="mapStyleUrl" />
      <div v-if="!pending && !error && !points.length" class="map-empty-overlay">
        <div class="map-empty-card">
          <span class="eyebrow">A quiet patch</span>
          <p>{{ isFiltered ? 'No memories match these filters.' : 'No memory has coordinates yet.' }}</p>
          <button v-if="isFiltered" type="button" class="button button--dark" @click="clearFilters">Clear filters</button>
        </div>
      </div>
      <div v-if="pending" class="map-refresh-state">Updating the map...</div>
      <div v-if="error" class="map-refresh-state map-refresh-state--error" role="alert">The latest filter could not be loaded.</div>
    </div>
  </div>
</template>
