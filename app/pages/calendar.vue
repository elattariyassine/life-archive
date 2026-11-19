<script setup lang="ts">
import { buildCalendarYear, getLongestGap } from '~/utils/discovery'
import { formatMemoryDate, formatMemoryMonthYear, formatType, getMemoryPath } from '~/utils/memory'
import type { MemorySummary } from '~/types/memory'

const route = useRoute()
const router = useRouter()
const today = useToday()
const { openModal } = useGlobalModal()
const { canWrite } = useArchiveStatus()
const { data: memories } = await useMemorySummaries()

const memoriesByDate = computed(() => new Map((memories.value ?? []).map(memory => [memory.date, memory] as const)))
const currentYear = computed(() => Number(today.value.slice(0, 4)))
const years = computed(() => [...new Set([currentYear.value, ...(memories.value ?? []).map(memory => Number(memory.date.slice(0, 4)))])].sort((a, b) => b - a))
const year = computed(() => {
  const requested = Number(route.query.year)
  if (Number.isInteger(requested) && requested >= 1000 && requested <= 9999) return requested
  return currentYear.value
})
const months = computed(() => buildCalendarYear(year.value))
const yearMemories = computed(() => (memories.value ?? []).filter(memory => memory.date.startsWith(`${year.value}-`)))
const busiestMonth = computed(() => {
  const counts = new Map<string, number>()
  yearMemories.value.forEach(memory => counts.set(memory.date.slice(0, 7), (counts.get(memory.date.slice(0, 7)) ?? 0) + 1))
  const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]
  return best && best[1] > 1 ? { label: formatMemoryMonthYear(`${best[0]}-01`).split(' ')[0], count: best[1] } : null
})
const longestGap = computed(() => getLongestGap(yearMemories.value.map(memory => memory.date)))
const weekdays = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

const setYear = (value: number) => router.replace({ query: { ...route.query, year: String(value) } })
const memoryAt = (date: string): MemorySummary | undefined => memoriesByDate.value.get(date)
const isFuture = (date: string) => date > today.value
const createOn = (date: string) => openModal('create', { date })

useSeoMeta({ title: () => `Calendar ${year.value} / Life Archive`, description: 'Every day of the archive at a glance.' })
</script>

<template>
  <div class="page page-container calendar-page">
    <section class="page-intro">
      <p class="eyebrow">Every day at a glance</p>
      <h1>Calendar</h1>
      <p class="page-intro-copy">See which days you kept and which ones slipped by. {{ canWrite ? 'Choose an empty day to give it a page.' : 'Choose a marked day to read it.' }}</p>
    </section>

    <div class="calendar-controls">
      <div class="calendar-year-switch">
        <button type="button" class="calendar-step" :disabled="year <= (years.at(-1) ?? year)" aria-label="Previous year" @click="setYear(year - 1)"><Icon name="lucide:arrow-left" class="app-icon" /></button>
        <strong aria-live="polite">{{ year }}</strong>
        <button type="button" class="calendar-step" :disabled="year >= currentYear" aria-label="Next year" @click="setYear(year + 1)"><Icon name="lucide:arrow-right" class="app-icon" /></button>
      </div>
      <nav class="calendar-years" aria-label="Years with memories">
        <button v-for="option in years" :key="option" type="button" :class="{ active: option === year }" :aria-pressed="option === year" @click="setYear(option)">{{ option }}</button>
      </nav>
    </div>

    <dl class="calendar-stats">
      <div><dt>Days kept</dt><dd>{{ yearMemories.length }}</dd></div>
      <div><dt>Fullest month</dt><dd>{{ busiestMonth ? `${busiestMonth.label} · ${busiestMonth.count}` : '—' }}</dd></div>
      <div><dt>Longest quiet stretch</dt><dd>{{ yearMemories.length > 1 ? `${longestGap} ${longestGap === 1 ? 'day' : 'days'}` : '—' }}</dd></div>
    </dl>

    <div class="calendar-grid">
      <section v-for="month in months" :key="month.month" class="calendar-month" :aria-label="formatMemoryMonthYear(`${month.month}-01`)">
        <h2 class="calendar-month-name">{{ formatMemoryMonthYear(`${month.month}-01`).split(' ')[0] }}</h2>
        <div class="calendar-days">
          <span v-for="(weekday, index) in weekdays" :key="`h-${index}`" class="calendar-weekday" aria-hidden="true">{{ weekday }}</span>
          <span v-for="index in month.offset" :key="`o-${index}`" aria-hidden="true" />
          <template v-for="day in month.days" :key="day.date">
            <NuxtLink
              v-if="memoryAt(day.date)"
              :to="getMemoryPath(day.date, 'calendar')"
              class="calendar-day calendar-day--memory"
              :class="{ 'calendar-day--today': day.date === today }"
              :style="memoryAt(day.date)!.mood ? { '--mood-score': memoryAt(day.date)!.mood!.score } : undefined"
              :title="`${formatMemoryDate(day.date)} · ${memoryAt(day.date)!.title}`"
              :aria-label="`${formatMemoryDate(day.date)}: ${memoryAt(day.date)!.title}, ${formatType(memoryAt(day.date)!.type)}`"
            >{{ day.day }}</NuxtLink>
            <button
              v-else-if="canWrite && !isFuture(day.date)"
              type="button"
              class="calendar-day calendar-day--empty"
              :class="{ 'calendar-day--today': day.date === today }"
              :aria-label="`Create a memory for ${formatMemoryDate(day.date)}`"
              :title="`Create a memory for ${formatMemoryDate(day.date)}`"
              @click="createOn(day.date)"
            >{{ day.day }}</button>
            <span v-else class="calendar-day" :class="{ 'calendar-day--today': day.date === today, 'calendar-day--future': isFuture(day.date) }">{{ day.day }}</span>
          </template>
        </div>
      </section>
    </div>

    <div class="calendar-legend" aria-hidden="true">
      <span><i class="calendar-legend-swatch calendar-legend-swatch--memory" /> A memory (deeper for a better mood)</span>
      <span><i class="calendar-legend-swatch" /> No memory</span>
      <span><i class="calendar-legend-swatch calendar-legend-swatch--today" /> Today</span>
    </div>
  </div>
</template>
