import MemoryContentImage from '~/components/MemoryContentImage.vue'

export default defineNuxtPlugin(nuxtApp => {
  nuxtApp.vueApp.component('MemoryContentImage', MemoryContentImage)
})
