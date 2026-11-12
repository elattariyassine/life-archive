<script setup lang="ts">
import { formatType, getMemoryImages } from '~/utils/memory'
import type { Memory } from '~/types/memory'

const props = withDefaults(defineProps<{ memory: Memory; featured?: boolean }>(), { featured: false })
const images = computed(() => getMemoryImages(props.memory))
</script>

<template>
  <article class="memory-card" :class="{ 'memory-card--featured': featured, 'memory-card--text-only': !images.length }">
    <NuxtLink :to="`/memory/${memory.date}`" class="memory-card-link">
      <div class="memory-card-image-wrap" :class="{ 'media-placeholder': !images.length }">
        <img v-if="images[0]" :src="images[0].src" :alt="images[0].alt" class="memory-card-image" loading="lazy" decoding="async">
        <span v-if="images.length" class="image-index">01 / {{ String(images.length).padStart(2, '0') }}</span>
      </div>
      <div class="memory-card-copy">
        <div class="memory-card-topline">
          <time :datetime="memory.date">{{ memory.date }}</time>
          <span>{{ formatType(memory.type) }}</span>
        </div>
        <h3>{{ memory.title }}</h3>
        <p>{{ memory.excerpt }}</p>
        <span class="text-link">Read memory <Icon name="lucide:arrow-up-right" class="app-icon" /></span>
      </div>
    </NuxtLink>
  </article>
</template>
