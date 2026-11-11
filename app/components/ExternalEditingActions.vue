<script setup lang="ts">
const props = defineProps<{
  folderPath?: string
}>()

const copied = ref(false)
const copyError = ref('')

const vscodeUri = computed(() => {
  if (!props.folderPath) return ''
  const path = props.folderPath.replaceAll('\\', '/')
  return `vscode://file/${path.split('/').map(encodeURIComponent).join('/')}`
})

const copyPath = async () => {
  if (!props.folderPath) return
  copyError.value = ''
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(props.folderPath)
    } else {
      const input = document.createElement('textarea')
      input.value = props.folderPath
      input.setAttribute('readonly', '')
      input.style.position = 'fixed'
      input.style.opacity = '0'
      document.body.appendChild(input)
      input.select()
      if (!document.execCommand('copy')) throw new Error()
      input.remove()
    }
  } catch {
    copyError.value = 'Copying is unavailable in this browser. Select the path manually.'
    return
  }
  copied.value = true
  window.setTimeout(() => { copied.value = false }, 1800)
}
</script>

<template>
  <section class="external-editing" aria-labelledby="external-editing-heading">
    <div class="external-editing-copy">
      <span class="fact-label">Continue elsewhere</span>
      <h2 id="external-editing-heading">Write in your own tools</h2>
      <p>Add content to <code>index.md</code> and place media in the <code>media/</code> folder using VS Code, Obsidian, or Finder.</p>
    </div>
    <div class="external-editing-path">
      <span class="fact-label">Archive folder</span>
      <code v-if="folderPath">{{ folderPath }}</code>
      <span v-else class="muted-copy">Filesystem path unavailable in sample mode.</span>
    </div>
    <div class="external-editing-actions">
      <a v-if="vscodeUri" :href="vscodeUri" class="button button--dark">Open in VS Code <AppIcon name="arrow-up-right" /></a>
      <button type="button" class="button button--outline" :disabled="!folderPath" @click="copyPath">{{ copied ? 'Copied' : 'Copy path' }}</button>
    </div>
    <p v-if="folderPath" class="external-editing-hint">If your browser does not open VS Code, use Copy path and open the folder manually.</p>
    <p v-if="copyError" class="external-editing-error" role="alert">{{ copyError }}</p>
  </section>
</template>
