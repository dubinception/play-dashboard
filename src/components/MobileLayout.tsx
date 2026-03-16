import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import useTileStore, { TILE_REGISTRY } from '@/store/useTileStore'
import useConfigStore from '@/store/useConfigStore'
import AppIcon from '@/components/AppIcon'
import type { AppIconId } from '@/components/AppIcon'
import Settings from '@/pages/Settings'
import cronusLogo from '@/assets/cronus-logo.png'

interface Props {
  tileMap: Record<string, React.ComponentType>
}

const HEADER_H = 52

export default function MobileLayout({ tileMap }: Props) {
  const { tiles } = useTileStore()
  const { isConfigured } = useConfigStore()
  const navigate  = useNavigate()
  const location  = useLocation()

  const visibleTiles = TILE_REGISTRY.filter(t => tiles.find(x => x.id === t.id)?.visible)

  const [activeTileId, setActiveTileId] = useState<string>(visibleTiles[0]?.id ?? '')
  const [drawerOpen, setDrawerOpen]     = useState(false)

  const isSettings = location.pathname === '/settings'

  // Lock body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [drawerOpen])

  const activeTileConfig = TILE_REGISTRY.find(t => t.id === activeTileId)
  const TileComponent    = tileMap[activeTileId]

  const selectTile = (id: string) => {
    setActiveTileId(id)
    setDrawerOpen(false)
    if (isSettings) navigate('/')
  }

  const goSettings = () => {
    setDrawerOpen(false)
    navigate('/settings')
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      display: 'flex', flexDirection: 'column',
      background: 'var(--bg-base)',
    }}>

      {/* ── Header ─────────────────────────────────────────── */}
      <div style={{
        height: HEADER_H, flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px',
        background: 'var(--bg-sidebar)', borderBottom: '1px solid var(--border)',
        zIndex: 20,
      }}>

        {/* Hamburger — animates to X when open */}
        <button
          onClick={() => setDrawerOpen(v => !v)}
          aria-label="Menu"
          style={{
            width: 36, height: 36, borderRadius: 8, border: 'none', padding: 0, flexShrink: 0,
            background: drawerOpen ? 'rgba(var(--p-rgb),0.12)' : 'transparent',
            color: 'var(--text-secondary)', cursor: 'pointer',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 5,
          }}
        >
          <span style={{
            width: 18, height: 2, background: 'currentColor', borderRadius: 2, display: 'block',
            transition: 'transform 0.22s ease, opacity 0.22s ease',
            transform: drawerOpen ? 'translateY(7px) rotate(45deg)' : 'none',
          }} />
          <span style={{
            width: 18, height: 2, background: 'currentColor', borderRadius: 2, display: 'block',
            transition: 'opacity 0.22s ease',
            opacity: drawerOpen ? 0 : 1,
          }} />
          <span style={{
            width: 18, height: 2, background: 'currentColor', borderRadius: 2, display: 'block',
            transition: 'transform 0.22s ease, opacity 0.22s ease',
            transform: drawerOpen ? 'translateY(-7px) rotate(-45deg)' : 'none',
          }} />
        </button>

        {/* Current page title */}
        {isSettings ? (
          <span style={{ flex: 1, fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Settings
          </span>
        ) : activeTileConfig ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <AppIcon id={activeTileConfig.id as AppIconId} size={18} color={activeTileConfig.color} />
            <span style={{
              fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{activeTileConfig.label}</span>
          </div>
        ) : <span style={{ flex: 1 }} />}

        {/* Logo */}
        <img src={cronusLogo} alt="" style={{ width: 28, height: 28, borderRadius: 6, opacity: 0.75, flexShrink: 0 }} />
      </div>

      {/* ── Content area ────────────────────────────────────── */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden' }}>
        {isSettings ? (
          <div style={{ height: '100%', overflowY: 'auto', padding: '12px 12px 40px' }}>
            <Settings />
          </div>
        ) : TileComponent ? (
          <div style={{ height: '100%', padding: 10 }}>
            <TileComponent />
          </div>
        ) : (
          <div style={{
            height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-muted)', fontSize: '0.9rem',
          }}>
            No tile selected
          </div>
        )}
      </div>

      {/* ── Backdrop ────────────────────────────────────────── */}
      <div
        onClick={() => setDrawerOpen(false)}
        style={{
          position: 'fixed', inset: 0, zIndex: 40,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)',
          opacity: drawerOpen ? 1 : 0,
          pointerEvents: drawerOpen ? 'auto' : 'none',
          transition: 'opacity 0.25s ease',
        }}
      />

      {/* ── Drawer ──────────────────────────────────────────── */}
      <div style={{
        position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 50,
        width: 272,
        background: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        transform: drawerOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
        boxShadow: drawerOpen ? '6px 0 40px rgba(0,0,0,0.5)' : 'none',
      }}>

        {/* Drawer header */}
        <div style={{
          height: HEADER_H, flexShrink: 0,
          display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px',
          borderBottom: '1px solid var(--border)',
        }}>
          <img src={cronusLogo} alt="Cronus" style={{ width: 30, height: 30, borderRadius: 6 }} />
          <span className="gradient-text" style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700, fontSize: '1.05rem', letterSpacing: '0.04em',
          }}>CRONUS</span>
        </div>

        {/* Tile list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 8px' }}>
          <p style={{
            fontSize: '0.6rem', fontWeight: 600, textTransform: 'uppercase',
            letterSpacing: '0.12em', color: 'var(--text-muted)',
            padding: '4px 10px 8px', margin: 0,
          }}>Services</p>

          {visibleTiles.map(t => {
            const active     = activeTileId === t.id && !isSettings
            const configured = isConfigured(t.id as any)
            return (
              <button key={t.id} onClick={() => selectTile(t.id)} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                padding: '11px 10px 11px 13px', borderRadius: 10, border: 'none',
                borderLeft: active ? `3px solid ${t.color}` : '3px solid transparent',
                background: active ? `${t.color}14` : 'transparent',
                color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontSize: '0.88rem', fontWeight: active ? 600 : 400,
                cursor: 'pointer', textAlign: 'left', marginBottom: 2,
                fontFamily: 'inherit', transition: 'background 0.15s, color 0.15s',
              }}>
                <AppIcon
                  id={t.id as AppIconId}
                  size={20}
                  color={active ? t.color : (configured ? t.color + 'bb' : 'var(--text-muted)')}
                />
                <span style={{ flex: 1 }}>{t.label}</span>
                <span style={{
                  width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                  background: configured ? '#00e5a0' : 'rgba(255,255,255,0.12)',
                  boxShadow: configured ? '0 0 5px #00e5a0' : 'none',
                }} />
              </button>
            )
          })}
        </div>

        {/* Settings footer */}
        <div style={{ padding: '8px 8px 32px', borderTop: '1px solid var(--border)' }}>
          <button onClick={goSettings} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 12,
            padding: '11px 10px 11px 13px', borderRadius: 10, border: 'none',
            borderLeft: isSettings ? '3px solid var(--accent-1)' : '3px solid transparent',
            background: isSettings ? 'rgba(var(--p-rgb),0.1)' : 'transparent',
            color: isSettings ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontSize: '0.88rem', fontWeight: isSettings ? 600 : 400,
            cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
            transition: 'background 0.15s, color 0.15s',
          }}>
            <span style={{ fontSize: '1.1rem', width: 20, textAlign: 'center', lineHeight: 1 }}>⚙</span>
            <span style={{ flex: 1 }}>Settings</span>
          </button>
        </div>
      </div>
    </div>
  )
}
