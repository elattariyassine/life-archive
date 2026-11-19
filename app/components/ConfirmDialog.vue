<script setup lang="ts">
const props = withDefaults(defineProps<{
  open: boolean
  title: string
  confirmLabel: string
  busyLabel?: string
  confirmationText?: string
  busy?: boolean
  error?: string
}>(), { busyLabel: 'Working...', confirmationText: '', busy: false, error: '' })

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

const typed = ref('')
const canConfirm = computed(() => !props.busy && (!props.confirmationText || typed.value.trim() === props.confirmationText))

watch(() => props.open, open => {
  if (open) typed.value = ''
})

const confirm = () => {
  if (canConfirm.value) emit('confirm')
}
</script>

<template>
  <ModalShell :open="open" title-id="confirm-dialog-title" panel-class="modal-panel--confirm" :close-disabled="busy" @close="emit('cancel')">
    <form class="confirm-dialog" @submit.prevent="confirm">
      <p class="eyebrow">Please confirm</p>
      <h2 id="confirm-dialog-title">{{ title }}</h2>
      <div class="confirm-dialog-body"><slot /></div>
      <label v-if="confirmationText" class="creation-field confirm-dialog-field">
        <span>Type <strong>{{ confirmationText }}</strong> to confirm</span>
        <input v-model="typed" data-modal-autofocus type="text" autocomplete="off" spellcheck="false" :placeholder="confirmationText">
      </label>
      <div v-if="error" class="form-message form-message--error" role="alert"><slot name="error">{{ error }}</slot></div>
      <div class="confirm-dialog-actions">
        <button type="button" class="button button--outline" :disabled="busy" @click="emit('cancel')">Cancel</button>
        <button type="submit" class="button button--danger" :disabled="!canConfirm">{{ busy ? busyLabel : confirmLabel }}</button>
      </div>
    </form>
  </ModalShell>
</template>
