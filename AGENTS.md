# AGENTS.md — Aegis Hackathon Platform

Offline-first PWA monorepo: React 19 + Vite client, Express 5 + SQLite server.
Package manager: **pnpm 10** with workspaces (`client/`, `server/`).

## Build / Dev / Lint / Test Commands

```bash
# From repo root
pnpm install              # install all dependencies
pnpm dev                  # start client + server in parallel (Vite on :5173, Express on :3001)
pnpm build                # build both workspaces sequentially
pnpm lint                 # lint both workspaces
pnpm test                 # run server tests (delegates to server workspace)

# Server-specific (run from server/)
pnpm test                 # vitest run (single run, exits)
pnpm test:watch           # vitest in watch mode
pnpm vitest run src/routes/api.test.ts   # run a single test file
pnpm vitest run api                       # file name substring match
pnpm vitest run -t "GET /api/health"      # run a single test by name
pnpm vitest run api -t "auth register"    # file filter + test name filter

# Client-specific (run from client/)
pnpm dev                  # Vite dev server with HMR
pnpm build                # production build to dist/
pnpm lint                 # ESLint
```

## Architecture Overview

- **client/**: React 19, Vite 7, react-router-dom 7, IndexedDB via `idb`, Workbox PWA service worker
- **server/**: Express 5, better-sqlite3 (WAL mode), JWT auth, multer uploads
- Vite proxies `/api` to Express on port 3001 in dev
- Server exports `createApp()` for testing; `startServer()` only runs when `NODE_ENV !== 'test'`

## Test Conventions

- Framework: **Vitest 4** (server only, no client tests)
- Test files: co-located as `*.test.ts` (e.g., `src/routes/api.test.ts`)
- Style: `describe` + `test` blocks (not `it`), `async` handlers, `supertest` for HTTP
- DB isolation: each test gets a fresh SQLite temp file via `resetDbForTests()`
- No mocking — integration tests against real Express app + real SQLite
- No coverage configured yet

## Code Style

### Formatting

- **2-space indentation**
- **No semicolons** (ASI style, entire codebase)
- **Single quotes** for all strings; double quotes only in JSX attributes
- **Trailing commas** in multi-line constructs (objects, arrays, params)
- Arrow function params always parenthesized: `(event) =>`, `(row) =>`
- Opening braces on same line (K&R)
- No Prettier config — formatting is by convention

### Imports

Order (no blank lines between groups):
1. Node built-ins with `node:` prefix — `import fs from 'node:fs'`
2. Third-party packages — `import { Router } from 'express'`
3. Local/relative imports — `import { getDb } from '../db/connection.js'`

Rules:
- **Named imports preferred.** Default imports only for packages that export defaults (e.g., `cors`, `bcrypt`, `Database`, `multer`, `jwt`)
- **`import type` for type-only imports** — enforced by `verbatimModuleSyntax: true`
- **Server**: explicit `.js` extensions on relative imports (NodeNext resolution)
- **Client**: no extensions on relative imports (Vite handles it)
- **No barrel files** — every import points to the specific file

### Types

- **`type` always, never `interface`** (only exception: Express module augmentation for declaration merging)
- **Zero `any`** — use `unknown` with runtime narrowing, or `as` assertions for DB query results
- Type aliases in `PascalCase`: `SubmissionInput`, `JwtPayload`, `FormState`
- String literal unions for enumerations: `'draft' | 'queued' | 'synced'`
- Types defined in the same file they're used, near the top after imports
- Generics used sparingly: `apiRequest<T>()`, `useState<FormState>()`, `openDB<AHPDatabase>()`

### Naming Conventions

| Element                | Convention        | Examples                                      |
|------------------------|-------------------|-----------------------------------------------|
| Variables, params      | `camelCase`       | `userId`, `accessToken`, `chunkIndex`         |
| Functions              | `camelCase`       | `createSubmission`, `requireAuth`             |
| Type aliases           | `PascalCase`      | `SyncRequest`, `DashboardStats`               |
| React components       | `PascalCase`      | `AuthProvider`, `PageHeader`, `AppShell`      |
| True constants         | `UPPER_SNAKE`     | `JWT_SECRET`, `DB_NAME`, `ACCESS_TOKEN_KEY`   |
| Structured data consts | `camelCase`       | `fallbackStats`, `seedUsers`, `adminNav`      |
| Database columns       | `snake_case`      | `user_id`, `team_name`, `updated_at`          |
| App-layer fields       | `camelCase`       | `teamName`, `projectTitle`, `localId`         |
| Files (.ts)            | `camelCase`       | `auth.ts`, `sync.ts`, `adminApi.ts`           |
| Files (.tsx)           | `PascalCase`      | `App.tsx`, `Login.tsx`, `AuthContext.tsx`      |
| Page exports           | suffix `Page`     | `HomePage`, `LoginPage`, `SubmitProjectPage`  |
| Router exports         | suffix `Router`   | `authRouter`, `syncRouter`, `adminRouter`     |
| Unused params          | underscore prefix | `_req`, `_res`, `_next`                       |

### Functions

- **`function` declarations for all exports and top-level definitions** — never arrow functions
- Arrow functions only for inline callbacks: event handlers, `.map()`, short closures
- **`async/await` only** — no `.then()` chains
- Fire-and-forget promises prefixed with `void`: `void load()`, `void loadQueueCount()`

### Exports

- **Named exports** almost exclusively: `export function ...`, `export const ...`, `export type ...`
- Single `export default` in the entire codebase (`App.tsx`) — avoid adding more
- No barrel files (`index.ts` re-exports) — import from specific files

### Error Handling

**Server:**
- Validation-first early returns with `4xx` JSON: `if (!userId) { return res.status(401).json({ error: 'Unauthorized' }) }`
- `try/catch` only for external operations (JWT verification, etc.)
- Binding-less catch when error object isn't needed: `catch { ... }`
- Global error handler returns `{ error: 'Internal server error' }` with status 500
- No custom Error subclasses — errors are plain strings in `{ error: '...' }`

**Client:**
- `try/catch` with `error instanceof Error` narrowing for messages
- `apiRequest` throws `new Error(msg)` on non-OK responses; supports `fallbackData` option
- `useEffect` cleanup via local `cancelled` boolean flag to prevent stale state updates

### Nullish Handling

- `??` (nullish coalescing) strongly preferred over `||`
- Optional chaining: `req.user?.sub`, `data?.items`
- Explicit equality where clarity helps: `=== false`, `=== true`

### Comments

- **Virtually zero comments** — code is self-documenting through descriptive naming and small functions
- No JSDoc, no TODOs, no file headers, no `@param`/`@returns`
- Only comment when the "why" is genuinely non-obvious

### File Organization (internal structure)

1. Imports
2. Type definitions
3. Module-level constants
4. Non-exported helper functions
5. Exported functions / components
6. Side-effect code at bottom (e.g., conditional `startServer()`)

### Context Pattern (client)

Each React context is split into two files:
- `auth-context.ts` — `createContext` call + type definition (plain `.ts`)
- `AuthContext.tsx` — Provider component (`.tsx`)
- `useAuth.ts` — thin hook wrapper in `hooks/` directory

## UI Design Rules

**Read `uncodixfy.md` before writing any UI code.** Key principles:

- Build interfaces that look like **Linear, Raycast, Stripe, GitHub** — not generic AI dashboards
- No oversized border-radius (8-12px max for cards, 6-8px for badges)
- No glassmorphism, soft gradients, floating panels, hero sections in dashboards
- No decorative copy, eyebrow labels, `<small>` headers, ornamental badges
- No pill shapes, dramatic shadows, transform animations, colored glows
- No blue-tinted colors — the project palette is earthy/muted (primary `#2f5c49` forest green)
- Use existing design tokens from `client/src/styles/tokens.css`
- Fonts: Manrope (body), IBM Plex Mono (mono)
- Shadows: `0 2px 8px rgba(20,24,22,0.08)` max
- Transitions: 100-200ms ease, simple opacity/color changes only
- When in doubt: if a UI choice feels like a default AI move, pick the harder, cleaner option
