<script setup lang="ts">
const props = defineProps<{ target: HTMLElement | null }>()

const progress = ref(0)
let frame = 0

const measure = () => {
  frame = 0
  const element = props.target
  if (!element) return
  const rect = element.getBoundingClientRect()
  const total = rect.height - window.innerHeight * 0.6
  progress.value = total <= 0 ? 1 : Math.min(1, Math.max(0, -rect.top / total))
}

const schedule = () => {
  if (!frame) frame = requestAnimationFrame(measure)
}

onMounted(() => {
  window.addEventListener('scroll', schedule, { passive: true })
  window.addEventListener('resize', schedule, { passive: true })
  schedule()
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', schedule)
  window.removeEventListener('resize', schedule)
  if (frame) cancelAnimationFrame(frame)
})
</script>

<template>
  <div class="reading-progress" aria-hidden="true"><span :style="{ transform: `scaleX(${progress})` }" /></div>
</template>
