import type { MemoryMapFilterOptions } from '~/types/location-discovery'
import { archiveFilterKeys, describeArchiveFilters, hasArchiveFilters, parseArchiveFilters, toArchiveFilterQuery, type ArchiveFilterKey, type ArchiveFilters } from '~/utils/archive-filters'

/** Filters live in the URL so every filtered view can be bookmarked, shared, and restored with Back. */
export const useArchiveFilters = () => {
  const route = useRoute()
  const router = useRouter()
  const filters = computed<ArchiveFilters>(() => parseArchiveFilters(route.query))
  const activeFilters = computed(() => describeArchiveFilters(filters.value))
  const isFiltered = computed(() => hasArchiveFilters(filters.value))

  const replaceFilters = (next: ArchiveFilters) => {
    const query = { ...route.query }
    for (const key of archiveFilterKeys) delete query[key]
    return router.replace({ query: { ...query, ...toArchiveFilterQuery(next) } })
  }

  const setFilter = <K extends ArchiveFilterKey>(key: K, value: ArchiveFilters[K] | '' | null | undefined) => {
    const next = { ...filters.value }
    if (value === '' || value === null || value === undefined) delete next[key]
    else next[key] = value as ArchiveFilters[K]
    return replaceFilters(next)
  }

  const clearFilter = (key: ArchiveFilterKey) => setFilter(key, undefined)
  const clearFilters = () => replaceFilters({})

  return { filters, activeFilters, isFiltered, setFilter, clearFilter, clearFilters }
}

export const useArchiveFilterOptions = () => useFetch<MemoryMapFilterOptions>('/api/filter-options', {
  key: 'archive-filter-options',
  default: () => ({ years: [], tags: [], moods: [], countries: [], cities: [] })
})
