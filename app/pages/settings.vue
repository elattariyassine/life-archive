<script setup lang="ts">
import type { MemoryRepositoryStatusResponse } from '~/types/memory-api'

const { data: status, error: statusError, refresh: refreshStatus } = await useFetch<MemoryRepositoryStatusResponse>('/api/status')
const isFilesystem = computed(() => status.value?.mode === 'filesystem')
const isArchiveAvailable = computed(() => Boolean(status.value?.archiveAvailable))
const isChecking = computed(() => !status.value && !statusError.value)
const isWarning = computed(() => Boolean(statusError.value) || Boolean(isFilesystem.value && !isArchiveAvailable.value))
const statusTitle = computed(() => {
  if (statusError.value) return 'Status unavailable'
  if (isChecking.value) return 'Checking archive status'
  if (!isFilesystem.value) return 'Sample data active'
  return isArchiveAvailable.value ? 'Private archive active' : 'Archive unavailable'
})
const statusDescription = computed(() => {
  if (statusError.value) return 'The server did not return its archive status. Try again or check the server logs.'
  if (isChecking.value) return 'Checking which repository is connected.'
  if (!status.value) return 'Archive status is not available.'
  if (!isFilesystem.value) return 'This preview is powered by local fixture entries. No personal files are stored in this application.'
  if (!status.value.archiveConfigured) return 'Filesystem mode is selected, but no archive directory is configured.'
  if (!isArchiveAvailable.value) return 'The configured archive directory could not be found or opened. Check the server configuration and restart it.'
  return 'Reading Markdown and media from the configured private archive directory.'
})
const statusBadge = computed(() => {
  if (statusError.value) return 'Unavailable'
  if (isChecking.value) return 'Checking'
  if (!isFilesystem.value) return 'Preview'
  return isArchiveAvailable.value ? 'Connected' : 'Unavailable'
})
const directoryTitle = computed(() => {
  if (!status.value?.archiveConfigured) return 'Not configured'
  return isFilesystem.value ? 'Configured' : 'Configured, inactive'
})
const directoryDescription = computed(() => {
  if (!isFilesystem.value && status.value?.archiveConfigured) return 'An archive path is present, but the sample repository is currently active.'
  if (isFilesystem.value) return 'The filesystem adapter reads from the separate Life Archive data repository configured for this server.'
  return 'Set an archive path on the server to connect a separate Life Archive data repository.'
})
const refreshArchiveStatus = () => refreshStatus()
</script>

<template>
  <div class="page page-container settings-page">
    <section class="page-intro">
      <p class="eyebrow">The quiet machinery / 03</p>
      <h1>Settings</h1>
      <p class="page-intro-copy">A small amount of information about how this archive is kept.</p>
    </section>
    <div class="settings-list" aria-label="Archive settings">
      <section class="setting-row setting-row--status">
        <div class="setting-copy"><span class="fact-label">Archive status</span><h2>{{ statusTitle }}</h2><p>{{ statusDescription }}</p></div>
        <div class="setting-aside setting-aside--status"><span class="status-dot" :class="{ 'status-dot--warning': isWarning }" role="status" aria-live="polite">{{ statusBadge }}</span><button type="button" class="text-link settings-refresh" @click="refreshArchiveStatus">Refresh status <Icon name="lucide:refresh-cw" class="app-icon" /></button></div>
      </section>
      <section class="setting-row">
        <div class="setting-copy"><span class="fact-label">Archive directory</span><h2 class="setting-value">{{ directoryTitle }}</h2><p>{{ directoryDescription }}</p></div>
        <div class="setting-aside setting-aside--configuration"><span class="setting-aside-label">Server managed</span><code>NUXT_ARCHIVE_DIR</code></div>
      </section>
      <section class="setting-row">
        <div class="setting-copy"><span class="fact-label">Storage</span><h2>Markdown + media</h2><p>Markdown files remain the source of truth. Images, audio and video stay beside the entry that references them.</p></div>
        <span class="setting-symbol" aria-hidden="true">.md</span>
      </section>
    </div>
    <section class="settings-guide" aria-labelledby="settings-guide-heading">
      <div class="settings-guide-heading"><span class="fact-label">How the archive works</span><h2 id="settings-guide-heading">The files stay yours.</h2><p>Life Archive is a reader and organizer around a private folder, not a replacement for it.</p></div>
      <div class="settings-guide-grid">
        <article><span>01</span><h3>Write anywhere</h3><p>Use VS Code, Obsidian, Finder, or any editor that works with Markdown.</p></article>
        <article><span>02</span><h3>Keep media close</h3><p>Images and other media live beside the <code>index.md</code> file for each memory.</p></article>
        <article><span>03</span><h3>Read here</h3><p>The server scans the configured folder and serves the archive without copying it into the app.</p></article>
      </div>
    </section>
    <aside class="settings-note"><span class="end-mark" aria-hidden="true">✳</span><div><strong>Designed for a private archive.</strong><p>This first version has no account, sync, database or cloud connection. It is intentionally simple.</p><div class="settings-note-links"><NuxtLink to="/timeline" class="text-link">Browse timeline <Icon name="lucide:arrow-right" class="app-icon" /></NuxtLink><NuxtLink to="/gallery" class="text-link">Browse gallery <Icon name="lucide:arrow-right" class="app-icon" /></NuxtLink></div></div></aside>
  </div>
</template>
