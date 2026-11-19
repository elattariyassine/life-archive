<script setup lang="ts">
import type { NuxtError } from '#app'
import type { Memory } from '~/types/memory'
import { formatMemoryDate, getMemoryPath } from '~/utils/memory'

const props = defineProps<{ error: NuxtError }>()
const { preference: themePreference } = useTheme()

useHead({ htmlAttrs: { 'data-theme': () => themePreference.value === 'system' ? undefined : themePreference.value } })

const isNotFound = computed(() => props.error.statusCode === 404)
const route = useRoute()
const missingDate = computed(() => route.path.match(/\/memory\/(\d{4}-\d{2}-\d{2})/)?.[1])
const nearby = ref<Array<Pick<Memory, 'date' | 'title'>>>([])

const distance = (a: string, b: string) => Math.abs(Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`))

onMounted(async () => {
  if (!missingDate.value) return
  try {
    const { memories } = await $fetch<{ memories: Memory[] }>('/api/summaries')
    nearby.value = [...memories]
      .sort((a, b) => distance(a.date, missingDate.value!) - distance(b.date, missingDate.value!))
      .slice(0, 3)
      .map(({ date, title }) => ({ date, title }))
  } catch {
    nearby.value = []
  }
})

const goHome = () => clearError({ redirect: '/' })

useSeoMeta({ title: () => isNotFound.value ? 'Page not found / Life Archive' : 'Something went wrong / Life Archive' })
</script>

<template>
  <div class="app-shell">
    <header class="site-header">
      <div class="header-inner">
        <a href="/" class="wordmark" aria-label="Life Archive home" @click.prevent="goHome"><span class="wordmark-mark">L</span><span>Life Archive</span></a>
      </div>
    </header>
    <main id="main-content" class="page page-container error-page">
      <p class="eyebrow">{{ isNotFound ? 'A missing page' : `Error ${error.statusCode}` }}</p>
      <h1>{{ isNotFound ? (missingDate ? `Nothing was kept on ${formatMemoryDate(missingDate)}.` : 'This page of the archive doesn’t exist.') : 'Something went wrong.' }}</h1>
      <p class="page-intro-copy">{{ isNotFound ? 'It may have been moved, deleted, or never written.' : 'The archive could not be read just now. Your files are untouched. Try again in a moment.' }}</p>

      <section v-if="nearby.length" class="error-nearby" aria-labelledby="error-nearby-heading">
        <p id="error-nearby-heading" class="section-label">The closest pages</p>
        <a v-for="memory in nearby" :key="memory.date" :href="getMemoryPath(memory.date)" class="error-nearby-item" @click.prevent="clearError({ redirect: getMemoryPath(memory.date) })">
          <time :datetime="memory.date">{{ formatMemoryDate(memory.date, { month: 'short', day: 'numeric', year: 'numeric' }) }}</time>
          <strong>{{ memory.title }}</strong>
          <Icon name="lucide:arrow-up-right" class="app-icon" />
        </a>
      </section>

      <div class="error-actions">
        <button type="button" class="button button--dark" @click="goHome">Back to the archive <Icon name="lucide:arrow-right" class="app-icon" /></button>
        <button type="button" class="button button--outline" @click="clearError({ redirect: '/timeline' })">Open the timeline</button>
      </div>
    </main>
  </div>
</template>
