<script setup lang="ts">
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl'
import type { MemoryMapPoint } from '~/types/location-discovery'
import { formatMemoryLocation } from '~/utils/location'

const props = defineProps<{
  points: MemoryMapPoint[]
  styleUrl: string
}>()

const mapContainer = ref<HTMLElement | null>(null)
const mapError = ref('')
const selectedPoints = ref<MemoryMapPoint[]>([])
let map: MapLibreMap | null = null
let maplibre: typeof import('maplibre-gl') | null = null

const sourceId = 'memory-map-points'
const pointImage = (point: MemoryMapPoint) => point.media.find(media => media.kind === 'image' || (!media.kind && /\.(avif|gif|heic|jpe?g|png|webp)(?:[?#]|$)/i.test(media.path || media.src)))
const pointCollection = (points: MemoryMapPoint[]) => ({
  type: 'FeatureCollection' as const,
  features: points.map(point => ({
    type: 'Feature' as const,
    geometry: { type: 'Point' as const, coordinates: [point.location.longitude!, point.location.latitude!] },
    properties: { date: point.date, precision: point.location.precision || 'unknown' }
  }))
})

const getSource = () => map?.getSource(sourceId) as GeoJSONSource | undefined

const selectPoint = (date: string) => {
  const point = props.points.find(item => item.date === date)
  selectedPoints.value = point ? [point] : []
}

const selectCluster = async (event: import('maplibre-gl').MapMouseEvent) => {
  const feature = map?.queryRenderedFeatures(event.point, { layers: ['memory-map-clusters'] })[0]
  const clusterId = feature?.properties?.cluster_id
  const source = getSource()
  if (!source || clusterId === undefined) return
  try {
    const leaves = await source.getClusterLeaves(Number(clusterId), 100, 0)
    const dates = new Set(leaves.map(leaf => String(leaf.properties?.date)))
    selectedPoints.value = props.points.filter(point => dates.has(point.date))
    const zoom = await source.getClusterExpansionZoom(Number(clusterId))
    if (map && feature?.geometry && feature.geometry.type === 'Point') map.easeTo({ center: feature.geometry.coordinates as [number, number], zoom })
  } catch {
    mapError.value = 'The selected cluster could not be opened.'
  }
}

const addLayers = () => {
  if (!map) return
  map.addSource(sourceId, {
    type: 'geojson',
    data: pointCollection(props.points),
    cluster: true,
    clusterMaxZoom: 14,
    clusterRadius: 52
  })
  map.addLayer({
    id: 'memory-map-clusters',
    type: 'circle',
    source: sourceId,
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': ['step', ['get', 'point_count'], '#65755f', 10, '#ad5c43', 30, '#262522'],
      'circle-radius': ['step', ['get', 'point_count'], 18, 10, 23, 30, 29],
      'circle-stroke-width': 2,
      'circle-stroke-color': '#f4f0e8'
    }
  })
  map.addLayer({
    id: 'memory-map-cluster-count',
    type: 'symbol',
    source: sourceId,
    filter: ['has', 'point_count'],
    layout: { 'text-field': '{point_count_abbreviated}', 'text-size': 11 },
    paint: { 'text-color': '#f4f0e8' }
  })
  map.addLayer({
    id: 'memory-map-points',
    type: 'circle',
    source: sourceId,
    filter: ['!', ['has', 'point_count']],
    paint: {
      'circle-color': ['match', ['get', 'precision'], 'place', '#ad5c43', '#65755f'],
      'circle-radius': 8,
      'circle-stroke-width': 2,
      'circle-stroke-color': '#f4f0e8'
    }
  })
  map.on('click', 'memory-map-clusters', selectCluster)
  map.on('click', 'memory-map-points', event => {
    const feature = map?.queryRenderedFeatures(event.point, { layers: ['memory-map-points'] })[0]
    if (feature?.properties?.date) selectPoint(String(feature.properties.date))
  })
  map.on('mouseenter', 'memory-map-clusters', () => { if (map) map.getCanvas().style.cursor = 'pointer' })
  map.on('mouseenter', 'memory-map-points', () => { if (map) map.getCanvas().style.cursor = 'pointer' })
  map.on('mouseleave', 'memory-map-clusters', () => { if (map) map.getCanvas().style.cursor = '' })
  map.on('mouseleave', 'memory-map-points', () => { if (map) map.getCanvas().style.cursor = '' })
}

const initialize = async () => {
  if (!import.meta.client || map || !mapContainer.value || !props.styleUrl) {
    if (!props.styleUrl) mapError.value = 'Map selection is not configured.'
    return
  }
  try {
    maplibre = await import('maplibre-gl')
    maplibre.setWorkerUrl(maplibreWorkerUrl)
    map = new maplibre.Map({ container: mapContainer.value, style: props.styleUrl, center: [0, 20], zoom: 1.4, attributionControl: false })
    map.addControl(new maplibre.AttributionControl({ customAttribution: 'OpenFreeMap | © OpenMapTiles | Data from OpenStreetMap' }), 'bottom-right')
    map.on('load', addLayers)
    map.on('error', () => { mapError.value = 'The map could not be loaded.' })
  } catch {
    mapError.value = 'The map could not be loaded.'
  }
}

watch(() => props.points, points => {
  getSource()?.setData(pointCollection(points))
  const available = new Set(points.map(point => point.date))
  selectedPoints.value = selectedPoints.value.filter(point => available.has(point.date))
}, { deep: true })

onMounted(initialize)
onBeforeUnmount(() => map?.remove())
</script>

<template>
  <div class="map-explorer">
    <div ref="mapContainer" class="map-explorer-canvas" aria-label="Map of memories with locations"></div>
    <div v-if="mapError" class="map-explorer-error" role="alert">{{ mapError }} Enter a map style URL in the runtime configuration to enable map exploration.</div>
    <aside v-if="selectedPoints.length" class="map-explorer-inspector" aria-live="polite">
      <header class="map-inspector-heading">
        <div>
          <p class="eyebrow">{{ selectedPoints.length === 1 ? 'One remembered place' : `${selectedPoints.length} remembered places` }}</p>
          <h2>{{ selectedPoints.length === 1 ? 'A memory here' : 'Memories here' }}</h2>
        </div>
        <button type="button" class="map-inspector-close" aria-label="Close map selection" @click="selectedPoints = []"><Icon name="lucide:x" class="app-icon" /></button>
      </header>
      <div class="map-inspector-list">
        <article v-for="point in selectedPoints" :key="point.date" class="map-memory-preview">
          <img v-if="pointImage(point)" :src="pointImage(point)?.src" :alt="pointImage(point)?.alt || point.title">
          <div class="map-memory-preview-copy">
            <span class="entry-kicker"><span>{{ point.date }}</span><span>{{ point.type }}</span></span>
            <h3>{{ point.title }}</h3>
            <p>{{ formatMemoryLocation(point.location) }}</p>
            <small>{{ point.location.precision === 'place' ? 'Precise place' : 'Approximate city / region' }}</small>
            <NuxtLink :to="`/memory/${point.date}`" class="text-link">Open memory <Icon name="lucide:arrow-up-right" class="app-icon" /></NuxtLink>
          </div>
        </article>
      </div>
    </aside>
  </div>
</template>
