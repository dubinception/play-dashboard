import type { ReactNode } from 'react'
import AppIcon from '@/components/AppIcon'
import type { AppIconId } from '@/components/AppIcon'
import useConfigStore from '@/store/useConfigStore'
import useTileStore from '@/store/useTileStore'

interface Props {
  id: AppIconId
  label: string
  color: string
  status?: 'up' | 'down' | 'warn' | 'idle'
  actions?: ReactNode
  children: ReactNode
}

export default function TileWrapper({ id, label, color, status = 'idle', actions, children }: Props) {
  const editMode  = useTileStore((s) => s.editMode)
  const serviceUrl = useConfigStore((s) => (s.services as any)[id]?.url?.trim() || '')
  const canLink   = !!serviceUrl && !editMode

  return (
    <div className="tile">
      <div className="tile-header">
        <AppIcon id={id} size={16} color={color} />
        {canLink ? (
          <a
            href={serviceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="tile-title"
            style={{
              color,
              textDecoration: 'none',
              cursor: 'pointer',
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.75')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >{label} ↗</a>
        ) : (
          <span className="tile-title" style={{ color }}>{label}</span>
        )}
        {actions}
        <span className={`status-dot ${status}`} style={{ marginLeft: actions ? '0' : 'auto' }} />
      </div>
      <div className="tile-body">{children}</div>
    </div>
  )
}
