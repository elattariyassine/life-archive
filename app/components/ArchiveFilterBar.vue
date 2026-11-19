<script setup lang="ts">
import { memoryTypes, type MemoryType } from '~/types/memory'
import type { ArchiveFilterKey } from '~/utils/archive-filters'
import { formatType } from '~/utils/memory'

const props = withDefaults(defineProps<{
  summary: string
  hide?: ArchiveFilterKey[]
}>(), { hide: () => [] })

const { filters, activeFilters, isFiltered, setFilter, clearFilter, clearFilters } = useArchiveFilters()
const { data: options } = useArchiveFilterOptions()

const fields = computed(() => {
  const all: Array<{ key: ArchiveFilterKey; label: string; all: string; values: Array<{ value: string; label: string }> }> = [
    { key: 'year', label: 'Year', all: 'All years', values: options.value.years.map(year => ({ value: String(year), label: String(year) })) },
    { key: 'type', label: 'Type', all: 'All types', values: memoryTypes.map(type => ({ value: type, label: formatType(type) })) },
    { key: 'tag', label: 'Tag', all: 'All tags', values: options.value.tags.map(tag => ({ value: tag, label: tag })) },
    { key: 'mood', label: 'Mood', all: 'All moods', values: options.value.moods.map(mood => ({ value: mood, label: mood })) },
    { key: 'country', label: 'Country', all: 'All countries', values: options.value.countries.map(country => ({ value: country, label: country })) },
    { key: 'city', label: 'City', all: 'All cities', values: options.value.cities.map(city => ({ value: city, label: city })) }
  ]
  return all.filter(field => !props.hide.includes(field.key) && (field.values.length > 0 || filters.value[field.key] !== undefined))
})

const valueOf = (key: ArchiveFilterKey) => {
  const value = filters.value[key]
  return value === undefined ? '' : String(value)
}

const update = (key: ArchiveFilterKey, event: Event) => {
  const raw = (event.target as HTMLSelectElement).value
  if (key === 'year') setFilter('year', raw ? Number(raw) : undefined)
  else if (key === 'type') setFilter('type', (raw || undefined) as MemoryType | undefined)
  else setFilter(key, raw || undefined)
}

const panelOpen = ref(isFiltered.value)
</script>

<template>
  <section class="archive-filters" aria-label="Filter the archive">
    <div class="archive-filters-bar">
      <button type="button" class="archive-filters-toggle" :aria-expanded="panelOpen" aria-controls="archive-filter-fields" @click="panelOpen = !panelOpen">
        <Icon name="lucide:sliders-horizontal" class="app-icon" />
        <span>Filter</span>
        <span v-if="activeFilters.length" class="archive-filters-count">{{ activeFilters.length }}</span>
      </button>
      <ul v-if="activeFilters.length" class="archive-filter-chips" aria-label="Active filters">
        <li v-for="filter in activeFilters" :key="filter.key">
          <button type="button" class="archive-filter-chip" :aria-label="`Remove ${filter.kind.toLowerCase()} filter ${filter.label}`" @click="clearFilter(filter.key)">
            <span class="archive-filter-chip-kind">{{ filter.kind }}</span> {{ filter.label }} <Icon name="lucide:x" class="app-icon" />
          </button>
        </li>
        <li><button type="button" class="search-clear" @click="clearFilters">Clear all</button></li>
      </ul>
      <span class="archive-filters-summary" aria-live="polite">{{ summary }}</span>
      <slot />
    </div>
    <div v-show="panelOpen" id="archive-filter-fields" class="archive-filter-grid">
      <label v-for="field in fields" :key="field.key">
        <span>{{ field.label }}</span>
        <select :value="valueOf(field.key)" @change="update(field.key, $event)">
          <option value="">{{ field.all }}</option>
          <option v-for="option in field.values" :key="option.value" :value="option.value">{{ option.label }}</option>
          <option v-if="valueOf(field.key) && !field.values.some(option => option.value === valueOf(field.key))" :value="valueOf(field.key)">{{ valueOf(field.key) }}</option>
        </select>
      </label>
    </div>
  </section>
</template>
