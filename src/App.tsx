import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { motion } from 'framer-motion'
import Sidebar from '@/components/Sidebar'
import MobileNav from '@/components/MobileNav'
import Dashboard from '@/pages/Dashboard'
import Settings from '@/pages/Settings'
import useTileStore from '@/store/useTileStore'

export default function App() {
  const { editMode, sidebarCollapsed } = useTileStore()
  const sidebarWidth = sidebarCollapsed ? 60 : 220

  return (
    <BrowserRouter>
      {/* Background layers */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', background: 'var(--bg-base)' }} />
      <div className="glow-ambient" />
      <div className="glow-bottom" />
      <div className="glow-teal" />
      <div className="glow-topleft" />
      <div className="dot-grid" />

      <Sidebar />
      <MobileNav />

      <motion.main
        className="main-content"
        animate={{ marginLeft: sidebarWidth }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        style={{ position: 'relative', zIndex: 1, minHeight: '100vh' }}
      >
        {editMode && (
          <div style={{
            position: 'sticky', top: 0, zIndex: 40,
            background: 'rgba(0,136,255,0.05)', backdropFilter: 'blur(8px)',
            borderBottom: '1px solid rgba(0,136,255,0.15)',
            padding: '6px 16px', display: 'flex', alignItems: 'center', gap: '8px',
          }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--accent-1)', fontWeight: 500 }}>
              ✦ Edit mode — drag tiles to rearrange, grab the corner to resize. Click "Done Editing" in the sidebar when finished.
            </span>
          </div>
        )}
        <Routes>
          <Route path="/"         element={<Dashboard />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </motion.main>
    </BrowserRouter>
  )
}
