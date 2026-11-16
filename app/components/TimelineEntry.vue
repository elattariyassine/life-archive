<script setup lang="ts">
import { formatMemoryDay, formatMemoryMonth, formatType, getMemoryImages, getMemoryPath } from '~/utils/memory'
import { formatMemoryLocation } from '~/utils/location'
import type { Memory } from '~/types/memory'

const props = defineProps<{ memory: Memory }>()

const images = computed(() => getMemoryImages(props.memory))
const entryKind = computed(() => images.value.length === 0 ? 'text-only' : images.value.length === 1 ? 'single-image' : 'multi-image')
const activeIndex = ref(0)
const direction = ref<'next' | 'previous'>('next')

const activeImage = computed(() => images.value[activeIndex.value])

const setImage = (index: number, movement: 'next' | 'previous' = 'next') => {
  if (!images.value.length) return
  direction.value = movement
  activeIndex.value = (index + images.value.length) % images.value.length
}

const nextImage = () => setImage(activeIndex.value + 1, 'next')
const previousImage = () => setImage(activeIndex.value - 1, 'previous')

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'ArrowRight') {
    event.preventDefault()
    nextImage()
  }
  if (event.key === 'ArrowLeft') {
    event.preventDefault()
    previousImage()
  }
}

watch(images, () => {
  if (activeIndex.value >= images.value.length) activeIndex.value = 0
})
</script>

<template>
  <article class="timeline-entry" :class="`timeline-entry--${entryKind}`">
    <div class="timeline-date">
      <time :datetime="memory.date" class="timeline-day">{{ formatMemoryDay(memory.date) }}</time>
      <span class="timeline-date-month">{{ formatMemoryMonth(memory.date) }}</span>
    </div>
    <div class="timeline-content">
      <div class="timeline-content-main">
        <div class="entry-kicker"><span>{{ formatType(memory.type) }}</span><span v-if="memory.location"><Icon name="lucide:map-pin" class="app-icon" />{{ formatMemoryLocation(memory.location) }}</span></div>
        <NuxtLink :to="getMemoryPath(memory.date, 'timeline')" class="timeline-title-link"><h3>{{ memory.title }}</h3></NuxtLink>
        <p v-if="memory.excerpt">{{ memory.excerpt }}</p>
        <div class="entry-footer">
          <span v-if="memory.mood" class="mood-label"><span class="mood-dot" :style="{ '--mood-score': memory.mood.score }" />{{ memory.mood.label }} · {{ memory.mood.score }}/10</span>
          <NuxtLink :to="getMemoryPath(memory.date, 'timeline')" class="text-link">Open entry <Icon name="lucide:arrow-up-right" class="app-icon" /></NuxtLink>
        </div>
      </div>

      <div v-if="images.length"
        class="timeline-carousel"
        :class="{ 'media-placeholder': !activeImage }"
        role="region"
        aria-label="Memory images"
        tabindex="0"
        @keydown="handleKeydown"
      >
        <NuxtLink :to="getMemoryPath(memory.date, 'timeline')" class="timeline-carousel-link" :aria-label="`Open ${memory.title}`">
          <Transition v-if="activeImage" :name="`carousel-${direction}`" mode="out-in">
            <img :key="activeImage.src" :src="activeImage.src" :alt="activeImage.alt" class="timeline-image" loading="lazy" decoding="async">
          </Transition>
        </NuxtLink>
        <template v-if="images.length > 1">
          <button type="button" class="timeline-carousel-control timeline-carousel-control--previous" aria-label="Previous image" @click.stop.prevent="previousImage"><Icon name="lucide:arrow-right" class="app-icon" /></button>
          <button type="button" class="timeline-carousel-control timeline-carousel-control--next" aria-label="Next image" @click.stop.prevent="nextImage"><Icon name="lucide:arrow-right" class="app-icon" /></button>
          <div class="timeline-carousel-meta">
            <span>{{ String(activeIndex + 1).padStart(2, '0') }} / {{ String(images.length).padStart(2, '0') }}</span>
            <div class="timeline-carousel-dots" aria-label="Choose image">
              <button v-for="(image, index) in images" :key="image.src" type="button" :class="{ active: index === activeIndex }" :aria-label="`Show image ${index + 1}`" :aria-current="index === activeIndex ? 'true' : undefined" @click.stop.prevent="setImage(index, index >= activeIndex ? 'next' : 'previous')" />
            </div>
          </div>
        </template>
      </div>
    </div>
  </article>
</template>
