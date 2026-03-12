import {
  SiPlex, SiDiscord, SiNextcloud, SiSonarr, SiRadarr,
} from 'react-icons/si'
import {
  MdDownload, MdBarChart, MdStorage, MdRestaurant, MdSearch,
} from 'react-icons/md'
import { TbActivityHeartbeat } from 'react-icons/tb'
import { RiRobotFill } from 'react-icons/ri'

export type AppIconId = 'plex' | 'overseerr' | 'sonarr' | 'radarr' | 'sabnzbd'
  | 'tautulli' | 'unraid' | 'discord' | 'uptime' | 'nextcloud' | 'mealie' | 'robot'

interface Props {
  id: AppIconId
  size?: number
  color?: string
  style?: React.CSSProperties
}

const iconMap: Record<AppIconId, React.ComponentType<{ size?: number; color?: string; style?: React.CSSProperties }>> = {
  plex:      SiPlex,
  discord:   SiDiscord,
  nextcloud: SiNextcloud,
  sonarr:    SiSonarr,
  radarr:    SiRadarr,
  overseerr: MdSearch,
  sabnzbd:   MdDownload,
  tautulli:  MdBarChart,
  unraid:    MdStorage,
  uptime:    TbActivityHeartbeat,
  mealie:    MdRestaurant,
  robot:     RiRobotFill,
}

// Fallback for icons that don't render well — override with branded SVG paths
const brandedColors: Partial<Record<AppIconId, string>> = {
  plex:      '#e5a00d',
  discord:   '#5865f2',
  nextcloud: '#0082c9',
  sonarr:    '#35c5f4',
  radarr:    '#ffc230',
}

export default function AppIcon({ id, size = 18, color, style }: Props) {
  const Icon = iconMap[id]
  if (!Icon) return null
  return (
    <Icon
      size={size}
      color={color ?? brandedColors[id] ?? 'currentColor'}
      style={style}
    />
  )
}
