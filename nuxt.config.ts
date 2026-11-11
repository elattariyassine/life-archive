// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/content'],
  css: ['~/assets/css/main.css'],
  devServer: {
    host: '127.0.0.1'
  },
  runtimeConfig: {
    archiveDir: '',
    archiveRepository: ''
  },
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true }
})
