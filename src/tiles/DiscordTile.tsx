import TileWrapper from '@/components/TileWrapper'
import { useDiscordChannel } from '@/hooks/useDiscord'
import useConfigStore from '@/store/useConfigStore'
import type { DiscordMessage } from '@/hooks/useDiscord'
import type { AppIconId } from '@/components/AppIcon'

function avatarUrl(msg: DiscordMessage) {
  if (msg.author.avatar) {
    return `https://cdn.discordapp.com/avatars/${msg.author.id}/${msg.author.avatar}.png?size=32`
  }
  return null
}

function fmtTime(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function MessageRow({ msg }: { msg: DiscordMessage }) {
  const avatar = avatarUrl(msg)
  const hasContent = msg.content.trim().length > 0
  const embed = msg.embeds?.[0]

  return (
    <div style={{
      display: 'flex', gap: '8px', padding: '8px 0',
      borderBottom: '1px solid var(--border)',
    }}>
      <div style={{
        width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
        background: 'var(--bg-base)', overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {avatar
          ? <img src={avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              {msg.author.username[0]?.toUpperCase()}
            </span>
        }
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '2px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            {msg.author.username}
          </span>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
            {fmtTime(msg.timestamp)}
          </span>
        </div>
        {hasContent && (
          <div style={{
            fontSize: '0.78rem', color: 'var(--text-secondary)',
            wordBreak: 'break-word', lineHeight: 1.4,
          }}>
            {msg.content}
          </div>
        )}
        {embed && (
          <div style={{
            marginTop: hasContent ? '4px' : 0,
            padding: '6px 8px',
            borderLeft: `3px solid ${embed.color ? `#${embed.color.toString(16).padStart(6, '0')}` : 'var(--accent-1)'}`,
            background: 'rgba(255,255,255,0.03)',
            borderRadius: '0 4px 4px 0',
          }}>
            {embed.author?.name && (
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '2px' }}>
                {embed.author.name}
              </div>
            )}
            {embed.title && (
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>
                {embed.title}
              </div>
            )}
            {embed.description && (
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.4, marginBottom: '4px' }}>
                {embed.description.slice(0, 150)}{embed.description.length > 150 ? '…' : ''}
              </div>
            )}
            {embed.fields?.map((f, i) => (
              <div key={i} style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '2px' }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{f.name}: </span>
                {f.value.slice(0, 80)}{f.value.length > 80 ? '…' : ''}
              </div>
            ))}
            {embed.footer?.text && (
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '4px', opacity: 0.7 }}>
                {embed.footer.text}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

interface Props {
  tileId: AppIconId
  label: string
  color: string
  channelId: string
}

export function DiscordChannelTile({ tileId, label, color, channelId }: Props) {
  const configured = useConfigStore((s) => {
    const { botToken } = s.services.discord as { botToken: string }
    return !!(botToken?.trim() && channelId?.trim())
  })
  const { messages, loading, error } = useDiscordChannel(channelId)

  return (
    <TileWrapper
      id={tileId}
      label={label}
      color={color}
      status={!configured ? 'idle' : error ? 'down' : messages.length > 0 ? 'up' : 'idle'}
    >
      {!configured ? (
        <div className="not-connected">
          <span className="icon">💬</span>
          <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Discord not connected</span>
          <span>Configure Bot Token and Channel ID in Settings</span>
        </div>
      ) : loading && messages.length === 0 ? (
        <div className="not-connected">
          <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Connecting…</span>
        </div>
      ) : error ? (
        <div className="not-connected">
          <span className="icon" style={{ fontSize: '1rem' }}>⚠️</span>
          <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Connection failed</span>
          <span style={{ fontSize: '0.72rem' }}>{error}</span>
        </div>
      ) : messages.length === 0 ? (
        <div className="not-connected">
          <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>No messages</span>
        </div>
      ) : (
        <div style={{ height: '100%', overflowY: 'auto' }}>
          {messages.map((msg) => <MessageRow key={msg.id} msg={msg} />)}
        </div>
      )}
    </TileWrapper>
  )
}

export default function DiscordTile() {
  const { infoChannelId } = useConfigStore((s) => s.services.discord as { infoChannelId: string })
  return <DiscordChannelTile tileId="discordInfo" label="Discord Info" color="#5865f2" channelId={infoChannelId ?? ''} />
}
