import type { ReactNode } from 'react'
import AppIcon from '@/components/AppIcon'
import type { AppIconId } from '@/components/AppIcon'

interface Props {
  id: AppIconId
  label: string
  color: string
  status?: 'up' | 'down' | 'warn' | 'idle'
  actions?: ReactNode
  children: ReactNode
}

export default function TileWrapper({ id, label, color, status = 'idle', actions, children }: Props) {
  return (
    <div className="tile">
      <div className="tile-header">
        <AppIcon id={id} size={16} color={color} />
        <span className="tile-title" style={{ color }}>{label}</span>
        {actions}
        <span className={`status-dot ${status}`} style={{ marginLeft: actions ? '0' : 'auto' }} />
      </div>
      <div className="tile-body">{children}</div>
    </div>
  )
}
