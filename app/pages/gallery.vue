<script setup lang="ts">
import { formatMemoryDate, formatMemoryMonth, formatType, getMemoryPath, getMemoryVisualMedia } from '~/utils/memory'
import type { Memory, MemoryMedia } from '~/types/memory'

type GalleryItem = {
  key: string
  memory: Memory
  media: MemoryMedia
  isFeature?: boolean
}

const repository = useMemoryRepository()
const { data: memories } = await useAsyncData('gallery-memories', () => repository.getMemories())
const galleryItems = computed<GalleryItem[]>(() => [...(memories.value ?? [])].sort((a, b) => b.date.localeCompare(a.date)).flatMap(memory => getMemoryVisualMedia(memory).map(media => ({ key: `${memory.date}-${media.path ?? media.src}`, memory, media }))))
const galleryImageCount = computed(() => galleryItems.value.filter(item => item.media).length)
const years = computed(() => [...new Set(galleryItems.value.map(item => item.memory.date.slice(0, 4)))])
const yearGroups = computed(() => years.value.map(year => {
  const yearItems = galleryItems.value.filter(item => item.memory.date.startsWith(year))
  const months = [...new Set(yearItems.map(item => item.memory.date.slice(0, 7)))]
  return { year, months: months.map(month => ({ month, items: yearItems.filter(item => item.memory.date.startsWith(month)).map((item, index) => ({ ...item, isFeature: index === 0 })) })) }
}))
const viewerItems = computed(() => galleryItems.value.filter(item => item.media))
const activeIndex = ref<number | null>(null)
const activeItem = computed(() => activeIndex.value === null ? undefined : viewerItems.value[activeIndex.value])
const failedMediaKeys = ref<string[]>([])
const lastTrigger = ref<HTMLElement | null>(null)
const lightboxClose = ref<HTMLButtonElement | null>(null)

const isMediaFailed = (item: GalleryItem) => failedMediaKeys.value.includes(item.key)

const openViewer = async (item: GalleryItem, event: MouseEvent) => {
  if (!item.media || isMediaFailed(item)) return
  const index = viewerItems.value.findIndex(viewerItem => viewerItem.key === item.key)
  if (index < 0) return
  lastTrigger.value = event.currentTarget as HTMLElement
  activeIndex.value = index
  await nextTick()
  lightboxClose.value?.focus()
}

const closeViewer = async () => {
  activeIndex.value = null
  await nextTick()
  lastTrigger.value?.focus()
}

const moveViewer = (step: number) => {
  if (activeIndex.value === null || !viewerItems.value.length) return
  activeIndex.value = (activeIndex.value + step + viewerItems.value.length) % viewerItems.value.length
}

const handleMediaError = (item: GalleryItem) => {
  if (!failedMediaKeys.value.includes(item.key)) failedMediaKeys.value = [...failedMediaKeys.value, item.key]
}

const isVideo = (item: GalleryItem) => item.media.kind === 'video' || /\.(mov|mp4|webm)(?:[?#]|$)/i.test(item.media.path || item.media.src)

const handleLightboxKeydown = (event: KeyboardEvent) => {
  if (activeIndex.value === null) return
  if (event.key === 'Escape') {
    event.preventDefault()
    closeViewer()
  } else if (event.key === 'ArrowLeft') {
    event.preventDefault()
    moveViewer(-1)
  } else if (event.key === 'ArrowRight') {
    event.preventDefault()
    moveViewer(1)
  }
}

onMounted(() => window.addEventListener('keydown', handleLightboxKeydown))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleLightboxKeydown)
  document.body.style.overflow = ''
})
watch(activeIndex, value => {
  if (import.meta.client) document.body.style.overflow = value === null ? '' : 'hidden'
})
</script>

<template>
  <div class="page page-container gallery-page">
    <section class="page-intro gallery-intro">
      <p class="eyebrow">The visual record / 02</p>
      <h1>Gallery</h1>
      <p class="page-intro-copy">A collection of light, places and the details that stayed with me.</p>
      <div class="gallery-stat"><strong>{{ galleryImageCount }}</strong><span>visual records<br>in the archive</span></div>
    </section>
    <nav class="gallery-year-nav" aria-label="Jump to gallery year">
      <span>Browse by year</span>
      <a v-for="year in years" :key="year" :href="`#gallery-${year}`">{{ year }}</a>
    </nav>
    <section v-for="group in yearGroups" :id="`gallery-${group.year}`" :key="group.year" class="gallery-year">
      <div class="gallery-year-heading"><span>{{ group.year }}</span><span class="month-line" /><span>{{ group.months.reduce((total, month) => total + month.items.length, 0) }} visual records</span></div>
      <section v-for="month in group.months" :id="`gallery-${month.month}`" :key="month.month" class="gallery-month">
        <div class="month-heading"><span>{{ formatMemoryMonth(`${month.month}-01`) }}</span><span class="month-line" /><span>{{ month.items.length }} {{ month.items.length === 1 ? 'record' : 'records' }}</span></div>
        <div class="gallery-grid">
        <template v-for="item in month.items" :key="item.key">
          <div v-if="item.media" class="gallery-item gallery-item--viewer" :class="{ 'gallery-item--feature': item.isFeature }">
            <button type="button" class="gallery-viewer-trigger" :class="{ 'gallery-viewer-trigger--feature': item.isFeature, 'gallery-viewer-trigger--missing': isMediaFailed(item) }" :aria-label="`View ${item.memory.title} from ${formatMemoryDate(item.memory.date, { month: 'long', day: 'numeric', year: 'numeric' })} full size`" :disabled="isMediaFailed(item)" @click="openViewer(item, $event)">
              <div class="gallery-image-wrap">
                <template v-if="!isMediaFailed(item)">
                  <video v-if="isVideo(item)" :src="item.media.src" class="gallery-image gallery-video" muted playsinline preload="metadata" @error="handleMediaError(item)"></video>
                  <img v-else :src="item.media.src" :alt="item.media.alt" class="gallery-image" loading="lazy" decoding="async" @error="handleMediaError(item)">
                  <span v-if="isVideo(item)" class="gallery-media-badge"><Icon name="lucide:play" class="app-icon" /> Video</span>
                  <span class="gallery-item-overlay"><strong>{{ item.memory.title }}</strong><span>View full size <Icon name="lucide:expand" class="app-icon" /></span></span>
                </template>
                <span v-else class="gallery-placeholder-label">Visual unavailable</span>
              </div>
            </button>
            <div class="gallery-caption"><span>{{ formatMemoryDate(item.memory.date, { month: 'short', day: 'numeric', year: 'numeric' }) }}</span><NuxtLink :to="getMemoryPath(item.memory.date, 'gallery')" class="gallery-memory-link">Open memory <Icon name="lucide:arrow-up-right" class="app-icon" /></NuxtLink><span>{{ isVideo(item) ? 'Video' : formatType(item.memory.type) }}</span></div>
          </div>
        </template>
        </div>
      </section>
    </section>
  </div>
  <Teleport to="body">
    <div v-if="activeItem?.media" class="gallery-lightbox" role="presentation" @click.self="closeViewer">
      <section class="gallery-lightbox-panel" role="dialog" aria-modal="true" :aria-label="`Viewing ${activeItem.memory.title}`">
        <button ref="lightboxClose" type="button" class="gallery-lightbox-close" aria-label="Close full-size viewer" @click="closeViewer"><Icon name="lucide:x" class="app-icon" /></button>
        <div class="gallery-lightbox-stage">
          <button v-if="viewerItems.length > 1" type="button" class="gallery-lightbox-control gallery-lightbox-control--previous" aria-label="Previous image" @click="moveViewer(-1)"><Icon name="lucide:arrow-left" class="app-icon" /></button>
          <figure class="gallery-lightbox-figure">
            <div v-if="!isMediaFailed(activeItem)" class="gallery-lightbox-media">
              <video v-if="isVideo(activeItem)" :src="activeItem.media.src" controls playsinline preload="metadata" @error="handleMediaError(activeItem)"></video>
              <img v-else :src="activeItem.media.src" :alt="activeItem.media.alt" @error="handleMediaError(activeItem)">
            </div>
            <div v-else class="gallery-lightbox-media gallery-lightbox-media--missing"><span>Image unavailable</span></div>
            <figcaption class="gallery-lightbox-caption">
              <div><span class="fact-label">{{ formatMemoryDate(activeItem.memory.date, { month: 'long', day: 'numeric', year: 'numeric' }) }}</span><h2>{{ activeItem.memory.title }}</h2></div>
              <NuxtLink :to="getMemoryPath(activeItem.memory.date, 'gallery')" class="text-link">Open memory <Icon name="lucide:arrow-up-right" class="app-icon" /></NuxtLink>
              <span class="gallery-lightbox-count">{{ (activeIndex ?? 0) + 1 }} / {{ viewerItems.length }}</span>
            </figcaption>
          </figure>
          <button v-if="viewerItems.length > 1" type="button" class="gallery-lightbox-control gallery-lightbox-control--next" aria-label="Next image" @click="moveViewer(1)"><Icon name="lucide:arrow-right" class="app-icon" /></button>
        </div>
      </section>
    </div>
  </Teleport>
</template>
