<script setup lang="ts">
import { formatType } from '~/utils/memory'
import type { Memory } from '~/types/memory'

withDefaults(defineProps<{ memory: Memory; featured?: boolean }>(), { featured: false })
</script>

<template>
  <article class="memory-card" :class="{ 'memory-card--featured': featured }">
    <NuxtLink :to="`/memory/${memory.date}`" class="memory-card-link">
      <div v-if="memory.media[0]" class="memory-card-image-wrap">
        <img :src="memory.media[0].src" :alt="memory.media[0].alt" class="memory-card-image" loading="lazy" decoding="async">
        <span class="image-index">01 / {{ String(memory.media.length).padStart(2, '0') }}</span>
      </div>
      <div class="memory-card-copy">
        <div class="memory-card-topline">
          <time :datetime="memory.date">{{ memory.date }}</time>
          <span>{{ formatType(memory.type) }}</span>
        </div>
        <h3>{{ memory.title }}</h3>
        <p>{{ memory.excerpt }}</p>
        <span class="text-link">Read memory <AppIcon name="arrow-up-right" /></span>
      </div>
    </NuxtLink>
  </article>
</template>
