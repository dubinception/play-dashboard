import { motion } from 'framer-motion'
import useConfigStore from '@/store/useConfigStore'
import type { ServiceId } from '@/store/useConfigStore'

const CF_FIELDS: { key: 'cfClientId' | 'cfClientSecret'; label: string }[] = [
  { key: 'cfClientId',     label: 'Client ID' },
  { key: 'cfClientSecret', label: 'Client Secret' },
]

const services: { id: ServiceId; label: string; icon: string; fields: string[] }[] = [
  { id: 'plex',      label: 'Plex',      icon: '▶️', fields: ['URL', 'Token'] },
  { id: 'overseerr', label: 'Overseerr', icon: '🔍', fields: ['URL', 'API Key'] },
  { id: 'sonarr',    label: 'Sonarr',    icon: '📺', fields: ['URL', 'API Key'] },
  { id: 'radarr',    label: 'Radarr',    icon: '🎥', fields: ['URL', 'API Key'] },
  { id: 'sabnzbd',   label: 'SABnzbd',   icon: '⬇️', fields: ['URL', 'API Key'] },
  { id: 'tautulli',  label: 'Tautulli',  icon: '📊', fields: ['URL', 'API Key'] },
  { id: 'unraid',    label: 'Unraid',    icon: '🖥️', fields: ['URL', 'API Key'] },
  { id: 'discord',   label: 'Discord',   icon: '💬', fields: ['Bot Token', 'Info Channel ID', 'Alerts Channel ID'] },
  { id: 'nextcloud', label: 'Nextcloud', icon: '☁️', fields: ['URL', 'Username', 'Password'] },
  { id: 'mealie',    label: 'Mealie',    icon: '🍽️', fields: ['URL'] },
]

// Map human-readable field labels to store keys
function fieldKey(label: string): string {
  const map: Record<string, string> = {
    'URL':         'url',
    'Token':       'token',
    'API Key':     'apiKey',
    'Username':    'username',
    'Password':    'password',
    'Bot Token':   'botToken',
    'Info Channel ID':   'infoChannelId',
    'Alerts Channel ID': 'alertsChannelId',
  }
  return map[label] ?? label.toLowerCase().replace(/\s+/g, '')
}

function isSecret(label: string) {
  const l = label.toLowerCase()
  return l.includes('key') || l.includes('token') || l.includes('password')
}

const inputStyle: React.CSSProperties = {
  flex: 1,
  background: 'var(--bg-base)',
  border: '1px solid var(--border)',
  borderRadius: '7px',
  padding: '8px 12px',
  color: 'var(--text-primary)',
  fontSize: '0.85rem',
  fontFamily: 'inherit',
  outline: 'none',
}

export default function Settings() {
  const { getService, setField, isConfigured, cloudflare, setCloudflareField } = useConfigStore()

  return (
    <div style={{ padding: '24px', maxWidth: '800px' }}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '1.5rem', fontWeight: 700, marginBottom: '6px' }}>
          Settings
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '28px' }}>
          Configure your service connections. Keys are saved locally in your browser.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

          {/* Cloudflare Access */}
          <div style={{
            background: 'var(--bg-card)',
            border: `1px solid ${cloudflare.cfClientId ? 'rgba(0,229,160,0.25)' : 'var(--border)'}`,
            borderRadius: '12px',
            padding: '16px 20px',
            transition: 'border-color 300ms ease',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <span style={{ fontSize: '1.1rem' }}>🔐</span>
              <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Cloudflare Access</span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: '4px' }}>optional</span>
              <span style={{
                marginLeft: 'auto', fontSize: '0.7rem', padding: '2px 10px',
                borderRadius: '10px',
                border: `1px solid ${cloudflare.cfClientId ? 'rgba(0,229,160,0.4)' : 'var(--border)'}`,
                color: cloudflare.cfClientId ? 'var(--accent-2)' : 'var(--text-muted)',
                background: cloudflare.cfClientId ? 'rgba(0,229,160,0.08)' : 'transparent',
                transition: 'all 300ms ease',
              }}>
                {cloudflare.cfClientId ? 'Configured' : 'Not configured'}
              </span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
              Required if your services are behind Cloudflare Access. Create a Service Token in Zero Trust → Access → Service Auth.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {CF_FIELDS.map(({ key, label }) => (
                <div key={key} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <label style={{ width: '90px', fontSize: '0.78rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                    {label}
                  </label>
                  <input
                    type="password"
                    placeholder={`Enter ${label}…`}
                    value={cloudflare[key]}
                    onChange={(e) => setCloudflareField(key, e.target.value)}
                    style={inputStyle}
                  />
                </div>
              ))}
            </div>
          </div>

          {services.map((svc) => {
            const config = getService(svc.id)
            const configured = isConfigured(svc.id)
            return (
              <div key={svc.id} style={{
                background: 'var(--bg-card)',
                border: `1px solid ${configured ? 'rgba(0,229,160,0.25)' : 'var(--border)'}`,
                borderRadius: '12px',
                padding: '16px 20px',
                transition: 'border-color 300ms ease',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                  <span style={{ fontSize: '1.1rem' }}>{svc.icon}</span>
                  <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{svc.label}</span>
                  <span style={{
                    marginLeft: 'auto', fontSize: '0.7rem', padding: '2px 10px',
                    borderRadius: '10px',
                    border: `1px solid ${configured ? 'rgba(0,229,160,0.4)' : 'var(--border)'}`,
                    color: configured ? 'var(--accent-2)' : 'var(--text-muted)',
                    background: configured ? 'rgba(0,229,160,0.08)' : 'transparent',
                    transition: 'all 300ms ease',
                  }}>
                    {configured ? 'Configured' : 'Not configured'}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {svc.fields.map((field) => {
                    const key = fieldKey(field)
                    return (
                      <div key={field} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <label style={{ width: '90px', fontSize: '0.78rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                          {field}
                        </label>
                        <input
                          type={isSecret(field) ? 'password' : 'text'}
                          placeholder={`Enter ${svc.label} ${field}…`}
                          value={config[key] ?? ''}
                          onChange={(e) => setField(svc.id, key, e.target.value)}
                          style={inputStyle}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        <p style={{ marginTop: '20px', fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center' }}>
          Settings are auto-saved to your browser. Cloudflare KV sync coming in a later phase.
        </p>
      </motion.div>
    </div>
  )
}
