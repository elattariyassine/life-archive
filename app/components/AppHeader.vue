<script setup lang="ts">
const { openModal } = useGlobalModal()

const navigation = [
  { label: 'Timeline', to: '/timeline', icon: 'lucide:timeline' },
  { label: 'Gallery', to: '/gallery', icon: 'lucide:layout-grid' },
  { label: 'Settings', to: '/settings', icon: 'lucide:settings' }
]
</script>

<template>
  <header class="site-header">
    <div class="header-inner">
      <NuxtLink to="/" class="wordmark" aria-label="Life Archive home">
        <span class="wordmark-mark">L</span>
        <span>Life Archive</span>
      </NuxtLink>
      <nav class="main-nav" aria-label="Main navigation">
        <NuxtLink v-for="item in navigation" :key="item.to" :to="item.to" class="nav-link">
          <Icon :name="item.icon" class="app-icon" />
          <span>{{ item.label }}</span>
        </NuxtLink>
        <button type="button" class="nav-link nav-action" data-global-trigger="search" aria-keyshortcuts="Meta+K Control+K" @click="openModal('search')">
          <Icon name="lucide:search" class="app-icon" />
          <span>Search</span>
          <kbd class="nav-shortcut">⌘K</kbd>
        </button>
      </nav>
      <div class="header-tools">
        <button type="button" class="new-memory-link" data-global-trigger="create" aria-keyshortcuts="N" @click="openModal('create')">New memory <kbd class="nav-shortcut">N</kbd></button>
        <div class="header-note">A personal record<br>of ordinary days</div>
      </div>
    </div>
  </header>
</template>
