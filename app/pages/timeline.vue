<script setup lang="ts">
import { formatMemoryMonthYear, getMemoryYear } from '~/utils/memory'

const repository = useMemoryRepository()
const { data: memories } = await useAsyncData('timeline-memories', () => repository.getMemories())
const allMemories = computed(() => memories.value ?? [])
const years = computed(() => [...new Set(allMemories.value.map(memory => getMemoryYear(memory.date)))])
const activeYear = ref<number | 'all'>('all')
const filteredMemories = computed(() => activeYear.value === 'all' ? allMemories.value : allMemories.value.filter(memory => getMemoryYear(memory.date) === activeYear.value))
const monthGroups = computed(() => {
  const groups = new Map<string, typeof allMemories.value>()
  filteredMemories.value.forEach((memory) => {
    const month = memory.date.slice(0, 7)
    groups.set(month, [...(groups.get(month) ?? []), memory])
  })
  return [...groups.entries()].map(([month, monthMemories]) => ({ month, label: formatMemoryMonthYear(`${month}-01`), memories: monthMemories }))
})
</script>

<template>
  <div class="page page-container timeline-page">
    <section class="page-intro">
      <p class="eyebrow">The long view / 01</p>
      <h1>Timeline</h1>
      <p class="page-intro-copy">A chronological walk through the moments I decided to keep.</p>
    </section>

    <div class="year-nav" role="group" aria-label="Filter timeline by year">
      <button type="button" :class="{ active: activeYear === 'all' }" :aria-pressed="activeYear === 'all'" @click="activeYear = 'all'">All years</button>
      <button v-for="year in years" :key="year" type="button" :class="{ active: activeYear === year }" :aria-pressed="activeYear === year" @click="activeYear = year">{{ year }}</button>
    </div>

    <div class="timeline-overview">
      <span>{{ filteredMemories.length }} entries</span>
      <span>Most recent first</span>
    </div>

    <section v-for="group in monthGroups" :key="group.month" class="timeline-month">
      <div class="month-heading"><span>{{ group.label }}</span><span class="month-line" /><span>{{ group.memories.length }} {{ group.memories.length === 1 ? 'memory' : 'memories' }}</span></div>
      <TimelineEntry v-for="memory in group.memories" :key="memory.date" :memory="memory" />
    </section>

    <div class="timeline-end"><span>End of the visible archive</span><span class="end-mark" aria-hidden="true">✳</span></div>
  </div>
</template>
