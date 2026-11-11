<script setup lang="ts">
import type { MemoryRepositoryStatusResponse } from '~/types/memory-api'

const { data: status } = await useFetch<MemoryRepositoryStatusResponse>('/api/status')
const isFilesystem = computed(() => status.value?.mode === 'filesystem')
const isArchiveAvailable = computed(() => Boolean(status.value?.archiveAvailable))
const statusTitle = computed(() => {
  if (!status.value) return 'Checking archive status'
  if (!isFilesystem.value) return 'Sample data active'
  return isArchiveAvailable.value ? 'Private archive active' : 'Archive unavailable'
})
const statusDescription = computed(() => {
  if (!status.value) return 'Checking which repository is connected.'
  if (!isFilesystem.value) return 'This preview is powered by local fixture entries. No personal files are stored in this application.'
  if (!status.value.archiveConfigured) return 'Filesystem mode is selected, but no archive directory is configured.'
  if (!isArchiveAvailable.value) return 'The configured archive directory could not be found or opened.'
  return 'Reading Markdown and media from the configured private archive directory.'
})
const statusBadge = computed(() => {
  if (!status.value) return 'Checking'
  if (!isFilesystem.value) return 'Preview'
  return isArchiveAvailable.value ? 'Connected' : 'Unavailable'
})
</script>

<template>
  <div class="page page-container settings-page">
    <section class="page-intro">
      <p class="eyebrow">The quiet machinery / 03</p>
      <h1>Settings</h1>
      <p class="page-intro-copy">A small amount of information about how this archive is kept.</p>
    </section>
    <div class="settings-list">
      <section class="setting-row"><div><span class="fact-label">Archive status</span><h2>{{ statusTitle }}</h2><p>{{ statusDescription }}</p></div><span class="status-dot" :class="{ 'status-dot--warning': isFilesystem && !isArchiveAvailable }">{{ statusBadge }}</span></section>
      <section class="setting-row"><div><span class="fact-label">Archive directory</span><h2 class="setting-value">{{ isFilesystem && status?.archiveConfigured ? 'Configured' : 'Not configured' }}</h2><p>{{ isFilesystem ? 'The filesystem adapter reads from the separate Life Archive data repository configured for this server.' : 'The filesystem adapter will point to a separate Life Archive data repository on this computer.' }}</p></div><button class="button button--small" disabled>Configure later</button></section>
      <section class="setting-row"><div><span class="fact-label">Storage</span><h2>Markdown + media</h2><p>Markdown files remain the source of truth. Images and videos stay beside the entry that references them.</p></div><span class="setting-symbol">.md</span></section>
    </div>
    <aside class="settings-note"><span class="end-mark" aria-hidden="true">✳</span><div><strong>Designed for a private archive.</strong><p>This first version has no account, sync, database or cloud connection. It is intentionally simple.</p></div></aside>
  </div>
</template>
