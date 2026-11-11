<script setup lang="ts">
import { formatMemoryDate, formatType } from '~/utils/memory'

const route = useRoute()
const repository = useMemoryRepository()
const { data: memory } = await useAsyncData(`memory-${route.params.date}`, () => repository.getMemoryByDate(String(route.params.date)))
const { data: allMemories } = await useAsyncData('memory-navigation', () => repository.getMemories())

if (!memory.value) {
  throw createError({ statusCode: 404, statusMessage: 'Memory not found' })
}

const currentIndex = computed(() => allMemories.value?.findIndex(item => item.date === memory.value?.date) ?? -1)
const newerMemory = computed(() => currentIndex.value > 0 ? allMemories.value?.[currentIndex.value - 1] : undefined)
const olderMemory = computed(() => currentIndex.value >= 0 ? allMemories.value?.[currentIndex.value + 1] : undefined)

useSeoMeta({
  title: () => memory.value ? `${memory.value.title} / Life Archive` : 'Memory / Life Archive',
  description: () => memory.value?.excerpt
})
</script>

<template>
  <div v-if="memory" class="page memory-page page-container">
    <NuxtLink to="/timeline" class="back-link"><AppIcon name="arrow-right" /> Back to timeline</NuxtLink>
    <header class="memory-header">
      <div class="memory-header-meta"><MemoryMeta :memory="memory" /><span v-if="memory.location" class="location-meta"><AppIcon name="map-pin" />{{ memory.location }}</span></div>
      <h1>{{ memory.title }}</h1>
      <p class="memory-lede">{{ memory.excerpt }}</p>
    </header>

    <div class="memory-layout">
      <aside class="memory-sidebar">
        <div v-if="memory.mood" class="detail-fact"><span class="fact-label">Mood</span><strong>{{ memory.mood.label }}</strong><span class="mood-scale"><span :style="{ width: `${memory.mood.score * 10}%` }" /></span><small>{{ memory.mood.score }} / 10</small></div>
        <div class="detail-fact"><span class="fact-label">Type</span><strong>{{ formatType(memory.type) }}</strong></div>
        <div v-if="memory.tags.length" class="detail-fact"><span class="fact-label">Filed under</span><div class="tag-list"><span v-for="tag in memory.tags" :key="tag">{{ tag }}</span></div></div>
        <div v-if="memory.music" class="music-note"><span class="fact-label"><AppIcon name="music" /> On repeat</span><strong>{{ memory.music.title }}</strong><span>{{ memory.music.artist }}</span><a :href="memory.music.url" target="_blank" rel="noreferrer">Listen <AppIcon name="arrow-up-right" /></a></div>
      </aside>
      <article class="memory-content">
        <MDC :value="memory.content" />
        <div v-if="memory.media.length" class="memory-gallery">
          <figure v-for="image in memory.media" :key="image.src">
            <img :src="image.src" :alt="image.alt" loading="lazy" decoding="async">
            <figcaption v-if="image.caption">{{ image.caption }}</figcaption>
          </figure>
        </div>
      </article>
    </div>

    <nav class="memory-navigation" aria-label="Memory navigation">
      <NuxtLink v-if="olderMemory" :to="`/memory/${olderMemory.date}`" class="memory-nav-item memory-nav-item--older"><span class="nav-direction">Older memory</span><strong>{{ olderMemory.title }}</strong><span>{{ formatMemoryDate(olderMemory.date, { month: 'short', day: 'numeric', year: 'numeric' }) }}</span></NuxtLink>
      <NuxtLink v-if="newerMemory" :to="`/memory/${newerMemory.date}`" class="memory-nav-item memory-nav-item--newer"><span class="nav-direction">Newer memory</span><strong>{{ newerMemory.title }}</strong><span>{{ formatMemoryDate(newerMemory.date, { month: 'short', day: 'numeric', year: 'numeric' }) }}</span></NuxtLink>
    </nav>
  </div>
</template>
