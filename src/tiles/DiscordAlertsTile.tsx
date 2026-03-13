import { DiscordChannelTile } from './DiscordTile'
import useConfigStore from '@/store/useConfigStore'

export default function DiscordAlertsTile() {
  const { alertsChannelId } = useConfigStore((s) => s.services.discord as { alertsChannelId: string })
  return <DiscordChannelTile tileId="discordAlerts" label="Discord Alerts" color="#ed4245" channelId={alertsChannelId ?? ''} />
}
