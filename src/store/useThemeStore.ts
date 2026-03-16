import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemeName      = 'submarine' | 'abyss' | 'inferno' | 'reactor'
export type ThemeMode      = 'dark' | 'light'
export type GlowSpeed      = 'slow' | 'medium' | 'fast'
export type GlowIntensity  = 'low' | 'medium' | 'high'

interface ThemeState {
  theme:         ThemeName
  mode:          ThemeMode
  glowSpeed:     GlowSpeed
  glowIntensity: GlowIntensity
  setTheme:         (t: ThemeName)     => void
  setMode:          (m: ThemeMode)     => void
  setGlowSpeed:     (s: GlowSpeed)     => void
  setGlowIntensity: (i: GlowIntensity) => void
}

export interface ThemeVariant { bg: string; p: string; s: string }

export const THEME_META: Record<ThemeName, {
  label: string
  icon: string
  dark:  ThemeVariant
  light: ThemeVariant
}> = {
  submarine: {
    label: 'Submarine',
    icon:  '🌊',
    dark:  { bg: '#050810', p: '#0088ff', s: '#00e5cc' },
    light: { bg: '#dce8f5', p: '#0064d2', s: '#00b4a0' },
  },
  abyss: {
    label: 'Abyss',
    icon:  '🔮',
    dark:  { bg: '#090813', p: '#9632ff', s: '#c850ff' },
    light: { bg: '#f5eeff', p: '#6e28c8', s: '#9640d2' },
  },
  inferno: {
    label: 'Inferno',
    icon:  '🔥',
    dark:  { bg: '#0f0804', p: '#ff3c00', s: '#ff8c00' },
    light: { bg: '#fff0ee', p: '#c82814', s: '#dc503c' },
  },
  reactor: {
    label: 'Reactor',
    icon:  '⚡',
    dark:  { bg: '#0a0900', p: '#ffe000', s: '#ffaa00' },
    light: { bg: '#fefff0', p: '#a07800', s: '#c89600' },
  },
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme:         'submarine',
      mode:          'dark',
      glowSpeed:     'medium',
      glowIntensity: 'high',
      setTheme:         (theme)         => set({ theme }),
      setMode:          (mode)          => set({ mode }),
      setGlowSpeed:     (glowSpeed)     => set({ glowSpeed }),
      setGlowIntensity: (glowIntensity) => set({ glowIntensity }),
    }),
    { name: 'play-dashboard-theme-v1' }
  )
)
