<script setup lang="ts">
import type { Memory } from '~/types/memory'
import { getGlobalShortcutAction } from '~/utils/global-shortcuts'

const currentYear = new Date().getFullYear()
const route = useRoute()
const router = useRouter()
const { activeModal, openModal, closeModal } = useGlobalModal()
const createdMemory = shallowRef<Memory | null>(null)

const handleCreated = (memory: Memory) => {
  closeModal()
  createdMemory.value = memory
}

const handleGlobalKeydown = (event: KeyboardEvent) => {
  const action = getGlobalShortcutAction(event, event.target)
  if (!action) return
  if (action === 'close') {
    if (!activeModal.value && !createdMemory.value) return
    event.preventDefault()
    closeModal()
    createdMemory.value = null
    return
  }
  if (action === 'search') {
    event.preventDefault()
    openModal('search')
    return
  }
  if (action === 'create' && !activeModal.value && !createdMemory.value) {
    event.preventDefault()
    openModal('create')
  }
}

watch(() => route.query.modal, async value => {
  if (value !== 'search' && value !== 'create') return
  openModal(value)
  if (import.meta.client) {
    const query = { ...route.query }
    delete query.modal
    await router.replace({ query })
  }
}, { immediate: true })

onMounted(() => window.addEventListener('keydown', handleGlobalKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', handleGlobalKeydown))
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
    <CreateMemoryModal :open="activeModal === 'create'" @close="closeModal" @created="handleCreated" />
    <GlobalSearchModal :open="activeModal === 'search'" @close="closeModal" />
    <MemoryCreationConfirmation :open="Boolean(createdMemory)" :memory="createdMemory" @close="createdMemory = null" />
  </div>
</template>
