<script setup lang="ts">
import { formatMemoryDate, formatType } from '~/utils/memory'
import { archiveFilterLink } from '~/utils/archive-filters'
import type { Memory } from '~/types/memory'

defineProps<{ memory: Pick<Memory, 'date' | 'type'>; compact?: boolean }>()
</script>

<template>
  <div class="memory-meta" :class="{ 'memory-meta--compact': compact }">
    <time :datetime="memory.date">{{ formatMemoryDate(memory.date, compact ? { month: 'short', day: 'numeric', year: 'numeric' } : undefined) }}</time>
    <span class="meta-divider">/</span>
    <NuxtLink :to="archiveFilterLink('/timeline', { type: memory.type })" class="meta-link" :title="`All ${formatType(memory.type).toLowerCase()} memories`">{{ formatType(memory.type) }}</NuxtLink>
  </div>
</template>
