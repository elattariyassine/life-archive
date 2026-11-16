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
const loadedImageIds = new Set<string>()
const imageIndexes = new Map<string, number>()
let imageMotionTick = 0
let imageRotationTimer: ReturnType<typeof setInterval> | null = null

const sourceId = 'memory-map-points'
const isImageMedia = (media: MemoryMapPoint['media'][number]) => media.kind === 'image' || (!media.kind && /\.(avif|gif|heic|jpe?g|png|svg|webp)(?:[?#]|$)/i.test(media.path || media.src))
const pointImages = (point: MemoryMapPoint) => point.media.filter(isImageMedia)
const pointImage = (point: MemoryMapPoint) => pointImages(point)[0]
const imageIndex = (point: MemoryMapPoint) => {
  const images = pointImages(point)
  return images.length ? (imageIndexes.get(point.date) || 0) % images.length : 0
}
const imageId = (point: MemoryMapPoint, index = imageIndex(point)) => `memory-map-image-${point.date}-${index}`
const markerRotation = (date: string) => {
  const seed = Number(date.replaceAll('-', '').slice(-3)) || 0
  return (seed % 5) - 2 + (imageMotionTick % 2 ? 0.8 : -0.8)
}
const pointCollection = (points: MemoryMapPoint[]) => ({
  type: 'FeatureCollection' as const,
  features: points.map(point => ({
    type: 'Feature' as const,
    geometry: { type: 'Point' as const, coordinates: [point.location.longitude!, point.location.latitude!] },
    properties: {
      date: point.date,
      precision: point.location.precision || 'unknown',
      ...(loadedImageIds.has(imageId(point)) ? { imageId: imageId(point), rotation: markerRotation(point.date) } : {})
    }
  }))
})

const getSource = () => map?.getSource(sourceId) as GeoJSONSource | undefined

const fitMapToPoints = (points: MemoryMapPoint[]) => {
  if (!map || !maplibre || !points.length) return
  const coordinates = points.map(point => [point.location.longitude!, point.location.latitude!] as [number, number])
  const first = coordinates[0]
  if (!first) return
  const samePlace = coordinates.every(([longitude, latitude]) => longitude === first[0] && latitude === first[1])
  if (samePlace) {
    map.easeTo({ center: first, zoom: 12, duration: 650 })
    return
  }
  const bounds = new maplibre.LngLatBounds(coordinates[0], coordinates[0])
  coordinates.slice(1).forEach(coordinate => bounds.extend(coordinate))
  map.fitBounds(bounds, { padding: 88, maxZoom: 11.5, duration: 650 })
}

const loadPointImage = async (point: MemoryMapPoint, media: MemoryMapPoint['media'][number], index: number) => {
  const id = imageId(point, index)
  if (!map || !media || loadedImageIds.has(id)) {
    return
  }
  try {
    const { data: image } = await map.loadImage(media.src)
    if (image && map && !map.hasImage(id)) {
      const size = 112
      const border = 7
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const context = canvas.getContext('2d')
      if (context) {
        const source = image as HTMLImageElement | ImageBitmap
        const width = source instanceof HTMLImageElement ? source.naturalWidth : source.width
        const height = source instanceof HTMLImageElement ? source.naturalHeight : source.height
        const innerSize = size - border * 2
        const scale = Math.max(innerSize / width, innerSize / height)
        const drawnWidth = width * scale
        const drawnHeight = height * scale
        context.fillStyle = '#f4f0e8'
        context.fillRect(0, 0, size, size)
        context.save()
        context.beginPath()
        context.rect(border, border, innerSize, innerSize)
        context.clip()
        context.drawImage(source, (size - drawnWidth) / 2, (size - drawnHeight) / 2, drawnWidth, drawnHeight)
        context.restore()
        context.strokeStyle = '#262522'
        context.lineWidth = 2
        context.strokeRect(1, 1, size - 2, size - 2)
        map.addImage(id, { width: size, height: size, data: context.getImageData(0, 0, size, size).data }, { pixelRatio: 2 })
        loadedImageIds.add(id)
      }
    }
  } catch {
    // Images that cannot be loaded use the regular precision marker.
  }
}

const loadPointImages = async (points: MemoryMapPoint[]) => {
  await Promise.all(points.flatMap(point => pointImages(point).map((media, index) => loadPointImage(point, media, index))))
}

const rotatePointImages = () => {
  imageMotionTick += 1
  props.points.forEach(point => {
    const images = pointImages(point)
    if (images.length > 1) imageIndexes.set(point.date, (imageIndex(point) + 1) % images.length)
  })
  getSource()?.setData(pointCollection(props.points))
}

const startImageRotation = () => {
  if (imageRotationTimer || !props.points.some(point => pointImages(point).length > 1)) return
  imageRotationTimer = setInterval(rotatePointImages, 5200)
}

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

const selectPointFromEvent = (event: import('maplibre-gl').MapMouseEvent) => {
  const feature = map?.queryRenderedFeatures(event.point, { layers: ['memory-map-points', 'memory-map-images'] })[0]
  if (feature?.properties?.date) selectPoint(String(feature.properties.date))
}

const addLayers = async () => {
  if (!map) return
  try {
    await loadPointImages(props.points)
    map.addSource(sourceId, {
      type: 'geojson',
      data: pointCollection(props.points),
      cluster: true,
      clusterMaxZoom: 10,
      clusterRadius: 44
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
      filter: ['all', ['!', ['has', 'point_count']], ['!', ['has', 'imageId']]],
      paint: {
        'circle-color': ['match', ['get', 'precision'], 'place', '#ad5c43', '#65755f'],
        'circle-radius': 8,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#f4f0e8'
      }
    })
    map.addLayer({
      id: 'memory-map-images',
      type: 'symbol',
      source: sourceId,
      filter: ['all', ['!', ['has', 'point_count']], ['has', 'imageId']],
      layout: {
        'icon-image': ['get', 'imageId'],
        'icon-size': 1,
        'icon-anchor': 'center',
        'icon-rotate': ['get', 'rotation'],
        'icon-rotation-alignment': 'viewport',
        'icon-allow-overlap': true,
        'icon-ignore-placement': true
      },
      paint: {
        'icon-halo-color': '#f4f0e8',
        'icon-halo-width': 2,
        'icon-halo-blur': 0.2
      }
    })
    map.on('click', 'memory-map-clusters', selectCluster)
    map.on('click', 'memory-map-points', selectPointFromEvent)
    map.on('click', 'memory-map-images', selectPointFromEvent)
    map.on('mouseenter', 'memory-map-clusters', () => { if (map) map.getCanvas().style.cursor = 'pointer' })
    map.on('mouseenter', 'memory-map-points', () => { if (map) map.getCanvas().style.cursor = 'pointer' })
    map.on('mouseenter', 'memory-map-images', () => { if (map) map.getCanvas().style.cursor = 'pointer' })
    map.on('mouseleave', 'memory-map-clusters', () => { if (map) map.getCanvas().style.cursor = '' })
    map.on('mouseleave', 'memory-map-points', () => { if (map) map.getCanvas().style.cursor = '' })
    map.on('mouseleave', 'memory-map-images', () => { if (map) map.getCanvas().style.cursor = '' })
    startImageRotation()
    fitMapToPoints(props.points)
  } catch {
    mapError.value = 'The map could not be loaded.'
  }
}

const initialize = async () => {
  if (!import.meta.client || map || !mapContainer.value || !props.styleUrl) {
    if (!props.styleUrl) mapError.value = 'Map selection is not configured.'
    return
  }
  try {
    maplibre = await import('maplibre-gl')
    maplibre.setWorkerUrl(maplibreWorkerUrl)
    const firstPoint = props.points[0]
    const initialCenter: [number, number] = firstPoint ? [firstPoint.location.longitude!, firstPoint.location.latitude!] : [0, 20]
    map = new maplibre.Map({ container: mapContainer.value, style: props.styleUrl, center: initialCenter, zoom: firstPoint ? 3.5 : 1.4, attributionControl: false })
    map.addControl(new maplibre.AttributionControl({ customAttribution: 'OpenFreeMap | © OpenMapTiles | Data from OpenStreetMap' }), 'bottom-right')
    map.on('load', () => void addLayers())
    map.on('error', () => { mapError.value = 'The map could not be loaded.' })
  } catch {
    mapError.value = 'The map could not be loaded.'
  }
}

watch(() => props.points, points => {
  void loadPointImages(points).then(() => {
    getSource()?.setData(pointCollection(points))
    startImageRotation()
    if (map?.loaded()) fitMapToPoints(points)
  })
  const available = new Set(points.map(point => point.date))
  selectedPoints.value = selectedPoints.value.filter(point => available.has(point.date))
}, { deep: true })

onMounted(initialize)
onBeforeUnmount(() => {
  if (imageRotationTimer) clearInterval(imageRotationTimer)
  map?.remove()
})
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
            <NuxtLink :to="`/memory/${point.date}?from=map`" class="text-link">Open memory <Icon name="lucide:arrow-up-right" class="app-icon" /></NuxtLink>
          </div>
        </article>
      </div>
    </aside>
  </div>
</template>
