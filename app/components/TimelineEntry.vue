<script setup lang="ts">
import { formatMemoryDay, formatMemoryMonth, formatType } from '~/utils/memory'
import type { Memory } from '~/types/memory'

defineProps<{ memory: Memory }>()
</script>

<template>
  <article class="timeline-entry">
    <div class="timeline-date">
      <span class="timeline-day">{{ formatMemoryDay(memory.date) }}</span>
      <span class="timeline-month">{{ formatMemoryMonth(memory.date) }}</span>
    </div>
    <div class="timeline-rule" aria-hidden="true"><span /></div>
    <NuxtLink :to="`/memory/${memory.date}`" class="timeline-content">
      <div class="timeline-content-main">
        <div class="entry-kicker"><span>{{ formatType(memory.type) }}</span><span v-if="memory.location"><AppIcon name="map-pin" />{{ memory.location }}</span></div>
        <h3>{{ memory.title }}</h3>
        <p>{{ memory.excerpt }}</p>
        <div class="entry-footer">
          <span v-if="memory.mood" class="mood-label"><span class="mood-dot" :style="{ '--mood-score': memory.mood.score }" />{{ memory.mood.label }} · {{ memory.mood.score }}/10</span>
          <span class="text-link">Open entry <AppIcon name="arrow-up-right" /></span>
        </div>
      </div>
      <img v-if="memory.media[0]" :src="memory.media[0].src" :alt="memory.media[0].alt" class="timeline-image" loading="lazy" decoding="async">
    </NuxtLink>
  </article>
</template>
