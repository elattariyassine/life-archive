<script setup lang="ts">
import { memoryTypes, type Memory, type MemoryDraft } from '~/types/memory'
import { formatType } from '~/utils/memory'

const props = withDefaults(defineProps<{
  memory?: Memory | null
  mode: 'create' | 'edit'
  busy?: boolean
  error?: string
  conflict?: boolean
}>(), { memory: null, busy: false, error: '', conflict: false })

const emit = defineEmits<{
  save: [draft: MemoryDraft, file?: File]
  cancel: []
  removeMedia: [path: string]
  reload: []
}>()

const form = reactive({
  date: '',
  title: '',
  type: 'highlight' as MemoryDraft['type'],
  moodLabel: '',
  moodScore: 7,
  tags: '',
  location: '',
  musicTitle: '',
  musicArtist: '',
  musicUrl: '',
  content: ''
})
const preview = ref(false)
const selectedFile = ref<File | null>(null)
const selectedPreviewUrl = ref('')
const localError = ref('')

const clearSelectedPreview = () => {
  if (selectedPreviewUrl.value) URL.revokeObjectURL(selectedPreviewUrl.value)
  selectedPreviewUrl.value = ''
}

const resetForm = (memory: Memory | null | undefined) => {
  Object.assign(form, {
    date: memory?.date ?? new Date().toISOString().slice(0, 10),
    title: memory?.title ?? '',
    type: memory?.type ?? 'highlight',
    moodLabel: memory?.mood?.label ?? '',
    moodScore: memory?.mood?.score ?? 7,
    tags: memory?.tags.join(', ') ?? '',
    location: memory?.location ?? '',
    musicTitle: memory?.music?.title ?? '',
    musicArtist: memory?.music?.artist ?? '',
    musicUrl: memory?.music?.url ?? '',
    content: memory?.content ?? '## What happened\n\n'
  })
}

watch(() => [props.mode, props.memory?.date, props.memory?.version], () => resetForm(props.memory), { immediate: true })

const draft = (): MemoryDraft => ({
  date: form.date,
  title: form.title,
  type: form.type,
  mood: form.moodLabel.trim() ? { label: form.moodLabel.trim(), score: Number(form.moodScore) } : undefined,
  tags: form.tags.split(',').map(tag => tag.trim()).filter(Boolean),
  location: form.location.trim() || undefined,
  music: form.musicTitle.trim() || form.musicArtist.trim() || form.musicUrl.trim()
    ? { title: form.musicTitle.trim(), artist: form.musicArtist.trim(), url: form.musicUrl.trim() }
    : undefined,
  content: form.content
})

const submit = () => {
  localError.value = ''
  if (!form.title.trim()) {
    localError.value = 'Give this memory a title before saving.'
    return
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date)) {
    localError.value = 'Use a complete date in YYYY-MM-DD format.'
    return
  }
  emit('save', draft(), selectedFile.value || undefined)
}

const chooseFile = (event: Event) => {
  clearSelectedPreview()
  selectedFile.value = (event.target as HTMLInputElement).files?.[0] ?? null
  if (selectedFile.value?.type.startsWith('image/') || selectedFile.value?.type.startsWith('video/')) {
    selectedPreviewUrl.value = URL.createObjectURL(selectedFile.value)
  }
}

onBeforeUnmount(clearSelectedPreview)
</script>

<template>
  <form class="editor" @submit.prevent="submit">
    <header class="editor-header page-container">
      <div>
        <NuxtLink :to="mode === 'edit' && memory ? `/memory/${memory.date}` : '/timeline'" class="back-link"><AppIcon name="arrow-right" /> Back without saving</NuxtLink>
        <p class="eyebrow">{{ mode === 'create' ? 'A new page / 04' : 'Make a change / 04' }}</p>
        <h1>{{ mode === 'create' ? 'New memory' : 'Edit memory' }}</h1>
        <p class="page-intro-copy">Give the moment enough shape to find it again later.</p>
      </div>
      <div class="editor-actions">
        <button type="button" class="button button--outline" :disabled="busy" @click="emit('cancel')">Cancel</button>
        <button type="submit" class="button button--dark" :disabled="busy">{{ busy ? 'Saving...' : 'Save memory' }} <AppIcon name="arrow-right" /></button>
      </div>
    </header>

    <div class="editor-main page-container">
      <section class="editor-fields" aria-labelledby="details-heading">
        <div class="editor-section-heading"><span class="section-label">01 <span>Context</span></span><h2 id="details-heading">The details around it</h2></div>
        <label class="editor-field editor-field--title"><span>Title</span><input v-model="form.title" type="text" maxlength="200" placeholder="Give the day a name" autocomplete="off"></label>
        <div class="editor-field-grid">
          <label class="editor-field"><span>Date</span><input v-model="form.date" type="date"></label>
          <label class="editor-field"><span>Type</span><select v-model="form.type"><option v-for="type in memoryTypes" :key="type" :value="type">{{ formatType(type) }}</option></select></label>
        </div>
        <div class="editor-field-grid">
          <label class="editor-field"><span>Mood</span><input v-model="form.moodLabel" type="text" maxlength="50" placeholder="Optional"></label>
          <label class="editor-field editor-field--range"><span>Feeling <output>{{ form.moodScore }}/10</output></span><input v-model.number="form.moodScore" type="range" min="1" max="10"></label>
        </div>
        <div class="editor-field-grid">
          <label class="editor-field"><span>Tags <small>Separate with commas</small></span><input v-model="form.tags" type="text" placeholder="home, summer"></label>
          <label class="editor-field"><span>Location</span><input v-model="form.location" type="text" maxlength="200" placeholder="Optional"></label>
        </div>
        <details class="editor-music" :open="Boolean(form.musicTitle || form.musicArtist || form.musicUrl)">
          <summary><span>Soundtrack</span><span class="muted-copy">Add a song to remember the atmosphere</span></summary>
          <div class="editor-field-grid editor-field-grid--three">
            <label class="editor-field"><span>Song</span><input v-model="form.musicTitle" type="text" placeholder="Title"></label>
            <label class="editor-field"><span>Artist</span><input v-model="form.musicArtist" type="text" placeholder="Artist"></label>
            <label class="editor-field"><span>Link</span><input v-model="form.musicUrl" type="url" placeholder="https://"></label>
          </div>
        </details>
      </section>

      <section class="editor-writing" aria-labelledby="writing-heading">
        <div class="editor-section-heading"><span class="section-label">02 <span>Words</span></span><h2 id="writing-heading">What happened</h2></div>
        <div class="editor-toolbar" role="tablist" aria-label="Memory body view">
          <button type="button" role="tab" :aria-selected="!preview" :class="{ active: !preview }" @click="preview = false">Write</button>
          <button type="button" role="tab" :aria-selected="preview" :class="{ active: preview }" @click="preview = true">Preview</button>
          <span>Markdown supported</span>
        </div>
        <textarea v-show="!preview" v-model="form.content" class="editor-textarea" aria-label="Memory Markdown body" placeholder="Start with the part you want to remember..."></textarea>
        <article v-show="preview" class="editor-preview"><MDC :value="form.content || '*Nothing written yet.*'" /></article>
      </section>

      <section class="editor-media" aria-labelledby="media-heading">
        <div class="editor-section-heading"><span class="section-label">03 <span>Frames</span></span><h2 id="media-heading">Media</h2></div>
        <div v-if="memory?.media.length" class="editor-media-grid">
          <figure v-for="media in memory.media" :key="media.path || media.src" class="editor-media-item">
            <img :src="media.src" :alt="media.alt" loading="lazy">
            <figcaption><span>{{ media.path || media.alt }}</span><button type="button" aria-label="Remove media" :disabled="busy" @click="media.path && emit('removeMedia', media.path)">Remove</button></figcaption>
          </figure>
        </div>
        <div class="editor-upload">
          <input id="media-upload" type="file" accept="image/jpeg,image/png,image/gif,image/webp,image/avif,video/mp4,video/webm" @change="chooseFile">
          <label for="media-upload" class="button button--outline">{{ selectedFile ? selectedFile.name : 'Choose media' }}</label>
          <small v-if="selectedFile">This file will be uploaded when you save.</small>
        </div>
        <figure v-if="selectedFile" class="editor-selected-media">
          <img v-if="selectedPreviewUrl && selectedFile.type.startsWith('image/')" :src="selectedPreviewUrl" :alt="selectedFile.name">
          <video v-else-if="selectedPreviewUrl && selectedFile.type.startsWith('video/')" :src="selectedPreviewUrl" controls muted></video>
          <figcaption>{{ selectedFile.name }}</figcaption>
        </figure>
      </section>
    </div>

    <div v-if="localError || error" class="editor-message editor-message--error page-container" role="alert">{{ localError || error }}</div>
    <div v-if="conflict" class="editor-message editor-message--conflict page-container" role="alert"><strong>This memory changed outside Life Archive.</strong><span>Nothing was overwritten.</span><button type="button" class="text-link" @click="emit('reload')">Reload the latest version <AppIcon name="arrow-right" /></button></div>
  </form>
</template>
