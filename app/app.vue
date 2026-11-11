<script setup lang="ts">
const currentYear = new Date().getFullYear()
</script>

<template>
  <div class="app-shell">
    <NuxtRouteAnnouncer />
    <AppHeader />
    <main id="main-content">
      <NuxtPage />
    </main>
    <footer class="site-footer">
      <div class="footer-inner">
        <span>Life Archive / {{ currentYear }}</span>
        <span>Made to remember, not to perform.</span>
        <NuxtLink to="/settings">Archive settings <Icon name="lucide:arrow-up-right" class="app-icon" /></NuxtLink>
      </div>
    </footer>
  </div>
</template>
