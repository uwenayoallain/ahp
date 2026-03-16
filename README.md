# Aegis Hackathon Platform (AHP)

Offline-first progressive web app for hackathon operations.

## Workspaces

- client: React + Vite + PWA frontend
- server: Express + TypeScript + SQLite backend

## Run

```bash
pnpm install
pnpm dev
```

## Build

```bash
pnpm build
```

## Lint

```bash
pnpm lint
```

## Test

```bash
pnpm test
```

## Seeded Credentials

The server automatically seeds local development data (except in tests).

See credentials in [credentials.txt](credentials.txt):

- admin account: admin@ahp.rw / admin123
- participant accounts: ari@ahp.rw, lena@ahp.rw, sam@ahp.rw, noah@ahp.rw, mina@ahp.rw (all use admin123)
