import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ServiceId =
  | 'plex' | 'overseerr' | 'sonarr' | 'radarr'
  | 'sabnzbd' | 'tautulli' | 'unraid' | 'discord'
  | 'nextcloud' | 'mealie'

type ServiceFields = Record<string, string>

export interface CloudflareConfig {
  cfClientId: string
  cfClientSecret: string
}

export type SyncStatus = 'idle' | 'loading' | 'saving' | 'success' | 'error'

interface ConfigStore {
  services: Record<ServiceId, ServiceFields>
  cloudflare: CloudflareConfig
  syncStatus: SyncStatus
  syncError: string | null
  lastSynced: number | null
  setField: (service: ServiceId, field: string, value: string) => void
  setCloudflareField: (field: keyof CloudflareConfig, value: string) => void
  getService: (service: ServiceId) => ServiceFields
  isConfigured: (service: ServiceId) => boolean
  loadFromKV: () => Promise<void>
  saveToKV: () => Promise<void>
}

const DEFAULT_SERVICES: Record<ServiceId, ServiceFields> = {
  plex:      { url: '', token: '' },
  overseerr: { url: '', apiKey: '' },
  sonarr:    { url: '', apiKey: '' },
  radarr:    { url: '', apiKey: '' },
  sabnzbd:   { url: '', apiKey: '' },
  tautulli:  { url: '', apiKey: '' },
  unraid:    { url: '', apiKey: '' },
  discord:   { botToken: '', infoChannelId: '', alertsChannelId: '' },
  nextcloud: { url: '', username: '', password: '' },
  mealie:    { url: '' },
}

const useConfigStore = create<ConfigStore>()(
  persist(
    (set, get) => ({
      services: DEFAULT_SERVICES,
      cloudflare: { cfClientId: '', cfClientSecret: '' },
      syncStatus: 'idle' as SyncStatus,
      syncError: null,
      lastSynced: null,

      setField: (service, field, value) =>
        set((s) => ({
          services: {
            ...s.services,
            [service]: { ...s.services[service], [field]: value },
          },
        })),

      setCloudflareField: (field, value) =>
        set((s) => ({
          cloudflare: { ...s.cloudflare, [field]: value },
        })),

      getService: (service) => get().services[service] ?? {},

      isConfigured: (service) => {
        const svc = get().services[service] ?? {}
        return Object.values(svc).some((v) => v.trim() !== '')
      },

      loadFromKV: async () => {
        set({ syncStatus: 'loading', syncError: null })
        try {
          const res = await fetch('/api/config')
          if (!res.ok) throw new Error(`Server returned ${res.status}`)
          const data = await res.json()
          if (data && typeof data === 'object') {
            set({
              services: { ...DEFAULT_SERVICES, ...data.services },
              cloudflare: { ...{ cfClientId: '', cfClientSecret: '' }, ...data.cloudflare },
              syncStatus: 'success',
              lastSynced: Date.now(),
            })
          } else {
            // KV is empty — nothing to load
            set({ syncStatus: 'success', lastSynced: Date.now() })
          }
        } catch (e) {
          set({ syncStatus: 'error', syncError: String(e) })
        }
      },

      saveToKV: async () => {
        set({ syncStatus: 'saving', syncError: null })
        try {
          const { services, cloudflare } = get()
          const res = await fetch('/api/config', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ services, cloudflare }),
          })
          if (!res.ok) throw new Error(`Server returned ${res.status}`)
          set({ syncStatus: 'success', lastSynced: Date.now() })
        } catch (e) {
          set({ syncStatus: 'error', syncError: String(e) })
        }
      },
    }),
    { name: 'play-dashboard-config-v1' }
  )
)

export default useConfigStore
