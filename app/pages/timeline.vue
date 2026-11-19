<script setup lang="ts">
import { formatMemoryMonth, formatMemoryMonthYear, getMemoryMonth, getMemoryYear } from '~/utils/memory'
import { matchesArchiveFilters } from '~/utils/archive-filters'
import type { MemorySummary } from '~/types/memory'

const { filters, isFiltered, clearFilters } = useArchiveFilters()
const { data: memories } = await useMemorySummaries()
const allMemories = computed(() => [...(memories.value ?? [])].sort((a, b) => b.date.localeCompare(a.date)))
const filteredMemories = computed(() => allMemories.value.filter(memory => matchesArchiveFilters(memory, filters.value)))
const { limit, sentinel, hasMore, showMore, ensureVisible, reset } = useProgressiveList(computed(() => filteredMemories.value.length), 25)
const visibleMemories = computed(() => filteredMemories.value.slice(0, limit.value))

type MonthGroup = { month: string; label: string; memories: MemorySummary[] }
const groupByYearAndMonth = (list: MemorySummary[]) => {
  const groups = new Map<number, Map<string, MemorySummary[]>>()
  list.forEach((memory) => {
    const year = getMemoryYear(memory.date)
    const month = getMemoryMonth(memory.date)
    const months = groups.get(year) ?? new Map<string, MemorySummary[]>()
    months.set(month, [...(months.get(month) ?? []), memory])
    groups.set(year, months)
  })
  return [...groups.entries()].map(([year, months]) => ({
    year,
    months: [...months.entries()].map(([month, monthMemories]): MonthGroup => ({ month, label: formatMemoryMonth(`${month}-01`), memories: monthMemories }))
  }))
}

/** Counts come from the full filtered set so headings stay truthful while later entries are still loading. */
const fullCounts = computed(() => {
  const counts = new Map<string, number>()
  filteredMemories.value.forEach(memory => {
    counts.set(String(getMemoryYear(memory.date)), (counts.get(String(getMemoryYear(memory.date))) ?? 0) + 1)
    counts.set(getMemoryMonth(memory.date), (counts.get(getMemoryMonth(memory.date)) ?? 0) + 1)
  })
  return counts
})
const yearGroups = computed(() => groupByYearAndMonth(visibleMemories.value))
const jumpGroups = computed(() => groupByYearAndMonth(filteredMemories.value).map(group => ({
  year: group.year,
  months: group.months.map(month => ({ value: month.month, label: `${formatMemoryMonthYear(`${month.month}-01`)} · ${month.memories.length}` }))
})))
const summary = computed(() => {
  const count = filteredMemories.value.length
  return isFiltered.value ? `${count} of ${allMemories.value.length} entries` : `${count} ${count === 1 ? 'entry' : 'entries'}, newest first`
})
const countLabel = (count: number) => `${count} ${count === 1 ? 'memory' : 'memories'}`
const jumpTarget = ref('')

watch(filters, () => reset())

const jumpToMonth = async (month: string) => {
  if (!month) return
  jumpTarget.value = ''
  const index = filteredMemories.value.findIndex(memory => getMemoryMonth(memory.date) === month)
  if (index >= 0) ensureVisible(index + 5)
  await nextTick()
  document.getElementById(`timeline-${month}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

useSeoMeta({ title: 'Timeline / Life Archive' })
</script>

<template>
  <div class="page page-container timeline-page">
    <section class="page-intro">
      <p class="eyebrow">The long view</p>
      <h1>Timeline</h1>
      <p class="page-intro-copy">A chronological walk through the moments I decided to keep.</p>
    </section>

    <div class="timeline-controls">
      <ArchiveFilterBar :summary="summary">
        <label v-if="jumpGroups.length" class="timeline-jump">Jump to
          <select v-model="jumpTarget" aria-label="Jump to a month" @change="jumpToMonth(jumpTarget)">
            <option value="">Choose a month</option>
            <optgroup v-for="group in jumpGroups" :key="group.year" :label="String(group.year)">
              <option v-for="option in group.months" :key="option.value" :value="option.value">{{ option.label }}</option>
            </optgroup>
          </select>
        </label>
      </ArchiveFilterBar>
    </div>

    <div v-if="!filteredMemories.length" class="archive-empty-state">
      <p class="section-label">{{ isFiltered ? 'Nothing matches' : 'An empty shelf' }}</p>
      <p>{{ isFiltered ? 'No memory matches these filters.' : 'There are no memories in the archive yet.' }}</p>
      <button v-if="isFiltered" type="button" class="button button--outline button--small" @click="clearFilters">Clear filters</button>
    </div>

    <section v-for="yearGroup in yearGroups" :id="`timeline-${yearGroup.year}`" :key="yearGroup.year" class="timeline-year">
      <div class="timeline-year-heading"><span>{{ yearGroup.year }}</span><span class="month-line" /><span>{{ countLabel(fullCounts.get(String(yearGroup.year)) ?? 0) }}</span></div>
      <section v-for="group in yearGroup.months" :id="`timeline-${group.month}`" :key="group.month" class="timeline-month">
        <div class="month-heading"><span>{{ group.label }}</span><span class="month-line" /><span>{{ countLabel(fullCounts.get(group.month) ?? 0) }}</span></div>
        <TimelineEntry v-for="memory in group.memories" :key="memory.date" :memory="memory" />
      </section>
    </section>

    <div v-if="hasMore" ref="sentinel" class="list-more">
      <button type="button" class="button button--outline button--small" @click="showMore">Show older entries ({{ filteredMemories.length - limit }} more)</button>
    </div>
    <div v-else-if="filteredMemories.length" class="timeline-end"><span>End of the visible archive</span><span class="end-mark" aria-hidden="true">✳</span></div>
  </div>
</template>
