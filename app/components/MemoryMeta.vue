<script setup lang="ts">
import { formatMemoryDate, formatType } from '~/utils/memory'
import type { Memory } from '~/types/memory'

defineProps<{ memory: Memory; compact?: boolean }>()
</script>

<template>
  <div class="memory-meta" :class="{ 'memory-meta--compact': compact }">
    <time :datetime="memory.date">{{ formatMemoryDate(memory.date, compact ? { month: 'short', day: 'numeric', year: 'numeric' } : undefined) }}</time>
    <span class="meta-divider">/</span>
    <span>{{ formatType(memory.type) }}</span>
    <template v-if="memory.mood">
      <span class="meta-divider">/</span>
      <span class="mood-label"><span class="mood-dot" :style="{ '--mood-score': memory.mood.score }" />{{ memory.mood.label }}</span>
    </template>
  </div>
</template>
