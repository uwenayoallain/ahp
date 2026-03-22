# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development (from repo root)
pnpm install              # install all dependencies
pnpm dev                  # client (:5173) + server (:3001) in parallel
pnpm build                # build both workspaces sequentially
pnpm lint                 # lint both workspaces
pnpm test                 # run server tests (Vitest)

# Server tests (from server/)
pnpm test                 # single run
pnpm test:watch           # watch mode
pnpm vitest run src/routes/api.test.ts   # single file
pnpm vitest run -t "GET /api/health"      # by test name
pnpm vitest run api -t "auth register"    # file + name filter
```

## Architecture

Offline-first PWA monorepo: **React 19 + Vite 7** client, **Express 5 + SQLite** server. Package manager: **pnpm 10** with workspaces (`client/`, `server/`).

- Vite proxies `/api` to Express on port 3001 in dev
- Server exports `createApp()` for testing; `startServer()` only runs when `NODE_ENV !== 'test'`
- Client uses IndexedDB (`idb`) for offline cache and a sync queue (`flushSyncQueue()`)
- Workbox service worker for PWA; listens for `AHP_TRIGGER_SYNC` message
- JWT auth: access tokens (15m) + refresh tokens (7d) with automatic retry on 401 via `apiRequest<T>()`
- SQLite with WAL mode, auto-seeds dev data on first connection

### Client (`client/src/`)

- `App.tsx` — router setup, context providers (AuthProvider, NetworkProvider)
- `pages/` — route components; `pages/admin/` for admin views
- `components/ui/` — reusable UI (DataTable, PageHeader, StatCard, EmptyState)
- `components/layout/` — AppShell, Navbar, Sidebar
- `context/` — each context split: type file (`.ts`) + provider (`.tsx`)
- `hooks/` — thin wrappers around contexts
- `lib/` — api.ts (requests), auth.ts (token storage), db.ts (IndexedDB), sync.ts (offline queue)
- `styles/tokens.css` — design tokens (colors, spacing, shadows, radius, fonts)

### Server (`server/src/`)

- `index.ts` — Express app creation and route mounting
- `routes/` — one file per resource (auth, submissions, teams, challenges, etc.)
- `db/connection.ts` — SQLite connection with `resetDbForTests()`; `db/schema.sql` defines 11 tables
- `middleware/` — auth (JWT), rateLimit, upload (multer)
- `services/` — business logic (submissions, sync)
- `routes/api.test.ts` — 60+ integration tests with supertest, real DB (no mocks)

## Code Style

Full conventions are in `AGENTS.md`. Critical rules:

- **No semicolons**, single quotes, 2-space indent, trailing commas
- **`type` always, never `interface`** (except Express module augmentation)
- **Zero `any`** — use `unknown` with narrowing or `as` assertions
- **Named exports** only (`export default` exists solely in `App.tsx`)
- **No barrel files** — import from specific files
- **`function` declarations** for exports/top-level; arrow functions only for callbacks
- **`import type`** for type-only imports (enforced by `verbatimModuleSyntax`)
- Server: explicit `.js` extensions on relative imports (NodeNext); Client: no extensions
- Import order: node built-ins → third-party → local (no blank lines between)
- `??` over `||`; `async/await` only (no `.then()`)
- Virtually zero comments — no JSDoc, no TODOs, no file headers
- `describe` + `test` (not `it`) for tests; no mocking

## UI Design

**Read `uncodixfy.md` before writing UI code.** Target aesthetic: Linear, Raycast, Stripe, GitHub.

- Use design tokens from `client/src/styles/tokens.css`
- Primary color: `#2f5c49` (forest green); earthy/muted palette, no blue tints
- Fonts: Manrope (body), IBM Plex Mono (mono)
- Max border-radius: 12px cards, 8px badges; max shadow: 8px blur
- Transitions: 100-200ms ease, opacity/color only
- No glassmorphism, soft gradients, floating panels, hero sections, pill shapes, decorative copy
