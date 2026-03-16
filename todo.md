# AHP — Dynamic Hackathon Platform: Implementation Plan

## Overview

Transform AHP from a static-content app into a fully configurable hackathon platform where
hackathons, challenges, schedules, rules, teams, and scoring are all DB-driven. Add a public
leaderboard, proper team management, challenge detail pages with resources/setup instructions,
and fix layout issues.

---

## Phase A — Database Schema & Seed Data (DONE)

- [x] A1. Add new tables: `hackathons`, `challenges`, `teams`, `team_members`, `schedule_events`, `rules`, `skill_modules`
- [x] A2. Alter `submissions` table: add `challenge_id` (FK), `team_id` (FK), `score` (nullable int)
- [x] A3. Write rich seed data: 1 hackathon, 5 challenges with real resources/setup, 3 teams with members, schedule events, rules, skill modules, scored submissions

## Phase B — Server API Endpoints (DONE)

- [x] B1. `GET /api/hackathons/active` — returns the active hackathon
- [x] B2. `GET /api/challenges` + `GET /api/challenges/:slug` — list & detail (with resources, setup)
- [x] B3. `GET /api/schedule` — schedule events for active hackathon
- [x] B4. `GET /api/rules` — rules for active hackathon
- [x] B5. `GET /api/skill-modules` — modules + user progress
- [x] B6. `GET /api/leaderboard` — public team rankings by score
- [x] B7. `GET /api/teams` + `POST /api/teams` + `POST /api/teams/:id/join` + `POST /api/teams/:id/leave`
- [x] B8. `PATCH /api/admin/submissions/:id/score` — admin scores a submission
- [x] B9. `GET /api/me/stats` — user dashboard stats (submission count, rank, modules)

## Phase C — Client Pages & Components (DONE)

- [x] C1. Fix layout gap (`.page` max-width issue, removed `panel-surface` from `<main>`)
- [x] C2. Rewrite `Schedule.tsx` to fetch from `/api/schedule` + `/api/challenges`
- [x] C3. Rewrite `Rules.tsx` to fetch from `/api/rules`
- [x] C4. Rewrite `SkillModules.tsx` to fetch from `/api/skill-modules`
- [x] C5. Rewrite `Home.tsx` dashboard to fetch from `/api/me/stats`
- [x] C6. New `ChallengeDetail.tsx` page — setup instructions, resources, difficulty, points
- [x] C7. Update `Schedule.tsx` challenge list to link to detail pages
- [x] C8. New `Leaderboard.tsx` page — public rankings with scores
- [x] C9. New `Teams.tsx` page — create/join teams, see members, leave team
- [x] C10. Update `SubmitProject.tsx` — link submission to challenge + team
- [x] C11. Update navigation with new pages

## Phase D — Cleanup & Polish (DONE)

- [x] D1. Remove `client/src/data/mockData.ts` (no more hardcoded data)
- [x] D2. Fix admin API field mismatch (`syncSuccessRate` -> `reviewRate`)
- [x] D3. Clean up admin submission fallback data / dedup code
- [x] D4. Verify: `pnpm build` + `pnpm test` + `pnpm lint` pass

## Phase E — Layout & Reusable Components (DONE)

- [x] E1. Remove `panel-surface` from `<main>` in AppShell, reduce padding
- [x] E2. New `DataTable` generic component
- [x] E3. New `StatCard` component
- [x] E4. New `EmptyState` component
- [x] E5. Refactor admin + participant pages to use shared components
- [x] E6. Rewrite Login/Signup — brand link, mode toggle, auth-specific CSS

## Phase F — Tests & Bug Fixes (DONE)

- [x] F1. 60+ integration tests in `api.test.ts` across 13 describe blocks
- [x] F2. Fix ambiguous `SELECT id` in `teams.ts`
- [x] F3. Fix Express 5 error handler missing 4th `_next` param
- [x] F4. PageHeader action prop on same row as title
- [x] F5. Team management UX — confirmation, busy state, feedback messages, role badges
- [x] F6. Visual polish — new CSS classes, replaced inline styles, fixed badge elements
- [x] F7. PWA sync gap — SW message listener for `AHP_TRIGGER_SYNC`

## Phase G — Audit & Refinement (DONE)

- [x] G1. Token refresh — 15-min access token, 7-day refresh token, deduped client-side refresh
- [x] G2. Public leaderboard — `/leaderboard` route with `PublicPage` wrapper
- [x] G3. `GET /api/admin/submissions/:id` — dedicated single-submission admin endpoint
- [x] G4. `fetchAdminSubmission(id)` — client fetches single submission instead of all
- [x] G5. Fix hard-coded 5 modules in admin Progress page — now uses `totalModules` from API
- [x] G6. Remove all remaining inline styles (Schedule, ChallengeDetail, Teams)
- [x] G7. Add `.text-prewrap` and `.caption-text` CSS utility classes
- [x] G8. Remove dead exports from `db.ts` (`getSubmissions`, `getQueuedSyncCount`)
- [x] G9. Derive category options from API data — `GET /api/submissions/categories` endpoint
- [x] G10. Admin category filter now computed from loaded rows
- [x] G11. SubmitProject category dropdown fetched from API
- [x] G12. Test coverage: 63 tests, all passing

## Current State

- **Build**: clean
- **Tests**: 70 passing (vitest)
- **Lint**: 0 errors
- **Zero inline styles** (except dynamic `width` on progress bars)
- **Zero dead exports**
- **Zero hardcoded magic numbers**
- **Zero `any` types**
- **Zero TODO/FIXME comments**
- **Zero silent error swallowing**

---

## Phase H — Security Hardening (DONE)

- [x] H1. Remove `credentials.txt` from repo and add to `.gitignore`
- [x] H2. Require `JWT_SECRET` env var — fail startup if missing (non-test); throws via `resolveSecret()`
- [x] H3. Separate secrets: `ACCESS_SECRET` (from `JWT_SECRET`) and `REFRESH_SECRET` (from `JWT_REFRESH_SECRET`)
- [x] H4. Rate limiting on auth endpoints — custom sliding-window `rateLimit` middleware (20 req/min); noop in test env
- [x] H5. CORS restricted to `CORS_ORIGIN` env var (comma-separated) or `http://localhost:5173` default
- [x] H6. `uploadId` sanitized with `/^[a-zA-Z0-9_-]+$/` regex in sync route
- [x] H7. Removed `filePath` from sync media response — only returns `uploadId`
- [x] H8. File type validation via `fileFilter` in multer config (MIME type allowlist)
- [x] H9. Email format validation + password min 6 chars on register
- [x] H10. Refresh token revocation — `refresh_tokens` table, SHA-256 hashing, store/check/revoke on rotate, `POST /api/auth/logout`
- [x] H11. Seed password from `SEED_PASSWORD` env var, seeding skipped in `production` and `test`

## Phase I — Data Integrity (DONE)

- [x] I1. Wrap team create in a transaction — INSERT into `teams` + INSERT into `team_members` is now atomic
- [x] I2. Wrap team join in a transaction — check-then-act race condition eliminated with `db.transaction()`
- [x] I3. Wrap team leave in a transaction — DELETE member + conditional DELETE team is now atomic
- [x] I4. Wrap sync processing in a transaction — submission create/update + sync log are atomic
- [x] I5. Add `ON DELETE CASCADE` to foreign keys — challenges, teams, team_members, schedule_events, rules, skill_modules, submission_media, refresh_tokens
- [x] I6. Unique constraint for multi-team membership per hackathon — enforced by transactional check-then-act (SQLite serialized writes); DB-level constraint would require denormalization
- [ ] ~~I7. Add FK from `skill_progress.module_id` to `skill_modules`~~ — skipped: composite PK `(id, hackathon_id)` prevents simple FK; enforced at application level
- [x] I8. Make `submission_media.submission_id` NOT NULL + CASCADE

## Phase J — Performance (DONE)

- [x] J1. Add database indexes on frequently queried columns — `submissions.user_id`, `submissions.team_id`, `submissions.challenge_id`, `team_members.user_id`, `team_members.team_id`, `sync_log.user_id`, `schedule_events.hackathon_id`, `rules.hackathon_id`, `challenges.hackathon_id`, `teams.hackathon_id`, `refresh_tokens.user_id`
- [x] J2. Use SQL `RANK()` for leaderboard rank instead of JS `findIndex()` in `stats.ts`
- [x] J3. Add pagination to unbounded list endpoints — `GET /api/admin/submissions`, `GET /api/submissions`, `GET /api/leaderboard`, `GET /api/admin/users` all accept `?page=N&limit=N` and return `{ items, total, page, limit }`
- [x] J4. Add `Cache-Control: public, max-age=300` headers for schedule, rules, and challenges
- [x] J5. Fix service worker `CacheFirst` on rules — changed to `StaleWhileRevalidate` so updates propagate

## Phase K — Error Handling (DONE)

- [x] K1. Add React error boundary wrapping the app — `ErrorBoundary` class component in `client/src/components/ErrorBoundary.tsx`, wraps `AuthProvider` + `NetworkProvider` + `RouterProvider` in `App.tsx`
- [x] K2. Add error states to 5 pages — `Home.tsx`, `Schedule.tsx`, `Leaderboard.tsx`, `Rules.tsx`, `SkillModules.tsx` now catch API errors and display `status-text--error` message
- [x] K3. Fix silent error swallowing in sync — `catch` in `flushSyncQueue` now logs via `console.error`
- [x] K4. Fix silent error swallowing in SubmitProject — catch now logs + sets `loadError` warning shown above form
- [x] K5. Handle auth loading state in `RequireAuth` — `AuthProvider` attempts token refresh on mount when access token is missing but refresh token exists; `RequireAuth` shows loading state during refresh attempt

## Phase L — Client UX (DONE)

- [x] L1. Double-submit protection on SubmitProject — `isSubmitting` state disables buttons during submission
- [x] L2. Validate current step before allowing "Next" — `canAdvance()` checks required fields per step; Next button disabled when invalid
- [x] L3. Password requirements hint on registration — `minLength={6}` + "Minimum 6 characters" caption below password field
- [x] L4. Team name max length — `maxLength={50}` on client input + server validation rejects >50 chars
- [x] L5. Progress bar accessibility — replaced `aria-hidden="true"` with `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-label`
- [x] L6. Proper 404 page — `NotFoundPage` component replaces `Navigate to="/"` catch-all
- [x] L7. `end` prop on Dashboard NavLink — both Sidebar and bottom nav pass `end` when `to === '/app'`

## Phase M — API Design (DONE)

- [x] M1. Rename `activeUsers` to `totalUsers` in admin stats — server, `adminApi.ts`, and `Dashboard.tsx` all updated; label changed to "Total participants"
- [x] M2. Add upper bound validation for submission score — score endpoint now joins `challenges` to get `max_points` and rejects scores that exceed it
- [ ] ~~M3. Normalize response shapes~~ — already consistent: collections use `{ items }`, paginated lists add `{ total, page, limit }`, single resources return flat, actions return status objects, errors return `{ error }`

## Phase N — Code Quality (DONE)

- [x] N1. Extract shared `formatDate` helpers — `formatShortDate` (table columns) and `formatDateTime` (detail views) in `client/src/lib/format.ts`, replacing duplicated functions in 4 files
- [x] N2. Extract shared `statusLabel`/`statusBadgeClass` — moved to `client/src/lib/format.ts`, replacing duplicated functions in `MySubmissions.tsx` and `SubmissionDetail.tsx`
- [x] N3. Extract "active hackathon lookup" into `getActiveHackathon()` helper — `server/src/activeHackathon.ts` replaces 8 inline queries across 7 route files
- [x] N4. Fix `loadTeams` recreated every render — wrapped in `useCallback` with stable reference, added to `useEffect` dependency array

## Phase O — PWA & Offline (DONE)

- [x] O1. Fix sync queue halting on first failure — `flushSyncQueue` now continues processing remaining items when one fails, instead of returning early
- [x] O2. Add retry/backoff for failed sync items — `markQueueItemFailed` increments `retryCount`, sets exponential backoff `nextRetryAt` (2s, 4s, 8s, 16s, 32s cap 60s), marks permanently `failed` after 5 retries; `flushSyncQueue` skips items whose `nextRetryAt` hasn't passed
- [x] O3. Clean up synced queue items — `markQueueItemSynced` now deletes the record from IndexedDB instead of setting status to 'synced', preventing unbounded growth
- [x] O4. Add IndexedDB migration path — version-aware `upgrade(db, oldVersion)` function with `if (oldVersion < N)` guards; bumped to v2 for `retryCount`/`nextRetryAt` fields on `syncQueue`

## Phase P — Final Polish (DONE)

- [x] P1. Add error states to remaining admin pages — `admin/Submissions.tsx` and `admin/Progress.tsx` now catch API errors and display `status-text--error`
- [x] P2. Add input validation to sync routes — POST `/` validates `action` (required string), `payload` fields for submission action (`localId`, `projectTitle`, `category`, `version`); POST `/media` validates `X-Chunk-Index` (non-negative int), `X-Total-Chunks` (positive int), and `chunkIndex < totalChunks`
- [x] P3. Extract magic numbers into named constants — `ACCESS_TOKEN_EXPIRY`, `REFRESH_TOKEN_EXPIRY`, `REFRESH_TOKEN_TTL_MS` in `auth.ts`; `MAX_FILE_SIZE` in `upload.ts`
- [x] P4. Extract duplicated "already on team" check — `isUserOnTeam(hackathonId, userId)` helper in `teams.ts` replaces two identical inline queries
