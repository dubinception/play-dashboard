# CRONUS Dashboard — play.cronus.nexus
### Planning Document · Last updated: 2026-03-13

---

## Vision

A self-hosted media server command center that replaces juggling between Plex, Overseerr, Sonarr, Radarr, SABnzbd, Tautulli, Unraid, and Discord. Built for the Arr/Unraid community — clone the repo, plug in your API keys, and have a beautiful unified dashboard that works on desktop and mobile. The web version of nzb360, but with everything nzb360 can't do.

**Open source model:** Clone-your-own-repo. Users host their own Cloudflare Pages instance. No multi-user accounts, no support burden, full control.

---

## Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | React + TypeScript + Vite | |
| Hosting | Cloudflare Pages | Free tier, global CDN, auto-deploy on push |
| API Proxy | Cloudflare Pages Functions (`/functions/api/proxy.ts`) | CORS bypass, allowlist-protected |
| Tunnels | Cloudflare Tunnels | All self-hosted services exposed via tunnel |
| Auth | Cloudflare Access (Zero Trust) | Email OTP policy, protects all routes |
| Tile Layout | react-grid-layout | Drag, drop, resize, per-preset layout persistence |
| State | Zustand + persist middleware | Config in `play-dashboard-config-v1`, tiles in `play-dashboard-tiles-v4` |
| Styling | Tailwind CSS + custom CSS | Dark blue underglow theme |
| Animations | Framer Motion | Sidebar collapse, page transitions |

---

## Design Aesthetic

### Dark Blue Underglow — "CRONUS"
Deep media-center feel. Dark navy/black backgrounds with neon blue and teal underglow effects, animated dot grid, and independently breathing tile borders.

- **Backgrounds:** Deep navy `#050810` base
- **Glow layers:** Bottom-center blue pool, teal bottom-right, blue top-left, purple-blue top-right, ambient center wash — all pulsing independently
- **Tiles:** Gradient border via CSS mask technique (bright blue top → teal bottom), breathing box-shadow, stronger glow on hover
- **Status dots:** Double-layered glow (inner + outer ring)
- **Text:** Cool white `#e0f0ff` primary, muted blue-grey secondary
- **Branding:** CRONUS logo (custom artwork) in sidebar header

---

## Tile Dashboard System

### How It Works
- **react-grid-layout** powers a responsive snap-to-grid canvas (12 columns, 80px row height)
- Tiles are draggable and resizable in Edit Mode
- **Per-preset layout persistence** — each preset saves edits independently in `savedLayouts`
- Tile visibility toggled per-tile via sidebar checkboxes
- Fallback layout entry for any tile missing a position

### Layout Presets
- **Media Focus** — Overseerr front and center, Plex, Tautulli, download stack
- **Admin Mode** — Unraid, SABnzbd, Sonarr/Radarr, Discord, system tiles

---

## Services & Tiles — Current Status

### ✅ Plex
- Now Playing — active streams with user, media, progress bar, play state color
- Library stats — fetches per-section item counts via `/library/sections/{key}/all`
- Connects via Cloudflare Tunnel (`https://plex.cronus.nexus → 192.168.1.100:32400`)

### ✅ Overseerr
- Search bar — live search movies & TV shows, request button, media status badge
- Recent Requests — title enriched via parallel `/api/v1/movie/{tmdbId}` + `/api/v1/tv/{tmdbId}` fetches
- Shows requester, date (Today/Yesterday/date), status badge (Pending/Approved/Partial/Declined/Available)
- Available status derived from `mediaInfo.status === 5` on enriched media

### ✅ Sonarr
- Queue tab — download progress bars, time left, warning state
- Upcoming tab — calendar view with air dates (Today/Tomorrow/date), downloaded indicator
- Fixed: series title null crash, flex fill height, `type="button"` on tab buttons

### ✅ Radarr
- Queue tab — download progress bars per movie
- Upcoming tab — digital/physical/cinema release dates
- Same layout fixes as Sonarr

### ✅ SABnzbd
- Active download queue with per-item progress
- Speed, queue size, disk free
- Pause/Resume controls

### ✅ Tautulli
- Active streams with progress bars and state colors
- Falls back to "Top this week" — top users, movies, shows when nothing playing

### ⚠️ Unraid
- Array state + per-disk usage bars implemented
- Blocked by Unraid 7 CSRF token protection on Connect API — skipped for now
- CPU/RAM fields removed (schema changed in v7)

### ✅ Discord (split into two tiles)
- **Discord Info** (`#5865f2`) — reads info channel via Bot API
- **Discord Alerts** (`#ed4245`) — reads alerts channel via Bot API
- Full embed rendering (author, title, description, fields, footer, images)
- Requires Message Content Intent enabled in Discord Developer Portal
- Polls every 30s

### ✅ Uptime Monitor
- Ping checks for configured services
- Status badges

### 🔲 Nextcloud
- Tile exists (hidden by default), not yet implemented

### 🔲 Mealie
- Tile exists (hidden by default), not yet implemented

---

## Security

### Cloudflare Access
- Zero Trust policy on `play.cronus.nexus` — email OTP, blocks all unauthenticated access

### Proxy Allowlist
- `PROXY_ALLOWLIST` env var in Cloudflare Pages restricts proxy to known service URLs only
- Prevents open relay abuse

### API Keys
- Stored in browser localStorage (`play-dashboard-config-v1`)
- Never committed to git
- Sent to proxy at request time via forwarded headers (`X-Api-Key`, `X-Authorization`, etc.)

---

## Architecture

```
play.cronus.nexus (Cloudflare Pages)
├── src/
│   ├── App.tsx                    # Background glow layers, routing, sidebar
│   ├── pages/
│   │   ├── Dashboard.tsx          # react-grid-layout tile canvas
│   │   └── Settings.tsx           # API key configuration
│   ├── tiles/                     # One component per service
│   │   ├── PlexTile.tsx
│   │   ├── OverseerrTile.tsx
│   │   ├── SonarrTile.tsx
│   │   ├── RadarrTile.tsx
│   │   ├── SabnzbdTile.tsx
│   │   ├── TautulliTile.tsx
│   │   ├── UnraidTile.tsx
│   │   ├── DiscordTile.tsx        # Shared DiscordChannelTile component
│   │   ├── DiscordAlertsTile.tsx  # Thin wrapper → DiscordChannelTile
│   │   ├── UptimeTile.tsx
│   │   ├── NextcloudTile.tsx
│   │   └── MealieTile.tsx
│   ├── hooks/                     # usePlex, useOverseerr, useSonarr, useRadarr,
│   │                              # useSabnzbd, useTautulli, useUnraid,
│   │                              # useDiscord (useDiscordChannel), useUptime
│   ├── store/
│   │   ├── useTileStore.ts        # Layout, presets, savedLayouts, tile visibility
│   │   └── useConfigStore.ts      # Service URLs + API keys (persisted)
│   ├── components/
│   │   ├── Sidebar.tsx            # CRONUS logo, nav, layout controls, tile toggles
│   │   ├── TileWrapper.tsx        # Shared tile chrome (header, status dot, body)
│   │   ├── AppIcon.tsx            # Service icon map
│   │   └── MobileNav.tsx
│   ├── lib/
│   │   └── proxyFetch.ts          # Wraps all API calls through /api/proxy
│   └── assets/
│       └── cronus-logo.png        # Sidebar branding
│
└── functions/
    └── api/
        └── proxy.ts               # Cloudflare Pages Function — CORS proxy with allowlist
```

---

## Build Phases

### ✅ Phase 1 — Scaffold & Shell
- Vite + React + TypeScript
- Dark blue underglow theme, dot grid, glow layers
- react-grid-layout tile canvas with drag/resize/snap
- Desktop sidebar + mobile bottom nav
- Layout preset system with per-preset save

### ✅ Phase 2 — Download Stack
- SABnzbd, Sonarr, Radarr, Overseerr — all connected and working

### ✅ Phase 3 — Server & Media
- Plex now playing + library counts
- Tautulli analytics
- Unraid — partially implemented, blocked by CSRF

### ✅ Phase 4 — Communication & Monitoring
- Discord split into two independent channel tiles (Info + Alerts)
- Uptime monitor tile

### 🔲 Phase 5 — Polish & Open Source Release
- Nextcloud file explorer tile
- Mealie tile
- Mobile pass — full nzb360 parity
- Setup wizard with connection testing
- README + docs for open source release

---

## Open Questions / Known Issues

| Item | Status |
|---|---|
| Unraid 7 CSRF token — Connect API requires session cookies, incompatible with stateless proxy | Skipped — needs research into alternative auth |
| Nextcloud WebDAV vs API for file management | Not started |
| Mealie widget | Not started |
| Layout sync across devices (currently localStorage only) | Future consideration |
| Plex direct connect — uses Cloudflare Tunnel via `plex.cronus.nexus → 192.168.1.100:32400` | Working ✅ |
