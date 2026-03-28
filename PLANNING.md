# CRONUS Dashboard — play.cronus.nexus
### Planning Document · Last updated: 2026-03-15

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
| Config Storage | Cloudflare KV | Server-side API key persistence via `/api/config` |
| Tunnels | Cloudflare Tunnels | All self-hosted services exposed via tunnel |
| Auth | Cloudflare Access (Zero Trust) | Email OTP policy, protects all routes |
| Tile Layout | react-grid-layout | Drag, drop, resize, per-preset layout persistence |
| State | Zustand + persist middleware | Config in `play-dashboard-config-v1`, tiles in `play-dashboard-tiles-v4`, theme in `play-dashboard-theme-v1` |
| Styling | Custom CSS (CSS custom properties) | Multi-theme system, glow animations |
| Animations | Framer Motion | Sidebar collapse, page transitions |

---

## Design System

### Theme Architecture
Four named themes, each with a dark and light variant (8 total). Themes are hot-swappable via CSS custom properties — no reload required.

| Theme | Dark | Light |
|---|---|---|
| **Submarine** | Deep navy, neon blue + teal (default) | Ice blue + white |
| **Abyss** | Deep purple, violet accents | Lavender pastel |
| **Inferno** | Charcoal, red/burnt orange | Soft red/pink |
| **Reactor** | Black, yellow/amber | Yellow + white |

**Implementation:**
- `--p-rgb` and `--s-rgb` (comma-separated RGB channels) power `rgba(var(--p-rgb), 0.3)` throughout all styles — a theme change is just swapping two variables
- `html[data-theme="X"][data-mode="Y"]` CSS selectors apply theme overrides over `:root` defaults
- FOUC prevention: `main.tsx` reads `localStorage` before React hydrates and pre-applies `data-*` attributes to `<html>`
- `#glow-root` wrapper with `opacity: var(--glow-root-opacity)` scales all glow layers simultaneously for intensity control
- `@keyframes tile-breathe` uses CSS vars so keyframe colours adapt per theme without duplicating animations

### Glow Controls
- **Speed:** Slow / Medium / Fast — controlled via `--dur-1` through `--dur-5`, `--dur-tile`, `--dur-grid`, `--dur-border` CSS variables
- **Intensity:** Low / Medium / High — controlled via `--glow-root-opacity` on the `#glow-root` wrapper div
- All four settings persisted in Zustand (`play-dashboard-theme-v1`) and synced to `html` data attributes

### Text Readability (Dark Modes)
All dark themes use lightened `--text-secondary` and `--text-muted` values tuned per theme so secondary text (season codes, file sizes, years, ratings, settings labels) reads clearly against the coloured backgrounds.

---

## Responsive Layout

### Breakpoints
| Width | Layout |
|---|---|
| > 1200px | Full 12-column react-grid-layout grid, drag/resize in edit mode |
| ≤ 1200px | Vertical stack — tiles stacked full-width in desktop layout order, per-tile curated heights |
| ≤ 768px | nzb360-style mobile — full-screen single tile + hamburger drawer |

### Mobile Layout (≤768px)
`MobileLayout.tsx` completely replaces the sidebar + grid on mobile:
- **Header bar** (52px): animated hamburger→X button, current tile icon + name, CRONUS logo
- **Full-screen tile area**: one service fills the entire remaining screen height
- **Slide-in drawer** (280px): lists all visible services with app icons, active left-border highlight, green connection dot if configured; Settings link pinned to bottom
- No bottom nav bar — all navigation lives in the drawer
- Smooth CSS transform transition (`cubic-bezier(0.4,0,0.2,1)`) with backdrop blur overlay
- Settings page renders inline within the mobile shell

### Stack Heights (≤1200px)
Each tile has a curated height in stacked mode rather than using the generic grid formula:

| Tile | Stack Height |
|---|---|
| Overseerr | 520px |
| Sonarr / Radarr / Unraid | 420px |
| Tautulli / Discord Alerts | 460px |
| Discord Info | 420px |
| Plex / Nextcloud | 340px |
| SABnzbd / Uptime / Mealie | 300–320px |

---

## Tile Dashboard System

### How It Works
- **react-grid-layout** powers a 12-column, 80px-row-height canvas on desktop
- Tiles are draggable and resizable in Edit Mode (desktop only)
- **Per-preset layout persistence** — each preset saves edits independently in `savedLayouts`
- Tile visibility toggled per-tile via sidebar checkboxes
- `TILE_MAP` defined in `App.tsx` and passed as a prop to both `Dashboard` and `MobileLayout`

### Layout Presets
- **Media Focus** — Overseerr front and centre, Plex, Tautulli, download stack
- **Admin Mode** — Unraid, SABnzbd, Sonarr/Radarr, Discord, system tiles

---

## Services & Tiles — Current Status

### ✅ Plex
- Now Playing — active streams with user, media, progress bar, play state colour
- Library stats — fetches per-section item counts via `/library/sections/{key}/all`

### ✅ Overseerr
- **Search** — live search movies & TV, results show status badge (Available/Pending/etc.)
- **Discover tab** — Trending / Movies / TV / Movie Genre / TV Genre / Network modes with pagination and auto-fill
- **Requests tab** — recent requests enriched with poster, title, requester, date, status
- **Poster detail modal** (portal):
  - Backdrop hero image with gradient fade
  - Poster overlapping backdrop (negative margin)
  - Skeleton loading state while detail fetches
  - **Ratings row**: TMDb score + vote count, IMDb score + vote count, RT Critics %, RT Audience %
  - Tagline in accent italic
  - Genre pills
  - Metadata grid: Release Date, Language, Network, Studio, Country, Episode Runtime
  - Season/episode count inline for TV
  - Request / availability status button

### ✅ Sonarr
- Queue tab — download progress bars, time left, warning state
- Upcoming tab — calendar view with air dates (Today/Tomorrow/date), downloaded indicator
- **Series detail modal** (portal):
  - Fanart backdrop with gradient overlay, poster + title in hero
  - Season cards with per-season progress bars and file counts
  - Genres, metadata row (network, added, path)
  - Cast grid (horizontal scroll) + Crew section (Creator, Writers)
  - Action bar: Monitor toggle, **custom quality profile dropdown** (dark themed, matches Radarr), Search, TVDB, IMDb, Sonarr links, ⋮ menu (Auto Search, Refresh, Delete with confirmation)
  - Toast notifications for actions

### ✅ Radarr
- Queue tab — download progress bars per movie
- Upcoming tab — digital/physical/cinema release dates
- **Movie detail modal** (portal):
  - Fanart backdrop, poster + title in hero
  - File info expandable card (video: resolution, codec, bit depth, FPS; audio: codec, channels, languages, runtime)
  - Release dates grid (cinemas, digital, physical)
  - Overview, genres, studio, director/writers, cast grid
  - Action bar: Monitor toggle (bookmark icon), custom quality profile dropdown, Search, IMDb, Radarr links, ⋮ menu, Delete confirmation

### ✅ SABnzbd
- Active download queue with per-item progress
- Speed, queue size, disk free
- Pause/Resume + Clear Queue controls

### ✅ Tautulli
- Active streams with progress bars and state colours
- Falls back to "Top this week" — top users, movies, shows when nothing is playing

### ⚠️ Unraid
- Array state + per-disk usage bars implemented
- Blocked by Unraid 7 CSRF token protection on Connect API — skipped for now
- CPU/RAM fields removed (schema changed in v7)

### ✅ Discord (two tiles)
- **Discord Info** (`#5865f2`) — reads info channel via Bot API
- **Discord Alerts** (`#ed4245`) — reads alerts channel via Bot API
- Full embed rendering (author, title, description, fields, footer, images)
- Requires Message Content Intent enabled in Discord Developer Portal
- Polls every 30s

### ✅ Uptime Monitor
- Ping checks for configured services, status badges

### 🔲 Nextcloud
- Tile exists (hidden by default), not yet implemented

### 🔲 Mealie
- Tile exists (hidden by default), not yet implemented

---

## Modal Architecture

All detail modals use `ReactDOM.createPortal(..., document.body)` to render outside the react-grid-layout tree. This is necessary because react-grid-layout positions tiles with `transform: translate(x, y)`, which creates a new CSS containing block and breaks `position: fixed` descendants. The portal escapes the transform context entirely.

---

## Config & API Key Storage

API keys are stored in **two layers**:
1. **Cloudflare KV** (server-side) — primary store. "Save" in Settings calls `PUT /api/config` (Cloudflare Pages Function) which writes to KV. Page load calls `GET /api/config` to hydrate.
2. **`localStorage`** (`play-dashboard-config-v1`) — Zustand persist cache so the UI doesn't flash empty fields while KV loads.

Keys are never committed to git. They are forwarded to services at request time via the proxy (`X-Api-Key`, `X-Authorization`, etc.).

---

## Architecture

```
play.cronus.nexus (Cloudflare Pages)
├── src/
│   ├── main.tsx                   # FOUC prevention — pre-applies theme data attrs before hydration
│   ├── App.tsx                    # Theme sync, TILE_MAP, mobile/desktop layout split, routing
│   ├── pages/
│   │   ├── Dashboard.tsx          # react-grid-layout (desktop) or vertical stack (≤1200px)
│   │   └── Settings.tsx           # API key config + AppearanceSection (themes, glow)
│   ├── tiles/                     # One component per service
│   │   ├── PlexTile.tsx
│   │   ├── OverseerrTile.tsx      # Poster grid, discover, detail modal w/ ratings + metadata
│   │   ├── SonarrTile.tsx         # Queue + upcoming + SonarrDetailModal
│   │   ├── SonarrDetailModal.tsx  # Portal modal — seasons, cast, actions
│   │   ├── RadarrTile.tsx         # Queue + upcoming + RadarrDetailModal
│   │   ├── RadarrDetailModal.tsx  # Portal modal — file info, crew, cast, actions
│   │   ├── SabnzbdTile.tsx
│   │   ├── TautulliTile.tsx
│   │   ├── UnraidTile.tsx
│   │   ├── DiscordTile.tsx
│   │   ├── DiscordAlertsTile.tsx
│   │   ├── UptimeTile.tsx
│   │   ├── NextcloudTile.tsx
│   │   └── MealieTile.tsx
│   ├── hooks/
│   │   ├── useOverseerr.ts        # Search, discover, requests, fetchOverseerrDetail, OverseerrDetail type
│   │   ├── useSonarr.ts
│   │   ├── useRadarr.ts
│   │   ├── usePlex.ts
│   │   ├── useSabnzbd.ts
│   │   ├── useTautulli.ts
│   │   ├── useUnraid.ts
│   │   ├── useDiscord.ts
│   │   ├── useUptime.ts
│   │   └── useWindowSize.ts
│   ├── store/
│   │   ├── useTileStore.ts        # Layout, presets, savedLayouts, tile visibility
│   │   ├── useConfigStore.ts      # Service URLs + API keys — syncs to/from Cloudflare KV
│   │   └── useThemeStore.ts       # Theme name, mode, glow speed/intensity — persisted
│   ├── components/
│   │   ├── Sidebar.tsx            # CRONUS logo, nav, layout controls, tile toggles (desktop)
│   │   ├── MobileLayout.tsx       # nzb360-style — full-screen tile + hamburger drawer (≤768px)
│   │   ├── TileWrapper.tsx        # Shared tile chrome (header, status dot, body)
│   │   └── AppIcon.tsx            # Service icon map
│   ├── lib/
│   │   └── proxyFetch.ts          # Wraps all API calls through /api/proxy
│   └── assets/
│       └── cronus-logo.png
│
└── functions/
    └── api/
        ├── proxy.ts               # CORS proxy with allowlist
        └── config.ts              # GET/PUT config to/from Cloudflare KV
```

---

## Build Phases

### ✅ Phase 1 — Scaffold & Shell
- Vite + React + TypeScript
- Dark blue underglow theme, dot grid, glow layers
- react-grid-layout tile canvas with drag/resize/snap
- Desktop sidebar + layout preset system

### ✅ Phase 2 — Download Stack
- SABnzbd, Sonarr, Radarr, Overseerr — all connected and working

### ✅ Phase 3 — Server & Media
- Plex now playing + library counts
- Tautulli analytics
- Unraid — partially implemented, blocked by CSRF

### ✅ Phase 4 — Communication & Monitoring
- Discord split into two independent channel tiles (Info + Alerts)
- Uptime monitor tile

### ✅ Phase 5 — Polish & Responsive
- **Multi-theme system** — 4 themes × 2 modes (dark/light) = 8 variants, glow speed + intensity controls
- **Detail modals** — Sonarr (series), Radarr (movie), Overseerr (poster) — all portal-based with full metadata, ratings, cast/crew, actions
- **Responsive layout** — desktop 12-col grid, tablet/small-desktop vertical stack, mobile nzb360-style hamburger drawer
- **Config persistence** — Cloudflare KV for server-side API key storage
- **Overseerr discover** — genre/network filtering, pagination, auto-fill

### 🔲 Phase 6 — Open Source Release
- Nextcloud file explorer tile
- Mealie recipe tile
- Setup wizard with connection testing
- README + deployment guide for self-hosters

---

## Open Questions / Known Issues

| Item | Status |
|---|---|
| Unraid 7 CSRF token — Connect API requires session cookies, incompatible with stateless proxy | Skipped — needs research into alternative auth |
| Nextcloud WebDAV vs API for file management | Not started |
| Mealie widget | Not started |
| Layout sync across devices (currently localStorage + KV per-user) | Working via KV save/load |
| Plex direct connect via `plex.cronus.nexus → 192.168.1.100:32400` | Working ✅ |
