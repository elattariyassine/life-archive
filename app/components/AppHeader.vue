<script setup lang="ts">
const { openModal } = useGlobalModal()

const navigation = [
  { label: 'Timeline', to: '/timeline', icon: 'lucide:list' },
  { label: 'Calendar', to: '/calendar', icon: 'lucide:calendar-days' },
  { label: 'Gallery', to: '/gallery', icon: 'lucide:layout-grid' },
  { label: 'Map', to: '/map', icon: 'lucide:map' }
]
</script>

<template>
  <header class="site-header">
    <a href="#main-content" class="skip-link">Skip to content</a>
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
        <button type="button" class="new-memory-link" data-global-trigger="create" aria-keyshortcuts="N" @click="openModal('create')"><Icon name="lucide:plus" class="app-icon" /> New memory <kbd class="nav-shortcut">N</kbd></button>
        <NuxtLink to="/settings" class="header-settings" aria-label="Settings" title="Settings"><Icon name="lucide:settings" class="app-icon" /></NuxtLink>
      </div>
    </div>
  </header>
  <nav class="mobile-tabbar" aria-label="Main navigation">
    <NuxtLink v-for="item in navigation" :key="item.to" :to="item.to" class="mobile-tab">
      <Icon :name="item.icon" class="app-icon" />
      <span>{{ item.label }}</span>
    </NuxtLink>
    <button type="button" class="mobile-tab" data-global-trigger="search" @click="openModal('search')">
      <Icon name="lucide:search" class="app-icon" />
      <span>Search</span>
    </button>
  </nav>
</template>
