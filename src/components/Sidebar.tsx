import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import useTileStore, { TILE_REGISTRY } from '@/store/useTileStore'
import AppIcon from '@/components/AppIcon'
import type { AppIconId } from '@/components/AppIcon'
import cronusLogo from '@/assets/cronus-logo.png'

const pages = [
  { to: '/',         label: 'Dashboard', icon: '▦' },
  { to: '/settings', label: 'Settings',  icon: '⚙' },
]
const presetNames = ['Media Focus', 'Admin Mode']

export default function Sidebar() {
  const {
    tiles, toggleTile, toggleEditMode, editMode,
    applyPreset, activePreset, sidebarCollapsed, toggleSidebar,
  } = useTileStore()

  const w = sidebarCollapsed ? 60 : 220

  return (
    <motion.aside
      className="sidebar"
      animate={{ width: w }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      style={{
        position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 50,
        background: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Logo row */}
      {sidebarCollapsed ? (
        <div style={{
          padding: '12px 0', borderBottom: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', flexShrink: 0,
        }}>
          <img src={cronusLogo} alt="Cronus" style={{ width: 32, height: 32, borderRadius: '6px' }} />
          <button type="button" onClick={toggleSidebar} style={{
            background: 'transparent', border: 'none',
            color: 'var(--text-muted)', cursor: 'pointer',
            fontSize: '1.1rem', padding: '2px 4px', lineHeight: 1,
          }}>›</button>
        </div>
      ) : (
        <div style={{
          padding: '16px 12px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0,
        }}>
          <img src={cronusLogo} alt="Cronus" style={{ width: 32, height: 32, borderRadius: '6px', flexShrink: 0 }} />
          <span className="gradient-text" style={{
            fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700,
            fontSize: '1.1rem', whiteSpace: 'nowrap', flex: 1,
          }}>
            CRONUS
          </span>
          <button type="button" onClick={toggleSidebar} style={{
            background: 'transparent', border: 'none',
            color: 'var(--text-muted)', cursor: 'pointer',
            fontSize: '1.1rem', padding: '2px 4px', flexShrink: 0, lineHeight: 1,
          }}>‹</button>
        </div>
      )}

      {/* Nav links */}
      <div style={{ padding: '10px 8px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        {pages.map((p) => (
          <NavLink key={p.to} to={p.to} end={p.to === '/'}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '8px 10px', borderRadius: '8px', textDecoration: 'none',
              fontSize: '0.875rem', fontWeight: 500, marginBottom: '2px',
              color: isActive ? 'var(--accent-1)' : 'var(--text-secondary)',
              background: isActive ? 'rgba(0,136,255,0.08)' : 'transparent',
              border: isActive ? '1px solid rgba(0,136,255,0.2)' : '1px solid transparent',
              transition: 'all 200ms ease', whiteSpace: 'nowrap', overflow: 'hidden',
            })}
          >
            <span style={{ fontSize: '1rem', flexShrink: 0 }}>{p.icon}</span>
            {!sidebarCollapsed && <span>{p.label}</span>}
          </NavLink>
        ))}
      </div>

      {/* Only show below sections when expanded */}
      {!sidebarCollapsed && (
        <>
          {/* Layout controls */}
          <div style={{ padding: '12px 8px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <p style={{ fontSize: '0.63rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', padding: '0 6px', marginBottom: '8px' }}>
              Layout
            </p>
            <button onClick={toggleEditMode} style={{
              width: '100%', padding: '7px 10px', borderRadius: '8px',
              border: `1px solid ${editMode ? 'var(--accent-1)' : 'var(--border)'}`,
              background: editMode ? 'rgba(0,136,255,0.1)' : 'transparent',
              color: editMode ? 'var(--accent-1)' : 'var(--text-secondary)',
              fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
              textAlign: 'left', marginBottom: '8px', fontFamily: 'inherit',
            }}>
              {editMode ? '✓ Done Editing' : '✦ Edit Layout'}
            </button>
            {presetNames.map((name) => (
              <button key={name} onClick={() => applyPreset(name)} style={{
                width: '100%', padding: '6px 10px', borderRadius: '8px',
                border: `1px solid ${activePreset === name ? 'rgba(0,136,255,0.3)' : 'transparent'}`,
                background: activePreset === name ? 'rgba(0,136,255,0.06)' : 'transparent',
                color: activePreset === name ? 'var(--accent-2)' : 'var(--text-muted)',
                fontSize: '0.78rem', cursor: 'pointer', textAlign: 'left',
                marginBottom: '2px', fontFamily: 'inherit',
              }}>
                {activePreset === name ? '◉ ' : '○ '}{name}
              </button>
            ))}
          </div>

          {/* Tile visibility */}
          <div style={{ padding: '12px 8px', flex: 1, overflowY: 'auto' }}>
            <p style={{ fontSize: '0.63rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', padding: '0 6px', marginBottom: '8px' }}>
              Tiles
            </p>
            {TILE_REGISTRY.map((t) => {
              const current = tiles.find((x) => x.id === t.id)
              const isVisible = current?.visible ?? false
              return (
                <button key={t.id} onClick={() => toggleTile(t.id)} style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '6px 10px', borderRadius: '8px', border: 'none',
                  background: 'transparent',
                  color: isVisible ? 'var(--text-secondary)' : 'var(--text-muted)',
                  fontSize: '0.8rem', cursor: 'pointer', textAlign: 'left',
                  marginBottom: '1px', fontFamily: 'inherit',
                  opacity: isVisible ? 1 : 0.45, transition: 'all 200ms ease',
                }}>
                  <AppIcon id={t.id as AppIconId} size={14} color={isVisible ? t.color : 'var(--text-muted)'} />
                  <span style={{ flex: 1 }}>{t.label}</span>
                  <span style={{
                    width: '14px', height: '14px', borderRadius: '3px', flexShrink: 0,
                    border: `1px solid ${isVisible ? t.color : 'var(--text-muted)'}`,
                    background: isVisible ? t.color : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.6rem', color: '#fff',
                  }}>
                    {isVisible ? '✓' : ''}
                  </span>
                </button>
              )
            })}
          </div>
        </>
      )}
    </motion.aside>
  )
}
