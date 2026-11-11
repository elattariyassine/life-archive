<script setup lang="ts">
import { formatMemoryDate, formatType, getMemoryYear } from '~/utils/memory'

const repository = useMemoryRepository()
const { data: memories } = await useAsyncData('home-memories', () => repository.getMemories())
const allMemories = computed(() => memories.value ?? [])
const currentYear = new Date().getFullYear()
const currentYearMemories = computed(() => allMemories.value.filter(memory => getMemoryYear(memory.date) === currentYear))
const featuredMemories = computed(() => allMemories.value.filter(memory => memory.media.length > 0).slice(0, 3))
const recentMemories = computed(() => allMemories.value.slice(0, 4))
const archiveYears = computed(() => [...new Set(allMemories.value.map(memory => getMemoryYear(memory.date)))])
const archiveSummary = computed(() => `${archiveYears.value.length} years of notes, photographs and small beginnings.`)
const latestArchiveDate = computed(() => allMemories.value[0]?.date ?? `${currentYear}-01-01`)
</script>

<template>
  <div class="page page-home">
    <section class="home-hero page-container">
      <div class="hero-copy">
        <p class="eyebrow">A private collection / est. 2025</p>
        <h1>A place for the<br><em>days that matter.</em></h1>
        <p class="hero-intro">Life Archive is a quiet record of the people, places, thoughts and ordinary details that make a life feel like a life.</p>
        <NuxtLink to="/timeline" class="button button--dark">Explore the archive <AppIcon name="arrow-right" /></NuxtLink>
      </div>
      <div class="hero-aside">
        <div class="hero-stamp" aria-hidden="true">LA<br><span>01</span></div>
        <p>Currently looking back from<br><strong>{{ currentYear }}</strong></p>
        <div class="hero-line" />
        <p class="hero-small">{{ archiveSummary }}</p>
      </div>
    </section>

    <section class="home-intro page-container section-divider">
      <div class="section-label">01 <span>Now in the archive</span></div>
      <div class="intro-grid">
        <h2>{{ formatMemoryDate(latestArchiveDate, { month: 'long', year: 'numeric' }) }}</h2>
        <div>
          <p class="section-lead">The archive is growing slowly. That is part of the point.</p>
          <p class="muted-copy">{{ currentYearMemories.length }} memories from this year, each one a small way of paying attention. Come back whenever you need to remember where you have been.</p>
          <NuxtLink to="/timeline" class="text-link text-link--large">View the full timeline <AppIcon name="arrow-right" /></NuxtLink>
        </div>
      </div>
    </section>

    <section class="home-recent page-container section-divider">
      <div class="section-heading-row">
        <div><div class="section-label">02 <span>Recent memories</span></div><h2>Just before now</h2></div>
        <NuxtLink to="/timeline" class="text-link">See all memories <AppIcon name="arrow-up-right" /></NuxtLink>
      </div>
      <div class="recent-grid">
        <MemoryCard v-for="memory in recentMemories" :key="memory.date" :memory="memory" />
      </div>
    </section>

    <section class="home-featured section-divider">
      <div class="page-container">
        <div class="section-heading-row">
          <div><div class="section-label">03 <span>Selected moments</span></div><h2>Worth lingering over</h2></div>
          <span class="muted-copy">A few frames from the collection</span>
        </div>
        <div class="featured-grid">
          <MemoryCard v-for="(memory, index) in featuredMemories" :key="memory.date" :memory="memory" :featured="index === 0" />
        </div>
      </div>
    </section>

    <section class="home-chronology page-container section-divider">
      <div class="section-heading-row">
        <div><div class="section-label">04 <span>A way through time</span></div><h2>From the archive</h2></div>
        <NuxtLink to="/timeline" class="text-link">Open timeline <AppIcon name="arrow-right" /></NuxtLink>
      </div>
      <div class="chronology-list">
        <NuxtLink v-for="memory in allMemories.slice(0, 5)" :key="memory.date" :to="`/memory/${memory.date}`" class="chronology-row">
          <time :datetime="memory.date">{{ memory.date }}</time>
          <span class="chronology-title">{{ memory.title }}</span>
          <span class="chronology-type">{{ formatType(memory.type) }}</span>
          <AppIcon name="arrow-up-right" />
        </NuxtLink>
      </div>
    </section>

    <section class="home-cta page-container">
      <div class="cta-mark" aria-hidden="true">✳</div>
      <h2>Keep the<br><em>good parts.</em></h2>
      <p>There is always more to remember.</p>
      <NuxtLink to="/timeline" class="button button--outline">Browse the archive <AppIcon name="arrow-right" /></NuxtLink>
    </section>
  </div>
</template>
