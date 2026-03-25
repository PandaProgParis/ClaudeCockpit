# Claude Cockpit

Personal web app to visualize Claude Code CLI session history, live usage, active sessions, and calibration data. Runs as a local Express server, opens in the browser.

## Commands

```bash
npm run dev              # Dev: Express (3001) + Vite (5200, auto-opens browser)
npm start                # Prod: vite build + serve at http://localhost:3001
npm test                 # Unit tests (vitest)
npm run typecheck        # tsc --noEmit
npm run build            # Vite build only (output: dist/client)
npm run build:extension  # Copy chrome-extension/ → dist/extension/
npm run package:extension # Build + zip extension
```

Docker:
```bash
docker compose up -d     # Prod on port 6501, mounts ~/.claude (ro) + named volume for app data
docker compose up --build # Rebuild image then start
```

## Architecture

```
Browser (localhost:5200 dev / 3001 prod)
    ↕ fetch /api/* + SSE /api/events
Express server (src/server/, port 3001)
    reads ~/.claude/ files
    watches session files (chokidar)
    polls Anthropic usage API (via ~/.claude/.credentials.json)
    stores app data in ~/.claude-cockpit/
```

- **Server** (`src/server/`) — Express 5 API, in-memory session cache, SSE push, chokidar file watcher, usage polling with calibration, full-text session search index
- **Client** (`src/renderer/`) — React 19 + Tailwind, tabs: Dashboard, History, Projects, Config, Settings. i18n (EN/FR), dark/light theme, CSS variables theming

In dev, Vite proxies `/api/*` → `http://localhost:3001`.

## Data Sources

- `~/.claude/history.jsonl` — session index (one line per user message, deduplicated by `sessionId`)
- `~/.claude/projects/<dir>/<sessionId>.jsonl` — per-session conversation logs (model, tokens, thinking)
- `~/.claude/.credentials.json` — OAuth credentials for Anthropic usage API (auto-read, never stored)
- `~/.claude-cockpit/` — app data: `calibration.json`, `hidden-sessions.json`, `usage-cache.json`, `settings.json`, `prices.json`

**Path encoding:** project path → directory name via `replace(/[^a-zA-Z0-9]/g, '-')` (case-insensitive lookup)

**Token deduplication:** assistant entries deduplicated by `message.id` before summing usage

## Key Files

### Server (`src/server/`)

| File | Purpose |
|------|---------|
| `index.ts` | Express server, all API routes, in-memory cache, usage polling |
| `history-parser.ts` | Reads + parses `~/.claude/` files, builds `SessionEntry[]` |
| `session-index.ts` | Full-text search index over session messages (for `/api/search`) |
| `session-watcher.ts` | chokidar watcher for live session file changes, Docker polling fallback |
| `session-manager.ts` | Hide/unhide/delete sessions (persisted in `~/.claude-cockpit/`) |
| `usage-api.ts` | Reads `~/.claude/.credentials.json`, fetches usage from claude.ai API |
| `usage-processor.ts` | Shared usage processing: cache write, calibration, SSE broadcast |
| `calibration.ts` | Delta-based calibration: tokens-per-percent estimation |
| `config-reader.ts` | Reads Claude CLI config (plan, plugins, MCP servers, desktop config) |
| `stats.ts` | `computeStats()` — aggregates sessions into `GlobalStats` |
| `sse.ts` | SSE client management and `broadcast()` |
| `app-data.ts` | Read/write JSON files in `~/.claude-cockpit/` |

### Client — Components (`src/renderer/components/`)

| File | Purpose |
|------|---------|
| `App.tsx` | Root: tab navigation, context providers (language, theme, exact numbers) |
| `TabDashboard.tsx` | Usage bars, active sessions, stats |
| `TabHistory.tsx` | Session table with filters, sorting, search bar, session viewer panel |
| `TabProjects.tsx` | Per-project session breakdown |
| `TabConfig.tsx` | Claude CLI configuration viewer (plan, plugins, MCP) |
| `TabSettings.tsx` | App settings: refresh interval, exact numbers, custom prices |
| `SessionViewer.tsx` | Side-panel: session messages with markdown rendering |
| `SkillViewer.tsx` | Skill content viewer with source toggle |

### Client — Hooks & Libs (`src/renderer/hooks/`, `src/renderer/lib/`)

| File | Purpose |
|------|---------|
| `hooks/useHistory.ts` | Fetches session data from `/api/*`, exposes `refresh()` |
| `hooks/useSessionSearch.ts` | Debounced full-text search via `/api/search` |
| `hooks/useSessionMessages.ts` | Fetches messages for a single session |
| `hooks/useUsage.ts` | Fetches and manages usage data |
| `hooks/useActiveSessions.ts` | Tracks active sessions via SSE |
| `hooks/useLanguage.ts` | Language context (EN/FR toggle) |
| `hooks/useExactNumbers.ts` | Context toggle: abbreviated vs exact token/cost display |
| `lib/types.ts` | Shared types: `SessionEntry`, `GlobalStats`, `UsageData`, etc. |
| `lib/i18n.ts` | Typed translations interface, EN + FR dictionaries |
| `lib/cost.ts` | Cost estimation from price table (customizable via settings) |
| `lib/format.ts` | `formatDate`, `formatDuration`, `formatTokens`, `formatCost`, `abbreviateModel` |
| `lib/sse.ts` | Client-side SSE connection and event listener |

### Other

| Path | Purpose |
|------|---------|
| `chrome-extension/` | Chrome MV3 extension: auto-syncs usage from claude.ai → `POST localhost:3001/api/usage/inject` (6501 en Docker) |
| `Dockerfile` | Multi-stage build: Node 22-alpine, `vite build` → prod with `tsx` runtime |
| `docker-compose.yml` | Prod deploy: port 6501, `~/.claude` mounted read-only |

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/history` | Return cached sessions (parses on first call), excludes hidden |
| `GET /api/history/refresh` | Re-parse `~/.claude/`, update cache, return sessions |
| `GET /api/stats` | Return `GlobalStats` computed from cache |
| `GET /api/events` | SSE stream for real-time updates |
| `GET /api/usage` | Fetch usage from API (falls back to cache) |
| `POST /api/usage/manual` | Submit manual usage data |
| `POST /api/usage/inject` | Receive usage data from Chrome extension (port 3001, or 6501 via Docker) |
| `GET /api/active` | Return currently active sessions |
| `GET /api/config` | Return Claude CLI configuration |
| `GET /api/file-content` | Read file content (path whitelist: skills, plugins cache only) |
| `GET /api/search` | Full-text search across session messages (`?q=&scope=`) |
| `GET /api/sessions/hidden` | Return list of hidden session IDs |
| `GET /api/sessions/:id/messages` | Return all messages for a session |
| `POST /api/sessions/:id/hide` | Hide a session from history |
| `POST /api/sessions/:id/unhide` | Unhide a previously hidden session |
| `DELETE /api/sessions/:id` | Delete a session (body: `{ projectPath }`) |
| `GET /api/settings` | Return app settings |
| `POST /api/settings` | Update app settings |
| `GET /api/prices` | Return custom price table |
| `POST /api/prices` | Update custom price table |
| `DELETE /api/permissions` | Remove a Claude CLI permission entry |
| `POST /api/open-file` | Open a file in the system default editor |
| `GET /api/calibration` | Return calibration data (tokens-per-percent) |

## Code Style

- **React:** functional components, named exports (`export function Foo() {}`), hooks for state/effects
- **Global state:** React Context + custom hooks (`useLanguage`, `useTheme`, `useExactNumbers`)
- **Theming:** CSS variables (`var(--bg)`, `var(--text)`, `var(--border)`, `var(--accent)`)
- **TypeScript:** strict mode, `import type` for type-only imports, `jsx: react-jsx`
- **Server caching:** promise-based in-memory cache to prevent duplicate concurrent fetches
- **Debouncing:** `useRef<ReturnType<typeof setTimeout>>` pattern in hooks
- **i18n:** typed `Translations` interface — all keys statically known, no runtime lookups

## Environment

| Variable | Default | Purpose |
|----------|---------|---------|
| `NODE_ENV` | — | `production` enables static file serving from `dist/client` |
| `DOCKER` | — | `1` enables chokidar polling (no native fs events in containers) |

No API keys needed — usage API reads OAuth token from `~/.claude/.credentials.json` automatically.

## Testing

```bash
npm test                           # All tests
npx vitest run src/server/__tests__/calibration.test.ts  # Single file
npx vitest --watch                 # Watch mode
```

- Tests in `src/server/__tests__/`, pattern: `<module>.test.ts`
- Uses vitest (`describe`/`it`/`expect`), no mocking frameworks
- Server modules only — no client component tests currently
- Test helpers: `buildIndexFromRaw()` exported specifically for testing without file I/O

## Gotchas

- **Port 5200 not 5173:** Vite dev server is configured on port 5200 (not Vite's default)
- **Path encoding is lossy:** `replace(/[^a-zA-Z0-9]/g, '-')` means different paths can collide — lookup is case-insensitive to mitigate
- **Token dedup is mandatory:** without deduplication by `message.id`, assistant token counts double
- **Calibration resets weekly:** delta points are discarded on weekly boundary, intentional to avoid stale data
- **Docker needs polling:** chokidar uses `usePolling: true` when `DOCKER=1` because containers lack native inotify on bind mounts
- **`/api/file-content` is whitelisted:** only serves files under skills and plugins cache paths — not arbitrary file access
- **Chrome extension opens a window:** the MV3 extension opens a minimized claude.ai window to intercept the usage API response, this is expected behavior
- **Credentials can expire:** `usage-api.ts` checks `expiresAt` and returns `null` if token is expired — usage falls back to cache
- **SSE events:** `session:active`, `session:idle`, `session:ended`, `usage:updated` — clients reconnect automatically
