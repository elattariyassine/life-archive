<script setup lang="ts">
import { formatMemoryDate, formatType, getMemoryImages } from '~/utils/memory'

const repository = useMemoryRepository()
const { data: memories } = await useAsyncData('gallery-memories', () => repository.getMemories())
const galleryItems = computed(() => (memories.value ?? []).flatMap((memory) => {
  const images = getMemoryImages(memory)
  return (images.length ? images : [undefined]).map(media => ({ memory, media }))
}))
const galleryImageCount = computed(() => galleryItems.value.filter(item => item.media).length)
const years = computed(() => [...new Set(galleryItems.value.map(item => item.memory.date.slice(0, 4)))])
</script>

<template>
  <div class="page page-container gallery-page">
    <section class="page-intro gallery-intro">
      <p class="eyebrow">The visual record / 02</p>
      <h1>Gallery</h1>
      <p class="page-intro-copy">A collection of light, places and the details that stayed with me.</p>
      <div class="gallery-stat"><strong>{{ galleryImageCount }}</strong><span>images<br>in the archive</span></div>
    </section>
    <section v-for="year in years" :key="year" class="gallery-year">
      <div class="month-heading"><span>{{ year }}</span><span class="month-line" /><span>Photographs</span></div>
      <div class="gallery-grid">
        <NuxtLink v-for="item in galleryItems.filter(image => image.memory.date.startsWith(year))" :key="`${item.memory.date}-${item.media?.src ?? 'placeholder'}`" :to="`/memory/${item.memory.date}`" class="gallery-item">
          <div v-if="item.media" class="gallery-image-wrap"><img :src="item.media.src" :alt="item.media.alt" class="gallery-image" loading="lazy" decoding="async"></div>
          <div v-else class="gallery-image-wrap media-placeholder" aria-label="No image for this memory" />
          <div class="gallery-caption"><span>{{ formatMemoryDate(item.memory.date, { month: 'short', day: 'numeric', year: 'numeric' }) }}</span><strong>{{ item.memory.title }}</strong><span>{{ formatType(item.memory.type) }} <Icon name="lucide:arrow-up-right" class="app-icon" /></span></div>
        </NuxtLink>
      </div>
    </section>
  </div>
</template>
