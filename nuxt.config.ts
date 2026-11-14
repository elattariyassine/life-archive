// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/content', '@nuxt/icon'],
  mdc: {
    components: {
      map: {
        img: 'MemoryContentImage'
      }
    }
  },
  icon: {
    serverBundle: {
      collections: ['lucide']
    }
  },
  css: ['maplibre-gl/dist/maplibre-gl.css', '~/assets/css/main.css'],
  devServer: {
    host: '127.0.0.1'
  },
  runtimeConfig: {
    archiveDir: '',
    archiveRepository: '',
    geocodingProvider: 'photon',
    photonUrl: 'https://photon.komoot.io/api',
    public: {
      mapStyleUrl: 'https://tiles.openfreemap.org/styles/positron'
    }
  },
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true }
})
