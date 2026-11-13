<script setup lang="ts">
import type { ExifLocationResponse, ExifLocationSuggestion } from '~/types/location-discovery'
import type { Memory, MemoryLocation, MemoryWriteRepository } from '~/types/memory'
import { getMemoryImages } from '~/utils/memory'

const props = defineProps<{
  memory: Memory
}>()

const emit = defineEmits<{
  updated: [memory: Memory]
  reload: []
}>()

const repository = useMemoryRepository() as MemoryWriteRepository
const suggestions = ref<ExifLocationSuggestion[]>([])
const rejectedIds = ref<string[]>([])
const checking = ref(false)
const acceptingId = ref('')
const checked = ref(false)
const error = ref('')
const conflict = ref(false)

const visibleSuggestions = computed(() => suggestions.value.filter(suggestion => !rejectedIds.value.includes(suggestion.id)))
const hasImages = computed(() => getMemoryImages(props.memory).length > 0)

const checkPhotos = async () => {
  checking.value = true
  checked.value = false
  error.value = ''
  conflict.value = false
  rejectedIds.value = []
  try {
    const response = await $fetch<ExifLocationResponse>(`/api/memories/${encodeURIComponent(props.memory.date)}/location-suggestions`)
    suggestions.value = response.suggestions
    checked.value = true
  } catch {
    error.value = 'The photos could not be inspected. They remain unchanged on disk.'
  } finally {
    checking.value = false
  }
}

const getAcceptedLocation = async (suggestion: ExifLocationSuggestion): Promise<MemoryLocation> => {
  if (suggestion.location.name !== 'Photo location') return suggestion.location
  try {
    const response = await $fetch<{ location?: MemoryLocation }>('/api/reverse-geocode', {
      method: 'POST',
      body: { latitude: suggestion.location.latitude, longitude: suggestion.location.longitude }
    })
    if (response.location) {
      return {
        ...response.location,
        latitude: suggestion.location.latitude,
        longitude: suggestion.location.longitude,
        precision: 'place',
        source: 'exif'
      }
    }
  } catch {
    // A coordinate-only EXIF suggestion remains acceptable if reverse geocoding is unavailable.
  }
  return suggestion.location
}

const accept = async (suggestion: ExifLocationSuggestion) => {
  if (props.memory.location && import.meta.client && !window.confirm(`Replace the existing location “${props.memory.location.name}” with the location found in ${suggestion.media.alt}?`)) return
  acceptingId.value = suggestion.id
  error.value = ''
  conflict.value = false
  try {
    const location = await getAcceptedLocation(suggestion)
    const updated = await repository.updateMemoryLocation(props.memory.date, props.memory.version || '', location)
    emit('updated', updated)
    suggestions.value = suggestions.value.filter(item => item.id !== suggestion.id)
  } catch (value: unknown) {
    error.value = value && typeof value === 'object' && 'statusCode' in value && value.statusCode === 409
      ? 'This memory changed outside Life Archive. Reload it before accepting a location.'
      : 'The location could not be accepted. No photo or Markdown content was changed.'
    conflict.value = Boolean(value && typeof value === 'object' && 'statusCode' in value && value.statusCode === 409)
  } finally {
    acceptingId.value = ''
  }
}

const reject = (suggestion: ExifLocationSuggestion) => {
  rejectedIds.value = [...rejectedIds.value, suggestion.id]
}
</script>

<template>
  <section v-if="hasImages" class="exif-location-panel">
    <div class="exif-location-copy">
      <span class="fact-label">Photograph metadata</span>
      <h2>Look for a place in the photos</h2>
      <p>Life Archive can inspect local image metadata for GPS coordinates. Nothing is uploaded, and your existing location is never replaced without confirmation.</p>
    </div>
    <button type="button" class="button button--outline exif-check-button" :disabled="checking" @click="checkPhotos">{{ checking ? 'Checking photos...' : 'Check photos for location' }} <Icon name="lucide:scan-search" class="app-icon" /></button>
    <div v-if="error" class="detail-message" role="alert"><span>{{ error }}</span><button v-if="conflict" type="button" class="text-link" @click="emit('reload')">Reload memory <Icon name="lucide:arrow-right" class="app-icon" /></button></div>
    <div v-else-if="checked && !visibleSuggestions.length" class="exif-empty">No GPS coordinates were found in the remaining photos.</div>
    <div v-if="visibleSuggestions.length" class="exif-suggestions">
      <article v-for="suggestion in visibleSuggestions" :key="suggestion.id" class="exif-suggestion">
        <img :src="suggestion.media.src" :alt="suggestion.media.alt">
        <div class="exif-suggestion-copy">
          <span class="fact-label">{{ suggestion.media.alt }}</span>
          <strong>{{ suggestion.location.name }}</strong>
          <span v-if="suggestion.location.city || suggestion.location.country" class="exif-suggestion-place">{{ [suggestion.location.city, suggestion.location.country].filter(Boolean).join(', ') }}</span>
          <span class="exif-suggestion-coordinates">{{ suggestion.location.latitude?.toFixed(5) }}, {{ suggestion.location.longitude?.toFixed(5) }}</span>
          <div class="exif-suggestion-actions">
            <button type="button" class="text-link" :disabled="Boolean(acceptingId)" @click="accept(suggestion)">{{ acceptingId === suggestion.id ? 'Accepting...' : (memory.location ? 'Replace location' : 'Use this location') }} <Icon name="lucide:check" class="app-icon" /></button>
            <button type="button" class="text-link text-link--quiet" :disabled="Boolean(acceptingId)" @click="reject(suggestion)">Dismiss</button>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>
