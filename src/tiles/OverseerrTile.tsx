import { useState } from 'react'
import TileWrapper from '@/components/TileWrapper'

export default function OverseerrTile() {
  const [query, setQuery] = useState('')

  return (
    <TileWrapper id="overseerr" label="Overseerr" color="#e5a00d">
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <input
          type="text"
          placeholder="Search movies & TV shows…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled
          style={{
            flex: 1,
            background: 'var(--bg-base)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '8px 12px',
            color: 'var(--text-muted)',
            fontSize: '0.85rem',
            fontFamily: 'inherit',
            cursor: 'not-allowed',
          }}
        />
        <button className="btn-glow" disabled style={{ padding: '8px 14px' }}>Go</button>
      </div>
      <div className="not-connected">
        <span className="icon">🔍</span>
        <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Overseerr not connected</span>
        <span>Configure API key in Settings</span>
      </div>
    </TileWrapper>
  )
}
