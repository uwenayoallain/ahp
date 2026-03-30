# Aegis Hackathon Platform

Online hackathon platform where participants join events, form teams, tackle daily challenges, and climb the leaderboard. Admins manage the full event lifecycle from a single dashboard.

Built as an offline-capable PWA with React 19, Express 5, and PostgreSQL (Neon).

---

## Quick Start

```bash
pnpm install
cp .env.example .env   # fill in your Neon credentials
pnpm dev               # client :5173 + server :3001
```

## Test Account

| Field | Value |
|-------|-------|
| Email | `tester@ahp.rw` |
| Password | `admin123` |

---

## Scripts

```bash
pnpm dev        # run client + server in parallel
pnpm build      # build both workspaces
pnpm lint       # lint both workspaces
pnpm test       # run server tests (Vitest)
```

---

## Project Structure

```
client/          React 19 + Vite 7 + Zustand frontend
  src/
    pages/       route components (+ pages/admin/ for admin views)
    components/  ui/ (Avatar, Markdown, etc.) + layout/ (AppShell, Navbar, Sidebar)
    stores/      Zustand store with cached API data
    context/     Auth and Network context providers
    lib/         api, auth, config, sync, IndexedDB
    styles/      design tokens + global CSS

server/          Express 5 + Drizzle ORM backend
  src/
    routes/      one file per resource (auth, submissions, teams, etc.)
    db/          schema, connection, bootstrap, seed
    middleware/  JWT auth, rate limiting, uploads
    services/    business logic (submissions, sync)
```

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `NEON_AUTH_URL` | Neon Auth endpoint URL |
| `CORS_ORIGIN` | Allowed origin(s), comma-separated |
| `NODE_ENV` | `production` for deployed environments |
| `PORT` | Server port (default `3001` dev, `8080` production) |

---

## Deployment

Hosted free on **Render** (app) + **Neon** (database + auth).

```bash
# Render: connect repo, it detects render.yaml automatically
# Set DATABASE_URL, NEON_AUTH_URL, CORS_ORIGIN as secrets

# Or with Docker locally:
docker compose up --build
```

A `fly.toml` is also included for Fly.io as an alternative.

---

## Recent Changes

- **Zustand state management** — Client-side store with 60-second cache staleness eliminates loading delays on navigation
- **Markdown support** — Renderer (react-markdown + remark-gfm) and editor with write/preview toggle and formatting toolbar
- **User profiles** — Profile page with display name, avatar URL, and bio; avatar displayed in navbar and sidebar
- **Auth client fix** — Refactored Neon Auth client to avoid breaking better-auth's internal proxy chain
- **Runtime config** — Client fetches server config at boot instead of relying on build-time env vars
- **Docker production build** — Multi-stage Dockerfile with dynamic PGlite imports to avoid devDependency crashes
- **Deployment configs** — `render.yaml` for Render, `fly.toml` for Fly.io, `docker-compose.yml` for local Docker

---

## License

Private
