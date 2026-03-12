import { motion } from 'framer-motion'

const services = [
  { id: 'plex',       label: 'Plex',       icon: '▶️', fields: ['URL', 'Token'] },
  { id: 'overseerr',  label: 'Overseerr',  icon: '🔍', fields: ['URL', 'API Key'] },
  { id: 'sonarr',     label: 'Sonarr',     icon: '📺', fields: ['URL', 'API Key'] },
  { id: 'radarr',     label: 'Radarr',     icon: '🎥', fields: ['URL', 'API Key'] },
  { id: 'sabnzbd',    label: 'SABnzbd',    icon: '⬇️', fields: ['URL', 'API Key'] },
  { id: 'tautulli',   label: 'Tautulli',   icon: '📊', fields: ['URL', 'API Key'] },
  { id: 'unraid',     label: 'Unraid',     icon: '🖥️', fields: ['URL', 'API Key'] },
  { id: 'discord',    label: 'Discord',    icon: '💬', fields: ['Webhook URL'] },
  { id: 'nextcloud',  label: 'Nextcloud',  icon: '☁️', fields: ['URL', 'Username', 'Password'] },
  { id: 'mealie',     label: 'Mealie',     icon: '🍽️', fields: ['URL'] },
]

function inputStyle(disabled = false) {
  return {
    flex: 1,
    background: 'var(--bg-base)',
    border: '1px solid var(--border)',
    borderRadius: '7px',
    padding: '8px 12px',
    color: disabled ? 'var(--text-muted)' : 'var(--text-primary)',
    fontSize: '0.85rem',
    fontFamily: 'inherit',
    cursor: disabled ? 'not-allowed' : 'text',
    outline: 'none',
  } as React.CSSProperties
}

export default function Settings() {
  return (
    <div style={{ padding: '24px', maxWidth: '800px' }}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '1.5rem', fontWeight: 700, marginBottom: '6px' }}>
          Settings
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '28px' }}>
          Configure your service connections. Keys are stored as Cloudflare secrets and never exposed to the browser.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {services.map((svc) => (
            <div key={svc.id} style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '16px 20px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <span style={{ fontSize: '1.1rem' }}>{svc.icon}</span>
                <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{svc.label}</span>
                <span style={{
                  marginLeft: 'auto', fontSize: '0.7rem', padding: '2px 10px',
                  borderRadius: '10px', border: '1px solid var(--border)',
                  color: 'var(--text-muted)',
                }}>
                  Not configured
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {svc.fields.map((field) => (
                  <div key={field} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <label style={{ width: '90px', fontSize: '0.78rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                      {field}
                    </label>
                    <input
                      type={field.toLowerCase().includes('key') || field.toLowerCase().includes('token') || field.toLowerCase().includes('password') ? 'password' : 'text'}
                      placeholder={`Enter ${svc.label} ${field}…`}
                      disabled
                      style={inputStyle(true)}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <p style={{ marginTop: '20px', fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center' }}>
          Settings persistence coming in Phase 2 — will save to Cloudflare KV via Pages Functions
        </p>
      </motion.div>
    </div>
  )
}
