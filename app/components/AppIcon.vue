<script setup lang="ts">
defineProps<{ name: 'arrow-right' | 'arrow-up-right' | 'chevron-down' | 'map-pin' | 'music' | 'book' | 'grid' | 'timeline' | 'settings' | 'play' }>()
</script>

<template>
  <svg class="app-icon" viewBox="0 0 24 24" aria-hidden="true">
    <template v-if="name === 'arrow-right'">
      <path d="M4 12h15M13 6l6 6-6 6" />
    </template>
    <template v-else-if="name === 'arrow-up-right'">
      <path d="M5 19 19 5M8 5h11v11" />
    </template>
    <template v-else-if="name === 'chevron-down'">
      <path d="m6 9 6 6 6-6" />
    </template>
    <template v-else-if="name === 'map-pin'">
      <path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" /><circle cx="12" cy="10" r="2.2" />
    </template>
    <template v-else-if="name === 'music'">
      <path d="M9 18V5l10-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="16" cy="16" r="3" />
    </template>
    <template v-else-if="name === 'book'">
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Z" /><path d="M4 18.5A2.5 2.5 0 0 1 6.5 16H20" />
    </template>
    <template v-else-if="name === 'grid'">
      <rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" />
    </template>
    <template v-else-if="name === 'timeline'">
      <path d="M6 4v16M6 7h12M6 12h8M6 17h12" /><circle cx="6" cy="7" r="1.5" /><circle cx="6" cy="12" r="1.5" /><circle cx="6" cy="17" r="1.5" />
    </template>
    <template v-else-if="name === 'settings'">
      <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-1.7 1.7-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1 1.55V20h-2.4v-.21a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.88.34l-.06.06-1.7-1.7.06-.06A1.7 1.7 0 0 0 8.6 15a1.7 1.7 0 0 0-1.55-1H6v-2.4h1.05a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.88L8.2 8.66l1.7-1.7.06.06a1.7 1.7 0 0 0 1.88.34 1.7 1.7 0 0 0 1-1.55V4.8h2.4v1.01a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.88-.34l.06-.06 1.7 1.7-.06.06a1.7 1.7 0 0 0-.34 1.88 1.7 1.7 0 0 0 1.55 1H20V14h-.6a1.7 1.7 0 0 0 0 1Z" />
    </template>
    <template v-else>
      <path d="M8 5v14l11-7L8 5Z" />
    </template>
  </svg>
</template>
