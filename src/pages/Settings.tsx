import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import useConfigStore from '@/store/useConfigStore'
import type { ServiceId } from '@/store/useConfigStore'

// ── Plex OAuth (PIN-based) ─────────────────────────────────────────────────────
// Plex uses a PIN flow — no server-side secret needed, all client-side.
// docs: https://forums.plex.tv/t/authenticating-with-plex/609370

const PLEX_CLIENT_ID = 'cronus-dashboard-v1'

interface PlexServer { name: string; uri: string; local: boolean }

function PlexConnectButton({ onConnect }: { onConnect: (url: string, token: string) => void }) {
  const [phase, setPhase]     = useState<'idle' | 'waiting' | 'picking' | 'error'>('idle')
  const [servers, setServers] = useState<Array<PlexServer & { token: string }>>([])
  const [errMsg, setErrMsg]   = useState('')
  const pollRef               = useRef<ReturnType<typeof setInterval> | null>(null)

  // Clean up polling on unmount
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current) }, [])

  const headers = (token?: string): Record<string, string> => ({
    'X-Plex-Product':           'CRONUS Dashboard',
    'X-Plex-Client-Identifier': PLEX_CLIENT_ID,
    'Accept':                   'application/json',
    ...(token ? { 'X-Plex-Token': token } : {}),
  })

  const connect = async () => {
    setPhase('waiting')
    setErrMsg('')
    try {
      // 1. Request a PIN
      const pinRes = await fetch('https://plex.tv/api/v2/pins?strong=true', {
        method: 'POST', headers: headers(),
      })
      if (!pinRes.ok) throw new Error('Plex PIN request failed')
      const pin = await pinRes.json()

      // 2. Open the Plex auth window
      const authUrl =
        `https://app.plex.tv/auth#?code=${pin.code}` +
        `&context[device][name]=CRONUS+Dashboard` +
        `&context[device][product]=CRONUS+Dashboard` +
        `&context[device][identifier]=${encodeURIComponent(PLEX_CLIENT_ID)}`
      const popup = window.open(authUrl, 'plex-auth', 'width=600,height=700,left=200,top=100')

      // 3. Poll for the auth token
      const token = await new Promise<string>((resolve, reject) => {
        let elapsed = 0
        pollRef.current = setInterval(async () => {
          elapsed += 2
          if (elapsed > 300) { clearInterval(pollRef.current!); reject(new Error('Timed out after 5 minutes')) }
          if (popup?.closed) { clearInterval(pollRef.current!); reject(new Error('Auth window was closed')) }
          try {
            const r = await fetch(`https://plex.tv/api/v2/pins/${pin.id}`, { headers: headers() })
            const d = await r.json()
            if (d.authToken) { clearInterval(pollRef.current!); popup?.close(); resolve(d.authToken) }
          } catch { /* keep polling */ }
        }, 2000)
      })

      // 4. Fetch servers on this Plex account
      const resRes = await fetch(
        'https://plex.tv/api/v2/resources?includeHttps=1&includeIPv6=0&includeRelay=1',
        { headers: headers(token) }
      )
      const resources = await resRes.json()
      const plexServers: Array<PlexServer & { token: string }> = (resources as any[])
        .filter(r => r.product === 'Plex Media Server')
        .flatMap(r =>
          (r.connections as any[]).map(c => ({
            name: `${r.name}${c.local ? ' (local)' : ' (remote)'}`,
            uri:   c.uri,
            local: c.local,
            token,
          }))
        )

      if (plexServers.length === 0) throw new Error('No Plex servers found on this account')

      if (plexServers.length === 1) {
        onConnect(plexServers[0].uri, token)
        setPhase('idle')
      } else {
        setServers(plexServers)
        setPhase('picking')
      }
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : 'Connection failed')
      setPhase('error')
    }
  }

  if (phase === 'picking') {
    return (
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 6 }}>
          Multiple servers found — pick one:
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {servers.map(s => (
            <button
              key={s.uri}
              onClick={() => { onConnect(s.uri, s.token); setPhase('idle'); setServers([]) }}
              style={{
                padding: '7px 12px', borderRadius: 7, border: '1px solid rgba(229,160,13,0.4)',
                background: 'rgba(229,160,13,0.06)', color: 'var(--text-secondary)',
                fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
              }}
            >
              {s.name} <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>{s.uri}</span>
            </button>
          ))}
          <button
            onClick={() => setPhase('idle')}
            style={{
              padding: '5px 12px', borderRadius: 7, border: '1px solid var(--border)',
              background: 'transparent', color: 'var(--text-muted)',
              fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'inherit',
            }}
          >Cancel</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ marginBottom: 12 }}>
      <button
        onClick={connect}
        disabled={phase === 'waiting'}
        style={{
          padding: '8px 16px', borderRadius: 8, border: 'none',
          background: phase === 'waiting' ? 'rgba(229,160,13,0.3)' : 'linear-gradient(135deg,#e5a00d,#f0b429)',
          color: '#000', fontSize: '0.82rem', fontWeight: 700,
          cursor: phase === 'waiting' ? 'wait' : 'pointer', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', gap: 7,
        }}
      >
        <span>▶</span>
        {phase === 'waiting' ? 'Waiting for Plex approval…' : 'Connect with Plex'}
      </button>
      {phase === 'waiting' && (
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 5 }}>
          Approve the request in the popup window, then return here.
        </div>
      )}
      {phase === 'error' && (
        <div style={{ fontSize: '0.72rem', color: '#f87171', marginTop: 5 }}>
          {errMsg} — <button
            onClick={() => setPhase('idle')}
            style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit', fontSize: 'inherit', padding: 0 }}
          >try again</button>
        </div>
      )}
    </div>
  )
}

// ── Help text per service ──────────────────────────────────────────────────────

const HINTS: Partial<Record<ServiceId | 'cloudflare', { text: string; links?: { label: string; url: string }[] }>> = {
  cloudflare: {
    text: 'Required only if your local services are behind Cloudflare Access. Create a Service Token: Zero Trust → Access → Service Auth → Service Tokens → Create. Copy the Client ID and Secret immediately — the secret is only shown once.',
    links: [
      { label: 'Open Cloudflare Zero Trust', url: 'https://one.dash.cloudflare.com/' },
      { label: 'Docs: Service Tokens', url: 'https://developers.cloudflare.com/cloudflare-one/identity/service-tokens/' },
    ],
  },
  plex: {
    text: 'Use "Connect with Plex" above for automatic setup, or enter manually. The URL is your Plex Media Server address (e.g. http://192.168.1.10:32400). Your token is a 20-character string.',
    links: [
      { label: 'How to find your Plex token', url: 'https://support.plex.tv/articles/204059436-finding-an-authentication-token-x-plex-token/' },
    ],
  },
  overseerr: {
    text: 'API key is in Overseerr → Settings → General → API Key. URL is your Overseerr address (e.g. http://192.168.1.x:5055).',
  },
  sonarr: {
    text: 'API key is in Sonarr → Settings → General → Security → API Key. URL is your Sonarr address (e.g. http://192.168.1.x:8989).',
  },
  radarr: {
    text: 'API key is in Radarr → Settings → General → Security → API Key. URL is your Radarr address (e.g. http://192.168.1.x:7878).',
  },
  sabnzbd: {
    text: 'API key is in SABnzbd → ⚙️ Config → General → API Key (use the full API Key, not the NZB Key). URL is your SABnzbd address (e.g. http://192.168.1.x:8080).',
  },
  tautulli: {
    text: 'API key is in Tautulli → Settings → Web Interface → API Key (scroll to bottom). URL is your Tautulli address (e.g. http://192.168.1.x:8181).',
  },
  unraid: {
    text: 'Requires Unraid 7.2+ with API key authentication enabled. Enable it in Settings → Management Access.',
  },
  discord: {
    text: 'Bot Token: Discord Developer Portal → New Application → Bot → Reset Token. Channel IDs: right-click any channel → Copy Channel ID (enable Developer Mode first: User Settings → Advanced → Developer Mode). Invite your bot to your server with the "View Channels" and "Read Message History" permissions.',
    links: [
      { label: 'Discord Developer Portal', url: 'https://discord.com/developers/applications' },
      { label: 'How to get a Channel ID', url: 'https://support.discord.com/hc/en-us/articles/206346498-Where-can-I-find-my-User-Server-Message-ID-' },
    ],
  },
  nextcloud: {
    text: 'Enter your Nextcloud URL (e.g. https://nextcloud.example.com) and your Nextcloud account credentials. A dedicated app password is recommended: Settings → Security → App Passwords.',
    links: [
      { label: 'Nextcloud App Passwords', url: 'https://docs.nextcloud.com/server/latest/user_manual/en/session_management.html#managing-devices' },
    ],
  },
  mealie: {
    text: 'Enter your Mealie URL (e.g. http://192.168.1.x:9000). No API key is required for basic tile display.',
  },
}

function HintBox({ id }: { id: ServiceId | 'cloudflare' }) {
  const [open, setOpen] = useState(false)
  const hint = HINTS[id]
  if (!hint) return null

  return (
    <div style={{ marginBottom: 12 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background: 'none', border: 'none', padding: 0,
          color: 'var(--text-muted)', fontSize: '0.73rem',
          cursor: 'pointer', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', gap: 4,
        }}
      >
        <span style={{ fontSize: '0.6rem', transition: 'transform 0.15s', display: 'inline-block', transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
        How to find these credentials
      </button>
      {open && (
        <div style={{
          marginTop: 8, padding: '10px 12px', borderRadius: 8,
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
          fontSize: '0.76rem', color: 'var(--text-muted)', lineHeight: 1.6,
        }}>
          <p style={{ margin: '0 0 6px 0' }}>{hint.text}</p>
          {hint.links && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px', marginTop: 4 }}>
              {hint.links.map(l => (
                <a
                  key={l.url}
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#60a5fa', fontSize: '0.72rem', textDecoration: 'none' }}
                >
                  ↗ {l.label}
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Service definitions ────────────────────────────────────────────────────────

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

function fieldKey(label: string): string {
  const map: Record<string, string> = {
    'URL':               'url',
    'Token':             'token',
    'API Key':           'apiKey',
    'Username':          'username',
    'Password':          'password',
    'Bot Token':         'botToken',
    'Info Channel ID':   'infoChannelId',
    'Alerts Channel ID': 'alertsChannelId',
  }
  return map[label] ?? label.toLowerCase().replace(/\s+/g, '')
}

function isSecret(label: string) {
  const l = label.toLowerCase()
  return l.includes('key') || l.includes('token') || l.includes('password') || l.includes('secret')
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

// ── Settings page ──────────────────────────────────────────────────────────────

export default function Settings() {
  const {
    getService, setField, isConfigured,
    cloudflare, setCloudflareField,
    loadFromKV, saveToKV, syncStatus, syncError, lastSynced,
  } = useConfigStore()

  const syncLabel = { idle: 'Cloud Sync', loading: 'Loading…', saving: 'Saving…', success: 'Synced', error: 'Error' }[syncStatus]
  const syncColor = syncStatus === 'success' ? 'var(--accent-2)' : syncStatus === 'error' ? '#f87171' : 'var(--text-muted)'

  const cardStyle: React.CSSProperties = {
    background: 'var(--bg-card)',
    borderRadius: '12px',
    padding: '16px 20px',
    transition: 'border-color 300ms ease',
  }

  return (
    <div style={{ padding: '24px', maxWidth: '800px' }}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '1.5rem', fontWeight: 700, marginBottom: '6px' }}>
          Settings
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '28px' }}>
          Configure your service connections. Use "How to find these credentials" under each service for setup help.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

          {/* ── Cloud Sync ── */}
          <div style={{ ...cardStyle, border: `1px solid ${syncStatus === 'error' ? 'rgba(248,113,113,0.3)' : syncStatus === 'success' ? 'rgba(0,229,160,0.25)' : 'var(--border)'}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <span style={{ fontSize: '1.1rem' }}>☁️</span>
              <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Cloud Sync</span>
              <span style={{
                marginLeft: 'auto', fontSize: '0.7rem', padding: '2px 10px', borderRadius: '10px',
                border: `1px solid ${syncStatus === 'error' ? 'rgba(248,113,113,0.4)' : syncStatus === 'success' ? 'rgba(0,229,160,0.4)' : 'var(--border)'}`,
                color: syncColor,
                background: syncStatus === 'success' ? 'rgba(0,229,160,0.08)' : syncStatus === 'error' ? 'rgba(248,113,113,0.08)' : 'transparent',
                transition: 'all 300ms ease',
              }}>{syncLabel}</span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
              Sync your config to Cloudflare KV so it loads on any browser.
              {lastSynced && <span> Last synced: {new Date(lastSynced).toLocaleTimeString()}.</span>}
            </p>
            {syncError && <p style={{ fontSize: '0.75rem', color: '#f87171', marginBottom: '10px' }}>{syncError}</p>}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => loadFromKV()} disabled={syncStatus === 'loading' || syncStatus === 'saving'}
                style={{ padding: '7px 16px', borderRadius: '8px', fontSize: '0.8rem', fontFamily: 'inherit', border: '1px solid var(--border)', background: 'var(--bg-base)', color: 'var(--text-primary)', cursor: 'pointer', opacity: (syncStatus === 'loading' || syncStatus === 'saving') ? 0.5 : 1 }}>
                Load from Cloud
              </button>
              <button onClick={() => saveToKV()} disabled={syncStatus === 'loading' || syncStatus === 'saving'}
                style={{ padding: '7px 16px', borderRadius: '8px', fontSize: '0.8rem', fontFamily: 'inherit', border: '1px solid rgba(0,229,160,0.4)', background: 'rgba(0,229,160,0.08)', color: 'var(--accent-2)', cursor: 'pointer', opacity: (syncStatus === 'loading' || syncStatus === 'saving') ? 0.5 : 1 }}>
                Save to Cloud
              </button>
            </div>
          </div>

          {/* ── Cloudflare Access ── */}
          <div style={{ ...cardStyle, border: `1px solid ${cloudflare.cfClientId ? 'rgba(0,229,160,0.25)' : 'var(--border)'}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span style={{ fontSize: '1.1rem' }}>🔐</span>
              <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Cloudflare Access</span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: '4px' }}>optional</span>
              <span style={{
                marginLeft: 'auto', fontSize: '0.7rem', padding: '2px 10px', borderRadius: '10px',
                border: `1px solid ${cloudflare.cfClientId ? 'rgba(0,229,160,0.4)' : 'var(--border)'}`,
                color: cloudflare.cfClientId ? 'var(--accent-2)' : 'var(--text-muted)',
                background: cloudflare.cfClientId ? 'rgba(0,229,160,0.08)' : 'transparent',
              }}>{cloudflare.cfClientId ? 'Configured' : 'Not configured'}</span>
            </div>
            <HintBox id="cloudflare" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {CF_FIELDS.map(({ key, label }) => (
                <div key={key} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <label style={{ width: '90px', fontSize: '0.78rem', color: 'var(--text-muted)', flexShrink: 0 }}>{label}</label>
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

          {/* ── Service cards ── */}
          {services.map((svc) => {
            const config     = getService(svc.id)
            const configured = isConfigured(svc.id)
            return (
              <div key={svc.id} style={{ ...cardStyle, border: `1px solid ${configured ? 'rgba(0,229,160,0.25)' : 'var(--border)'}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '1.1rem' }}>{svc.icon}</span>
                  <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{svc.label}</span>
                  <span style={{
                    marginLeft: 'auto', fontSize: '0.7rem', padding: '2px 10px', borderRadius: '10px',
                    border: `1px solid ${configured ? 'rgba(0,229,160,0.4)' : 'var(--border)'}`,
                    color: configured ? 'var(--accent-2)' : 'var(--text-muted)',
                    background: configured ? 'rgba(0,229,160,0.08)' : 'transparent',
                  }}>{configured ? 'Configured' : 'Not configured'}</span>
                </div>

                {/* Plex: show OAuth button before manual fields */}
                {svc.id === 'plex' && (
                  <PlexConnectButton
                    onConnect={(url, token) => {
                      setField('plex', 'url',   url)
                      setField('plex', 'token', token)
                    }}
                  />
                )}

                <HintBox id={svc.id} />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {svc.fields.map((field) => {
                    const key = fieldKey(field)
                    return (
                      <div key={field} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <label style={{ width: '90px', fontSize: '0.78rem', color: 'var(--text-muted)', flexShrink: 0 }}>{field}</label>
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
          Settings are saved locally in your browser. Use Cloud Sync to share across browsers.
        </p>
      </motion.div>
    </div>
  )
}
