/**
 * Markdown is edited outside the app (VS Code, Obsidian, Finder). When the reader returns to this tab,
 * re-read the archive so the page reflects what was just written, without a manual reload.
 */
export default defineNuxtPlugin(() => {
  const minimumInterval = 4000
  let lastRefresh = Date.now()
  let hiddenSince: number | null = null

  const refresh = () => {
    if (Date.now() - lastRefresh < minimumInterval) return
    lastRefresh = Date.now()
    void refreshNuxtData()
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      hiddenSince = Date.now()
      return
    }
    if (hiddenSince !== null) refresh()
    hiddenSince = null
  })

  window.addEventListener('focus', () => {
    // Window focus also fires when switching from another app with the tab already visible.
    if (document.visibilityState === 'visible') refresh()
  })
})
