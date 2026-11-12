<script setup lang="ts">
import { formatMemoryMonth, getMemoryMonth, getMemoryYear } from '~/utils/memory'
import type { Memory } from '~/types/memory'

const repository = useMemoryRepository()
const { data: memories } = await useAsyncData('timeline-memories', () => repository.getMemories())
const allMemories = computed(() => [...(memories.value ?? [])].sort((a, b) => b.date.localeCompare(a.date)))
const years = computed(() => [...new Set(allMemories.value.map(memory => getMemoryYear(memory.date)))])
const activeYear = ref<number | 'all'>('all')
const filteredMemories = computed(() => activeYear.value === 'all' ? allMemories.value : allMemories.value.filter(memory => getMemoryYear(memory.date) === activeYear.value))
const yearGroups = computed(() => {
  const groups = new Map<number, Map<string, Memory[]>>()
  filteredMemories.value.forEach((memory) => {
    const year = getMemoryYear(memory.date)
    const month = getMemoryMonth(memory.date)
    const months = groups.get(year) ?? new Map<string, Memory[]>()
    months.set(month, [...(months.get(month) ?? []), memory])
    groups.set(year, months)
  })
  return [...groups.entries()].map(([year, months]) => ({
    year,
    memories: [...months.values()].flat(),
    months: [...months.entries()].map(([month, monthMemories]) => ({ month, label: formatMemoryMonth(`${month}-01`), memories: monthMemories }))
  }))
})
const monthOptions = computed(() => allMemories.value.reduce<Array<{ value: string; label: string }>>((options, memory) => {
  const month = getMemoryMonth(memory.date)
  if (!options.some(option => option.value === month)) options.push({ value: month, label: `${formatMemoryMonth(`${month}-01`)} ${getMemoryYear(memory.date)}` })
  return options
}, []))
const jumpTarget = ref('')

const jumpToMonth = async (month: string) => {
  if (!month) return
  jumpTarget.value = ''
  await nextTick()
  document.getElementById(`timeline-${month}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>

<template>
  <div class="page page-container timeline-page">
    <section class="page-intro">
      <p class="eyebrow">The long view / 01</p>
      <h1>Timeline</h1>
      <p class="page-intro-copy">A chronological walk through the moments I decided to keep.</p>
    </section>

    <div class="timeline-controls">
      <div class="year-nav" role="group" aria-label="Filter timeline by year">
        <button type="button" :class="{ active: activeYear === 'all' }" :aria-pressed="activeYear === 'all'" @click="activeYear = 'all'">All years</button>
        <button v-for="year in years" :key="year" type="button" :class="{ active: activeYear === year }" :aria-pressed="activeYear === year" @click="activeYear = year">{{ year }}</button>
      </div>
      <label class="timeline-jump">Jump to
        <select v-model="jumpTarget" aria-label="Jump to a month or year" @change="jumpToMonth(jumpTarget)">
          <option value="">Month or year</option>
          <option v-for="option in monthOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
        </select>
      </label>
    </div>

    <div class="timeline-overview">
      <span>{{ filteredMemories.length }} entries</span>
      <span>Most recent first</span>
    </div>

    <section v-for="yearGroup in yearGroups" :id="`timeline-${yearGroup.year}`" :key="yearGroup.year" class="timeline-year">
      <div class="timeline-year-heading"><span>{{ yearGroup.year }}</span><span class="month-line" /><span>{{ yearGroup.memories.length }} {{ yearGroup.memories.length === 1 ? 'memory' : 'memories' }}</span></div>
      <section v-for="group in yearGroup.months" :id="`timeline-${group.month}`" :key="group.month" class="timeline-month">
        <div class="month-heading"><span>{{ group.label }}</span><span class="month-line" /><span>{{ group.memories.length }} {{ group.memories.length === 1 ? 'memory' : 'memories' }}</span></div>
        <TimelineEntry v-for="memory in group.memories" :key="memory.date" :memory="memory" />
      </section>
    </section>

    <div class="timeline-end"><span>End of the visible archive</span><span class="end-mark" aria-hidden="true">✳</span></div>
  </div>
</template>
