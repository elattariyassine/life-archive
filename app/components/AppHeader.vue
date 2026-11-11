<script setup lang="ts">
const navigation = [
  { label: 'Timeline', to: '/timeline', icon: 'timeline' as const },
  { label: 'Gallery', to: '/gallery', icon: 'grid' as const },
  { label: 'Settings', to: '/settings', icon: 'settings' as const }
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
          <AppIcon :name="item.icon" />
          <span>{{ item.label }}</span>
        </NuxtLink>
      </nav>
      <div class="header-tools">
        <NuxtLink to="/memory/new" class="new-memory-link">New memory <AppIcon name="arrow-up-right" /></NuxtLink>
        <div class="header-note">A personal record<br>of ordinary days</div>
      </div>
    </div>
  </header>
</template>
