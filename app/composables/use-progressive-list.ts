/**
 * Renders a long list in batches: the first batch on the server, the next ones as a sentinel
 * element scrolls into view. Keeps large archives fast without hiding anything permanently.
 */
export const useProgressiveList = (total: Ref<number> | ComputedRef<number>, step = 30) => {
  const limit = ref(step)
  const sentinel = ref<HTMLElement | null>(null)
  const hasMore = computed(() => limit.value < total.value)
  let observer: IntersectionObserver | null = null

  const showMore = () => {
    limit.value = Math.min(total.value, limit.value + step)
  }

  /** Make sure the item at `index` is rendered, e.g. before scrolling to it. */
  const ensureVisible = (index: number) => {
    if (index >= limit.value) limit.value = Math.min(total.value, index + step)
  }

  const reset = () => {
    limit.value = step
  }

  onMounted(() => {
    observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting) && hasMore.value) showMore()
    }, { rootMargin: '900px 0px' })
    watch(sentinel, (element, previous) => {
      if (previous) observer?.unobserve(previous)
      if (element) observer?.observe(element)
    }, { immediate: true })
  })

  onBeforeUnmount(() => observer?.disconnect())

  return { limit, sentinel, hasMore, showMore, ensureVisible, reset }
}
