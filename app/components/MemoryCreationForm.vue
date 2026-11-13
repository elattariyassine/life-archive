<script setup lang="ts">
import { memoryTypes, type MemoryCreateInput, type MemoryLocation, type MemoryType } from '~/types/memory'
import { formatType } from '~/utils/memory'

const props = withDefaults(defineProps<{
  busy?: boolean
  error?: string
  compact?: boolean
}>(), { busy: false, error: '', compact: false })

const emit = defineEmits<{
  save: [input: MemoryCreateInput]
  cancel: []
}>()

const today = () => {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const form = reactive({
  date: today(),
  title: '',
  type: 'highlight' as MemoryType,
  mood: '',
  moodScore: 7,
  tags: ''
})
const selectedLocation = ref<MemoryLocation | undefined>()
const localError = ref('')

const submit = () => {
  localError.value = ''
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
  <form class="creation-form" :class="{ 'creation-form--modal': props.compact }" @submit.prevent="submit">
    <header v-if="props.compact" class="modal-form-heading">
      <div>
        <p class="eyebrow">Capture a page / N</p>
        <h2 id="create-memory-modal-title">New memory</h2>
        <p class="page-intro-copy">Give the moment enough shape to find it again later.</p>
      </div>
      <div class="creation-actions">
        <button type="button" class="button button--outline" :disabled="busy" @click="emit('cancel')">Cancel</button>
        <button type="submit" class="button button--dark" :disabled="busy">{{ busy ? 'Creating...' : 'Create memory' }} <Icon name="lucide:arrow-right" class="app-icon" /></button>
      </div>
    </header>
    <header v-else class="creation-header page-container">
      <div>
        <NuxtLink to="/timeline" class="back-link"><Icon name="lucide:arrow-right" class="app-icon" /> Back to timeline</NuxtLink>
        <p class="eyebrow">A new page / 04</p>
        <h1>New memory</h1>
        <p class="page-intro-copy">Give the moment enough shape to find it again later. You can write the story in your preferred editor after creating it.</p>
      </div>
      <div class="creation-actions">
        <button type="button" class="button button--outline" :disabled="busy" @click="emit('cancel')">Cancel</button>
        <button type="submit" class="button button--dark" :disabled="busy">{{ busy ? 'Creating...' : 'Create memory' }} <Icon name="lucide:arrow-right" class="app-icon" /></button>
      </div>
    </header>

    <section class="creation-fields page-container" :class="{ 'creation-fields--modal': props.compact }" aria-labelledby="details-heading">
      <div class="creation-section-heading"><span class="section-label">01 <span>Context</span></span><h2 id="details-heading">The details around it</h2></div>
      <label class="creation-field creation-field--title"><span>Title</span><input v-model="form.title" :data-modal-autofocus="props.compact ? true : undefined" type="text" maxlength="200" placeholder="Give the day a name" autocomplete="off"></label>
      <div class="creation-field-grid">
        <label class="creation-field"><span>Date</span><input v-model="form.date" type="date" required></label>
        <label class="creation-field"><span>Type</span><select v-model="form.type"><option v-for="type in memoryTypes" :key="type" :value="type">{{ formatType(type) }}</option></select></label>
      </div>
      <div class="creation-field-grid">
        <div class="creation-field"><span>Location <small>Optional</small></span><MemoryLocationField v-model="selectedLocation" :disabled="busy" /></div>
        <label class="creation-field"><span>Mood <small>Optional</small></span><input v-model="form.mood" type="text" maxlength="50" placeholder="How did it feel?"></label>
      </div>
      <label class="creation-field"><span>Tags <small>Optional, separate with commas</small></span><input v-model="form.tags" type="text" placeholder="home, summer"></label>
      <label v-if="form.mood" class="creation-field creation-field--range"><span>Feeling <output>{{ form.moodScore }}/10</output></span><input v-model.number="form.moodScore" type="range" min="1" max="10"></label>
    </section>

    <section v-if="!props.compact" class="creation-note page-container">
      <strong>Write it elsewhere</strong>
      <p>Life Archive creates the folder, media directory, and a starting Markdown file. Add the story and media from VS Code, Obsidian, or Finder.</p>
    </section>

    <div v-if="localError || error" class="form-message form-message--error page-container" role="alert">{{ localError || error }}</div>
  </form>
</template>
