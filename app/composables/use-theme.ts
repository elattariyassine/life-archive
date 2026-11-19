export type ThemePreference = 'system' | 'light' | 'dark'

const themePreferences: ThemePreference[] = ['system', 'light', 'dark']

/** Stored in a cookie so the server renders the chosen theme and the page never flashes the wrong one. */
export const useTheme = () => {
  const cookie = useCookie<ThemePreference>('la-theme', { default: () => 'system', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' })
  const preference = computed<ThemePreference>({
    get: () => themePreferences.includes(cookie.value) ? cookie.value : 'system',
    set: value => { cookie.value = value }
  })
  return { preference, themePreferences }
}
