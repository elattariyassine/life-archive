<script setup lang="ts">
import { formatMemoryDate, formatType, getMemoryImages, getMemoryPath, getMemoryVisualMedia, getMemoryYear } from '~/utils/memory'
import type { MemoryMedia } from '~/types/memory'

const repository = useMemoryRepository()
const { openModal } = useGlobalModal()
const { data: memories } = await useAsyncData('home-memories', () => repository.getMemories())
const allMemories = computed(() => memories.value ?? [])
const latestMemory = computed(() => allMemories.value[0])
const latestVisualMedia = computed(() => latestMemory.value ? getMemoryVisualMedia(latestMemory.value) : [])
const latestOpeningMedia = computed(() => latestVisualMedia.value.find(media => isVideoMedia(media) || getMemoryImages({ media: [media] }).length))
const latestIsShort = computed(() => (latestMemory.value?.content.trim().length ?? 0) < 280)
const latestOpeningVariant = computed(() => latestOpeningMedia.value && !latestIsShort.value ? 'visual' : 'quiet')
const latestTitleClass = computed(() => {
  const length = latestMemory.value?.title.length ?? 0
  return length >= 66 ? 'home-opening-title--very-long' : length >= 42 ? 'home-opening-title--long' : ''
})
const recentMemories = computed(() => allMemories.value.slice(1, 4))
const archiveYears = computed(() => [...new Set(allMemories.value.map(memory => getMemoryYear(memory.date)))])
const archiveRange = computed(() => {
  const newest = allMemories.value[0]
  const oldest = allMemories.value.at(-1)
  if (!newest || !oldest || newest.date === oldest.date) return newest ? formatMemoryDate(newest.date, { month: 'long', year: 'numeric' }) : ''
  return `${formatMemoryDate(oldest.date, { month: 'short', year: 'numeric' })} – ${formatMemoryDate(newest.date, { month: 'short', year: 'numeric' })}`
})

const isVideoMedia = (media: MemoryMedia) => media.kind === 'video' || /\.(mov|mp4|webm)(?:[?#]|$)/i.test(media.path || media.src)
</script>

<template>
  <div class="page page-home">
    <section v-if="latestMemory" class="home-opening page-container" :class="`home-opening--${latestOpeningVariant}`">
      <div class="home-opening-upper">
        <div class="home-opening-copy">
          <p class="eyebrow">The archive is open</p>
          <p class="home-opening-date">{{ formatMemoryDate(latestMemory.date, { month: 'long', day: 'numeric', year: 'numeric' }) }} · {{ formatType(latestMemory.type) }}</p>
          <h1 :class="['home-opening-title', latestTitleClass]" :title="latestMemory.title">{{ latestMemory.title }}</h1>
          <p class="home-opening-excerpt">{{ latestMemory.excerpt }}</p>
        </div>
        <div v-if="latestOpeningMedia" class="home-opening-media">
          <video v-if="isVideoMedia(latestOpeningMedia)" :src="latestOpeningMedia.src" controls playsinline preload="metadata" :aria-label="latestOpeningMedia.alt" />
          <img v-else :src="latestOpeningMedia.src" :alt="latestOpeningMedia.alt" />
          <span v-if="latestVisualMedia.length > 1" class="home-opening-media-note">{{ latestVisualMedia.length }} visual records in this memory</span>
        </div>
        <div v-else class="home-opening-wordmark" aria-hidden="true">✳</div>
      </div>
      <div class="home-opening-footer">
        <p class="home-opening-range">{{ archiveRange }}</p>
        <NuxtLink :to="getMemoryPath(latestMemory.date, 'home')" class="button button--dark">Read this memory <Icon name="lucide:arrow-up-right" class="app-icon" /></NuxtLink>
      </div>
    </section>
    <section v-else class="home-empty page-container">
      <p class="eyebrow">The archive is open</p>
      <h1>The first page is still waiting.</h1>
      <p>Add a memory to begin the collection.</p>
    </section>

    <section v-if="recentMemories.length" class="home-keep-walking page-container section-divider">
      <div class="home-section-heading">
        <div><p class="section-label">Keep walking</p><h2>Recent pages</h2></div>
        <NuxtLink to="/timeline" class="text-link">Open the timeline <Icon name="lucide:arrow-up-right" class="app-icon" /></NuxtLink>
      </div>
      <div class="home-recent-list">
        <NuxtLink v-for="memory in recentMemories" :key="memory.date" :to="getMemoryPath(memory.date, 'home')" class="home-recent-row">
          <time :datetime="memory.date">{{ formatMemoryDate(memory.date, { month: 'short', day: 'numeric', year: 'numeric' }) }}</time>
          <span class="home-recent-title">{{ memory.title }}</span>
          <span class="home-recent-excerpt">{{ memory.excerpt }}</span>
          <span class="home-recent-type">{{ formatType(memory.type) }}</span>
          <Icon name="lucide:arrow-up-right" class="app-icon" />
        </NuxtLink>
      </div>
    </section>

    <section class="home-routes page-container section-divider">
      <div class="home-section-heading">
        <div><p class="section-label">Find another way in</p><h2>Explore the archive</h2></div>
        <span class="muted-copy">{{ archiveYears.length }} {{ archiveYears.length === 1 ? 'year' : 'years' }} represented</span>
      </div>
      <div class="home-route-grid">
        <NuxtLink to="/timeline" class="home-route"><span class="home-route-label">Timeline</span><span>Follow the long view <Icon name="lucide:arrow-up-right" class="app-icon" /></span></NuxtLink>
        <NuxtLink to="/gallery" class="home-route"><span class="home-route-label">Gallery</span><span>Look through the visual record <Icon name="lucide:arrow-up-right" class="app-icon" /></span></NuxtLink>
        <NuxtLink to="/map#map-filters" class="home-route"><span class="home-route-label">Map</span><span>Return by place <Icon name="lucide:arrow-up-right" class="app-icon" /></span></NuxtLink>
        <button type="button" class="home-route" data-global-trigger="search" @click="openModal('search')"><span class="home-route-label">Search</span><span>Find a phrase, person, or place <Icon name="lucide:search" class="app-icon" /></span></button>
      </div>
    </section>
  </div>
</template>
