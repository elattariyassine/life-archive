<script setup lang="ts">
import { formatMemoryDate, formatType, getMemoryImages, getMemoryPath, getMemoryVisualMedia, getMemoryYear } from '~/utils/memory'
import { getOnThisDay, yearsAgoLabel } from '~/utils/discovery'
import type { MemoryMedia } from '~/types/memory'

const today = useToday()
const { openModal } = useGlobalModal()
const { data: memories } = await useMemorySummaries()
const allMemories = computed(() => memories.value ?? [])
const latestMemory = computed(() => allMemories.value[0])
const latestVisualMedia = computed(() => latestMemory.value ? getMemoryVisualMedia(latestMemory.value) : [])
const latestOpeningMedia = computed(() => latestVisualMedia.value.find(media => isVideoMedia(media) || getMemoryImages({ media: [media] }).length))
const latestIsShort = computed(() => (latestMemory.value?.wordCount ?? 0) < 50)
const latestOpeningVariant = computed(() => latestOpeningMedia.value && !latestIsShort.value ? 'visual' : 'quiet')
const latestTitleClass = computed(() => {
  const length = latestMemory.value?.title.length ?? 0
  return length >= 66 ? 'home-opening-title--very-long' : length >= 42 ? 'home-opening-title--long' : ''
})
const onThisDay = computed(() => getOnThisDay(allMemories.value, today.value))
const recentMemories = computed(() => allMemories.value.slice(1, 4))
const archiveYears = computed(() => [...new Set(allMemories.value.map(memory => getMemoryYear(memory.date)))])
const archiveRange = computed(() => {
  const newest = allMemories.value[0]
  const oldest = allMemories.value.at(-1)
  if (!newest || !oldest || newest.date === oldest.date) return newest ? formatMemoryDate(newest.date, { month: 'long', year: 'numeric' }) : ''
  return `${formatMemoryDate(oldest.date, { month: 'short', year: 'numeric' })} – ${formatMemoryDate(newest.date, { month: 'short', year: 'numeric' })}`
})
const stats = computed(() => {
  const places = new Set(allMemories.value.map(memory => memory.location?.city || memory.location?.country || memory.location?.name).filter(Boolean))
  const visuals = allMemories.value.reduce((total, memory) => total + getMemoryVisualMedia(memory).length, 0)
  return [
    { value: allMemories.value.length, label: allMemories.value.length === 1 ? 'memory' : 'memories' },
    { value: archiveYears.value.length, label: archiveYears.value.length === 1 ? 'year' : 'years' },
    { value: places.size, label: places.size === 1 ? 'place' : 'places' },
    { value: visuals, label: visuals === 1 ? 'photo or video' : 'photos & videos' }
  ]
})

const isVideoMedia = (media: MemoryMedia) => media.kind === 'video' || /\.(mov|mp4|webm)(?:[?#]|$)/i.test(media.path || media.src)
</script>

<template>
  <div class="page page-home">
    <section v-if="latestMemory" class="home-opening page-container" :class="`home-opening--${latestOpeningVariant}`">
      <div class="home-opening-upper">
        <div class="home-opening-copy">
          <p class="eyebrow">The latest page</p>
          <p class="home-opening-date">{{ formatMemoryDate(latestMemory.date, { month: 'long', day: 'numeric', year: 'numeric' }) }} · {{ formatType(latestMemory.type) }}</p>
          <h1 :class="['home-opening-title', latestTitleClass]" :title="latestMemory.title">{{ latestMemory.title }}</h1>
          <p class="home-opening-excerpt">{{ latestMemory.excerpt }}</p>
        </div>
        <div v-if="latestOpeningMedia" class="home-opening-media">
          <video v-if="isVideoMedia(latestOpeningMedia)" :src="latestOpeningMedia.src" controls playsinline preload="metadata" :aria-label="latestOpeningMedia.alt" />
          <img v-else :src="latestOpeningMedia.src" :alt="latestOpeningMedia.alt" />
          <span v-if="latestVisualMedia.length > 1" class="home-opening-media-note">{{ latestVisualMedia.length }} photos and videos in this memory</span>
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
      <button type="button" class="button button--dark" data-global-trigger="create" @click="openModal('create')">New memory <Icon name="lucide:arrow-right" class="app-icon" /></button>
    </section>

    <section v-if="onThisDay.memories.length" class="home-on-this-day page-container section-divider" aria-labelledby="on-this-day-heading">
      <div class="home-section-heading">
        <div>
          <p class="section-label">{{ formatMemoryDate(today, { month: 'long', day: 'numeric' }) }}</p>
          <h2 id="on-this-day-heading">{{ onThisDay.kind === 'day' ? 'On this day' : 'This week, in other years' }}</h2>
        </div>
        <NuxtLink :to="{ path: '/calendar', query: { year: onThisDay.memories[0]!.date.slice(0, 4) } }" class="text-link">Open the calendar <Icon name="lucide:arrow-up-right" class="app-icon" /></NuxtLink>
      </div>
      <div class="on-this-day-grid">
        <NuxtLink v-for="memory in onThisDay.memories.slice(0, 3)" :key="memory.date" :to="getMemoryPath(memory.date, 'home')" class="on-this-day-card">
          <div class="on-this-day-media" :class="{ 'media-placeholder': !getMemoryImages(memory)[0] }">
            <img v-if="getMemoryImages(memory)[0]" :src="getMemoryImages(memory)[0]!.thumb || getMemoryImages(memory)[0]!.src" :alt="getMemoryImages(memory)[0]!.alt" loading="lazy" decoding="async">
          </div>
          <span class="on-this-day-when">{{ yearsAgoLabel(memory.date, today) }} · {{ formatMemoryDate(memory.date, { month: 'short', day: 'numeric', year: 'numeric' }) }}</span>
          <strong>{{ memory.title }}</strong>
          <span class="on-this-day-excerpt">{{ memory.excerpt }}</span>
        </NuxtLink>
      </div>
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

    <section v-if="allMemories.length" class="home-glance page-container section-divider" aria-labelledby="home-glance-heading">
      <div class="home-section-heading">
        <div><p class="section-label">At a glance</p><h2 id="home-glance-heading">{{ archiveRange }}</h2></div>
      </div>
      <dl class="home-stats">
        <div v-for="stat in stats" :key="stat.label"><dt>{{ stat.label }}</dt><dd>{{ stat.value }}</dd></div>
      </dl>
      <div class="home-glance-actions">
        <NuxtLink to="/random" class="button button--outline"><Icon name="lucide:shuffle" class="app-icon" /> Open a random page</NuxtLink>
        <NuxtLink to="/calendar" class="button button--outline"><Icon name="lucide:calendar-days" class="app-icon" /> See the calendar</NuxtLink>
      </div>
    </section>
  </div>
</template>
