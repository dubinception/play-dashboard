# Play Dashboard — play.cronus.nexus
### Planning Document · Last updated: 2026-03-12

---

## Vision

A self-hosted media server command center that replaces juggling between Plex, Overseerr, Sonarr, Radarr, SABnzbd, Tautulli, Unraid, and Discord. Built for the Arr/Unraid community — clone the repo, plug in your API keys, and have a beautiful unified dashboard that works on desktop and mobile. The web version of nzb360, but with everything nzb360 can't do.

**Open source model:** Clone-your-own-repo. Users host their own Cloudflare Pages instance. No multi-user accounts, no support burden, full control.

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | React + TypeScript + Vite | Consistent with work dashboard, great ecosystem |
| Hosting | Cloudflare Pages | Free tier, global CDN, easy GitHub deploy |
| API Proxy | Cloudflare Pages Functions | CORS bypass for self-hosted services, keeps keys server-side |
| Tunnels | Cloudflare Tunnels | All self-hosted services already behind tunnels |
| Auth | Google OAuth 2.0 | Single user / household, already familiar |
| Tile Layout | react-grid-layout | Drag, drop, resize, snap-to-grid, save layout |
| Styling | Tailwind CSS + custom CSS | Same pattern as work dashboard |
| Animations | Framer Motion | Page transitions, tile animations |
| Charts | Recharts | Tautulli stats, download speeds, disk usage |
| Config storage | Cloudflare KV + localStorage | API keys in KV secrets, layout prefs in localStorage |

---

## Design Aesthetic

### Dark Blue Underglow
A deep media-center feel — think Plex-meets-gaming-setup. Dark navy/black backgrounds with neon blue and teal underglow effects. Different from the work dashboard's purple nebula.

- **Backgrounds:** Deep navy `#050810` to near-black `#020408`
- **Primary glow:** Electric blue `#00aaff` with soft underglow halos
- **Secondary glow:** Cyan/teal `#00e5cc`
- **Accent:** Hot blue-white `#60c8ff` for highlights
- **Cards:** Dark navy glass with blue border glow on hover
- **Grid pattern:** Subtle blue dot matrix that breathes
- **Text:** Cool white `#e0f0ff` primary, muted blue-grey secondary

### Mobile First
Key features designed for mobile (replacing nzb360 on Android):
- Bottom navigation bar on mobile
- Touch-friendly tile interactions
- Swipe gestures for quick actions
- Compact card views for small screens

---

## Tile Dashboard System

### How It Works
- **react-grid-layout** powers a responsive snap-to-grid canvas
- Tiles are draggable and resizable (snap to grid units)
- Layout saved to localStorage per user
- Layout presets available as starting points
- Each tile can be shown/hidden via a tile manager panel
- Tile sizes: Small (1×1), Medium (2×1), Wide (2×2), Large (3×2), Full-width (4×2)

### Layout Presets
- **Media Focus** — Overseerr search front and center, Plex now playing, download queue
- **Admin Mode** — Unraid stats, SABnzbd queue, Sonarr/Radarr grids, Discord log
- **Mobile** — Streamlined single-column, touch-optimized tiles
- **Custom** — User's saved layout

---

## Services & Tiles

### 🎬 Plex
- Now Playing — active streams with user, media, progress bar
- Recent activity
- Library stats (movies, shows, episodes counts)
- Quick launch button

### 🔍 Overseerr
- **Search bar tile** (prominent) — search movies and TV shows
- Trending / Popular suggestions
- Pending requests list
- Request status tracker
- Approve/deny requests (if admin)

### 📺 Sonarr
- Monitored series list
- Download queue with progress
- Calendar view (upcoming episodes)
- Missing episodes
- Quick search + add series

### 🎥 Radarr
- Monitored movies list
- Download queue with progress
- Missing movies
- Quick search + add movie

### ⬇️ SABnzbd
- Active download queue with speed graph (animated)
- Download speed / daily total
- History (recent completed)
- Pause / Resume / Clear controls

### 📊 Tautulli
- Watch time stats (daily/weekly/monthly)
- Top users, top media
- Stream count graph
- Recently watched

### 🖥️ Unraid
- Disk usage per array drive (visual bar per disk)
- Overall array health (green/yellow/red)
- CPU + RAM usage (animated gauges)
- Docker containers — list with start/stop toggle per container
- Temperature readings
- Network throughput

### 💬 Discord
- Read-only log channel viewer
- Latest N messages displayed as a feed
- Color-coded by message type (info / warning / error)
- Auto-refreshes on interval
- Filterable by keyword

### ⬆️ Uptime Monitor (built-in, replaces Uptime Robot)
- Ping-based uptime checks for all configured services
- Status badges (up/down/degraded)
- Response time graph
- Incident history
- Configurable check interval

### ☁️ Nextcloud File Explorer
- Midnight Commander style — dual-pane file browser
- Browse, move, copy, delete files
- Upload / download
- Preview images
- Keyboard shortcut navigation

### 🍽️ Mealie
- Quick-link tile only (opens Mealie in new tab)
- Optional: latest recipes widget

---

## Setup & Configuration

### First-Run Setup Wizard
When no config is detected, a setup wizard walks the user through:

1. **Welcome** — brief intro, link to GitHub docs
2. **Google OAuth** — paste Client ID + Secret
3. **Services** — toggle which services you use, enter each:
   - Tunnel URL (e.g. `https://plex.yourdomain.com`)
   - API key
4. **Discord** — Bot token + channel ID (optional)
5. **Unraid** — IP/hostname + API key (optional)
6. **Test connections** — green/red status per service
7. **Pick a layout preset** — choose starting tile layout
8. **Done**

### Config Storage
- API keys / secrets → Cloudflare Workers secrets (never in code or git)
- For open source users: a `config.example.env` with all variable names documented
- Tile layout → localStorage (per browser)
- User preferences → Cloudflare KV

### For Open Source Users
```
1. Fork the repo
2. Connect to Cloudflare Pages
3. Run the setup wizard or fill in environment variables
4. Deploy
```
Full README with step-by-step setup for each service.

---

## Architecture

```
play.cronus.nexus
├── Cloudflare Pages (React SPA)
│   └── /src
│       ├── pages/
│       │   ├── Dashboard.tsx      # Main tile canvas
│       │   ├── Setup.tsx          # First-run wizard
│       │   └── Settings.tsx       # Edit config after setup
│       ├── tiles/                 # One component per service tile
│       │   ├── PlexTile.tsx
│       │   ├── OverseerrTile.tsx
│       │   ├── SonarrTile.tsx
│       │   ├── RadarrTile.tsx
│       │   ├── SabnzbdTile.tsx
│       │   ├── TautulliTile.tsx
│       │   ├── UnraidTile.tsx
│       │   ├── DiscordTile.tsx
│       │   ├── UptimeTile.tsx
│       │   └── NextcloudTile.tsx
│       ├── components/
│       │   ├── TileCanvas.tsx     # react-grid-layout wrapper
│       │   ├── TileManager.tsx    # Show/hide/resize controls
│       │   ├── Nav.tsx
│       │   └── MobileNav.tsx
│       ├── hooks/                 # usePlex, useOverseerr, useSonarr, etc.
│       ├── store/                 # Zustand — layout, config, auth
│       └── api/                   # Client-side callers → Pages Functions
│
└── Cloudflare Pages Functions (/functions)
    ├── auth/              # Google OAuth
    ├── proxy/             # Generic CF tunnel proxy (avoids CORS)
    ├── plex/
    ├── overseerr/
    ├── sonarr/
    ├── radarr/
    ├── sabnzbd/
    ├── tautulli/
    ├── unraid/
    ├── discord/
    ├── nextcloud/
    └── uptime/            # Server-side ping checks
```

**Secrets (Cloudflare Workers):**
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
- `PLEX_TOKEN` + `PLEX_URL`
- `OVERSEERR_API_KEY` + `OVERSEERR_URL`
- `SONARR_API_KEY` + `SONARR_URL`
- `RADARR_API_KEY` + `RADARR_URL`
- `SABNZBD_API_KEY` + `SABNZBD_URL`
- `TAUTULLI_API_KEY` + `TAUTULLI_URL`
- `UNRAID_API_KEY` + `UNRAID_URL`
- `DISCORD_BOT_TOKEN` + `DISCORD_CHANNEL_ID`
- `NEXTCLOUD_URL` + `NEXTCLOUD_USER` + `NEXTCLOUD_PASSWORD`

---

## Mobile Strategy

Features that matter most on mobile (nzb360 replacement):
- Overseerr search + requests
- SABnzbd queue management (pause/resume)
- Sonarr / Radarr queue + add content
- Unraid container start/stop
- Discord log viewer
- Uptime status at a glance

Mobile nav: bottom tab bar with 5 most-used sections.
Tiles reflow to single column on mobile with touch-friendly sizing.

---

## Build Phases

### Phase 1 — Scaffold & Shell
- Vite + React + TypeScript in `/Play`
- Dark blue underglow theme system
- react-grid-layout tile canvas (drag/resize/snap)
- Nav (desktop sidebar + mobile bottom bar)
- Empty tile shells for all services
- Layout preset system
- Setup wizard UI (no backend yet)

### Phase 2 — Download Stack
- SABnzbd integration (queue, speed, controls)
- Sonarr integration (queue, calendar, search)
- Radarr integration (queue, search)
- Overseerr search + requests

### Phase 3 — Server & Media
- Plex now playing + stats
- Tautulli analytics
- Unraid disk/CPU/RAM + docker controls

### Phase 4 — Communication & Monitoring
- Discord log channel reader
- Built-in uptime monitor
- Nextcloud file explorer

### Phase 5 — Polish & Open Source Release
- Mobile pass — full nzb360 parity
- Setup wizard complete with connection testing
- README + docs for open source release
- `config.example.env` and GitHub repo polish

---

## Open Questions

| Question | Status |
|---|---|
| Unraid API method — community plugin or direct? | Needs research |
| Discord read — bot token or OAuth? | Needs research |
| Nextcloud WebDAV vs API for file management? | Needs research |
| Should layout be saved to KV (sync across devices) or localStorage only? | Decide in Phase 1 |
| Plex API — direct or via Tautulli for everything? | Decide in Phase 2 |
