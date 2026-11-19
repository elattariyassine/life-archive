<script setup lang="ts">
import { memoryTypes, type MemoryCreateInput, type MemoryLocation, type MemoryType } from '~/types/memory'
import { formatMemoryDate, formatType, getMemoryPath } from '~/utils/memory'

const props = withDefaults(defineProps<{
  busy?: boolean
  error?: string
  initialDate?: string
}>(), { busy: false, error: '', initialDate: undefined })

const emit = defineEmits<{
  save: [input: MemoryCreateInput]
  cancel: []
}>()

const repository = useMemoryRepository()

const today = () => {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const form = reactive({
  date: props.initialDate || today(),
  title: '',
  type: 'highlight' as MemoryType,
  mood: '',
  moodScore: 7,
  tags: ''
})
const selectedLocation = ref<MemoryLocation | undefined>()
const localError = ref('')
const existingMemory = ref<{ date: string; title: string } | null>(null)
let dateCheckTimer: ReturnType<typeof setTimeout> | undefined
let dateCheckId = 0

const checkDate = async (date: string) => {
  const currentCheck = ++dateCheckId
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    existingMemory.value = null
    return
  }
  try {
    const memory = await repository.getMemoryByDate(date)
    if (currentCheck === dateCheckId) existingMemory.value = memory ? { date: memory.date, title: memory.title } : null
  } catch {
    if (currentCheck === dateCheckId) existingMemory.value = null
  }
}

watch(() => form.date, date => {
  if (dateCheckTimer) clearTimeout(dateCheckTimer)
  dateCheckTimer = setTimeout(() => checkDate(date), 200)
}, { immediate: true })

onBeforeUnmount(() => {
  if (dateCheckTimer) clearTimeout(dateCheckTimer)
})

const submit = () => {
  localError.value = ''
  if (existingMemory.value) return
  if (!form.title.trim()) {
    localError.value = 'Give this memory a title before creating it.'
    return
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date)) {
    localError.value = 'Use a complete date in YYYY-MM-DD format.'
    return
  }
  const date = new Date(`${form.date}T00:00:00Z`)
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== form.date) {
    localError.value = 'Choose a real calendar date.'
    return
  }
  const tags = form.tags.split(',').map(tag => tag.trim()).filter(Boolean)
  if (tags.length > 30 || tags.some(tag => tag.length > 50)) {
    localError.value = 'Use up to 30 tags, with no more than 50 characters per tag.'
    return
  }
  emit('save', {
    date: form.date,
    title: form.title.trim(),
    type: form.type,
    location: selectedLocation.value,
    mood: form.mood.trim() ? { label: form.mood.trim(), score: Number(form.moodScore) } : undefined,
    tags
  })
}
</script>

<template>
  <form class="creation-form creation-form--modal" @submit.prevent="submit">
    <header class="modal-form-heading">
      <div>
        <p class="eyebrow">Capture a page / N</p>
        <h2 id="create-memory-modal-title">New memory</h2>
        <p class="page-intro-copy">Give the moment enough shape to find it again later. You write the story in your own editor afterwards.</p>
      </div>
      <div class="creation-actions">
        <button type="button" class="button button--outline" :disabled="busy" @click="emit('cancel')">Cancel</button>
        <button type="submit" class="button button--dark" :disabled="busy || Boolean(existingMemory)">{{ busy ? 'Creating...' : 'Create memory' }} <Icon name="lucide:arrow-right" class="app-icon" /></button>
      </div>
    </header>

    <section class="creation-fields" aria-labelledby="details-heading">
      <div class="creation-section-heading"><span class="section-label">01 <span>Context</span></span><h2 id="details-heading">The details around it</h2></div>
      <label class="creation-field creation-field--title"><span>Title</span><input v-model="form.title" data-modal-autofocus type="text" maxlength="200" placeholder="Give the day a name" autocomplete="off"></label>
      <div class="creation-field-grid">
        <label class="creation-field"><span>Date <small>One memory per day</small></span><input v-model="form.date" type="date" required :aria-describedby="existingMemory ? 'creation-date-conflict' : undefined"></label>
        <label class="creation-field"><span>Type</span><select v-model="form.type"><option v-for="type in memoryTypes" :key="type" :value="type">{{ formatType(type) }}</option></select></label>
      </div>
      <div v-if="existingMemory" id="creation-date-conflict" class="form-message form-message--error creation-date-conflict" role="status">
        <span>{{ formatMemoryDate(existingMemory.date) }} already holds “{{ existingMemory.title }}”. Choose another date, or add to that memory instead.</span>
        <NuxtLink :to="getMemoryPath(existingMemory.date)" class="text-link" @click="emit('cancel')">Open it <Icon name="lucide:arrow-up-right" class="app-icon" /></NuxtLink>
      </div>
      <div class="creation-field-grid">
        <div class="creation-field"><span>Location <small>Optional</small></span><MemoryLocationField v-model="selectedLocation" :disabled="busy" /></div>
        <label class="creation-field"><span>Mood <small>Optional</small></span><input v-model="form.mood" type="text" maxlength="50" placeholder="How did it feel?"></label>
      </div>
      <label class="creation-field"><span>Tags <small>Optional, separate with commas</small></span><input v-model="form.tags" type="text" placeholder="home, summer"></label>
      <label v-if="form.mood" class="creation-field creation-field--range"><span>Feeling <output>{{ form.moodScore }}/10</output></span><input v-model.number="form.moodScore" type="range" min="1" max="10"></label>
    </section>

    <div v-if="localError || error" class="form-message form-message--error" role="alert">{{ localError || error }}</div>
  </form>
</template>
