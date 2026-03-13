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

interface ConfigStore {
  services: Record<ServiceId, ServiceFields>
  cloudflare: CloudflareConfig
  setField: (service: ServiceId, field: string, value: string) => void
  setCloudflareField: (field: keyof CloudflareConfig, value: string) => void
  getService: (service: ServiceId) => ServiceFields
  isConfigured: (service: ServiceId) => boolean
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
    }),
    { name: 'play-dashboard-config-v1' }
  )
)

export default useConfigStore
