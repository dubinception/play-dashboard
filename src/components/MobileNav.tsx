import { NavLink } from 'react-router-dom'
import useTileStore from '@/store/useTileStore'

const items = [
  { to: '/',         icon: '▦', label: 'Dashboard' },
  { to: '/settings', icon: '⚙', label: 'Settings'  },
]

export default function MobileNav() {
  const { editMode, toggleEditMode } = useTileStore()

  return (
    <nav
      className="mobile-nav"
      style={{
        position: 'fixed',
        bottom: 0, left: 0, right: 0,
        height: '64px',
        background: 'var(--bg-sidebar)',
        borderTop: '1px solid var(--border)',
        zIndex: 100,
        alignItems: 'center',
        justifyContent: 'space-around',
        padding: '0 8px',
        backdropFilter: 'blur(16px)',
      }}
    >
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          style={({ isActive }) => ({
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '3px',
            textDecoration: 'none',
            color: isActive ? 'var(--accent-1)' : 'var(--text-muted)',
            fontSize: '0.65rem',
            fontWeight: 500,
            padding: '8px 20px',
            borderRadius: '10px',
            background: isActive ? 'rgba(0,136,255,0.08)' : 'transparent',
            transition: 'all 200ms ease',
          })}
        >
          <span style={{ fontSize: '1.3rem' }}>{item.icon}</span>
          <span>{item.label}</span>
        </NavLink>
      ))}

      {/* Edit layout toggle — only relevant on mobile for reordering in the future */}
      <button
        type="button"
        onClick={toggleEditMode}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
          background: editMode ? 'rgba(0,136,255,0.12)' : 'transparent',
          border: 'none', borderRadius: '10px', padding: '8px 20px',
          color: editMode ? 'var(--accent-1)' : 'var(--text-muted)',
          fontSize: '0.65rem', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
          transition: 'all 200ms ease',
        }}
      >
        <span style={{ fontSize: '1.3rem' }}>✦</span>
        <span>{editMode ? 'Done' : 'Edit'}</span>
      </button>
    </nav>
  )
}
