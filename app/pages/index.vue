<script setup lang="ts">
import { formatMemoryDate, formatType, getMemoryYear } from '~/utils/memory'

const repository = useMemoryRepository()
const { openModal } = useGlobalModal()
const { data: memories } = await useAsyncData('home-memories', () => repository.getMemories())
const allMemories = computed(() => memories.value ?? [])
const currentYear = new Date().getFullYear()
const latestMemory = computed(() => allMemories.value[0])
const latestArchiveDate = computed(() => latestMemory.value?.date)
const latestArchiveYear = computed(() => latestArchiveDate.value ? getMemoryYear(latestArchiveDate.value) : currentYear)
const latestArchiveMonthDate = computed(() => latestArchiveDate.value ? `${latestArchiveDate.value.slice(0, 7)}-01` : '')
const latestYearMemories = computed(() => allMemories.value.filter(memory => getMemoryYear(memory.date) === latestArchiveYear.value))
const latestMonthMemories = computed(() => {
  const month = latestArchiveDate.value?.slice(0, 7)
  return month ? allMemories.value.filter(memory => memory.date.startsWith(month)) : []
})
const featuredMemories = computed(() => allMemories.value.filter(memory => memory.type === 'highlight').slice(0, 3))
const recentMemories = computed(() => allMemories.value.slice(0, 4))
const archiveYears = computed(() => [...new Set(allMemories.value.map(memory => getMemoryYear(memory.date)))])
const archiveSummary = computed(() => allMemories.value.length ? `${allMemories.value.length} memories across ${archiveYears.value.length} ${archiveYears.value.length === 1 ? 'year' : 'years'}.` : 'No memories recorded yet.')
</script>

<template>
  <div class="page page-home">
    <section class="home-hero page-container">
      <div class="hero-copy">
        <p class="eyebrow">A private collection / est. 2025</p>
        <h1>A place for the<br><em>days that matter.</em></h1>
        <p class="hero-intro">Life Archive is a quiet record of the people, places, thoughts and ordinary details that make a life feel like a life.</p>
        <a href="#recent-memories" class="button button--dark">Read recent memories <Icon name="lucide:arrow-down" class="app-icon" /></a>
      </div>
      <div class="hero-aside">
        <div class="hero-stamp" aria-hidden="true">LA<br><span>01</span></div>
        <p>Latest entry from<br><strong>{{ latestArchiveYear }}</strong></p>
        <div class="hero-line" />
        <p class="hero-small">{{ archiveSummary }}</p>
      </div>
    </section>

    <section class="home-intro page-container section-divider">
      <div class="section-label">01 <span>Now in the archive</span></div>
      <div v-if="latestMemory" class="intro-grid">
        <div>
          <p class="fact-label">Latest recorded month</p>
          <h2>{{ formatMemoryDate(latestArchiveMonthDate, { month: 'long', year: 'numeric' }) }}</h2>
        </div>
        <div>
          <p class="section-lead">A current view of the collection.</p>
          <div class="archive-stats" aria-label="Current archive overview">
            <div><strong>{{ latestMonthMemories.length }}</strong><span>{{ latestMonthMemories.length === 1 ? 'memory' : 'memories' }} in this month</span></div>
            <div><strong>{{ latestYearMemories.length }}</strong><span>{{ latestYearMemories.length === 1 ? 'memory' : 'memories' }} in {{ latestArchiveYear }}</span></div>
            <div><strong>{{ formatMemoryDate(latestMemory.date, { month: 'short', day: 'numeric', year: 'numeric' }) }}</strong><span>latest recorded</span></div>
          </div>
          <NuxtLink to="/timeline" class="text-link text-link--large">View the full timeline <Icon name="lucide:arrow-right" class="app-icon" /></NuxtLink>
        </div>
      </div>
      <div v-else class="archive-empty">
        <h2>The archive is waiting.</h2>
        <p class="muted-copy">Add a memory to begin the collection.</p>
      </div>
    </section>

    <section id="recent-memories" class="home-recent page-container section-divider">
      <div class="section-heading-row">
        <div><div class="section-label">02 <span>Recent memories</span></div><h2>Just before now</h2></div>
          <NuxtLink to="/timeline" class="text-link">See all memories <Icon name="lucide:arrow-up-right" class="app-icon" /></NuxtLink>
      </div>
      <div class="recent-grid">
        <MemoryCard v-for="memory in recentMemories" :key="memory.date" :memory="memory" />
      </div>
    </section>

    <section class="home-featured section-divider">
      <div class="page-container">
        <div class="section-heading-row">
          <div><div class="section-label">03 <span>Selected moments</span></div><h2>Worth lingering over</h2></div>
          <span class="muted-copy">Memories marked as highlights</span>
        </div>
        <div class="featured-grid" :class="`featured-grid--count-${featuredMemories.length}`">
          <MemoryCard v-for="(memory, index) in featuredMemories" :key="memory.date" :memory="memory" :featured="index === 0" />
        </div>
      </div>
    </section>

    <section class="home-chronology page-container section-divider">
      <div class="section-heading-row">
        <div><div class="section-label">04 <span>A way through time</span></div><h2>From the archive</h2></div>
          <NuxtLink to="/timeline" class="text-link">Browse by year and month <Icon name="lucide:arrow-right" class="app-icon" /></NuxtLink>
      </div>
      <div class="chronology-intro"><span>{{ archiveYears.length }} {{ archiveYears.length === 1 ? 'year' : 'years' }} represented</span><span>Most recent first</span></div>
      <div class="chronology-list">
        <NuxtLink v-for="memory in allMemories.slice(0, 5)" :key="memory.date" :to="`/memory/${memory.date}`" class="chronology-row">
          <time :datetime="memory.date">{{ formatMemoryDate(memory.date, { month: 'short', day: 'numeric', year: 'numeric' }) }}</time>
          <span class="chronology-title">{{ memory.title }}</span>
          <span class="chronology-type">{{ formatType(memory.type) }}</span>
          <Icon name="lucide:arrow-up-right" class="app-icon" />
        </NuxtLink>
      </div>
    </section>

    <section class="home-cta page-container">
      <div class="cta-mark" aria-hidden="true">✳</div>
      <h2>Find your way<br><em>back through it.</em></h2>
      <p>Search titles, stories, tags, and places.</p>
      <button type="button" class="button button--outline" data-global-trigger="search" @click="openModal('search')">Search the archive <Icon name="lucide:search" class="app-icon" /></button>
    </section>
  </div>
</template>
