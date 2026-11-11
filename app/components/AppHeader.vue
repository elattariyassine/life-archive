<script setup lang="ts">
const navigation = [
  { label: 'Timeline', to: '/timeline', icon: 'lucide:timeline' },
  { label: 'Search', to: '/search', icon: 'lucide:search' },
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
      </nav>
      <div class="header-tools">
        <NuxtLink to="/memory/new" class="new-memory-link">New memory <Icon name="lucide:arrow-up-right" class="app-icon" /></NuxtLink>
        <div class="header-note">A personal record<br>of ordinary days</div>
      </div>
    </div>
  </header>
</template>
