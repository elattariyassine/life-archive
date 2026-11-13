<script setup lang="ts">
import type { GeocodeResponse, GeocodeSuggestion } from '~/types/geocoding'
import type { MemoryLocation } from '~/types/memory'
import { formatMemoryLocation } from '~/utils/location'
import { createDebouncedTask, getDeviceLocationErrorMessage, InvalidDeviceLocationError, createManualMemoryLocation, requestDeviceMemoryLocation } from '~/utils/location-selection'

const props = withDefaults(defineProps<{
  modelValue?: MemoryLocation
  disabled?: boolean
}>(), { disabled: false })

const emit = defineEmits<{
  'update:modelValue': [location: MemoryLocation | undefined]
}>()

const config = useRuntimeConfig()
const query = ref(formatMemoryLocation(props.modelValue))
const suggestions = ref<GeocodeSuggestion[]>([])
const highlightedIndex = ref(-1)
const pending = ref(false)
const error = ref('')
const mapOpen = ref(false)
const suppressSearch = ref(false)
let requestId = 0
let controller: AbortController | null = null

const mapStyleUrl = computed(() => String(config.public.mapStyleUrl || ''))
const listId = useId()
const hasSuggestions = computed(() => suggestions.value.length > 0 || pending.value || Boolean(error.value))

const search = async (value: string) => {
  const currentRequest = ++requestId
  controller?.abort()
  controller = new AbortController()
  pending.value = true
  error.value = ''
  try {
    const response = await $fetch<GeocodeResponse>('/api/geocode', { query: { q: value }, signal: controller.signal })
    if (currentRequest !== requestId) return
    suggestions.value = response.results
    highlightedIndex.value = response.results.length ? 0 : -1
  } catch (value: unknown) {
    if (currentRequest !== requestId || (value && typeof value === 'object' && 'name' in value && value.name === 'AbortError')) return
    suggestions.value = []
    highlightedIndex.value = -1
    error.value = 'Place search is unavailable. You can keep entering the location manually.'
  } finally {
    if (currentRequest === requestId) pending.value = false
  }
}

const debouncedSearch = createDebouncedTask(() => {
  const value = query.value.trim()
  if (value.length >= 2) void search(value)
}, 300)

watch(query, value => {
  if (suppressSearch.value) {
    suppressSearch.value = false
    return
  }
  const location = createManualMemoryLocation(value)
  emit('update:modelValue', location)
  suggestions.value = []
  highlightedIndex.value = -1
  error.value = ''
  controller?.abort()
  if (value.trim().length < 2) {
    debouncedSearch.cancel()
    pending.value = false
    return
  }
  debouncedSearch.schedule()
})

watch(() => props.modelValue, value => {
  const label = formatMemoryLocation(value)
  if (label !== query.value) {
    suppressSearch.value = true
    query.value = label
  }
}, { deep: true })

const selectSuggestion = (suggestion: GeocodeSuggestion) => {
  suppressSearch.value = true
  query.value = suggestion.label
  suggestions.value = []
  highlightedIndex.value = -1
  error.value = ''
  debouncedSearch.cancel()
  emit('update:modelValue', suggestion.location)
}

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'ArrowDown' && suggestions.value.length) {
    event.preventDefault()
    highlightedIndex.value = (highlightedIndex.value + 1) % suggestions.value.length
  } else if (event.key === 'ArrowUp' && suggestions.value.length) {
    event.preventDefault()
    highlightedIndex.value = (highlightedIndex.value - 1 + suggestions.value.length) % suggestions.value.length
  } else if (event.key === 'Enter' && highlightedIndex.value >= 0 && suggestions.value[highlightedIndex.value]) {
    event.preventDefault()
    selectSuggestion(suggestions.value[highlightedIndex.value]!)
  } else if (event.key === 'Escape') {
    suggestions.value = []
    highlightedIndex.value = -1
  }
}

const useDeviceLocation = async () => {
  error.value = ''
  if (!import.meta.client || !navigator.geolocation) {
    error.value = 'Device location is not available in this browser. You can enter the location manually.'
    return
  }
  try {
    const location = await requestDeviceMemoryLocation(navigator.geolocation)
    suppressSearch.value = true
    query.value = location.name
    suggestions.value = []
    emit('update:modelValue', location)
  } catch (value: unknown) {
    if (value instanceof InvalidDeviceLocationError) {
      error.value = 'The device returned invalid coordinates. You can enter the location manually.'
    } else if (value && typeof value === 'object' && 'code' in value) {
      error.value = getDeviceLocationErrorMessage(Number(value.code))
    } else {
      error.value = 'Your device location is unavailable. You can enter the location manually.'
    }
  }
}

const selectMapLocation = (location: MemoryLocation) => {
  suppressSearch.value = true
  query.value = formatMemoryLocation(location)
  suggestions.value = []
  error.value = ''
  emit('update:modelValue', location)
}

onBeforeUnmount(() => {
  debouncedSearch.cancel()
  controller?.abort()
})
</script>

<template>
  <div class="location-field">
    <div class="location-input-row">
      <div class="location-input-wrap">
        <input
          v-model="query"
          type="text"
          maxlength="200"
          placeholder="Search a place or enter it manually"
          autocomplete="off"
          role="combobox"
          :aria-expanded="hasSuggestions"
          :aria-controls="listId"
          :aria-activedescendant="highlightedIndex >= 0 ? `${listId}-${highlightedIndex}` : undefined"
          :disabled="disabled"
          @keydown="handleKeydown"
        >
        <Icon name="lucide:search" class="app-icon location-input-icon" />
      </div>
      <button type="button" class="location-action" :disabled="disabled || !mapStyleUrl" title="Choose on a map" @click="mapOpen = true">
        <Icon name="lucide:map" class="app-icon" />
        <span>Map</span>
      </button>
    </div>
    <ul v-if="hasSuggestions" :id="listId" class="location-suggestions" role="listbox" aria-label="Place suggestions">
      <li v-if="pending" class="location-suggestion-state" role="status">Searching places...</li>
      <li v-else-if="error" class="location-suggestion-state location-suggestion-state--error" role="alert">{{ error }}</li>
      <li v-else-if="!suggestions.length" class="location-suggestion-state">No matching places. Manual text will still be saved.</li>
      <li v-for="(suggestion, index) in suggestions" :id="`${listId}-${index}`" :key="suggestion.id" role="option" :aria-selected="index === highlightedIndex">
        <button type="button" class="location-suggestion" :class="{ 'location-suggestion--active': index === highlightedIndex }" @mousedown.prevent @click="selectSuggestion(suggestion)">
          <strong>{{ suggestion.location.name }}</strong>
          <span>{{ [suggestion.location.city, suggestion.location.country].filter(Boolean).join(', ') || suggestion.location.precision }}</span>
        </button>
      </li>
    </ul>
    <div class="location-field-actions">
      <button type="button" class="location-secondary-action" :disabled="disabled" @click="useDeviceLocation"><Icon name="lucide:navigation" class="app-icon" /> Use my current location</button>
      <span class="location-help">Device coordinates may be approximate.</span>
    </div>
    <LocationMapPicker :open="mapOpen" :location="modelValue" :style-url="mapStyleUrl" @close="mapOpen = false" @select="selectMapLocation" />
  </div>
</template>
