<script setup lang="ts">
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import type { MemoryLocation } from '~/types/memory'
import { createMapMemoryLocation } from '~/utils/location-selection'

const props = defineProps<{
  open: boolean
  location?: MemoryLocation
  styleUrl: string
}>()

const emit = defineEmits<{
  close: []
  select: [location: MemoryLocation]
}>()

const mapContainer = ref<HTMLElement | null>(null)
const mapError = ref('')
const latitude = ref<number | undefined>()
const longitude = ref<number | undefined>()
let map: import('maplibre-gl').Map | null = null
let marker: import('maplibre-gl').Marker | null = null
let maplibre: typeof import('maplibre-gl') | null = null

const hasCoordinates = computed(() => latitude.value !== undefined && longitude.value !== undefined)
const coordinateText = computed(() => hasCoordinates.value ? `${latitude.value!.toFixed(5)}, ${longitude.value!.toFixed(5)}` : 'Click the map to choose coordinates')

const setCoordinates = (nextLatitude: number, nextLongitude: number) => {
  if (!Number.isFinite(nextLatitude) || !Number.isFinite(nextLongitude)) return
  latitude.value = nextLatitude
  longitude.value = nextLongitude
  if (map && maplibre) {
    if (!marker) {
      marker = new maplibre.Marker({ color: '#ad5c43', draggable: true }).addTo(map)
      marker.on('dragend', () => {
        const position = marker?.getLngLat()
        if (position) setCoordinates(position.lat, position.lng)
      })
    }
    marker.setLngLat([nextLongitude, nextLatitude])
  }
}

const initializeMap = async () => {
  if (!import.meta.client || map || !mapContainer.value) return
  if (!props.styleUrl) {
    mapError.value = 'Map selection is not configured. You can enter a place manually instead.'
    return
  }

  try {
    maplibre = await import('maplibre-gl')
    maplibre.setWorkerUrl(maplibreWorkerUrl)
    const existing = props.location?.latitude !== undefined && props.location.longitude !== undefined ? props.location : undefined
    latitude.value = existing?.latitude
    longitude.value = existing?.longitude
    map = new maplibre.Map({
      container: mapContainer.value,
      style: props.styleUrl,
      center: existing ? [existing.longitude!, existing.latitude!] : [0, 20],
      zoom: existing ? 12 : 2,
      attributionControl: false
    })
    map.addControl(new maplibre.NavigationControl(), 'top-right')
    map.addControl(new maplibre.AttributionControl({ customAttribution: 'OpenFreeMap | © OpenMapTiles | Data from OpenStreetMap' }), 'bottom-right')
    map.on('click', event => setCoordinates(event.lngLat.lat, event.lngLat.lng))
    map.on('error', () => {
      mapError.value = 'The map could not be loaded. You can enter a place manually instead.'
    })
    map.on('load', () => {
      if (latitude.value !== undefined && longitude.value !== undefined) setCoordinates(latitude.value, longitude.value)
    })
  } catch {
    mapError.value = 'The map could not be loaded. You can enter a place manually instead.'
  }
}

const confirm = () => {
  if (latitude.value === undefined || longitude.value === undefined) return
  const location = createMapMemoryLocation(props.location, latitude.value, longitude.value)
  if (location) emit('select', location)
  emit('close')
}

watch(() => props.open, async open => {
  if (!open) return
  mapError.value = ''
  await nextTick()
  await initializeMap()
  map?.resize()
})

watch(() => props.location, location => {
  if (!map || location?.latitude === undefined || location.longitude === undefined) return
  setCoordinates(location.latitude, location.longitude)
  map.easeTo({ center: [location.longitude, location.latitude], zoom: Math.max(map.getZoom(), 12) })
}, { deep: true })

onBeforeUnmount(() => {
  map?.remove()
  map = null
  marker = null
})
</script>

<template>
  <ModalShell :open="open" title-id="location-map-title" panel-class="modal-panel--map" @close="emit('close')">
    <div class="location-map-picker">
      <header class="location-map-heading">
        <div>
          <p class="eyebrow">Refine the point</p>
          <h2 id="location-map-title">Choose on the map</h2>
          <p>Move the marker or click anywhere to refine the coordinates. This selection is saved as a manual location.</p>
        </div>
      </header>
      <div ref="mapContainer" class="location-map-canvas" aria-label="Map for selecting a location"></div>
      <div v-if="mapError" class="location-map-message" role="alert">{{ mapError }}</div>
      <footer class="location-map-footer">
        <span class="location-map-coordinates"><strong>Coordinates</strong> {{ coordinateText }}</span>
        <button type="button" class="button button--dark" :disabled="!hasCoordinates" @click="confirm">Use this point <Icon name="lucide:check" class="app-icon" /></button>
      </footer>
    </div>
  </ModalShell>
</template>
