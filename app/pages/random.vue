<script setup lang="ts">
import { pickRandomMemory } from '~/utils/discovery'
import { getMemoryPath } from '~/utils/memory'

const route = useRoute()
const repository = useMemoryRepository()
const memories = await repository.getMemorySummaries()
const exclude = typeof route.query.not === 'string' ? route.query.not : undefined
const memory = pickRandomMemory(memories, exclude)

await navigateTo(memory ? getMemoryPath(memory.date) : '/', { replace: true, redirectCode: 302 })
</script>

<template>
  <div class="page page-container"><p class="muted-copy">Opening a random page…</p></div>
</template>
